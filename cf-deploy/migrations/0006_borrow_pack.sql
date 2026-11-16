-- studymon-hw D1 schema v6 — 借鉴包 v1：高级球库存 + 答题掉球记账 + 遭遇答题状态
--
-- 设计口径（与 src/index.js 对应，规格见 ~/workspace/studymon-hw/DESIGN-借鉴包-v1.md）：
--   * children.balls_super：高级球（超级球）库存，默认 0；普通球沿用 0005 的 balls。
--     答题掉落（普通 8% / 高级 1%，每天上限 2）入库存；抓捕投超级球时扣减。
--   * ball_drops：答题掉球记账（一行 = 一次掉落），「每天上限 2 个、跨日重置」
--     按 (child_id, date_shanghai) 计数实现。
--   * encounters.quiz_state：答题抓捕的待答题组 JSON（{ball, questionIds}），
--     只存题号与球种、不存答案；答完结算后置 NULL。encounters.hits 口径随之变化：
--     旧制为「3 次投球命中次数（≥2 抓中）」，新制为「是否命中过（0/1，命中即抓中）」；
--     balls_used 口径不变（已投球次数，上限 3）。旧行 hits 不回填（历史遭遇均已结束）。
--   * 本迁移不触碰 total_xp / streak，战斗与抓捕都不发经验。

ALTER TABLE children ADD COLUMN balls_super INTEGER NOT NULL DEFAULT 0;

CREATE TABLE ball_drops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  kind TEXT NOT NULL, -- normal | super
  created_epoch INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_ball_drops_child_date ON ball_drops(child_id, date_shanghai);

ALTER TABLE encounters ADD COLUMN quiz_state TEXT;
