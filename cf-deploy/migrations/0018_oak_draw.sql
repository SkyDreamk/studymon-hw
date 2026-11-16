-- studymon-hw D1 schema v18 — 大木博士跟读奖励：每句点评最好成绩＋每日抽奖（2026-10-26 用户定）
-- 两档：听完 6 句给 quizXp（已有行为，不动）；6 句都 5 星（每句 pron ≥85，按当日最好成绩）时
-- 在 10 XP 之外再抽一次，每天一次。奖池第一期：70% 经验 +10（OAK_DRAW_XP）、30% 普通精灵球 ×1。
-- oak_assessments 是派生快照（最好成绩可由点评记录重算）；oak_draws 是发放审计，幂等键为 child_id＋date。
-- 回滚：DROP TABLE oak_draws; DROP TABLE oak_assessments;
CREATE TABLE oak_assessments (
  child_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  best_pron REAL NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  updated_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, question_id, date_shanghai)
);
CREATE TABLE oak_draws (
  child_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  prize TEXT NOT NULL CHECK (prize IN ('xp', 'ball')),
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  balls_awarded INTEGER NOT NULL DEFAULT 0,
  created_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, date_shanghai)
);
