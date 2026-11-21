/* 战斗系统集成测试：node --test tests/battle.test.mjs
 * harness 同 subjects.test（node:sqlite 内存库＋迁移 0001–0005），时间用 TEST_MODE 的
 * debug_day_offset 拨到目标星期（周三=非周末、周六=周末），打卡天数用已通过行作 fixture。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0019_evo_items.sql', '0043_pet_instances_ability.sql'];

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
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '1111'), c2: await childCookie(2, '2222') };
}

/* 真实上海日期（不能用 M.shDateStr——它读的是模块内虚拟时钟，拨过一次后基准会漂移） */
function realTodayStr() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}
/* 把虚拟日期拨到「从今天起最近的某个星期几」（0=周日 … 6=周六），返回该日期与该周周一 */
function gotoWeekday(targetDow) {
  const todayStr = realTodayStr();
  const [y, m, d] = todayStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = (targetDow - dow + 7) % 7;
  raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset',?)").run(String(delta));
  const dateStr = M.addDays(todayStr, delta);
  return { dateStr, weekStart: M.weekStartMon(dateStr) };
}
function seedApprovedDays(childId, weekStart, n = 4) {
  for (let i = 0; i < n; i++) {
    raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
      VALUES(?,?, '["语文"]','语文','10:00',1,0,'approved',15,'10:05')`).run(childId, M.addDays(weekStart, i));
  }
}
function setXp(childId, xp) { raw.prepare('UPDATE children SET total_xp=? WHERE id=?').run(xp, childId); }
function giveDex(childId, key) {
  raw.prepare("INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,'2026-01-01')").run(childId, key);
}

/* 打完一场闯关（始终选当前出战宠威力最大的招式；不能出招的回合传 null） */
/* 道馆改版后的合理策略（与定参模拟 sim-gym-rework 的玩家口径一致）：
 * 贪心选期望伤害（威力×命中率×克制）最高的非变化招；主宠残血 <35% 且备战状态明显更好时换宠；
 * 馆主已蓄势且其一击期望可击倒我方上场宠时，有 shell 用 shell、无 shell 用 weak 保命。 */
const expPower = (m) => m.power * ((M.officialAccuracy(m.name) ?? 100) / 100); // 期望威力（命中率加权）
async function playGymToEnd(cookie, battleId, view) {
  let v = view;
  let rewards = null;
  let guard = 0;
  while (v.status === 'active' && guard++ < 120) {
    const sideA = v.sides.A;
    const pet = sideA.pets[sideA.activeIdx];
    const bossPet = v.sides.B.pets[v.sides.B.activeIdx];
    let body = null;
    if (pet.key === 'main' && pet.hp / pet.maxHp < 0.35) {
      const bi = sideA.pets.findIndex((p, i) => i !== sideA.activeIdx && !p.fainted);
      if (bi >= 0 && sideA.pets[bi].hp / sideA.pets[bi].maxHp > pet.hp / pet.maxHp + 0.2) body = { battleId, swapToIdx: bi };
    }
    if (!body) {
      let moveName = null;
      if (v.fx && v.fx.B && v.fx.B.charge) {
        const maxEv = Math.max(...bossPet.moves.map((m) => m.power * (0.5 + 0.05 * bossPet.level) * M.typeMultOfficial(m.type, pet.type))) * 1.5;
        if (pet.hp <= maxEv) {
          const sh = pet.moves.find((m) => M.moveEffectOf(m.name) === 'shell');
          const wk = pet.moves.find((m) => M.moveEffectOf(m.name) === 'weak');
          moveName = (sh || wk || {}).name || null;
        }
      }
      if (!moveName) {
        const dmgMoves = pet.moves.filter((m) => { const e = M.moveEffectOf(m.name); return !e || e === 'drain'; });
        const pool = dmgMoves.length ? dmgMoves : pet.moves;
        moveName = pool.reduce((a, b) => (expPower(b) * M.typeMultOfficialMulti(b.type, M.bossDefTypes(bossPet.no)) > expPower(a) * M.typeMultOfficialMulti(a.type, M.bossDefTypes(bossPet.no)) ? b : a), pool[0]).name;
      }
      body = { battleId, moveName };
    }
    const r = await call('/api/battle/move', { method: 'POST', cookie, body });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    if (r.j.rewards) rewards = r.j.rewards;
    v = r.j.battle;
  }
  assert.ok(guard < 120, '对战应在有限回合内结束');
  return { view: v, rewards };
}

/* 反复挑战直到通关：改版定参下单场胜率约 40–50%（设计目标），产品口径是
 * 「推荐阵容＋合理策略反复挑战可通关」，而非单场必胜——断言按此口径，不放水。 */
async function clearGymStage(cookie, stage, benchNo, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const body = { childId: 1, stage };
    if (benchNo) body.benchNo = benchNo;
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie, body });
    assert.equal(start.j.ok, true, `stage ${stage} 开局失败：${JSON.stringify(start.j)}`);
    const last = await playGymToEnd(cookie, start.j.battle.battleId, start.j.battle);
    if (last.view.winnerChildId === 1) return last;
  }
  assert.fail(`stage ${stage} 在 ${maxAttempts} 次挑战内应能通关`);
}

/* ---------------- 引擎（纯函数） ---------------- */

describe('战斗引擎（纯函数）', () => {
  const pet = (name, type, hp, moves, level = 5) => ({ key: name, name, type, no: null, img: null, level, maxHp: hp, hp, moves });
  const side = (childId, childName, pets) => ({ childId, childName, battleLevel: 5, activeIdx: 0, pets });

  const __eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || '断言失败'}：期望 ${JSON.stringify(b)}，实际 ${JSON.stringify(a)}`); };
  const __ok = (v, msg) => { if (!v) throw new Error(msg || '断言失败：期望为真'); };
  const __evs = (r) => (Array.isArray(r) ? r : (r && Array.isArray(r.events) ? r.events : []));
  const __fx = (st, s) => M.fxOf(st, s) || {};
  const __half = () => 0.5;

  test('效果全流程：弱化 / 蓄力 / 烟幕落空 / 缩壳', () => {
    const petA = pet('皮丘', '电', 200, [
      { name: '撒娇', type: '电', power: 55 },
      { name: '电击', type: '电', power: 50 },
      { name: '蹭蹭脸颊', type: '电', power: 61 },
      { name: '缩入壳中', type: '电', power: 40 },
    ]);
    const petB = pet('小火龙', '火', 200, [
      { name: '火花', type: '火', power: 40 },
      { name: '烟幕', type: '火', power: 43 },
    ]);
    const st = M.createBattleState({ mode: 'pvp', firstSide: 'A', sides: { A: side(1, '大宝', [petA]), B: side(2, '小宝', [petB]) } });
    const hpA = () => st.sides.A.pets[st.sides.A.activeIdx].hp;
    const hpB = () => st.sides.B.pets[st.sides.B.activeIdx].hp;

    M.applyBattleAction(st, 'A', '撒娇', __half);
    __eq(hpB(), 200, '撒娇不造成伤害');
    __ok(__fx(st, 'B').weak, 'B 应被弱化');
    __eq(st.turn, 'B', '撒娇后轮到 B');

    M.applyBattleAction(st, 'B', '火花', __half);
    __eq(hpA(), 182, '弱化后火花伤害 18');
    __ok(!__fx(st, 'B').weak, '弱化应消耗');

    M.applyBattleAction(st, 'A', '蹭蹭脸颊', __half);
    __eq(hpB(), 200, '蹭蹭脸颊不造成伤害');
    __ok(__fx(st, 'A').charge, 'A 应蓄力');

    M.applyBattleAction(st, 'B', '火花', __half);
    __eq(hpA(), 152, '火花伤害 30');

    M.applyBattleAction(st, 'A', '电击', __half);
    __eq(hpB(), 143, '蓄力电击伤害 57');
    __ok(!__fx(st, 'A').charge, '蓄力应消耗');

    M.applyBattleAction(st, 'B', '烟幕', __half);
    __ok(__fx(st, 'A').smoke, 'A 应被烟幕');
    __eq(hpA(), 152, '烟幕不造成伤害');

    const rMiss = M.applyBattleAction(st, 'A', '电击', () => 0.3);
    __eq(hpB(), 143, '烟幕落空不扣血');
    __ok(__evs(rMiss).some((e) => e && e.type === 'miss'), '应有 miss 事件');
    __ok(!__fx(st, 'A').smoke, '烟幕应消耗');

    M.applyBattleAction(st, 'B', '火花', __half);
    __eq(hpA(), 122, '火花伤害 30');

    M.applyBattleAction(st, 'A', '缩入壳中', __half);
    __ok(__fx(st, 'A').shell, 'A 应缩壳');

    M.applyBattleAction(st, 'B', '火花', __half);
    __eq(hpA(), 107, '缩壳后火花伤害 15');
    __ok(!__fx(st, 'A').shell, '缩壳应消耗');
  });

  test('吸取即时结算：寄生种子回复一半伤害', () => {
    const petA = pet('妙蛙种子', '草', 200, [{ name: '寄生种子', type: '草', power: 40 }]);
    const petB = pet('妙蛙种子', '草', 200, [{ name: '撞击', type: '草', power: 35 }]);
    const st = M.createBattleState({ mode: 'pvp', firstSide: 'A', sides: { A: side(1, '大宝', [petA]), B: side(2, '小宝', [petB]) } });
    st.sides.A.pets[st.sides.A.activeIdx].hp = 100;
    const r = M.applyBattleAction(st, 'A', '寄生种子', __half);
    __eq(st.sides.B.pets[st.sides.B.activeIdx].hp, 170, 'B 受 30 伤害');
    __eq(st.sides.A.pets[st.sides.A.activeIdx].hp, 115, 'A 回复 15');
    const atk = __evs(r).find((e) => e && e.type === 'attack');
    __ok(atk, '应有 attack 事件');
    __ok(Array.isArray(atk.mods) && atk.mods.includes('吸取回复 15'), 'mods 应含 吸取回复 15');
  });

  test('吸取预演路径：stagePvpAttack + resolveStagedAttack', () => {
    const petA = pet('妙蛙种子', '草', 200, [{ name: '寄生种子', type: '草', power: 40 }]);
    const petB = pet('妙蛙种子', '草', 200, [{ name: '撞击', type: '草', power: 35 }]);
    const st = M.createBattleState({ mode: 'pvp', firstSide: 'A', sides: { A: side(1, '大宝', [petA]), B: side(2, '小宝', [petB]) } });
    st.sides.A.pets[st.sides.A.activeIdx].hp = 100;
    __eq(st.turn, 'A', '先攻方 A 直接开局');
    const staged = M.stagePvpAttack(st, 'A', '寄生种子', () => 0.5);
    __eq(staged.drain, true, 'staged.drain 应为 true');
    __eq(staged.dmg, 30, 'staged.dmg 应为 30');
    M.resolveStagedAttack(st, { ...staged, attacker: 'A' }, { skipped: true });
    __eq(st.sides.B.pets[st.sides.B.activeIdx].hp, 170, 'B 受 30 伤害');
    __eq(st.sides.A.pets[st.sides.A.activeIdx].hp, 115, 'A 回复 15');
  });

  test('品类守恒回归：Lv3 弱化 / Lv5 蓄力烟幕缩壳 / 特例', () => {
    for (const line of Object.values(M.LINES)) {
      for (const mv of line.moves || []) {
        const [lv, name] = mv;
        if (lv === 3) __eq(M.moveEffectOf(name), 'weak', `Lv3 招式 ${name} 应为 weak`);
        if (lv === 5) __ok(['charge', 'smoke', 'shell'].includes(M.moveEffectOf(name)), `Lv5 招式 ${name} 效果应为 charge/smoke/shell，实际 ${M.moveEffectOf(name)}`);
      }
    }
    __eq(M.moveEffectOf('影子分身'), 'smoke', '影子分身');
    __eq(M.moveEffectOf('寄生种子'), 'drain', '寄生种子');
    __eq(M.moveEffectOf('求雨'), 'charge', '求雨');
    __eq(M.moveEffectOf('电击'), null, '电击');
  });

  test('属性克制 ×2（只做弱点）：电克水、水克岩石、龙克龙；无克制 ×1', () => {
    assert.equal(M.typeMult('电', '水'), 2);
    assert.equal(M.typeMult('水', '岩石'), 2);
    assert.equal(M.typeMult('水', '地面'), 2);
    assert.equal(M.typeMult('火', '草'), 2);
    assert.equal(M.typeMult('地面', '电'), 2);
    assert.equal(M.typeMult('岩石', '飞行'), 2);
    assert.equal(M.typeMult('龙', '龙'), 2);
    assert.equal(M.typeMult('电', '火'), 1);
    assert.equal(M.typeMult('普通', '岩石'), 1);
    const mid = () => 0.5; // 随机因子恰为 1.0
    const weak = M.calcDamage({ name: '电击', type: '电', power: 50 }, { level: 10, type: '电', stats: null }, { level: 10, type: '水', stats: null }, mid);
    assert.equal(weak.mult, 2);
    assert.equal(weak.dmg, 100); // 50 × (0.5+0.05×10) × 2 × 1.0
    const normal = M.calcDamage({ name: '电击', type: '电', power: 50 }, { level: 10, type: '电', stats: null }, { level: 10, type: '火', stats: null }, mid);
    assert.equal(normal.mult, 1);
    assert.equal(normal.dmg, 50);
  });

  test('馆主招式按名定属性：落石是岩石系，克火命中时日志含「效果拔群」（2026-11-17 数据集校对）', () => {
    const cfg = M.GYM_STAGES.find((g) => g.stage === 1);
    // 与 apiBattleGymStart 相同的组装方式（2026-11-17 8 关扩围：多只队伍，取王牌=队尾的招式）
    const aceMoves = cfg.bossTeam[cfg.bossTeam.length - 1].moves;
    const boss = M.makePet({
      key: 'boss', name: '大岩蛇', type: '岩石', level: cfg.bossLevel, hpMult: cfg.hpMult,
      moves: aceMoves.map(([n, t, p]) => ({ name: n, type: t, power: p })),
    });
    assert.equal(boss.moves.find((m) => m.name === '落石').type, '岩石');
    assert.equal(boss.moves.find((m) => m.name === '击落').type, '岩石');
    assert.equal(boss.moves.find((m) => m.name === '撞击').type, '普通');
    assert.equal(boss.maxHp, Math.round(M.battleMaxHp(cfg.bossLevel) * cfg.hpMult));
    // 全部关卡全部馆主招式都带合法属性（[名称, 属性, 威力] 三元组；官方 18 属性均合法——8 关队伍含钢（铁尾/修长之角）、虫（虫鸣）等扩展属性）
    for (const g of M.GYM_STAGES) for (const m of g.bossTeam) for (const [n, t, p] of m.moves) {
      assert.ok(M.TYPES18.includes(t), `${n} 属性 ${t} 不在官方 18 属性集`);
      assert.ok(p > 0);
    }
    const mine = pet('小火龙', '火', 500, [{ name: '火花', type: '火', power: 40 }]);
    const st = M.createBattleState({ mode: 'gym', firstSide: 'A', sides: { A: side(1, '大宝', [mine]), B: side(null, '馆主', [boss]) } });
    M.applyBattleAction(st, 'A', '火花', () => 0.5); // 先攻方首回合跳过
    const r = M.applyBattleAction(st, 'B', '落石', () => 0.5);
    const atk = r.events.find((e) => e.type === 'attack');
    assert.equal(atk.mult, 2); // 岩石克火
    assert.equal(atk.superEffective, true);
    assert.ok(atk.text.includes('效果拔群'), `日志应含效果拔群：${atk.text}`);
    assert.equal(atk.dmg, 80); // 官方落石 50 × (0.5+0.05×6) × 2 × 1.0 = 80
    assert.equal(st.sides.A.pets[0].hp, 500 - 80);
  });

  test('先攻方第一回合可直接出招（2026-11-16 用户定：取消热身，与道馆一致）', () => {
    const a = pet('皮丘', '电', 120, [{ name: '电击', type: '电', power: 50 }]);
    const b = pet('可达鸭', '水', 120, [{ name: '头痛水花', type: '水', power: 46 }]);
    const st = M.createBattleState({ mode: 'pvp', firstSide: 'A', sides: { A: side(1, '大宝', [a]), B: side(2, '小宝', [b]) } });
    assert.equal(M.canSideAttack(st, 'A'), true);
    const r = M.applyBattleAction(st, 'A', '电击', () => 0.5);
    assert.equal(r.events[0].type, 'attack');
    assert.ok(st.sides.B.pets[0].hp < 120); // 造成伤害，不再跳过
    assert.equal(st.turn, 'B');
    assert.equal(M.canSideAttack(st, 'B'), true);
    const r2 = M.applyBattleAction(st, 'B', '头痛水花', () => 0.5);
    assert.equal(r2.events[0].type, 'attack');
    assert.ok(st.sides.A.pets[0].hp < 120);
    assert.equal(M.canSideAttack(st, 'A'), true);
  });

  test('昏厥自动换备战宠；击倒全部出战宠获胜', () => {
    const a = pet('喷火龙', '火', 500, [{ name: '大字爆炎', type: '火', power: 90 }], 15);
    const b1 = pet('走路草1', '草', 10, [{ name: '飞叶小刀', type: '草', power: 40 }]);
    const b2 = pet('走路草2', '草', 30, [{ name: '飞叶小刀', type: '草', power: 40 }]);
    const st = M.createBattleState({ mode: 'gym', firstSide: 'B', sides: { A: side(1, '大宝', [a]), B: side(null, '馆主', [b1, b2]) } });
    // B 先攻 → 跳过；A 出招（火克草 ×2）打倒第一只 → 自动换第二只
    M.applyBattleAction(st, 'B', '飞叶小刀', () => 0.5);
    const r = M.applyBattleAction(st, 'A', '大字爆炎', () => 0.5);
    assert.ok(r.events.some((e) => e.type === 'faint'));
    assert.ok(r.events.some((e) => e.type === 'swap'));
    assert.equal(st.sides.B.activeIdx, 1);
    assert.equal(st.winner, null);
    // B 出招后 A 再打倒第二只 → A 获胜
    M.applyBattleAction(st, 'B', '飞叶小刀', () => 0.5);
    const r2 = M.applyBattleAction(st, 'A', '大字爆炎', () => 0.5);
    assert.ok(r2.events.some((e) => e.type === 'win'));
    assert.equal(st.winner, 'A');
  });

  test('等级压平：宠物等级与 HP 按压平等级重算（HP 走 PvP 专用 pvpMaxHp），招式不变', () => {
    const s = side(1, '大宝', [pet('雷丘', '电', M.battleMaxHp(12), [{ name: '打雷', type: '电', power: 91 }], 12)]);
    M.flattenSideLevel(s, 5);
    assert.equal(s.battleLevel, 5);
    assert.equal(s.pets[0].level, 5);
    assert.equal(s.pets[0].maxHp, M.pvpMaxHp(5));
    assert.equal(s.pets[0].hp, M.pvpMaxHp(5));
    assert.equal(s.pets[0].moves[0].name, '打雷');
  });

  test('NaN 防护：rng 返回 undefined/NaN 或 rng 不是函数时 calcDamage 抛 TypeError', () => {
    assert.throws(() => M.calcDamage({ name: '电击', type: '电', power: 50 }, { level: 5, type: '电', stats: null }, { level: 5, type: '水', stats: null }, () => undefined), TypeError);
    assert.throws(() => M.calcDamage({ name: '电击', type: '电', power: 50 }, { level: 5, type: '电', stats: null }, { level: 5, type: '水', stats: null }, () => NaN), TypeError);
    assert.throws(() => M.calcDamage({ name: '电击', type: '电', power: 50 }, { level: 5, type: '电', stats: null }, { level: 5, type: '水', stats: null }, null), TypeError);
  });

  test('NaN 防护：招式 power 缺失/非法时 calcDamage 返回 INVALID_MOVE_POWER，不产生 NaN 伤害', () => {
    assert.deepEqual(M.calcDamage({ name: '电击', type: '电' }, { level: 5, type: '电', stats: null }, { level: 5, type: '水', stats: null }, () => 0.5), { error: 'INVALID_MOVE_POWER' });
    assert.deepEqual(M.calcDamage({ name: '电击', type: '电', power: 0 }, { level: 5, type: '电', stats: null }, { level: 5, type: '水', stats: null }, () => 0.5), { error: 'INVALID_MOVE_POWER' });
    assert.deepEqual(M.calcDamage({ name: '电击', type: '电', power: 'abc' }, { level: 5, type: '电', stats: null }, { level: 5, type: '水', stats: null }, () => 0.5), { error: 'INVALID_MOVE_POWER' });
    assert.deepEqual(M.calcDamage(null, { level: 5, type: '水', stats: null }, { level: 5, type: '水', stats: null }, () => 0.5), { error: 'INVALID_MOVE_POWER' });
  });

  test('makePet：字符串 power 规范成数字；坏数据（空招式/无名招式/非法 power/未知属性）抛错', () => {
    const p = M.makePet({ key: 'x', name: '测试宠', type: '电', level: 5, moves: [{ name: '电击', type: '电', power: '50' }] });
    assert.equal(p.moves[0].power, 50);
    assert.equal(typeof p.moves[0].power, 'number');
    assert.throws(() => M.makePet({ key: 'x', name: 'x', type: '电', level: 5, moves: [] }), TypeError);
    assert.throws(() => M.makePet({ key: 'x', name: 'x', type: '电', level: 5, moves: [{ type: '电', power: 50 }] }), TypeError);
    assert.throws(() => M.makePet({ key: 'x', name: 'x', type: '电', level: 5, moves: [{ name: '电击', type: '电', power: -3 }] }), TypeError);
    assert.throws(() => M.makePet({ key: 'x', name: 'x', type: '暗影', level: 5, moves: [{ name: '撞击', type: '普通', power: 35 }] }), TypeError);
    // 2026-11-17 方案 A：幽灵现为合法单属性（TYPES18），不再抛错
    assert.doesNotThrow(() => M.makePet({ key: 'x', name: 'x', type: '幽灵', level: 5, moves: [{ name: '撞击', type: '普通', power: 35 }] }));
  });

  test('createBattleState：firstSide 非法（不是 A/B）抛错', () => {
    assert.throws(() => M.createBattleState({ mode: 'pvp', firstSide: 'C', sides: { A: null, B: null } }), TypeError);
    assert.throws(() => M.createBattleState({ mode: 'pvp', firstSide: undefined, sides: { A: null, B: null } }), TypeError);
  });

  test('空队/越界加固：activePetOf 返回 undefined、applyBattleAction 返回 NO_ACTIVE_PET 不抛错', () => {
    const foePet = pet('可达鸭', '水', 120, [{ name: '头痛水花', type: '水', power: 46 }]);
    // A 空队：A 先攻直接出招 → 己方无可用宠 NO_ACTIVE_PET（2026-11-16 取消热身，不再跳过）
    const st = M.createBattleState({ mode: 'pvp', firstSide: 'A', sides: { A: side(1, '大宝', []), B: side(2, '小宝', [foePet]) } });
    assert.equal(M.activePetOf(st, 'A'), undefined);
    const r = M.applyBattleAction(st, 'A', '电击', () => 0.5);
    assert.equal(r.error, 'NO_ACTIVE_PET');
    // activeIdx 越界：B 先攻直接出招 → 己方无可用宠 NO_ACTIVE_PET
    const oob = side(2, '小宝', [pet('可达鸭', '水', 120, [{ name: '头痛水花', type: '水', power: 46 }])]);
    oob.activeIdx = 99;
    const st2 = M.createBattleState({ mode: 'pvp', firstSide: 'B', sides: { A: side(1, '大宝', [pet('皮丘', '电', 120, [{ name: '电击', type: '电', power: 50 }])]), B: oob } });
    assert.equal(M.activePetOf(st2, 'B'), undefined);
    const r2 = M.applyBattleAction(st2, 'B', '头痛水花', () => 0.5);
    assert.equal(r2.error, 'NO_ACTIVE_PET');
    // 目标缺失：A 出招时对方队伍为空 → NO_ACTIVE_PET
    const st3 = M.createBattleState({ mode: 'pvp', firstSide: 'A', sides: { A: side(1, '大宝', [pet('皮丘', '电', 120, [{ name: '电击', type: '电', power: 50 }])]), B: side(2, '小宝', []) } });
    const r3 = M.applyBattleAction(st3, 'A', '电击', () => 0.5);
    assert.equal(r3.error, 'NO_ACTIVE_PET');
  });

  test('已污染状态：target.hp 为 NaN 时按 0 结算，走昏厥/胜负流程且 hp 回到有限数', () => {
    const a = pet('喷火龙', '火', 500, [{ name: '大字爆炎', type: '火', power: 90 }], 15);
    const b = pet('走路草', '草', 30, [{ name: '飞叶小刀', type: '草', power: 40 }]);
    b.hp = NaN;
    const st = M.createBattleState({ mode: 'gym', firstSide: 'A', sides: { A: side(1, '大宝', [a]), B: side(null, '馆主', [b]) } });
    // 2026-11-16 取消热身：A 先攻直接出招（B 的 NaN 血按 0 结算、昏厥、A 获胜）；旧写法先让 B 空过热身
    const r = M.applyBattleAction(st, 'A', '大字爆炎', () => 0.5);
    assert.ok(r.events.some((e) => e.type === 'attack'));
    assert.ok(Number.isFinite(st.sides.B.pets[0].hp));
    assert.equal(st.sides.B.pets[0].hp, 0);
    assert.equal(st.winner, 'A');
  });

  test('applyBattleAction：招式 power 损坏时返回 INVALID_MOVE_POWER 且不推进回合、不扣血', () => {
    const a = pet('皮丘', '电', 120, [{ name: '电击', type: '电', power: 50 }]);
    const b = pet('可达鸭', '水', 120, [{ name: '头痛水花', type: '水', power: 46 }]);
    const st = M.createBattleState({ mode: 'pvp', firstSide: 'A', sides: { A: side(1, '大宝', [a]), B: side(2, '小宝', [b]) } });
    st.sides.A.pets[0].moves[0].power = NaN; // 模拟已存档的坏招式数据
    const turnNoBefore = st.turnNo;
    const r = M.applyBattleAction(st, 'A', '电击', () => 0.5);
    assert.equal(r.error, 'INVALID_MOVE_POWER');
    assert.equal(st.turn, 'A');
    assert.equal(st.turnNo, turnNoBefore);
    assert.equal(st.sides.B.pets[0].hp, 120);
  });

  test('防守答题：预演不扣血不换回合，答错全额、格挡减半、闪避归零', () => {
    const mk = () => {
      const a = pet('皮丘', '电', 120, [{ name: '电击', type: '电', power: 50 }]);
      const b = pet('小火龙', '火', 120, [{ name: '火花', type: '火', power: 40 }]);
      const st = M.createBattleState({ mode: 'pvp', firstSide: 'A', sides: { A: side(1, '大宝', [a]), B: side(2, '小宝', [b]) } });
      return st;
    };
    // 答错 → 全额伤害 + 回合推进
    const st1 = mk();
    const s1 = M.stagePvpAttack(st1, 'A', '电击', () => 0.5);
    assert.ok(!s1.error, JSON.stringify(s1));
    assert.equal(st1.sides.B.pets[0].hp, 120); // 预演不扣血
    assert.equal(st1.turn, 'A'); // 预演不换回合
    const r1 = M.resolveStagedAttack(st1, { attacker: 'A', ...s1 }, { correct: false });
    assert.equal(st1.sides.B.pets[0].hp, 120 - s1.dmg);
    assert.equal(st1.turn, 'B');
    assert.ok(r1.events.some((e) => e.type === 'defense' && e.kind === 'failed'));
    // 格挡 → 减半（向下取整）
    const st2 = mk();
    const s2 = M.stagePvpAttack(st2, 'A', '电击', () => 0.5);
    M.resolveStagedAttack(st2, { attacker: 'A', ...s2 }, { kind: 'block', correct: true });
    assert.equal(st2.sides.B.pets[0].hp, 120 - Math.floor(s2.dmg * 0.5));
    // 闪避 → 0 伤害
    const st3 = mk();
    const s3 = M.stagePvpAttack(st3, 'A', '电击', () => 0.5);
    M.resolveStagedAttack(st3, { attacker: 'A', ...s3 }, { kind: 'dodge', correct: true });
    assert.equal(st3.sides.B.pets[0].hp, 120);
  });
});

/* ---------------- 迁移 0005 ---------------- */

describe('迁移 0005（老数据兼容）', () => {
  test('旧蛋默认 species=151、旧道馆记录与连击不受伤，balls 默认 3', () => {
    const raw2 = new DatabaseSync(':memory:');
    for (const f of MIGRATIONS.slice(0, 4)) {
      raw2.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
    }
    raw2.exec("UPDATE children SET streak=6, last_checkin_date='2026-10-19' WHERE id=1");
    raw2.exec("INSERT INTO sealed_eggs(child_id, awarded_date, unlock_date) VALUES(1, '2026-10-18', '2026-10-25')");
    raw2.exec("INSERT INTO gym_weeks(child_id, week_start, won, egg_awarded, last_battle_at) VALUES(1, '2026-10-12', 1, 1, '2026-10-18')");
    raw2.exec("INSERT INTO gym_battles(child_id, week_start, created_at) VALUES(1, '2026-10-12', 1)");

    raw2.exec(readFileSync(new URL('../migrations/0005_battle.sql', import.meta.url), 'utf8'));

    const egg = raw2.prepare('SELECT species FROM sealed_eggs WHERE id=1').get();
    assert.equal(egg.species, 151); // 旧蛋仍孵梦幻
    const c = raw2.prepare('SELECT balls, streak, total_xp FROM children WHERE id=1').get();
    assert.equal(c.balls, 3);
    assert.equal(c.streak, 6); // 连击计数不受影响
    assert.equal(raw2.prepare('SELECT COUNT(*) n FROM gym_weeks WHERE won=1').get().n, 1);
    assert.equal(raw2.prepare('SELECT COUNT(*) n FROM gym_battles').get().n, 1);
    assert.ok(raw2.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='battles'").get());
    assert.ok(raw2.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gym_progress'").get());
  });

  test('旧蛋（species=151）到期仍孵出梦幻入图鉴 rare:151', async () => {
    const { c1 } = await setup();
    raw.exec("INSERT INTO sealed_eggs(child_id, awarded_date, unlock_date) VALUES(1, '2026-01-01', '2026-01-08')");
    const r = await call('/api/eggs', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.justHatched.length, 1);
    assert.equal(r.j.justHatched[0].pokemon.no, 151);
    const dex = raw.prepare("SELECT entry_key FROM pokedex WHERE child_id=1 AND entry_key='rare:151'").get();
    assert.ok(dex);
  });
});

/* ---------------- 道馆闯关 ---------------- */

describe('道馆闯关梯子', () => {
  // 全面解锁（2026-10-28）：测试站门槛放行，旧“被拒”断言改为断言放行；正式模式周末门仍在，由 tests/test-mode-unlock.test.mjs 覆盖。
  test('测试站：非周末也可挑战（门槛放行）', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(3); // 周三
    seedApprovedDays(1, weekStart, 4);
    setXp(1, 1500);
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
  });

  test('测试站：打卡不足 4 天也可挑战（门槛放行）', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6); // 周六
    seedApprovedDays(1, weekStart, 2);
    setXp(1, 1500);
    const few = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1 } });
    assert.equal(few.j.ok, true, JSON.stringify(few.j));
  });

  test('测试站：低等级、无前置通关也可挑战（门槛放行）', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    // 手工铺 4 天（周一至周四）
    for (let i = 0; i < 4; i++) {
      raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
        VALUES(1, ?, '["语文"]','语文','10:00',1,0,'approved',15,'10:05')`).run(M.addDays(weekStart, i));
    }
    setXp(1, 100); // Lv.2 < 5
    const low = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1 } });
    assert.equal(low.j.ok, true, JSON.stringify(low.j));
    setXp(1, 1500); // Lv.9：过第 2 关等级门槛（Lv.8），但没通第 1 关
    const locked = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 2 } });
    assert.equal(locked.j.ok, true, JSON.stringify(locked.j));
  });

  test('首通第 1 关：发 species=143 封印蛋 + 点亮徽章 + 总经验不变；重打不重发', async () => {
    const { pc, c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    setXp(1, 1500); // Lv.9
    giveDex(1, 'wild:54'); // 可达鸭作备战
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, benchNo: 54 } });
    assert.equal(start.j.ok, true, JSON.stringify(start.j));
    assert.equal(start.j.battle.sides.A.pets.length, 2); // 主宠 + 备战
    assert.equal(start.j.battle.sides.B.pets.length, 2); // 馆主 2 只（2026-11-17 8 关扩围：S1 小拳石＋大岩蛇）
    // 改版定参下单场非必胜：以推荐阵容（此处 Lv.9 主宠＋可达鸭备战，超门槛配）反复挑战至首通
    const { view, rewards } = await clearGymStage(c1, 1, 54);
    assert.equal(view.status, 'finished');
    assert.equal(view.winnerChildId, 1);
    assert.equal(rewards.firstClear, true);
    assert.equal(rewards.eggSpecies, 143);

    const eggs = await call('/api/eggs', { method: 'POST', cookie: c1, body: { childId: 1 } });
    const egg143 = eggs.j.eggs.filter((e) => e.species === 143);
    assert.equal(egg143.length, 1);
    assert.equal(egg143[0].hatched, false);

    const st = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(st.j.stages[0].state, 'cleared');
    assert.equal(st.j.badges[0].lit, true);
    assert.equal(st.j.stages[1].state, 'open');

    const detail = await call('/api/child?id=1', { cookie: pc });
    assert.equal(detail.j.child.totalXp, 1500); // 战斗不发经验

    // 重打第 1 关获胜：不再发蛋（双属性后皮丘线单主宠对大岩蛇免疫打不动，重打改带可达鸭备战；断言口径不变）
    const second = await clearGymStage(c1, 1, 54);
    assert.equal(second.rewards.firstClear, false);
    const eggs2 = await call('/api/eggs', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(eggs2.j.eggs.filter((e) => e.species === 143).length, 1);
  });

  test('挑战失败不发奖励（低等级硬闯高关不可达，此处以弃赛模拟未完成）', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    setXp(1, 1500);
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1 } });
    const ab = await call('/api/battle/abandon', { method: 'POST', cookie: c1, body: { battleId: start.j.battle.battleId } });
    assert.equal(ab.j.ok, true);
    const st = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(st.j.stages[0].state, 'open'); // 没通关
    const eggs = await call('/api/eggs', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(eggs.j.eggs.length, 0);
  });

  test('前三关通关（设计阵容）：每关蛋 species 正确', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    setXp(1, M.xpForLevel(14)); // Lv.14，过全部等级门槛
    /* S4 已从本测试移出：设计备战波波 16 在等比换算新模型下无道具单场 0.0%
     *（见 work/sim-scale-1.5-1.8-2.0.txt §七），断言它等于断言不可能；
     * S4 通关＋终奖断言改由 tests/gym-real-teams.test.mjs 的真实队伍梯子测试覆盖
     *（大宝＋飞天螳螂 123，S4 无道具单场约 48.7%，15 次内约 100%）。
     * 本测试只保留 S1–S3 设计阵容＋奖励流断言。 */
    const designBench = { 1: 43, 2: 179, 3: 50 };
    for (const no of Object.values(designBench)) giveDex(1, `wild:${no}`);
    const expectEggs = { 1: 143, 2: 131, 3: 133 };
    for (let stage = 1; stage <= 3; stage++) {
      const { view, rewards } = await clearGymStage(c1, stage, designBench[stage]);
      assert.equal(view.winnerChildId, 1, `stage ${stage} 应获胜`);
      assert.equal(rewards.eggSpecies, expectEggs[stage]);
    }
    const eggs = await call('/api/eggs', { method: 'POST', cookie: c1, body: { childId: 1 } });
    const species = eggs.j.eggs.map((e) => e.species).sort((a, b) => a - b);
    assert.deepEqual(species, [131, 133, 143]);
    const st = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(st.j.clearedCount, 3);
    assert.ok(st.j.badges.filter((b) => b.stage <= 3).every((b) => b.lit));
  });
});

/* ---------------- 兄弟对战 PvP ---------------- */

describe('兄弟对战（PvP）', () => {
  /* 防守挂起时按题库正确答案作答（防守题可能是历史科目题，也可能是 2026-11-09 起混入的脑筋急转弯） */
  async function answerPendingDefense(battleId, view, c1, c2) {
    const qid = view.pending.question.id;
    const row = raw.prepare('SELECT options_json, answer_idx FROM quiz_questions WHERE id=?').get(qid);
    const options = JSON.parse(row.options_json);
    const answerText = options[row.answer_idx];
    const cookie = view.pending.defenderSide === 'A' ? c1 : c2;
    const r = await call('/api/battle/defend', { method: 'POST', cookie, body: { battleId, answerText } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    return r.j.battle;
  }
  /* 需要锁定防守题为指定历史科目题的夹具：先停用谜语，避免约 1/3 概率抽中谜语导致断言失焦
   *（谜语混合路径另由 gate.test.mjs 与下方真实对战谜语防守测试覆盖） */
  function disableRiddles() {
    raw.exec("UPDATE quiz_questions SET active=0 WHERE kind='riddle'");
  }

  async function pvpFixture() {
    const s = await setup();
    const { weekStart } = gotoWeekday(6); // 周六
    seedApprovedDays(1, weekStart, 4);
    seedApprovedDays(2, weekStart, 4);
    setXp(1, M.xpForLevel(12)); // 大宝 Lv.12
    setXp(2, M.xpForLevel(5));  // 小宝 Lv.5
    return s;
  }

  test('平衡调整（2026-10-24／属性成长）：join 后双方 HP 按实际六围 × PvP 倍率（压平 Lv.5：皮卡丘 18×1.4→25，小火龙 18×1.4→25；压平只压等级、不改形态）', async () => {
    const { c1, c2 } = await pvpFixture(); // 大宝 Lv.12 / 小宝 Lv.5 → 压平 5
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    const v = join.j.battle;
    assert.equal(M.pvpMaxHp(5), 168); // round(battleMaxHp(5)=120 × 1.4)，无 stats 回落口径不变
    // 有 stats 的主宠按实际 HP × PvP 倍率：压平只压等级、不改形态——A 大宝 Lv.12 已是皮卡丘(No.25)，压到 Lv.5 仍按皮卡丘算 HP 18 → 25；B 小宝小火龙 Lv.5 HP 18 → 25
    assert.equal(v.sides.A.pets[0].maxHp, Math.round(M.statsFor(25, 5).hp * M.PVP_HP_MULT), 'A 方（皮卡丘 Lv.5）maxHp 应为实际 HP × PvP 倍率');
    assert.equal(v.sides.A.pets[0].hp, Math.round(M.statsFor(25, 5).hp * M.PVP_HP_MULT));
    assert.equal(v.sides.B.pets[0].maxHp, Math.round(M.statsFor(4, 5).hp * M.PVP_HP_MULT), 'B 方（小火龙 Lv.5）maxHp 应为实际 HP × PvP 倍率');
    assert.equal(v.sides.B.pets[0].hp, Math.round(M.statsFor(4, 5).hp * M.PVP_HP_MULT));
    // 全局口径未被带走：battleMaxHp(5) 仍是 120（道馆/合作定参不受影响）
    assert.equal(M.battleMaxHp(5), 120);
  });

  test('测试站：非周末／一方打卡不足也可创建（门槛放行）', async () => {
    const { c1 } = await setup();
    const wed = gotoWeekday(3);
    seedApprovedDays(1, wed.weekStart, 4);
    seedApprovedDays(2, wed.weekStart, 4);
    const wk = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(wk.j.ok, true, JSON.stringify(wk.j));

    const sat = gotoWeekday(6);
    raw.exec('DELETE FROM checkins'); // 周三那段的 fixture 可能与本周重叠，清掉重铺
    // 只给大宝铺本周 4 天（小宝不达标）
    seedApprovedDays(1, sat.weekStart, 4);
    const few = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(few.j.ok, true, JSON.stringify(few.j));
  });

  test('完整对战：密码加入、等级压平、回合鉴权、奖励只给球与冠军且经验不变、测试站下每周可多场', async () => {
    const { pc, c1, c2 } = await pvpFixture();
    giveDex(1, 'wild:39'); // 大宝有收藏宠，小宝没有 → 出战数取较少一方 = 1v1
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1, benchNo: 39 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    assert.equal(create.j.battle.status, 'waiting');

    // 密码错 → 拒
    const wrong = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '9999' } });
    assert.equal(wrong.status, 401);
    // 密码对 → 加入，拿到回合凭证
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    const token = join.j.joinToken;
    assert.ok(token);
    let v = join.j.battle;
    assert.equal(v.status, 'active');
    // 等级压平到较低一方 Lv.5；出战数 1v1
    assert.equal(v.sides.A.pets[0].level, 5);
    assert.equal(v.sides.B.pets[0].level, 5);
    assert.equal(v.sides.A.pets.length, 1);
    assert.equal(v.sides.B.pets.length, 1);

    // 回合鉴权：A 回合时用小宝会话出招 → 403；B 回合时没凭证/错凭证 → 403
    if (v.turn === 'A') {
      const bad = await call('/api/battle/move', { method: 'POST', cookie: c2, body: { battleId, moveName: '电光一闪' } });
      assert.equal(bad.status, 403);
    } else {
      const bad = await call('/api/battle/move', { method: 'POST', cookie: c1, body: { battleId, moveName: '抓' } });
      assert.equal(bad.status, 403);
      const bad2 = await call('/api/battle/move', { method: 'POST', cookie: c1, body: { battleId, moveName: '抓', joinToken: 'wrong-token' } });
      assert.equal(bad2.status, 403);
    }

    // 轮流出招打完（2026-11-09 起防守题可能为脑筋急转弯：挂起就按题库正确答案作答，继续打）
    let guard = 0;
    while (v.status === 'active' && guard++ < 120) {
      if (v.phase === 'defense' && v.pending) { v = await answerPendingDefense(battleId, v, c1, c2); continue; }
      const side = v.sides[v.turn];
      const pet = side.pets[side.activeIdx];
      const mv = pet.moves[0];
      const body = { battleId, moveName: v.canAttack ? mv.name : null };
      let r;
      if (v.turn === 'A') r = await call('/api/battle/move', { method: 'POST', cookie: c1, body });
      else r = await call('/api/battle/move', { method: 'POST', cookie: c2, body }); // 凭证越权修复（2026-10-24）：B 方走自己会话，不再用大宝会话＋凭证代打
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      v = r.j.battle;
    }
    assert.equal(v.status, 'finished');
    assert.ok(v.winnerChildId === 1 || v.winnerChildId === 2);

    const d1 = (await call('/api/child?id=1', { cookie: pc })).j.child;
    const d2 = (await call('/api/child?id=2', { cookie: pc })).j.child;
    assert.equal(d1.totalXp, M.xpForLevel(12)); // 经验不变
    assert.equal(d2.totalXp, M.xpForLevel(5));
    const winner = v.winnerChildId === 1 ? d1 : d2;
    const loser = v.winnerChildId === 1 ? d2 : d1;
    assert.equal(winner.balls, 4); // 胜者 +1 球
    assert.equal(loser.balls, 3);

    // 战绩榜有冠军记录
    const ps = await call('/api/battle/pvp/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(ps.j.champions.length, 1);
    assert.equal(ps.j.champions[0].childId, v.winnerChildId);
    assert.equal(ps.j.recent.length, 1);

    // 测试站门槛放行：本周正式赛已计次也可再创建（正式模式仍拒，由 test-mode-unlock.test.mjs 覆盖）
    const again = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(again.j.ok, true, JSON.stringify(again.j));
  });

  /* 凭证越权修复（2026-10-24，71 号再来一局实证）：B 方凭证是 bearer 制，旧口径下大宝会话＋有效凭证
   * 就能替小宝出招、答题；新口径：对手孩子会话＋凭证一律 403，凭证只在无孩子会话时顶 B 的身份。 */
  async function pvpBattleWithToken() {
    const { pc, c1, c2 } = await pvpFixture();
    disableRiddles(); // 锁定无防守题挂起：B 出招后回合应干净翻到 A（本测试只验凭证规则）
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    return { pc, c1, c2, battleId, token: join.j.joinToken, v: join.j.battle };
  }
  async function driveToBAttack(s) {
    // 推进到 B 回合且可出招（2026-11-09 起无答题记录也会挂起谜语防守题：挂起就答对，继续推进）
    let v = s.v;
    for (let i = 0; i < 12 && !(v.turn === 'B' && v.canAttack); i++) {
      if (v.phase === 'defense' && v.pending) { v = await answerPendingDefense(s.battleId, v, s.c1, s.c2); continue; }
      const sd = v.sides[v.turn];
      const pt = sd.pets[sd.activeIdx];
      const r = await call('/api/battle/move', {
        method: 'POST', cookie: v.turn === 'A' ? s.c1 : s.c2,
        body: { battleId: s.battleId, moveName: v.canAttack ? pt.moves[0].name : null },
      });
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      v = r.j.battle;
    }
    assert.equal(v.turn, 'B');
    assert.equal(v.canAttack, true);
    return v;
  }

  test('凭证越权：B 回合出招，A 会话＋有效凭证 → 403；B 本人会话 → 放行', async () => {
    const s = await pvpBattleWithToken();
    const v = await driveToBAttack(s);
    const mv = v.sides.B.pets[v.sides.B.activeIdx].moves[0].name;
    const bad = await call('/api/battle/move', { method: 'POST', cookie: s.c1, body: { battleId: s.battleId, moveName: mv, joinToken: s.token } });
    assert.equal(bad.status, 403);
    const okB = await call('/api/battle/move', { method: 'POST', cookie: s.c2, body: { battleId: s.battleId, moveName: mv } });
    assert.equal(okB.j.ok, true, JSON.stringify(okB.j));
    assert.equal(okB.j.battle.turn, 'A');
  });

  test('凭证越权：B 回合出招，家长会话（无孩子会话）＋有效凭证 → 放行', async () => {
    const s = await pvpBattleWithToken();
    const v = await driveToBAttack(s);
    const mv = v.sides.B.pets[v.sides.B.activeIdx].moves[0].name;
    const ok = await call('/api/battle/move', { method: 'POST', cookie: s.pc, body: { battleId: s.battleId, moveName: mv, joinToken: s.token } });
    assert.equal(ok.j.ok, true, JSON.stringify(ok.j));
    assert.equal(ok.j.battle.turn, 'A');
  });

  async function stagedDefenseFixture() {
    const { pc, c1, c2 } = await pvpFixture();
    disableRiddles(); // 锁定防守题为下方种子的历史科目题
    setXp(2, M.xpForLevel(12)); // 双方同为 Lv.12 压平
    const { weekStart } = gotoWeekday(6);
    raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('study',1,'数学','1+1 等于几？','[\"2\",\"3\",\"4\",\"5\"]',0,'一根手指加一根手指是两根',1,0,0)").run();
    const qid = Number(raw.prepare('SELECT last_insert_rowid() AS id').get().id);
    raw.prepare('INSERT INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch) VALUES(2,?,?,1,10,0,0)').run(qid, weekStart);
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    let v = join.j.battle;
    for (let i = 0; i < 6; i++) {
      const sd = v.sides[v.turn];
      const pt = sd.pets[sd.activeIdx];
      const r = await call('/api/battle/move', {
        method: 'POST', cookie: v.turn === 'A' ? c1 : c2,
        body: { battleId, moveName: v.canAttack ? pt.moves[0].name : null },
      });
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      if (r.j.staged) return { pc, c1, c2, battleId, token: join.j.joinToken, v: r.j.battle };
      v = r.j.battle;
    }
    throw new Error('6 步内未出现挂起防守题');
  }

  test('凭证越权：B 方防守提交，A 会话＋有效凭证 → 403；B 本人会话 → 放行', async () => {
    const s = await stagedDefenseFixture();
    assert.equal(s.v.phase, 'defense');
    assert.equal(s.v.pending.defenderSide, 'B');
    const bad = await call('/api/battle/defend', { method: 'POST', cookie: s.c1, body: { battleId: s.battleId, answerText: '2', joinToken: s.token } });
    assert.equal(bad.status, 403);
    const row = await M.loadBattle(env.DB, s.battleId);
    assert.ok(row.st.pending, '403 后防守挂起应仍在');
    const okB = await call('/api/battle/defend', { method: 'POST', cookie: s.c2, body: { battleId: s.battleId, answerText: '2' } });
    assert.equal(okB.j.ok, true, JSON.stringify(okB.j));
    assert.equal(okB.j.defense.correct, true);
  });

  test('凭证越权：B 方防守提交，家长会话（无孩子会话）＋有效凭证 → 放行', async () => {
    const s = await stagedDefenseFixture();
    assert.equal(s.v.phase, 'defense');
    assert.equal(s.v.pending.defenderSide, 'B');
    const ok = await call('/api/battle/defend', { method: 'POST', cookie: s.pc, body: { battleId: s.battleId, answerText: '2', joinToken: s.token } });
    assert.equal(ok.j.ok, true, JSON.stringify(ok.j));
    assert.equal(ok.j.defense.correct, true);
  });

  test('兄弟对战：防守答题（挂起→答错全额→答对减伤；历史池路径，谜语已停用）', async () => {
    const { c1, c2 } = await pvpFixture();
    disableRiddles(); // 本测试验历史科目题防守路径；无记录一方不挂起只在谜语停用时成立，谜语路径另见下方测试
    setXp(2, M.xpForLevel(12)); // 双方同为 Lv.12 压平，血量留足余量
    const { weekStart } = gotoWeekday(6);
    raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('study',1,'数学','1+1 等于几？','[\"2\",\"3\",\"4\",\"5\"]',0,'一根手指加一根手指是两根',1,0,0)").run();
    const qid = Number(raw.prepare('SELECT last_insert_rowid() AS id').get().id);
    raw.prepare('INSERT INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch) VALUES(2,?,?,1,10,0,0)').run(qid, weekStart);

    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    let v = join.j.battle;

    const moveAs = async (view) => {
      const sd = view.sides[view.turn];
      const pt = sd.pets[sd.activeIdx];
      return call('/api/battle/move', {
        method: 'POST', cookie: view.turn === 'A' ? c1 : c2,
        body: { battleId, moveName: view.canAttack ? pt.moves[0].name : null },
      });
    };
    // 推进回合直到"A 攻击 B 被挂起"；途中 B 攻击 A 时 A 无答题记录且谜语已停用，必须即时结算
    const advanceToStaged = async (view) => {
      let cur = view;
      for (let i = 0; i < 6; i++) {
        const wasTurn = cur.turn;
        const tgtIdx = cur.sides.B.activeIdx;
        const r = await moveAs(cur);
        assert.equal(r.j.ok, true, JSON.stringify(r.j));
        if (r.j.staged) return { view: r.j.battle, tgtIdx };
        assert.equal(r.j.battle.phase, 'move', '无答题记录且谜语停用时，被攻击一方不应挂起');
        cur = r.j.battle;
        assert.equal(cur.status, 'active');
        assert.notEqual(cur.turn, wasTurn);
      }
      throw new Error('6 步内未出现挂起防守题');
    };

    // 第一轮：答错 → 全额伤害
    const first = await advanceToStaged(v);
    v = first.view;
    assert.equal(v.phase, 'defense');
    assert.equal(v.pending.defenderSide, 'B');
    assert.equal(v.pending.question.id, qid);
    const row1 = await M.loadBattle(env.DB, battleId);
    const dmg1 = row1.st.pending.dmg;
    const hpTgt1 = v.sides.B.pets[first.tgtIdx].hp;
    const badActor = await call('/api/battle/defend', { method: 'POST', cookie: c1, body: { battleId, answerText: '2' } });
    assert.equal(badActor.status, 403); // 攻击方不能替防守方答题
    const wrong = await call('/api/battle/defend', { method: 'POST', cookie: c2, body: { battleId, answerText: '3' } });
    assert.equal(wrong.j.ok, true, JSON.stringify(wrong.j));
    assert.equal(wrong.j.defense.correct, false);
    v = wrong.j.battle;
    assert.equal(v.phase, 'move');
    assert.equal(v.sides.B.pets[first.tgtIdx].hp, Math.max(0, hpTgt1 - dmg1));

    // 第二轮：答对 → 按随机到的防御类型比例减伤
    const second = await advanceToStaged(v);
    v = second.view;
    const row2 = await M.loadBattle(env.DB, battleId);
    const dmg2 = row2.st.pending.dmg;
    const hpTgt2 = v.sides.B.pets[second.tgtIdx].hp;
    const right = await call('/api/battle/defend', { method: 'POST', cookie: c2, body: { battleId, answerText: '2' } });
    assert.equal(right.j.ok, true, JSON.stringify(right.j));
    assert.equal(right.j.defense.correct, true);
    const kind = right.j.defense.kind;
    assert.ok(['dodge', 'block', 'guard', 'ward'].includes(kind), `kind=${kind}`); // 借鉴包 v1 起含第四档「守护」
    const ratio = kind === 'dodge' ? 0 : kind === 'block' ? 0.5 : kind === 'ward' ? 0.75 : 2 / 3;
    assert.equal(right.j.battle.sides.B.pets[second.tgtIdx].hp, Math.max(0, hpTgt2 - Math.floor(dmg2 * ratio)));
  });

  test('兄弟对战：无答题记录一方被攻击时出脑筋急转弯防守题（2026-11-09）', async () => {
    const { c1, c2 } = await pvpFixture();
    setXp(2, M.xpForLevel(12)); // 双方同为 Lv.12 压平
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    let v = join.j.battle;
    // 双方均无答题记录：第一手攻击必挂起谜语防守题（历史池为空时全用谜语兜底）
    let staged = null;
    for (let i = 0; i < 2 && !staged; i++) {
      const sd = v.sides[v.turn];
      const pt = sd.pets[sd.activeIdx];
      const r = await call('/api/battle/move', {
        method: 'POST', cookie: v.turn === 'A' ? c1 : c2,
        body: { battleId, moveName: v.canAttack ? pt.moves[0].name : null },
      });
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      if (r.j.staged) staged = r.j.battle;
      v = r.j.battle;
    }
    assert.ok(staged, '无记录一方被攻击时应挂起防守题');
    assert.equal(staged.phase, 'defense');
    const qid = staged.pending.question.id;
    const qrow = raw.prepare('SELECT kind FROM quiz_questions WHERE id=?').get(qid);
    assert.ok(qrow, '防守题应在题库中');
    assert.equal(qrow.kind, 'riddle', '历史池为空时防守题应为脑筋急转弯');
    // 按题库正确答案作答 → 减伤结算，对战继续
    const after = await answerPendingDefense(battleId, staged, c1, c2);
    assert.equal(after.phase, 'move');
  });

  /* 防守超时（用户定案 2026-10-22）：120 秒，双方都进入才起算 */
  function rewriteSt(battleId, fn) {
    const row = raw.prepare('SELECT state FROM battles WHERE id=?').get(battleId);
    const st = JSON.parse(row.state);
    fn(st);
    raw.prepare('UPDATE battles SET state=? WHERE id=?').run(JSON.stringify(st), battleId);
    return st;
  }
  async function stagedFixture() {
    const { pc, c1, c2 } = await pvpFixture();
    disableRiddles(); // 锁定防守题为下方种子的历史科目题（超时数学与题型无关）
    setXp(2, M.xpForLevel(12)); // 双方同为 Lv.12 压平，血量留足余量
    const { weekStart } = gotoWeekday(6);
    raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('study',1,'数学','1+1 等于几？','[\"2\",\"3\",\"4\",\"5\"]',0,'一根手指加一根手指是两根',1,0,0)").run();
    const qid = Number(raw.prepare('SELECT last_insert_rowid() AS id').get().id);
    raw.prepare('INSERT INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch) VALUES(2,?,?,1,10,0,0)').run(qid, weekStart);
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    let v = join.j.battle;
    const moveAs = async (view) => {
      const sd = view.sides[view.turn];
      const pt = sd.pets[sd.activeIdx];
      return call('/api/battle/move', {
        method: 'POST', cookie: view.turn === 'A' ? c1 : c2,
        body: { battleId, moveName: view.canAttack ? pt.moves[0].name : null },
      });
    };
    for (let i = 0; i < 6; i++) {
      const tgtIdx = v.sides.B.activeIdx;
      const r = await moveAs(v);
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      if (r.j.staged) return { pc, c1, c2, battleId, view: r.j.battle, tgtIdx };
      v = r.j.battle;
      assert.equal(v.status, 'active');
    }
    throw new Error('6 步内未出现挂起防守题');
  }

  test('防守超时：对方还没进入（waiting 局）时 pending 永不超时、不结算不补记', async () => {
    const { pc, c1 } = await pvpFixture();
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    assert.equal(create.j.battle.status, 'waiting');
    // 人工塞一个远古 pending（模拟异常残留）：对方未加入，任何请求都不许结算它
    rewriteSt(battleId, (st) => {
      st.pending = {
        attacker: 'A', moveName: '电击', moveType: '电', petName: '皮卡丘', targetName: '小火龙',
        dmg: 999, mult: 1, critical: false, mods: [], drain: false, sinceEpoch: 1,
        question: { id: 1, question: '占位题', options: ['甲', '乙'], subject: '' },
      };
    });
    const r = await call('/api/battle/state', { method: 'POST', cookie: pc, body: { battleId } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.battle.phase, 'defense'); // pending 还挂着
    assert.equal(r.j.battle.pending.sinceEpoch, 1); // 起算点原样未动
    assert.equal(r.j.defenseTimeout, undefined);
    const stAfter = JSON.parse(raw.prepare('SELECT state FROM battles WHERE id=?').get(battleId).state);
    assert.ok(stAfter.pending, 'pending 不应被结算掉');
    assert.equal(stAfter.pending.sinceEpoch, 1);
  });

  test('防守超时：双方已齐且超 120 秒 → 下一次 state 请求按放弃防御全额结算，对战可继续', async () => {
    const { c1, c2, battleId, view, tgtIdx } = await stagedFixture();
    const row = await M.loadBattle(env.DB, battleId);
    const dmg = row.st.pending.dmg;
    const hpBefore = view.sides.B.pets[tgtIdx].hp;
    rewriteSt(battleId, (st) => { st.pending.sinceEpoch = Math.floor(Date.now() / 1000) - 121; });
    const r = await call('/api/battle/state', { method: 'POST', cookie: c1, body: { battleId } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.defenseTimeout, true);
    const v = r.j.battle;
    assert.equal(v.status, 'active');
    assert.equal(v.phase, 'move');
    assert.equal(v.pending, null);
    assert.equal(v.sides.B.pets[tgtIdx].hp, Math.max(0, hpBefore - dmg)); // 全额伤害，无减伤
    assert.equal(v.turn, 'B'); // 回合推进到防守方
    assert.ok(v.log.some((e) => e.type === 'defense' && e.kind === 'timeout'), '日志应有超时结算事件');
    // 对战可继续：B 正常出招一手（打 A，A 无答题记录即时结算）
    const sd = v.sides.B;
    const pt = sd.pets[sd.activeIdx];
    const mv = await call('/api/battle/move', { method: 'POST', cookie: c2, body: { battleId, moveName: pt.moves[0].name } });
    assert.equal(mv.j.ok, true, JSON.stringify(mv.j));
    assert.equal(mv.j.battle.turn, 'A');
  });

  test('防守超时：刚生成的 pending 不被误杀，deadline 字段齐备，正常答题路径不受影响', async () => {
    const { c1, c2, battleId, view } = await stagedFixture();
    assert.ok(view.pending.sinceEpoch > 0, '新 pending 应带起算点');
    assert.equal(view.pending.deadlineEpoch - view.pending.sinceEpoch, 120);
    assert.equal(view.pending.timeoutSecs, 120);
    const r = await call('/api/battle/state', { method: 'POST', cookie: c1, body: { battleId } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.battle.phase, 'defense'); // 未超时，不结算
    assert.equal(r.j.defenseTimeout, undefined);
    const right = await call('/api/battle/defend', { method: 'POST', cookie: c2, body: { battleId, answerText: '2' } });
    assert.equal(right.j.ok, true, JSON.stringify(right.j));
    assert.equal(right.j.defense.correct, true);
    assert.equal(right.j.defense.timedOut, undefined);
    assert.equal(right.j.battle.phase, 'move');
  });

  test('防守超时：存量 pending（无 sinceEpoch）首次触及只补记起算点，补记后超 120 秒可推进', async () => {
    const { c1, battleId, view, tgtIdx } = await stagedFixture();
    const row = await M.loadBattle(env.DB, battleId);
    const dmg = row.st.pending.dmg;
    const hpBefore = view.sides.B.pets[tgtIdx].hp;
    rewriteSt(battleId, (st) => { delete st.pending.sinceEpoch; });
    const first = await call('/api/battle/state', { method: 'POST', cookie: c1, body: { battleId } });
    assert.equal(first.j.ok, true, JSON.stringify(first.j));
    assert.equal(first.j.battle.phase, 'defense'); // 只补记，不立即结算
    assert.equal(first.j.defenseTimeout, undefined);
    assert.ok(first.j.battle.pending.sinceEpoch > 0, '起算点应被补记并回传');
    assert.equal(first.j.battle.pending.deadlineEpoch - first.j.battle.pending.sinceEpoch, 120);
    assert.equal(first.j.battle.sides.B.pets[tgtIdx].hp, hpBefore); // 未扣血
    rewriteSt(battleId, (st) => { st.pending.sinceEpoch = Math.floor(Date.now() / 1000) - 121; });
    const second = await call('/api/battle/state', { method: 'POST', cookie: c1, body: { battleId } });
    assert.equal(second.j.defenseTimeout, true);
    assert.equal(second.j.battle.sides.B.pets[tgtIdx].hp, Math.max(0, hpBefore - dmg));
    assert.equal(second.j.battle.phase, 'move');
  });

  test('兄弟对战：加入方用自己账号（无凭证）也能出招', async () => {
    const { c1, c2 } = await pvpFixture();
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    let v = join.j.battle;
    // 全程：A 用自己会话、B 用自己会话（不带 joinToken），轮流打完一整场
    //（2026-11-09 起防守题可能为脑筋急转弯：挂起就按题库正确答案作答，继续打）
    let guard = 0;
    while (v.status === 'active' && guard++ < 120) {
      if (v.phase === 'defense' && v.pending) { v = await answerPendingDefense(battleId, v, c1, c2); continue; }
      const side = v.sides[v.turn];
      const pet = side.pets[side.activeIdx];
      const body = { battleId, moveName: v.canAttack ? pet.moves[0].name : null };
      const r = await call('/api/battle/move', { method: 'POST', cookie: v.turn === 'A' ? c1 : c2, body });
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      v = r.j.battle;
    }
    assert.equal(v.status, 'finished');
  });

  test('弃赛不计次、无奖励，之后可再创建', async () => {
    const { pc, c1, c2 } = await pvpFixture();
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222' } });
    assert.equal(join.j.ok, true);
    const ab = await call('/api/battle/abandon', { method: 'POST', cookie: c1, body: { battleId } });
    assert.equal(ab.j.ok, true);
    assert.equal(ab.j.battle.status, 'abandoned');
    const d1 = (await call('/api/child?id=1', { cookie: pc })).j.child;
    const d2 = (await call('/api/child?id=2', { cookie: pc })).j.child;
    assert.equal(d1.balls, 3);
    assert.equal(d2.balls, 3);
    const again = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(again.j.ok, true); // 弃赛不占名额
  });

  test('孩子 A 不能操作孩子 B 的闯关对战（按 id 猜也不行）', async () => {
    const { c1, c2 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(2, weekStart, 4);
    setXp(2, 1500);
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c2, body: { childId: 2, stage: 1 } });
    assert.equal(start.j.ok, true);
    const battleId = start.j.battle.battleId;
    const bad = await call('/api/battle/move', { method: 'POST', cookie: c1, body: { battleId, moveName: '电击' } });
    assert.equal(bad.status, 403);
    const badState = await call('/api/battle/state', { method: 'POST', cookie: c1, body: { battleId } });
    assert.equal(badState.status, 403);
  });
});

/* ---------------- PvP 再来一局（2026-10-24：申请 → 家长审核 → 批准解锁一场） ---------------- */

describe('PvP 再来一局（申请-家长审核-解锁）', () => {
  async function pvpFixture() {
    const s = await setup();
    const { weekStart } = gotoWeekday(6); // 周六
    seedApprovedDays(1, weekStart, 4);
    seedApprovedDays(2, weekStart, 4);
    setXp(1, M.xpForLevel(12));
    setXp(2, M.xpForLevel(5));
    return { ...s, weekStart };
  }

  /* 建局+加入+轮流出招打完（无防守题种入时全程即时结算；出现挂起由防守方放弃防守推进） */
  async function playBattleToFinish(c1, c2) {
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    let v = join.j.battle;
    let guard = 0;
    while (v.status === 'active' && guard++ < 200) {
      if (v.phase === 'defense' && v.pending) {
        const r = await call('/api/battle/defend', { method: 'POST', cookie: v.pending.defenderSide === 'A' ? c1 : c2, body: { battleId, answerText: null } });
        assert.equal(r.j.ok, true, JSON.stringify(r.j));
        v = r.j.battle;
        continue;
      }
      const side = v.sides[v.turn];
      const pet = side.pets[side.activeIdx];
      const r = await call('/api/battle/move', { method: 'POST', cookie: v.turn === 'A' ? c1 : c2, body: { battleId, moveName: v.canAttack ? pet.moves[pet.moves.length - 1].name : null } });
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      v = r.j.battle;
    }
    assert.equal(v.status, 'finished');
    return { battleId, view: v };
  }

  const pvpStatus = (cookie, childId) => call('/api/battle/pvp/status', { method: 'POST', cookie, body: { childId } });
  const balls = (id) => raw.prepare('SELECT balls FROM children WHERE id=?').get(id).balls;

  test('正式对战没打完不能申请；家长未登录不能裁决', async () => {
    const { c1 } = await pvpFixture();
    const bad = await call('/api/battle/pvp/rematch/request', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(bad.j.ok, false);
    assert.match(bad.j.error, /还没打完/);
    const noAuth = await call('/api/parent/pvp-rematch/decide', { method: 'POST', body: { id: 1, approve: true } });
    assert.equal(noAuth.j.ok, false);
    const st = await pvpStatus(c1, 1);
    assert.equal(st.j.rematch.status, 'none');
    assert.equal(st.j.rematch.canRequest, false);
  });

  test('驳回路径：申请→待审核可见→家长驳回→本周不能再申请也不能开局', async () => {
    const { pc, c1, c2 } = await pvpFixture();
    await playBattleToFinish(c1, c2);
    const st0 = await pvpStatus(c2, 2);
    assert.equal(st0.j.rematch.canRequest, true);
    const req = await call('/api/battle/pvp/rematch/request', { method: 'POST', cookie: c2, body: { childId: 2 } });
    assert.equal(req.j.ok, true, JSON.stringify(req.j));
    assert.equal(req.j.rematch.status, 'pending');
    assert.equal(req.j.rematch.requesterChildId, 2);
    const dup = await call('/api/battle/pvp/rematch/request', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(dup.j.ok, false);
    assert.match(dup.j.error, /等家长审核/);
    const list = await call('/api/parent/pvp-rematch', { cookie: pc });
    assert.equal(list.j.ok, true);
    assert.equal(list.j.rematch.status, 'pending');
    assert.equal(list.j.rematch.requesterChildId, 2);
    const dec = await call('/api/parent/pvp-rematch/decide', { method: 'POST', cookie: pc, body: { id: list.j.requestId, approve: false } });
    assert.equal(dec.j.ok, true, JSON.stringify(dec.j));
    assert.equal(dec.j.rematch.status, 'rejected');
    const st1 = await pvpStatus(c1, 1);
    assert.equal(st1.j.rematch.status, 'rejected');
    assert.equal(st1.j.rematch.canRequest, false);
    const again = await call('/api/battle/pvp/rematch/request', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(again.j.ok, false);
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j)); // 测试站门槛放行：驳回后也可再开局
    // 重复裁决同一条 → 409
    const dec2 = await call('/api/parent/pvp-rematch/decide', { method: 'POST', cookie: pc, body: { id: list.j.requestId, approve: true } });
    assert.equal(dec2.status, 409);
  });

  test('批准路径：解锁一场→rematch 局不计次不发球不改冠军→批准单消费→再开局被挡', async () => {
    const { pc, c1, c2 } = await pvpFixture();
    const first = await playBattleToFinish(c1, c2);
    const champBefore = (await pvpStatus(c1, 1)).j.champions;
    assert.equal(champBefore.length, 1);
    const ballsBefore = { 1: balls(1), 2: balls(2) };
    const req = await call('/api/battle/pvp/rematch/request', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(req.j.ok, true);
    const list = await call('/api/parent/pvp-rematch', { cookie: pc });
    const dec = await call('/api/parent/pvp-rematch/decide', { method: 'POST', cookie: pc, body: { id: list.j.requestId, approve: true } });
    assert.equal(dec.j.ok, true);
    const stA = await pvpStatus(c1, 1);
    assert.equal(stA.j.rematch.status, 'approved');
    // 建再来一局：计次闸门放行且 state 带 rematch 标记
    const second = await playBattleToFinish(c1, c2);
    const row2 = raw.prepare('SELECT counted, state FROM battles WHERE id=?').get(second.battleId);
    assert.equal(JSON.parse(row2.state).rematch, true);
    assert.equal(row2.counted, 0); // 不计次
    assert.equal(balls(1), ballsBefore[1]); // 不发冠军球
    assert.equal(balls(2), ballsBefore[2]);
    const champAfter = (await pvpStatus(c1, 1)).j.champions;
    assert.deepEqual(champAfter, champBefore); // 周冠军不变
    const rr = raw.prepare('SELECT status, granted_battle_id FROM pvp_rematch_requests WHERE id=?').get(list.j.requestId);
    assert.equal(rr.status, 'consumed');
    assert.equal(rr.granted_battle_id, second.battleId);
    const stB = await pvpStatus(c1, 1);
    assert.equal(stB.j.rematch.status, 'consumed');
    assert.equal(stB.j.rematch.canRequest, false);
    const third = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(third.j.ok, true, JSON.stringify(third.j)); // 测试站门槛放行：批准单消费后也可再开局
    void first;
  });
});

/* ---------------- 存档 CAS（轻量并发防护） ---------------- */

describe('战斗存档 CAS（saveBattle / loadBattle）', () => {
  test('带 expectedState 时旧快照保存被拒（返回 false）且库内状态不被覆盖；无 expected 时保持无条件保存', async () => {
    const origState = JSON.stringify({ v: 1, marker: 'orig' });
    raw.prepare("INSERT INTO battles(mode, week_start, stage, child_a, state, status, created_epoch) VALUES('gym','2026-10-19',1,1,?,'active',1)").run(origState);
    const id = raw.prepare('SELECT id FROM battles ORDER BY id DESC LIMIT 1').get().id;
    const got = await M.loadBattle(env.DB, id);
    assert.ok(got);
    assert.equal(got.st.marker, 'orig');
    // 用读到的原始 state 作 expected → 保存成功
    const ok1 = await M.saveBattle(env.DB, got.row, { v: 1, marker: 'new' }, got.row.state);
    assert.equal(ok1, true);
    // 同一旧快照再保存 → 状态已推进，CAS 拒绝
    const ok2 = await M.saveBattle(env.DB, got.row, { v: 1, marker: 'stale' }, got.row.state);
    assert.equal(ok2, false);
    const got2 = await M.loadBattle(env.DB, id);
    assert.equal(got2.st.marker, 'new'); // 库里仍是第一次保存的结果，没被旧快照覆盖
    // 不带 expectedState → 无条件保存（与旧行为一致）
    const ok3 = await M.saveBattle(env.DB, got.row, { v: 1, marker: 'forced' });
    assert.equal(ok3, true);
    const got3 = await M.loadBattle(env.DB, id);
    assert.equal(got3.st.marker, 'forced');
  });
});

/* ---------------- 战斗不发经验（铁律断言） ---------------- */

describe('战斗不发经验（铁律）', () => {
  test('战斗不发经验：道馆首通获胜前后，双方 total_xp 逐分相等', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6); // 周六
    seedApprovedDays(1, weekStart, 4);
    seedApprovedDays(2, weekStart, 4);
    setXp(1, 1500);
    setXp(2, 800);
    giveDex(1, 'wild:54');
    const xpOf = (id) => raw.prepare('SELECT total_xp FROM children WHERE id=?').get(id).total_xp;
    const before1 = xpOf(1);
    const before2 = xpOf(2);
    // 改版定参下反复挑战至首通（中途败场同样走战斗结算，一样不得发经验）
    const { view, rewards } = await clearGymStage(c1, 1, 54);
    assert.equal(view.status, 'finished');
    assert.equal(view.winnerChildId, 1); // 确实打赢并走了发奖路径（蛋/徽章照发）
    assert.equal(rewards.firstClear, true);
    assert.equal(xpOf(1), before1); // 经验逐分不变
    assert.equal(xpOf(2), before2);
  });
});

/* ---------------- 道馆改版：同时选招（DESIGN-道馆改版-v1 §7 单测口径） ---------------- */

describe('道馆改版（同时选招）', () => {
  const pet = (name, type, hp, moves, level = 5) => ({ key: name, name, type, no: null, img: null, level, maxHp: hp, hp, moves });
  const side = (childId, childName, pets) => ({ childId, childName, battleLevel: 5, activeIdx: 0, pets });
  // 可复现随机源（mulberry32），保证断言不靠运气
  const rng32 = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const gymState = (aPets, bPets) => M.createBattleState({
    mode: 'gym', firstSide: 'A',
    sides: { A: side(1, '大宝', aPets), B: side(null, '馆主', bPets) },
  });

  test('同时互算：被打倒的一方已选的招照常打出（双方同回合都掉血）', () => {
    const a = pet('皮丘', '电', 300, [{ name: '电击', type: '电', power: 50 }], 10);
    const b = pet('大岩蛇', '岩石', 30, [{ name: '岩石猛击', type: '岩石', power: 40 }], 10);
    const st = gymState([a], [b]);
    const r = M.resolveGymRound(st, { moveName: '电击' }, rng32(1)); // 该种子下馆主选攻击（非蓄势）
    assert.equal(st.winner, 'A'); // B 血量 30，电击伤害区间下限 33，必被打倒且无备战
    assert.ok(a.hp < 300, 'B 在被打倒的同一回合里已选的招应照常打出，A 应掉血');
    assert.ok(r.events.some((e) => e.type === 'attack' && e.side === 'B'), '事件里应有馆主本回合的攻击');
  });

  test('死亡回合：先攻打倒对方后回合结束，顶上的新宠本回合不再行动（2026-11-20 用户定）', () => {
    // 速度顺序结算（双方都有 stats 才走顺序分支）：玩家先攻打倒馆主首宠，馆主备战宠顶上；
    // 死亡回合应到此结束——顶上的新宠本回合不再行动，出招清零，双方下回合重新选招。
    // 旧行为是顶上的新宠当回合就用倒下那只的招出手，等于新宠连放两次技能（设计错误）。
    const fast = (name, type, hp, moves, speed, attack = 50) => ({ key: name, name, type, no: null, img: null, level: 10, maxHp: hp, hp, moves, stats: { hp: 100, attack, defense: 50, sp_attack: attack, sp_defense: 50, speed } });
    const a = fast('皮卡丘', '电', 300, [{ name: '电击', type: '电', power: 100 }], 100, 200);
    const bLead = fast('大岩蛇', '岩石', 30, [{ name: '岩石猛击', type: '岩石', power: 40 }], 10);
    const bBench = fast('小拳石', '岩石', 300, [{ name: '岩石猛击', type: '岩石', power: 40 }], 10);
    const st = gymState([a], [bLead, bBench]);
    const hpBefore = a.hp;
    const r = M.resolveGymRound(st, { moveName: '电击' }, rng32(1));
    assert.equal(st.sides.B.pets[0].hp, 0, '大岩蛇应被打倒');
    assert.equal(st.sides.B.activeIdx, 1, '馆主备战宠小拳石应顶上');
    assert.equal(a.hp, hpBefore, '顶上的新宠本回合不应出招，玩家不应掉血');
    assert.equal(st.turnNo, 2, '死亡回合结束，回合数应推进');
    assert.equal(st.turn, 'A', '轮到玩家行动，双方下回合重新选招');
    assert.equal(st.winner, null, '战斗未结束');
    assert.ok(!r.events.some((e) => e.type === 'attack' && e.side === 'B' && e.text && e.text.includes('小拳石')), '事件里不应有顶上新宠本回合的攻击');
  });

  test('同回合双亡判馆主胜（挑战未通关）', () => {
    const a = pet('皮丘', '电', 300, [{ name: '电击', type: '电', power: 50 }], 10);
    a.hp = 10;
    const b = pet('大岩蛇', '岩石', 300, [{ name: '岩石猛击', type: '岩石', power: 40 }], 10);
    b.hp = 10;
    const st = gymState([a], [b]);
    M.resolveGymRound(st, { moveName: '电击' }, rng32(9));
    assert.equal(a.hp, 0);
    assert.equal(b.hp, 0);
    assert.equal(st.winner, 'B'); // 双亡不算通关
  });

  test('drain 在昏厥判定前结算：被打到 0 后靠吸取救活', () => {
    const a = pet('妙蛙种子', '草', 200, [{ name: '寄生种子', type: '草', power: 40 }], 10);
    a.hp = 5;
    const b = pet('小火龙', '火', 500, [{ name: '火花', type: '火', power: 4 }], 10);
    const st = gymState([a], [b]);
    const r = M.resolveGymRound(st, { moveName: '寄生种子' }, rng32(3));
    // B 的伤害（含暴击上限 17）先把 A 打到 0，A 的吸取（≥13）在判昏厥前回血 → 不昏厥
    assert.ok(a.hp >= 1, `A 应被吸取救活，实际 hp=${a.hp}`);
    assert.equal(st.winner, null);
    assert.ok(!r.events.some((e) => e.type === 'faint' && e.side === 'A'), 'A 不应有昏厥事件');
    assert.ok(b.hp < 500, 'B 应受到吸取招的伤害');
  });

  test('shell 同回合减伤：本回合打出的防御挡住本回合攻击且被消费', () => {
    let found = null;
    for (let s = 1; s <= 60 && !found; s++) {
      const a = pet('卡咪龟', '水', 500, [{ name: '缩入壳中', type: '水', power: 30 }], 10);
      const b = pet('大岩蛇', '岩石', 500, [{ name: '岩石猛击', type: '岩石', power: 40 }], 10);
      const st = gymState([a], [b]);
      M.resolveGymRound(st, { moveName: '缩入壳中' }, rng32(s));
      if (st.sides.B.pets[0].hp === 500 && a.hp < 500) found = { st, a }; // 馆主本回合是攻击（非蓄势）
    }
    assert.ok(found, '应在若干种子内找到馆主直接攻击的回合');
    const loss = 500 - found.a.hp;
    // 未减伤伤害带：40×1.0×[0.65,1.35]=[26,54]（暴击至 81）；×0.5 后应落在 [13,41]
    assert.ok(loss >= 13 && loss <= 41, `减伤后伤害应在 13–41，实际 ${loss}`);
    assert.equal(found.st.fx.A.shell, undefined, 'shell 应被本回合攻击消费');
    assert.equal(found.st.gym.lastPlayerKind, 'shell');
  });

  test('shell 留存：对方本回合蓄势（没攻击）时防御不消费、自己不掉血', () => {
    let found = null;
    for (let s = 1; s <= 80 && !found; s++) {
      const a = pet('卡咪龟', '水', 500, [{ name: '缩入壳中', type: '水', power: 30 }], 10);
      const b = pet('大岩蛇', '岩石', 500, [{ name: '岩石猛击', type: '岩石', power: 40 }], 10);
      const st = gymState([a], [b]);
      M.resolveGymRound(st, { moveName: '缩入壳中' }, rng32(s));
      if (st.fx.B.charge) found = st; // 馆主本回合蓄势
    }
    assert.ok(found, '应在若干种子内找到馆主蓄势的回合');
    assert.equal(found.fx.A.shell, true, '没挨打 → shell 留存到下回合');
    assert.equal(found.sides.A.pets[0].hp, 500, '蓄势无伤害');
  });

  test('主动换宠占整回合：新宠承伤、原宠不掉血、本回合不出招；非法换宠被拒', () => {
    const a1 = pet('皮丘', '电', 300, [{ name: '电击', type: '电', power: 50 }], 10);
    const a2 = pet('走路草', '草', 300, [{ name: '飞叶小刀', type: '草', power: 40 }], 10);
    const b = pet('大岩蛇', '岩石', 500, [{ name: '岩石猛击', type: '岩石', power: 40 }], 10);
    const st = gymState([a1, a2], [b]);
    const r = M.resolveGymRound(st, { swapToIdx: 1 }, rng32(5));
    assert.ok(!r.error, JSON.stringify(r));
    assert.equal(st.sides.A.activeIdx, 1);
    assert.equal(a1.hp, 300, '被换下的原宠不承伤');
    assert.equal(b.hp, 500, '换宠方本回合无输出');
    assert.ok(r.events.some((e) => e.type === 'swap' && e.side === 'A'));
    assert.equal(M.resolveGymRound(st, { swapToIdx: 1 }).error, 'SWAP_INVALID'); // 换给已在场的自己
    const st2 = gymState(
      [pet('皮丘', '电', 300, [{ name: '电击', type: '电', power: 50 }], 10), pet('走路草', '草', 300, [{ name: '飞叶小刀', type: '草', power: 40 }], 10)],
      [pet('大岩蛇', '岩石', 500, [{ name: '岩石猛击', type: '岩石', power: 40 }], 10)],
    );
    st2.sides.A.pets[1].hp = 0;
    assert.equal(M.resolveGymRound(st2, { swapToIdx: 1 }).error, 'SWAP_INVALID'); // 换给昏厥宠
  });

  test('馆主 AI：有蓄力必攻击；常规回合蓄势与攻击都出现（蓄势约 25%）', () => {
    const mk = () => gymState(
      [pet('皮丘', '电', 300, [{ name: '电击', type: '电', power: 50 }], 10)],
      [pet('大岩蛇', '岩石', 500, [
        { name: '岩石猛击', type: '岩石', power: 28 },
        { name: '尾巴横扫', type: '普通', power: 34 },
        { name: '大地重压', type: '地面', power: 36 },
      ], 6)],
    );
    for (let s = 1; s <= 20; s++) {
      const st = mk();
      st.fx = { A: {}, B: { charge: true } };
      assert.equal(M.gymBossChoose(st, rng32(s)).type, 'move', '有蓄力必须攻击，不许再蓄');
    }
    let charges = 0;
    let attacks = 0;
    for (let s = 1; s <= 200; s++) {
      const act = M.gymBossChoose(mk(), rng32(1000 + s));
      if (act.type === 'charge') charges++;
      else if (act.type === 'move') attacks++;
    }
    assert.ok(charges >= 20 && attacks >= 100, `蓄势应约 25%：charge=${charges} attack=${attacks}`);
  });

  test('伤害区间：PvE 官方 [0.85,1.0]，默认 [0.9,1.1] 不变', () => {
    const mv = { name: '电击', type: '电', power: 40 }; // Lv.10 基底 = 40×(0.5+0.05×10)=40；无 STAB；电击命中率 100 恒过；官方区间 85–100 → 伤害 [34,40]
    let lo = Infinity;
    let hi = -Infinity;
    const r1 = rng32(42);
    for (let i = 0; i < 400; i++) {
      const d = M.calcDamage(mv, { level: 10, type: '火', stats: null }, { level: 10, type: '火', stats: null }, r1, { chart: 'official' });
      if (!d.critical) { lo = Math.min(lo, d.dmg); hi = Math.max(hi, d.dmg); }
    }
    assert.ok(lo >= 34 && lo <= 35 && hi >= 39 && hi <= 40, `官方区间样本应覆盖约 [34,40]，实际 [${lo},${hi}]`);
    let lo2 = Infinity;
    let hi2 = -Infinity;
    const r2 = rng32(42);
    for (let i = 0; i < 400; i++) {
      const d = M.calcDamage(mv, { level: 10, type: '电', stats: null }, { level: 10, type: '火', stats: null }, r2); // 不传 opts：PvP/借鉴包现行口径
      if (!d.critical) { lo2 = Math.min(lo2, d.dmg); hi2 = Math.max(hi2, d.dmg); }
    }
    assert.ok(lo2 >= 36 && hi2 <= 44, `默认区间应仍为 [36,44]，实际 [${lo2},${hi2}]`);
  });

  test('定参落表：八关 hpMult 与招式调整与 DESIGN 定版一致（2026-11-17 设计定稿 8.md 热修；2026-11-17 道馆重调 S6/S7：bossLevel 30/29、hpMult 1.85/2.0、魔墙人偶魔法闪耀＋S7 特殊火）', () => {
    const by = (s) => M.GYM_STAGES.find((g) => g.stage === s);
    assert.equal(by(1).hpMult, 1.0); // 2026-11-17 设计定稿 8.md 热修：玻璃大炮口径 [1.0, 1.0, 1.1, 1.5, 1.0, 1.3, 1.65, 1.5]，S5 设计值 1.35 仍留硬墙，降到 1.0 才清零；2026-11-17 道馆重调：S6 1.85、S7 2.0；2026-11-20 馆主血量回调：S5 1.0→0.9、S7 2.0→1.8
    assert.equal(by(2).hpMult, 1.0);
    assert.equal(by(3).hpMult, 1.1);
    assert.equal(by(4).hpMult, 1.5);
    assert.equal(by(5).hpMult, 0.9);
    assert.equal(by(6).hpMult, 1.85);
    assert.equal(by(7).hpMult, 1.8);
    assert.equal(by(8).hpMult, 1.5);
    assert.equal(by(6).bossLevel, 30); // 道馆重调 S6：bossLevel 23→30（有效 55），needLevel 不动 20
    assert.equal(by(7).bossLevel, 29); // 道馆重调 S7：bossLevel 25→29（有效 53），needLevel 不动 23
    assert.equal(by(6).needLevel, 20);
    assert.equal(by(7).needLevel, 23);
    // 道馆重调招式：S6 魔墙人偶 突袭→魔法闪耀（妖精 80，lv44 ≤ 有效 55）；S7 四只补特殊火（烈火深渊 lv45/49、喷射火焰 lv40/5 ≤ 有效 53）
    const teamMove = (s, no, n) => { const g = by(s); const p = g.bossTeam.find((m) => m.no === no); return p ? p.moves.find((m) => m[0] === n) : undefined; };
    assert.deepEqual(teamMove(6, 122, '魔法闪耀'), ['魔法闪耀', '妖精', 80]);
    assert.deepEqual(teamMove(6, 122, '突袭'), undefined, 'S6 魔墙人偶不应再有突袭（物攻 45 打不动恶系）');
    assert.deepEqual(teamMove(7, 58, '喷射火焰'), ['喷射火焰', '火', 90]);
    assert.deepEqual(teamMove(7, 77, '烈火深渊'), ['烈火深渊', '火', 100]);
    assert.deepEqual(teamMove(7, 78, '烈火深渊'), ['烈火深渊', '火', 100]);
    assert.deepEqual(teamMove(7, 59, '喷射火焰'), ['喷射火焰', '火', 90]);
    assert.deepEqual(teamMove(7, 77, '踩踏'), undefined, 'S7 小火马踩踏已换成烈火深渊');
    assert.deepEqual(teamMove(7, 78, '修长之角'), undefined, 'S7 烈焰马修长之角已换成烈火深渊');
    // 2026-11-17 8 关扩围：mv 查王牌（队尾）的招式；S3 换雷丘队、S5 毒、S6 超能力、旧火/地面顺延为 S7/S8
    const mv = (s, n) => { const g = by(s); return g.bossTeam[g.bossTeam.length - 1].moves.find((m) => m[0] === n); };
    // 2026-11-17 数据集校对：全部换成官方招式名＋官方威力（有效等级可升级学会；“—”为初始招、“进化”为进化招）
    assert.deepEqual(mv(1, '落石'), ['落石', '岩石', 50]);
    assert.deepEqual(mv(1, '击落'), ['击落', '岩石', 50]);
    assert.deepEqual(mv(1, '撞击'), ['撞击', '普通', 40]);
    assert.deepEqual(mv(2, '水枪'), ['水枪', '水', 40]);
    assert.deepEqual(mv(2, '高速旋转'), ['高速旋转', '普通', 50]);
    assert.deepEqual(mv(2, '高速星星'), ['高速星星', '普通', 60]);
    assert.deepEqual(mv(3, '十万伏特'), ['十万伏特', '电', 90]); // S3 王牌换雷丘（旧电击兽退役）
    assert.deepEqual(mv(3, '电光'), ['电光', '电', 65]);
    assert.deepEqual(mv(3, '铁尾'), ['铁尾', '钢', 100]);
    assert.deepEqual(mv(4, '终极吸取'), ['终极吸取', '草', 75]);
    assert.deepEqual(mv(4, '溶解液'), ['溶解液', '毒', 40]);
    assert.deepEqual(mv(5, '污泥炸弹'), ['污泥炸弹', '毒', 90]); // S5 毒（双弹瓦斯王牌）
    assert.deepEqual(mv(5, '热风'), ['热风', '火', 95]);
    assert.deepEqual(mv(5, '恶意追击'), ['恶意追击', '恶', 60]);
    assert.deepEqual(mv(6, '精神强念'), ['精神强念', '超能力', 90]); // S6 超能力（胡地王牌）
    assert.deepEqual(mv(6, '精神冲击'), ['精神冲击', '超能力', 80]);
    assert.deepEqual(mv(6, '幻象光线'), ['幻象光线', '超能力', 65]);
    assert.deepEqual(mv(7, '火焰牙'), ['火焰牙', '火', 65]); // S7 火（旧 S5 顺延）
    assert.deepEqual(mv(7, '报仇'), undefined, 'S7 不应再有报仇（咬住 60 更弱，小宝 S5 硬墙 14.8% 须回调）');
    assert.deepEqual(mv(7, '咬住'), ['咬住', '恶', 60]);
    assert.deepEqual(mv(8, '直冲钻'), ['直冲钻', '地面', 80]); // S8 地面（旧 S6 顺延）
    assert.deepEqual(mv(8, '击落'), ['击落', '岩石', 50]);
    assert.deepEqual(mv(8, '踩踏'), ['踩踏', '普通', 65]);
    assert.deepEqual(mv(4, '超级吸取'), ['超级吸取', '草', 40]);
  });

  test('水系道馆改版（2026-10-24）：小宝 Lv.9 火主宠＋草备战开战，新招式配比落到实战状态', async () => {
    const { c2 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(2, weekStart, 4);
    setXp(2, 1500); // Lv.9
    giveDex(2, 'wild:43'); // 走路草（克水解法）
    raw.prepare("INSERT INTO gym_progress(child_id, stage, cleared_at) VALUES(2, 1, '2026-10-24')").run();
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c2, body: { childId: 2, stage: 2, benchNo: 43 } });
    assert.equal(start.j.ok, true, JSON.stringify(start.j));
    assert.equal(start.j.battle.sides.A.pets.length, 2); // 主宠 + 草备战
    // 2026-11-17 8 关扩围：馆主方多只轮换（海星星先发、宝石海星王牌压阵）
    assert.equal(start.j.battle.sides.B.pets.length, 2);
    assert.equal(start.j.battle.sides.B.pets[0].name, '海星星');
    assert.equal(start.j.battle.sides.B.pets[0].level, 12);
    const boss = start.j.battle.sides.B.pets[1];
    assert.equal(boss.name, '宝石海星');
    assert.equal(boss.level, 12);
    const mv = (n) => boss.moves.find((m) => m.name === n);
    assert.equal(mv('水枪').power, 40); // 2026-11-17 数据集校对：官方水枪 40（原自定义水炮冲击）
    assert.equal(mv('高速旋转').power, 50); // 2026-11-17 数据集校对：官方高速旋转 50（幻象光线超能力 STAB 致大宝 S2 7.95% 硬墙，改用物理弱招）
    assert.equal(mv('高速星星').power, 60); // 官方高速星星 60（原自定义旋转突进）
  });

  test('HTTP：道馆第一回合即可出招，馆主同回合行动，无 skip_first', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    setXp(1, 1500);
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1 } });
    assert.equal(start.j.ok, true, JSON.stringify(start.j));
    assert.equal(start.j.battle.turn, 'A');
    assert.equal(start.j.battle.canAttack, true); // 无「先攻首回合不能出招」
    const pet0 = start.j.battle.sides.A.pets[0];
    const mv = pet0.moves.find((m) => !M.moveEffectOf(m.name)) || pet0.moves[0];
    const r = await call('/api/battle/move', { method: 'POST', cookie: c1, body: { battleId: start.j.battle.battleId, moveName: mv.name } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const log = r.j.battle.log;
    assert.ok(log.some((e) => e.side === 'A' && (e.type === 'attack' || e.type === 'miss')), '玩家第一回合应有出招结算');
    assert.ok(log.some((e) => e.side === 'B' && ['attack', 'miss', 'effect'].includes(e.type)), '馆主应在同一回合内行动');
    assert.ok(!log.some((e) => e.type === 'skip_first'), '道馆不应再出现先攻跳过');
  });

  test('HTTP：道馆换宠——activeIdx 切换、原宠不掉血、本回合无玩家攻击事件', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    setXp(1, 1500);
    giveDex(1, 'wild:54');
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, benchNo: 54 } });
    assert.equal(start.j.ok, true, JSON.stringify(start.j));
    const mainBefore = start.j.battle.sides.A.pets[0];
    const r = await call('/api/battle/move', { method: 'POST', cookie: c1, body: { battleId: start.j.battle.battleId, swapToIdx: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.battle.sides.A.activeIdx, 1);
    const mainAfter = r.j.battle.sides.A.pets.find((p) => p.key === 'main');
    assert.equal(mainAfter.hp, mainBefore.hp, '被换下的主宠不应掉血');
    const newLog = r.j.battle.log.slice(start.j.battle.log.length);
    assert.ok(newLog.some((e) => e.type === 'swap' && e.side === 'A'), '应有换宠事件');
    assert.ok(!newLog.some((e) => e.side === 'A' && e.type === 'attack'), '换宠回合玩家不应有攻击结算');
  });
});
