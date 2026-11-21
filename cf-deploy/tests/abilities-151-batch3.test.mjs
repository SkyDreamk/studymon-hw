/* 特性 151 Batch 3（13 种状态/接触/换下/回合末特性）：node --test tests/abilities-151-batch3.test.mjs
 * 覆盖：飞毛腿／拨沙／太阳之力／沙之力／防尘／雨盘／湿润之躯／再生力／魔法防守／毒手／引爆／水幕／无关天气
 * （服务端 M＋离线端 L 双端）、合作战毒手／引爆（仅服务端）、PvP 经典分支边界、道馆集成、abilityOf( 范围守卫。
 * 脚手架：Batch 2 同款——M 来自 ../src/index.js（动态 import）；L 经 asset-path.mjs 取离线端 bundle；
 * calcDamage 参数顺序是 (move, atkPet, defPet, rng, opts)；makePet 的 moves 必须是 {name,power,…} 对象数组；
 * 名字与属性取 SPECIES／playerDefTypes（DEX_DETAILS 无 name 字段）；事件文案用 M.abilityEventText（abilityEvents 未导出）；
 * applyBattleAction 签名是 (st, side, moveName 字符串, rng, opts)，返回 {events}／{error}。
 * 撞击统一用手写 power 35（Batch 2 脚手架口径；官方表为 40）；力量宝石／原始之力表内无 power，手写 70；
 * 岩石封锁表内无 power，手写 50（NON_CONTACT_MOVES 成员）。
 * 离线端（L）用例在“镜像＋哈希轮换”之前会红（读的是旧 bundle），属预期。
 * T51 数值经探测脚本确认：#90 Lv18 maxHp 38，#74 Lv12 撞击打 3，第一回合后 hp=35、无人出局。
 * T50 种子 () => 0.1 经探测确认：馆主先手撞击约 5 伤、玩家存活，火花命中且太阳之力条目渲染。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';
import { readBackendSource } from './backend-src.mjs';

const M = await import(new URL('../src/index.js', import.meta.url));
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);

const R = () => 0.5;
const OFF = { chart: 'official', critRate: 0 };
// 计数 rng：每次调用 n++，按 vals 依次返回（用尽后返回最后一个值）。
const counting = (vals) => {
  const f = () => {
    f.n++;
    return vals[Math.min(f.n - 1, vals.length - 1)];
  };
  f.n = 0;
  return f;
};

const TACKLE = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' };
const EMBER = { name: '火花', type: '火', power: 40, damage_class: 'special' };
const POWERGEM = { name: '力量宝石', type: '岩石', power: 70, damage_class: 'special' };
const ROCKLOCK = { name: '岩石封锁', type: '岩石', power: 50, damage_class: 'physical' };

// Batch 2 同款 mk：名字与属性取 SPECIES，defTypes 取 playerDefTypes，等级 20，moves 为对象数组。
// makePet 不接受 hp/status 覆盖——残血/异常状态须建宠后另行赋值。
const mk = (E, no, ability, moves = [TACKLE], extra = {}) => {
  const sp = E.SPECIES[no];
  return E.makePet({ key: `p${no}`, name: sp ? sp.name : `#${no}`, type: sp ? sp.type : '普通', no, defTypes: E.playerDefTypes(no), level: 20, moves, ability, ...extra });
};
// Batch 2 同款 makePvpState，另加 weather 参数（null=无天气）。
function makePvpState(E, petA, petB, firstSide = 'A', weather = null) {
  const st = E.createBattleState({
    mode: 'pvp', firstSide,
    sides: {
      A: { childId: 1, childName: '大宝', battleLevel: 20, activeIdx: 0, pets: Array.isArray(petA) ? petA : [petA] },
      B: { childId: 2, childName: '小宝', battleLevel: 20, activeIdx: 0, pets: Array.isArray(petB) ? petB : [petB] },
    },
    weather,
  });
  st.turn = firstSide;
  return st;
}
// 道馆态：玩家单宠 vs 馆主队（activeIdx 指定首发）。
function makeGymState(playerPet, bossPets, weather, bossActiveIdx = 0) {
  return M.createBattleState({
    mode: 'gym', firstSide: 'A', weather,
    sides: {
      A: { pets: [playerPet] },
      B: { pets: bossPets, activeIdx: bossActiveIdx },
    },
  });
}
// calcDamage ability 条目的精确文案（服务端 M；abilityEvents 未导出，改走 abilityEventText）。
const entryText = (entry) => M.abilityEventText(entry);

describe('Batch 3 — 飞毛腿（T1–T3）', () => {
  test('T1: 飞毛腿麻痹时先 ×0.5 再 ×1.5（57 * 0.5 * 1.5 = 42.75）', () => {
    const jolteon = mk(M, 135, '飞毛腿');
    jolteon.status = { kind: 'paralysis' };
    assert.equal(M.effectiveSpeed(jolteon, null), 42.75);
  });

  test('T2: 飞毛腿无异常状态时不加成（57）', () => {
    const jolteon = mk(M, 135, '飞毛腿');
    assert.equal(M.effectiveSpeed(jolteon, null), 57);
  });

  test('T3: 首特性蓄电麻痹为 28.5；飞毛腿中毒不减速且 ×1.5 为 85.5', () => {
    const joltVolt = mk(M, 135);
    joltVolt.status = { kind: 'paralysis' };
    assert.equal(M.effectiveSpeed(joltVolt, null), 28.5);

    const joltQuick = mk(M, 135, '飞毛腿');
    joltQuick.status = { kind: 'poison' };
    assert.equal(M.effectiveSpeed(joltQuick, null), 85.5);
  });
});

describe('Batch 3 — 拨沙（T4–T6）', () => {
  test('T4: 拨沙在沙暴下速度 ×2（21 -> 42），无天气/大晴天为 21', () => {
    const sandshrew = mk(M, 27, '拨沙');
    assert.equal(M.effectiveSpeed(sandshrew, 'sand'), 42);
    assert.equal(M.effectiveSpeed(sandshrew, null), 21);
    assert.equal(M.effectiveSpeed(sandshrew, 'sun'), 21);
  });

  test('T5: 拨沙沙暴免伤独立于地面属性（改 defTypes 为水仍免伤，首特性沙隐扣 3）', () => {
    const sandRushWater = mk(M, 27, '拨沙');
    sandRushWater.defTypes = ['水'];
    const sandVeilWater = mk(M, 27);
    sandVeilWater.defTypes = ['水'];
    const st = makePvpState(M, sandRushWater, sandVeilWater, 'A', 'sand');
    M.tickActiveStatuses(st, R, []);
    assert.equal(sandRushWater.hp, 50);
    assert.equal(sandVeilWater.hp, 47);
  });

  test('T6: 道馆 S1 沙暴下拨沙翻转先手顺序（activeIdx=1 对阵 #95 大岩蛇）', () => {
    // 真实 S1 首发为 74，95 须 74 倒下后顶上；此处 activeIdx=1 直接对阵 95（与任务单一致）。
    const makeS1 = (ability) => makeGymState(
      mk(M, 27, ability, [TACKLE], { level: 18 }),
      [mk(M, 74, undefined, [TACKLE], { level: 12 }), mk(M, 95, undefined, [TACKLE], { level: 13 })],
      'sand', 1,
    );
    const outRush = M.resolveGymRound(makeS1('拨沙'), { type: 'move', moveName: '撞击' }, R);
    assert.equal((outRush.events || []).find((e) => e.type === 'attack')?.side, 'A');
    const outVeil = M.resolveGymRound(makeS1('沙隐'), { type: 'move', moveName: '撞击' }, R);
    assert.equal((outVeil.events || []).find((e) => e.type === 'attack')?.side, 'B');
  });
});

describe('Batch 3 — 太阳之力（T7–T10）', () => {
  test('T7: 大晴天太阳之力特殊招特攻 ×1.5（dmg=12 vs 首特性猛火 9）并推精确事件', () => {
    const charSolar = mk(M, 4, '太阳之力');
    const charBlaze = mk(M, 4);
    const squirtle = mk(M, 7);
    const resSolar = M.calcDamage(EMBER, charSolar, squirtle, R, { ...OFF, weather: 'sun' });
    const resBlaze = M.calcDamage(EMBER, charBlaze, squirtle, R, { ...OFF, weather: 'sun' });
    assert.equal(resSolar.dmg, 12);
    assert.equal(resBlaze.dmg, 9);
    const solarEntry = resSolar.ability.find((a) => a.kind === 'solarpower');
    assert.ok(solarEntry);
    assert.equal(entryText(solarEntry), '「太阳之力」发动！小火龙 在大晴天里特攻提升了！');
  });

  test('T8: 无天气或大晴天物理招不触发太阳之力', () => {
    const charSolar = mk(M, 4, '太阳之力');
    const squirtle = mk(M, 7);
    const resNoWeather = M.calcDamage(EMBER, charSolar, squirtle, R, OFF);
    assert.equal(resNoWeather.dmg, 6);
    assert.ok(!resNoWeather.ability.some((a) => a.kind === 'solarpower'));

    const resPhysSun = M.calcDamage(TACKLE, charSolar, squirtle, R, { ...OFF, weather: 'sun' });
    assert.ok(!resPhysSun.ability.some((a) => a.kind === 'solarpower'));
  });

  test('T9: 大晴天回合末太阳之力扣 floor(45/8)=5 点体力，雨天/无天气不扣', () => {
    const cSun = mk(M, 4, '太阳之力');
    const evSun = [];
    M.tickActiveStatuses(makePvpState(M, cSun, mk(M, 7), 'A', 'sun'), R, evSun);
    assert.equal(cSun.hp, 40);
    assert.equal(
      evSun.find((e) => e.ability === '太阳之力')?.text,
      '「太阳之力」发动！小火龙 在大晴天里损失了 5 点体力！',
    );

    const cRain = mk(M, 4, '太阳之力');
    M.tickActiveStatuses(makePvpState(M, cRain, mk(M, 7), 'A', 'rain'), R, []);
    assert.equal(cRain.hp, 45);
  });

  test('T10: 中毒 + 大晴天太阳之力叠加扣血，顺序为状态先、天气后', () => {
    const c = mk(M, 4, '太阳之力');
    c.status = { kind: 'poison' };
    const events = [];
    M.tickActiveStatuses(makePvpState(M, c, mk(M, 7), 'A', 'sun'), R, events);
    assert.equal(c.hp, 35);
    const idxPoison = events.findIndex((e) => e.type === 'status' && e.kind === 'poison');
    const idxSolar = events.findIndex((e) => e.ability === '太阳之力');
    assert.ok(idxPoison >= 0 && idxSolar > idxPoison);
  });
});

describe('Batch 3 — 沙之力（T11–T13）', () => {
  test('T11: 沙暴天沙之力岩石招威力 ×1.3（dmg=14 vs 首特性沙隐 12）并推精确事件', () => {
    const digForce = mk(M, 50, '沙之力');
    const digVeil = mk(M, 50);
    const clef = mk(M, 35);
    const resForce = M.calcDamage(ROCKLOCK, digForce, clef, R, { ...OFF, weather: 'sand' });
    const resVeil = M.calcDamage(ROCKLOCK, digVeil, clef, R, { ...OFF, weather: 'sand' });
    assert.equal(resForce.dmg, 14);
    assert.equal(resVeil.dmg, 12);
    const forceEntry = resForce.ability.find((a) => a.kind === 'sandforce');
    assert.ok(forceEntry);
    assert.equal(entryText(forceEntry), '「沙之力」发动！地鼠 在沙暴里岩石属性招式威力提升了！');
  });

  test('T12: 非沙暴天气或非岩/地/钢招式不触发沙之力', () => {
    const digForce = mk(M, 50, '沙之力');
    const clef = mk(M, 35);
    assert.equal(M.calcDamage(ROCKLOCK, digForce, clef, R, { ...OFF, weather: 'sun' }).dmg, 12);
    const resNormal = M.calcDamage(TACKLE, digForce, clef, R, { ...OFF, weather: 'sand' });
    assert.equal(resNormal.dmg, 8);
    assert.ok(!resNormal.ability.some((a) => a.kind === 'sandforce'));
  });

  test('T13: 沙之力沙暴免伤独立于地面属性（改 defTypes 为水仍免伤，首特性沙隐扣 2）', () => {
    const digForceWater = mk(M, 50, '沙之力');
    digForceWater.defTypes = ['水'];
    const digVeilWater = mk(M, 50);
    digVeilWater.defTypes = ['水'];
    M.tickActiveStatuses(makePvpState(M, digForceWater, digVeilWater, 'A', 'sand'), R, []);
    assert.equal(digForceWater.hp, 34);
    assert.equal(digVeilWater.hp, 32);
  });
});

describe('Batch 3 — 防尘与沙暴免疫（T14–T16）', () => {
  test('T14: isSandImmune 覆盖防尘/拨沙/沙之力与岩石/地面/钢属性', () => {
    assert.equal(M.isSandImmune(mk(M, 90, '防尘')), true);
    assert.equal(M.isSandImmune(mk(M, 27, '拨沙')), true);
    assert.equal(M.isSandImmune(mk(M, 50, '沙之力')), true);
    assert.equal(M.isSandImmune(mk(M, 95)), true);
    assert.equal(M.isSandImmune(mk(M, 100)), false);
    assert.equal(M.isSandImmune(mk(M, 35)), false);
    assert.equal(M.isSandImmune(null), false);
  });

  test('T15: 非免疫电宠沙暴扣 2；防尘水宠沙暴静默免伤', () => {
    const voltorb = mk(M, 100);
    const shellderCoat = mk(M, 90, '防尘');
    const ev1 = [];
    M.tickActiveStatuses(makePvpState(M, voltorb, shellderCoat, 'A', 'sand'), R, ev1);
    assert.equal(voltorb.hp, 44);
    assert.equal(shellderCoat.hp, 42);
    assert.ok(!ev1.some((e) => e.pet === shellderCoat.name));
  });

  test('T16: 首特性硬壳盔甲沙暴扣 2（对照 T15 的防尘免伤）', () => {
    const shellderShell = mk(M, 90);
    const shellderCoat = mk(M, 90, '防尘');
    M.tickActiveStatuses(makePvpState(M, shellderShell, shellderCoat, 'A', 'sand'), R, []);
    assert.equal(shellderShell.hp, 40);
  });
});

describe('Batch 3 — 雨盘与湿润之躯（T17–T20）', () => {
  test('T17: 雨盘雨天回复 floor(47/16)=2 点体力', () => {
    const squirtle = mk(M, 7, '雨盘');
    squirtle.hp = 40;
    const ev = [];
    M.tickActiveStatuses(makePvpState(M, squirtle, mk(M, 35), 'A', 'rain'), R, ev);
    assert.equal(squirtle.hp, 42);
    assert.equal(ev.find((e) => e.ability === '雨盘')?.text, '「雨盘」发动！杰尼龟 回复了 2 点体力！');
  });

  test('T18: 雨盘满血或无雨不触发', () => {
    const fullSq = mk(M, 7, '雨盘');
    const evFull = [];
    M.tickActiveStatuses(makePvpState(M, fullSq, mk(M, 35), 'A', 'rain'), R, evFull);
    assert.equal(fullSq.hp, 47);
    assert.ok(!evFull.some((e) => e.ability === '雨盘'));

    const drySq = mk(M, 7, '雨盘');
    drySq.hp = 40;
    M.tickActiveStatuses(makePvpState(M, drySq, mk(M, 35), 'A', null), R, []);
    assert.equal(drySq.hp, 40);
  });

  test('T19: 湿润之躯雨天先扣中毒伤害（56-7=49）再治愈状态', () => {
    const seel = mk(M, 86, '湿润之躯');
    seel.status = { kind: 'poison' };
    const ev = [];
    M.tickActiveStatuses(makePvpState(M, seel, mk(M, 35), 'A', 'rain'), R, ev);
    assert.equal(seel.hp, 49);
    assert.strictEqual(seel.status, null);
    const idxDmg = ev.findIndex((e) => e.type === 'status');
    const idxCure = ev.findIndex((e) => e.ability === '湿润之躯');
    assert.ok(idxDmg >= 0 && idxCure > idxDmg);
    assert.equal(ev[idxCure].text, '「湿润之躯」发动！小海狮 的中毒治愈了！');
  });

  test('T20: 湿润之躯无雨不治愈（扣血照常，状态保留）', () => {
    const seelDry = mk(M, 86, '湿润之躯');
    seelDry.status = { kind: 'poison' };
    M.tickActiveStatuses(makePvpState(M, seelDry, mk(M, 35), 'A', null), R, []);
    assert.equal(seelDry.hp, 49);
    assert.equal(seelDry.status?.kind, 'poison');
  });
});

describe('Batch 3 — 再生力（T21–T22）', () => {
  test('T21: 主动换下回复 floor(66/3)=22 点体力；满血不推事件', () => {
    const slowpoke = mk(M, 79, '再生力');
    slowpoke.hp = 40;
    const st = makePvpState(M, [slowpoke, mk(M, 35)], mk(M, 7));
    const ev = [];
    M.onPetLeavesField(st, 'A', slowpoke, ev);
    assert.equal(slowpoke.hp, 62);
    assert.equal(ev.find((e) => e.ability === '再生力')?.text, '「再生力」发动！呆呆兽 下场后回复了 22 点体力！');

    const fullSlow = mk(M, 79, '再生力');
    const evFull = [];
    M.onPetLeavesField(st, 'A', fullSlow, evFull);
    assert.equal(evFull.length, 0);
  });

  test('T22: applyPvpSwap 端到端——换下呆呆兽回 22 血（30 -> 52）', () => {
    const swapSlow = mk(M, 79, '再生力');
    swapSlow.hp = 30;
    const pvpSt = makePvpState(M, [swapSlow, mk(M, 35)], mk(M, 7), 'A');
    const r = M.applyPvpSwap(pvpSt, 'A', 1, R);
    assert.equal(r.error, undefined);
    assert.equal(swapSlow.hp, 52);
    assert.ok((r.events || []).some((e) => e.ability === '再生力'));
  });
});

describe('Batch 3 — 魔法防守（T23–T26）', () => {
  test('T23: 魔法防守中毒不扣血、保留状态，每回合至多推一条事件', () => {
    const clefPoison = mk(M, 35, '魔法防守');
    clefPoison.status = { kind: 'poison' };
    const ev1 = [];
    M.tickActiveStatuses(makePvpState(M, clefPoison, mk(M, 7), 'A', null), R, ev1);
    assert.equal(clefPoison.hp, 58);
    assert.equal(clefPoison.status?.kind, 'poison');
    const mgEvs = ev1.filter((e) => e.ability === '魔法防守');
    assert.equal(mgEvs.length, 1);
    assert.equal(mgEvs[0].text, '「魔法防守」发动！皮皮 不受招式以外的伤害！');
  });

  test('T24: 魔法防守无状态沙暴不扣血，仍推一条事件', () => {
    const clef = mk(M, 35, '魔法防守');
    const ev = [];
    M.tickActiveStatuses(makePvpState(M, clef, mk(M, 7), 'A', 'sand'), R, ev);
    assert.equal(clef.hp, 58);
    assert.equal(ev.filter((e) => e.ability === '魔法防守').length, 1);
  });

  test('T25: 魔法防守睡眠照常醒来，不推多余事件', () => {
    const clefSleep = mk(M, 35, '魔法防守');
    clefSleep.status = { kind: 'sleep', sleepTurns: 1 };
    const ev2 = [];
    M.tickActiveStatuses(makePvpState(M, clefSleep, mk(M, 7), 'A', null), R, ev2);
    assert.strictEqual(clefSleep.status, null);
    assert.ok(!ev2.some((e) => e.ability === '魔法防守'));
  });

  test('T26: 魔法防守属性已免沙暴时不推多余事件', () => {
    const clefRock = mk(M, 35, '魔法防守');
    clefRock.defTypes = ['岩石'];
    const ev3 = [];
    M.tickActiveStatuses(makePvpState(M, clefRock, mk(M, 7), 'A', 'sand'), R, ev3);
    assert.equal(clefRock.hp, 58);
    assert.ok(!ev3.some((e) => e.ability === '魔法防守'));
  });
});

describe('Batch 3 — 毒手（T27–T31）', () => {
  test('T27: 毒手 30% 门槛（0.29 触发、0.31 不触发）与精确文案', () => {
    const grimer = mk(M, 88, '毒手');
    const rng3 = counting([0.29, 0.31, 0.29]);
    let poisoned = 0;
    let lastEvs = [];
    for (let i = 0; i < 3; i++) {
      const target = mk(M, 35);
      const evs = [];
      M.applyAttackerContactTrigger(grimer, target, TACKLE, rng3, evs, 'A', 'B', null);
      if (target.status?.kind === 'poison') {
        poisoned++;
        lastEvs = evs;
      }
    }
    assert.equal(poisoned, 2);
    assert.equal(rng3.n, 3);
    assert.equal(lastEvs.find((e) => e.ability === '毒手')?.text, `「毒手」发动！${grimer.name} 让 皮皮 中毒了！`);
  });

  test('T28: 毒手守卫在掷骰前返回（0 消耗）；目标已有中毒仍消耗 1 次掷骰', () => {
    const grimer = mk(M, 88, '毒手');
    const rZero = counting([0.1]);
    M.applyAttackerContactTrigger(grimer, mk(M, 35), ROCKLOCK, rZero, [], 'A', 'B', null);
    const faintedDef = mk(M, 35);
    faintedDef.hp = 0;
    M.applyAttackerContactTrigger(grimer, faintedDef, TACKLE, rZero, [], 'A', 'B', null);
    M.applyAttackerContactTrigger(mk(M, 88), mk(M, 35), TACKLE, rZero, [], 'A', 'B', null);
    assert.equal(rZero.n, 0);

    const rPoisoned = counting([0.29]);
    const alreadyPoisoned = mk(M, 35);
    alreadyPoisoned.status = { kind: 'poison' };
    M.applyAttackerContactTrigger(grimer, alreadyPoisoned, TACKLE, rPoisoned, [], 'A', 'B', null);
    assert.equal(rPoisoned.n, 1);
    assert.equal(alreadyPoisoned.status?.kind, 'poison');
  });

  test('T29: 毒手分布（10 次循环 [0.29, 0.31] 恰好 5 次中毒）', () => {
    const grimer = mk(M, 88, '毒手');
    const r10 = counting([0.29, 0.31, 0.29, 0.31, 0.29, 0.31, 0.29, 0.31, 0.29, 0.31]);
    let cnt10 = 0;
    for (let i = 0; i < 10; i++) {
      const t = mk(M, 35);
      M.applyAttackerContactTrigger(grimer, t, TACKLE, r10, [], 'A', 'B', null);
      if (t.status?.kind === 'poison') cnt10++;
    }
    assert.equal(cnt10, 5);
  });

  test('T30: applyBattleAction 中毒手接线（防守方无接触特性，仅毒手触发）', () => {
    const grimer = mk(M, 88, '毒手');
    const clef = mk(M, 35);
    // 掷骰顺序：calcDamage 命中/暴击/伤害随机（3 次）＋毒手（第 4 次 0.29）。
    const r = M.applyBattleAction(
      makePvpState(M, grimer, clef, 'A'), 'A', '撞击', counting([0.5, 0.5, 0.5, 0.29]), OFF,
    );
    assert.equal(r.error, undefined);
    assert.equal(clef.status?.kind, 'poison');
    assert.strictEqual(grimer.status, null);
  });

  test('T31: applyBattleAction 中防守方静电先掷、攻击方毒手后掷（两态都挂上）', () => {
    const grimer = mk(M, 88, '毒手');
    const pikaStatic = mk(M, 25);
    // 掷骰顺序：calcDamage（3 次）＋静电（第 4 次 0.1）＋毒手（第 5 次 0.29）。
    const r = M.applyBattleAction(
      makePvpState(M, grimer, pikaStatic, 'A'), 'A', '撞击', counting([0.5, 0.5, 0.5, 0.1, 0.29]), OFF,
    );
    assert.equal(r.error, undefined);
    assert.equal(grimer.status?.kind, 'paralysis');
    assert.equal(pikaStatic.status?.kind, 'poison');
  });
});

describe('Batch 3 — 引爆（T32–T36）', () => {
  test('T32: 引爆扣攻击方 1/4 最大 HP（44 -> 11）并推精确事件', () => {
    const pika = mk(M, 25);
    const voltorb = mk(M, 100, '引爆');
    const evs = [];
    const dmg = M.applyAftermath(pika, voltorb, TACKLE, evs, 'B');
    assert.equal(dmg, 11);
    assert.equal(pika.hp, 33);
    assert.equal(
      evs[0].text,
      '「引爆」发动！霹雳电球 倒下时引爆了，皮卡丘 损失了 11 点体力！',
    );
  });

  test('T33: 引爆守卫——非接触招/非引爆/攻击方已昏厥均不触发（0）', () => {
    const pika = mk(M, 25);
    const voltorb = mk(M, 100, '引爆');
    assert.equal(M.applyAftermath(pika, voltorb, ROCKLOCK, [], 'B'), 0);
    assert.equal(M.applyAftermath(pika, mk(M, 100), TACKLE, [], 'B'), 0);
    const faintPika = mk(M, 25);
    faintPika.hp = 0;
    assert.equal(M.applyAftermath(faintPika, voltorb, TACKLE, [], 'B'), 0);
  });

  test('T34: applyBattleAction 中引爆扣血（44-11=33），B 侧有后备、胜负未定', () => {
    const pika = mk(M, 25, '静电');
    const voltorb = mk(M, 100, '引爆');
    voltorb.hp = 1;
    const st1 = makePvpState(M, [pika, mk(M, 35)], [voltorb, mk(M, 7)], 'A');
    const r = M.applyBattleAction(st1, 'A', '撞击', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(voltorb.hp, 0);
    assert.equal(pika.hp, 33);
    assert.strictEqual(st1.winner, null);
  });

  test('T35: 引爆双亡——A 侧仅 1 宠且残血 10，引爆 11 点带走，后倒下者败（B 胜）', () => {
    const pikaLow = mk(M, 25, '静电');
    pikaLow.hp = 10;
    const volt2 = mk(M, 100, '引爆');
    volt2.hp = 1;
    const st2 = makePvpState(M, [pikaLow], [volt2], 'A');
    M.applyBattleAction(st2, 'A', '撞击', R, OFF);
    assert.equal(pikaLow.hp, 0);
    assert.equal(st2.winner, 'B');
  });

  test('T36: 非接触致昏不触发引爆（岩石封锁打倒，皮卡丘满血 44，A 胜）', () => {
    const pikaSafe = mk(M, 25, '静电', [ROCKLOCK]);
    const volt3 = mk(M, 100, '引爆');
    volt3.hp = 1;
    const st3 = makePvpState(M, [pikaSafe], [volt3], 'A');
    M.applyBattleAction(st3, 'A', '岩石封锁', R, OFF);
    assert.equal(pikaSafe.hp, 44);
    assert.equal(st3.winner, 'A');
  });
});

describe('Batch 3 — 水幕（T37–T38）', () => {
  test('T37: 水幕阻止灼伤并推 ability 事件', () => {
    const goldeenVeil = mk(M, 118, '水幕');
    const resBlock = M.tryInflictStatus(goldeenVeil, 'burn', R, 'B', null);
    assert.equal(resBlock.blocked, true);
    assert.strictEqual(goldeenVeil.status, null);
    assert.equal(resBlock.event?.text, '「水幕」发动！角金鱼 不会灼伤！');
  });

  test('T38: 首特性悠游自如正常灼伤；火属性宠属性免疫灼伤', () => {
    const goldeenSwim = mk(M, 118);
    const resBurn = M.tryInflictStatus(goldeenSwim, 'burn', R, 'B', null);
    assert.equal(resBurn.inflicted, true);
    assert.equal(goldeenSwim.status?.kind, 'burn');

    const charmander = mk(M, 4);
    const resFire = M.tryInflictStatus(charmander, 'burn', R, 'B', null);
    assert.equal(resFire.blocked, true);
    assert.equal(resFire.event?.type, 'status');
    assert.equal(resFire.event?.text, '小火龙 不会灼伤！');
  });
});

describe('Batch 3 — 无关天气（T39–T43）', () => {
  test('T39: 无关天气压制太阳之力与晴天火加成（dmg=7，与无天气对照相同）', () => {
    const charSolar = mk(M, 4, '太阳之力');
    const psyduckCloud = mk(M, 54, '无关天气');
    // #54 Lv20 spd=25（非 #7 的 30）：base=11 → 随机 10 → STAB 15 → 克制 7。
    const res = M.calcDamage(EMBER, charSolar, psyduckCloud, R, { ...OFF, weather: 'sun' });
    assert.equal(res.dmg, 7);
    assert.ok(!res.ability.some((a) => a.kind === 'solarpower'));
    assert.ok(!res.ability.some((a) => a.kind === 'weather'));
    const control = M.calcDamage(EMBER, charSolar, psyduckCloud, R, OFF);
    assert.equal(control.dmg, 7);
  });

  test('T40: 无关天气压制沙暴特防——被压制方 dmg=4，与无天气对照相同', () => {
    const psyduckCloud = mk(M, 54, '无关天气');
    const squirtle = mk(M, 7);
    const suppressed = M.calcDamage(EMBER, psyduckCloud, squirtle, R, { ...OFF, weather: 'sun' });
    const control = M.calcDamage(EMBER, psyduckCloud, squirtle, R, OFF);
    assert.equal(suppressed.dmg, 4);
    assert.equal(control.dmg, 4);
  });

  test('T41: 无关天气压制沙暴岩石特防（对照 4、压制组 9；力量宝石手写 power 70）', () => {
    // 岩石打大岩蛇（岩石/地面）克制为 0.5（岩→岩 1 × 岩→地 0.5），非任务单所写的 1：
    // 对照 atk #50（spa 19）：D=floor(23×1.5)=34、base=9、随机 8、STAB 1、克制 0.5 → 4；
    // 压制组 atk #54（spa 31）：D=23、base=20、随机 18、STAB 1、克制 0.5 → 9。
    const diglett = mk(M, 50);
    const psyduckCloud = mk(M, 54, '无关天气');
    const onix = mk(M, 95);
    const control = M.calcDamage(POWERGEM, diglett, onix, R, { ...OFF, weather: 'sand' });
    assert.equal(control.dmg, 4);
    assert.ok(control.ability.some((a) => a.kind === 'weather' && a.name === '沙暴' && a.side === 'def'));
    const suppressed = M.calcDamage(POWERGEM, psyduckCloud, onix, R, { ...OFF, weather: 'sand' });
    assert.equal(suppressed.dmg, 9);
    assert.ok(!suppressed.ability.some((a) => a.kind === 'weather'));
  });

  test('T42: 无关天气压制沙暴回合末扣血（霹雳电球 hp 保持 46）', () => {
    const psyduckCloud = mk(M, 54, '无关天气');
    const voltorb = mk(M, 100);
    M.tickActiveStatuses(makePvpState(M, psyduckCloud, voltorb, 'A', 'sand'), R, []);
    assert.equal(voltorb.hp, 46);
  });

  test('T43: 无关天气压制开局天气文案；对照（首特性）文案照常出现', () => {
    const psyduckCloud = mk(M, 54, '无关天气');
    const gymSuppressed = M.createBattleState({
      mode: 'gym', firstSide: 'A', weather: 'sun',
      sides: { A: { pets: [psyduckCloud] }, B: { pets: [mk(M, 7)] } },
    });
    assert.ok(!gymSuppressed.log.some((e) => e.type === 'weather'));

    const psyduckDamp = mk(M, 54);
    const gymNormal = M.createBattleState({
      mode: 'gym', firstSide: 'A', weather: 'sun',
      sides: { A: { pets: [psyduckDamp] }, B: { pets: [mk(M, 7)] } },
    });
    assert.ok(gymNormal.log.some((e) => e.type === 'weather' && e.kind === 'sun'));
  });
});

describe('Batch 3 — 离线一致与经典分支（T44–T48）', () => {
  test('T44: 离线端 L 太阳之力 dmg=12、沙之力 dmg=14', () => {
    assert.equal(L.calcDamage(EMBER, mk(L, 4, '太阳之力'), mk(L, 7), R, { ...OFF, weather: 'sun' }).dmg, 12);
    assert.equal(L.calcDamage(ROCKLOCK, mk(L, 50, '沙之力'), mk(L, 35), R, { ...OFF, weather: 'sand' }).dmg, 14);
  });

  test('T45: 离线端 L 雨盘（40 -> 42）与魔法防守（中毒＋沙暴，hp 保持 58）', () => {
    const sqL = mk(L, 7, '雨盘');
    sqL.hp = 40;
    L.tickActiveStatuses(makePvpState(L, sqL, mk(L, 35), 'A', 'rain'), R, []);
    assert.equal(sqL.hp, 42);

    const clefL = mk(L, 35, '魔法防守');
    clefL.status = { kind: 'poison' };
    L.tickActiveStatuses(makePvpState(L, clefL, mk(L, 7), 'A', 'sand'), R, []);
    assert.equal(clefL.hp, 58);
  });

  test('T46: 离线端 L 毒手／引爆／水幕行为一致', () => {
    const defL = mk(L, 35);
    L.applyAttackerContactTrigger(mk(L, 88, '毒手'), defL, TACKLE, counting([0.29]), [], 'A', 'B', null);
    assert.equal(defL.status?.kind, 'poison');

    const pikaL = mk(L, 25);
    assert.equal(L.applyAftermath(pikaL, mk(L, 100, '引爆'), TACKLE, [], 'B'), 11);
    assert.equal(L.tryInflictStatus(mk(L, 118, '水幕'), 'burn', R, 'B', null).blocked, true);
  });

  test('T47: 合作战不镜像（L 无 resolveCoopRound），新辅助函数双端导出', () => {
    assert.strictEqual(L.resolveCoopRound, undefined);
    assert.equal(typeof L.applyAttackerContactTrigger, 'function');
    assert.equal(typeof L.applyAftermath, 'function');
  });

  test('T48: 经典分支（不传 chart）太阳之力条目照常出现', () => {
    const resClassic = M.calcDamage(EMBER, mk(M, 4, '太阳之力'), mk(M, 7), R, { weather: 'sun' });
    assert.ok(resClassic.ability.some((a) => a.kind === 'solarpower'));
  });
});

describe('Batch 3 — 道馆集成（T49–T51、T54）', () => {
  test('T49: S4 晴天无关天气翻转叶绿素先手（#55 Lv31 spe 57 vs #71 Lv33 spe 51×2=102）', () => {
    const makeS4 = (ability) => makeGymState(
      mk(M, 55, ability, [TACKLE], { level: 31 }),
      [mk(M, 71, '叶绿素', [TACKLE], { level: 33 })],
      'sun',
    );
    const outCloud = M.resolveGymRound(makeS4('无关天气'), { type: 'move', moveName: '撞击' }, R);
    assert.equal((outCloud.events || []).find((e) => e.type === 'attack')?.side, 'A');
    const outDamp = M.resolveGymRound(makeS4('湿气'), { type: 'move', moveName: '撞击' }, R);
    assert.equal((outDamp.events || []).find((e) => e.type === 'attack')?.side, 'B');
  });

  test('T50: S4 晴天太阳之力道馆出手（种子 () => 0.1：馆主先手、玩家存活、火花命中）', () => {
    const gymSolar = makeGymState(
      mk(M, 5, '太阳之力', [EMBER], { level: 31 }),
      [mk(M, 114, '叶绿素', [TACKLE], { level: 24 })],
      'sun',
    );
    const outSolar = M.resolveGymRound(gymSolar, { type: 'move', moveName: '火花' }, () => 0.1);
    assert.ok((outSolar.events || []).some((e) => e.ability === '太阳之力'));
  });

  test('T51: S1 沙暴防尘 EOT——双方撞击，#90 Lv18 hp 只被招式伤害改变（38-3=35），无沙暴伤害事件', () => {
    const shellder = mk(M, 90, '防尘', [TACKLE], { level: 18 });
    const geodude = mk(M, 74, undefined, [TACKLE], { level: 12 });
    const gymSand = makeGymState(shellder, [geodude], 'sand');
    const outSand = M.resolveGymRound(gymSand, { type: 'move', moveName: '撞击' }, R);
    assert.equal(shellder.hp, 35);
    assert.ok(!(outSand.events || []).some((e) => e.type === 'weather' && e.kind === 'sand'));
  });

  test('T54: 道馆同时分支引爆反杀——换上引爆宠被馆主接触招打倒、引爆 7 点反杀馆主（bDown 须为 let）', () => {
    // 触发路径：玩家换宠（非出招）走同时分支；馆主撞击 5 伤打倒 hp=1 的霹雳电球，
    // 引爆扣馆主 floor(31/4)=7，馆主预置 hp=7 恰好反杀。旧代码 const bDown 会在此抛 TypeError。
    const run = (E) => {
      const pika = mk(E, 25);
      const volt = mk(E, 100, '引爆', [TACKLE]);
      volt.hp = 1;
      const geo = mk(E, 74, undefined, [TACKLE], { level: 12 });
      geo.hp = 7;
      const st = E.createBattleState({
        mode: 'gym', firstSide: 'A', weather: null,
        sides: { A: { pets: [pika, volt] }, B: { pets: [geo] } },
      });
      const out = E.resolveGymRound(st, { swapToIdx: 1 }, R);
      return { st, out, geo, volt };
    };
    for (const E of [M, L]) {
      const { st, out, geo, volt } = run(E);
      assert.equal(volt.hp, 0);
      assert.equal(geo.hp, 0);
      assert.ok((out.events || []).some((e) => e.ability === '引爆'));
      assert.ok((out.events || []).some((e) => e.type === 'faint' && e.side === 'B'));
      assert.equal(st.winner, 'A');
    }
  });
});

describe('Batch 3 — 守卫（T52–T53）', () => {
  test('T52: abilityOf( 在服务端与离线端均为 4 处', () => {
    const srvCode = readBackendSource();
    assert.equal((srvCode.match(/\babilityOf\(/g) || []).length, 4);
    const localCode = readFileSync(assetPath('engine-local.js'), 'utf8');
    assert.equal((localCode.match(/\babilityOf\(/g) || []).length, 4);
  });

  test('T53: 新辅助函数双端导出（isSandImmune／applyAttackerContactTrigger／applyAftermath）', () => {
    assert.equal(typeof M.isSandImmune, 'function');
    assert.equal(typeof M.applyAttackerContactTrigger, 'function');
    assert.equal(typeof M.applyAftermath, 'function');
    assert.equal(typeof L.isSandImmune, 'function');
    assert.equal(typeof L.applyAttackerContactTrigger, 'function');
    assert.equal(typeof L.applyAftermath, 'function');
  });
});
