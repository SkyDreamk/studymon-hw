-- studymon-hw D1 schema v1
-- 家长 PIN / 家庭密码均以 SHA-256 hex 存储，登录时哈希比对。

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 种子设置（部署迁移时写入）
INSERT INTO settings (key, value) VALUES
  -- 家庭密码默认值（见 DEPLOY.md；用户可在设置里修改）
  ('family_password', '5ea632ef78c3e6d64653087d3f810972f97691ae93e064b08e6dbca4a671cb8d'),
  -- 家长 PIN 默认 1234 的哈希
  ('pin', '9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0'),
  ('pin_fail_count', '0'),
  ('pin_locked_until', '0'),
  ('base_xp', '40'),
  ('cutoff_time', '21:30');

-- 家庭密码门 session（cookie token）
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  pin_verified_at INTEGER
);

-- 孩子档案
CREATE TABLE children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  grade_label TEXT NOT NULL,
  line TEXT NOT NULL,
  total_xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_date TEXT,
  titles TEXT NOT NULL DEFAULT '[]',
  stickers TEXT NOT NULL DEFAULT '[]'
);

INSERT INTO children (name, grade_label, line) VALUES
  ('大宝', '三年级', 'pikachu'),
  ('小宝', '一年级', 'charmander');

-- 打卡记录
CREATE TABLE checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  date TEXT NOT NULL,                 -- 上海日期 YYYY-MM-DD（按提交日）
  subjects TEXT NOT NULL,             -- JSON 数组
  submitted_at TEXT NOT NULL,         -- 上海时间 HH:MM（展示）
  submitted_epoch INTEGER NOT NULL,
  is_early INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  xp_awarded INTEGER,
  reason TEXT,
  reviewed_at TEXT
);
CREATE INDEX idx_checkins_child_date ON checkins(child_id, date);
CREATE INDEX idx_checkins_status ON checkins(status);

-- 野外遭遇
CREATE TABLE encounters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  pokemon_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  balls_used INTEGER NOT NULL DEFAULT 0,
  hits INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' -- pending|caught|fled
);
CREATE INDEX idx_encounters_child_date ON encounters(child_id, date);

-- 道馆对战记录（瞬时对战）
CREATE TABLE gym_battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  hearts INTEGER NOT NULL DEFAULT 3,
  rounds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active|won
  created_at INTEGER NOT NULL
);

-- 每周道馆结果（胜利/发蛋标记）
CREATE TABLE gym_weeks (
  child_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  won INTEGER NOT NULL DEFAULT 0,
  egg_awarded INTEGER NOT NULL DEFAULT 0,
  last_battle_at TEXT,
  PRIMARY KEY (child_id, week_start)
);

-- 封印蛋
CREATE TABLE sealed_eggs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  awarded_date TEXT NOT NULL,
  unlock_date TEXT NOT NULL,
  hatched INTEGER NOT NULL DEFAULT 0,
  hatched_at TEXT
);
CREATE INDEX idx_eggs_child ON sealed_eggs(child_id);

-- 图鉴
CREATE TABLE pokedex (
  child_id INTEGER NOT NULL,
  entry_key TEXT NOT NULL,  -- form:{line}:{idx} | wild:{no} | rare:151 | gym:95
  unlocked_at TEXT,
  PRIMARY KEY (child_id, entry_key)
);
