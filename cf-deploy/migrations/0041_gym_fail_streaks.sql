-- 道馆二期 Tier 1（2026-11-17）：连败计数（服务端记，按孩子＋关卡）。
-- 道馆战输了 +1、赢了清零；只记道馆战（PvP、野外、合作不碰）。streak ≥ 1 即 Tier 1
-- （关卡页横幅“博士的战术放大镜”＋对战招式克制角标）；streak = 0 时无任何变化。
-- 用新表不用 gym_progress 加列——gym_progress 只存已通关的行，未通关的关卡没行、放不下连败数。
-- 不进 sync 注册表（SYNC_TABLES）：服务端记账，前端经 /api/gym/status 读；离线端不算连败，
-- 离线输赢走 outbox gym_settle 同步后由服务端记（见 settleGymCore）。
-- 回滚：DROP TABLE gym_fail_streaks;
CREATE TABLE IF NOT EXISTS gym_fail_streaks (
  child_id INTEGER NOT NULL,
  stage INTEGER NOT NULL,
  streak INTEGER NOT NULL DEFAULT 0,
  updated_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, stage)
);
