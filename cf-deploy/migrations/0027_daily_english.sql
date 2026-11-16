-- 每日英语打卡完成记录（2026-11-07 新建）：每孩每天一行，记当日 5 句 sid 列表与完成时间。
-- v1 只跟读打卡、不加经验、不答题；打卡接口幂等（INSERT OR IGNORE，同一天重复点只记一次）。
-- 不进 sync 注册表（SYNC_TABLES）：选题与打卡均须联网，离线端不选题、不记完成。
-- 只应用到测试库；回滚：DROP TABLE daily_english_logs;
CREATE TABLE IF NOT EXISTS daily_english_logs (
  child_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  sids TEXT NOT NULL DEFAULT '[]',
  completed_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, date_shanghai)
);
