/* 道馆二期 Tier 1 测试：node --test tests/gym-phase2-tier1.test.mjs
 * 覆盖：连败计数（settle 输 +1 / 赢清零 / 幂等不重记 / 跨孩隔离 / 按关卡隔离）、
 * apiGymStatus 每关 failStreak + tier、在线对战收尾 finalizeBattle 的赢/输记 streak
 *（rigged HP 打满全场）、对战招式克制角标 battleMovePickerHtml（只道馆 Tier 1、
 * 只标效果拔群、双属性乘法、变化招不标、PvP 不标、换宠重算）。
 * 注意：Tier 2（伤害 ×1.25、1 血保底）用户已砍掉，本文件不测、代码里也不应出现。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import { readBackendSource } from './backend-src.mjs';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0041_gym_fail_streaks.sql', '0043_pet_instances_ability.sql'];
const APP_SRC = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');

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
  const store = new Map();
  const PHOTOS = {
    async put(key, bytes, opts) { store.set(key, { bytes, opts }); },
    async get(key) { const v = store.get(key); return v ? { arrayBuffer: async () => v.bytes } : null; },
    async delete(key) { store.delete(key); },
  };
  return {
    env: { DB: db, TEST_MODE: '1', PHOTOS, ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw, store,
  };
}

let env, raw, store;
beforeEach(() => { M.resetEvoTableCache(); ({ env, raw, store } = makeEnv()); });

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
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '1111'), c2: await childCookie(2, '2222') };
}

function shToday() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }); }
function addDaysStr(ds, n) {
  const d = new Date(ds + 'T12:00:00+08:00');
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}
function setToday(target) {
  const dayNum = (s) => Math.round(Date.parse(s + 'T00:00:00Z') / 86400000);
  const off = dayNum(target) - dayNum(shToday());
  raw.exec(`INSERT OR REPLACE INTO settings(key,value) VALUES('debug_open_gates','0'),('debug_day_offset','${off}')`);
}
function nextSunday() {
  let d = shToday();
  for (let i = 0; i < 14; i++) { if (new Date(d + 'T00:00:00Z').getUTCDay() === 0) return d; d = addDaysStr(d, 1); }
}
function seedDays(childId, weekStart, n) {
  for (let i = 0; i < n; i++) {
    raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
      VALUES(?,?, '["语文"]','语文','10:00',1,0,'approved',15,'10:05')`).run(childId, addDaysStr(weekStart, i));
  }
}
const streakOf = (childId, stage) => {
  const r = raw.prepare('SELECT streak FROM gym_fail_streaks WHERE child_id=? AND stage=?').get(childId, stage);
  return r ? r.streak : 0;
};
const settleGym = (cookie, cmdId, { childId = 1, stage = 1, won, date } = {}) =>
  call('/api/gym/settle', { method: 'POST', cookie, body: { cmd_id: cmdId, child_id: childId, stage, won, date } });
async function gymStatus(cookie, childId = 1) {
  const r = await call('/api/gym/status', { method: 'POST', cookie, body: { childId } });
  assert.equal(r.j.ok, true, JSON.stringify(r.j));
  return r.j;
}

/* 在线对战辅助：开一场真道馆战，把血量 rig 成必赢/必输，再打到结束。 */
function rigState(battleId, mode) {
  const row = raw.prepare('SELECT state FROM battles WHERE id=?').get(battleId);
  const st = JSON.parse(row.state);
  if (mode === 'win') {
    for (const p of st.sides.B.pets) { p.hp = 1; }
    for (const p of st.sides.A.pets) { p.hp = p.maxHp; }
  } else {
    for (const p of st.sides.A.pets) { p.hp = 1; }
    for (const p of st.sides.B.pets) { p.hp = p.maxHp; }
  }
  raw.prepare('UPDATE battles SET state=? WHERE id=?').run(JSON.stringify(st), battleId);
}
async function playToEnd(cookie, battleId, view) {
  let v = view;
  let guard = 0;
  while (v.status === 'active' && guard++ < 60) {
    const pet = v.sides.A.pets[v.sides.A.activeIdx];
    const bossPet = v.sides.B.pets[v.sides.B.activeIdx];
    const defTypes = (bossPet.defTypes && bossPet.defTypes.length) ? bossPet.defTypes : M.bossDefTypes(bossPet.no);
    // 先挑 100% 命中的伤害招（铁尾 75% 命中会让 rigged 必赢局 40% 翻车），再按期望伤害选；
    // 没有必中招时才退到全部伤害招。克制仍用官方双属性乘法。
    const damaging = pet.moves.filter((m) => m.damage_class !== '变化' && (m.power || 0) > 0);
    const reliable = damaging.filter((m) => (M.officialAccuracy(m.name) ?? 100) >= 100);
    const pool = reliable.length ? reliable : (damaging.length ? damaging : pet.moves);
    const score = (m) => (m.power || 0) * M.typeMultOfficialMulti(m.type, defTypes);
    const mv = pool.reduce((a, b) => (score(b) > score(a) ? b : a), pool[0]);
    const r = await call('/api/battle/move', { method: 'POST', cookie, body: { battleId, moveName: mv.name } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    v = r.j.battle;
  }
  assert.equal(v.status, 'finished', '对战应在有限回合内结束');
  return v;
}
async function startStage1(cookie) {
  const sun = nextSunday();
  setToday(sun);
  raw.exec('UPDATE children SET total_xp=10000 WHERE id=1');
  seedDays(1, addDaysStr(sun, -6), 4);
  const s = await call('/api/battle/gym/start', { method: 'POST', cookie, body: { childId: 1, stage: 1 } });
  assert.equal(s.j.ok, true, JSON.stringify(s.j));
  return s.j.battle;
}

/* ---------------- settle 路径的连败计数 ---------------- */

describe('settleGymCore 连败计数', () => {
  test('初始全关 streak 0 / tier 0', async () => {
    const { c1 } = await setup();
    const j = await gymStatus(c1, 1);
    assert.equal(j.stages.length, 8);
    for (const s of j.stages) { assert.equal(s.failStreak, 0); assert.equal(s.tier, 0); }
  });

  test('输 1 次 streak 1 / tier 1；再输 1 次 streak 2 / 仍 tier 1（无 Tier 2）', async () => {
    const { pc } = await setup();
    const sun = nextSunday();
    let r = await settleGym(pc, 't2-a', { won: false, date: sun });
    assert.equal(r.j.ok, true); assert.equal(r.j.settled, false); assert.equal(r.j.reason, 'LOST');
    assert.equal(streakOf(1, 1), 1);
    let j = await gymStatus(pc, 1);
    assert.equal(j.stages[0].failStreak, 1); assert.equal(j.stages[0].tier, 1);
    r = await settleGym(pc, 't2-b', { won: false, date: sun });
    assert.equal(r.j.ok, true);
    assert.equal(streakOf(1, 1), 2);
    j = await gymStatus(pc, 1);
    assert.equal(j.stages[0].failStreak, 2); assert.equal(j.stages[0].tier, 1);
  });

  test('同一 cmd_id 重试不重记', async () => {
    const { pc } = await setup();
    const sun = nextSunday();
    await settleGym(pc, 't3-dup', { won: false, date: sun });
    assert.equal(streakOf(1, 1), 1);
    const r = await settleGym(pc, 't3-dup', { won: false, date: sun });
    assert.equal(r.j.ok, true);
    assert.equal(streakOf(1, 1), 1);
  });

  test('赢了清零（结算成功才清）', async () => {
    const { pc } = await setup();
    const sun = nextSunday();
    setToday(sun);
    raw.exec('UPDATE children SET total_xp=10000 WHERE id=1');
    seedDays(1, addDaysStr(sun, -6), 4);
    await settleGym(pc, 't4-l1', { won: false, date: sun });
    await settleGym(pc, 't4-l2', { won: false, date: sun });
    assert.equal(streakOf(1, 1), 2);
    const r = await settleGym(pc, 't4-w', { won: true, date: sun });
    assert.equal(r.j.ok, true); assert.equal(r.j.settled, true);
    assert.equal(streakOf(1, 1), 0);
    const j = await gymStatus(pc, 1);
    assert.equal(j.stages[0].failStreak, 0); assert.equal(j.stages[0].tier, 0);
  });

  test('跨孩隔离、按关卡隔离', async () => {
    const { pc } = await setup();
    const sun = nextSunday();
    await settleGym(pc, 't5-a', { childId: 1, stage: 1, won: false, date: sun });
    await settleGym(pc, 't5-b', { childId: 1, stage: 1, won: false, date: sun });
    await settleGym(pc, 't5-c', { childId: 1, stage: 2, won: false, date: sun });
    assert.equal(streakOf(1, 1), 2);
    assert.equal(streakOf(1, 2), 1);
    assert.equal(streakOf(2, 1), 0);
    const j2 = await gymStatus(pc, 2);
    assert.equal(j2.stages[0].failStreak, 0); assert.equal(j2.stages[0].tier, 0);
    const j1 = await gymStatus(pc, 1);
    assert.equal(j1.stages[1].failStreak, 1); assert.equal(j1.stages[1].tier, 1);
  });

  test('无效关卡不记 streak', async () => {
    const { pc } = await setup();
    const r = await settleGym(pc, 't6-x', { stage: 99, won: false, date: nextSunday() });
    assert.equal(r.status, 400); assert.equal(r.j.error, 'STAGE_NOT_FOUND');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM gym_fail_streaks').get().n, 0);
  });
});

/* ---------------- 在线对战收尾 finalizeBattle ---------------- */
/* 开一场真道馆战，把血量 rig 成必赢/必输，再打到结束：验证 finalizeBattle 记 streak。
 *（settleGymCore 只覆盖离线同步路径；在线对战走 finalizeBattle，不走 settle。） */

describe('finalizeBattle 连败计数（在线对战）', () => {
  test('开局视图带官方双属性 defTypes（角标按它算倍率）', async () => {
    const { c1 } = await setup();
    const b = await startStage1(c1);
    // 第 1 关馆主队：小拳石（岩石/地面）+ 大岩蛇（岩石/地面）；玩家皮卡丘（电）
    assert.deepEqual(b.sides.B.pets[0].defTypes, ['岩石', '地面']);
    assert.deepEqual(b.sides.B.pets[1].defTypes, ['岩石', '地面']);
    assert.deepEqual(b.sides.A.pets[0].defTypes, ['电']);
  });

  test('在线输了 streak +1', async () => {
    const { c1 } = await setup();
    const b = await startStage1(c1);
    rigState(b.battleId, 'lose');
    const v = await playToEnd(c1, b.battleId, b);
    assert.equal(v.winnerSide, 'B');
    assert.equal(streakOf(1, 1), 1);
  });

  test('在线赢了清零（先输 2 次再赢）', async () => {
    const { pc, c1 } = await setup();
    const sun = nextSunday();
    await settleGym(pc, 't8-l1', { won: false, date: sun });
    await settleGym(pc, 't8-l2', { won: false, date: sun });
    assert.equal(streakOf(1, 1), 2);
    const b = await startStage1(c1);
    rigState(b.battleId, 'win');
    const v = await playToEnd(c1, b.battleId, b);
    assert.equal(v.winnerSide, 'A');
    assert.equal(streakOf(1, 1), 0);
  });
});

/* ---------------- 重置清连败（表存在时真清，表不存在时不阻塞重置） ---------------- */

describe('重置清连败', () => {
  test('debug-reset 清连败计数', async () => {
    const { pc } = await setup();
    const sun = nextSunday();
    await settleGym(pc, 't9-l1', { won: false, date: sun });
    assert.equal(streakOf(1, 1), 1);
    const r = await call('/api/parent/debug-reset', { method: 'POST', cookie: pc, body: { confirm: true } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM gym_fail_streaks').get().n, 0);
  });
});

/* ---------------- 旧库无表时优雅降级（迁移 0041 未应用） ---------------- */
/* 口径同 bumpChildVersion 对无 sync_versions 表的旧链：提示用的连败表缺失时，
 * 道馆状态页照常返回（全关 tier 0）、对战结算照常完成，只是不记连败。
 * beforeEach 已调 resetEvoTableCache() 清表存在缓存，夹具切换才可信。 */

describe('旧库无表时优雅降级', () => {
  function makeEnvNoTable() {
    return makeEnv(MIGRATIONS.filter((f) => f !== '0041_gym_fail_streaks.sql'));
  }
  test('gym status 正常返回，全关 tier 0', async () => {
    ({ env, raw, store } = makeEnvNoTable());
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name='gym_fail_streaks'").get().n, 0);
    const { c1 } = await setup();
    const j = await gymStatus(c1, 1);
    for (const s of j.stages) { assert.equal(s.failStreak, 0); assert.equal(s.tier, 0); }
  });
  test('在线对战输赢结算照常完成（不 500）', async () => {
    ({ env, raw, store } = makeEnvNoTable());
    const { c1 } = await setup();
    const b = await startStage1(c1);
    rigState(b.battleId, 'lose');
    const v = await playToEnd(c1, b.battleId, b);
    assert.equal(v.winnerSide, 'B');
  });
});

/* ---------------- 前端：克制角标 battleMovePickerHtml ---------------- */

describe('battleMovePickerHtml 克制角标', () => {
  function extractFn(src, sig) {
    const start = src.indexOf(sig);
    assert.ok(start >= 0, sig + ' not found in app.js.orig');
    let i = src.indexOf('{', start);
    let depth = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
    }
    throw new Error(sig + ' braces not balanced');
  }
  function makePicker(battleView, gymStages, battleLocal) {
    const ctx = {
      window: { _battle: { view: battleView }, _gymPage: { status: { stages: gymStages } }, BattleLocal: battleLocal },
      BattleLocal: battleLocal,
      tr: (zh) => zh,
      esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
      moveIconSrc: (m) => `/img/${m.type}.webp`,
    };
    ctx.window.window = ctx.window;
    vm.createContext(ctx);
    vm.runInContext(`${extractFn(APP_SRC, 'function battleMovePickerHtml(moves, disabledMove) {')}\nthis.__picker = battleMovePickerHtml;`, ctx);
    return ctx.__picker;
  }
  const BL = { typeMultOfficialMulti: M.typeMultOfficialMulti };
  const moves = [
    { name: '火花', type: '火', damage_class: '特殊', power: 40 },
    { name: '水枪', type: '水', damage_class: '特殊', power: 40 },
    { name: '电击', type: '电', damage_class: '特殊', power: 40 },
    { name: '青草搅拌器', type: '草', damage_class: '特殊', power: 65 },
    { name: '撒菱', type: '地面', damage_class: '变化', power: 0 },
  ];
  const gymView = (defTypes) => ({
    mode: 'gym', stage: 1, status: 'active',
    sides: {
      A: { activeIdx: 0, pets: [{ name: '主宠', moves }] },
      B: { activeIdx: 0, pets: [{ name: '馆主宠', no: 95, defTypes }] },
    },
  });
  const stagesTier1 = [{ stage: 1, tier: 1 }];
  const stagesTier0 = [{ stage: 1, tier: 0 }];
  const starCount = (html) => (html.match(/supereff-tag/g) || []).length;

  test('Tier 1：拔群招有 ★，非拔群无 ★（电/草克水，火/水不克水）', () => {
    const pick = makePicker(gymView(['水']), stagesTier1, BL);
    const html = pick(moves);
    assert.equal(starCount(html), 2, html);
  });

  test('双属性乘法：草 vs 水/飞行 = 1x 不标；电 vs 水/飞行 = 4x 标', () => {
    const pick = makePicker(gymView(['水', '飞行']), stagesTier1, BL);
    const html = pick(moves);
    // 火 0.5x（水 0.5×飞行 1）、水 0.5x、电 4x、草 1x（水 2×飞行 0.5）、撒菱变化招不标
    assert.equal(starCount(html), 1, html);
  });

  test('变化招不标（撒菱地面 2x 克火也不标）', () => {
    const pick = makePicker(gymView(['火']), stagesTier1, BL);
    const html = pick(moves);
    // 地面 2x 克火，但撒菱是变化招；水 2x 克火应标 → 只有水枪 1 个 ★
    assert.equal(starCount(html), 1, html);
  });

  test('Tier 0：拔群也不标', () => {
    const pick = makePicker(gymView(['水']), stagesTier0, BL);
    assert.equal(starCount(pick(moves)), 0);
  });

  test('PvP：拔群也不标', () => {
    const v = gymView(['水']); v.mode = 'pvp';
    const pick = makePicker(v, stagesTier1, BL);
    assert.equal(starCount(pick(moves)), 0);
  });

  test('引擎未加载时不标、不报错', () => {
    const pick = makePicker(gymView(['水']), stagesTier1, null);
    assert.equal(starCount(pick(moves)), 0);
  });

  test('对方换宠后重算（defTypes 变了，角标跟着变）', () => {
    const ctx = {
      window: { _battle: { view: gymView(['水']) }, _gymPage: { status: { stages: stagesTier1 } }, BattleLocal: BL },
      BattleLocal: BL,
      tr: (zh) => zh,
      esc: (s) => String(s),
      moveIconSrc: (m) => `/img/${m.type}.webp`,
    };
    ctx.window.window = ctx.window;
    vm.createContext(ctx);
    vm.runInContext(`${extractFn(APP_SRC, 'function battleMovePickerHtml(moves, disabledMove) {')}\nthis.__picker = battleMovePickerHtml;`, ctx);
    assert.equal(starCount(ctx.__picker(moves)), 2);
    ctx.window._battle.view = gymView(['火']);
    assert.equal(starCount(ctx.__picker(moves)), 1); // 只有水枪 2x 克火
  });

  test('横幅：stageCard 里 tier=1 时有“博士的战术放大镜”，且在馆主狠话前面', () => {
    const i = APP_SRC.indexOf('博士的战术放大镜');
    assert.ok(i >= 0, 'banner text missing');
    const seg = APP_SRC.slice(i - 200, i + 120);
    assert.ok(seg.includes('s.tier === 1'), 'banner must be gated on s.tier === 1');
    assert.ok(APP_SRC.indexOf('preBattleHint', i) > i, 'banner should sit before preBattleHint');
  });

  test('Tier 2 不存在：calcDamage 不读连败、角标函数不含伤害倍率', () => {
    const serverSrc = readBackendSource();
    const cdStart = serverSrc.indexOf('function calcDamage(');
    assert.ok(cdStart >= 0);
    let i = serverSrc.indexOf('{', cdStart);
    let depth = 0;
    let cdEnd = -1;
    for (let j = i; j < serverSrc.length; j++) {
      if (serverSrc[j] === '{') depth++;
      else if (serverSrc[j] === '}') { depth--; if (depth === 0) { cdEnd = j + 1; break; } }
    }
    const cdBody = serverSrc.slice(cdStart, cdEnd);
    assert.ok(!/streak|failStreak/i.test(cdBody), 'calcDamage must not read streak');
    const pickerSrc = extractFn(APP_SRC, 'function battleMovePickerHtml(moves, disabledMove) {');
    assert.ok(!/1\.25|damageMult|firstMonEndure/i.test(pickerSrc), 'no Tier 2 in picker');
  });
});
