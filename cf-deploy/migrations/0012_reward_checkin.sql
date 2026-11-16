-- studymon-hw D1 schema v12 — 打卡历史奖励（只新增/放宽）
--
-- 需求口径（用户 2026-10-24）：家长面板「历史」页每条已通过打卡记录可点「奖励」，
-- 给该孩子发 1 颗普通精灵球；奖励记录关联 checkin_id，每条记录限奖 1 次。
--   * ball_grants 新增 checkin_id 列（通用发球卡的记录为 NULL，不变）。
--   * kind 字段承载奖励类型：现只有 'normal'（普通精灵球），本次重建表时去掉
--     kind 的 CHECK 约束，后续超级球/其他道具加 kind 不改表结构、不改主流程。
--   * 每条记录限奖 1 次：部分唯一索引保证（checkin_id 非空时唯一），接口层先查后插，
--     并发重复提交由索引兜底为 409。
--   * 重建表保留全部已有行（通用发球审计行原样迁移）。

CREATE TABLE ball_grants_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'normal',
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  checkin_id INTEGER,
  created_epoch INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL
);
INSERT INTO ball_grants_new (id, child_id, kind, qty, created_epoch, date_shanghai)
  SELECT id, child_id, kind, qty, created_epoch, date_shanghai FROM ball_grants;
DROP TABLE ball_grants;
ALTER TABLE ball_grants_new RENAME TO ball_grants;
CREATE INDEX idx_ball_grants_child ON ball_grants(child_id, created_epoch DESC);
CREATE UNIQUE INDEX idx_ball_grants_checkin ON ball_grants(checkin_id) WHERE checkin_id IS NOT NULL;
