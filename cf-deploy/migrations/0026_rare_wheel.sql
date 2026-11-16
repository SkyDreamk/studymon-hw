-- 稀有转盘（2026-11-07 新建）：稀有转盘机会表。
-- 途径：出测验题（source 'question'，ref_id=新题 id）与期末考试成绩优秀
-- （source 'final-exam'，ref_id=成绩记录 id）；UNIQUE(child_id, source, ref_id) 防重发。
-- 不进 sync 注册表（SYNC_TABLES）：转盘须联网，离线端不掷骰、不发奖、不展示机会数。
-- 回滚：DROP TABLE rare_wheel_chances;
CREATE TABLE IF NOT EXISTS rare_wheel_chances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('question', 'final-exam')),
  ref_id INTEGER NOT NULL,
  created_epoch INTEGER NOT NULL,
  used_epoch INTEGER,
  date_shanghai TEXT NOT NULL,
  UNIQUE(child_id, source, ref_id)
);
