/* 用户系统 v2 多家庭：迁移 0034 + 隔离 + 家长凭证 + 两级设置 + 开通邀请码 + 临时授权 + 系统管理
 * node --test tests/families.test.mjs（内存 SQLite，驱动 Worker 真实 fetch；不碰任何远端库） */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));
const PRE = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0033_accounts.sql', '0043_pet_instances_ability.sql'];
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
  if (withFamilies) { raw.exec(SQL('0034_families.sql')); raw.exec(SQL('0035_role_permissions.sql')); } // 0035：角色权限表（sysadmin/parent 能做什么）
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

describe('迁移 0034', () => {
  const snapCounts = (r) => ({
    accounts: r.prepare('SELECT COUNT(*) n FROM accounts').get().n,
    children: r.prepare('SELECT COUNT(*) n FROM children').get().n,
    checkins: r.prepare('SELECT COUNT(*) n FROM checkins').get().n,
    pets: r.prepare('SELECT COUNT(*) n FROM pet_instances').get().n,
  });
  test('应用后：前后数量一致；全部账号和孩子归 family #1；Miles = parent + sysadmin', () => {
    const r = makeRaw(false);
    r.exec("INSERT INTO checkins(child_id,date,subjects,submitted_at,submitted_epoch,status) VALUES(1,'2026-11-10','[]','08:00',1,'approved')");
    const before = snapCounts(r);
    assert.ok(before.accounts >= 3 && before.children >= 2);
    r.exec(SQL('0034_families.sql'));
    assert.deepEqual(snapCounts(r), before);
    assert.equal(r.prepare('SELECT COUNT(*) n FROM accounts WHERE family_id=1').get().n, before.accounts);
    assert.equal(r.prepare('SELECT COUNT(*) n FROM children WHERE family_id=1').get().n, before.children);
    assert.equal(r.prepare('SELECT COUNT(*) n FROM accounts WHERE family_id IS NULL').get().n, 0);
    assert.equal(r.prepare('SELECT COUNT(*) n FROM children WHERE family_id IS NULL').get().n, 0);
    const fam = r.prepare('SELECT * FROM families').all();
    assert.equal(fam.length, 1);
    assert.deepEqual([fam[0].id, fam[0].name, fam[0].status, fam[0].settings_json], [1, 'Miles 家', 'active', '{}']);
    const miles = r.prepare("SELECT roles FROM accounts WHERE username='miles'").get();
    assert.deepEqual(miles.roles.split(',').sort(), ['parent', 'sysadmin']);
    assert.equal(r.prepare("SELECT COUNT(*) n FROM accounts WHERE roles LIKE '%sysadmin%'").get().n, 1, '只有 Miles 是 sysadmin');
  });
  test('可重复执行：逐句再跑一遍（ADD COLUMN 的 duplicate column 除外），结果与第一遍逐行相同', () => {
    const r = makeRaw(true);
    const dump = () => JSON.stringify(['families', 'accounts', 'children', 'invite_codes', 'parent_creds', 'family_grants'].map((t) => r.prepare(`SELECT * FROM ${t} ORDER BY 1`).all()));
    const first = dump();
    const stmts = SQL('0034_families.sql').split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').split(';').map((x) => x.trim()).filter(Boolean);
    let dupCols = 0;
    for (const st of stmts) {
      try { r.exec(st); } catch (e) { assert.match(String(e.message), /duplicate column name/); dupCols++; }
    }
    assert.equal(dupCols, 5, '只有 5 句 ADD COLUMN 会报 duplicate column，其余全部幂等');
    assert.equal(dump(), first);
  });
  test('迁移后建第二个家庭互不串：新家庭 id=2，旧数据仍全在 family #1', () => {
    raw.prepare("INSERT INTO families(name, created_at) VALUES('测试家', 1)").run();
    assert.equal(raw.prepare("SELECT id FROM families WHERE name='测试家'").get().id, 2);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM children WHERE family_id=1').get().n, raw.prepare('SELECT COUNT(*) n FROM children').get().n);
  });
});

describe('开通邀请码 / 家庭邀请码 / 角色', () => {
  test('开通邀请码：只有 sysadmin 能生成；注册建出新家庭 + 家长账号；一次性；用户名大小写不分判重', async () => {
    const m = await milesParent();
    // 非 sysadmin（没进系统管理 PIN）不行
    assert.equal((await m.call('/api/admin/invites/create', { body: {} })).status, 403, '没再输 PIN 进系统管理');
    assert.equal((await m.call('/api/admin/enter', { body: { pin: '0000' } })).status, 200);
    const inv = await m.call('/api/admin/invites/create', { body: {} });
    assert.equal(inv.status, 200);
    const row = raw.prepare('SELECT * FROM invite_codes WHERE code=?').get(inv.j.code);
    assert.equal(row.kind, 'provision');
    assert.ok(Math.abs(row.expires_at - row.created_at - 7 * 86400) <= 1, '7 天有效');
    const p = new Client('5.5.5.5');
    const bad = await p.call('/api/auth/register', { body: { code: inv.j.code, username: 'abc', pin: '246810', displayName: 'x', avatarKey: 'pikachu', familyName: '', secondaryPin: '4321' } });
    assert.equal(bad.status, 400, '缺家庭名不行');
    const clash = await p.call('/api/auth/register', { body: { code: inv.j.code, username: 'MILES', pin: '246810', displayName: 'x', avatarKey: 'pikachu', familyName: '测试家', secondaryPin: '4321' } });
    assert.equal(clash.status, 409, '与 miles 大小写不同也算重名');
    const ok = await p.call('/api/auth/register', { body: { code: inv.j.code, username: 'TestJia', pin: '246810', displayName: '测试妈妈', avatarKey: 'pikachu', familyName: '测试家', secondaryPin: '4321' } });
    assert.equal(ok.status, 200, JSON.stringify(ok.j));
    const fam = raw.prepare("SELECT * FROM families WHERE name='测试家'").get();
    assert.ok(fam && fam.id === ok.j.familyId && fam.id !== 1 && fam.status === 'active');
    const acct = raw.prepare("SELECT * FROM accounts WHERE username='TestJia'").get();
    assert.deepEqual([acct.role, acct.family_id, acct.child_id], ['parent', fam.id, null]);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM children WHERE family_id=?').get(fam.id).n, 0);
    const again = await new Client('4.4.4.4').call('/api/auth/register', { body: { code: inv.j.code, username: 'Other', pin: '246810', displayName: 'x', avatarKey: 'pikachu', familyName: '另一家', secondaryPin: '4321' } });
    assert.equal(again.status, 400, '用过的码作废');
    // 登录大小写不分
    const lo = await new Client().call('/api/auth/login', { body: { username: 'testjia', pin: '246810' } });
    assert.equal(lo.status, 200);
  });
  test('开通码过期 → 拒；家庭邀请码把孩子加进发码的家庭，不进别家', async () => {
    const m = await milesParent();
    await m.call('/api/admin/enter', { body: { pin: '0000' } });
    const inv = await m.call('/api/admin/invites/create', { body: {} });
    raw.prepare('UPDATE invite_codes SET expires_at=1 WHERE code=?').run(inv.j.code);
    const r = await new Client().call('/api/auth/register', { body: { code: inv.j.code, username: 'Late', pin: '246810', displayName: 'x', avatarKey: 'pikachu', familyName: '迟到家', secondaryPin: '4321' } });
    assert.equal(r.status, 400);
    const { p, familyId } = await makeFamily2();
    const kid = await addChild(p, 'ZhiZhi');
    assert.equal(raw.prepare('SELECT family_id FROM children WHERE id=?').get(kid.childId).family_id, familyId);
    assert.equal(raw.prepare("SELECT family_id FROM accounts WHERE username='ZhiZhi'").get().family_id, familyId);
  });
  test('/api/me 带 roles：Miles = parent + sysadmin；孩子 = child；多角色检查不破坏单角色', async () => {
    const m = await milesParent();
    const me = await m.call('/api/me');
    assert.deepEqual([...me.j.roles].sort(), ['parent', 'sysadmin']);
    assert.equal(me.j.isSysadmin, true);
    assert.equal(me.j.familyId, 1);
    const k = await childClient('dabao');
    const km = await k.call('/api/me');
    assert.deepEqual(km.j.roles, ['child']);
    assert.equal(km.j.isSysadmin, false);
  });
});

describe('家长凭证', () => {
  test('孩子会话没进家长模式就调家长接口 → 403；验 PIN 后可用；退出后 → 401 PARENT_EXPIRED 并回到同一孩子', async () => {
    const k = await childClient('dabao');
    assert.equal((await k.call('/api/parent/pending')).status, 403);
    assert.equal((await k.call('/api/parent/family-children')).status, 403);
    assert.equal((await k.call('/api/parent/settings')).status, 403);
    assert.equal((await k.call('/api/admin/overview')).status, 403);
    const v = await k.call('/api/parent/verify-pin', { body: { pin: '0000' } });
    assert.equal(v.status, 200);
    assert.equal(v.j.homeChildId, 1, '从大宝进来，退出回大宝');
    assert.ok(k.jar.famsess && k.jar.parentcred, '凭证与 famsess 是两个 cookie');
    assert.equal((await k.call('/api/parent/pending')).status, 200);
    const fc = await k.call('/api/parent/family-children');
    assert.equal(fc.j.children.length, 2);
    assert.equal(fc.j.children.find((c) => c.id === 1).name, raw.prepare('SELECT name FROM children WHERE id=1').get().name);
    const savedCred = k.jar.parentcred;
    const ex = await k.call('/api/parent/exit', { body: {} });
    assert.equal(ex.j.homeChildId, 1);
    k.jar.parentcred = savedCred; // 旧凭证已被服务端删除
    const after = await k.call('/api/parent/pending');
    assert.equal(after.status, 401);
    assert.equal(after.j.error, 'PARENT_EXPIRED');
    delete k.jar.parentcred;
    assert.equal((await k.call('/api/overview')).status, 200, '退出家长区后孩子会话原样可用，不用重登');
  });
  test('15 分钟无操作 → 401；14 分钟内有操作则续期', async () => {
    const k = await childClient('dabao');
    await k.call('/api/parent/verify-pin', { body: { pin: '0000' } });
    raw.prepare('UPDATE parent_creds SET last_active=last_active-840').run(); // 14 分钟前
    assert.equal((await k.call('/api/parent/pending')).status, 200);
    raw.prepare('UPDATE parent_creds SET last_active=last_active-901').run(); // 再过 15 分钟
    const r = await k.call('/api/parent/pending');
    assert.equal(r.status, 401);
    assert.equal(r.j.error, 'PARENT_EXPIRED');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM parent_creds').get().n, 0, '过期凭证已清掉');
  });
  test('别人的凭证 cookie 套到自己的会话上无效', async () => {
    const a = await childClient('dabao');
    await a.call('/api/parent/verify-pin', { body: { pin: '0000' } });
    const b = await childClient('xiaobao');
    b.jar.parentcred = a.jar.parentcred;
    const r = await b.call('/api/parent/pending');
    assert.equal(r.status, 401);
  });
});

describe('跨家庭隔离', () => {
  test('家长区孩子列表 / 待审 / 统计 / 历史 / 审核：别家孩子或打卡一律 404，自己家正常', async () => {
    const { p, familyId } = await makeFamily2();
    const kid = await addChild(p, 'ZhiZhi');
    raw.prepare("INSERT INTO checkins(child_id,date,subjects,submitted_at,submitted_epoch,status) VALUES(1,'2026-11-10','[\"数学\"]','08:00',1,'pending')").run();
    const miles1 = raw.prepare('SELECT id FROM checkins WHERE child_id=1').get().id;
    const fc = await p.call('/api/parent/family-children');
    assert.deepEqual(fc.j.children.map((c) => c.id), [kid.childId], '只看得到本家孩子');
    assert.equal((await p.call('/api/parent/pending')).j.reviews.length, 0, '看不到 Miles 家的待审');
    for (const path of ['pending', 'stats', 'history']) {
      assert.equal((await p.call(`/api/parent/${path}?childId=1`)).status, 404, path + ' 跨家庭 404');
    }
    assert.equal((await p.call('/api/parent/review', { body: { checkinId: miles1, decision: 'approve' } })).status, 404);
    assert.equal(raw.prepare('SELECT status FROM checkins WHERE id=?').get(miles1).status, 'pending', '没被批');
    assert.equal((await p.call(`/api/parent/stats?childId=${kid.childId}`)).status, 200);
    // 反过来 Miles 看不到测试家的孩子
    const m = await milesParent();
    assert.equal((await m.call(`/api/parent/stats?childId=${kid.childId}`)).status, 404);
    assert.ok(!(await m.call('/api/parent/family-children')).j.children.some((c) => c.id === kid.childId));
    assert.equal(familyId, 2);
  });
  test('孩子会话 / 家长模式带别家 childId 访问普通接口 → 404（不是 403）；同家别的孩子仍 403', async () => {
    const { p } = await makeFamily2();
    const kid = await addChild(p, 'ZhiZhi');
    assert.equal((await kid.c.call('/api/child?id=1')).status, 404);
    assert.equal((await kid.c.call('/api/quiz/today?child_id=1')).status, 404);
    assert.equal((await kid.c.call('/api/pokedex', { body: { childId: 1 } })).status, 404);
    assert.equal((await p.call('/api/child?id=1')).status, 404, '测试家家长（家长模式）也看不到 Miles 家孩子');
    assert.equal((await p.call(`/api/child?id=${kid.childId}`)).status, 200);
    const d = await childClient('dabao');
    assert.equal((await d.call('/api/child?id=2')).status, 403, '同一家的另一个孩子 → 403');
  });
  test('兄弟对战只列同一家：测试家孩子的对手名单里没有 Miles 家孩子，反之亦然', async () => {
    const { p } = await makeFamily2();
    const kid = await addChild(p, 'ZhiZhi');
    const mem = await kid.c.call('/api/family/members');
    assert.deepEqual(mem.j.members.map((x) => x.childId), [kid.childId]);
    const d = await childClient('dabao');
    const mem1 = await d.call('/api/family/members');
    assert.ok(!mem1.j.members.some((x) => x.childId === kid.childId));
    const pv = await d.call('/api/battle/pvp/create', { body: { childId: 1, opponentId: kid.childId } });
    assert.ok([403, 404].includes(pv.status), '不能邀请别家孩子，实际 ' + pv.status);
  });
  test('用户管理：别家的账号 / 孩子重置 PIN、改名、改进度 → 404；账号列表只含本家', async () => {
    const { p } = await makeFamily2();
    const kid = await addChild(p, 'ZhiZhi');
    const acctOf = raw.prepare("SELECT id FROM accounts WHERE username='dabao'").get().id;
    assert.equal((await p.call('/api/parent/accounts/reset-pin', { body: { accountId: acctOf } })).status, 404);
    const list = await p.call('/api/parent/accounts');
    assert.ok(list.j.accounts.every((a) => !['dabao', 'xiaobao', 'miles'].includes(a.username)));
    const upd = await p.call('/api/parent/settings/update', { body: { children: [{ id: 1, name: '被改', grade: '一年级' }] } });
    assert.equal(upd.status, 404);
    assert.notEqual(raw.prepare('SELECT name FROM children WHERE id=1').get().name, '被改');
    const upd2 = await p.call('/api/parent/settings/update', { body: { mathProgress: [{ id: 1, chapter: '' }] } });
    assert.equal(upd2.status, 404);
    const own = await p.call('/api/parent/settings/update', { body: { children: [{ id: kid.childId, name: '新名', grade: '二年级' }] } });
    assert.equal(own.status, 200, JSON.stringify(own.j));
    const st = await p.call('/api/parent/settings');
    assert.deepEqual(st.j.settings.children.map((c) => c.id), [kid.childId]);
  });
  test('家庭被 sysadmin 停用：该家已登录的会话立即失效', async () => {
    const { m, p, familyId } = await makeFamily2();
    assert.equal((await p.call('/api/me')).status, 200);
    await m.call('/api/admin/enter', { body: { pin: '0000' } });
    const r = await m.call('/api/admin/family/status', { body: { familyId, status: 'disabled' } });
    assert.equal(r.status, 200);
    assert.equal((await p.call('/api/me')).status, 401);
    await m.call('/api/admin/family/status', { body: { familyId, status: 'active' } });
    assert.equal((await p.call('/api/me')).status, 200);
  });
});

describe('两级设置', () => {
  test('生效值 = 本家覆盖，否则全站默认；改本家不影响别家；sysadmin 改默认影响没覆盖的家庭', async () => {
    const { m, p } = await makeFamily2();
    let s1 = (await m.call('/api/parent/settings')).j;
    let s2 = (await p.call('/api/parent/settings')).j;
    assert.equal(s1.settings.quizXp, 10); assert.equal(s2.settings.quizXp, 10);
    assert.equal(s1.familyOverrides.quizXp, false);
    // 家庭 #1 覆盖
    const up = await m.call('/api/parent/settings/update', { body: { quizXp: 25, cutoffTime: '20:00' } });
    assert.equal(up.status, 200, JSON.stringify(up.j));
    assert.equal(JSON.parse(raw.prepare('SELECT settings_json FROM families WHERE id=1').get().settings_json).quiz_xp, '25');
    assert.notEqual((raw.prepare("SELECT value FROM settings WHERE key='quiz_xp'").get() || {}).value, '25', '没动全站默认');
    s1 = (await m.call('/api/parent/settings')).j; s2 = (await p.call('/api/parent/settings')).j;
    assert.equal(s1.settings.quizXp, 25); assert.equal(s1.settings.cutoffTime, '20:00'); assert.equal(s1.familyOverrides.quizXp, true);
    assert.equal(s1.siteDefaults.quizXp, 10);
    assert.equal(s2.settings.quizXp, 10); assert.equal(s2.settings.cutoffTime, '21:30'); assert.equal(s2.familyOverrides.quizXp, false);
    // sysadmin 改全站默认
    await m.call('/api/admin/enter', { body: { pin: '0000' } });
    const d = await m.call('/api/admin/defaults', { body: { quizXp: 12, subjectXp: 20 } });
    assert.equal(d.status, 200, JSON.stringify(d.j));
    s1 = (await m.call('/api/parent/settings')).j; s2 = (await p.call('/api/parent/settings')).j;
    assert.equal(s1.settings.quizXp, 25, '本家覆盖优先');
    assert.equal(s1.settings.subjectXp, 20, '没覆盖的项跟默认');
    assert.equal(s2.settings.quizXp, 12); assert.equal(s2.settings.subjectXp, 20);
    // 清除覆盖（null）→ 回到默认
    await m.call('/api/parent/settings/update', { body: { quizXp: null } });
    assert.equal((await m.call('/api/parent/settings')).j.settings.quizXp, 12);
  });
  test('范围校验保留：越界 400，且一项都不写；非 sysadmin 不能改全站默认也不能改全站开关', async () => {
    const { m, p } = await makeFamily2();
    for (const body of [{ baseXp: 5 }, { baseXp: 201 }, { subjectXp: 0 }, { quizXp: 101 }, { quizRepeatDays: 6 }, { cutoffTime: '25:00' }]) {
      assert.equal((await m.call('/api/parent/settings/update', { body })).status, 400, JSON.stringify(body));
    }
    assert.equal(raw.prepare('SELECT settings_json FROM families WHERE id=1').get().settings_json, '{}');
    assert.equal((await p.call('/api/admin/defaults', { body: { quizXp: 50 } })).status, 403);
    const before = raw.prepare("SELECT value FROM settings WHERE key='english_mode'").get();
    await p.call('/api/parent/settings/update', { body: { englishMode: true, careEnabled: true } });
    assert.deepEqual(raw.prepare("SELECT value FROM settings WHERE key='english_mode'").get(), before, '别家家长改不了全站英文模式');
  });
  test('覆盖值真被业务读到：getEffSetting 优先本家（问答奖励 quiz_xp 经 /api/quiz/today 可见）', async () => {
    const { m } = await makeFamily2();
    await m.call('/api/parent/settings/update', { body: { quizXp: 33 } });
    const d = await childClient('dabao');
    const q = await d.call('/api/quiz/today?child_id=1');
    assert.equal(q.status, 200);
    assert.equal(q.j.quizXp, 33);
    const other = await makeFamilyKid();
    assert.equal((await other.call('/api/quiz/today')).j.quizXp, 10, '别家孩子仍按全站默认');
  });
});

async function makeFamilyKid() {
  const { p } = await makeFamily2('另一家', 'OtherJia');
  return (await addChild(p, 'OtherKid')).c;
}

describe('系统管理 + 临时授权', () => {
  test('非 sysadmin 进不去；sysadmin 没再输 PIN 也进不去；总览只有家庭名/账号数/状态/最近活跃', async () => {
    const { m, p } = await makeFamily2();
    assert.equal((await p.call('/api/admin/enter', { body: { pin: '4321' } })).status, 403, '家长不是 sysadmin');
    assert.equal((await p.call('/api/admin/overview')).status, 403);
    const m2 = await milesParent();
    assert.equal((await m2.call('/api/admin/overview')).status, 403, '没再输 PIN');
    assert.equal((await m2.call('/api/admin/enter', { body: { pin: '9999' } })).status, 401);
    assert.equal((await m2.call('/api/admin/enter', { body: { pin: '0000' } })).status, 200);
    const o = await m2.call('/api/admin/overview');
    assert.equal(o.status, 200);
    const t = o.j.families.find((f) => f.name === '测试家');
    assert.deepEqual(Object.keys(t).sort(), ['accountCount', 'id', 'lastActive', 'name', 'status']);
    assert.equal(t.accountCount, 1);
    assert.ok(!JSON.stringify(o.j).match(/photo|answer|pet|stats|child/i), '总览不含任何孩子数据字段');
    assert.equal(m, m); // 保持 m 被使用
  });
  test('无临时授权看别家 → 403 NO_GRANT；开 24 小时后可看且每次记日志；到期自动失效', async () => {
    const { m, p, familyId } = await makeFamily2();
    const kid = await addChild(p, 'ZhiZhi');
    await m.call('/api/admin/enter', { body: { pin: '0000' } });
    const no = await m.call(`/api/admin/family/view?familyId=${familyId}`);
    assert.equal(no.status, 403); assert.equal(no.j.error, 'NO_GRANT');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM admin_access_log').get().n, 0, '被拒的不记查看');
    const on = await p.call('/api/parent/family/temp-auth', { body: { enable: true } });
    assert.equal(on.status, 200); assert.equal(on.j.active, true);
    assert.ok(Math.abs(on.j.expiresAt - (Math.floor(Date.now() / 1000) + 86400)) < 5, '24 小时');
    assert.equal((await p.call('/api/parent/settings')).j.tempAuth.active, true);
    const v1 = await m.call(`/api/admin/family/view?familyId=${familyId}`);
    assert.equal(v1.status, 200);
    assert.deepEqual(v1.j.children.map((c) => c.id), [kid.childId]);
    await m.call(`/api/admin/family/view?familyId=${familyId}`);
    const log = await m.call(`/api/admin/log?familyId=${familyId}`);
    assert.equal(log.j.log.length, 2, '每次查看一条日志');
    assert.ok(log.j.log[0].adminName);
    // 到期
    raw.prepare('UPDATE family_grants SET expires_at=? WHERE family_id=?').run(Math.floor(Date.now() / 1000) - 1, familyId);
    assert.equal((await m.call(`/api/admin/family/view?familyId=${familyId}`)).status, 403);
    assert.equal((await p.call('/api/parent/settings')).j.tempAuth.active, false);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM admin_access_log').get().n, 2);
    // 家长主动关
    await p.call('/api/parent/family/temp-auth', { body: { enable: true } });
    await p.call('/api/parent/family/temp-auth', { body: { enable: false } });
    assert.equal((await m.call(`/api/admin/family/view?familyId=${familyId}`)).status, 403);
  });
  test('sysadmin 的家庭列表可停用/恢复；不能停用自己所在的家庭', async () => {
    const { m, familyId } = await makeFamily2();
    await m.call('/api/admin/enter', { body: { pin: '0000' } });
    assert.equal((await m.call('/api/admin/family/status', { body: { familyId: 1, status: 'disabled' } })).status, 400);
    assert.equal((await m.call('/api/admin/family/status', { body: { familyId: 999, status: 'disabled' } })).status, 404);
    assert.equal((await m.call('/api/admin/family/status', { body: { familyId, status: 'disabled' } })).status, 200);
    const o = await m.call('/api/admin/overview');
    assert.equal(o.j.families.find((f) => f.id === familyId).status, 'disabled');
    assert.ok(o.j.invites.every((i) => ['active', 'used', 'expired'].includes(i.status)));
  });
});

describe('用户名大小写规则保留（多家庭下全局唯一）', () => {
  test('DaBao 原样显示；dabao/DABAO 都能登录；跨家庭也不能重名', async () => {
    const { p } = await makeFamily2();
    const k = await addChild(p, 'DaBao2');
    assert.equal(raw.prepare("SELECT username FROM accounts WHERE lower(username)='dabao2'").get().username, 'DaBao2');
    for (const u of ['dabao2', 'DABAO2', 'DaBao2']) assert.equal((await new Client().call('/api/auth/login', { body: { username: u, pin: '112233' } })).status, 200, u);
    const inv = await p.call('/api/parent/invites/create', { body: {} });
    const dup = await new Client().call('/api/auth/register', { body: { code: inv.j.code, username: 'DABAO', pin: '112233', displayName: 'x', avatarKey: 'pikachu', grade: '一年级' } });
    assert.equal(dup.status, 409, '与 Miles 家的 dabao 重名');
    assert.ok(k.childId);
  });
  test('没有全站按用户名的 20 次/天锁定：同一用户名换 IP 各错 6 次都只被各自的 IP 锁，换新 IP 仍可登录', async () => {
    for (let i = 0; i < 6; i++) {
      for (let n = 0; n < 5; n++) await new Client('10.0.0.' + i).call('/api/auth/login', { body: { username: 'dabao', pin: '000000' } });
    }
    const ok = await new Client('10.9.9.9').call('/api/auth/login', { body: { username: 'dabao', pin: '000000' } });
    assert.equal(ok.status, 200, '30 次错误后，新 IP 的正确 PIN 仍能登录（已否决全局锁定）');
  });
});

describe('v2 三个限制修复', () => {
  test('合作假期事件只在同一家庭内配对：两家各有 ≥2 个孩子时不会跨家配对', async () => {
    const { p } = await makeFamily2();
    const k1 = await addChild(p, 'ZhiZhi');
    const k2 = await addChild(p, 'ZhiZhi2');
    for (const f of ['0007_coop_tables.sql', '0008_battles_coop_cols.sql']) raw.exec(SQL(f));
    const hol = { holiday_id: 'h1', map_version: 'coop-m1.v1' };
    const e1 = await M.ensureCoopEvent(env.DB, hol, 1);
    const e2 = await M.ensureCoopEvent(env.DB, hol, 2);
    assert.deepEqual([e1.participant_a, e1.participant_b], [1, 2], '家庭 1：大宝 + 小宝');
    assert.deepEqual([e2.participant_a, e2.participant_b], [k1.childId, k2.childId], '家庭 2：自家两个孩子');
    const fam = (id) => raw.prepare('SELECT family_id f FROM children WHERE id=?').get(id).f;
    for (const [e, f] of [[e1, 1], [e2, 2]]) assert.equal(fam(e.participant_a), f), assert.equal(fam(e.participant_b), f);
    assert.notEqual(e1.event_id, e2.event_id);
    // 只有一个孩子的家庭：不配对（即使全站还有别家的孩子）
    const { p: p3 } = await makeFamily2('第三家', 'ThirdJia').catch(() => ({ p: null }));
    if (p3) {
      await addChild(p3, 'Solo');
      const fid = raw.prepare('SELECT MAX(id) m FROM families').get().m;
      assert.equal(await M.ensureCoopEvent(env.DB, hol, fid), null);
    }
  });
  test('对战 opponentId：别家孩子 → 404；同家别的孩子在孩子会话下仍 403', async () => {
    const { p } = await makeFamily2();
    const kid = await addChild(p, 'ZhiZhi');
    const d = await childClient('dabao');
    for (const path of ['/api/battle/pvp/create', '/api/battle/pvp/status', '/api/battle/pvp/rematch-request']) {
      const r = await d.call(path, { body: { childId: 1, opponentId: kid.childId } });
      assert.equal(r.status, 404, path + ' 跨家庭应 404，实际 ' + r.status);
    }
    assert.equal((await d.call('/api/battle/pvp/create', { body: { childId: 1, opponentId: 999 } })).status, 404, '不存在的孩子与别家孩子同样 404');
    // 反方向：测试家孩子邀请 Miles 家孩子
    const r2 = await kid.c.call('/api/battle/pvp/create', { body: { childId: kid.childId, opponentId: 1 } });
    assert.equal(r2.status, 404);
    // 同家：孩子会话带 childId=自己 + opponentId=同家兄弟 → 允许（200）
    const ok = await d.call('/api/battle/pvp/create', { body: { childId: 1, opponentId: 2 } });
    assert.notEqual(ok.status, 404, '同家对手不是 404');
    assert.notEqual(ok.status, 403, '同家合法邀请不是 403');
    // 同家别的孩子当作 childId 访问 → 孩子会话 403
    assert.equal((await d.call('/api/battle/pvp/create', { body: { childId: 2, opponentId: 1 } })).status, 403);
  });
  test('保存本家设置只推本家的缓存版本，别家不动；全站开关才推全部', async () => {
    const { m, p } = await makeFamily2();
    const kid = await addChild(p, 'ZhiZhi');
    for (const c of raw.prepare('SELECT id FROM children').all()) raw.prepare('INSERT OR REPLACE INTO sync_versions(child_id, version) VALUES(?, 5)').run(c.id);
    const ver = (id) => raw.prepare('SELECT version v FROM sync_versions WHERE child_id=?').get(id).v;
    // 测试家保存设置（家长页：改自家孩子名字，属于可见变化）→ 只推测试家
    const up = await p.call('/api/parent/settings/update', { body: { children: [{ id: kid.childId, name: '新名', grade: '二年级' }] } });
    assert.equal(up.status, 200, JSON.stringify(up.j));
    assert.equal(ver(kid.childId), 6, '本家孩子版本 +1');
    assert.equal(ver(1), 5, '别家（Miles 家）不变'); assert.equal(ver(2), 5);
    // Miles 家保存 → 测试家不变
    const up2 = await m.call('/api/parent/settings/update', { body: { children: [{ id: 1, name: '大宝2', grade: '三年级' }] } });
    assert.equal(up2.status, 200, JSON.stringify(up2.j));
    assert.equal(ver(1), 6); assert.equal(ver(2), 6);
    assert.equal(ver(kid.childId), 6, '测试家不变');
  });
});

describe('2026-11-17 测试站实测修复', () => {
  test('/parent 深链（带 ?child=&tab=）已登录直接给应用页，不 302 回 /；未登录给登录入口页', async () => {
    const m = await milesParent();
    const raw1 = await M.default.fetch(new Request('https://test.local/parent?child=2&tab=stats', { headers: { Cookie: Object.entries(m.jar).map(([k, v]) => `${k}=${v}`).join('; ') }, redirect: 'manual' }), env);
    assert.equal(raw1.status, 200);
    assert.match(await raw1.text(), /app/);
    const raw2 = await M.default.fetch(new Request('https://test.local/parent?child=2&tab=stats', { redirect: 'manual' }), env);
    assert.notEqual(raw2.status, 302);
    assert.ok(!(await raw2.text()).includes('<html>app</html>'), '未登录不给应用页');
  });
  test('系统管理总览 lastActive 是秒级时间戳（前端按 t*1000 格式化），无打卡的家庭为 null', async () => {
    await makeFamily2();
    const m2 = await milesParent();
    await m2.call('/api/admin/enter', { body: { pin: '0000' } });
    const o = await m2.call('/api/admin/overview');
    for (const f of o.j.families) assert.ok(f.lastActive === null || Number.isInteger(f.lastActive), JSON.stringify(f));
    assert.equal(o.j.families.find((f) => f.name === '测试家').lastActive, null);
  });
});
