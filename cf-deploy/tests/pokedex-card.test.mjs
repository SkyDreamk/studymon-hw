import { assetPath, assetHash } from './asset-path.mjs';
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const H = assetHash();

const M = await import(new URL('../src/index.js', import.meta.url));
const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql',
  '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql',
  '0010_pvp_rematch.sql', '0019_evo_items.sql', '0023_care_qa_and_friendship.sql',
];
let raw, env;
function makeEnv() {
  raw = new DatabaseSync(':memory:');
  for (const name of MIGRATIONS) raw.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  raw.exec("UPDATE children SET name='测试伙伴'");
  const db = {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() { return raw.prepare(sql).get(...args) || null; },
        async all() { return { results: raw.prepare(sql).all(...args) }; },
        async run() { const r = raw.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
      };
    },
    async batch(stmts) { return Promise.all(stmts.map((s) => s.run())); },
  };
  return { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } };
}
async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await M.default.fetch(new Request('https://test.local' + path, {
    method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
  }), env);
  return { status: res.status, j: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0], res };
}
async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}
async function pokedex(childId, cookie) {
  const r = await call('/api/pokedex', { method: 'POST', body: { childId }, cookie });
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, true);
  return r.j;
}
function insertEntry(childId, key) {
  const columns = raw.prepare('PRAGMA table_info(pokedex)').all().filter((c) => c.name !== 'id');
  const names = columns.map((c) => `"${c.name}"`).join(', ');
  const values = columns.map((c) => c.name === 'entry_key' ? '?' : `"${c.name}"`).join(', ');
  const r = raw.prepare(`INSERT INTO pokedex (${names}) SELECT ${values} FROM pokedex WHERE child_id=? AND entry_key LIKE 'form:%' LIMIT 1`).run(key, childId);
  assert.equal(r.changes, 1);
}
/* 全面解锁（2026-10-28）：DEBUG_GATES_OPEN 改为 = isTestMode(env) 后，以下旧断言须在正式模式（无 TEST_MODE）下跑才仍成立；测试站放行行为改由 tests/test-mode-unlock.test.mjs 覆盖。 */
async function toProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(env.DB, env);
}

describe('pokedex cards', () => {
  beforeEach(() => { env = makeEnv(); });
  afterEach(() => raw.close());
  test('details are restricted to owned, non-egg entries', async () => {
    await toProd();
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    raw.exec('UPDATE children SET total_xp=40 WHERE id=1');
    for (const key of ['wild:54', 'gym:95', 'form:charmander:1', 'form:pikachu:1']) insertEntry(1, key);
    raw.exec("UPDATE pokedex SET unlocked_at='2026-01-02' WHERE child_id=1");
    const j = await pokedex(1, cookie);
    assert.equal(j.level, 2);
    assert.deepEqual(j.xp, { total: 40, intoLevel: 0, span: 80, toNext: 80 });
    const line = j.lineEntries.find((e) => e.current && e.no != null && e.unlocked);
    assert.equal(line.level, 2);
    assert.equal(line.type, '电');
    assert.ok(line.moves.some((m) => m.level === 2 && m.desc));
    const other = j.lineEntries.find((e) => e.key === 'form:charmander:1');
    assert.equal(other.type, '火');
    assert.equal(Object.hasOwn(other, 'level'), false);
    const egg = j.lineEntries.find((e) => e.current && e.no == null);
    for (const field of ['type', 'types', 'moves', 'abilities', 'stats', 'evo', 'level', 'obtainedAt']) assert.equal(Object.hasOwn(egg, field), false);
    const wild = j.wild.find((e) => e.no === 54);
    assert.equal(wild.type, '水');
    assert.equal(wild.obtainedAt, '2026-01-02');
    assert.ok(wild.moves.every((m) => m.name && m.power));
    const gym = j.others.find((e) => e.no === 95);
    assert.deepEqual(gym.moves[0], { name: '岩石猛击', type: '岩石', power: 28 });
    assert.equal(j.dex151[53].obtainedAt, wild.obtainedAt);
    assert.deepEqual(j.dex151[53].moves, wild.moves);
    const locked = j.dex151.find((e) => !e.unlocked);
    assert.deepEqual(locked, { no: locked.no, unlocked: false, name: null, img: `/static/img/p${locked.no}.${H}.webp` });
    for (const e of [...j.wild, ...j.others, ...j.eggSpecies, ...j.lineEntries].filter((e) => !e.unlocked)) {
      for (const field of ['type', 'types', 'moves', 'abilities', 'stats', 'evo', 'level', 'obtainedAt']) assert.equal(Object.hasOwn(e, field), false);
    }
  });
  test('enriched details: dual types, abilities, stats, App-rule evo chain', async () => {
    await toProd();
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    for (const key of ['wild:111', 'wild:43', 'form:eevee:1', 'rare:151', 'form:pikachu:1']) insertEntry(1, key);
    const j = await pokedex(1, cookie);
    const rhy = j.wild.find((e) => e.no === 111);
    assert.deepEqual(rhy.types, ['地面', '岩石']);
    assert.deepEqual(rhy.abilities, [
      { name: '避雷针', hidden: false, effect: '把单体电属性招式引到自己身上，吸收后特攻提升1级。' },
      { name: '坚硬脑袋', hidden: false, effect: '不受招式的反作用伤害。' },
      { name: '舍身', hidden: true, effect: '有反作用伤害的招式威力变为1.2倍。' },
    ]);
    assert.deepEqual(rhy.stats, { hp: 80, attack: 85, defense: 95, sp_attack: 30, sp_defense: 30, speed: 25, total: 345 });
    assert.deepEqual(rhy.evo, {
      chain: [
        { no: 111, name: '独角犀牛', cond: null },
        { no: 112, name: '铁甲暴龙', cond: '42级以上' },
        { no: 464, name: '钻角犀兽', cond: '使用护具连接交换' },
      ],
      branches: null,
    });
    const odd = j.wild.find((e) => e.no === 43);
    assert.deepEqual(odd.types, ['草', '毒']);
    assert.deepEqual(odd.evo, {
      chain: [
        { no: 43, name: '走路草', cond: null },
        { no: 44, name: '臭臭花', cond: '21级以上' },
        { no: 45, name: '霸王花', cond: '使用叶之石' },
      ],
      branches: null,
    });
    // 官方有美丽花分支，App 内无 #182、不展示
    assert.equal(JSON.stringify(odd.evo).includes('美丽花'), false);
    const eevee = j.lineEntries.find((e) => e.key === 'form:eevee:1');
    assert.deepEqual(eevee.types, ['普通']);
    assert.equal(eevee.evo.chain.length, 1);
    assert.equal(eevee.evo.chain[0].name, '伊布');
    // 未获得任何分支时，本体卡片不列分支路线（进化路线由孩子自己发现）；只列已获得分支的断言见 dex-eevee-hidden.test.mjs
    assert.equal(eevee.evo.branches, null);
    const mew = j.others.find((e) => e.no === 151);
    assert.deepEqual(mew.evo, { chain: [{ no: 151, name: '梦幻', cond: null }], branches: null });
    assert.deepEqual(mew.stats, { hp: 100, attack: 100, defense: 100, sp_attack: 100, sp_defense: 100, speed: 100, total: 600 });
    // 主宠线：官方 16/36 级终极改为 App 的 10 级中段、16 级＋石终极
    const pichu = j.lineEntries.find((e) => e.key === 'form:pikachu:1');
    assert.deepEqual(pichu.evo, {
      chain: [
        { no: 172, name: '皮丘', cond: null },
        { no: 25, name: '皮卡丘', cond: '10级以上' },
        { no: 26, name: '雷丘', cond: '16级＋雷之石' },
      ],
      branches: null,
    });
    // 飞天螳螂双分支（金属膜／黑奇石）
    const scy = M.dexEvoChain(123);
    assert.deepEqual(scy.chain, [{ no: 123, name: '飞天螳螂', cond: null }]);
    assert.deepEqual(scy.branches.map((b) => [b.name, b.cond]), [['巨钳螳螂', '使用金属膜连接交换'], ['劈斧螳螂', '使用黑奇石']]);
    assert.deepEqual(M.dexEvoChain(212).chain.map((s) => s.name), ['飞天螳螂', '巨钳螳螂']);
    // 隆隆岩：官方纯交换，App 以 10 级为门槛
    assert.equal(M.dexEvoChain(76).chain[2].cond, '连接交换（10级以上）');
  });
  test('friendship on the main line card (task 93)', async () => {
    await toProd();
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    // 主宠行友好度 120（只读 pet_instances，不建行；非主宠不带）
    // 注意：首次 pokedex() 已通过 unlockForms 建好主宠行，须用 upsert（INSERT OR IGNORE＋UPDATE），直接 INSERT 会撞 UNIQUE(child_id, line_key)
    raw.exec("INSERT OR IGNORE INTO pet_instances (child_id, line_key, species_no, form_idx, source, has_been_main, created_epoch, updated_epoch, friendship) VALUES (1, 'pikachu', 172, 0, 'main', 1, 0, 0, 120)");
    raw.exec("UPDATE pet_instances SET friendship=120 WHERE child_id=1 AND line_key='pikachu'");
    for (const key of ['wild:54', 'form:charmander:1', 'form:pikachu:1']) insertEntry(1, key);
    const j = await pokedex(1, cookie);
    const main = j.lineEntries.find((e) => e.current && e.no != null && e.unlocked);
    assert.equal(main.friendship, 120);
    const other = j.lineEntries.find((e) => e.key === 'form:charmander:1');
    assert.equal(Object.hasOwn(other, 'friendship'), false);
    const wild = j.wild.find((e) => e.no === 54);
    assert.equal(Object.hasOwn(wild, 'friendship'), false);
    // 主宠无 pet_instances 行时默认 0（仍带字段，前端显示 0/255）
    raw.exec("DELETE FROM pet_instances WHERE child_id=1 AND line_key='pikachu'");
    const j2 = await pokedex(1, cookie);
    const main2 = j2.lineEntries.find((e) => e.current && e.no != null && e.unlocked);
    assert.equal(main2.friendship, 0);
  });
});
test('frontend card guards and styling', () => {
  const app = readFileSync(assetPath('app.js'), 'utf8');
  const css = readFileSync(assetPath('style.css'), 'utf8');
  assert.match(app, /let dexData = null;/);
  assert.match(app, /e\.unlocked && e\.no != null \? ` onclick="openDexCard/);
  const card = app.slice(app.indexOf('function openDexCard('), app.indexOf('window.toggleDex151'));
  assert.match(card, /if \(!e\) return;/);
  // 2026-10-27 改动：伊布分支分区已撤，未获得条目一律不可点（分支不再例外）
  assert.match(card, /if \(!e\.unlocked\) return;/);
  assert.doesNotMatch(card, /form:eevee:branch:/);
  assert.match(card, /if \(e\.no == null\) return;/);
  // 释义开关（Slice E2）：仅允许只读语言标志 state.lang（与 tr() 内部读取的同一标志），其余 state 访问与 showModal 仍禁
  assert.doesNotMatch(card.replaceAll('state.lang', ''), /\bstate\b|showModal/);
  assert.match(card, /class="overlay" onclick="closeModal\(\)"/);
  assert.match(card, /event\.stopPropagation\(\)/);
  assert.match(card, /还没有学会招式/);
  assert.match(card, /TYPE_COLOR/);
  assert.match(card, /'电': \['#F8D030', '#333'\]/);
  assert.match(card, /'火': \['#F08030', '#fff'\]/);
  assert.match(card, /dex-card-no/);
  assert.match(card, /padStart\(3, '0'\)/);
  assert.ok(card.indexOf('dex-card-no') < card.indexOf('dex-card-image'));
  assert.ok(card.indexOf('dex-card-image') < card.indexOf('dex-card-name'));
  assert.ok(card.indexOf('dex-card-name') < card.indexOf('dex-card-badges'));
  assert.doesNotMatch(card, /<small>No\./);
  assert.match(css, /\.dex \.slot\.clickable\{cursor:pointer\}/);
  assert.match(css, /\.modal\.dex-card/);
  assert.match(css, /\.dex-card-image\{height:200px/);
  assert.match(css, /\.dex-card-no\{/);
  // 卡片补全（2026-10-26）：进化链＋特性＋种族值条＋技能介绍，两栏布局
  assert.match(card, /dex-card-badges/);
  assert.match(card, /dex-card-evo/);
  assert.match(card, /dex-card-ability/);
  assert.match(card, /dex-card-cols/);
  assert.match(card, /dex-stat-row/);
  assert.match(card, /进化链/);
  // 友好度行（任务 93）：仅主宠线（e.friendship 有值）显示，5 颗爱心＋X/255，放在经验行之后、获得途径之前
  assert.match(card, /friendshipHearts/);
  assert.match(card, /e\.friendship != null/);
  assert.match(card, /友好度/);
  assert.match(card, /\/255/);
  assert.ok(card.indexOf('e.friendship') < card.indexOf('获得途径'));
  assert.ok(card.indexOf('友好度') < card.indexOf('获得途径'));
  assert.match(card, /隐藏特性/);
  assert.match(card, /种族值/);
  assert.match(card, /技能介绍/);
  assert.match(card, /e\.types/);
  assert.match(card, /STAT_MAX/);
  assert.ok(card.indexOf('dex-card-badge') < card.indexOf('dex-card-evo'));
  assert.ok(card.indexOf('dex-card-evo') < card.indexOf('dex-card-ability'));
  assert.ok(card.indexOf('dex-card-ability') < card.indexOf('dex-card-cols'));
  assert.match(css, /\.modal\.dex-card\{[^}]*max-width:640px/);
  assert.match(css, /\.dex-card-cols\{/);
  assert.match(css, /@media \(min-width:600px\)\{\.dex-card-cols\{flex-direction:row\}\}/);
  assert.match(css, /\.dex-stat-bar i\{/);
  assert.match(css, /\.dex-card-evo-node\.cur\{/);
  assert.match(css, /\.dex-card-ability\.hidden \.dex-card-ability-title\{/);
});
