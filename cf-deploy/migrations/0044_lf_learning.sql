-- Check-in Adventure: learning features (spoken retell, review deck, parent speaking review, shield days, weekly report).
-- Apply with:  wrangler d1 migrations apply <DB_NAME> --remote   (try --local first)
--
-- Every table is prefixed lf_ so nothing collides with the tables the site already has.
-- family_id and child_id are TEXT copies of the ids your existing tables use (integer or string ids both work).
-- There are no FOREIGN KEYs to your existing tables on purpose: D1 migrations should not depend on table names
-- this package cannot see. The Worker always checks family ownership before reading or writing a row.
-- Times are ISO 8601 UTC strings; "day" columns are YYYY-MM-DD in the family's own time zone (default Asia/Shanghai).

CREATE TABLE IF NOT EXISTS lf_family_settings (
  family_id     TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL DEFAULT '{}',   -- only the keys a parent changed; defaults live in code
  updated_at    TEXT NOT NULL
);

-- XP and friendship earned through these features. If your children table already keeps XP, mirror it there
-- with the onApproved hook and return xp from your ChildDirectory; this table then stays as a ledger.
CREATE TABLE IF NOT EXISTS lf_child_stats (
  child_id    TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL,
  xp          INTEGER NOT NULL DEFAULT 0,
  friendship  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_lf_child_stats_family ON lf_child_stats(family_id);

-- Which subjects a grade sees on Today. Empty means "all five subjects". Skip it if your site already has a plan table
-- and pass planForGrade in the options instead.
CREATE TABLE IF NOT EXISTS lf_plan (
  family_id  TEXT NOT NULL,
  grade      INTEGER NOT NULL,
  subject    TEXT NOT NULL,
  sort       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (family_id, grade, subject)
);

CREATE TABLE IF NOT EXISTS lf_checkins (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id         TEXT NOT NULL,
  child_id          TEXT NOT NULL,
  day               TEXT NOT NULL,
  subject           TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('wait','ok','back')),
  feel              TEXT CHECK (feel IN ('easy','okay','hard')),
  learned           TEXT NOT NULL DEFAULT '',
  photo_id          TEXT,                       -- lf_uploads.id
  audio_id          TEXT,                       -- lf_uploads.id, the spoken retell
  audio_secs        REAL NOT NULL DEFAULT 0,
  early             INTEGER NOT NULL DEFAULT 0,
  xp                INTEGER,
  reward            TEXT,
  feedback_json     TEXT,                       -- parent's chips, JSON array
  note              TEXT NOT NULL DEFAULT '',
  parent_audio_id   TEXT,                       -- lf_uploads.id, the parent's voice note
  ai_feedback_json  TEXT,                       -- optional, from the speechFeedback hook
  legacy_checkin_id TEXT,                       -- optional link to a row in your existing check-in table
  submitted_at      TEXT NOT NULL,
  reviewed_at       TEXT
);
CREATE INDEX IF NOT EXISTS ix_lf_checkins_child_day ON lf_checkins(child_id, day);
CREATE INDEX IF NOT EXISTS ix_lf_checkins_family_status ON lf_checkins(family_id, status);

CREATE TABLE IF NOT EXISTS lf_cards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id   TEXT NOT NULL,
  child_id    TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('say','retell','explain')),
  prompt_en   TEXT NOT NULL,
  prompt_zh   TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT '',
  subject     TEXT,
  checkin_id  INTEGER,                          -- lf_checkins.id when made from a check-in
  step        INTEGER NOT NULL DEFAULT 0,
  due         TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_lf_cards_due ON lf_cards(child_id, active, due);
CREATE INDEX IF NOT EXISTS ix_lf_cards_checkin ON lf_cards(checkin_id);

CREATE TABLE IF NOT EXISTS lf_reviews (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id        TEXT NOT NULL,
  card_id          INTEGER NOT NULL,
  child_id         TEXT NOT NULL,
  day              TEXT NOT NULL,
  result           TEXT NOT NULL CHECK (result IN ('again','good','easy')),
  audio_id         TEXT,
  audio_secs       REAL NOT NULL DEFAULT 0,
  ai_feedback_json TEXT,
  created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_lf_reviews_child_day ON lf_reviews(child_id, day);

CREATE TABLE IF NOT EXISTS lf_rewards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id   TEXT NOT NULL,
  child_id    TEXT NOT NULL,
  item        TEXT NOT NULL,
  checkin_id  INTEGER,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_lf_rewards_child ON lf_rewards(child_id);

-- One row per file in R2. id is the client's idempotency id (X-Upload-Id), so a retried upload never makes a duplicate.
CREATE TABLE IF NOT EXISTS lf_uploads (
  id          TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('photo','audio')),
  r2_key      TEXT NOT NULL,
  mime        TEXT NOT NULL,
  bytes       INTEGER NOT NULL,
  secs        REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_lf_uploads_family ON lf_uploads(family_id, created_at);
