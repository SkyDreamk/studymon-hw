/* 养成转盘单测（2026-11-08 新建）：node --test tests/care-wheel.test.mjs
 * 覆盖：奖池（10 样全是 care:*、食物 5/洗澡 3、总权重 42、掷骰逐项命中、扇区 10 个）；
 * 发放幂等（完成当日 5 句发 1 次、同一天重复完成不重发、第二天再发 1 次、两孩互不干扰）；
 * 抽奖（奖品必为 10 样之一、进库存 care:<key> +1、机会清零、再抽报无机会、未登录/跨孩拒绝）；
 * 上限隔离（照顾盘抽奖不计入高级转盘周上限、高级转盘抽奖不消耗照顾盘机会）。
 * 不部署、不碰 staging D1；不消耗真实打卡记录（内存库）。
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0026_rare_wheel.sql', '0027_daily_english.sql', '0028_care_wheel.sql', '0029_daily_english_assess.sql'];

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
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw,
  };
}

let env, raw;
beforeEach(async () => {
  ({ env, raw } = makeEnv());
  // 夹具孩子密码（与 daily-english.test 同一做法）：家长登录后经设置接口下发
  const parent = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(parent.status, 200);
  const set = await call('/api/parent/settings/update', {
    method: 'POST', cookie: parent.cookie,
    body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] },
  });
  assert.equal(set.j.ok, true);
});

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

async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200, `child ${id} 登录应成功：${JSON.stringify(r.j)}`);
  return r.cookie;
}

async function withRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return await fn(); } finally { Math.random = orig; }
}

function invQty(childId, key) {
  const r = raw.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').get(childId, key);
  return r ? r.qty : 0;
}

async function completeDailyEnglish(childId, cookie) {
  // 新门禁（2026-11-09）：打卡须当日 5 句 best 全 ≥80，先把 5 句成绩种到 85 再打卡
  const g = await call('/api/daily-english?child_id=' + childId, { cookie });
  assert.equal(g.j.ok, true);
  const now = Math.floor(Date.now() / 1000);
  for (const s of g.j.sentences) {
    raw.prepare('INSERT OR IGNORE INTO daily_english_assessments(child_id, sid, date_shanghai, best_pron, attempts, updated_epoch) VALUES(?,?,?,?,?,?)')
      .run(childId, M.dailyEnglishSidKey(s), g.j.date, 85, 1, now);
  }
  const r = await call('/api/daily-english/checkin', { method: 'POST', body: { childId }, cookie });
  assert.equal(r.status, 200, `child ${childId} 打卡应成功：${JSON.stringify(r.j)}`);
  return r.j;
}

async function backpackChances(childId, cookie) {
  const r = await call('/api/evo/backpack?childId=' + childId, { cookie });
  assert.equal(r.status, 200, `child ${childId} 背包应可读：${JSON.stringify(r.j)}`);
  return { wheel: r.j.wheelChances, rare: r.j.rareWheelChances, care: r.j.careWheelChances };
}

// 直接插 1 条高级转盘机会（school_test_id 用占位值，无外键约束；与 wheel-upgrade.test 同一做法）。
function grantExamWheelChance(childId, schoolTestId = 9001) {
  const today = M.shDateStr();
  raw.prepare('INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)')
    .run(childId, schoolTestId, M.weekStartMon(today), Math.floor(Date.now() / 1000), today);
}

function careChanceRows(childId) {
  return raw.prepare('SELECT * FROM care_wheel_chances WHERE child_id=? ORDER BY id').all(childId);
}

describe('养成转盘奖池（纯函数）', () => {
  test('10 样全是 care:*、食物 5/洗澡 3、总权重 42', () => {
    const pool = M.CARE_WHEEL_POOL;
    assert.equal(pool.length, 10);
    for (const [key, w] of pool) assert.ok(key.startsWith('care:'), `${key} 应为 care:*`);
    const foods = M.CARE_FOODS.map((f) => f.key);
    const baths = M.CARE_BATHS.map((b) => b.key);
    for (const key of foods) {
      const row = pool.find(([k]) => k === 'care:' + key);
      assert.ok(row, `食物 ${key} 应在奖池`);
      assert.equal(row[1], 5, `食物 ${key} 权重应为 5`);
    }
    for (const key of baths) {
      const row = pool.find(([k]) => k === 'care:' + key);
      assert.ok(row, `洗澡 ${key} 应在奖池`);
      assert.equal(row[1], 3, `洗澡 ${key} 权重应为 3`);
    }
    assert.equal(pool.reduce((a, [, w]) => a + w, 0), 42);
    // 与普通转盘里照顾道具部分同键同权重（相对概率一致）
    const oakCare = M.OAK_WHEEL_POOL.filter(([k]) => k.startsWith('care:'));
    assert.deepEqual(pool, oakCare);
  });

  test('掷骰逐项命中：边界值与扇区', () => {
    assert.equal(M.rollCareWheelPrize(() => 0), 'care:apple');
    assert.equal(M.rollCareWheelPrize(() => 5 / 42), 'care:berry');
    assert.equal(M.rollCareWheelPrize(() => 0.5), 'care:milk');
    assert.equal(M.rollCareWheelPrize(() => 0.999), 'care:herb');
    const built = M.careWheelFor('care:apple');
    assert.equal(built.sectors.length, 10);
    assert.equal(built.total, 42);
    assert.equal(built.winnerIndex, 0);
    assert.equal(M.careWheelFor('care:herb').winnerIndex, 9);
    assert.equal(M.careWheelEntries().length, 10);
    assert.equal(M.careWheelEntries()[0].label, M.ITEM_CATALOG['care:apple'].name);
  });
});

describe('发放幂等（完成当日 5 句）', () => {
  test('完成发 1 次；同一天重复完成不重发', async () => {
    const c1 = await childCookie(1, '0000');
    const r1 = await completeDailyEnglish(1, c1);
    assert.equal(r1.careWheelGranted, true);
    assert.equal(r1.careWheelChances, 1);
    assert.equal(careChanceRows(1).length, 1);
    const r2 = await completeDailyEnglish(1, c1);
    assert.equal(r2.careWheelGranted, false, '同一天重复完成不再发');
    assert.equal(r2.careWheelChances, 1);
    assert.equal(careChanceRows(1).length, 1, '重复完成不得多记一行');
  });

  test('第二天完成再发 1 次（debug_day_offset 拨到次日）', async () => {
    const c1 = await childCookie(1, '0000');
    const r1 = await completeDailyEnglish(1, c1);
    assert.equal(r1.careWheelChances, 1);
    raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset','1')").run();
    const r2 = await completeDailyEnglish(1, c1);
    assert.equal(r2.careWheelGranted, true, '次日完成应再发 1 次');
    assert.equal(r2.careWheelChances, 2, '次日机会累计为 2（昨日未用＋今日新发）');
    const rows = careChanceRows(1);
    assert.equal(rows.length, 2);
    assert.notEqual(rows[0].date_shanghai, rows[1].date_shanghai, '两日 ref 应为不同日期');
    raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset','0')").run();
  });

  test('两孩互不干扰', async () => {
    const c1 = await childCookie(1, '0000');
    const c2 = await childCookie(2, '0000');
    await completeDailyEnglish(1, c1);
    let b1 = await backpackChances(1, c1);
    let b2 = await backpackChances(2, c2);
    assert.equal(b1.care, 1);
    assert.equal(b2.care, 0, '大宝完成不应给小宝发机会');
    await completeDailyEnglish(2, c2);
    b1 = await backpackChances(1, c1);
    b2 = await backpackChances(2, c2);
    assert.equal(b1.care, 1);
    assert.equal(b2.care, 1);
  });
});

describe('抽奖接口', () => {
  test('抽中奖品必为 10 样之一、进库存 +1、机会清零、再抽报无机会', async () => {
    const c1 = await childCookie(1, '0000');
    await completeDailyEnglish(1, c1);
    const r = await withRandom(0, () => call('/api/care-wheel/spin', { method: 'POST', body: { childId: 1 }, cookie: c1 }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.kind, 'item');
    assert.equal(r.j.prize.key, 'care:apple', '随机值 0 应命中首项红苹果');
    assert.equal(r.j.chancesLeft, 0);
    assert.equal(r.j.wheel.sectors.length, 10);
    assert.equal(r.j.wheel.total, 42);
    assert.equal(r.j.wheel.winnerIndex, 0);
    assert.equal(invQty(1, 'care:apple'), 1, '红苹果应进库存 +1');
    assert.notEqual(careChanceRows(1)[0].used_epoch, null, '机会行应标记已用');
    const again = await call('/api/care-wheel/spin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    assert.equal(again.status, 400);
    assert.match(again.j.error, /没有养成转盘机会/);
    assert.equal(invQty(1, 'care:apple'), 1, '再抽失败不得重复发奖');
  });

  test('无机会时不发奖、不动库存', async () => {
    const c1 = await childCookie(1, '0000');
    const r = await call('/api/care-wheel/spin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    assert.equal(r.status, 400);
    assert.match(r.j.error, /没有养成转盘机会/);
    for (const [key] of M.CARE_WHEEL_POOL) assert.equal(invQty(1, key), 0, `${key} 不应凭空进库存`);
  });

  test('未登录拒绝、跨孩拒绝', async () => {
    const c1 = await childCookie(1, '0000');
    await completeDailyEnglish(1, c1);
    const anon = await call('/api/care-wheel/spin', { method: 'POST', body: { childId: 1 } });
    assert.equal(anon.status, 401);
    const cross = await call('/api/care-wheel/spin', { method: 'POST', body: { childId: 2 }, cookie: c1 });
    assert.equal(cross.status, 403);
  });
});

describe('上限隔离（周上限仅限高级转盘）', () => {
  test('照顾盘抽奖不计入高级转盘周上限、不动 wheel_chances', async () => {
    const c1 = await childCookie(1, '0000');
    grantExamWheelChance(1);
    let b = await backpackChances(1, c1);
    assert.equal(b.wheel, 1, '预置 1 次高级转盘机会');
    assert.equal(b.care, 0);
    await completeDailyEnglish(1, c1);
    const r = await withRandom(0, () => call('/api/care-wheel/spin', { method: 'POST', body: { childId: 1 }, cookie: c1 }));
    assert.equal(r.status, 200);
    b = await backpackChances(1, c1);
    assert.equal(b.wheel, 1, '转完照顾盘后高级转盘机会仍为 1');
    assert.equal(b.care, 0);
    const row = raw.prepare('SELECT used_epoch FROM wheel_chances WHERE child_id=1').get();
    assert.equal(row.used_epoch, null, '高级转盘机会行不得被照顾盘消耗');
  });

  test('高级转盘抽奖不消耗照顾盘机会', async () => {
    const c1 = await childCookie(1, '0000');
    await completeDailyEnglish(1, c1);
    grantExamWheelChance(1);
    let b = await backpackChances(1, c1);
    assert.equal(b.care, 1);
    assert.equal(b.wheel, 1);
    const r = await withRandom(0, () => call('/api/evo/wheel/spin', { method: 'POST', body: { childId: 1 }, cookie: c1 }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.key, 'stone:sun', '随机值 0 应命中高级转盘首项日之石');
    assert.equal(r.j.chancesLeft, 0);
    assert.equal(invQty(1, 'stone:sun'), 1, '日之石应进库存');
    b = await backpackChances(1, c1);
    assert.equal(b.wheel, 0, '高级转盘机会已耗尽');
    assert.equal(b.care, 1, '照顾盘机会不受高级转盘抽奖影响');
    assert.equal(careChanceRows(1)[0].used_epoch, null, '照顾盘机会行仍未用');
  });
});
