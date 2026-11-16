-- 每日语文朗读记录（2026-11-09 新建，任务表 77②）：每天 1 篇课文/古诗，跟读评分 80 分达标才打卡。
-- 打卡线 80 分（4 星，与每日英语一致；跟读站 85 分线区分，用户 2026-11-09 定）。
-- item_id 与 src/data/daily-chinese.js 池子 id 同格式；评测走共用讯飞主/Azure 备管线（中文参数）。
-- 只应用到测试库；回滚：DROP TABLE daily_chinese_assessments; DROP TABLE daily_chinese_logs;
-- 注意：care_wheel_chances 的 source CHECK（0028 建表时只允许 'daily-english'）须先扩到
-- 'daily-chinese'/'daily-math'，否则 grantCareWheelChance 的 INSERT OR IGNORE 会被 CHECK 静默丢弃、
-- 语文/数学打卡发不出转盘机会。SQLite 不能 ALTER CHECK，须重建表（保留旧行）。
CREATE TABLE IF NOT EXISTS daily_chinese_logs (
  child_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  item_id TEXT NOT NULL,
  completed_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, date_shanghai)
);
CREATE TABLE IF NOT EXISTS daily_chinese_assessments (
  child_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  date_shanghai TEXT NOT NULL,
  best_pron REAL NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  updated_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, item_id, date_shanghai)
);
ALTER TABLE care_wheel_chances RENAME TO care_wheel_chances_old;
CREATE TABLE care_wheel_chances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('daily-english', 'daily-chinese', 'daily-math')),
  ref_id TEXT NOT NULL,
  created_epoch INTEGER NOT NULL,
  used_epoch INTEGER,
  date_shanghai TEXT NOT NULL,
  UNIQUE(child_id, source, ref_id)
);
INSERT INTO care_wheel_chances SELECT * FROM care_wheel_chances_old;
DROP TABLE care_wheel_chances_old;
