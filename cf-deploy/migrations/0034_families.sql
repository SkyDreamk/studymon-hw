-- 0034 用户系统 v2 多家庭：families 表；accounts / children / invite_codes 加 family_id；账号可多角色（roles）；
-- 家长凭证、临时授权、管理员查看日志。迁移时把现有全部账号和孩子归到 family #1（Miles 家），Miles 账号 = parent + sysadmin。
-- 重复执行：数据语句全部幂等（INSERT OR IGNORE / UPDATE ... WHERE ... IS NULL），第二遍结果与第一遍相同。
-- 唯一例外：SQLite 的 ALTER TABLE ADD COLUMN 没有 IF NOT EXISTS，第二遍整文件执行时这几行会报「duplicate column name」，
-- 但列已在，状态不变（wrangler 的迁移登记本来也只会执行一次）。tests/families-migration.test.mjs 逐句执行并验证这一点。
-- 不动任何业务表的数据：children 只多一列 family_id。

CREATE TABLE IF NOT EXISTS families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  settings_json TEXT NOT NULL DEFAULT '{}',
  pin2_hash TEXT,
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO families (id, name, status, settings_json, created_at)
VALUES (1, 'Miles 家', 'active', '{}', CAST(strftime('%s', 'now') AS INTEGER));

ALTER TABLE accounts ADD COLUMN family_id INTEGER;
ALTER TABLE accounts ADD COLUMN roles TEXT;
ALTER TABLE children ADD COLUMN family_id INTEGER;
ALTER TABLE invite_codes ADD COLUMN kind TEXT NOT NULL DEFAULT 'family';
ALTER TABLE invite_codes ADD COLUMN family_id INTEGER;

UPDATE accounts SET family_id = 1 WHERE family_id IS NULL;
UPDATE children SET family_id = 1 WHERE family_id IS NULL;
UPDATE invite_codes SET family_id = 1 WHERE family_id IS NULL AND kind = 'family';
UPDATE accounts SET roles = 'parent,sysadmin' WHERE roles IS NULL AND lower(username) = 'miles' AND role = 'parent';

CREATE INDEX IF NOT EXISTS idx_accounts_family ON accounts (family_id);
CREATE INDEX IF NOT EXISTS idx_children_family ON children (family_id);

-- 家长模式凭证（与 famsess 分开）：15 分钟无操作失效，退出家长区即删。admin_at = 系统管理再输 PIN 的时刻。
CREATE TABLE IF NOT EXISTS parent_creds (
  token TEXT PRIMARY KEY,
  session_token TEXT NOT NULL,
  account_id INTEGER,
  family_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_active INTEGER NOT NULL,
  admin_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_parent_creds_session ON parent_creds (session_token);

-- 临时授权：家长在「我家设置」开 24 小时，期间 sysadmin 可查看本家孩子数据排查问题；到期自动失效
CREATE TABLE IF NOT EXISTS family_grants (
  family_id INTEGER PRIMARY KEY,
  granted_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  granted_by INTEGER
);

-- sysadmin 每次查看别家数据都记一条
CREATE TABLE IF NOT EXISTS admin_access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_account_id INTEGER NOT NULL,
  family_id INTEGER NOT NULL,
  child_id INTEGER,
  what TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_log_family ON admin_access_log (family_id, at);
