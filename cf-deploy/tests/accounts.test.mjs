/* 用户系统 v2（账号：用户名＋6 位 PIN）集成测试：node --test tests/accounts.test.mjs
 * 内存 SQLite 依次应用迁移（含 0033），驱动 Worker 的真实 fetch：
 * 迁移幂等与数字不变、登录统一提示、PBKDF2、按「用户名＋IP」锁定、大小写规则、强制改密、改密使其他会话失效、
 * 邀请码三态（有效/过期/已用）、孩子互相 403、同一家列表与对战邀请、旧 PIN 开关。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));
const MIGS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0033_accounts.sql', '0041_gym_fail_streaks.sql', '0043_pet_instances_ability.sql'];
const SQL = (f) => readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8');

function makeEnv(extra = {}) {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGS) raw.exec(SQL(f));
  // 迁移种的账号 salt='' + 旧 PIN 的 SHA-256；测试里统一换成临时默认 PIN 123456 的 SHA-256（保留「首次登录升级成 PBKDF2」这条路径）
  raw.exec("UPDATE accounts SET pw_hash='91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203'");
  const wrap = (sql) => ({
    _args: [],
    bind(...args) { this._args = args; return this; },
    async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
    async all() { return { results: raw.prepare(sql).all(...this._args) }; },
    async run() { const r = raw.prepare(sql).run(...this._args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
  });
  const db = { prepare: (sql) => wrap(sql), async batch(stmts) { for (const s of stmts) await s.run(); return []; } };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) }, ...extra },
    raw,
  };
}

let env, raw;
beforeEach(() => { ({ env, raw } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie, ip = '1.1.1.1' } = {}) {
  const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie, setCookie: sc, res };
}
const login = (username, pin, ip) => call('/api/auth/login', { method: 'POST', body: { username, pin }, ip });

/* 迁移种的账号初始 PIN＝123456，首次登录强制改；这里一步到位登录并改成新 PIN，返回正式会话 cookie */
async function activate(username, newPw = '654321') {
  const l = await login(username, '000000');
  assert.equal(l.status, 200, JSON.stringify(l.j));
  assert.equal(l.j.mustChangePw, true);
  const c = await call('/api/auth/change-password', { method: 'POST', cookie: l.cookie, body: { oldPin: '000000', newPin: newPw } });
  assert.equal(c.status, 200, JSON.stringify(c.j));
  return l.cookie;
}
async function parentPinCookie() {
  const c = await activate('miles', '135790');
  const v = await call('/api/parent/verify-pin', { method: 'POST', cookie: c, body: { pin: '0000' } });
  assert.equal(v.status, 200);
  return c;
}

describe('迁移 0033', () => {
  test('幂等：再执行一遍，账号行数与内容不变；不改 children 表', () => {
    const before = raw.prepare('SELECT * FROM accounts ORDER BY id').all();
    const kidsBefore = raw.prepare('SELECT * FROM children ORDER BY id').all();
    raw.exec(SQL('0033_accounts.sql'));
    raw.exec(SQL('0033_accounts.sql'));
    assert.deepEqual(raw.prepare('SELECT * FROM accounts ORDER BY id').all(), before);
    assert.deepEqual(raw.prepare('SELECT * FROM children ORDER BY id').all(), kidsBefore);
    assert.deepEqual(before.map((a) => [a.username, a.role, a.child_id]), [['dabao', 'child', 1], ['xiaobao', 'child', 2], ['miles', 'parent', null]]);
    assert.ok(before.every((a) => a.pw_changed_at === null && a.salt === ''), '初始密码账号：未改过密码，旧 PIN 哈希暂存');
  });
  test('迁移前后每个孩子的宠物/球/打卡天数/背包一致（账号层不动业务表）', () => {
    const snap = () => raw.prepare(`SELECT c.id, c.balls, c.balls_super, c.balls_hyper, c.balls_master,
      (SELECT COUNT(*) FROM pet_instances p WHERE p.child_id=c.id) pets, (SELECT COUNT(DISTINCT date) FROM checkins k WHERE k.child_id=c.id) days FROM children c ORDER BY c.id`).all();
    raw.exec('DROP TABLE accounts; DROP TABLE login_attempts; DROP TABLE invite_codes; DROP TABLE account_sessions');
    raw.exec("INSERT INTO checkins(child_id,date,subjects,submitted_at,submitted_epoch,status) VALUES(1,'2026-11-10','[]','08:00',1,'approved'),(1,'2026-11-11','[]','08:00',2,'approved')");
    const a = snap();
    raw.exec(SQL('0033_accounts.sql'));
    assert.deepEqual(snap(), a);
    assert.equal(a[0].days, 2);
  });
});

describe('登录', () => {
  test('初始 PIN＝123456；首次登录强制改 PIN：setpw 会话不能访问业务接口，改完才放行；PIN 存为 PBKDF2 不是明文', async () => {
    const l = await login('dabao', '000000');
    assert.equal(l.status, 200);
    assert.equal(l.j.mustChangePw, true);
    assert.match(l.setCookie, /famsess=[0-9a-f]+/);
    assert.match(l.setCookie, /HttpOnly/);
    assert.match(l.setCookie, /Secure/);
    assert.match(l.setCookie, /Max-Age=2592000/);
    const early = await call('/api/overview', { cookie: l.cookie });
    assert.equal(early.status, 401, '未改初始 PIN 前，会话不能访问业务接口');
    const row1 = raw.prepare("SELECT * FROM accounts WHERE username='dabao'").get();
    assert.notEqual(row1.salt, '', '首次登录成功即把旧 PIN 哈希升级成 PBKDF2');
    assert.ok(!row1.pw_hash.includes('000000'));
    const ch = await call('/api/auth/change-password', { method: 'POST', cookie: l.cookie, body: { oldPin: '000000', newPin: '246802' } });
    assert.equal(ch.status, 200);
    const ok = await call('/api/overview', { cookie: l.cookie });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.j.children.map((c) => c.id), [1], '孩子账号只看到自己');
    const row2 = raw.prepare("SELECT * FROM accounts WHERE username='dabao'").get();
    assert.notEqual(row2.pw_hash, row1.pw_hash);
    assert.ok(row2.pw_changed_at > 0);
    assert.ok(row2.salt.length >= 20 && row2.pw_hash.length >= 40);
    assert.equal((await login('dabao', '246802')).status, 200);
    assert.equal((await login('dabao', '000000')).status, 401, '旧 PIN 作废');
  });

  test('失败一律同一句「用户名或 PIN 不对」：用户名不存在、PIN 错、用户名格式不合法，字节一致；PIN 不是 6 位数字 → 400', async () => {
    const msgs = [];
    for (const [u, p] of [['nobody', '135791'], ['dabao', '000000'], ['a', '000000'], ['', '000000']]) {
      const r = await login(u, p);
      assert.equal(r.status, 401);
      msgs.push(JSON.stringify(r.j));
    }
    assert.equal(new Set(msgs).size, 1);
    assert.equal(JSON.parse(msgs[0]).message, '用户名或 PIN 不对');
    for (const bad of ['', 'abcdef', '00000', '1234567', '12 456', 'Miles-test1', '１２３４５６']) {
      const r = await login('dabao', bad);
      assert.equal(r.status, 400, JSON.stringify(bad));
      assert.equal(r.j.error, 'BAD_PIN');
    }
    const oldStyle = await call('/api/auth/login', { method: 'POST', body: { username: 'dabao', password: '000000' } });
    assert.equal(oldStyle.status, 400, '旧的 password 字段不再被识别');
    assert.equal(raw.prepare('SELECT COALESCE(SUM(fails),0) n FROM login_attempts').get().n, 4, '只有上面 4 次 401 计了失败；格式不合法的 400 不计');
  });

  test('按「用户名＋IP」连错 5 次锁 10 分钟：同名换 IP 不受影响；家长账号同规则；锁中正确 PIN 也进不去；过期后恢复', async () => {
    await activate('xiaobao', '112233');
    for (let i = 0; i < 5; i++) assert.equal((await login('xiaobao', '000000', '9.9.9.9')).status, 401);
    const locked = await login('xiaobao', '112233', '9.9.9.9');
    assert.equal(locked.status, 429);
    assert.equal(locked.j.error, 'LOCKED');
    assert.ok(locked.j.retryAfter > 590 && locked.j.retryAfter <= 600);
    assert.equal((await login('XiaoBao', '112233', '9.9.9.9')).status, 429, '大小写不同也是同一把锁');
    assert.equal((await login('xiaobao', '112233', '2.2.2.2')).status, 200, '别的 IP 不受影响（别人锁不住孩子在家里设备上的登录）');
    raw.exec('UPDATE login_attempts SET locked_until=locked_until-601');
    assert.equal((await login('xiaobao', '112233', '9.9.9.9')).status, 200, '10 分钟后恢复');
    for (let i = 0; i < 5; i++) await login('miles', '000000', '8.8.8.8');
    assert.equal((await login('miles', '000000', '8.8.8.8')).status, 429, '家长账号同样锁');
    assert.equal((await login('miles', '000000', '7.7.7.7')).status, 200);
  });

  test('用户名大小写：起名 DaBao 原样显示；全小写/大写都能登录；不区分大小写判重', async () => {
    const pc = await parentPinCookie();
    const mk = await call('/api/parent/accounts/create', { method: 'POST', cookie: pc, body: { username: 'DaBao2', pin: '000000', displayName: '二宝', avatarKey: 'eevee', line: 'eevee', grade: '二年级' } });
    assert.equal(mk.status, 200, JSON.stringify(mk.j));
    assert.equal(mk.j.account.username, 'DaBao2');
    for (const u of ['dabao2', 'DABAO2', 'DaBao2']) {
      const r = await login(u, '000000');
      assert.equal(r.status, 200, u);
      assert.equal(r.j.username, 'DaBao2', '显示按起名原样');
    }
    const dup = await call('/api/parent/accounts/create', { method: 'POST', cookie: pc, body: { username: 'dabao2', pin: '000000', displayName: '重名' } });
    assert.equal(dup.status, 409);
    const dup2 = await call('/api/parent/accounts/create', { method: 'POST', cookie: pc, body: { username: 'DABAO', pin: '000000', displayName: '重名' } });
    assert.equal(dup2.status, 409, '与迁移账号 dabao 判重不分大小写');
    for (const bad of ['ab', 'a'.repeat(17), 'has space', '中文名字', 'a-b-c']) {
      const r = await call('/api/parent/accounts/create', { method: 'POST', cookie: pc, body: { username: bad, pin: '000000', displayName: 'x' } });
      assert.equal(r.status, 400, bad);
    }
    const short = await call('/api/parent/accounts/create', { method: 'POST', cookie: pc, body: { username: 'okname', pin: '00000', displayName: 'x' } });
    assert.equal(short.status, 400, 'PIN 必须 6 位');
    for (const bad of ['1234567', 'abcdef', '12 345']) assert.equal((await call('/api/parent/accounts/create', { method: 'POST', cookie: pc, body: { username: 'okname', pin: bad, displayName: 'x' } })).status, 400, bad);
    assert.equal((await call('/api/parent/accounts/create', { method: 'POST', cookie: pc, body: { username: 'okname', password: '000000', displayName: 'x' } })).status, 400, '旧 password 字段不再被识别');
  });

  test('改 PIN 让同账号的其他会话失效，当前会话保留；旧 PIN 错/不是 6 位数字/和旧的一样都被拒', async () => {
    const a = await activate('dabao', '223344');
    const b = (await login('dabao', '223344', '3.3.3.3')).cookie;
    assert.equal((await call('/api/overview', { cookie: b })).status, 200);
    assert.equal((await call('/api/auth/change-password', { method: 'POST', cookie: a, body: { oldPin: '999999', newPin: '334455' } })).status, 401);
    assert.equal((await call('/api/auth/change-password', { method: 'POST', cookie: a, body: { oldPin: '223344', newPin: '123' } })).status, 400);
    assert.equal((await call('/api/auth/change-password', { method: 'POST', cookie: a, body: { oldPin: '223344', newPin: '12345a' } })).status, 400);
    assert.equal((await call('/api/auth/change-password', { method: 'POST', cookie: a, body: { oldPassword: '223344', newPassword: '334455' } })).status, 400, '旧字段名不再被识别');
    assert.equal((await call('/api/auth/change-password', { method: 'POST', cookie: a, body: { oldPin: '223344', newPin: '223344' } })).status, 400);
    assert.equal((await call('/api/auth/change-password', { method: 'POST', cookie: a, body: { oldPin: '223344', newPin: '334455' } })).status, 200);
    assert.equal((await call('/api/overview', { cookie: b })).status, 401, '其他会话已失效');
    assert.equal((await call('/api/overview', { cookie: a })).status, 200, '当前会话保留');
  });

  test('会话 30 天有效：超期会话作废', async () => {
    const a = await activate('dabao', '223344');
    raw.exec('UPDATE sessions SET created_at=created_at-2592001');
    assert.equal((await call('/api/overview', { cookie: a })).status, 401);
  });
});

describe('接口只信会话里的 childId（A 的会话请求 B 的 childId → 403）', () => {
  test('抽查：打卡/背包/对战/道馆/仓库/宠物/问答等，换成别人的 childId 一律 403；本人 200', async () => {
    const a = await activate('dabao', '445566');
    const b = await activate('xiaobao', '556677');
    const probes = [
      ['GET', '/api/child?id=2'],
      ['GET', '/api/evo/backpack?childId=2'],
      ['GET', '/api/gym/status?childId=2'],
      ['GET', '/api/warehouse/status?childId=2'],
      ['GET', '/api/quiz/today?child_id=2'],
      ['GET', '/api/pokedex?childId=2'],
      ['GET', '/api/care/status?childId=2'],
      ['POST', '/api/checkin', { childId: 2, subject: '数学' }],
      ['POST', '/api/battle/gym/start', { childId: 2, stage: 1 }],
      ['POST', '/api/battle/pvp/status', { childId: 2 }],
      ['POST', '/api/battle/pvp/create', { childId: 2 }],
      ['POST', '/api/warehouse/store', { childId: 2, no: 25 }],
      ['POST', '/api/encounter/throw', { childId: 2 }],
      ['POST', '/api/quiz/answer', { childId: 2, questionId: 1, answerIdx: 0 }],
    ];
    for (const [method, path, body] of probes) {
      const asA = await call(path, { method, cookie: a, body });
      assert.equal(asA.status, 403, `${method} ${path} 用 A 的会话请求 B 的 childId 应 403，实得 ${asA.status} ${JSON.stringify(asA.j)}`);
    }
    // 本人（不传/传自己的 id）不是 403
    assert.notEqual((await call('/api/child?id=1', { cookie: a })).status, 403);
    assert.notEqual((await call('/api/child?id=2', { cookie: b })).status, 403);
    assert.equal((await call('/api/child?id=1', { cookie: b })).status, 403);
    // 孩子会话碰家长接口 → 要 PIN
    assert.equal((await call('/api/parent/accounts', { cookie: a })).status, 403);
  });

  test('对战加入：孩子会话不能冒充别的孩子加入；未被邀请的孩子加入 → 403', async () => {
    const pc = await parentPinCookie();
    await call('/api/parent/accounts/create', { method: 'POST', cookie: pc, body: { username: 'third', pin: '000000', displayName: '三宝', avatarKey: 'psyduck' } });
    const a = await activate('dabao', '445566');
    const b = await activate('xiaobao', '556677');
    const t0 = await login('third', '000000');
    await call('/api/auth/change-password', { method: 'POST', cookie: t0.cookie, body: { oldPin: '000000', newPin: '667788' } });
    const t = t0.cookie;
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: a, body: { childId: 1, opponentId: 2, roomCode: '0000' } });
    assert.equal(create.status, 200, JSON.stringify(create.j));
    const id = create.j.battle.battleId;
    const asThirdAsB = await call('/api/battle/pvp/join', { method: 'POST', cookie: t, body: { battleId: id, childId: 2, password: '0000' } });
    assert.equal(asThirdAsB.status, 403, '三宝冒充小宝 → 403');
    const asThird = await call('/api/battle/pvp/join', { method: 'POST', cookie: t, body: { battleId: id, password: '0000' } });
    assert.equal(asThird.status, 403, '没被邀请的孩子 → 403');
    const joined = await call('/api/battle/pvp/join', { method: 'POST', cookie: b, body: { battleId: id, password: '0000' } });
    assert.equal(joined.status, 200, JSON.stringify(joined.j));
    assert.equal(joined.j.battle.status, 'active');
  });
});

describe('同一家列表与对手邀请', () => {
  test('GET /api/family/members：只含同一家（children 表）的显示名与头像，不含密码/账号名；不能邀请不存在的孩子', async () => {
    const a = await activate('dabao', '445566');
    const f = await call('/api/family/members', { cookie: a });
    assert.equal(f.status, 200);
    assert.deepEqual(f.j.members.map((m) => [m.childId, m.isSelf]), [[1, true], [2, false]]);
    assert.ok(f.j.members.every((m) => m.avatar.includes('/static/img/p') && !('username' in m) && !('pw_hash' in m)));
    const bad = await call('/api/battle/pvp/create', { method: 'POST', cookie: a, body: { childId: 1, opponentId: 99 } });
    assert.equal(bad.status, 403);
    const stat = await call('/api/battle/pvp/status', { method: 'POST', cookie: a, body: { childId: 1, opponentId: 99 } });
    assert.equal(stat.status, 403);
  });
});

describe('我的页：头像/显示名/退出', () => {
  test('换头像只能选 8 款之一；显示名同步到孩子档案；家族列表与 /api/me 立刻是新头像', async () => {
    const a = await activate('dabao', '445566');
    const me0 = await call('/api/me', { cookie: a });
    assert.equal(me0.j.avatars.length, 8);
    assert.deepEqual(me0.j.avatars.map((x) => x.key), ['pikachu', 'charmander', 'bulbasaur', 'squirtle', 'eevee', 'jigglypuff', 'psyduck', 'snorlax']);
    assert.deepEqual(me0.j.avatars.map((x) => /p(\d+)\./.exec(x.url)[1]), ['25', '4', '1', '7', '133', '39', '54', '143']);
    assert.equal((await call('/api/me/update', { method: 'POST', cookie: a, body: { avatarKey: 'mewtwo' } })).status, 400);
    const up = await call('/api/me/update', { method: 'POST', cookie: a, body: { avatarKey: 'snorlax', displayName: '大宝宝' } });
    assert.equal(up.status, 200);
    assert.equal(up.j.avatarKey, 'snorlax');
    const me1 = await call('/api/me', { cookie: a });
    assert.match(me1.j.avatar, /p143\./);
    const fam = await call('/api/family/members', { cookie: a });
    assert.match(fam.j.members[0].avatar, /p143\./);
    assert.equal(fam.j.members[0].displayName, '大宝宝');
    assert.equal(raw.prepare('SELECT name FROM children WHERE id=1').get().name, '大宝宝');
    assert.equal((await call('/api/me/update', { method: 'POST', cookie: a, body: { displayName: '' } })).status, 400);
  });
  test('退出登录清会话', async () => {
    const a = await activate('dabao', '445566');
    assert.equal((await call('/api/logout', { method: 'POST', cookie: a, body: {} })).status, 200);
    assert.equal((await call('/api/overview', { cookie: a })).status, 401);
  });
  test('学习进度孩子自选（/api/me/progress）：读默认、写一科、非法 400、清空回默认、家长 403', async () => {
    const a = await activate('dabao', '445566');
    const g0 = await call('/api/me/progress', { cookie: a });
    assert.equal(g0.status, 200, JSON.stringify(g0.j));
    assert.equal(g0.j.grade, '三年级');
    for (const f of ['mathProgress', 'chineseProgress', 'englishProgress']) {
      assert.ok(g0.j[f] && Array.isArray(g0.j[f].chapters) && g0.j[f].chapters.length, f);
      assert.equal(g0.j[f].isDefault, true, f);
      assert.ok(typeof g0.j[f].current === 'string' && g0.j[f].current.length, f);
    }
    const w = await call('/api/me/progress', { method: 'POST', cookie: a, body: { mathProgress: '三年级上册 第3单元 加与减', chineseProgress: '三年级上册 第3单元' } });
    assert.equal(w.status, 200, JSON.stringify(w.j));
    const g1 = await call('/api/me/progress', { cookie: a });
    assert.equal(g1.j.mathProgress.current, '三年级上册 第3单元 加与减');
    assert.equal(g1.j.mathProgress.isDefault, false);
    assert.equal(g1.j.chineseProgress.current, '三年级上册 第3单元');
    assert.equal(g1.j.englishProgress.isDefault, true);
    const bad = await call('/api/me/progress', { method: 'POST', cookie: a, body: { mathProgress: '不存在的章节' } });
    assert.equal(bad.status, 400);
    const g2 = await call('/api/me/progress', { cookie: a });
    assert.equal(g2.j.mathProgress.current, '三年级上册 第3单元 加与减');
    const clr = await call('/api/me/progress', { method: 'POST', cookie: a, body: { mathProgress: '' } });
    assert.equal(clr.status, 200, JSON.stringify(clr.j));
    const g3 = await call('/api/me/progress', { cookie: a });
    assert.equal(g3.j.mathProgress.isDefault, true);
    const p = await activate('miles', '135790');
    const gp = await call('/api/me/progress', { cookie: p });
    assert.equal(gp.status, 403);
  });
});

describe('家长：建账号、重置 PIN、邀请码三态', () => {
  test('家长账号登录后 PIN 未验证 → 管理接口 403 NEED_PIN；输 PIN 后才能进；错 5 次 PIN 锁', async () => {
    const c = await activate('miles', '135790');
    const r0 = await call('/api/parent/accounts', { cookie: c });
    assert.equal(r0.status, 403);
    assert.equal(r0.j.error, 'NEED_PIN');
    assert.equal((await call('/api/parent/verify-pin', { method: 'POST', cookie: c, body: { pin: '0000' } })).status, 200);
    const r1 = await call('/api/parent/accounts', { cookie: c });
    assert.equal(r1.status, 200);
    assert.ok(r1.j.accounts.some((a) => a.username === 'miles'));
    assert.ok(!JSON.stringify(r1.j).includes('pw_hash'));
    const c2 = (await login('miles', '135790', '4.4.4.4')).cookie;
    for (let i = 0; i < 4; i++) assert.equal((await call('/api/parent/verify-pin', { method: 'POST', cookie: c2, body: { pin: '0000' } })).status, 401);
    assert.equal((await call('/api/parent/verify-pin', { method: 'POST', cookie: c2, body: { pin: '0000' } })).status, 429, '第 5 次错 → 锁 5 分钟');
  });

  test('家长重置孩子 PIN：恒为临时默认 123456，旧会话失效，孩子用 123456 登录并被要求再改一次', async () => {
    const a = await activate('dabao', '445566');
    const pc = await parentPinCookie();
    const accts = (await call('/api/parent/accounts', { cookie: pc })).j.accounts;
    const id = accts.find((x) => x.username === 'dabao').id;
    assert.equal((await call('/api/parent/accounts/reset-pin', { method: 'POST', cookie: pc, body: { accountId: 99999 } })).status, 404);
    assert.equal((await call('/api/parent/accounts/reset-pin', { method: 'POST', cookie: pc, body: { accountId: id, pin: '777777' } })).status, 200, '传什么都忽略，恒重置为 123456');
    assert.equal((await call('/api/overview', { cookie: a })).status, 401);
    assert.equal((await login('dabao', '445566')).status, 401);
    assert.equal((await login('dabao', '777777')).status, 401);
    const l = await login('dabao', '000000');
    assert.equal(l.status, 200);
    assert.equal(l.j.mustChangePw, true);
  });

  test('邀请码：有效→注册成功并自动登录，新孩子档案建好；已用→拒；过期→拒；乱写→拒；猜码限速', async () => {
    const pc = await parentPinCookie();
    const mk = await call('/api/parent/invites/create', { method: 'POST', cookie: pc, body: { line: 'squirtle', grade: '二年级' } }); // 客户端传的线和年级被忽略
    assert.equal(mk.status, 200);
    const code = mk.j.code;
    const stored = raw.prepare('SELECT line, grade_label FROM invite_codes WHERE code=?').get(code);
    assert.equal(stored.line, ''); assert.equal(stored.grade_label, '');
    assert.match(code, /^[A-Z2-9]{8}$/);
    assert.ok(Math.abs(mk.j.expiresAt - Math.floor(Date.now() / 1000) - 7 * 86400) < 5, '7 天有效');
    // 没有邀请码 / 乱码：注册不了
    for (const c of ['', 'WRONGCODE']) {
      const r = await call('/api/auth/register', { method: 'POST', body: { code: c, username: 'newkid', pin: '778899', displayName: '新娃', avatarKey: 'psyduck' }, ip: '5.5.5.5' });
      assert.equal(r.status, 400);
      assert.equal(r.j.error, 'INVITE_INVALID');
    }
    // 有效
    const ok = await call('/api/auth/register', { method: 'POST', body: { code: code.toLowerCase(), username: 'NewKid', pin: '778899', displayName: '新娃', avatarKey: 'psyduck', grade: '二年级' } });
    assert.equal(ok.status, 200, JSON.stringify(ok.j));
    assert.ok(['pikachu', 'charmander', 'squirtle', 'bulbasaur'].includes(ok.j.line)); assert.ok(ok.j.egg);
    assert.equal(ok.j.username, 'NewKid');
    const row = raw.prepare("SELECT * FROM accounts WHERE username='NewKid'").get();
    assert.equal(row.role, 'child');
    assert.equal(row.avatar_key, 'psyduck');
    assert.ok(row.pw_changed_at > 0, '自己注册时设的 PIN，不用再强制改');
    assert.equal((await login('NewKid', '778899')).status, 200, '注册时设的 6 位 PIN 能登录');
    const kid = raw.prepare('SELECT * FROM children WHERE id=?').get(row.child_id);
    assert.equal(kid.name, '新娃'); assert.equal(kid.line, ok.j.line); assert.equal(kid.grade_label, '二年级');
    const eggs = raw.prepare('SELECT * FROM sealed_eggs WHERE child_id=?').all(kid.id);
    assert.equal(eggs.length, 1); assert.equal(eggs[0].species, ok.j.egg.species); assert.equal(eggs[0].hatched, 0);
    assert.equal(Math.round((Date.parse(eggs[0].unlock_date) - Date.parse(eggs[0].awarded_date)) / 86400000), 7);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM pet_instances WHERE child_id=?').get(kid.id).n, 0);
    assert.ok(raw.prepare('SELECT value FROM settings WHERE key=?').get('grade_year_' + kid.id), '年级锚点已写');
    const ov = await call('/api/overview', { cookie: ok.cookie });
    assert.equal(ov.status, 200);
    assert.deepEqual(ov.j.children.map((c) => c.id), [row.child_id]);
    // 已用
    const used = await call('/api/auth/register', { method: 'POST', body: { code, username: 'another1', pin: '778899', displayName: '再来', avatarKey: 'eevee' } });
    assert.equal(used.status, 400); assert.equal(used.j.error, 'INVITE_USED');
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM accounts WHERE lower(username)='another1'").get().n, 0);
    // 过期
    const old = await call('/api/parent/invites/create', { method: 'POST', cookie: pc, body: { ttlSecs: -10 } });
    const exp = await call('/api/auth/register', { method: 'POST', body: { code: old.j.code, username: 'late1', pin: '778899', displayName: '迟到', avatarKey: 'eevee' } });
    assert.equal(exp.status, 400); assert.equal(exp.j.error, 'INVITE_EXPIRED');
    // 有效码 + 用户名重复：不消耗邀请码
    const mk2 = await call('/api/parent/invites/create', { method: 'POST', cookie: pc, body: {} });
    const dupName = await call('/api/auth/register', { method: 'POST', body: { code: mk2.j.code, username: 'newkid', pin: '778899', displayName: '重名', avatarKey: 'eevee' } });
    assert.equal(dupName.status, 409);
    assert.equal(raw.prepare('SELECT used_at FROM invite_codes WHERE code=?').get(mk2.j.code).used_at, null);
    // 猜码限速：同一 IP 连错 5 次后，连有效码也暂时不收
    for (let i = 0; i < 5; i++) await call('/api/auth/register', { method: 'POST', body: { code: 'NOPE' + i, username: 'x1234', pin: '778899', displayName: 'x' }, ip: '6.6.6.6' });
    const lockedReg = await call('/api/auth/register', { method: 'POST', body: { code: mk2.j.code, username: 'okok1', pin: '778899', displayName: 'x' }, ip: '6.6.6.6' });
    assert.equal(lockedReg.status, 429);
  });

  test('正式环境不能指定邀请码有效期（ttlSecs 只在测试站生效）', async () => {
    ({ env, raw } = makeEnv({ TEST_MODE: undefined }));
    const pc = await parentPinCookie();
    const r = await call('/api/parent/invites/create', { method: 'POST', cookie: pc, body: { ttlSecs: -10 } });
    assert.ok(Math.abs(r.j.expiresAt - Math.floor(Date.now() / 1000) - 7 * 86400) < 5);
  });
});

describe('家长：删除孩子账号（任务 129）', () => {
  async function makeChild(username) {
    const pc = await parentPinCookie();
    const r = await call('/api/parent/accounts/create', { method: 'POST', cookie: pc, body: { username, pin: '000000', displayName: '待删孩子', avatarKey: 'pikachu', grade: '一年级' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    return { pc, childId: r.j.account.childId, username };
  }

  test('删孩子：账号与档案都不见、再登录失败、相关数据清零', async () => {
    const { pc, childId, username } = await makeChild('testdel');
    raw.prepare("INSERT INTO checkins(child_id, date, subjects, submitted_at, submitted_epoch, status) VALUES(?,?,?,?,?,?)").run(childId, '2026-11-16', '[]', '10:00', 1700000000, 'approved');
    raw.prepare("INSERT INTO pet_instances(child_id, line_key, species_no, created_epoch, updated_epoch) VALUES(?,?,?,?,?)").run(childId, 'pikachu', 25, 1700000000, 1700000000);
    raw.prepare("INSERT INTO settings(key, value) VALUES(?,?)").run('math_progress_' + childId, '一年级上册 第1单元');
    // 道馆二期 Tier 1：连败计数跟孩子一起清
    raw.prepare('INSERT INTO gym_fail_streaks(child_id, stage, streak, updated_epoch) VALUES(?,?,?,?)').run(childId, 1, 2, 1700000000);
    const before = (await call('/api/parent/accounts', { cookie: pc })).j;
    assert.ok(before.accounts.some((a) => a.username === username));
    const d = await call('/api/parent/accounts/delete', { method: 'POST', cookie: pc, body: { childId } });
    assert.equal(d.status, 200, JSON.stringify(d.j));
    assert.equal(d.j.ok, true);
    const after = (await call('/api/parent/accounts', { cookie: pc })).j;
    assert.ok(!after.accounts.some((a) => a.username === username), '账号列表里不见了');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM children WHERE id=?').get(childId).n, 0, '孩子档案删了');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM checkins WHERE child_id=?').get(childId).n, 0, '打卡清了');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM pet_instances WHERE child_id=?').get(childId).n, 0, '宠物实例清了');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM gym_fail_streaks WHERE child_id=?').get(childId).n, 0, '连败计数清了');
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM settings WHERE key=?").get('math_progress_' + childId).n, 0, '进度设置清了');
    assert.equal((await login(username, '000000')).status, 401, '再登录失败');
  });

  test('删不存在的孩子 → 404；孩子本人调删除接口 → 403', async () => {
    const pc = await parentPinCookie();
    assert.equal((await call('/api/parent/accounts/delete', { method: 'POST', cookie: pc, body: { childId: 99999 } })).status, 404);
    const childCookie = await activate('dabao', '445566');
    const r = await call('/api/parent/accounts/delete', { method: 'POST', cookie: childCookie, body: { childId: 2 } });
    assert.equal(r.status, 403);
  });

  test('有待审核打卡或进行中对战 → 400 拒绝，不删', async () => {
    const { pc, childId } = await makeChild('testdel2');
    raw.prepare("INSERT INTO checkins(child_id, date, subjects, submitted_at, submitted_epoch, status) VALUES(?,?,?,?,?,?)").run(childId, '2026-11-16', '[]', '10:00', 1700000000, 'pending');
    const d1 = await call('/api/parent/accounts/delete', { method: 'POST', cookie: pc, body: { childId } });
    assert.equal(d1.status, 400);
    assert.equal(d1.j.error, 'HAS_PENDING_CHECKIN');
    raw.prepare("UPDATE checkins SET status='approved' WHERE child_id=?").run(childId);
    raw.prepare("INSERT INTO battles(mode, week_start, child_a, status) VALUES(?,?,?,?)").run('gym', '2026-11-16', childId, 'active');
    const d2 = await call('/api/parent/accounts/delete', { method: 'POST', cookie: pc, body: { childId } });
    assert.equal(d2.status, 400);
    assert.equal(d2.j.error, 'HAS_ACTIVE_BATTLE');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM children WHERE id=?').get(childId).n, 1, '孩子还在');
  });
});

describe('旧 PIN 登录过渡开关 LEGACY_PIN_LOGIN', () => {
  test('默认（true）旧入口仍可用；设为 false 后返回 410，账号登录不受影响', async () => {
    assert.equal((await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } })).status, 200);
    ({ env, raw } = makeEnv({ LEGACY_PIN_LOGIN: 'false' }));
    const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
    assert.equal(r.status, 410);
    assert.equal((await call('/api/child/login', { method: 'POST', body: { childId: 1, password: '1' } })).status, 410);
    assert.equal((await login('dabao', '000000')).status, 200);
  });
});

describe('登录页不含任何孩子信息', () => {
  test('GET / 与 /login（未登录）：只有用户名/PIN/登录；头像只有 8 款默认头像的选择器（注册用），无姓名/年级/等级', async () => {
    for (const p of ['/', '/login']) {
      const res = await M.default.fetch(new Request('https://test.local' + p), env);
      const html = (await res.text()).replace(/<select id="rg">.*?<\/select>/s, ''); // 注册表单的年级选项是静态选项，不是孩子信息
      assert.ok(html.includes('id="u"') && html.includes('id="p"'));
      for (const bad of ['宠物 Lv.', '三年级', '一年级', 'avatar-pikachu', 'avatar-charmander', '测试大宝', '测试小宝', '大宝', '小宝']) assert.ok(!html.includes(bad), p + ' 不应含 ' + bad);
      assert.ok(!html.includes('/api/child/login'));
    }
  });
});

describe('邀请码：旧码（存了线和年级）原样工作；年级校验与自动升级', () => {
  test('旧码：用存的线和年级，不发蛋', async () => {
    raw.prepare("INSERT INTO invite_codes(code, created_at, expires_at, line, grade_label) VALUES('OLDCODE1', ?, ?, 'squirtle', '三年级')").run(1, Math.floor(Date.now() / 1000) + 3600);
    const r = await call('/api/auth/register', { method: 'POST', body: { code: 'OLDCODE1', username: 'oldkid', pin: '778899', displayName: '旧码', avatarKey: 'eevee', grade: '五年级' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    const kid = raw.prepare('SELECT * FROM children WHERE name=?').get('旧码');
    assert.equal(kid.line, 'squirtle'); assert.equal(kid.grade_label, '三年级');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM sealed_eggs WHERE child_id=?').get(kid.id).n, 0);
    assert.equal(r.j.egg, null);
  });
  test('新码：注册表单的年级必须是六个标准标签之一', async () => {
    const pc = await parentPinCookie();
    const mk = await call('/api/parent/invites/create', { method: 'POST', cookie: pc, body: {} });
    const bad = await call('/api/auth/register', { method: 'POST', body: { code: mk.j.code, username: 'badgrade', pin: '778899', displayName: '坏年级', avatarKey: 'eevee', grade: '七年级' } });
    assert.equal(bad.status, 400); assert.equal(bad.j.error, 'BAD_GRADE');
    assert.equal(raw.prepare('SELECT used_at FROM invite_codes WHERE code=?').get(mk.j.code).used_at, null, '校验失败不占用邀请码');
  });
  test('自动升级：落后一学年升一级、六年级封顶、未知标签不动、无锚点只补锚点', async () => {
    const cur = (() => { const d = new Date(Date.now() + 8 * 3600e3); return d.getUTCMonth() + 1 >= 9 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; })();
    const mkKid = (name, grade, anchor) => {
      const id = Number(raw.prepare('INSERT INTO children(name, grade_label, line) VALUES(?,?,?)').run(name, grade, 'pikachu').lastInsertRowid);
      if (anchor !== null) raw.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('grade_year_' + id, String(anchor));
      return id;
    };
    const a = mkKid('升A', '二年级', cur - 1), b = mkKid('升B', '六年级', cur - 3), c = mkKid('升C', '初一', cur - 1), d = mkKid('升D', '二年级', null), e = mkKid('升E', '一年级', cur - 3);
    const pc = await parentPinCookie();
    const ov = await call('/api/overview', { cookie: pc });
    assert.equal(ov.status, 200);
    const g = (id) => raw.prepare('SELECT grade_label FROM children WHERE id=?').get(id).grade_label;
    const anchor = (id) => raw.prepare('SELECT value FROM settings WHERE key=?').get('grade_year_' + id).value;
    assert.equal(g(a), '三年级'); assert.equal(g(b), '六年级'); assert.equal(g(c), '初一'); assert.equal(g(d), '二年级'); assert.equal(g(e), '四年级');
    for (const id of [a, b, c, d, e]) assert.equal(anchor(id), String(cur));
    assert.equal(ov.j.children.find((k) => k.id === a).grade, '三年级');
  });
});

describe('PIN 登录：页面不再有密码', () => {
  test('登录/注册/首次改 PIN 表单都是 6 位数字 PIN（numeric、maxlength 6），页面与「我的」「用户管理」里没有密码字样；重置按钮是「重置 PIN」', async () => {
    const res = await M.default.fetch(new Request('https://test.local/login'), env);
    const html = await res.text();
    const form = (id) => html.slice(html.indexOf(`<form id="${id}"`), html.indexOf('</form>', html.indexOf(`<form id="${id}"`)));
    for (const [f, ids] of [['f-login', ['p']], ['f-reg', ['rp']], ['f-pw', ['np', 'np2']]]) {
      const part = form(f);
      for (const id of ids) {
        const tag = new RegExp(`<input id="${id}"[^>]*>`).exec(part)[0];
        assert.match(tag, /inputmode="numeric"/, f + '#' + id); assert.match(tag, /maxlength="6"/, f + '#' + id);
      }
      assert.ok(!/密码|password/i.test(part.replace(/autocomplete="(current|new)-password"|type="password"/g, "")), f + ' 不应出现密码字样');
    }
    assert.ok(html.includes("/^[0-9]{6}$/.test("), '前端校验 6 位数字');
    const app = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
    assert.ok(app.includes('>重置 PIN</button>') && !app.includes('acctResetPw(${a.id}, \'${esc(a.username)}\')">重置密码'));
    assert.ok(!app.includes('/api/parent/accounts/reset-password'), '前端改调 reset-pin');
    assert.ok(app.includes("{ oldPin: o, newPin: a }") && !app.includes('oldPassword'));
  });
});
