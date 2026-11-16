/* 进化道具 v11 单测：node --test tests/evo-items.test.mjs
 * 覆盖：纯函数掷骰（日常掉落／转盘／单元测试／进化选项）与 handler
 * （用石进化、伊布分支、妖精教学去重与 Lv16 确认、收藏等级进化、蛋去重与孵化、
 * 学校成绩发放幂等、转盘机会配额、单元测试冷却与周限额、道馆用药 caps、球溢出兑换）。
 * 真实 Azure 调用 0 次。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql'];

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

/* 全面解锁（2026-10-28）：DEBUG_GATES_OPEN 改为 = isTestMode(env) 后，以下旧断言须在正式模式（无 TEST_MODE）下跑才仍成立；测试站放行行为改由 tests/test-mode-unlock.test.mjs 覆盖。 */
async function toProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(env.DB, env);
}

function seqRng(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
async function withRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return await fn(); } finally { Math.random = orig; }
}
async function withRandomSeq(values, fn) {
  const orig = Math.random;
  Math.random = seqRng(values);
  try { return await fn(); } finally { Math.random = orig; }
}

function giveItem(childId, key, qty = 1) {
  raw.prepare('INSERT INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(?,?,?,0) ON CONFLICT(child_id, item_key) DO UPDATE SET qty=qty+excluded.qty').run(childId, key, qty);
}
function invQty(childId, key) {
  const r = raw.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').get(childId, key);
  return r ? r.qty : 0;
}
function setLevel(childId, level) {
  raw.prepare('UPDATE children SET total_xp=? WHERE id=?').run(M.xpForLevel(level), childId);
}
function setLine(childId, line) {
  raw.prepare('UPDATE children SET line=? WHERE id=?').run(line, childId);
}
function todayStr() { return M.shDateStr(); }

/* ---------- 纯函数：掷骰 ---------- */
describe('rollDailyItemDrop', () => {
  test('门槛 12%：第一次掷骰 ≥0.12 不掉落', () => {
    assert.equal(M.rollDailyItemDrop(() => 0.5, new Set()), null);
    assert.equal(M.rollDailyItemDrop(() => 0.12, new Set()), null);
  });
  test('掉落权重：伤药 35% 段命中', () => {
    assert.equal(M.rollDailyItemDrop(seqRng([0.05, 0.05]), new Set()), 'medicine:potion');
  });
  test('石档去重：5 种石全已有时石档转无掉落', () => {
    const owned = new Set(['stone:thunder', 'stone:fire', 'stone:water', 'stone:leaf', 'stone:ice']);
    assert.equal(M.rollDailyItemDrop(seqRng([0.05, 0.99, 0.5]), owned), null);
  });
  test('石档去重：只剩冰之石时掷中石档必出冰之石', () => {
    const owned = new Set(['stone:thunder', 'stone:fire', 'stone:water', 'stone:leaf']);
    assert.equal(M.rollDailyItemDrop(seqRng([0.05, 0.99, 0.0]), owned), 'stone:ice');
  });
  test('高级球 3% 段命中', () => {
    assert.equal(M.rollDailyItemDrop(seqRng([0.05, 0.96]), new Set()), 'ball:hyper');
  });
});

describe('rollWheelPrize', () => {
  test('蛋档去重：主宠蛋只剩伊布可重复时必出伊布', () => {
    // 新池合计 147，蛋段为 85~100/147，0.6 落段内
    const prize = M.rollWheelPrize(() => 0.6, new Set([1, 4, 7, 25]), new Set());
    assert.equal(prize.kind, 'egg');
    assert.equal(prize.species, 133);
  });
  test('石档权重：0.1 落在日之石段', () => {
    const prize = M.rollWheelPrize(() => 0.1, new Set(), new Set());
    assert.deepEqual(prize, { kind: 'stone', key: 'stone:sun' });
  });
  test('高级球段命中', () => {
    // 新池合计 147，高级球段为 75~85/147，0.55 落段内（旧 0.7 现落活力碎片段）
    const prize = M.rollWheelPrize(() => 0.55, new Set(), new Set());
    assert.deepEqual(prize, { kind: 'ball', key: 'ball:hyper' });
  });
});

describe('unitTestWinChance / rollUnitTestPrize', () => {
  test('中奖率三档：84→0、85–89→0.4、90–94→0.5、95–100→0.6', () => {
    assert.equal(M.unitTestWinChance(84), 0);
    assert.equal(M.unitTestWinChance(85), 0.4);
    assert.equal(M.unitTestWinChance(89), 0.4);
    assert.equal(M.unitTestWinChance(90), 0.5);
    assert.equal(M.unitTestWinChance(94), 0.5);
    assert.equal(M.unitTestWinChance(95), 0.6);
    assert.equal(M.unitTestWinChance(100), 0.6);
  });
  test('奖品去重：石全有、主宠蛋只剩伊布时蛋档必出伊布', () => {
    const allStones = new Set(['stone:thunder', 'stone:fire', 'stone:water', 'stone:leaf', 'stone:ice', 'stone:sun', 'stone:moon', 'stone:fairy-skill']);
    const prize = M.rollUnitTestPrize(seqRng([0.9, 0.0]), new Set([1, 4, 7, 25]), new Set([37, 58]), allStones);
    assert.equal(prize.kind, 'egg');
    assert.equal(prize.species, 133);
  });
  test('奖品权重：球档命中超级球（ballSuperShare 内）', () => {
    const prize = M.rollUnitTestPrize(seqRng([0.5, 0.5]), new Set(), new Set(), new Set());
    // 总权重 0.32+0.03+0.20+0.18+0.27=1.0；r=0.5 落在球档（0.35–0.55），第二掷 0.5 < 0.625 → 超级球
    assert.deepEqual(prize, { kind: 'ball', key: 'ball:super' });
  });
});

describe('evoOptionsFor', () => {
  test('主宠终极：16 级＋雷之石 → ready；15 级 → 还差等级', () => {
    const child = { total_xp: M.xpForLevel(16), fairy_moves: '[]' };
    const inst = { line_key: 'pikachu', form_idx: 2, species_no: 25, branch: null };
    const ready = M.evoOptionsFor(child, inst, { 'stone:thunder': 1 }, 16);
    const opt = ready.find((o) => o.kind === 'main-final');
    assert.equal(opt.ready, true);
    assert.equal(opt.no, 26);
    const notReady = M.evoOptionsFor(child, inst, { 'stone:thunder': 1 }, 15);
    assert.equal(notReady.find((o) => o.kind === 'main-final').ready, false);
    assert.ok(notReady.find((o) => o.kind === 'main-final').missing.join('').includes('16'));
  });
  test('伊布仙子分支：已学妖精招式＋16 级 → ready；15 级 → 不 ready', () => {
    const child = { total_xp: M.xpForLevel(16), fairy_moves: JSON.stringify([{ name: '魅惑之声', level: 3 }]) };
    const inst = { line_key: 'eevee', form_idx: 1, species_no: 133, branch: null };
    const opts = M.evoOptionsFor(child, inst, {}, 16);
    const fairy = opts.find((o) => o.branch === 'sylveon');
    assert.equal(fairy.ready, true);
    assert.equal(fairy.no, 700);
    const opts15 = M.evoOptionsFor(child, inst, {}, 15);
    assert.equal(opts15.find((o) => o.branch === 'sylveon').ready, false);
  });
  test('伊布水分支：16 级无水之石 → 还差水之石', () => {
    const child = { total_xp: M.xpForLevel(16), fairy_moves: '[]' };
    const inst = { line_key: 'eevee', form_idx: 1, species_no: 133, branch: null };
    const opts = M.evoOptionsFor(child, inst, {}, 16);
    const water = opts.find((o) => o.branch === 'vaporeon');
    assert.equal(water.ready, false);
    assert.ok(water.missing.join('').includes('水之石'));
    assert.equal(opts.filter((o) => o.kind === 'eevee-branch').length, 8);
  });
  test('收藏线：波波 18 级可进化成比比鸟；17 级不行', () => {
    const child = { total_xp: M.xpForLevel(18), fairy_moves: '[]' };
    const inst = { line_key: 'species:16', form_idx: 0, species_no: 16, branch: null };
    const opts = M.evoOptionsFor(child, inst, {}, 18);
    assert.equal(opts.length, 1);
    assert.equal(opts[0].no, 17);
    assert.equal(opts[0].ready, true);
    const opts17 = M.evoOptionsFor(child, inst, {}, 17);
    assert.equal(opts17[0].ready, false);
  });
});

/* ---------- handler：用石进化 ---------- */
describe('use-stone / evolve', () => {
  test('主宠终极：16 级＋雷之石 → 进化成雷丘，石消耗、图鉴写 form:pikachu:3', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLine(1, 'pikachu');
    setLevel(1, 16);
    giveItem(1, 'stone:thunder', 1);
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'main' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.equal(r.j.name, '雷丘');
    assert.equal(invQty(1, 'stone:thunder'), 0);
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='pikachu'").get();
    assert.equal(inst.form_idx, 3);
    const dex = raw.prepare("SELECT 1 v FROM pokedex WHERE child_id=1 AND entry_key='form:pikachu:3'").get();
    assert.ok(dex, '图鉴应有 form:pikachu:3');
  });
  test('主宠终极：15 级有石也不行（还差等级）', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLine(1, 'pikachu');
    setLevel(1, 15);
    giveItem(1, 'stone:thunder', 1);
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'main' } });
    assert.equal(r.status, 400);
    assert.equal(invQty(1, 'stone:thunder'), 1);
  });
  test('主宠终极：16 级无石不行', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLine(1, 'pikachu');
    setLevel(1, 16);
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'main' } });
    assert.equal(r.status, 400);
    assert.match(r.j.error, /雷之石/);
  });
  test('伊布教学：两次教学招式不同、石各耗 1；池满（5 招）后石头不可用、不消耗', async () => {
    const cookie = await parentCookie();
    setLine(1, 'eevee');
    setLevel(1, 10);
    giveItem(1, 'stone:fairy-skill', 2);
    const r1 = await withRandom(0.0, () => call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'eevee', action: 'teach' } }));
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.move.name, '魅惑之声');
    assert.equal(invQty(1, 'stone:fairy-skill'), 1);
    const r2 = await withRandom(0.99, () => call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'eevee', action: 'teach' } }));
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.notEqual(r2.j.move.name, '魅惑之声');
    assert.equal(invQty(1, 'stone:fairy-skill'), 0);
    // 池满：直接写满 5 招，再给石也教不了
    raw.prepare("UPDATE children SET fairy_moves=? WHERE id=1").run(JSON.stringify(M.FAIRY_TEACH_POOL.map((m) => ({ name: m.name, level: 10 }))));
    giveItem(1, 'stone:fairy-skill', 1);
    const r3 = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'eevee', action: 'teach' } });
    assert.equal(r3.status, 400);
    assert.equal(invQty(1, 'stone:fairy-skill'), 1, '池满时石头不消耗');
  });
  test('仙子伊布确认：已学招式＋16 级 → 进化，不耗石；15 级 → 不行', async () => {
    const cookie = await parentCookie();
    setLine(1, 'eevee');
    setLevel(1, 16);
    raw.prepare("UPDATE children SET fairy_moves=? WHERE id=1").run(JSON.stringify([{ name: '魅惑之声', level: 3 }]));
    const r = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'eevee', branch: 'sylveon' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.name, '仙子伊布');
    assert.equal(r.j.no, 700);
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='eevee'").get();
    assert.equal(inst.branch, 'sylveon');
    const dex = raw.prepare("SELECT 1 v FROM pokedex WHERE child_id=1 AND entry_key='form:eevee:branch:sylveon'").get();
    assert.ok(dex);
  });
  test('收藏用石进化：尼多力诺 33＋月之石 → 尼多王 34，石头扣 1（2026-11-07 正式站事故：applyCollectionEvo 曾查不存在的 inventory 表）', async () => {
    await toProd();
    const cookie = await parentCookie();
    giveItem(1, 'stone:moon', 1);
    raw.prepare("INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, created_epoch, updated_epoch) VALUES(1,'species:33',33,1,'egg',0,0)").run();
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'species:33' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.equal(r.j.name, '尼多王');
    assert.equal(r.j.no, 34);
    assert.equal(invQty(1, 'stone:moon'), 0, '月之石应扣 1');
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='species:33'").get();
    assert.equal(inst.species_no, 34);
    const acq = raw.prepare('SELECT source FROM species_acquisitions WHERE child_id=1 AND species_no=34').get();
    assert.equal(acq.source, 'evolve');
  });
  test('收藏用石进化：尼多力诺 33 没月之石 → 400 没有月之石啦，实例仍是 33', async () => {
    await toProd();
    const cookie = await parentCookie();
    raw.prepare("INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, created_epoch, updated_epoch) VALUES(1,'species:33',33,1,'egg',0,0)").run();
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'species:33' } });
    assert.equal(r.status, 400);
    assert.match(r.j.error, /月之石/);
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='species:33'").get();
    assert.equal(inst.species_no, 33);
    assert.equal(invQty(1, 'stone:moon'), 0);
  });
  test('收藏等级进化：波波 18 级 → 比比鸟；17 级 → 不行', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLevel(1, 18);
    raw.prepare("INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, created_epoch, updated_epoch) VALUES(1,'species:16',16,0,'egg',0,0)").run();
    raw.prepare("INSERT INTO pokedex(child_id, entry_key, unlocked_at) VALUES(1,'egg:16',?)").run(todayStr());
    const r = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:16' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.name, '比比鸟');
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='species:16'").get();
    assert.equal(inst.species_no, 17);
    // 17 级重来一次：降级后进化应被拒绝
    setLevel(1, 17);
    raw.prepare("UPDATE pet_instances SET species_no=16 WHERE child_id=1 AND line_key='species:16'").run();
    const r2 = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:16' } });
    assert.equal(r2.status, 400);
  });
});

/* ---------- handler：分支进化（飞天螳螂 123→212/900，2026-11-08） ---------- */
describe('branch evo (scyther)', () => {
  function scytherInst() {
    raw.prepare("INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, created_epoch, updated_epoch) VALUES(1,'species:123',123,0,'egg',0,0)").run();
  }
  test('黑奇石分支：species:123＋to:900 → 劈斧螳螂，黑奇石扣 1、金属膜不动', async () => {
    await toProd();
    const cookie = await parentCookie();
    giveItem(1, 'item:black-augurite', 1);
    giveItem(1, 'item:metal-coat', 1);
    scytherInst();
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'species:123', to: 900 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.equal(r.j.name, '劈斧螳螂');
    assert.equal(r.j.no, 900);
    assert.equal(invQty(1, 'item:black-augurite'), 0, '黑奇石应扣 1');
    assert.equal(invQty(1, 'item:metal-coat'), 1, '金属膜不应扣');
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='species:123'").get();
    assert.equal(inst.species_no, 900);
    const acq = raw.prepare('SELECT source FROM species_acquisitions WHERE child_id=1 AND species_no=900').get();
    assert.equal(acq.source, 'evolve');
  });
  test('金属膜分支：species:123＋to:212 → 巨钳螳螂，金属膜扣 1、黑奇石不动', async () => {
    await toProd();
    const cookie = await parentCookie();
    giveItem(1, 'item:black-augurite', 1);
    giveItem(1, 'item:metal-coat', 1);
    scytherInst();
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'species:123', to: 212 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.name, '巨钳螳螂');
    assert.equal(r.j.no, 212);
    assert.equal(invQty(1, 'item:metal-coat'), 0, '金属膜应扣 1');
    assert.equal(invQty(1, 'item:black-augurite'), 1, '黑奇石不应扣');
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='species:123'").get();
    assert.equal(inst.species_no, 212);
  });
  test('不传 to 保持旧行为：只有黑奇石时默认走第一分支 → 400 没有金属膜啦，实例仍是 123', async () => {
    await toProd();
    const cookie = await parentCookie();
    giveItem(1, 'item:black-augurite', 1);
    scytherInst();
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'species:123' } });
    assert.equal(r.status, 400);
    assert.match(r.j.error, /金属膜/);
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='species:123'").get();
    assert.equal(inst.species_no, 123);
    assert.equal(invQty(1, 'item:black-augurite'), 1, '失败时黑奇石不扣');
  });
  test('to 指向不存在的分支 → 400 没有这个进化分支', async () => {
    await toProd();
    const cookie = await parentCookie();
    giveItem(1, 'item:black-augurite', 1);
    scytherInst();
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'species:123', to: 999 } });
    assert.equal(r.status, 400);
    assert.match(r.j.error, /没有这个进化分支/);
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='species:123'").get();
    assert.equal(inst.species_no, 123);
  });
  test('重复进化奖励按分支判定：已拥有 900 时 to:900 改奖转盘（不耗石）；to:212 仍可进化', async () => {
    await toProd();
    const cookie = await parentCookie();
    giveItem(1, 'item:black-augurite', 1);
    giveItem(1, 'item:metal-coat', 1);
    scytherInst();
    raw.prepare("INSERT INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(1,900,'evolve',0)").run();
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'species:123', to: 900 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.reward, 'wheel');
    assert.equal(r.j.no, 900);
    assert.equal(invQty(1, 'item:black-augurite'), 1, '改奖转盘时不耗石');
    const inst = raw.prepare("SELECT * FROM pet_instances WHERE child_id=1 AND line_key='species:123'").get();
    assert.equal(inst.species_no, 123, '改奖时实例不变');
    const r2 = await call('/api/evo/use-stone', { method: 'POST', cookie, body: { childId: 1, target: 'species:123', to: 212 } });
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.equal(r2.j.no, 212);
    assert.equal(invQty(1, 'item:metal-coat'), 0);
  });
  test('重复进化奖励走 evolve 入口：已拥有 900 且有黑奇石时 to:900 领转盘次数', async () => {
    await toProd();
    const cookie = await parentCookie();
    giveItem(1, 'item:black-augurite', 1);
    scytherInst();
    raw.prepare("INSERT INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(1,900,'evolve',0)").run();
    const r = await call('/api/evo/evolve', { method: 'POST', cookie, body: { childId: 1, target: 'species:123', to: 900 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.reward, 'wheel');
    assert.equal(r.j.no, 900);
    assert.equal(invQty(1, 'item:black-augurite'), 1, '改奖转盘时不耗石');
  });
  test('选项纯函数：两件都有→两条都就绪；两件都没有→两条都出、都未就绪', () => {
    const child = { total_xp: M.xpForLevel(10), fairy_moves: '[]' };
    const inst = { line_key: 'species:123', form_idx: 0, species_no: 123, branch: null };
    const both = M.evoOptionsFor(child, inst, { 'item:metal-coat': 1, 'item:black-augurite': 1 }, 10);
    assert.equal(both.length, 2);
    assert.ok(both.every((o) => o.ready));
    assert.deepEqual(both.map((o) => o.no), [212, 900]);
    const none = M.evoOptionsFor(child, inst, {}, 10);
    assert.equal(none.length, 2);
    assert.ok(none.every((o) => !o.ready));
    assert.ok(none.find((o) => o.no === 900).missing.join('').includes('黑奇石'));
  });
});

/* ---------- handler：蛋去重与孵化 ---------- */
describe('egg dedup / hatch', () => {
  test('grantEgg 去重：已有妙蛙种子不再发蛋；伊布可重复', async () => {
    await toProd();
    const today = todayStr();
    const g1 = await M.grantEgg(env.DB, 1, 1, 'school-test', 1, today);
    assert.equal(g1.granted, true);
    const g2 = await M.grantEgg(env.DB, 1, 1, 'school-test', 2, today);
    assert.equal(g2.granted, false);
    assert.equal(g2.reason, 'ALREADY_OWNED');
    const e1 = await M.grantEgg(env.DB, 1, 133, 'school-test', 3, today);
    const e2 = await M.grantEgg(env.DB, 1, 133, 'school-test', 4, today);
    assert.equal(e1.granted, true);
    assert.equal(e2.granted, true, '伊布蛋可重复获得');
  });
  test('学校成绩自动补发：补发一次普通随机；同记录再发 409；另一条记录也可补发（规则变更：手动选蛋已取消）', async () => {
    await toProd();
    const cookie = await parentCookie();
    const today = todayStr();
    const ins1 = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, status, reward_granted, created_epoch, date_shanghai) VALUES(1,'数学','第3单元 加与减',96,100,96,?,'active',0,0,?)").run(today, today);
    const rec1 = Number(ins1.lastInsertRowid);
    const r1 = await withRandom(0.1, () => call('/api/parent/school-test/grant', { method: 'POST', cookie, body: { recordId: rec1 } }));
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.granted.kind, 'ball');
    assert.equal(raw.prepare('SELECT reward_granted FROM school_test_records WHERE id=?').get(rec1).reward_granted, 1);
    const r2 = await call('/api/parent/school-test/grant', { method: 'POST', cookie, body: { recordId: rec1 } });
    assert.equal(r2.status, 409);
    const ins2 = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, status, reward_granted, created_epoch, date_shanghai) VALUES(1,'语文','第1单元',95,100,95,?,'active',0,0,?)").run(today, today);
    const rec2 = Number(ins2.lastInsertRowid);
    const r3 = await withRandom(0.5, () => call('/api/parent/school-test/grant', { method: 'POST', cookie, body: { recordId: rec2 } }));
    assert.equal(r3.status, 200, JSON.stringify(r3.j));
    assert.equal(r3.j.granted.kind, 'xp');
  });
  test('学校成绩自动发：85 分以下不发；≥85 自动随机（规则变更：手动选石已取消）', async () => {
    const cookie = await parentCookie();
    const today = todayStr();
    const ins1 = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, status, reward_granted, created_epoch, date_shanghai) VALUES(1,'数学','第1单元',80,100,80,?,'active',0,0,?)").run(today, today);
    const r1 = await call('/api/parent/school-test/grant', { method: 'POST', cookie, body: { recordId: Number(ins1.lastInsertRowid) } });
    assert.equal(r1.status, 400);
    const ins2 = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, status, reward_granted, created_epoch, date_shanghai) VALUES(1,'数学','第2单元',90,100,90,?,'active',0,0,?)").run(today, today);
    const r2 = await withRandom(0.1, () => call('/api/parent/school-test/grant', { method: 'POST', cookie, body: { recordId: Number(ins2.lastInsertRowid) } }));
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.equal(r2.j.granted.kind, 'ball');
    assert.equal(raw.prepare('SELECT reward_granted FROM school_test_records WHERE id=?').get(Number(ins2.lastInsertRowid)).reward_granted, 1);
  });
});

/* ---------- handler：转盘 ---------- */
describe('wheel', () => {
  test('有机会能转、转后机会耗尽；再转 400', async () => {
    const cookie = await parentCookie();
    const today = todayStr();
    const ins = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, status, reward_granted, created_epoch, date_shanghai) VALUES(1,'数学','第3单元',96,100,96,?,'active',0,0,?)").run(today, today);
    raw.prepare('INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(1,?,?,0,?)').run(Number(ins.lastInsertRowid), M.weekStartMon(today), today);
    const r1 = await withRandom(0.1, () => call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.prize.kind, 'stone');
    assert.equal(r1.j.prize.name, '日之石');
    assert.equal(r1.j.chancesLeft, 0);
    assert.equal(invQty(1, 'stone:sun'), 1);
    const r2 = await call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(r2.status, 400);
  });
  test('转盘蛋奖：主宠蛋只剩伊布时转到伊布蛋', async () => {
    const cookie = await parentCookie();
    const today = todayStr();
    // 先把其余 4 只主宠蛋种占掉（图鉴已有）
    for (const no of [1, 4, 7, 25]) {
      raw.prepare('INSERT INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(1,?,?,0)').run(no, 'egg');
    }
    const ins = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, status, reward_granted, created_epoch, date_shanghai) VALUES(1,'数学','第3单元',96,100,96,?,'active',0,0,?)").run(today, today);
    raw.prepare('INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(1,?,?,0,?)').run(Number(ins.lastInsertRowid), M.weekStartMon(today), today);
    // 新池合计 147，蛋段为 85~100/147：第一次 rng 0.6 落蛋段，第二次 rng 决定蛋档内选取；
    // 测试模式下 DEBUG_GATES_OPEN 使 owned 为空、蛋档 5 只全在，第二次 rng 0.9 取下标 4（伊布）
    const r = await withRandomSeq([0.6, 0.9], () => call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.kind, 'egg');
    assert.equal(r.j.prize.species, 133);
    const egg = raw.prepare('SELECT species_no FROM reward_eggs WHERE child_id=1 AND source=?').get('wheel');
    assert.equal(egg.species_no, 133);
  });
});

/* ---------- handler：单元测试 ---------- */
function seedMathQuestions() {
  // 章节名须与 MATH_CHAPTERS[3] 逐字一致（'第3单元'无空格）；进度门设到第 3 单元，门内题目才放行
  const chapter = '三年级上册 第3单元 加与减';
  raw.prepare("INSERT INTO settings(key, value) VALUES('math_progress_1', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(chapter);
  for (let i = 0; i < 6; i++) {
    const correct = 120 + i * 10;
    raw.prepare("INSERT INTO quiz_questions(kind, grade, subject, chapter, topic_id, question, options_json, answer_idx, active) VALUES('study',3,'数学',?,'cnm_p071',?, ?,0,1)")
      .run(chapter, `${100 + i * 10} + 20 = ?`, JSON.stringify([String(correct), '999', '888', '777']));
  }
  return chapter;
}
describe('unit test', () => {
  test('开启：选题 6 道；24h 内同单元重开 400（冷却）', async () => {
    await toProd();
    const cookie = await parentCookie();
    const chapter = seedMathQuestions();
    const r1 = await call('/api/parent/unit-test/start', { method: 'POST', cookie, body: { childId: 1, subject: '数学', unit: chapter } });
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.test.questionCount, 6);
    assert.equal(r1.j.test.questions.length, 6);
    assert.ok(!('answer_idx' in r1.j.test.questions[0]), '题目不含答案');
    const r2 = await call('/api/parent/unit-test/start', { method: 'POST', cookie, body: { childId: 1, subject: '数学', unit: chapter } });
    assert.equal(r2.status, 400);
  });
  test('提交：全错 0 分不抽奖；全对 100 分中奖（随机数固定 0 → 石）', async () => {
    const cookie = await parentCookie();
    const chapter = seedMathQuestions();
    const r1 = await call('/api/parent/unit-test/start', { method: 'POST', cookie, body: { childId: 1, subject: '数学', unit: chapter } });
    const testId = r1.j.test.id;
    const qs = r1.j.test.questions;
    const wrong = await call('/api/child/unit-test/submit', { method: 'POST', cookie, body: { childId: 1, testId, answers: qs.map((q) => ({ questionId: q.id, answerIdx: 1 })) } });
    assert.equal(wrong.status, 200, JSON.stringify(wrong.j));
    assert.equal(wrong.j.score, 0);
    assert.equal(wrong.j.won, false);
    // 再开一场（换单元避冷却），全对
    const chapter2 = '三年级上册 第2单元 观察物体';
    for (let i = 0; i < 6; i++) {
      const correct = 23 + i;
      raw.prepare("INSERT INTO quiz_questions(kind, grade, subject, chapter, topic_id, question, options_json, answer_idx, active) VALUES('study',3,'数学',?,'cnm_p010',?, ?,0,1)")
        .run(chapter2, `${20 + i} + 3 = ?`, JSON.stringify([String(correct), '999', '888', '777']));
    }
    const r2 = await call('/api/parent/unit-test/start', { method: 'POST', cookie, body: { childId: 1, subject: '数学', unit: chapter2 } });
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    const win = await withRandom(0.0, () => call('/api/child/unit-test/submit', { method: 'POST', cookie, body: { childId: 1, testId: r2.j.test.id, answers: r2.j.test.questions.map((q) => ({ questionId: q.id, answerIdx: 0 })) } }));
    assert.equal(win.status, 200, JSON.stringify(win.j));
    assert.equal(win.j.score, 100);
    assert.equal(win.j.won, true);
    assert.equal(win.j.prize.kind, 'stone');
    assert.equal(win.j.prize.key, 'stone:thunder');
    assert.equal(invQty(1, 'stone:thunder'), 1);
    // 重复提交同一场 400
    const dup = await call('/api/child/unit-test/submit', { method: 'POST', cookie, body: { childId: 1, testId: r2.j.test.id, answers: [] } });
    assert.equal(dup.status, 400);
  });
  test('周限额：本周配额已满 3 次，再开 400', async () => {
    await toProd();
    const cookie = await parentCookie();
    const chapter = seedMathQuestions();
    raw.prepare('INSERT INTO draw_week_quotas(child_id, week_start, count) VALUES(1,?,3)').run(M.weekStartMon(todayStr()));
    const r = await call('/api/parent/unit-test/start', { method: 'POST', cookie, body: { childId: 1, subject: '数学', unit: chapter } });
    assert.equal(r.status, 400);
  });
});

/* ---------- 道馆用药（引擎层） ---------- */
describe('gym items', () => {
  function gymState(hpRatio = 0.5, benchFainted = false) {
    const main = M.makePet({ key: 'main', name: '主宠', type: '电', level: 8, moves: [{ name: '主招', type: '电', power: 40 }] });
    const bench = M.makePet({ key: 'dex:bench', name: '副宠', type: '火', level: 8, moves: [{ name: '副招', type: '火', power: 40 }] });
    const boss = M.makePet({ key: 'boss', name: '馆主', type: '水', level: 12, hpMult: 1, moves: [{ name: '馆主招', type: '水', power: 1 }] });
    const st = M.createBattleState({
      mode: 'gym', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '玩家', battleLevel: 8, activeIdx: 0, pets: [main, bench] },
        B: { childId: null, childName: '馆主', battleLevel: 12, activeIdx: 0, pets: [boss] },
      },
    });
    main.hp = Math.floor(main.maxHp * hpRatio);
    if (benchFainted) bench.hp = 0;
    return st;
  }
  test('回血：伤药回 25% 上限血量；本场上限 2 次，第 3 次 ITEM_CAP_REACHED', () => {
    const st = gymState(0.5);
    const maxHp = st.sides.A.pets[0].maxHp;
    const r1 = M.resolveGymRound(st, { itemKey: 'medicine:potion' }, () => 0.5);
    assert.equal(r1.error, undefined, JSON.stringify(r1));
    assert.equal(r1.itemUsed.itemKey, 'medicine:potion');
    assert.equal(r1.itemUsed.amount, Math.floor(maxHp * 0.25));
    const r2 = M.resolveGymRound(st, { itemKey: 'medicine:potion' }, () => 0.5);
    assert.equal(r2.error, undefined);
    const r3 = M.resolveGymRound(st, { itemKey: 'medicine:potion' }, () => 0.5);
    assert.equal(r3.error, 'ITEM_CAP_REACHED');
  });
  test('满血禁回血药：ITEM_NO_NEED', () => {
    const st = gymState(1.0);
    const r = M.resolveGymRound(st, { itemKey: 'medicine:potion' }, () => 0.5);
    assert.equal(r.error, 'ITEM_NO_NEED');
  });
  test('复活：昏厥备战宠复活至 50%', () => {
    const st = gymState(0.5, true);
    const bench = st.sides.A.pets[1];
    const r = M.resolveGymRound(st, { itemKey: 'medicine:revive', targetIdx: 1 }, () => 0.5);
    assert.equal(r.error, undefined, JSON.stringify(r));
    assert.equal(r.itemUsed.amount, Math.floor(bench.maxHp * 0.5));
    assert.ok(bench.hp > 0);
  });
  test('复活目标校验：复活活宠／上场宠 → ITEM_TARGET_INVALID', () => {
    const st = gymState(0.5, false); // 副宠活着
    assert.equal(M.resolveGymRound(st, { itemKey: 'medicine:revive', targetIdx: 1 }, () => 0.5).error, 'ITEM_TARGET_INVALID');
    assert.equal(M.resolveGymRound(st, { itemKey: 'medicine:revive', targetIdx: 0 }, () => 0.5).error, 'ITEM_TARGET_INVALID');
  });
  test('不可用的道具 key → ITEM_NOT_USABLE', () => {
    const st = gymState(0.5);
    const r = M.resolveGymRound(st, { itemKey: 'stone:fire' }, () => 0.5);
    assert.equal(r.error, 'ITEM_NOT_USABLE');
  });
});

/* ---------- 球溢出兑换 ---------- */
describe('ball overflow', () => {
  test('满 99 触发一次：普通球 99 → 94，超级球 9 → 10（未满 99 不继续兑）', async () => {
    raw.prepare('UPDATE children SET balls=99, balls_super=9, balls_hyper=0, balls_master=0 WHERE id=1').run();
    const r = await M.settleBallOverflow(env.DB, 1, todayStr());
    assert.equal(r.exchanged.length, 1);
    assert.deepEqual(r.exchanged[0], { from: 'balls', to: 'balls_super', rate: 5 });
    const c = raw.prepare('SELECT balls, balls_super, balls_hyper, balls_master FROM children WHERE id=1').get();
    assert.equal(c.balls, 94);
    assert.equal(c.balls_super, 10);
    assert.equal(c.balls_hyper, 0);
    assert.equal(c.balls_master, 0);
  });
  test('级联：超级球满 99 → 兑 10 换 1 高级；高级球随之满 99 → 再兑 20 换 1 大师', async () => {
    raw.prepare('UPDATE children SET balls=99, balls_super=99, balls_hyper=98, balls_master=0 WHERE id=1').run();
    const r = await M.settleBallOverflow(env.DB, 1, todayStr());
    assert.equal(r.exchanged.length, 2);
    const c = raw.prepare('SELECT balls, balls_super, balls_hyper, balls_master FROM children WHERE id=1').get();
    assert.equal(c.balls, 99); // 超级球已满，普通球不兑
    assert.equal(c.balls_super, 89);
    assert.equal(c.balls_hyper, 79);
    assert.equal(c.balls_master, 1);
  });
  test('未满 99 不兑换', async () => {
    raw.prepare('UPDATE children SET balls=50, balls_super=5 WHERE id=1').run();
    const r = await M.settleBallOverflow(env.DB, 1, todayStr());
    assert.equal(r.exchanged.length, 0);
    const c = raw.prepare('SELECT balls, balls_super FROM children WHERE id=1').get();
    assert.equal(c.balls, 50);
    assert.equal(c.balls_super, 5);
  });
  test('目标已满 99 时停兑（不超发）', async () => {
    raw.prepare('UPDATE children SET balls=99, balls_super=99, balls_hyper=99, balls_master=99 WHERE id=1').run();
    const r = await M.settleBallOverflow(env.DB, 1, todayStr());
    assert.equal(r.exchanged.length, 0);
    const c = raw.prepare('SELECT balls, balls_super, balls_hyper, balls_master FROM children WHERE id=1').get();
    assert.equal(c.balls, 99);
    assert.equal(c.balls_super, 99);
    assert.equal(c.balls_hyper, 99);
    assert.equal(c.balls_master, 99);
  });
});

/* ---------- 背包端点 ---------- */
describe('evo backpack', () => {
  test('背包返回四种球数、库存、蛋与实例进化选项', async () => {
    const cookie = await parentCookie();
    setLine(1, 'pikachu');
    setLevel(1, 16);
    giveItem(1, 'stone:thunder', 1);
    raw.prepare('UPDATE children SET balls=2, balls_super=1, balls_hyper=0, balls_master=0 WHERE id=1').run();
    const r = await call('/api/evo/backpack?childId=1', { cookie });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.balls.normal, 2);
    assert.equal(r.j.balls.super, 1);
    assert.equal(r.j.inventory.find((i) => i.key === 'stone:thunder').qty, 1);
    const main = r.j.instances.find((i) => i.lineKey === 'pikachu');
    assert.ok(main);
    const opt = main.evoOptions.find((o) => o.kind === 'main-final');
    assert.equal(opt.ready, true);
    assert.equal(opt.no, 26);
  });
});

/* ---------- handler：孩子上报学校成绩（2026-10-27） ---------- */
async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  return r.cookie;
}
async function setupChildPasswords(pCookie) {
  const r = await call('/api/parent/settings/update', { method: 'POST', cookie: pCookie, body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] } });
  assert.equal(r.j.ok, true, JSON.stringify(r.j));
}
function insertPendingSchoolTest(childId, subject, unit, score, fullScore, photoKey) {
  const today = todayStr();
  const now = Math.floor(Date.now() / 1000);
  const pct = Math.round((score / fullScore) * 1000) / 10;
  const ins = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, photo_key, photo_expires_epoch, reward_granted, status, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?,?,?,0,'pending',?,?)")
    .run(childId, subject, unit, score, fullScore, pct, today, photoKey, photoKey ? now + 15 * 86400 : null, now, today);
  return Number(ins.lastInsertRowid);
}

describe('child school test submit / review', () => {
  test('孩子上报 96 分：只写 pending，不记转盘机会；家长待审核列表能看到', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    const cc = await childCookie(1, '0000');
    const today = todayStr();
    const r = await call('/api/child/school-test/submit', { method: 'POST', cookie: cc, body: { childId: 1, subject: '数学', unit: '期中考试', score: 96, fullScore: 100, examDate: today } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.record.status, 'pending');
    assert.equal(r.j.record.pct, 96);
    const row = raw.prepare('SELECT status FROM school_test_records WHERE id=?').get(r.j.record.id);
    assert.equal(row.status, 'pending');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM wheel_chances').get().n, 0);
    const pend = await call('/api/parent/pending', { cookie: pc });
    assert.equal(pend.status, 200, JSON.stringify(pend.j));
    assert.equal(pend.j.schoolTests.length, 1);
    assert.equal(pend.j.schoolTests[0].subject, '数学');
    assert.equal(pend.j.schoolTests[0].hasPhoto, false);
  });

  test('孩子不能替兄弟上报：FORBIDDEN', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    const cc = await childCookie(1, '0000');
    const r = await call('/api/child/school-test/submit', { method: 'POST', cookie: cc, body: { childId: 2, subject: '数学', unit: '期中考试', score: 96, fullScore: 100, examDate: todayStr() } });
    assert.equal(r.status, 403);
  });

  test('家长通过 96 分＋照片：激活＋转盘机会 1 次；重复审核 400', async () => {
    const pc = await parentCookie();
    const rec = insertPendingSchoolTest(1, '数学', '期中考试', 96, 100, 'school/1/1.jpg');
    const r = await call('/api/parent/school-test/review', { method: 'POST', cookie: pc, body: { recordId: rec, decision: 'approve' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.approved, true);
    assert.equal(r.j.wheelChance, true);
    assert.equal(raw.prepare("SELECT status FROM school_test_records WHERE id=?").get(rec).status, 'active');
    const ch = raw.prepare('SELECT * FROM wheel_chances WHERE school_test_id=?').get(rec);
    assert.ok(ch);
    const r2 = await call('/api/parent/school-test/review', { method: 'POST', cookie: pc, body: { recordId: rec, decision: 'approve' } });
    assert.equal(r2.status, 400);
    assert.match(r2.j.error, /已经审核过了/);
  });

  test('同科目同周第二条通过：科目名额已占，不再记转盘机会', async () => {
    await toProd();
    const pc = await parentCookie();
    const rec1 = insertPendingSchoolTest(1, '数学', '期中考试', 96, 100, 'school/1/1.jpg');
    const rec2 = insertPendingSchoolTest(1, '数学', '单元测验', 97, 100, 'school/1/2.jpg');
    const a = await call('/api/parent/school-test/review', { method: 'POST', cookie: pc, body: { recordId: rec1, decision: 'approve' } });
    assert.equal(a.j.wheelChance, true);
    const b = await call('/api/parent/school-test/review', { method: 'POST', cookie: pc, body: { recordId: rec2, decision: 'approve' } });
    assert.equal(b.status, 200, JSON.stringify(b.j));
    assert.equal(b.j.wheelChance, false);
    assert.match(b.j.wheelReason, /这门科目本周已经有过一次高级转盘机会啦/);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM wheel_chances').get().n, 1);
  });

  test('家长通过 80 分：激活但无转盘机会；发奖 400（<85）', async () => {
    const pc = await parentCookie();
    const rec = insertPendingSchoolTest(1, '数学', '期中考试', 80, 100, null);
    const r = await call('/api/parent/school-test/review', { method: 'POST', cookie: pc, body: { recordId: rec, decision: 'approve' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.wheelChance, false);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM wheel_chances').get().n, 0);
    const g = await call('/api/parent/school-test/grant', { method: 'POST', cookie: pc, body: { recordId: rec, itemKey: 'stone:fire' } });
    assert.equal(g.status, 400);
    assert.match(g.j.error, /85 分以上/);
  });

  test('家长驳回：状态 rejected；再通过／发奖都 400；无转盘机会', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    const cc = await childCookie(1, '0000');
    const s = await call('/api/child/school-test/submit', { method: 'POST', cookie: cc, body: { childId: 1, subject: '语文', unit: '期中考试', score: 96, fullScore: 100, examDate: todayStr() } });
    const rec = s.j.record.id;
    const r = await call('/api/parent/school-test/review', { method: 'POST', cookie: pc, body: { recordId: rec, decision: 'reject' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.rejected, true);
    assert.equal(raw.prepare("SELECT status FROM school_test_records WHERE id=?").get(rec).status, 'rejected');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM wheel_chances').get().n, 0);
    const a = await call('/api/parent/school-test/review', { method: 'POST', cookie: pc, body: { recordId: rec, decision: 'approve' } });
    assert.equal(a.status, 400);
    const g = await call('/api/parent/school-test/grant', { method: 'POST', cookie: pc, body: { recordId: rec, itemKey: 'stone:fire' } });
    assert.equal(g.status, 400);
    assert.match(g.j.error, /已被驳回/);
  });

  test('孩子查自己的上报记录：状态可见；兄弟的看不到', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    const cc1 = await childCookie(1, '0000');
    const cc2 = await childCookie(2, '0000');
    await call('/api/child/school-test/submit', { method: 'POST', cookie: cc1, body: { childId: 1, subject: '英语', unit: '期中考试', score: 88, fullScore: 100, examDate: todayStr() } });
    const mine = await call('/api/child/school-tests?childId=1', { cookie: cc1 });
    assert.equal(mine.status, 200, JSON.stringify(mine.j));
    assert.equal(mine.j.records.length, 1);
    assert.equal(mine.j.records[0].status, 'pending');
    const other = await call('/api/child/school-tests?childId=2', { cookie: cc2 });
    assert.equal(other.j.records.length, 0);
    const forbidden = await call('/api/child/school-tests?childId=1', { cookie: cc2 });
    assert.equal(forbidden.status, 403);
  });

  test('家长直登保存回归：96 分无照片不记转盘机会（重构未改行为）', async () => {
    await toProd();
    const pc = await parentCookie();
    const r = await call('/api/parent/school-test/save', { method: 'POST', cookie: pc, body: { childId: 1, subject: '数学', unit: '期中考试', score: 96, fullScore: 100, examDate: todayStr() } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.wheelChance, false);
    assert.match(r.j.wheelReason, /上传试卷照片后可获得 1 次高级转盘机会/);
    assert.equal(raw.prepare("SELECT status FROM school_test_records WHERE id=?").get(r.j.record.id).status, 'active');
  });
});
