CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);
INSERT OR IGNORE INTO role_permissions (role, permission) VALUES
  ('sysadmin', 'settings.global'),
  ('sysadmin', 'admin.access'),
  ('sysadmin', 'family.manage'),
  ('parent', 'family.manage');
