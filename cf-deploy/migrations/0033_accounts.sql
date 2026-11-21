-- 0033 用户系统第一步：账号表（用户名＋密码登录）。幂等：全部 IF NOT EXISTS / INSERT OR IGNORE，重复执行结果一致。
-- 不改 children 表；孩子所有数据（打卡/宠物/背包/球/对战/道馆）仍挂 children.id，账号只通过 child_id 关联。
-- 密码：PBKDF2-SHA256（WebCrypto），pw_hash/salt 为 base64。本迁移生成的初始账号 salt='' 表示「旧 PIN 的 SHA-256 暂存」，
-- 初始密码＝当前家长 PIN（设计如此）；首次登录成功后服务端立即换成 PBKDF2，并强制改密码（pw_changed_at 为空＝仍是初始密码）。

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,                       -- 按起名原样保存与显示（DaBao 就是 DaBao）；判重/登录一律不区分大小写
  pw_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  child_id INTEGER,                             -- 关联 children.id；家长账号为空
  display_name TEXT NOT NULL,                   -- 中文显示名
  avatar_key TEXT NOT NULL DEFAULT 'pikachu',   -- 8 款默认头像之一
  avatar_url TEXT,                              -- 预留：第二步自定义头像（R2 地址），本步不用
  created_at INTEGER NOT NULL,
  pw_changed_at INTEGER                         -- 空＝还没改过初始密码（强制改密）
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_username_lc ON accounts (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_child ON accounts (child_id) WHERE child_id IS NOT NULL;

-- 登录失败计数：key = 小写用户名 + '|' + IP，5 次锁 10 分钟（对不存在的用户名同样计，不泄露用户名是否存在）
CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- 一次性邀请码：7 天有效，用一次作废
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  used_by_account INTEGER,
  line TEXT NOT NULL DEFAULT 'pikachu',         -- 注册时给新孩子建档用的宠物线
  grade_label TEXT NOT NULL DEFAULT '一年级'
);

-- 会话与账号的关联（改密码时据此让同账号的其他会话失效；不改现有 sessions 表）
CREATE TABLE IF NOT EXISTS account_sessions (
  token TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_account_sessions_account ON account_sessions (account_id);

-- 迁移绑定：每个现有孩子自动建一个 child 账号（临时用户名 dabao / xiaobao / test1…），初始密码＝当前 PIN
INSERT OR IGNORE INTO accounts (username, pw_hash, salt, role, child_id, display_name, avatar_key, created_at, pw_changed_at)
SELECT
  CASE c.id WHEN 1 THEN 'dabao' WHEN 2 THEN 'xiaobao' ELSE 'test' || (c.id - 2) END,
  COALESCE((SELECT value FROM settings WHERE key = 'pin'), ''),
  '',
  'child',
  c.id,
  c.name,
  CASE c.line WHEN 'charmander' THEN 'charmander' WHEN 'bulbasaur' THEN 'bulbasaur' WHEN 'squirtle' THEN 'squirtle' WHEN 'eevee' THEN 'eevee' ELSE 'pikachu' END,
  CAST(strftime('%s', 'now') AS INTEGER),
  NULL
FROM children c;

-- 家长账号同样自动建好（初始密码＝当前 PIN，首次登录强制改密码）
INSERT OR IGNORE INTO accounts (username, pw_hash, salt, role, child_id, display_name, avatar_key, created_at, pw_changed_at)
SELECT 'miles', COALESCE((SELECT value FROM settings WHERE key = 'pin'), ''), '', 'parent', NULL, 'Miles', 'snorlax',
  CAST(strftime('%s', 'now') AS INTEGER), NULL;
