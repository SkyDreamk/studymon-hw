/* 珍稀精灵卡牌馆（任务 104）单测：node --test tests/card-hall.test.mjs
 * 覆盖：rareCardHallPool() 71 种口径（传说 4＋伊布 8＋终极 58＋梦幻 151）与排序；
 * POST /api/eggs 回包 cards 只含已拥有的奖池种（未拥有不出现、143 卡比兽等非奖池种不进馆），
 * eggs / rewardEggs 形态不变。夹具与调用方式复用 tests/wheel-upgrade.test.mjs 的 makeEnv/call。
 * 不部署、不碰 staging D1。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0023_care_qa_and_friendship.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0026_rare_wheel.sql'];

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
beforeEach(() => { ({ env, raw } = makeEnv()); });

function nowEpoch() { return Math.floor(Date.now() / 1000); }

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

function ownSpecies(childId, no) {
  raw.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)').run(childId, no, 'egg', nowEpoch());
}

describe('rareCardHallPool', () => {
  test('returns 71 species in exact group and numeric order', () => {
    const pool = M.rareCardHallPool();
    assert.equal(pool.length, 71);

    const byGroup = { mew: [], legendary: [], eevee: [], final: [] };
    for (const item of pool) {
      assert.ok(item.group in byGroup, `unexpected group: ${item.group}`);
      byGroup[item.group].push(item.no);
    }

    assert.deepEqual(byGroup.mew, [151]);
    assert.deepEqual(byGroup.legendary, [144, 145, 146, 150]);
    assert.deepEqual(byGroup.eevee, [134, 135, 136, 196, 197, 470, 471, 700]);
    assert.equal(byGroup.final.length, 58);

    const expectedOrder = [
      ...byGroup.mew,
      ...[...byGroup.legendary].sort((a, b) => a - b),
      ...[...byGroup.eevee].sort((a, b) => a - b),
      ...[...byGroup.final].sort((a, b) => a - b),
    ];
    assert.deepEqual(pool.map((p) => p.no), expectedOrder);
    assert.equal(new Set(pool.map((p) => p.no)).size, 71);

    for (const excluded of [143, 131, 147]) {
      assert.equal(pool.some((p) => p.no === excluded), false);
    }
  });
});

describe('POST /api/eggs cards', () => {
  test('cards only for owned pool species; non-pool owned species excluded; eggs/rewardEggs unchanged', async () => {
    await toProd();
    const cookie = await parentCookie();
    // 151 梦幻、144 急冻鸟（传说）、134 水伊布（伊布进化）、3 妙蛙花（终极形态）进馆；
    // 143 卡比兽已拥有但不是奖池种，必须不进馆。
    for (const no of [151, 144, 134, 3, 143]) ownSpecies(1, no);
    const r = await call('/api/eggs', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.deepEqual(r.j.cards.map((c) => c.no), [151, 144, 134, 3]);
    assert.deepEqual(r.j.cards.map((c) => c.group), ['mew', 'legendary', 'eevee', 'final']);
    const mew = r.j.cards[0];
    assert.equal(mew.name, '梦幻');
    assert.deepEqual(mew.types, ['超能力']);
    assert.match(mew.img, /^\/static\/img\/p151(\.[a-f0-9]+)?\.webp$/, mew.img);
    const bird = r.j.cards[1];
    assert.equal(bird.name, '急冻鸟');
    assert.ok(bird.types.includes('冰'), JSON.stringify(bird.types));
    assert.match(bird.img, /^\/static\/img\/p144(\.[a-f0-9]+)?\.webp$/, bird.img);
    assert.ok(Array.isArray(r.j.eggs), 'eggs 字段仍在');
    assert.ok(Array.isArray(r.j.rewardEggs), 'rewardEggs 字段仍在');
  });

  test('cards empty when the child owns none of the pool', async () => {
    await toProd();
    const cookie = await parentCookie();
    ownSpecies(1, 143); // 只拥有非奖池种
    const r = await call('/api/eggs', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.deepEqual(r.j.cards, []);
  });
});

/* 任务 104 v2：卡面字段 hp / moves / weak（真 TCG 卡面）。
 * 口径：hp 取 DEX_DETAILS.stats.hp；moves 取 cardFaceMoves（COLLECTION_MOVES → COLLECTION_LEARNSET
 * 最高 2 条 → 主宠线 LINES 最高 2 条 → 无则 []）；weak 取 matchupsForType(主属性).weak[0]，
 * 主属性不在 9 种战斗属性里（如冰/毒/超能力）时为 null，不显示弱点行。
 * 威力口径（任务 116）：名册招式优先取官方威力（原版数值），原创招式名无官方威力时保留名册值。 */
describe('cardFaceMoves', () => {
  test('main-line final now takes its COLLECTION_MOVES pair; 172 (still no roster entry) takes last 2 line moves', () => {
    // 2026-11-14 全量 151 批：3/6/9/26 已进 COLLECTION_MOVES，卡面取原创招式对（名册刻度）；
    // 172 皮丘仍无名册/招式表条目，走主宠线分支（最后 2 条线招式，25+6*lv）。
    // 任务 116：雷丘卡面威力改原版数值［十万伏特 90／打雷 110］，招式名不变。
    assert.deepEqual(M.cardFaceMoves(26), [
      { name: '十万伏特', power: 90, type: '电' },
      { name: '打雷', power: 110, type: '电' },
    ]);
    assert.deepEqual(M.cardFaceMoves(172), [
      { name: '伏特攻击', power: 85, type: '电' },
      { name: '打雷', power: 91, type: '电' },
    ]);
  });

  test('collection species take COLLECTION_MOVES with power', () => {
    assert.deepEqual(M.cardFaceMoves(121), [
      { name: '星光水环', power: 48, type: '水' },
      { name: '宝石星爆', power: 54, type: '水' },
    ]);
    assert.deepEqual(M.cardFaceMoves(34), [
      { name: '巨角钻击', power: 58, type: '毒' },
      { name: '王者地震', power: 66, type: '毒' },
    ]);
  });

  test('Mew takes its COLLECTION_MOVES pair', () => {
    assert.deepEqual(M.cardFaceMoves(151), [
      { name: '梦幻泡泡', power: 54, type: '超能力' },
      { name: '心灵星光', power: 66, type: '超能力' },
    ]);
  });

  test('official-named moves show official power; invented names keep roster power', () => {
    // 任务 116：名册招式优先取官方威力（原版数值），原创招式名无官方威力时保留名册值（fallback）。
    assert.deepEqual(M.cardFaceMoves(3), [
      { name: '飞叶风暴', power: 130, type: '草' },
      { name: '疯狂植物', power: 150, type: '草' },
    ]);
    assert.deepEqual(M.cardFaceMoves(135), [
      { name: '电光针', power: 54, type: '电' }, // 原创名，保留名册值
      { name: '十万伏特', power: 90, type: '电' }, // 官方名，取原版威力
    ]);
    assert.deepEqual(M.cardFaceMoves(6), [
      { name: '喷射火焰', power: 90, type: '火' },
      { name: '大字爆炎', power: 110, type: '火' },
    ]);
    assert.deepEqual(M.cardFaceMoves(9), [
      { name: '水炮', power: 110, type: '水' },
      { name: '加农水炮', power: 150, type: '水' },
    ]);
  });

  test('species with no move table in any source return []', () => {
    // 2026-11-14 全量 151 批：45/144/150 已进名册，卡面取 COLLECTION_MOVES 的 2 条招式；
    // 152（菊草叶）仍三张表全无，保留 [] 用例。
    // 任务 116：45/144/150 的官方招式取原版威力（溶解液 40、飞叶快刀 55、冰冻光束 90、暴风雪 110、精神强念 90、影子球 80）。
    assert.deepEqual(M.cardFaceMoves(45), [
      { name: '溶解液', power: 40, type: '毒' },
      { name: '飞叶快刀', power: 55, type: '草' },
    ]);
    assert.deepEqual(M.cardFaceMoves(144), [
      { name: '冰冻光束', power: 90, type: '冰' },
      { name: '暴风雪', power: 110, type: '冰' },
    ]);
    assert.deepEqual(M.cardFaceMoves(150), [
      { name: '精神强念', power: 90, type: '超能力' },
      { name: '影子球', power: 80, type: '幽灵' },
    ]);
    assert.deepEqual(M.cardFaceMoves(152), []);
  });
});

describe('POST /api/eggs card face fields', () => {
  test('cards carry hp, moves and weak; 144/45 now show their COLLECTION_MOVES pair', async () => {
    await toProd();
    const cookie = await parentCookie();
    for (const no of [26, 121, 144, 45]) ownSpecies(1, no);
    const r = await call('/api/eggs', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    // 池内顺序：传说 144 在前，终极形态 26/45/121 升序在后
    assert.deepEqual(r.j.cards.map((c) => c.no), [144, 26, 45, 121]);
    const byNo = Object.fromEntries(r.j.cards.map((c) => [c.no, c]));
    assert.equal(byNo[26].hp, 60);
    assert.deepEqual(byNo[26].moves, [
      { name: '十万伏特', power: 90, type: '电' },
      { name: '打雷', power: 110, type: '电' },
    ]);
    assert.equal(byNo[26].weak, '地面');
    assert.equal(byNo[26].tcg, '/static/img/tcg-26.webp');
    assert.equal(byNo[121].tcg, '/static/img/tcg-121.webp');
    assert.equal(typeof byNo[121].hp, 'number');
    assert.deepEqual(byNo[121].moves, [
      { name: '星光水环', power: 48, type: '水' },
      { name: '宝石星爆', power: 54, type: '水' },
    ]);
    assert.equal(byNo[121].weak, '电');
    assert.equal(typeof byNo[144].hp, 'number');
    assert.deepEqual(byNo[144].moves, [
      { name: '冰冻光束', power: 90, type: '冰' },
      { name: '暴风雪', power: 110, type: '冰' },
    ]);
    assert.equal(byNo[144].weak, null);
    assert.equal(typeof byNo[45].hp, 'number');
    assert.deepEqual(byNo[45].moves, [
      { name: '溶解液', power: 40, type: '毒' },
      { name: '飞叶快刀', power: 55, type: '草' },
    ]);
    assert.equal(byNo[45].weak, '火');
  });
});

describe('TCG_CARDS coverage', () => {
  test('map keys equal the hall pool and every mapped file exists on disk', () => {
    const poolNos = M.rareCardHallPool().map((c) => c.no).sort((a, b) => a - b);
    const mapNos = Object.keys(M.TCG_CARDS).map(Number).sort((a, b) => a - b);
    assert.deepEqual(mapNos, poolNos);
    assert.equal(mapNos.length, 71);
    for (const [no, url] of Object.entries(M.TCG_CARDS)) {
      assert.match(url, /^\/static\/img\/tcg-\d+\.webp$/);
      assert.ok(existsSync(new URL('../public' + url, import.meta.url)), `missing file for ${no}: ${url}`);
    }
  });
});
