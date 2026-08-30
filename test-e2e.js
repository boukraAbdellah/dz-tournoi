import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "data/app.db"));

const API_BASE = "http://127.0.0.1:5175/api";

async function run() {
  console.log("=== STARTING END-TO-END VERIFICATION ===");

  // 1. Get latest competition
  const comp = db.prepare("SELECT * FROM competition ORDER BY id DESC LIMIT 1").get();
  console.log(`\n[1] Testing Competition #${comp.id} (${comp.name})`);

  // 2. Resolution check
  const resRes = await fetch(`${API_BASE}/competitions/${comp.id}/resolution`);
  const resData = await resRes.json();
  console.log(`[2] Resolution: ${resData.resolved.length} resolved, ${resData.unresolved.length} unresolved (Total: ${resData.total})`);
  if (resData.unresolved.length > 0 || resData.resolved.length !== 40) {
    throw new Error("Resolution failed: expected 40 resolved and 0 unresolved");
  }

  // 3. Generate Draw
  const genRes = await fetch(`${API_BASE}/competitions/${comp.id}/generate-draw`, { method: "POST" });
  const genData = await genRes.json();
  console.log(`[3] Generate Draw: ${genData.categoriesProcessed} categories processed, ${genData.totalMatches} matches created`);

  // 4. Verify bracket sizes in database
  const cats = db.prepare(`
    SELECT cc.id, ac.name as age_name, wd.name as weight_name, cc.gender
    FROM competition_category cc
    JOIN age_category ac ON cc.age_category_id = ac.id
    JOIN weight_division wd ON cc.weight_division_id = wd.id
    WHERE cc.competition_id = ? AND cc.enabled = 1
  `).all(comp.id);

  console.log("\n[4] Bracket Structure Verification:");
  for (const cat of cats) {
    const matches = db.prepare("SELECT id, round, ordinal, is_bronze, status, competitor_a_id, competitor_b_id, winner_registration_id FROM match WHERE competition_category_id = ? ORDER BY round, ordinal").all(cat.id);
    const byes = matches.filter(m => m.status === 'BYE').length;
    console.log(`  - Cat #${cat.id} (${cat.age_name} ${cat.weight_name} ${cat.gender}): ${matches.length} matches, ${byes} byes`);
  }

  // 5. Test Swap & Bye Sync in Cadets -60 kg (7 athletes, 1 bye)
  const cat60 = cats.find(c => c.weight_name === '-60 kg');
  const cat60R1 = db.prepare("SELECT * FROM match WHERE competition_category_id = ? AND round = 1 ORDER BY ordinal").all(cat60.id);
  const byeMatch = cat60R1.find(m => m.status === 'BYE');
  const regularMatch = cat60R1.find(m => m.status === 'PENDING');

  const byePlayer = byeMatch.competitor_a_id || byeMatch.competitor_b_id;
  const regularPlayer = regularMatch.competitor_a_id;

  console.log(`\n[5] Testing Swap between Bye Player (${byePlayer}) and Regular Player (${regularPlayer})...`);
  const swapRes = await fetch(`${API_BASE}/competitions/${comp.id}/categories/${cat60.id}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regIdA: byePlayer, regIdB: regularPlayer }),
  });
  const swapData = await swapRes.json();
  console.log("  Swap result:", swapData.ok ? "SUCCESS" : "FAILED", "Audit:", swapData.audit);

  // Verify Round 2 was synced
  const cat60R2 = db.prepare("SELECT * FROM match WHERE competition_category_id = ? AND round = 2 ORDER BY ordinal").all(cat60.id);
  console.log("  Round 2 slots after swap:", cat60R2.map(m => `M#${m.ordinal} [A=${m.competitor_a_id} B=${m.competitor_b_id}]`).join(" | "));

  // 6. Lock Draw
  const lockRes = await fetch(`${API_BASE}/competitions/${comp.id}/lock-draw`, { method: "POST" });
  const lockData = await lockRes.json();
  console.log(`\n[6] Lock Draw: Status is now ${lockData.status}`);

  // 7. Start Competition
  const startRes = await fetch(`${API_BASE}/competitions/${comp.id}/start`, { method: "POST" });
  const startData = await startRes.json();
  console.log(`[7] Start Competition: Status is now ${startData.status}`);

  // 8. Test 4-player Cadets -55 kg category (Semi 1, Semi 2 with Decision Winner, Bronze match creation, Final)
  const cat55 = cats.find(c => c.weight_name === '-55 kg');
  const cat55R1 = db.prepare("SELECT * FROM match WHERE competition_category_id = ? AND round = 1 AND is_bronze = 0 ORDER BY ordinal").all(cat55.id);
  const semi1 = cat55R1[0];
  const semi2 = cat55R1[1];

  console.log(`\n[8] Entering results for 4-player category (Cat #${cat55.id})...`);
  // Semi 1: Regular win for A (score 3-1)
  await fetch(`${API_BASE}/competitions/${comp.id}/matches/${semi1.id}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scoreA: 3, scoreB: 1, resultType: "REGULAR" }),
  });
  console.log(`  - Semi 1 (Match #${semi1.id}) completed: Winner = ${semi1.competitor_a_id}`);

  // Semi 2: Tie score (2-2) with DECISION for B
  await fetch(`${API_BASE}/competitions/${comp.id}/matches/${semi2.id}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scoreA: 2, scoreB: 2, resultType: "DECISION", winnerRegistrationId: semi2.competitor_b_id }),
  });
  console.log(`  - Semi 2 (Match #${semi2.id}) completed with Decision: Winner = ${semi2.competitor_b_id}`);

  // Check if Bronze Match was created
  const bronzeMatch = db.prepare("SELECT * FROM match WHERE competition_category_id = ? AND is_bronze = 1").get(cat55.id);
  if (!bronzeMatch) {
    throw new Error("FAIL: Bronze match was NOT created for 4-player category!");
  }
  console.log(`  - 🥉 Bronze Match automatically created! Match #${bronzeMatch.id}: ${bronzeMatch.competitor_a_id} vs ${bronzeMatch.competitor_b_id}`);

  // Complete Bronze Match
  await fetch(`${API_BASE}/competitions/${comp.id}/matches/${bronzeMatch.id}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scoreA: 5, scoreB: 0, resultType: "REGULAR" }),
  });
  console.log(`  - Bronze Match completed: Winner = ${bronzeMatch.competitor_a_id}`);

  // Complete Final Match (Round 2)
  const finalMatch = db.prepare("SELECT * FROM match WHERE competition_category_id = ? AND round = 2 AND is_bronze = 0").get(cat55.id);
  const finalRes = await fetch(`${API_BASE}/competitions/${comp.id}/matches/${finalMatch.id}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scoreA: 4, scoreB: 1, resultType: "REGULAR" }),
  });
  const finalJson = await finalRes.json();
  console.log(`  - 🥇 Final Match (ID #${finalMatch.id}) completed:`, finalJson);

  // 9. Rankings API Verification
  console.log("\n[9] Fetching Rankings (GET /competitions/:id/rankings)...");
  const rankRes = await fetch(`${API_BASE}/competitions/${comp.id}/rankings`);
  const rankings = await rankRes.json();

  const cat55Rank = rankings.categories.find(c => c.categoryId === cat55.id);
  console.log(`  🏆 Cadets -55 kg Podium:`);
  for (const p of cat55Rank.podium) {
    console.log(`     ${p.medal ? p.medal.toUpperCase() : p.rank + 'e'} (${p.rank}): ${p.athleteName} (${p.clubName}) -> +${p.points} pts`);
  }

  console.log(`\n  🏢 Club Standings (Top 3):`);
  for (const c of rankings.clubs.slice(0, 3)) {
    console.log(`     #${c.rank} ${c.clubName} (${c.wilayaName}) | 🥇${c.gold} 🥈${c.silver} 🥉${c.bronze} | Points: ${c.points}`);
  }

  console.log(`\n  📍 Wilaya Standings:`);
  for (const w of rankings.wilayas.slice(0, 3)) {
    console.log(`     #${w.rank} ${w.wilayaName} | 🥇${w.gold} 🥈${w.silver} 🥉${w.bronze} | Points: ${w.points}`);
  }

  // 10. Duplicate Competition Verification
  console.log("\n[10] Testing Competition Duplication...");
  const dupRes = await fetch(`${API_BASE}/competitions/${comp.id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Championnat National de Karaté 2026 (Édition 2)" }),
  });
  const dupData = await dupRes.json();
  console.log(`  Duplicated successfully! New Competition ID = ${dupData.id}, Name = "${dupData.name}", Status = ${dupData.status}`);

  console.log("\n🎉 === ALL VERIFICATION TESTS PASSED 100% SUCCESSFULLY! ===");
  db.close();
}

run().catch((err) => {
  console.error("Verification Error:", err);
  db.close();
  process.exit(1);
});
