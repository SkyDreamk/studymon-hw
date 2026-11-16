-- 照顾道具盘（2026-11-08 新建，养成转盘）：每日英语跟读奖励的机会表。
-- 途径：完成当日 5 句每日英语跟读（source 'daily-english'，ref_id=当日日期 YYYY-MM-DD）；
-- UNIQUE(child_id, source, ref_id) 防重发，每孩每天最多 1 次。
-- 不进 sync 注册表（SYNC_TABLES）：转盘须联网，离线端不掷骰、不发奖、不展示机会数。
-- 不占高级转盘周上限：不走 wheel_chances、不触 WHEEL_WEEK_LIMIT（周上限仅限高级转盘）。
-- 回滚：DROP TABLE care_wheel_chances;
CREATE TABLE IF NOT EXISTS care_wheel_chances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('daily-english')),
  ref_id TEXT NOT NULL,
  created_epoch INTEGER NOT NULL,
  used_epoch INTEGER,
  date_shanghai TEXT NOT NULL,
  UNIQUE(child_id, source, ref_id)
);
