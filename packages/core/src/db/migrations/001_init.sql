-- 001_init.sql - initial schema
-- Mirrors the Drizzle schema (kept in SQL for explicit, versioned DDL).

CREATE TABLE IF NOT EXISTS wilaya (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_58 INTEGER NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS city (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wilaya_id INTEGER NOT NULL REFERENCES wilaya(id),
  name_ar TEXT NOT NULL,
  name_fr TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_city_wilaya ON city(wilaya_id);

CREATE TABLE IF NOT EXISTS club (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  wilaya_id INTEGER NOT NULL REFERENCES wilaya(id),
  city_id INTEGER NOT NULL REFERENCES city(id),
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_club_city ON club(city_id);

CREATE TABLE IF NOT EXISTS athlete (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M','F')),
  weight_kg REAL,
  club_id INTEGER REFERENCES club(id),
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_athlete_club ON athlete(club_id);

CREATE TABLE IF NOT EXISTS sport_template (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  builtin INTEGER NOT NULL DEFAULT 0,
  settings TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS age_category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES sport_template(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_age INTEGER NOT NULL,
  max_age INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_agecat_template ON age_category(template_id);

CREATE TABLE IF NOT EXISTS weight_division (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES sport_template(id) ON DELETE CASCADE,
  age_category_id INTEGER NOT NULL REFERENCES age_category(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_kg REAL,
  max_kg REAL,
  order_index INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wd_agecat ON weight_division(age_category_id);

CREATE TABLE IF NOT EXISTS competition (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  description TEXT,
  sport_template_id INTEGER NOT NULL REFERENCES sport_template(id),
  bronze_match_enabled INTEGER NOT NULL DEFAULT 1,
  club_ranking_enabled INTEGER NOT NULL DEFAULT 1,
  wilaya_ranking_enabled INTEGER NOT NULL DEFAULT 0,
  rank_points TEXT NOT NULL DEFAULT '{"gold":5,"silver":3,"bronze":1}',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT','REGISTRATION_OPEN','REGISTRATION_CLOSED',
    'DRAW_GENERATED','DRAW_CONFIRMED','IN_PROGRESS','COMPLETED'
  ))
);

CREATE TABLE IF NOT EXISTS competition_category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
  age_category_id INTEGER NOT NULL REFERENCES age_category(id),
  weight_division_id INTEGER NOT NULL REFERENCES weight_division(id),
  gender TEXT NOT NULL CHECK (gender IN ('M','F')),
  format TEXT NOT NULL DEFAULT 'SINGLE_ELIM' CHECK (format IN ('SINGLE_ELIM')),
  rng_seed INTEGER,
  draw_generated_at TEXT,
  draw_locked_at TEXT,
  UNIQUE (competition_id, age_category_id, weight_division_id, gender)
);
CREATE INDEX IF NOT EXISTS idx_cc_competition ON competition_category(competition_id);

CREATE TABLE IF NOT EXISTS registration (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
  athlete_id INTEGER NOT NULL REFERENCES athlete(id) ON DELETE CASCADE,
  sub_department_id INTEGER REFERENCES competition_category(id),
  weight_kg REAL,
  club_id_at_registration INTEGER REFERENCES club(id),
  status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED','WITHDRAWN')),
  UNIQUE (competition_id, athlete_id)
);
CREATE INDEX IF NOT EXISTS idx_reg_competition ON registration(competition_id);
CREATE INDEX IF NOT EXISTS idx_reg_athlete ON registration(athlete_id);

CREATE TABLE IF NOT EXISTS "match" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_category_id INTEGER NOT NULL REFERENCES competition_category(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  form TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  is_bronze INTEGER NOT NULL DEFAULT 0,
  competitor_a_id INTEGER REFERENCES registration(id),
  competitor_b_id INTEGER REFERENCES registration(id),
  score_a INTEGER,
  score_b INTEGER,
  result_type TEXT NOT NULL DEFAULT 'REGULAR',
  winner_registration_id INTEGER REFERENCES registration(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','BYE')),
  UNIQUE (competition_category_id, round, ordinal, is_bronze)
);
CREATE INDEX IF NOT EXISTS idx_match_category ON "match"(competition_category_id);