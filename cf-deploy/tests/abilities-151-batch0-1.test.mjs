/* 特性 151 Batch 0.1（进化重掷补丁）：node --test tests/abilities-151-batch0-1.test.mjs
 * 覆盖：abilityAfterEvolution 纯函数（R4 通用谓词：重掷／保持／NULL 不追溯／幂等）、数据不变量、
 * 进化执行函数（applyEeveeBranchEvo／applyCollectionEvo）的 DB 端到端（同条 UPDATE 原子写回）、守卫与旧数据不追溯。
 * 脚手架：M 来自 ../src/index.js；seeded LCG 与 abilities-151-batch0.test.mjs 同款（固定种子，结果确定）；
 * DB 与 HTTP 部分仿 evo-items.test.mjs（node:sqlite 内存库＋真实 fetch 驱动＋withRandom 注入 Math.random）。
 * applyEeveeBranchEvo／applyCollectionEvo 不在导出块里，故 DB 用例只走 /api/evo/use-stone、/api/evo/evolve。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const seeded = (s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;

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
    db,
    raw,
  };
}

/* ---------- 纯函数与数据不变量（P1–P8） ---------- */
describe('Batch 0.1 — abilityAfterEvolution 纯函数与数据不变量', () => {
  test('P1: egg 来源伊布（逃跑）→134 水伊布：按 K1 缺第二回落，约 90% 储水 / 10% 湿润之躯', () => {
    const inst = { source: 'egg', ability: '逃跑' };
    const rng = seeded(20261118);
    const counts = { 储水: 0, 湿润之躯: 0 };
    for (let i = 0; i < 2000; i++) {
      const ab = M.abilityAfterEvolution(inst, 134, rng);
      assert.ok(ab in counts, `unexpected ability ${ab}`);
      counts[ab]++;
    }
    assert.ok(counts.储水 >= 1700 && counts.储水 <= 1900, JSON.stringify(counts));
    assert.ok(counts.湿润之躯 >= 100 && counts.湿润之躯 <= 300, JSON.stringify(counts));
  });

  test('P2: main 来源 133→8 个伊布形态：恒为新形态首特性，与 rng 无关', () => {
    const first = { 134: '储水', 135: '蓄电', 136: '引火', 196: '同步', 197: '同步', 470: '叶子防守', 471: '雪隐', 700: '迷人之躯' };
    const inst = { source: 'main', ability: '逃跑' };
    for (const [no, ab] of Object.entries(first)) {
      assert.equal(M.abilityAfterEvolution(inst, Number(no), () => 0.01), ab, `no=${no}`);
      assert.equal(M.abilityAfterEvolution(inst, Number(no), () => 0.99), ab, `no=${no}`);
    }
  });

  test('P3: catch 来源 52→53（捡拾不在 53 名单）：柔软/技术高手 50/50，隐藏特性紧张感永不出现', () => {
    const inst = { source: 'catch', ability: '捡拾' };
    const rng = seeded(777);
    const counts = { 柔软: 0, 技术高手: 0 };
    for (let i = 0; i < 400; i++) {
      const ab = M.abilityAfterEvolution(inst, 53, rng);
      assert.notEqual(ab, '紧张感');
      assert.ok(ab in counts, `unexpected ability ${ab}`);
      counts[ab]++;
    }
    assert.ok(counts.柔软 >= 160 && counts.柔软 <= 240, JSON.stringify(counts));
    assert.ok(counts.技术高手 >= 160 && counts.技术高手 <= 240, JSON.stringify(counts));
  });

  test('P4: 旧特性仍在新名单（52→53 的技术高手／紧张感）：原样返回，零次 rng 调用', () => {
    let calls = 0;
    const rng = () => { calls++; return 0.5; };
    assert.equal(M.abilityAfterEvolution({ source: 'catch', ability: '技术高手' }, 53, rng), '技术高手');
    assert.equal(M.abilityAfterEvolution({ source: 'egg', ability: '紧张感' }, 53, rng), '紧张感');
    assert.equal(calls, 0);
  });

  test('P5: ability 为 null／缺失／空串（旧实例）：不追溯，原值返回且零次 rng 调用；inst 为 null 返回 null', () => {
    let calls = 0;
    const rng = () => { calls++; return 0.5; };
    assert.strictEqual(M.abilityAfterEvolution({ source: 'egg', ability: null }, 134, rng), null);
    assert.strictEqual(M.abilityAfterEvolution({ source: 'egg' }, 134, rng), null);
    assert.strictEqual(M.abilityAfterEvolution({ source: 'egg', ability: '' }, 134, rng), '');
    assert.strictEqual(M.abilityAfterEvolution(null, 134, rng), null);
    assert.equal(calls, 0);
  });

  test('P6: 幂等——对重掷结果以同一 newNo 再算一次原样不变，零次 rng 调用', () => {
    const first = M.abilityAfterEvolution({ source: 'egg', ability: '逃跑' }, 134, () => 0.95);
    assert.equal(first, '湿润之躯'); // 0.95 ≥ 0.90 → 隐藏档
    let calls = 0;
    const second = M.abilityAfterEvolution({ source: 'egg', ability: first }, 134, () => { calls++; return 0.1; });
    assert.equal(second, '湿润之躯');
    assert.equal(calls, 0);
  });

  test('P7: 隐藏特性不在新名单时也重掷（egg 来源 30 的活力→31：毒刺/斗争心/强行）；在名单内（毒刺）保持', () => {
    const valid31 = new Set(['毒刺', '斗争心', '强行']);
    const seen = new Set();
    const rng = seeded(2026);
    for (let i = 0; i < 400; i++) {
      const ab = M.abilityAfterEvolution({ source: 'egg', ability: '活力' }, 31, rng);
      assert.ok(valid31.has(ab), `unexpected ability ${ab}`);
      seen.add(ab);
    }
    assert.equal(seen.size, 3);
    let calls = 0;
    assert.equal(M.abilityAfterEvolution({ source: 'egg', ability: '毒刺' }, 31, () => { calls++; return 0.99; }), '毒刺');
    assert.equal(calls, 0);
  });

  test('P8: 数据不变量——主线 4 线名单一致；伊布 8 形态与 133 零重合且均无第二普通特性', () => {
    const namesOf = (no) => (M.DEX_DETAILS[no]?.abilities || []).map((a) => a.name);
    const sigOf = (no) => [...new Set(namesOf(no))].sort().join('|');
    for (const line of [[172, 25, 26], [4, 5, 6], [7, 8, 9], [1, 2, 3]]) {
      for (const no of line) assert.ok(namesOf(no).length > 0, `species ${no} 无特性数据`);
      for (const no of line.slice(1)) assert.equal(sigOf(no), sigOf(line[0]), `主线名单不一致：${line[0]} vs ${no}`);
    }
    const eevee = new Set(namesOf(133));
    assert.ok(eevee.size > 0);
    for (const no of [134, 135, 136, 196, 197, 470, 471, 700]) {
      const abs = M.DEX_DETAILS[no]?.abilities || [];
      assert.ok(abs.length > 0, `species ${no} 无特性数据`);
      for (const a of abs) assert.ok(!eevee.has(a.name), `species ${no} 与 133 重合于 ${a.name}`);
      assert.ok(abs.filter((a) => !a.hidden).length < 2, `species ${no} 有 ≥2 条普通特性`);
    }
  });
});

/* ---------- DB 端到端与守卫（P9–P12），仿 evo-items.test.mjs ---------- */
describe('Batch 0.1 — 进化执行函数 DB 端到端', () => {
  let env, db, raw;
  beforeEach(() => { ({ env, db, raw } = makeEnv()); });

  async function call(path, { method = 'POST', body, cookie } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers.Cookie = cookie;
    const res = await M.default.fetch(new Request('https://test.local' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }), env);
    const sc = res.headers.get('set-cookie');
    return { status: res.status, j: await res.json().catch(() => ({})), cookie: sc ? sc.split(';')[0] : cookie };
  }
  async function parentCookie() {
    const r = await call('/api/parent/login', { body: { pin: '0000' } });
    assert.equal(r.status, 200);
    return r.cookie;
  }
  async function toProd() { // 正式模式：门槛不放行，等级与道具都要真实满足
    env = { ...env };
    delete env.TEST_MODE;
    await M.applyDebugTime(env.DB, env);
  }
  async function withRandom(value, fn) {
    const orig = Math.random;
    Math.random = () => value;
    try { return await fn(); } finally { Math.random = orig; }
  }
  const giveItem = (key, qty = 1) => raw.prepare('INSERT INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(1,?,?,0) ON CONFLICT(child_id, item_key) DO UPDATE SET qty=qty+excluded.qty').run(key, qty);
  const setLevel = (level) => raw.prepare('UPDATE children SET total_xp=? WHERE id=1').run(M.xpForLevel(level));
  const instOf = (lineKey) => raw.prepare('SELECT * FROM pet_instances WHERE child_id=1 AND line_key=?').get(lineKey);
  const putInst = (lineKey, no, formIdx, source, ability) => raw.prepare('INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, ability, created_epoch, updated_epoch) VALUES(1,?,?,?,?,?,0,0)').run(lineKey, no, formIdx, source, ability);

  test('P9: 伊布用石（egg 来源、逃跑）→ 水伊布：同一行 branch／species_no／ability 原子写入，旧特性被重掷', async () => {
    await toProd();
    const cookie = await parentCookie();
    raw.prepare("UPDATE children SET line='eevee' WHERE id=1").run();
    setLevel(16);
    giveItem('stone:water', 1);
    putInst('eevee', 133, 0, 'egg', '逃跑');
    const r = await withRandom(0.95, () => call('/api/evo/use-stone', { cookie, body: { childId: 1, target: 'eevee', branch: 'vaporeon' } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    const inst = instOf('eevee');
    assert.equal(inst.branch, 'vaporeon');
    assert.equal(inst.species_no, 134);
    assert.equal(inst.form_idx, 1);
    assert.equal(inst.evolved_via, 'stone:water');
    assert.equal(inst.source, 'egg');
    assert.equal(inst.ability, '湿润之躯'); // egg K1：0.95 ≥ 0.90 → 隐藏档
  });

  test('P10: 仙子伊布（不用石、main 来源、逃跑）：ability=迷人之躯（首特性），source 不变', async () => {
    const cookie = await parentCookie();
    raw.prepare("UPDATE children SET line='eevee', fairy_moves=? WHERE id=1").run(JSON.stringify([{ name: '魅惑之声', level: 3 }]));
    setLevel(16);
    putInst('eevee', 133, 0, 'main', '逃跑');
    const r = await withRandom(0.2, () => call('/api/evo/evolve', { cookie, body: { childId: 1, target: 'eevee', branch: 'sylveon' } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    const inst = instOf('eevee');
    assert.equal(inst.branch, 'sylveon');
    assert.equal(inst.species_no, 700);
    assert.equal(inst.ability, '迷人之躯');
    assert.equal(inst.source, 'main');
  });

  test('P11: 收藏线——catch 实例 52 捡拾→53 柔软/技术高手；旧实例（NULL）10→11 仍为 NULL', async () => {
    await toProd();
    const cookie = await parentCookie();
    setLevel(30);
    putInst('species:52', 52, 0, 'catch', '捡拾');
    const r1 = await withRandom(0.8, () => call('/api/evo/evolve', { cookie, body: { childId: 1, target: 'species:52' } }));
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(instOf('species:52').species_no, 53);
    assert.equal(instOf('species:52').ability, '技术高手'); // catch 50/50：floor(0.8×2)=1 → regular[1]
    putInst('species:10', 10, 0, 'catch', null);
    const r2 = await withRandom(0.3, () => call('/api/evo/evolve', { cookie, body: { childId: 1, target: 'species:10' } }));
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.equal(instOf('species:10').species_no, 11);
    assert.strictEqual(instOf('species:10').ability, null);
  });

  test('P12: 补丁前已进化的旧行（135 雷伊布存逃跑）：instAbilityFor 守卫仍回落（返回 null），ensurePetInstance 不覆盖，行内 ability 不被改写', async () => {
    putInst('eevee', 135, 1, 'egg', '逃跑');
    raw.prepare("UPDATE pet_instances SET branch='jolteon' WHERE child_id=1 AND line_key='eevee'").run();
    const child = { id: 1 };
    await M.attachInstanceAbilities(db, child);
    assert.strictEqual(M.instAbilityFor(child, ['eevee'], 135), null); // 逃跑 ∉ 135 名单 → 回落蓄电
    const ensured = await M.ensurePetInstance(db, 1, 'eevee', M.shDateStr(), 'egg');
    assert.equal(ensured.ability, '逃跑');
    assert.equal(instOf('eevee').ability, '逃跑');
  });
});
