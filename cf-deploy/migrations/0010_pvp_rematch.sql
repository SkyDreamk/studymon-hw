-- studymon-hw D1 schema v10 — 兄弟对战「再来一局」申请（只新增）
--
-- 需求口径（用户 2026-10-24）：对战结束后孩子可申请再来一局，家长审核；
-- 批准后解锁一场额外对战，其余入场条件（周末＋双方本周打卡 ≥4 天、输密码加入）不变。
--   * 一行 = 一次申请；week_start 为周一日期（与 battles.week_start 同口径），
--     跨周后旧申请不再出现在任何当周视图中，即自动失效。
--   * status：pending 待审核 / approved 已批准未用 / rejected 已驳回 / consumed 已被一场再来一局用掉。
--   * 同一周至多一行 pending 或 approved（由接口层闸门保证，不叠加囤积）。
--   * granted_battle_id：consumed 时回填消费它的 battles.id，便于对账。
--   * 再来一局的胜负口径（是否算周冠军/赢家奖球）未定案：v1 保守实现为
--     不计次（battles.counted 保持 0）、不发奖球、不改已决出的周冠军（见 finalizeBattle）。

CREATE TABLE pvp_rematch_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,
  requester_child_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'consumed')),
  created_epoch INTEGER NOT NULL,
  decided_epoch INTEGER,
  granted_battle_id INTEGER
);
CREATE INDEX idx_pvp_rematch_week ON pvp_rematch_requests(week_start, status);
