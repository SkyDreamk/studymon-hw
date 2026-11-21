-- 0037：8 关扩围关号重排——旧 S5 火、S6 地面顺延为 S7、S8；新 S5 毒、S6 超能力
-- gym_progress 是通关进度的权威记录（PRIMARY KEY (child_id, stage)），必须重映射，
-- 否则旧 S5（火）的通关会被算到新 S5（毒）头上。旧关号只到 6，目标 7/8 不存在，
-- 直接 UPDATE 无主键冲突；先 6→8 再 5→7。
-- battles（mode='gym'）的 stage 同步重映射：进行中的对局按 stage 查 GYM_STAGES 领奖
-- （awardGymClear），不映射会把火系对局的胜场算成毒系的蛋/徽章。PvP 的 stage 为 NULL，不受影响。
-- 实测：测试库只有小宝清了 S1/S2，正式库同样无 S5/S6 通关记录；本迁移是防御性修正。
UPDATE gym_progress SET stage = 8 WHERE stage = 6;
UPDATE gym_progress SET stage = 7 WHERE stage = 5;
UPDATE battles SET stage = 8 WHERE mode = 'gym' AND stage = 6;
UPDATE battles SET stage = 7 WHERE mode = 'gym' AND stage = 5;
