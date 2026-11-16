-- studymon-hw D1 schema v11 — 家长发球审计（只新增）
--
-- 需求口径（用户 2026-10-24）：回滚已结算题组太折腾，改为家长模式里直接发球。
-- 家长每点一次给指定孩子发 1 颗普通精灵球，不批量、不发超级球；发球不发经验、
-- 不发碎片、不影响答题掉落口径、不改遭遇/扔球次数上限。
--   * 一行 = 一次发放；kind 目前只取 'normal'（普通精灵球），qty 恒为 1（接口层固定，
--     不接受客户端传的数量，避免批量改数）。
--   * 审计与发放同一事务语义：接口层先加球数再写本行（或同批执行），缺任何一行
--     都视为未发放成功；家长模式内可查最近记录，杜绝无痕改数。
--   * 本表只记家长发放；答题掉落、周冠军奖球等其他球数来源各走各的落账口径，不混记。

CREATE TABLE ball_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'normal' CHECK (kind IN ('normal')),
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  created_epoch INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL
);
CREATE INDEX idx_ball_grants_child ON ball_grants(child_id, created_epoch DESC);
