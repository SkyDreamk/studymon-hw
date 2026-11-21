-- 养成转盘机会 source 加 'history'（2026-11-21，家长区 History 奖励下拉发养成转盘机会用）。
-- care_wheel_chances 现行 CHECK 只认 ('daily-english','daily-chinese','daily-math')，grantCareWheelChance 的
-- INSERT OR IGNORE 遇到 'history' 会被 CHECK 静默丢弃。SQLite 不能 ALTER CHECK，按 0030 同款重建表并搬全量旧数据。
-- 只应用到测试库；生产库迁移由用户另行定。回滚：按 0030 的 CHECK（去掉 'history'）重建，先删 source='history' 的行。
ALTER TABLE care_wheel_chances RENAME TO care_wheel_chances_old;
CREATE TABLE care_wheel_chances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('daily-english', 'daily-chinese', 'daily-math', 'history')),
  ref_id TEXT NOT NULL,
  created_epoch INTEGER NOT NULL,
  used_epoch INTEGER,
  date_shanghai TEXT NOT NULL,
  UNIQUE(child_id, source, ref_id)
);
INSERT INTO care_wheel_chances SELECT * FROM care_wheel_chances_old;
DROP TABLE care_wheel_chances_old;
