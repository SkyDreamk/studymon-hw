/* 角色权限表 role_permissions（迁移 0035）：权限矩阵 + 家长模式角色抬升
 * node --test tests/role-permissions.test.mjs（内存 SQLite，驱动 Worker 真实 fetch；不碰任何远端库） */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));
const PRE = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0033_accounts.sql', '0043_pet_instances_ability.sql'];
PRE.push('0034_families.sql', '0035_role_permissions.sql');
const SQL = (f) => readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8');
const SHA_000000 = '91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203';

function wrapDb(raw) {
  const wrap = (sql) => ({
    _args: [],
    bind(...args) { this._args = args; return this; },
    async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
    async all() { return { results: raw.prepare(sql).all(...this._args) }; },
    async run() { const r = raw.prepare(sql).run(...this._args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
  });
  return { prepare: (sql) => wrap(sql), async batch(stmts) { for (const s of stmts) await s.run(); return []; } };
}
function makeRaw(withFamilies) {
  const raw = new DatabaseSync(':memory:');
  for (const f of PRE) raw.exec(SQL(f));
  raw.exec(`UPDATE accounts SET pw_hash='${SHA_000000}'`);
  return raw;
}
let env, raw;
beforeEach(() => {
  raw = makeRaw(true);
  env = { DB: wrapDb(raw), TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } };
});

/* 带 cookie 罐的调用：famsess 与 parentcred 各自保存 */
class Client {
  constructor(ip = '9.9.9.9') { this.jar = {}; this.ip = ip; }
  async call(path, { method, body } = {}) {
    const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': this.ip };
    const ck = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ');
    if (ck) headers.Cookie = ck;
    const m = method || (body !== undefined ? 'POST' : 'GET');
    const res = await M.default.fetch(new Request('https://test.local' + path, { method: m, headers, body: body !== undefined ? JSON.stringify(body) : undefined }), env);
    for (const sc of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
      const [kv, ...attrs] = sc.split(';'); const [k, v] = kv.split('=');
      if (!v || /Max-Age=0/i.test(attrs.join(';'))) delete this.jar[k]; else this.jar[k] = v;
    }
    const j = await res.json().catch(() => ({}));
    return { status: res.status, j };
  }
}
async function loginMiles() {
  const c = new Client();
  const again = await c.call('/api/auth/login', { body: { username: 'miles', pin: '135790' } });
  if (again.status === 200) return c; // 本用例里已改过 PIN
  const l = await c.call('/api/auth/login', { body: { username: 'miles', pin: '000000' } });
  assert.equal(l.status, 200, JSON.stringify(l.j));
  const ch = await c.call('/api/auth/change-password', { body: { oldPin: '000000', newPin: '135790' } });
  assert.equal(ch.status, 200, JSON.stringify(ch.j));
  return c;
}
async function milesParent() {
  const c = await loginMiles();
  const v = await c.call('/api/parent/verify-pin', { body: { pin: '0000' } });
  assert.equal(v.status, 200, JSON.stringify(v.j));
  assert.ok(c.jar.parentcred, '发了独立的 parentcred cookie');
  return c;
}
async function childClient(username) {
  const c = new Client();
  const l = await c.call('/api/auth/login', { body: { username, pin: '000000' } });
  assert.equal(l.status, 200);
  await c.call('/api/auth/change-password', { body: { oldPin: '000000', newPin: '654321' } });
  return c;
}
/* Miles 开通一个新家庭「测试家」，返回它的家长 client（已过二次 PIN 4321） */
async function makeFamily2(name = '测试家', username = 'TestJia') {
  const m = await milesParent();
  assert.equal((await m.call('/api/admin/enter', { body: { pin: '0000' } })).status, 200);
  const inv = await m.call('/api/admin/invites/create', { body: {} });
  assert.equal(inv.status, 200, JSON.stringify(inv.j));
  const p = new Client('8.8.8.8');
  const r = await p.call('/api/auth/register', { body: { code: inv.j.code, username, pin: '246810', displayName: '测试妈妈', avatarKey: 'pikachu', familyName: name, secondaryPin: '4321' } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.role, 'parent');
  assert.equal((await p.call('/api/parent/verify-pin', { body: { pin: '4321' } })).status, 200);
  return { m, p, familyId: r.j.familyId };
}
async function addChild(p, username, grade = '三年级') {
  const inv = await p.call('/api/parent/invites/create', { body: {} });
  assert.equal(inv.status, 200, JSON.stringify(inv.j));
  const c = new Client('7.7.7.7');
  const r = await c.call('/api/auth/register', { body: { code: inv.j.code, username, pin: '112233', displayName: '测试娃', avatarKey: 'eevee', grade } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  return { c, childId: r.j.childId, inviteCode: inv.j.code };
}


const GLOBALS = [
  ['careEnabled', 'care_enabled', true],
  ['oakAssess', 'oak_assess', true],
  ['englishMode', 'english_mode', true],
];
const settingVal = (key) => raw.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value ?? null;

describe('role_permissions 表', () => {
  test('种子恰好 4 行：sysadmin 三个键、parent 只有 family.manage、child 没有', () => {
    const rows = raw.prepare('SELECT role, permission FROM role_permissions ORDER BY role, permission').all().map((r) => `${r.role}:${r.permission}`);
    assert.deepEqual(rows, ['parent:family.manage', 'sysadmin:admin.access', 'sysadmin:family.manage', 'sysadmin:settings.global']);
  });
});

describe('权限矩阵（直接登录）', () => {
  test('sysadmin（miles，roles parent+sysadmin）能写三个全站字段，值真的变了', async () => {
    const m = await milesParent();
    for (const [field, key] of GLOBALS) {
      const r = await m.call('/api/parent/settings/update', { body: { [field]: true } });
      assert.equal(r.status, 200, `${field}: ${JSON.stringify(r.j)}`);
      assert.equal(r.j.ok, true);
      assert.equal(settingVal(key), '1', `${field} 应写入`);
    }
  });
  test('parent 会话带全站字段 → 403 NOT_ALLOWED，值不变，', async () => {
    const { p, familyId } = await makeFamily2();
    for (const [field, key] of GLOBALS) {
      const before = settingVal(key);
      const r = await p.call('/api/parent/settings/update', { body: { [field]: true } });
      assert.equal(r.status, 403, `${field}: ${JSON.stringify(r.j)}`);
      assert.equal(r.j.error, 'NOT_ALLOWED');
      assert.equal(r.j.message, '只有管理员能改全站设置');
      assert.equal(settingVal(key), before, `${field} 不应变化`);
    }
    assert.ok(familyId > 1);
  });
  test('parent 会话只写家庭字段 → 200 照常', async () => {
    const { p } = await makeFamily2();
    const kids = await p.call('/api/parent/family-children');
    const r = await p.call('/api/parent/settings/update', { body: { children: [] } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.ok(kids.status === 200);
  });
  test('旧版（无账号）家长会话带全站字段 → 403，值不变', async () => {
    const jar = {};
    const res = await M.default.fetch(new Request('https://test.local/api/parent/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: '0000' }) }), env);
    assert.equal(res.status, 200);
    const ck = res.headers.get('set-cookie').split(';')[0];
    for (const [field, key] of GLOBALS) {
      const before = settingVal(key);
      const r = await M.default.fetch(new Request('https://test.local/api/parent/settings/update', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: ck }, body: JSON.stringify({ [field]: true }) }), env);
      assert.equal(r.status, 403, field);
      assert.equal(settingVal(key), before);
    }
    void jar;
  });
  test('adminGuard：非 sysadmin 的 parent 进系统管理 → 403 NOT_SYSADMIN；sysadmin 可进', async () => {
    const { p } = await makeFamily2();
    const a = await p.call('/api/admin/enter', { body: { pin: '4321' } });
    assert.equal(a.status, 403);
    assert.equal(a.j.error, 'NOT_SYSADMIN');
    assert.equal((await p.call('/api/admin/overview')).status, 403);
    const m = await milesParent();
    assert.equal((await m.call('/api/admin/enter', { body: { pin: '0000' } })).status, 200);
  });
  test('/api/parent/settings 下发 permissions：sysadmin 三个、parent 只有 family.manage；isSysadmin 由 admin.access 推出', async () => {
    const { m, p } = await makeFamily2();
    const sm = await m.call('/api/parent/settings');
    assert.deepEqual(sm.j.permissions, ['admin.access', 'family.manage', 'settings.global']);
    assert.equal(sm.j.isSysadmin, true);
    const sp = await p.call('/api/parent/settings');
    assert.deepEqual(sp.j.permissions, ['family.manage']);
    assert.equal(sp.j.isSysadmin, false);
  });
});

describe('家长模式角色抬升（孩子会话 + 家长凭证）', () => {
  test('family 1：孩子会话用家庭 PIN 进家长模式 → 拿到唯一家长 miles 的角色，能写全站字段', async () => {
    const k = await childClient('dabao');
    assert.equal((await k.call('/api/parent/verify-pin', { body: { pin: '0000' } })).status, 200);
    const s = await k.call('/api/parent/settings');
    assert.equal(s.status, 200, JSON.stringify(s.j));
    assert.deepEqual(s.j.permissions, ['admin.access', 'family.manage', 'settings.global'], 'roles 抬升为 parent+sysadmin');
    assert.equal(s.j.isSysadmin, true);
    for (const [field, key] of GLOBALS) {
      const r = await k.call('/api/parent/settings/update', { body: { [field]: true } });
      assert.equal(r.status, 200, `${field}: ${JSON.stringify(r.j)}`);
      assert.equal(r.j.ok, true);
    }
    assert.equal(settingVal('english_mode'), '1');
  });
  test('family 2：孩子会话进家长模式 → 只有 parent，全站字段 403 且值不变', async () => {
    const { p } = await makeFamily2();
    const { c } = await addChild(p, 'TestKid');
    assert.equal((await c.call('/api/parent/verify-pin', { body: { pin: '4321' } })).status, 200);
    const s = await c.call('/api/parent/settings');
    assert.equal(s.status, 200, JSON.stringify(s.j));
    assert.deepEqual(s.j.permissions, ['family.manage']);
    assert.equal(s.j.isSysadmin, false);
    for (const [field, key] of GLOBALS) {
      const before = settingVal(key);
      const r = await c.call('/api/parent/settings/update', { body: { [field]: true } });
      assert.equal(r.status, 403, field);
      assert.equal(settingVal(key), before);
    }
    assert.equal((await c.call('/api/admin/enter', { body: { pin: '4321' } })).status, 403);
  });
  test('歧义失败即关闭：家里有两个家长账号 → 只给 parent，不给 sysadmin', async () => {
    raw.exec("INSERT INTO accounts(username, pw_hash, salt, role, roles, family_id, display_name, created_at) VALUES('Dad2', 'x', 'x', 'parent', 'parent', 1, 'Dad2', 1)");
    const k = await childClient('dabao');
    assert.equal((await k.call('/api/parent/verify-pin', { body: { pin: '0000' } })).status, 200);
    const s = await k.call('/api/parent/settings');
    assert.deepEqual(s.j.permissions, ['family.manage']);
    assert.equal((await k.call('/api/parent/settings/update', { body: { englishMode: true } })).status, 403);
  });
});
