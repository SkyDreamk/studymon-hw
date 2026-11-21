-- Check-in Adventure v2.1: care play (feed and bathe companions, friendship) and Professor Oak's storage (party and warehouse).
-- Apply after 0001. Like 0001, it only creates new lf_ tables and indexes; it never alters or reads your existing tables.

-- Every companion a child owns. place says whether it travels in the party or waits in storage.
-- (family_id, source, source_id) makes grants idempotent: a wheel spin or egg hatch that is retried adds the pet once.
CREATE TABLE IF NOT EXISTS lf_pets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id    TEXT NOT NULL,
  child_id     TEXT NOT NULL,
  species      TEXT NOT NULL,
  nickname     TEXT NOT NULL DEFAULT '',
  type         TEXT NOT NULL DEFAULT '',
  friendship   INTEGER NOT NULL DEFAULT 0 CHECK (friendship >= 0),
  place        TEXT NOT NULL CHECK (place IN ('party','warehouse')),
  is_main      INTEGER NOT NULL DEFAULT 0 CHECK (is_main IN (0,1)),
  party_order  INTEGER NOT NULL DEFAULT 0,
  source       TEXT NOT NULL,                 -- 'wheel', 'egg', 'legacy', 'parent', ...
  source_id    TEXT NOT NULL,                 -- your spin id, egg id or old pet id
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  UNIQUE (family_id, source, source_id),
  CHECK (is_main = 0 OR place = 'party')       -- the main pet always travels
);
CREATE INDEX IF NOT EXISTS ix_lf_pets_child_place ON lf_pets(child_id, place);
-- At most one main pet per child, as a backstop for the Worker's own checks.
CREATE UNIQUE INDEX IF NOT EXISTS ux_lf_pets_one_main ON lf_pets(child_id) WHERE is_main = 1;

-- Care items a child owns, when the site does not keep them itself (see the careInventory option).
CREATE TABLE IF NOT EXISTS lf_care_inventory (
  family_id   TEXT NOT NULL,
  child_id    TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  qty         INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (child_id, item_id)
);

-- One row per grant of care items (a wheel prize, a parent gift). Makes grantCareItem safe to retry.
CREATE TABLE IF NOT EXISTS lf_item_grants (
  family_id   TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  child_id    TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  qty         INTEGER NOT NULL CHECK (qty > 0),
  nonce       TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (family_id, source_id)
);

-- Every feed and bath, and whether it earned a Care-wheel chance.
CREATE TABLE IF NOT EXISTS lf_care_log (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id         TEXT NOT NULL,
  child_id          TEXT NOT NULL,
  pet_id            INTEGER NOT NULL,
  item_id           TEXT NOT NULL,
  kind              TEXT NOT NULL CHECK (kind IN ('food','bath')),
  gained            INTEGER NOT NULL,
  friendship_after  INTEGER NOT NULL,
  day               TEXT NOT NULL,
  wheel_chance      INTEGER NOT NULL DEFAULT 0,  -- 1 once your wheel code granted the chance
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_lf_care_log_child_day ON lf_care_log(child_id, day);
