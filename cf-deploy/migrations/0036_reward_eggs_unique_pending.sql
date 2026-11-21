-- 0036：reward_eggs 未孵蛋唯一（防高级转盘并发同蛋重复发）
-- 同一孩子同一物种只能有一颗未孵（pending）的奖励蛋；DB 层兜底 grantEgg 的先查后插。
-- 133（伊布）除外：伊布需多颗蛋进化 8 种形态，应用层 grantEgg 本就豁免 133 的去重检查。
CREATE UNIQUE INDEX IF NOT EXISTS ux_reward_eggs_child_species_pending
  ON reward_eggs(child_id, species_no)
  WHERE status = 'pending' AND species_no != 133;
