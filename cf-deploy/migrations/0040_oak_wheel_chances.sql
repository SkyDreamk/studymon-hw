-- 普通转盘（2026-11-17 新建，Oak 英语交流奖励）：够格时发 1 次普通转盘机会，机会在转盘中心里转。
-- 途径：当日 6 句全 ≥75 且 ≥4 句 ≥85（source 'oak'，ref_id=当日日期 YYYY-MM-DD）；
-- UNIQUE(child_id, source, ref_id) 防重发，每孩每天最多 1 次。
-- 不进 sync 注册表（SYNC_TABLES）：转盘须联网，离线端不掷骰、不发奖、不展示机会数。
-- 不占高级转盘周上限：不走 wheel_chances、不触 WHEEL_WEEK_LIMIT（周上限仅限高级转盘）。
-- 与其他普通转盘机会分开记：本表只记 Oak 机会，互不挤占。
-- 回滚：DROP TABLE oak_wheel_chances;
CREATE TABLE IF NOT EXISTS oak_wheel_chances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('oak')),
  ref_id TEXT NOT NULL,
  created_epoch INTEGER NOT NULL,
  used_epoch INTEGER,
  date_shanghai TEXT NOT NULL,
  UNIQUE(child_id, source, ref_id)
);
