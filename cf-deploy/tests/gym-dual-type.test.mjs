/* 馆主双属性进战斗测试：node --test tests/gym-dual-type.test.mjs
 * 覆盖：双属性倍率乘法（4 倍、免疫归零、0.5×2=1、0.25 双抗）、四关馆主各取官方双属性、
 * 克制判定按双属性、resolveGymRound 经 gymStrike 用双属性算伤、makePet defTypes、
 * 卡片道馆上下文（matchupsDual）与图鉴上下文口径区分、PvP 行为与旧版一致、apiGym stages bossTypes。
 * 纠正点：地面打草是 ×0.5（官方），故地面 vs 草/毒 = 0.5×2 = 1，不克制第 4 关。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0019_evo_items.sql'];

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
async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200);
  return r.cookie;
}
async function setup() {
  const pc = await parentCookie();
  const r = await call('/api/parent/settings/update', {
    method: 'POST', cookie: pc,
    body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '0000'), c2: await childCookie(2, '0000') };
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

const half = () => 0.5;
const S1 = ['岩石', '地面'];
const S2 = ['水', '超能力'];
const S3 = ['电'];
const S4 = ['草', '毒'];
const S5 = ['火'];
const S6 = ['地面', '岩石'];

describe('双属性倍率乘法（typeMultOfficialMulti）', () => {
  test('4 倍：水/草打岩石/地面均为 2×2', () => {
    assert.equal(M.typeMultOfficialMulti('水', S1), 4);
    assert.equal(M.typeMultOfficialMulti('草', S1), 4);
  });
  test('免疫归零：电打岩石/地面为 0（地面免疫压过岩石 ×1）', () => {
    assert.equal(M.typeMultOfficialMulti('电', S1), 0);
    assert.equal(M.typeMultOfficial('电', '地面'), 0);
  });
  test('0.5×2=1：地面打草/毒不是克制', () => {
    assert.equal(M.typeMultOfficial('地面', '草'), 0.5);
    assert.equal(M.typeMultOfficial('地面', '毒'), 2);
    assert.equal(M.typeMultOfficialMulti('地面', S4), 1);
  });
  test('0.25 双抗：草打草/毒为 0.5×0.5', () => {
    assert.equal(M.typeMultOfficialMulti('草', S4), 0.25);
  });
  test('S2 超能力第二属性对 App 攻击一律 ×1：水/电/草打水/超能力与单属性水一致', () => {
    assert.equal(M.typeMultOfficialMulti('水', S2), 0.5);
    assert.equal(M.typeMultOfficialMulti('电', S2), 2);
    assert.equal(M.typeMultOfficialMulti('草', S2), 2);
    assert.equal(M.typeMultOfficial('超能力', '水'), 1);
    assert.equal(M.typeMultOfficial('超能力', '岩石'), 1);
  });
  test('毒补表：毒打草 ×2、打地面 ×0.5；妖精打毒 ×0.5', () => {
    assert.equal(M.typeMultOfficial('毒', '草'), 2);
    assert.equal(M.typeMultOfficial('毒', '地面'), 0.5);
    assert.equal(M.typeMultOfficial('妖精', '毒'), 0.5);
    assert.equal(M.typeMultOfficialMulti('毒', S4), 2);
  });
  test('单字符串输入等价 typeMultOfficial；9×9 子矩阵与改前一致（抽查）', () => {
    assert.equal(M.typeMultOfficialMulti('电', '地面'), 0);
    assert.equal(M.typeMultOfficialMulti('水', '火'), 2);
    assert.equal(M.typeMultOfficialMulti('地面', '飞行'), 0);
    assert.equal(M.typeMultOfficialMulti('普通', '岩石'), 0.5);
  });
});

describe('bossDefTypes：六关馆主各取官方双属性', () => {
  test('六关', () => {
    assert.deepEqual(M.bossDefTypes(95), S1);
    assert.deepEqual(M.bossDefTypes(121), S2);
    assert.deepEqual(M.bossDefTypes(125), S3);
    assert.deepEqual(M.bossDefTypes(45), S4);
    assert.deepEqual(M.bossDefTypes(59), S5);
    assert.deepEqual(M.bossDefTypes(112), S6);
  });
  test('无官方双属性时回落 SPECIES 单属性；未知编号为空数组', () => {
    assert.deepEqual(M.bossDefTypes(54), ['水']);
    assert.deepEqual(M.bossDefTypes(999), []);
  });
});

describe('克制判定按双属性（countersForType）', () => {
  test('八属性克制关集合（六关口径）', () => {
    assert.deepEqual(M.countersForType('电'), [2]);
    assert.deepEqual(M.countersForType('水'), [1, 5, 6]);
    assert.deepEqual(M.countersForType('火'), [4]);
    assert.deepEqual(M.countersForType('草'), [1, 2, 6]);
    assert.deepEqual(M.countersForType('地面'), [1, 3, 5, 6]);
    assert.deepEqual(M.countersForType('飞行'), [4]);
    assert.deepEqual(M.countersForType('龙'), []);
    assert.deepEqual(M.countersForType('普通'), []);
  });
  test('与 typeMultOfficialMulti 同源：逐属性×逐关比对', () => {
    const TYPES = ['电', '水', '火', '草', '地面', '岩石', '飞行', '龙', '普通'];
    for (const atk of TYPES) {
      for (const g of M.GYM_STAGES) {
        assert.equal(
          M.countersForType(atk).includes(g.stage),
          M.typeMultOfficialMulti(atk, M.bossDefTypes(g.bossNo)) >= 2,
          `${atk} 克第 ${g.stage} 关`,
        );
      }
    }
  });
});

describe('matchupsForTypes：双属性克制关系', () => {
  test('S1 大岩蛇：弱水/草/地面，抗火/岩石/飞行/普通，免疫电', () => {
    assert.deepEqual(M.matchupsForTypes(S1), {
      strong: ['电', '火', '岩石', '飞行'],
      weak: ['水', '草', '地面'],
      resist: ['火', '岩石', '飞行', '普通'],
      immune: ['电'],
    });
  });
  test('S4 霸王花：弱火/飞行，抗电/水/草（含 0.25 双抗的草），无免疫', () => {
    assert.deepEqual(M.matchupsForTypes(S4), {
      strong: ['水', '草', '地面', '岩石'],
      weak: ['火', '飞行'],
      resist: ['电', '水', '草'],
      immune: [],
    });
  });
  test('S2 与单属性水一致；S3 与单属性电一致；空输入四空', () => {
    assert.deepEqual(M.matchupsForTypes(S2), M.matchupsForType('水'));
    assert.deepEqual(M.matchupsForTypes(S3), M.matchupsForType('电'));
    assert.deepEqual(M.matchupsForTypes([]), { strong: [], weak: [], resist: [], immune: [] });
    assert.deepEqual(M.matchupsForTypes(null), { strong: [], weak: [], resist: [], immune: [] });
  });
});

describe('makePet defTypes', () => {
  test('默认 defTypes 为 [type]；传入时存副本', () => {
    const p = M.makePet({ key: 'a', name: '皮丘', type: '电', level: 5, moves: [{ name: '电击', type: '电', power: 50 }] });
    assert.deepEqual(p.defTypes, ['电']);
    const defs = ['岩石', '地面'];
    const boss = M.makePet({ key: 'boss', name: '大岩蛇', type: '岩石', no: 95, level: 12, defTypes: defs, moves: [{ name: '岩石猛击', type: '岩石', power: 28 }] });
    assert.deepEqual(boss.defTypes, S1);
    defs.push('水');
    assert.deepEqual(boss.defTypes, S1);
  });
  test('非法 defTypes 抛错：空数组、未知属性、妖精（不在防守白名单内）', () => {
    const base = { key: 'a', name: '皮丘', type: '电', level: 5, moves: [{ name: '电击', type: '电', power: 50 }] };
    assert.throws(() => M.makePet({ ...base, defTypes: [] }), TypeError);
    assert.throws(() => M.makePet({ ...base, defTypes: ['钢'] }), TypeError);
    assert.throws(() => M.makePet({ ...base, defTypes: ['妖精'] }), TypeError);
    assert.doesNotThrow(() => M.makePet({ ...base, defTypes: ['水', '超能力'] }));
    assert.doesNotThrow(() => M.makePet({ ...base, defTypes: ['草', '毒'] }));
  });
});

describe('resolveGymRound 经 gymStrike 用双属性算伤', () => {
  const side = (childId, childName, pets) => ({ childId, childName, battleLevel: 5, activeIdx: 0, pets });
  const gymState = (player, boss) => M.createBattleState({ mode: 'gym', firstSide: 'A', sides: { A: side(1, '大宝', [player]), B: side(null, '馆主', [boss]) } });
  const boss95 = () => M.makePet({ key: 'boss', name: '大岩蛇', type: '岩石', no: 95, level: 12, defTypes: M.bossDefTypes(95), moves: [{ name: '岩石猛击', type: '岩石', power: 28 }] });
  const boss45 = () => M.makePet({ key: 'boss', name: '霸王花', type: '草', no: 45, level: 12, defTypes: M.bossDefTypes(45), moves: [{ name: '飞叶快刀', type: '草', power: 56 }] });

  test('水枪打大岩蛇：×4，STAB ×1.5，伤害 28（官方公式 base 5 ×4，Lv.12 馆主 30 血不击倒）', () => {
    const player = M.makePet({ key: 'main', name: '杰尼龟', type: '水', no: 7, level: 8, moves: [{ name: '水枪', type: '水', power: 40 }] });
    const st = gymState(player, boss95());
    const hpBefore = st.sides.B.pets[0].hp;
    const r = M.resolveGymRound(st, { moveName: '水枪' }, half);
    assert.equal(r.error, undefined, JSON.stringify(r));
    const ev = r.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(ev, '应有玩家攻击事件');
    assert.equal(ev.mult, 4);
    assert.equal(ev.dmg, 28); // 5×1.5×4×0.93=27.9→28。
    assert.equal(ev.superEffective, true);
    assert.equal(st.sides.B.pets[0].hp, hpBefore - 28);
  });
  test('电击打大岩蛇：免疫 ×0，不扣血，事件写“没有效果”', () => {
    const player = M.makePet({ key: 'main', name: '皮丘', type: '电', no: 172, level: 8, moves: [{ name: '电击', type: '电', power: 50 }] });
    const st = gymState(player, boss95());
    const hpBefore = st.sides.B.pets[0].hp;
    const r = M.resolveGymRound(st, { moveName: '电击' }, half);
    assert.equal(r.error, undefined, JSON.stringify(r));
    const ev = r.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(ev, '应有玩家攻击事件');
    assert.equal(ev.mult, 0);
    assert.equal(ev.dmg, 0);
    assert.equal(ev.immune, true);
    assert.match(ev.text, /没有效果/);
    assert.equal(st.sides.B.pets[0].hp, hpBefore);
  });
  test('地面招打霸王花：×1（0.5×2），不是克制', () => {
    const player = M.makePet({ key: 'main', name: '穿山鼠', type: '地面', no: 50, level: 8, moves: [{ name: '地面重击', type: '地面', power: 40 }] });
    const st = gymState(player, boss45());
    const r = M.resolveGymRound(st, { moveName: '地面重击' }, half);
    assert.equal(r.error, undefined, JSON.stringify(r));
    const ev = r.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(ev, '应有玩家攻击事件');
    assert.equal(ev.mult, 1);
    assert.equal(ev.superEffective, false);
  });
  test('存量对局兼容：馆主宠缺 defTypes 时回落单属性', () => {
    const player = M.makePet({ key: 'main', name: '杰尼龟', type: '水', no: 7, level: 8, moves: [{ name: '水枪', type: '水', power: 40 }] });
    const legacyBoss = { key: 'boss', name: '大岩蛇', type: '岩石', no: 95, img: null, level: 12, maxHp: 204, hp: 204, moves: [{ name: '岩石猛击', type: '岩石', power: 28 }] };
    const st = gymState(player, legacyBoss);
    const r = M.resolveGymRound(st, { moveName: '水枪' }, half);
    assert.equal(r.error, undefined, JSON.stringify(r));
    const ev = r.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.equal(ev.mult, 2);
    assert.equal(ev.dmg, 100); // 无 stats 回落 base 36 × STAB 1.5 × mult 2 × 0.93 = 100.44 → 100。
  });
});

describe('PvP 行为与旧版一致（经典单属性 ×2-only）', () => {
  test('calcDamage 经典分支：电打地面 ×1；数组 defType 用首项', () => {
    const move = { name: '电击', type: '电', power: 50 };
    const r1 = M.calcDamage(move, { level: 5, type: '电', stats: null }, { level: 5, type: '地面', stats: null }, half, { range: [1, 1] });
    assert.equal(r1.mult, 1);
    assert.equal(r1.dmg, 38);
    const r2 = M.calcDamage(move, { level: 5, type: '电', stats: null }, { level: 5, type: '地面', defTypes: ['地面', '岩石'], stats: null }, half, { range: [1, 1] });
    assert.equal(r2.mult, 1);
    assert.equal(r2.dmg, 38);
    assert.equal(M.typeMult('电', '水'), 2);
    assert.equal(M.typeMult('电', '地面'), 1);
  });
  test('PvP 实战：电击打地面宠事件 mult 为 1（不受官方免疫影响）', () => {
    const petA = { key: 'a', name: '皮丘', type: '电', no: null, img: null, level: 5, maxHp: 200, hp: 200, moves: [{ name: '电击', type: '电', power: 50 }] };
    const petB = { key: 'b', name: '穿山鼠', type: '地面', no: null, img: null, level: 5, maxHp: 200, hp: 200, moves: [{ name: '挖洞', type: '地面', power: 40 }] };
    const side = (childId, childName, pets) => ({ childId, childName, battleLevel: 5, activeIdx: 0, pets });
    const st = M.createBattleState({ mode: 'pvp', firstSide: 'B', sides: { A: side(1, '大宝', [petA]), B: side(2, '小宝', [petB]) } });
    M.applyBattleAction(st, 'B', null);
    const r = M.applyBattleAction(st, 'A', '电击', half);
    const ev = (Array.isArray(r) ? r : r.events).find((e) => e && e.type === 'attack');
    assert.ok(ev, '应有攻击事件');
    assert.equal(ev.mult, 1);
  });
});

describe('卡片口径区分（HTTP：/api/pokedex）', () => {
  test('馆主条目带 matchupsDual 且按双属性；普通条目无此标记', async () => {
    const cookie = await parentCookie();
    await pokedex(1, cookie); // 先调一次，服务端生成 form 源行，insertEntry 才能从中复制
    for (const key of ['gym:95', 'gym:45', 'gym:121', 'gym:125', 'wild:54', 'form:charmander:1', 'form:pikachu:1']) insertEntry(1, key);
    raw.exec("UPDATE pokedex SET unlocked_at='2026-01-02' WHERE child_id=1");
    const j = await pokedex(1, cookie);
    const g95 = j.others.find((e) => e.no === 95);
    assert.equal(g95.matchupsDual, true);
    assert.equal(g95.type, '岩石');
    assert.deepEqual(g95.types, ['岩石', '地面']);
    assert.deepEqual(g95.matchups.weak, ['水', '草', '地面']);
    assert.deepEqual(g95.matchups.immune, ['电']);
    const g45 = j.others.find((e) => e.no === 45);
    assert.equal(g45.matchupsDual, true);
    assert.deepEqual(g45.matchups.weak, ['火', '飞行']);
    assert.ok(g45.matchups.resist.includes('草'));
    const g121 = j.others.find((e) => e.no === 121);
    assert.equal(g121.matchupsDual, true);
    assert.deepEqual(g121.matchups.weak, ['电', '草']);
    const g125 = j.others.find((e) => e.no === 125);
    assert.equal(g125.matchupsDual, true);
    assert.deepEqual(g125.matchups.weak, ['地面']);
    const wild = j.wild.find((e) => e.no === 54);
    assert.equal(Object.hasOwn(wild, 'matchupsDual'), false);
    assert.deepEqual(wild.matchups.weak, ['电', '草']);
    const line = j.lineEntries.find((e) => e.current && e.no != null && e.unlocked);
    assert.equal(Object.hasOwn(line, 'matchupsDual'), false);
    assert.deepEqual(line.matchups.weak, ['地面']);
  });
});

describe('道馆页数据（HTTP：/api/gym/status）', () => {
  test('六关 bossTypes 为官方双属性，type 仍为关卡主题单属性', async () => {
    const { c1 } = await setup();
    const r = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const stages = r.j.stages;
    assert.equal(stages.length, 6);
    assert.deepEqual(stages[0].bossTypes, ['岩石', '地面']);
    assert.deepEqual(stages[1].bossTypes, ['水', '超能力']);
    assert.deepEqual(stages[2].bossTypes, ['电']);
    assert.deepEqual(stages[3].bossTypes, ['草', '毒']);
    assert.deepEqual(stages[4].bossTypes, ['火']);
    assert.deepEqual(stages[5].bossTypes, ['地面', '岩石']);
    assert.equal(stages[0].type, '岩石');
    assert.equal(stages[1].type, '水');
    assert.equal(stages[2].type, '电');
    assert.equal(stages[3].type, '草');
    assert.equal(stages[4].type, '火');
    assert.equal(stages[5].type, '地面');
  });
});
