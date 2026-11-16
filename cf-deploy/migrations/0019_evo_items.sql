-- studymon-hw D1 schema v19 — 进化道具系统 v11（2026-10-26 用户定）
-- 终极形态统一双条件：等级 16＋对应属性进化石（设计稿 DESIGN-进化道具-方案-v11.md）。
-- 首期道具：5 属性石＋日/月/妖精技能石、高级球/大师球、主宠蛋（5）/普通稀有蛋（2）、日常消耗品（§9.2）。
-- 兑换：普通球满 99 触发 5 普通→1 超级、10 超级→1 高级、20 高级→1 大师（大师球仅兑换获得）。
-- 回滚：DROP TABLE item_uses; DROP TABLE item_grants; DROP TABLE item_ledger;
--   DROP TABLE item_inventory; DROP TABLE item_catalog; DROP TABLE pet_instances;
--   DROP TABLE species_acquisitions; DROP TABLE school_test_records; DROP TABLE wheel_chances;
--   DROP TABLE wheel_week_quotas; DROP TABLE unit_tests; DROP TABLE unit_test_questions;
--   DROP TABLE unit_test_answers; DROP TABLE unit_test_draws; DROP TABLE draw_week_quotas;
--   DROP TABLE reward_eggs; DROP TABLE daily_item_drops;
--   （children.balls_hyper / balls_master 列保留，默认 0，不影响旧代码。）

-- 道具目录（种子数据，见文件尾 INSERT）
CREATE TABLE item_catalog (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  kind TEXT NOT NULL, -- stone | ball | egg | medicine
  rarity TEXT NOT NULL DEFAULT 'common', -- common | rare
  attr TEXT, -- 属性石对应的属性（电/火/水/草/冰），其余 NULL
  desc TEXT NOT NULL DEFAULT '',
  max_stack INTEGER NOT NULL DEFAULT 99
);

-- 孩子背包（进化石/技能石/蛋/消耗品；球类不走背包，读 children.balls/balls_super/balls_hyper/balls_master）
CREATE TABLE item_inventory (
  child_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  updated_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, item_key)
);

-- 库存流水（审计：一切增减必有行；reason 见后端 ITEM_LEDGER_REASONS）
CREATE TABLE item_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT,
  ref_id INTEGER,
  created_epoch INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL
);
CREATE INDEX idx_ledger_child_date ON item_ledger(child_id, date_shanghai);

-- 家长发放记录（路径 A 直接发放；每条来源＋道具最多一次，由唯一索引保证）
CREATE TABLE item_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL, -- school | history
  ref_id INTEGER, -- school_test_records.id 或 checkins.id
  created_epoch INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  UNIQUE (source, ref_id, item_key)
);

-- 石头/技能石使用记录（进化审计：用掉哪块石、变成什么）
-- 列名以 src/index.js 的 INSERT 为准（use_kind/ref_type/ref_id）。
CREATE TABLE item_uses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  use_kind TEXT NOT NULL, -- evolve | teach
  ref_type TEXT, -- line | stone | species
  ref_id TEXT, -- line key 或 species:{no} 或 eevee 实例 key
  created_epoch INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL
);

-- 宠物实例（实际形态状态：等级给可达上限，石头给实际形态）
-- line_key：主线 pikachu/charmander/squirtle/bulbasaur/eevee；收藏 species:{baseNo}；
--   多只伊布独立实例：首只为 'eevee'，后续为 'eevee:{eggId}'。
-- form_idx：主线 0 蛋/1 一阶/2 二阶/3 终极；收藏为进化线内阶段下标；伊布主线恒为 1，分支见 branch。
CREATE TABLE pet_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  line_key TEXT NOT NULL,
  species_no INTEGER NOT NULL, -- 当前实际物种
  form_idx INTEGER NOT NULL DEFAULT 0,
  branch TEXT, -- 伊布分支：vaporeon/jolteon/flareon/espeon/umbreon/leafeon/glaceon/sylveon
  source TEXT NOT NULL DEFAULT 'main', -- main | egg | catch | gift
  egg_id INTEGER,
  evolved_via TEXT, -- 进化所用道具 key（如 stone:thunder）
  has_been_main INTEGER NOT NULL DEFAULT 0, -- 是否曾作过主宠（切回已拥有主宠无需重获蛋或石）
  created_epoch INTEGER NOT NULL,
  updated_epoch INTEGER NOT NULL,
  UNIQUE (child_id, line_key)
);

-- 永久获得标记（蛋去重用；reset 清空）
CREATE TABLE species_acquisitions (
  child_id INTEGER NOT NULL,
  species_no INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'egg',
  first_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, species_no)
);

-- 学校成绩（路径 A；每条成绩最多一次直接发放，由 reward_granted＋item_grants 唯一索引双重保证）
-- 列名以 src/index.js 的 INSERT/SELECT 为准（score/full_score/pct、reward_item_key、reward_granted_epoch）。
CREATE TABLE school_test_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  score REAL NOT NULL,
  full_score REAL NOT NULL DEFAULT 100,
  pct REAL NOT NULL,
  exam_date TEXT NOT NULL,
  photo_key TEXT, -- R2 key（school/{childId}/{recordId}.{ext}），试卷凭证
  photo_expires_epoch INTEGER, -- 到期删照片（15 天），仅留文字档案
  reward_granted INTEGER NOT NULL DEFAULT 0,
  reward_item_key TEXT,
  reward_granted_epoch INTEGER,
  status TEXT NOT NULL DEFAULT 'active', -- active | void
  created_epoch INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL
);
CREATE INDEX idx_school_child_date ON school_test_records(child_id, date_shanghai);

-- 转盘机会（每条 ≥95 分成绩限 1 次；照片为凭证，复用打卡照片 R2 方式，留存 15 天）
-- 列名以 src/index.js 为准：week_start（周配额计数用）＋ used_epoch（NULL=未用）。
CREATE TABLE wheel_chances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  school_test_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  used_epoch INTEGER,
  created_epoch INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  UNIQUE (school_test_id)
);
-- 转盘周配额（每孩每周 ≤3 次、同一科目每周 ≤1 次）
CREATE TABLE wheel_week_quotas (
  child_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  subject TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (child_id, week_start, subject)
);

-- App 内单元测试（路径 B；测试独立记录，不写 quiz_daily/quiz_attempts，不发经验不掉球）
-- 列名以 src/index.js 为准：question_ids（题号 JSON 快照）、week_start、created_epoch；
-- 提交后写 score/correct_count/total_count/submitted_epoch。
CREATE TABLE unit_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  unit TEXT NOT NULL,
  question_ids TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open', -- open | submitted
  score INTEGER,
  correct_count INTEGER,
  total_count INTEGER,
  week_start TEXT NOT NULL,
  created_epoch INTEGER NOT NULL,
  submitted_epoch INTEGER,
  date_shanghai TEXT NOT NULL
);
CREATE TABLE unit_test_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_test_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  question_json TEXT NOT NULL, -- 题目快照（含答案，供提交时计分）
  UNIQUE (unit_test_id, question_id)
);
CREATE TABLE unit_test_answers (
  unit_test_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  created_epoch INTEGER NOT NULL,
  PRIMARY KEY (unit_test_id, question_id)
);
CREATE TABLE unit_test_draws (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_test_id INTEGER NOT NULL UNIQUE,
  won INTEGER NOT NULL DEFAULT 0,
  prize_key TEXT, -- item key 或 null
  created_epoch INTEGER NOT NULL
);
-- 单元测试周配额（每孩每周 ≤3 次，中奖与否均计数；同孩子/科目/单元重开冷却 24 小时由 created_epoch 校验）
CREATE TABLE draw_week_quotas (
  child_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (child_id, week_start)
);

-- 奖励蛋（转盘/单元测试/家长直接发放的蛋；7 天孵化，与 sealed_eggs 同口径）
CREATE TABLE reward_eggs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  species_no INTEGER NOT NULL,
  source TEXT NOT NULL, -- wheel | unit_test | parent | exchange
  ref_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | hatched
  unlock_date TEXT NOT NULL,
  hatched_at TEXT,
  created_epoch INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL
);
CREATE INDEX idx_reward_eggs_child ON reward_eggs(child_id, status);

-- 日常答题随机掉落（§9.2：与原掉球叠加、不替代；每日最多 3 件）
CREATE TABLE daily_item_drops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  date_shanghai TEXT NOT NULL,
  created_epoch INTEGER NOT NULL
);
CREATE INDEX idx_daily_drops_child_date ON daily_item_drops(child_id, date_shanghai);

-- 高级球/大师球库存（与 balls/balls_super 同口径，读 children 表，不复制可支用余额）
ALTER TABLE children ADD COLUMN balls_hyper INTEGER NOT NULL DEFAULT 0;
ALTER TABLE children ADD COLUMN balls_master INTEGER NOT NULL DEFAULT 0;
-- 妖精技能石教会的招式（JSON 数组 [{name, level, type}]；effectiveMoves 只认 LINES 表内招式，故单存一列）
ALTER TABLE children ADD COLUMN fairy_moves TEXT NOT NULL DEFAULT '[]';

-- 道具目录种子（v11 首期；球类仅作展示与兑换口径，库存读 children 表）
INSERT INTO item_catalog(key, name, emoji, kind, rarity, attr, desc, max_stack) VALUES
  ('stone:thunder', '雷之石', '⚡', 'stone', 'common', '电', '让电属性宝可梦进化的石头。', 99),
  ('stone:fire', '火之石', '🔥', 'stone', 'common', '火', '让火属性宝可梦进化的石头。', 99),
  ('stone:water', '水之石', '💧', 'stone', 'common', '水', '让水属性宝可梦进化的石头。', 99),
  ('stone:leaf', '叶之石', '🍃', 'stone', 'common', '草', '让草属性宝可梦进化的石头。', 99),
  ('stone:ice', '冰之石', '🧊', 'stone', 'common', '冰', '让冰属性宝可梦进化的石头。', 99),
  ('stone:sun', '日之石', '☀️', 'stone', 'rare', NULL, '珍惜的进化石，能让特定的宝可梦进化。', 99),
  ('stone:moon', '月之石', '🌙', 'stone', 'rare', NULL, '珍惜的进化石，能让特定的宝可梦进化。', 99),
  ('stone:fairy-skill', '妖精技能石', '🧚', 'stone', 'rare', NULL, '教伊布学会一个妖精系招式的教学道具，仅伊布可用。', 99),
  ('ball:hyper', '高级球', '🟡', 'ball', 'common', NULL, '比超级球更容易抓到宝可梦。', 99),
  ('ball:master', '大师球', '🟣', 'ball', 'rare', NULL, '一定能抓到宝可梦的究极之球，仅兑换获得。', 99),
  ('egg:bulbasaur', '妙蛙种子蛋', '🥚', 'egg', 'rare', NULL, '孵化出妙蛙种子。7 天孵化。', 99),
  ('egg:charmander', '小火龙蛋', '🥚', 'egg', 'rare', NULL, '孵化出小火龙。7 天孵化。', 99),
  ('egg:squirtle', '杰尼龟蛋', '🥚', 'egg', 'rare', NULL, '孵化出杰尼龟。7 天孵化。', 99),
  ('egg:pikachu', '皮卡丘蛋', '🥚', 'egg', 'rare', NULL, '直接孵化出皮卡丘。7 天孵化。', 99),
  ('egg:eevee', '伊布蛋', '🥚', 'egg', 'rare', NULL, '孵化出伊布。7 天孵化。', 99),
  ('egg:vulpix', '六尾蛋', '🥚', 'egg', 'rare', NULL, '孵化出六尾。7 天孵化。', 99),
  ('egg:growlithe', '卡蒂狗蛋', '🥚', 'egg', 'rare', NULL, '孵化出卡蒂狗。7 天孵化。', 99),
  ('item:metal-coat', '金属膜', '🔩', 'stone', 'rare', NULL, '连接交换进化道具：大岩蛇→大钢蛇、飞天螳螂→巨钳螳螂。', 99),
  ('item:electirizer', '电力增强器', '🔌', 'stone', 'rare', NULL, '连接交换进化道具：电击兽→电击魔兽。', 99),
  ('item:protector', '护具', '🛡️', 'stone', 'rare', NULL, '连接交换进化道具：铁甲暴龙→钻角犀兽。', 99),
  ('item:black-augurite', '黑奇石', '🪨', 'stone', 'rare', NULL, '进化道具：飞天螳螂→劈斧螳螂。', 99),
  ('medicine:potion', '伤药', '💊', 'medicine', 'common', NULL, '道馆战斗中回复 25% 体力。', 99),
  ('medicine:berry-juice', '树果汁', '🧃', 'medicine', 'common', NULL, '道馆战斗中回复 25% 体力。', 99),
  ('medicine:super-potion', '好伤药', '💊', 'medicine', 'common', NULL, '道馆战斗中回复 50% 体力。', 99),
  ('medicine:water', '美味之水', '💧', 'medicine', 'common', NULL, '道馆战斗中回复 50% 体力。', 99),
  ('medicine:revive', '活力碎片', '✨', 'medicine', 'common', NULL, '道馆战斗中复活昏厥的宝可梦，回复 50% 体力。', 99);
