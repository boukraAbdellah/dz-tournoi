-- 002_category_enabled.sql - add enabled flag to competition_category

ALTER TABLE competition_category ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
