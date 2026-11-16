-- studymon-hw D1 schema v3 — 入口改造：角色选择入口 + 孩子各自 4 位密码 + 服务端会话隔离
-- 会话模型：sessions.kind = 'child'（绑定 child_id，只能访问该孩子数据）
--          | 'parent'（家长 PIN 在入口登录或由孩子会话输 PIN 升级；pin_verified_at 为验证时刻）

ALTER TABLE sessions ADD COLUMN kind TEXT;
ALTER TABLE sessions ADD COLUMN child_id INTEGER;
-- 旧的家庭密码会话全部作废：应用本迁移后所有设备按新入口重新登录一次
DELETE FROM sessions;

ALTER TABLE children ADD COLUMN pwd_hash TEXT;  -- 孩子 4 位数字密码的 SHA-256 hex；NULL = 未设置
ALTER TABLE children ADD COLUMN pwd_fail_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE children ADD COLUMN pwd_locked_until INTEGER NOT NULL DEFAULT 0;

-- 待展示通知（连击里程碑庆祝等）：写入后由孩子端首页展示，展示确认后标记 shown
CREATE TABLE child_notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  kind TEXT NOT NULL,               -- streak_box（预留扩展）
  payload TEXT NOT NULL DEFAULT '{}',
  created_epoch INTEGER NOT NULL DEFAULT 0,
  shown INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_notices_child_shown ON child_notices(child_id, shown);

-- 家庭密码退役（登录接口已下线）
DELETE FROM settings WHERE key='family_password';
