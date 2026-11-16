-- studymon-hw D1 schema v8 — battles 表 coop 扩展列（只新增，gym/pvp 行恒为 NULL/0）
--
-- 设计口径（DESIGN-假期合作-批1实施设计-v1 §8.2）：
--   * coop_event_id / node_id / run_id / seat_meta / since_epoch：合作链路专用。
--   * version / round_no：设计 §7.2 要求 battles.version CAS 与 round_no 匹配
--     （定稿 §7.4 清单未列这两列，实施设计 §2.1.2 建议补入，本迁移一并新增）。
--   * 0005 的 battles.mode / status 无 CHECK 约束（已核对），mode='coop' 与
--     status='suspended' 只由新代码写入，旧代码读不到这类行。
--   * coop 行填法：winner_child_id 恒 NULL、counted 恒 0、week_start=合作周周一、
--     join_token_hash 不用（双席 token 存 seat_meta.tokens 的 sha256）。

ALTER TABLE battles ADD COLUMN coop_event_id TEXT;
ALTER TABLE battles ADD COLUMN node_id TEXT;
ALTER TABLE battles ADD COLUMN run_id TEXT;
ALTER TABLE battles ADD COLUMN seat_meta TEXT;
ALTER TABLE battles ADD COLUMN since_epoch INTEGER;
ALTER TABLE battles ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE battles ADD COLUMN round_no INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_battles_coop ON battles(coop_event_id, status) WHERE mode = 'coop';
