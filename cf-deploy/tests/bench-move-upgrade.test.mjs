/* 备战宠独有招升级入口：node --test tests/bench-move-upgrade.test.mjs
 * 真实 Azure 调用 0 次。
 * 口径：升级接口只认主宠线招式是接口层拦的（apiQuizUpgradeMove 只查 allMovesFor）；
 * 数据层早已共享——collectionMovesFor 按招式名读 move_levels，离线引擎同理。
 * 本次：接口按 benchNo 放行备战宠已学会的独有招；图鉴卡片带技能等级并给出升级入口。
 * 测试用种：37 六尾（Lv.8，火花 Lv.2 学会、主宠皮卡丘线没有；摇尾巴为弱化变化招）。
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { assetHash, assetPath } from './asset-path.mjs';

const H = assetHash();
assert.match(H || '', /^[0-9a-f]{8}$/, '先跑 node scripts/hash-assets.mjs');

const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const M = await import(new URL('../src/index.js', import.meta.url));

const app = () => readFileSync(assetPath('app.js'), 'utf8');

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0021_skill_levels.sql', '0024_evo_reward.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
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

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie, res };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

function seedChild({ xp = 840, fragments = 3, levels = '{}' } = {}) {
  raw.exec(`
    UPDATE children
    SET total_xp=${xp},
        unlocked_moves='["电光一闪"]',
        quiz_fragments=${fragments},
        quiz_correct_total=10,
        move_levels='${levels}',
        fairy_moves='[]'
    WHERE id=1;
  `);
}

const childRow = () => raw.prepare('SELECT * FROM children WHERE id=1').get();

describe('备战宠独有招数据层已共享 move_levels', () => {
  test('火花是六尾独有招（主宠线没有），collectionMovesFor 按招式名读等级', () => {
    const child = {
      line: 'pikachu', unlocked_moves: '[]',
      move_levels: JSON.stringify({ '火花': 3 }), fairy_moves: '[]',
    };
    assert.ok(!M.allMovesFor(child, 8).some((m) => m.name === '火花'));
    const moves = M.collectionMovesFor(child, 37, 8);
    const spark = moves.find((m) => m.name === '火花');
    assert.ok(spark);
    assert.equal(spark.level, 2);
    assert.equal(spark.skillLevel, 3);
    assert.equal(spark.power, 25 + 6 * 2 + 6 * (3 - 1));
    assert.equal(moves.find((m) => m.name === '喷射火焰').skillLevel, 1);
    assert.equal(moves.find((m) => m.name === '喷射火焰').power, 25 + 6 * 7);
  });

  test('伤害随技能等级变化：火花 Lv.1 威力 37 伤 52，Lv.2 威力 43 伤 60', () => {
    const atk = { key: 'a', name: '六尾', type: '火', level: 18, maxHp: 100, hp: 100, moves: [{ name: '火花', type: '火', power: 37 }] };
    const def = { key: 'b', name: '波波', type: '普通', level: 18, maxHp: 100, hp: 100, moves: [{ name: '撞击', type: '普通', power: 35 }] };
    const d1 = M.calcDamage({ name: '火花', type: '火', power: 37 }, atk, def, () => 0.5, { critRate: 0 });
    const d2 = M.calcDamage({ name: '火花', type: '火', power: 43 }, atk, def, () => 0.5, { critRate: 0 });
    assert.equal(d1.dmg, 52);
    assert.equal(d2.dmg, 60);
    assert.ok(d2.dmg > d1.dmg);
  });
});

describe('备战宠独有招升级接口', () => {
  beforeEach(() => {
    ({ env, raw } = makeEnv());
    seedChild();
  });

  test('独有招升级成功：扣 3 碎片、等级 2、威力 37→43，答对总数不动', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '火花', benchNo: 37 },
    });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.move.name, '火花');
    assert.equal(r.j.move.level, 2);
    assert.equal(r.j.move.skillLevel, 2);
    assert.equal(r.j.move.power, 43);
    for (const key of ['effectKind', 'effectMult', 'effectMiss']) {
      assert.ok(Object.hasOwn(r.j.move, key), `成功响应包含 ${key}`);
    }
    assert.equal(r.j.quizFragments, 0);

    const row = childRow();
    assert.equal(row.move_levels, '{"火花":2}');
    assert.equal(row.quiz_fragments, 0);
    assert.equal(row.quiz_correct_total, 10);
    // 升级落库后，备战战斗直接读到新等级与新威力
    const after = M.collectionMovesFor({ ...row, move_levels: row.move_levels }, 37, 8);
    assert.equal(after.find((m) => m.name === '火花').skillLevel, 2);
    assert.equal(after.find((m) => m.name === '火花').power, 43);
  });

  test('不传 benchNo 时独有招仍拒绝，且不扣碎片', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '火花' },
    });
    assert.equal(r.status, 400);
    const row = childRow();
    assert.equal(row.quiz_fragments, 3);
    assert.equal(row.move_levels, '{}');
  });

  test('benchNo 对不上的种（43 走路草不学火花）拒绝', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '火花', benchNo: 43 },
    });
    assert.equal(r.status, 400);
    assert.equal(childRow().move_levels, '{}');
  });

  test('该种还没学会的招（闪焰冲锋 Lv.10，孩子才 8 级）拒绝', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '闪焰冲锋', benchNo: 37 },
    });
    assert.equal(r.status, 400);
    assert.equal(childRow().move_levels, '{}');
  });

  test('独有招满级返回 400 且不扣碎片', async () => {
    seedChild({ fragments: 9, levels: '{"火花":5}' });
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '火花', benchNo: 37 },
    });
    assert.equal(r.status, 400);
    const row = childRow();
    assert.equal(row.quiz_fragments, 9);
    assert.equal(row.move_levels, '{"火花":5}');
  });

  test('独有招碎片不足返回 400 且不修改数据', async () => {
    seedChild({ fragments: 2 });
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '火花', benchNo: 37 },
    });
    assert.equal(r.status, 400);
    const row = childRow();
    assert.equal(row.quiz_fragments, 2);
    assert.equal(row.move_levels, '{}');
  });

  test('变化招升级后效果随等级变化：摇尾巴 Lv.2 弱化 ×0.55', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '摇尾巴', benchNo: 37 },
    });
    assert.equal(r.status, 200);
    assert.equal(r.j.move.effectKind, 'weak');
    assert.equal(r.j.move.effectMult, 0.55);
  });

  test('主宠招升级不受影响（不传 benchNo 照常升）', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '电光一闪' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.j.move.skillLevel, 2);
    assert.equal(r.j.move.power, 43);
    assert.equal(r.j.move.level, 2);
  });

  test('主宠招即使带 benchNo 也不坏（主宠优先；六尾 8 级还没学会电光一闪）', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '电光一闪', benchNo: 37 },
    });
    assert.equal(r.status, 200);
    assert.equal(r.j.move.skillLevel, 2);
    assert.equal(childRow().move_levels, '{"电光一闪":2}');
  });
});

describe('图鉴卡片带技能等级与碎片数', () => {
  beforeEach(() => {
    ({ env, raw } = makeEnv());
    seedChild({ fragments: 5 });
  });

  test('野外六尾卡片：已学会的带 skillLevel 与 learned，升级后图鉴同步变', async () => {
    const cookie = await parentCookie();
    const r1 = await call('/api/pokedex', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(r1.status, 200);
    assert.equal(r1.j.fragments, 5);
    const six = r1.j.wild.find((e) => e.no === 37);
    assert.ok(six, '野外应有六尾条目');
    const spark = six.moves.find((m) => m.name === '火花');
    assert.ok(spark);
    assert.equal(spark.learned, true);
    assert.equal(spark.skillLevel, 1);
    assert.equal(spark.power, 37);
    const charge = six.moves.find((m) => m.name === '闪焰冲锋');
    assert.ok(charge);
    assert.equal(charge.learned, false);
    assert.equal(charge.skillLevel, 1);

    const up = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '火花', benchNo: 37 },
    });
    assert.equal(up.status, 200);
    const r2 = await call('/api/pokedex', { method: 'POST', cookie, body: { childId: 1 } });
    const spark2 = r2.j.wild.find((e) => e.no === 37).moves.find((m) => m.name === '火花');
    assert.equal(spark2.skillLevel, 2);
    assert.equal(spark2.power, 43);
    assert.equal(r2.j.fragments, 2);
  });
});

describe('备战升级前端源码口径', () => {
  test('图鉴卡片招式可点开详情、带升级入口，复用同一升级接口（不新增接口）', () => {
    const text = app();
    for (const needle of ['showDexMoveDetail(', 'upgradeBenchMoveByIndex(', 'benchNo', 'backToDexCard', 'skillbadge']) {
      assert.ok(text.includes(needle), `前端应包含 ${needle}`);
    }
    assert.ok(text.includes('/api/quiz/upgrade-move'), '备战升级应复用主宠升级接口');
    assert.equal(src.split("route('/api/quiz/upgrade-move'").length - 1, 1, '升级接口仍只有一处路由');
  });
});
