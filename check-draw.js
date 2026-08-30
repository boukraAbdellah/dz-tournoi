import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "data/app.db"));

const compId = process.argv[2] ? Number(process.argv[2]) : db.prepare("SELECT id FROM competition ORDER BY id DESC LIMIT 1").get()?.id;

if (!compId) {
  console.log("No competition found in database.");
  process.exit(0);
}

const comp = db.prepare("SELECT * FROM competition WHERE id = ?").get(compId);
console.log(`Checking competition #${compId} (${comp.name}) - Status: ${comp.status}\n`);

const cats = db.prepare(`
  SELECT cc.id, ac.name as age_name, wd.name as weight_name, cc.gender
  FROM competition_category cc
  JOIN age_category ac ON cc.age_category_id = ac.id
  JOIN weight_division wd ON cc.weight_division_id = wd.id
  WHERE cc.competition_id = ? AND cc.enabled = 1
`).all(compId);

for (const cat of cats) {
  const matches = db.prepare("SELECT id, round, ordinal, is_bronze, status, competitor_a_id, competitor_b_id, winner_registration_id, score_a, score_b FROM match WHERE competition_category_id = ? ORDER BY round, ordinal").all(cat.id);
  console.log(`Cat #${cat.id} (${cat.age_name} ${cat.weight_name} ${cat.gender}): ${matches.length} matches`);
  for (const m of matches) {
    console.log(`  R${m.round}#${m.ordinal} [${m.status}] A=${m.competitor_a_id ?? 'BYE'} B=${m.competitor_b_id ?? 'BYE'} winner=${m.winner_registration_id ?? 'none'} bronze=${Boolean(m.is_bronze)}`);
  }
}
db.close();
