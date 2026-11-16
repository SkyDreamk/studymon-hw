-- 转盘升级（2026-11-07）：oak_draws 重建——prize CHECK 加 'item'，新增 prize_key 列。
-- 依赖：0020_sync 已应用（oak_draws 含 updated_epoch/ver 列，重建须一并保留；
-- 本迁移的 INSERT … SELECT 引用这两列，未应用 0020 时会失败）。
-- SQLite 不支持原地改 CHECK，须建新表 → 拷数据 → 删旧表 → 改名；数据全量保留
-- （xp/ball 行 prize_key 留 NULL，新奖品行 prize='item'、prize_key=<道具 key>）。
-- 回滚：DROP TABLE oak_draws;（数据为抽奖审计；重建前请先快照，重建后按快照恢复。）
CREATE TABLE oak_draws_new (
  child_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  prize TEXT NOT NULL CHECK (prize IN ('xp', 'ball', 'item')),
  prize_key TEXT,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  balls_awarded INTEGER NOT NULL DEFAULT 0,
  created_epoch INTEGER NOT NULL,
  updated_epoch INTEGER NOT NULL DEFAULT 0,
  ver INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (child_id, date_shanghai)
);
INSERT INTO oak_draws_new(child_id, date_shanghai, prize, prize_key, xp_awarded, balls_awarded, created_epoch, updated_epoch, ver)
  SELECT child_id, date_shanghai, prize, NULL, xp_awarded, balls_awarded, created_epoch, updated_epoch, ver FROM oak_draws;
DROP TABLE oak_draws;
ALTER TABLE oak_draws_new RENAME TO oak_draws;
