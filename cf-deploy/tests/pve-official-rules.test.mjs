/* PvE 官方规则补齐单测（2026-10-28 用户亲定：只补四条规则，威力保持 App 公式）：
 * STAB ×1.5 / 速度定先攻 / 招式命中率 / 官方随机区间 [0.85, 1.0]，仅 PvE 官方分支。
 * 运行：node --test tests/pve-official-rules.test.mjs */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const M = await import(new URL('../src/index.js', import.meta.url));
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seq = (...vs) => { let i = 0; return () => vs[Math.min(i++, vs.length - 1)]; };
const half = () => 0.5;
const OFF = { chart: 'official' };
const side = (childId, childName, pets) => ({ childId, childName, battleLevel: 5, activeIdx: 0, pets });
const gymState = (aPets, bPets) => M.createBattleState({ mode: 'gym', firstSide: 'A', sides: { A: side(1, '大宝', aPets), B: side(null, '馆主', bPets) } });

function roundEvents(st, action, rng) {
  const result = M.resolveGymRound(st, action, rng);
  const events = Array.isArray(result) ? result : result?.events ?? st.events;
  assert.ok(Array.isArray(events), 'resolveGymRound 应提供事件数组');
  return events;
}

function attackIndex(events, sideId) {
  const index = events.findIndex(event => event.type === 'attack' && event.side === sideId);
  assert.ok(index >= 0, `${sideId} 应有 attack 事件`);
  return index;
}

describe('STAB ×1.5（仅官方分支）', () => {
  test('同属性享 STAB：小火龙火花打妙蛙种子，伤害 12（分步取整：base 5→floor(5×0.93)=4→floor(4×1.5)=6→floor(6×2)=12）', () => {
    const a = M.makePet({
      key: 'main', name: '小火龙', type: '火', no: 4, level: 8,
      moves: [{ name: '火花', type: '火', power: 40 }],
    });
    const b = M.makePet({
      key: 'boss', name: '妙蛙种子', type: '草', no: 1, level: 8,
      moves: [{ name: '藤鞭', type: '草', power: 40 }],
    });
    const move = { name: '火花', type: '火', power: 40 };
    // base 5 × STAB 1.5 × mult 2，分步取整 floor(5×0.93)=4→floor(4×1.5)=6→floor(6×2)=12。
    assert.deepEqual(M.calcDamage(move, a, b, half, OFF), {
      dmg: 12, mult: 2, critical: false, ability: [],
    });
  });

  test('异属性不享 STAB：杰尼龟撞击打皮丘，伤害 7', () => {
    const a = M.makePet({
      key: 'main', name: '杰尼龟', type: '水', no: 7, level: 8,
      moves: [{ name: '撞击', type: '普通', power: 40 }],
    });
    const b = M.makePet({
      key: 'boss', name: '皮丘', type: '电', no: 172, level: 8,
      moves: [{ name: '电击', type: '电', power: 50 }],
    });
    const move = { name: '撞击', type: '普通', power: 40 };
    // base 8 × STAB 1 × mult 1 × 0.93 = 7.44 → 7。
    assert.deepEqual(M.calcDamage(move, a, b, half, OFF), {
      dmg: 7, mult: 1, critical: false, ability: [],
    });
  });

  test('馆主双属性任一匹配享 STAB：宝石海星水炮打小火龙，伤害 50（分步取整：base 19→floor(19×0.93)=17→floor(17×1.5)=25→floor(25×2)=50）', () => {
    const a = M.makePet({
      key: 'boss', name: '宝石海星', type: '水', no: 121, level: 18,
      defTypes: M.bossDefTypes(121),
      moves: [{ name: '水炮', type: '水', power: 30 }],
    });
    const b = M.makePet({
      key: 'main', name: '小火龙', type: '火', no: 4, level: 8,
      moves: [{ name: '火花', type: '火', power: 40 }],
    });
    const move = { name: '水炮', type: '水', power: 30 };
    // base 19 × STAB 1.5（水∈[水, 超能力]）× mult 2，分步取整 17→25→50。
    assert.deepEqual(M.calcDamage(move, a, b, half, OFF), {
      dmg: 50, mult: 2, critical: false, ability: [],
    });
  });

  test('馆主双属性第二属性也享 STAB：宝石海星念力打小火龙，伤害 40（分步取整：base 30→floor(30×0.93)=27→floor(27×1.5)=40）', () => {
    const a = M.makePet({
      key: 'boss', name: '宝石海星', type: '水', no: 121, level: 18,
      defTypes: M.bossDefTypes(121),
      moves: [{ name: '水炮', type: '水', power: 30 }],
    });
    const b = M.makePet({
      key: 'main', name: '小火龙', type: '火', no: 4, level: 8,
      moves: [{ name: '火花', type: '火', power: 40 }],
    });
    // 念力不在官方表内，有效属性回落招式自身 type。
    const move = { name: '念力', type: '超能力', power: 50 };
    // base 30 × STAB 1.5（超能力∈[水, 超能力]）× mult 1，分步取整 27→40。
    assert.deepEqual(M.calcDamage(move, a, b, half, OFF), {
      dmg: 40, mult: 1, critical: false, ability: [],
    });
  });

  test('馆主双属性都不匹配不享 STAB：宝石海星火花打小火龙，伤害 11', () => {
    const a = M.makePet({
      key: 'boss', name: '宝石海星', type: '水', no: 121, level: 18,
      defTypes: M.bossDefTypes(121),
      moves: [{ name: '水炮', type: '水', power: 30 }],
    });
    const b = M.makePet({
      key: 'main', name: '小火龙', type: '火', no: 4, level: 8,
      moves: [{ name: '火花', type: '火', power: 40 }],
    });
    const move = { name: '火花', type: '火', power: 40 };
    // base 24 × STAB 1 × mult 0.5 × 0.93 = 11.16 → 11。
    assert.deepEqual(M.calcDamage(move, a, b, half, OFF), {
      dmg: 11, mult: 0.5, critical: false, ability: [],
    });
  });
});

describe('速度定先攻（仅单人道馆）', () => {
  // statsFor 实测：皮卡丘 Lv.18 速度 37、大岩蛇 30、宝石海星 46、皮丘 26。
  test('快者先手一击打倒对方，对方不出手', () => {
    const a = M.makePet({
      key: 'main', name: '皮卡丘', type: '电', no: 25, level: 18,
      moves: [{ name: '电光一闪', type: '普通', power: 50 }],
    });
    const b = M.makePet({
      key: 'boss', name: '大岩蛇', type: '岩石', no: 95, level: 18,
      defTypes: M.bossDefTypes(95),
      moves: [{ name: '岩石猛击', type: '岩石', power: 28 }],
    });
    b.hp = 1;
    const st = gymState([a], [b]);
    const events = roundEvents(st, { moveName: '电光一闪' }, half);

    assert.equal(st.winner, 'A');
    assert.equal(events.filter(event => event.type === 'attack' && event.side === 'B').length, 0);
    assert.equal(st.sides.B.pets[0].hp, 0);
    // base 5 × mult 0.5 × 0.93 = 2.325 → 2。
    assert.equal(events[attackIndex(events, 'A')].dmg, 2);
  });

  test('慢者被先手一击打倒，自己不出手', () => {
    const a = M.makePet({
      key: 'main', name: '皮丘', type: '电', no: 172, level: 18,
      moves: [{ name: '电光一闪', type: '普通', power: 50 }],
    });
    a.hp = 1;
    const b = M.makePet({
      key: 'boss', name: '宝石海星', type: '水', no: 121, level: 18,
      defTypes: M.bossDefTypes(121),
      moves: [{ name: '水炮', type: '水', power: 30 }],
    });
    const st = gymState([a], [b]);
    const events = roundEvents(st, { moveName: '电光一闪' }, half);

    assert.equal(st.winner, 'B');
    assert.equal(events.filter(event => event.type === 'attack' && event.side === 'A').length, 0);
    // base 15 × STAB 1.5 × mult 1，分步取整 floor(15×0.93)=13→floor(13×1.5)=19。
    assert.equal(events[attackIndex(events, 'B')].dmg, 19);
  });

  test('都不倒时快者的攻击事件在先', () => {
    const a = M.makePet({
      key: 'main', name: '皮卡丘', type: '电', no: 25, level: 18,
      moves: [{ name: '电光一闪', type: '普通', power: 50 }],
    });
    const b = M.makePet({
      key: 'boss', name: '大岩蛇', type: '岩石', no: 95, level: 18,
      defTypes: M.bossDefTypes(95),
      moves: [{ name: '岩石猛击', type: '岩石', power: 28 }],
    });
    const st = gymState([a], [b]);
    const events = roundEvents(st, { moveName: '电光一闪' }, half);

    assert.ok(attackIndex(events, 'A') < attackIndex(events, 'B'));
    assert.equal(st.winner, null);
  });

  test('速度平局用 rng 随机：同一对局两种种子各出一种先手', () => {
    const freshState = () => gymState([
      M.makePet({
        key: 'main', name: '皮卡丘', type: '电', no: 25, level: 18,
        moves: [{ name: '电光一闪', type: '普通', power: 50 }],
      }),
    ], [
      M.makePet({
        key: 'boss', name: '皮卡丘', type: '电', no: 25, level: 18,
        moves: [{ name: '电光一闪', type: '普通', power: 50 }],
      }),
    ]);

    // rng 消耗顺序：馆主 AI 先消耗 2 次（蓄势判定 0.9 不蓄势、
    // 选招 0.0 选首招），平局掷骰消耗第 3 次（0.1 → A 先、0.9 → B 先）。
    const stA = freshState();
    const eventsA = roundEvents(stA, { moveName: '电光一闪' }, seq(0.9, 0.0, 0.1));
    assert.ok(attackIndex(eventsA, 'A') < attackIndex(eventsA, 'B'));

    const stB = freshState();
    const eventsB = roundEvents(stB, { moveName: '电光一闪' }, seq(0.9, 0.0, 0.9));
    assert.ok(attackIndex(eventsB, 'B') < attackIndex(eventsB, 'A'));
  });
});

describe('招式命中率（仅官方分支伤害招式）', () => {
  test('命中率 100 必中：水枪 2000 次全中', () => {
    const a = M.makePet({
      key: 'main', name: '杰尼龟', type: '水', no: 7, level: 8,
      moves: [{ name: '水枪', type: '水', power: 40 }],
    });
    const b = M.makePet({
      key: 'boss', name: '大岩蛇', type: '岩石', no: 95, level: 12,
      defTypes: M.bossDefTypes(95),
      moves: [{ name: '岩石猛击', type: '岩石', power: 28 }],
    });
    const move = { name: '水枪', type: '水', power: 40 };
    const rng = mulberry32(777);
    let miss = 0;
    for (let i = 0; i < 2000; i++) {
      if (M.calcDamage(move, a, b, rng, OFF).missed) miss++;
    }
    assert.equal(miss, 0);
  });

  test('命中率 70 约三成 miss：打雷 2000 次 miss 率在 25%–35%', () => {
    const a = M.makePet({
      key: 'main', name: '皮卡丘', type: '电', no: 25, level: 18,
      moves: [{ name: '打雷', type: '电', power: 110 }],
    });
    const b = M.makePet({
      key: 'boss', name: '宝石海星', type: '水', no: 121, level: 18,
      defTypes: M.bossDefTypes(121),
      moves: [{ name: '水炮', type: '水', power: 30 }],
    });
    const move = { name: '打雷', type: '电', power: 110 };
    const rng = mulberry32(12345);
    let miss = 0;
    // 打雷官方命中率 70，miss 须带 missed: true、伤害 0。
    for (let i = 0; i < 2000; i++) {
      const result = M.calcDamage(move, a, b, rng, OFF);
      if (result.missed) {
        miss++;
        assert.equal(result.missed, true);
        assert.equal(result.dmg, 0);
      }
    }
    // 实测 614 次，30.7%。
    assert.ok(miss >= 500 && miss <= 700, `miss 次数 ${miss} 应在 [500, 700]`);
  });

  test('表中没有命中率的招式永远命中', () => {
    const a = M.makePet({
      key: 'main', name: '皮卡丘', type: '电', no: 25, level: 18,
      moves: [{ name: '电光一闪', type: '普通', power: 50 }],
    });
    const b = M.makePet({
      key: 'boss', name: '宝石海星', type: '水', no: 121, level: 18,
      defTypes: M.bossDefTypes(121),
      moves: [{ name: '水炮', type: '水', power: 30 }],
    });
    const move = { name: '自创招式', type: '电', power: 50 };
    const rng = () => 0.99;
    let miss = 0;
    // 绝不为表中没有的招式编造命中率。
    for (let i = 0; i < 200; i++) {
      if (M.calcDamage(move, a, b, rng, OFF).missed) miss++;
    }
    assert.equal(miss, 0);
  });
});

describe('官方随机区间 [0.85, 1.0]', () => {
  test('大样本伤害上下界恰为 [85, 100]', () => {
    const move = { name: '自创招式', type: '火', power: 100 };
    const a = { level: 10, type: '水', stats: null };
    const b = { level: 10, type: '普通', stats: null };
    const rng = mulberry32(999);
    let lo = Infinity;
    let hi = -Infinity;

    // 无 stats 回落 base 100 × 区间 [0.85, 1.0]；
    // 火招水宠无 STAB，火打普通 mult 1；官方为整数百分比 85–100，共 16 档。
    for (let i = 0; i < 2000; i++) {
      const result = M.calcDamage(move, a, b, rng, OFF);
      if (result.critical) continue;
      lo = Math.min(lo, result.dmg);
      hi = Math.max(hi, result.dmg);
    }
    assert.equal(lo, 85);
    assert.equal(hi, 100);
  });
});

describe('命中落空事件渲染', () => {
  test('打雷落空：miss 事件文案“却没打中”，对方不扣血', () => {
    const a = M.makePet({
      key: 'main', name: '皮卡丘', type: '电', no: 25, level: 18,
      moves: [{ name: '打雷', type: '电', power: 110 }],
    });
    const b = M.makePet({
      key: 'boss', name: '妙蛙种子', type: '草', no: 1, level: 18,
      moves: [{ name: '藤鞭', type: '草', power: 40 }],
    });
    const st = gymState([a], [b]);
    // A 速度 37 快于 B 速度 21，先攻；命中检定 90 ≥ 70 落空。
    // 打雷打草 mult 0.5 不免疫，落空纯由命中检定导致。
    const events = roundEvents(st, { moveName: '打雷' }, () => 0.9);
    const miss = events.find(event => event.type === 'miss' && event.side === 'A');

    assert.ok(miss, '应产生 A 方的 miss 事件');
    assert.match(miss.text, /却没打中/);
    assert.doesNotMatch(miss.text, /烟幕/);
    assert.equal(events.filter(event => event.type === 'attack' && event.side === 'A').length, 0);
    assert.equal(st.sides.B.pets[0].hp, st.sides.B.pets[0].maxHp);
  });
});
