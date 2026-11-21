/* 重复进化奖励单测：node --test tests/evo-duplicate-reward.test.mjs
 * 覆盖：目标已拥有时领奖（低形态保留、转盘 +1、图鉴不重复行）、再领被拒且按钮消失、
 * 未拥有时正常进化、领奖不计入周上限（学校 3 次照常发、可用 3+1）、条件未满足 LEVEL_TOO_LOW、
 * 三段链两步各领一次、转盘先转最旧机会（学校行先于进化行）。
 * 真实 Azure 调用 0 次。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql', '0043_pet_instances_ability.sql'];

function makeEnv(migrations = MIGRATIONS) {
  const raw = new DatabaseSync(':memory:');
  for (const f of migrations) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  const wrap = (sql) => ({
    _args: [],
    bind(...args) { this._args = args; return this; },
    async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
    async all() { return { results: raw.prepare(sql).all(...this._args) }; },
    async run() {
      const r = raw.prepare(sql).run(...this._args);
      return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  const db = {
    prepare: (sql) => wrap(sql),
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw,
  };
}

let env, raw;
beforeEach(() => { ({ env, raw } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

async function toProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(env.DB, env);
}

async function withRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return await fn(); } finally { Math.random = orig; }
}

function setLevel(childId, level) {
  raw.prepare('UPDATE children SET total_xp=? WHERE id=?').run(M.xpForLevel(level), childId);
}
function todayStr() { return M.shDateStr(); }
function addInstance(childId, lineKey, speciesNo) {
  raw.prepare("INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, created_epoch, updated_epoch) VALUES(?,?,?,0,'egg',0,0)").run(childId, lineKey, speciesNo);
}
function ownSpecies(childId, no, entryKey) {
  raw.prepare('INSERT INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)').run(childId, entryKey, todayStr());
  raw.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)').run(childId, no, 'egg', Math.floor(Date.now() / 1000));
}
function evoGrantRows(childId) {
  return raw.prepare('SELECT * FROM evo_wheel_grants WHERE child_id=? ORDER BY id').all(childId);
}
async function backpack(cookie, childId = 1) {
  const r = await call(`/api/evo/backpack?childId=${childId}`, { cookie });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  return r.j;
}
function insertPendingSchoolTest(childId, subject, unit, score, fullScore, photoKey) {
  const today = todayStr();
  const now = Math.floor(Date.now() / 1000);
  const pct = Math.round((score / fullScore) * 1000) / 10;
  const ins = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, photo_key, photo_expires_epoch, reward_granted, status, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?,?,?,0,'pending',?,?)")
    .run(childId, subject, unit, score, fullScore, pct, today, photoKey, photoKey ? now + 15 * 86400 : null, now, today);
  return Number(ins.lastInsertRowid);
}

describe('重复进化奖励：领奖', () => {
  test('已有三地鼠＋26 级 → 领奖成功：得 1 次转盘，地鼠保留、图鉴不重复行', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLevel(1, 26);
    addInstance(1, 'species:50', 50);
    ownSpecies(1, 51, 'egg:51');
    const r = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:50' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.reward, 'wheel');
    assert.equal(r.j.no, 51);
    assert.equal(r.j.wheelChances, 1);
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='species:50'").get();
    assert.equal(inst.species_no, 50, '低形态保留，不进化');
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM pokedex WHERE child_id=1 AND entry_key='egg:51'").get().n, 1, '图鉴不重复行');
    const grants = evoGrantRows(1);
    assert.equal(grants.length, 1);
    assert.equal(grants[0].step_key, 'species:50->51');
    const bp = await backpack(cookie);
    assert.equal(bp.wheelChances, 1);
  });

  test('再领一次被拒（EVO_REWARD_CLAIMED），背包不再显示进化选项（含第二只同种低形态）', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLevel(1, 26);
    addInstance(1, 'species:50', 50);
    ownSpecies(1, 51, 'egg:51');
    const r1 = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:50' } });
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    const r2 = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:50' } });
    assert.equal(r2.status, 400);
    assert.match(r2.j.error, /已经领过/);
    // 背包里该宠不再显示进化选项（按钮永久消失）
    const bp = await backpack(cookie);
    const opts = bp.instances.filter((i) => i.lineKey === 'species:50').flatMap((i) => i.evoOptions || []);
    assert.equal(opts.length, 0, '已领奖后按钮永久消失');
    assert.equal(evoGrantRows(1).length, 1, '只领一次');
  });

  test('未拥有目标形态：正常进化成三地鼠（旧行为不动）', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLevel(1, 26);
    addInstance(1, 'species:50', 50);
    const r = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:50' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.reward, undefined);
    assert.equal(r.j.name, '三地鼠');
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='species:50'").get();
    assert.equal(inst.species_no, 51);
    assert.equal(evoGrantRows(1).length, 0, '正常进化不产生奖励行');
  });

  test('条件未满足：25 级领不了（LEVEL_TOO_LOW），不产生奖励行', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLevel(1, 25);
    addInstance(1, 'species:50', 50);
    ownSpecies(1, 51, 'egg:51');
    const r = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:50' } });
    assert.equal(r.status, 400);
    assert.match(r.j.error, /26 级/);
    assert.equal(evoGrantRows(1).length, 0);
  });

  test('周上限：领奖后学校 3 次照常发，可用次数 3+1', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLevel(1, 26);
    addInstance(1, 'species:50', 50);
    ownSpecies(1, 51, 'egg:51');
    const r1 = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:50' } });
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    // 学校 96 分＋照片，三门科目各一次（正式模式走周上限口径）
    for (const subject of ['数学', '语文', '英语']) {
      const rec = insertPendingSchoolTest(1, subject, '期中考试', 96, 100, 'school/1/1.jpg');
      const rr = await call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: rec, decision: 'approve' } });
      assert.equal(rr.status, 200, JSON.stringify(rr.j));
      assert.equal(rr.j.wheelChance, true, `${subject} 应发转盘机会`);
    }
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM wheel_chances WHERE child_id=1').get().n, 3, '学校周上限 3 次照常发满');
    assert.equal(evoGrantRows(1).length, 1, '进化奖励另计，不占学校名额');
    const bp = await backpack(cookie);
    assert.equal(bp.wheelChances, 4, '可用 3+1');
  });

  test('三段链：10→11 与 11→12 各领一次（按步骤记）', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLevel(1, 10);
    addInstance(1, 'species:10', 10);
    addInstance(1, 'species:11', 11);
    ownSpecies(1, 11, 'egg:11');
    ownSpecies(1, 12, 'egg:12');
    const r1 = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:10' } });
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.reward, 'wheel');
    assert.equal(r1.j.no, 11);
    const r2 = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:11' } });
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.equal(r2.j.reward, 'wheel');
    assert.equal(r2.j.no, 12);
    const keys = evoGrantRows(1).map((g) => g.step_key).sort();
    assert.deepEqual(keys, ['species:10->11', 'species:11->12']);
    const bp = await backpack(cookie);
    assert.equal(bp.wheelChances, 2);
  });
});

describe('重复进化奖励：转盘取行', () => {
  test('学校机会先于进化机会（最旧先转），转两次分别耗尽两表', async () => {
    const cookie = await parentCookie();
    const today = todayStr();
    // 学校机会（created_epoch 更早）
    const ins = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, status, reward_granted, created_epoch, date_shanghai) VALUES(1,'数学','第3单元',96,100,96,?,'active',0,0,?)").run(today, today);
    raw.prepare('INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(1,?,?,100,?)').run(Number(ins.lastInsertRowid), M.weekStartMon(today), today);
    // 进化奖励机会（created_epoch 更晚）
    setLevel(1, 26);
    addInstance(1, 'species:50', 50);
    ownSpecies(1, 51, 'egg:51');
    const rc = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:50' } });
    assert.equal(rc.status, 200, JSON.stringify(rc.j));
    const r1 = await withRandom(0.1, () => call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.prize.kind, 'stone');
    assert.equal(r1.j.chancesLeft, 1);
    assert.equal(raw.prepare('SELECT used_epoch FROM wheel_chances WHERE child_id=1').get().used_epoch !== null, true, '先转学校行');
    assert.equal(raw.prepare('SELECT used_epoch FROM evo_wheel_grants WHERE child_id=1').get().used_epoch, null, '进化行还没用');
    const r2 = await withRandom(0.1, () => call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.equal(r2.j.chancesLeft, 0);
    assert.equal(raw.prepare('SELECT used_epoch FROM evo_wheel_grants WHERE child_id=1').get().used_epoch !== null, true, '再转进化行');
    const r3 = await call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(r3.status, 400);
  });
});

describe('重复进化奖励：evoOptionsFor', () => {
  test('已拥有未领奖 → collection-evo-reward；已领奖 → 无选项；未拥有 → 正常进化', async () => {
    // 直接调用纯函数：先切正式模式（DEBUG_GATES_OPEN 是模块级状态，须显式关掉测试放行）
    await toProd();
    const child = { total_xp: M.xpForLevel(26), fairy_moves: '[]' };
    const inst = { line_key: 'species:50', form_idx: 0, species_no: 50, branch: null };
    const owned = new Set([51]);
    const reward = M.evoOptionsFor(child, inst, {}, 26, { owned, claimedSteps: new Set() });
    assert.equal(reward.length, 1);
    assert.equal(reward[0].kind, 'collection-evo-reward');
    assert.equal(reward[0].no, 51);
    assert.equal(reward[0].ready, true);
    const claimed = M.evoOptionsFor(child, inst, {}, 26, { owned, claimedSteps: new Set(['species:50->51']) });
    assert.equal(claimed.length, 0, '已领奖后按钮永久消失');
    const notOwned = M.evoOptionsFor(child, inst, {}, 26, { owned: new Set(), claimedSteps: new Set() });
    assert.equal(notOwned.length, 1);
    assert.equal(notOwned[0].kind, 'collection-evo');
    // 条件未满足时奖励选项同样带 missing、不可领
    const notReady = M.evoOptionsFor(child, inst, {}, 25, { owned, claimedSteps: new Set() });
    assert.equal(notReady.length, 1);
    assert.equal(notReady[0].kind, 'collection-evo-reward');
    assert.equal(notReady[0].ready, false);
    assert.ok(notReady[0].missing.join('').includes('26'));
  });
});
