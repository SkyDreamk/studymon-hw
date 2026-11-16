-- studymon-hw D1 schema v15 —— 照顾玩法（喂食/洗澡）记录表
-- 背景：见 ~/workspace/studymon-hw/DESIGN-照顾玩法-策划案-v1.md。
-- 只新增一张表，不改既有表与既有行。每日各一次由 UNIQUE(child_id, date_shanghai, kind) + 条件 INSERT 双重保证。
-- 回滚：DROP TABLE care_logs;（纯记录表，无需回填）
CREATE TABLE IF NOT EXISTS care_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  kind TEXT NOT NULL,
  item_key TEXT NOT NULL,
  favorite INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  scene_key TEXT NOT NULL,
  created_epoch INTEGER NOT NULL,
  UNIQUE(child_id, date_shanghai, kind)
);
CREATE INDEX IF NOT EXISTS idx_care_logs_child_date ON care_logs(child_id, date_shanghai);
