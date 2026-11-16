-- studymon-hw D1 schema v7 — 假期合作道馆批 1：8 张 coop 表（只新增）
--
-- 设计口径（DESIGN-假期合作-批1实施设计-v1 §8.1）：
--   * coop_events：合作事件，独立于任一孩子账号；participant 按 child_id 排序，
--     同一对孩子只有一个事件；孩子侧不加引用列，按 participant 反查。
--   * coop_node_progress：节点进度归属 event，不入个人资产。
--   * coop_gatherings：每人每假期一行的集结门槛快照，gate 只增不减。
--   * coop_rounds / coop_submissions：馆主决策与玩家提交物理分离，
--     保证馆主决策不读本回合玩家预选；提交唯一键 (battle_id, round_no, seat)。
--   * coop_runs：场次计数（拍板 C：win/lose/quit 计、void 不计）；
--     部分唯一索引保证同 event 同时只有一场未结束的 run。
--   * coop_settlements / coop_grants：通关结算幂等与双边发放明细；
--     reward_type 带 CHECK 枚举，结构上排除 XP / 精灵球 / 封印蛋（战斗不发经验）。
--   * 本迁移不触碰 children.total_xp / streak / 任何现网表。

CREATE TABLE coop_events (
  event_id TEXT PRIMARY KEY,
  holiday_id TEXT NOT NULL,
  map_version TEXT NOT NULL,
  participant_a INTEGER NOT NULL,
  participant_b INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'gathering', -- gathering | active | suspended | completed | closed
  version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0,
  UNIQUE (participant_a, participant_b),
  CHECK (participant_a < participant_b)
);
CREATE INDEX idx_coop_events_pa ON coop_events(participant_a, status);
CREATE INDEX idx_coop_events_pb ON coop_events(participant_b, status);

CREATE TABLE coop_node_progress (
  event_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'locked', -- locked | open | cleared
  branch_choice TEXT,                   -- 批 1 恒 NULL（无分叉，批 2 预留）
  sub_progress TEXT,                    -- JSON，批 1 预留
  camp_snapshot TEXT,                   -- JSON，只存引用 {week_key, run_id, battle_id, round_no, battle_version, lineup}
  version INTEGER NOT NULL DEFAULT 0,
  first_cleared_at INTEGER,
  PRIMARY KEY (event_id, node_id)
);

CREATE TABLE coop_gatherings (
  gathering_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  holiday_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  stats_snapshot TEXT NOT NULL DEFAULT '{}',
  gate_a_pass INTEGER NOT NULL DEFAULT 0,
  gate_b_pass INTEGER NOT NULL DEFAULT 0,
  result TEXT NOT NULL DEFAULT 'pending', -- pending | pass | makeup | makeup_pass | not_open
  makeup_deadline TEXT,
  makeup_gap TEXT,                      -- JSON，假期首日终结算时固定
  makeup_progress TEXT,                 -- JSON {days:[{date,subjects}], count, completed_at}
  version INTEGER NOT NULL DEFAULT 0,
  UNIQUE (event_id, holiday_id, user_id)
);
CREATE INDEX idx_coop_gatherings_user ON coop_gatherings(user_id, holiday_id);

CREATE TABLE coop_rounds (
  battle_id INTEGER NOT NULL,           -- 对齐 battles.id（INTEGER）
  round_no INTEGER NOT NULL,
  boss_action TEXT NOT NULL,            -- JSON，回合开启时在回合开始快照上决策并落库
  opened_at INTEGER NOT NULL DEFAULT 0,
  resolved_at INTEGER,
  result_json TEXT,
  PRIMARY KEY (battle_id, round_no)
);

CREATE TABLE coop_submissions (
  battle_id INTEGER NOT NULL,
  round_no INTEGER NOT NULL,
  seat TEXT NOT NULL CHECK (seat IN ('L', 'R')),
  user_id INTEGER NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'move', -- move | switch | support
  move_id TEXT,                             -- 招式名（与生产 resolveGymRound 的 moveName 口径对齐）
  switch_to INTEGER,
  target_seat TEXT,                         -- shell 保护对象 / 应援对象（L | R | BOSS）
  support_kind TEXT,                        -- a | b | c
  is_auto_pick INTEGER NOT NULL DEFAULT 0,
  submitted_at INTEGER NOT NULL DEFAULT 0,
  UNIQUE (battle_id, round_no, seat)
);

CREATE TABLE coop_runs (
  run_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  battle_id INTEGER NOT NULL UNIQUE,
  event_day TEXT NOT NULL,              -- 开局时刻所属事件日（上海日期）
  week_key TEXT NOT NULL,               -- 所属合作周起始日
  end_reason TEXT,                      -- win | lose | quit | void；未结束（含挂起/扎营）为 NULL
  counts_toward_cap INTEGER,            -- 结束时写入：win/lose/quit=1，void=0
  started_at INTEGER NOT NULL DEFAULT 0,
  ended_at INTEGER
);
CREATE UNIQUE INDEX ux_coop_runs_open ON coop_runs(event_id) WHERE end_reason IS NULL;
CREATE INDEX idx_coop_runs_day ON coop_runs(event_id, event_day);
CREATE INDEX idx_coop_runs_week ON coop_runs(event_id, week_key);

CREATE TABLE coop_settlements (
  settlement_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL,                 -- settled_granted | settled_repeat
  settled_at INTEGER NOT NULL DEFAULT 0,
  UNIQUE (run_id, node_id)
);
CREATE INDEX idx_coop_settlements_event ON coop_settlements(event_id, settled_at);

CREATE TABLE coop_grants (
  grant_id TEXT PRIMARY KEY,
  settlement_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('node_badge', 'node_sticker', 'expedition_badge', 'story_card')),
  reward_ref TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  granted_at INTEGER NOT NULL DEFAULT 0,
  UNIQUE (run_id, node_id, user_id, reward_type),
  UNIQUE (settlement_id, user_id, reward_type)
);
CREATE INDEX idx_coop_grants_user ON coop_grants(user_id);
