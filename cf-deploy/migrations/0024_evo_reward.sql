-- 重复进化奖励（2026-11-06，用户定）：备战宠进化时目标形态已拥有，
-- 不产生第二只，低形态保留，进化动作转为领奖——奖励 1 次转盘，每条进化线
-- （按步骤 from→to 记）一生一次；转盘次数不计入每周 3 次上限，进化奖励另计。
-- 本表一行同时是领奖标记：行存在 = 该步骤已领过奖（UNIQUE 兜底防并发重复领）。
-- 为什么不用 wheel_chances：school_test_id 是 NOT NULL + UNIQUE，进化奖励没有
-- 学校成绩 id，放不进去；学校周上限只数 wheel_chances 的行，进化奖励放新表
-- 则自然不计入上限，正好符合“另计”。
-- 同步：本表只由服务端读写（领奖判定、转盘次数统计、抽奖取行），不进
-- SYNC_TABLES、不加 updated_epoch/ver 列——与 0023 的 care_qa_logs 同口径；
-- 孩子端看到的转盘次数走 /api/evo/backpack 接口实时算，转盘本身须联网。
CREATE TABLE IF NOT EXISTS evo_wheel_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  step_key TEXT NOT NULL,
  week_start TEXT NOT NULL,
  used_epoch INTEGER,
  created_epoch INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  UNIQUE (child_id, step_key)
);
