-- 每日数学口算记录（2026-11-09 新建，任务表 77②）：每天 5 道口算，5 道答对 4 道（80%）算完成。
-- 出题器纯函数（种子 child_id＋当天日期），答案由种子重算、不下发前端；每题一次作答、提交后锁定。
-- 完成发 1 次养成转盘机会（source 'daily-math'、ref_id 当日日期、INSERT OR IGNORE 幂等）。
-- 只应用到测试库；回滚：DROP TABLE daily_math_answers; DROP TABLE daily_math_logs;
CREATE TABLE IF NOT EXISTS daily_math_logs (
  child_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  completed_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, date_shanghai)
);
CREATE TABLE IF NOT EXISTS daily_math_answers (
  child_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  qindex INTEGER NOT NULL,
  answer INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  answered_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, date_shanghai, qindex)
);
