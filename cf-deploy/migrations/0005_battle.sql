-- studymon-hw D1 schema v5 — 战斗系统：道馆闯关梯子 + 兄弟对战（共用战斗引擎）
--
-- 设计口径（与 src/index.js 的战斗引擎对应）：
--   * battles：统一战斗表（mode=gym 闯关 / pvp 兄弟对战）。战斗全状态（双方队伍、
--     HP、回合、日志）以 JSON 存 state 列，服务端推进；pvp 的加入方回合凭证
--     只存 sha256 哈希（join_token_hash），明文只在加入时返回一次。
--   * gym_progress：道馆闯关进度（一行 = 一关首通），决定梯子解锁与徽章点亮；
--     奖励蛋只在首通时发（见 index.js 的发奖逻辑），重复通关不重发。
--   * sealed_eggs.species：封印蛋泛化。旧蛋（本迁移之前发放的）一律 151（梦幻），
--     与旧行为完全一致；新蛋按关卡写 species（143/131/133/147/151），
--     孵化按 species 入图鉴（151 沿用 rare:151，其余用 egg:{no}）。
--   * children.balls：精灵球库存。注意：旧代码并无此字段（野外遭遇的球是每场
--     固定 3 次机会、不占库存）；本列为兄弟对战奖励新增（胜者 +1，纯荣誉道具），
--     默认 3 个起步。战斗系统绝不发经验，本迁移不触碰 total_xp / streak。

CREATE TABLE battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mode TEXT NOT NULL,                    -- gym | pvp
  week_start TEXT NOT NULL,              -- 战斗所在周（周一，上海日期）
  stage INTEGER,                         -- gym 关卡号 1..4；pvp 为 NULL
  child_a INTEGER NOT NULL,              -- gym：挑战的孩子；pvp：发起方
  child_b INTEGER,                       -- pvp：加入方；gym 为 NULL
  state TEXT NOT NULL DEFAULT '{}',      -- 战斗状态 JSON（引擎推进）
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting（pvp 待加入）| active | finished | abandoned
  winner_child_id INTEGER,               -- 胜者孩子 id（gym 馆主胜为 NULL 且 state.winner='B'）
  counted INTEGER NOT NULL DEFAULT 0,    -- pvp 正式赛计次（完成才置 1；弃赛不计次）
  join_token_hash TEXT,                  -- pvp 加入方回合凭证 sha256；明文不落库
  created_epoch INTEGER NOT NULL DEFAULT 0,
  finished_epoch INTEGER
);
CREATE INDEX idx_battles_a ON battles(child_a, status);
CREATE INDEX idx_battles_week ON battles(mode, week_start, status);

CREATE TABLE gym_progress (
  child_id INTEGER NOT NULL,
  stage INTEGER NOT NULL,                -- 1..4
  cleared_at TEXT NOT NULL,              -- 首通日期（上海）
  PRIMARY KEY (child_id, stage)
);

ALTER TABLE sealed_eggs ADD COLUMN species INTEGER NOT NULL DEFAULT 151;
ALTER TABLE children ADD COLUMN balls INTEGER NOT NULL DEFAULT 3;
