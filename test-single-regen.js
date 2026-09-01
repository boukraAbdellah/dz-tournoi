import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "data/app.db"));
const API_BASE = "http://127.0.0.1:5175/api";

async function test() {
  const comp = db.prepare("SELECT * FROM competition ORDER BY id DESC LIMIT 1").get();
  console.log(`Testing Competition #${comp.id}`);

  // Get categories
  const cats = db.prepare(`
    SELECT cc.id, ac.name as age_name, wd.name as weight_name, cc.rng_seed
    FROM competition_category cc
    JOIN age_category ac ON cc.age_category_id = ac.id
    JOIN weight_division wd ON cc.weight_division_id = wd.id
    WHERE cc.competition_id = ? AND cc.enabled = 1
  `).all(comp.id);

  console.log("Categories before single regen:", cats.map(c => `Cat #${c.id} (${c.weight_name}) seed=${c.rng_seed}`).join(" | "));

  const targetCat = cats[0];
  const otherCat = cats[1];
  const oldOtherSeed = otherCat.rng_seed;

  console.log(`\nRegenerating ONLY Cat #${targetCat.id} (${targetCat.weight_name})...`);
  const res = await fetch(`${API_BASE}/competitions/${comp.id}/categories/${targetCat.id}/generate-draw`, {
    method: "POST"
  });
  const data = await res.json();
  console.log("Response:", data);

  const updatedOther = db.prepare("SELECT rng_seed FROM competition_category WHERE id = ?").get(otherCat.id);
  const updatedTarget = db.prepare("SELECT rng_seed FROM competition_category WHERE id = ?").get(targetCat.id);

  console.log(`Target Cat seed: ${targetCat.rng_seed} -> ${updatedTarget.rng_seed}`);
  console.log(`Other Cat seed: ${oldOtherSeed} -> ${updatedOther.rng_seed} (Should be unchanged!)`);

  if (oldOtherSeed === updatedOther.rng_seed) {
    console.log("\n SUCCESS: Other categories were preserved untouched!");
  } else {
    throw new Error("FAIL: Other category was modified during single category regeneration!");
  }

  db.close();
}

test().catch(err => {
  console.error(err);
  db.close();
  process.exit(1);
});
