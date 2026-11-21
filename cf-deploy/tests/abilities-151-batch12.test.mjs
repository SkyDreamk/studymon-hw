// Batch 12 初稿（Claude）：T1–T13 全文，沙箱（镜像后 bundle）M+L 13/13 通过；锚点／脚手架按任务单 §4.1，期望伤害 21/49/36/33 与 §4.3 一致。
// 文件：tests/abilities-151-batch12.test.mjs
// Batch 12（伊布进化形扩展）：妖精皮肤（T1–T5，管线钩子）＋魔法镜（T6–T13，新系统）。M+L 双引擎，全部 Lv20，固定 rng 0.5。
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';

const M = await import('../src/index.js');
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);
const ENGINES = [['M', M], ['L', L]];

// 招式对象显式构造（MOVES_OFFICIAL 里部分招式无 power，测试不依赖它）。
const TACKLE = { name: '撞击', type: '普通', power: 40, damage_class: 'physical' };
const HYPER_VOICE = { name: '巨声', type: '普通', power: 90, damage_class: 'special' };
const HYDRO_PUMP = { name: '水炮', type: '水', power: 110, damage_class: 'special' };
// 效果招式的 power 只是占位（makePet 要求 power > 0；效果分支在 calcDamage 之前返回，实战不读它）。
const CHARM = { name: '撒娇', type: '妖精', power: 40, damage_class: 'status' };
const SMOKESCREEN = { name: '烟幕', type: '普通', power: 40, damage_class: 'status' };
const GROWTH = { name: '生长', type: '普通', power: 40, damage_class: 'status' };
// 寄生种子：带 power 走伤害路径，drain 生效。
const LEECH_SEED = { name: '寄生种子', type: '草', power: 40, damage_class: 'special' };

function mk(E, no, ability, moves = [TACKLE], extra = {}) {
  const sp = (M.SPECIES && M.SPECIES[no]) || {};
  const defTypes = E.playerDefTypes(no);
  return E.makePet({
    key: `p${no}`,
    name: sp.name || `#${no}`,
    type: sp.type || (defTypes && defTypes[0]) || '普通',
    no,
    defTypes,
    level: 20,
    moves,
    ability,
    ...extra,
  });
}

function makePvpState(E, petA, petB, firstSide = 'A', weather = null) {
  const st = E.createBattleState({
    mode: 'pvp',
    firstSide,
    weather,
    sides: {
      A: { childName: '娃A', activeIdx: 0, pets: Array.isArray(petA) ? petA : [petA] },
      B: { childName: '娃B', activeIdx: 0, pets: Array.isArray(petB) ? petB : [petB] },
    },
  });
  st.turn = firstSide;
  return st;
}

function makeGymState(E, playerPets, bossPets, weather = null, bossActiveIdx = 0) {
  return E.createBattleState({
    mode: 'gym',
    firstSide: 'A',
    weather,
    sides: {
      A: { childName: '娃A', activeIdx: 0, pets: Array.isArray(playerPets) ? playerPets : [playerPets] },
      B: { childName: '馆主', pets: Array.isArray(bossPets) ? bossPets : [bossPets], activeIdx: bossActiveIdx },
    },
  });
}

const RNG = () => 0.5;
const kinds = (r) => ((r && r.ability) || []).map((a) => a.kind);

describe('Batch 12 — 妖精皮肤（T1–T5）', () => {
  // 验算见任务单 §4.3：Lv20 仙子伊布特攻 49；伊布特防 31；耿鬼特防 35；rng 0.5 → 随机系数 0.93。
  test('T1: 免疫翻转——一般招式变妖精，打幽灵不再免疫（官方分支，calcDamage）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const fairy = mk(E, 700, '妖精皮肤', [HYPER_VOICE]);
      const charm = mk(E, 700, '迷人之躯', [HYPER_VOICE]);
      const gengar = mk(E, 94, '飘浮', [TACKLE]);
      const st = { sides: { A: { pets: [fairy], activeIdx: 0 }, B: { pets: [gengar], activeIdx: 0 } } };
      const r = E.calcDamage(HYPER_VOICE, fairy, gengar, RNG, { chart: 'official', st });
      assert.equal(r.dmg, 21, `${tag}: 妖精皮肤巨声打耿鬼 = 21`);
      assert.equal(r.mult, 0.5, `${tag}: 妖精对幽灵／毒 = 0.5`);
      assert.ok(kinds(r).includes('pixilate'), `${tag}: 缺 pixilate 事件`);
      const ctl = E.calcDamage(HYPER_VOICE, charm, gengar, RNG, { chart: 'official', st });
      assert.equal(ctl.dmg, 0, `${tag}: 对照（迷人之躯）一般对幽灵免疫`);
      assert.equal(ctl.mult, 0, `${tag}: 对照 mult = 0`);
      assert.ok(!kinds(ctl).includes('pixilate'), `${tag}: 对照不应有 pixilate`);
    }
  });

  test('T2: STAB＋威力——转换后的一般招式吃妖精 STAB（官方分支，calcDamage）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const fairy = mk(E, 700, '妖精皮肤', [HYPER_VOICE]);
      const charm = mk(E, 700, '迷人之躯', [HYPER_VOICE]);
      const eevee = mk(E, 133, '逃跑', [TACKLE]);
      const st = { sides: { A: { pets: [fairy], activeIdx: 0 }, B: { pets: [eevee], activeIdx: 0 } } };
      const r = E.calcDamage(HYPER_VOICE, fairy, eevee, RNG, { chart: 'official', st });
      assert.equal(r.dmg, 49, `${tag}: 威力×1.2 且 STAB×1.5 = 49`);
      assert.equal(r.mult, 1, `${tag}: 妖精对普通 = 1`);
      assert.ok(kinds(r).includes('pixilate'), `${tag}: 缺 pixilate 事件`);
      const ctl = E.calcDamage(HYPER_VOICE, charm, eevee, RNG, { chart: 'official', st });
      assert.equal(ctl.dmg, 27, `${tag}: 对照（迷人之躯）无加成 = 27`);
      assert.equal(ctl.mult, 1, `${tag}: 对照 mult = 1`);
    }
  });

  test('T3: 经典分支只有威力×1.2，无 STAB、无克制变化（PvP，不传 chart）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const fairy = mk(E, 700, '妖精皮肤', [HYPER_VOICE]);
      const charm = mk(E, 700, '迷人之躯', [HYPER_VOICE]);
      const eevee = mk(E, 133, '逃跑', [TACKLE]);
      const st = { sides: { A: { pets: [fairy], activeIdx: 0 }, B: { pets: [eevee], activeIdx: 0 } } };
      const r = E.calcDamage(HYPER_VOICE, fairy, eevee, RNG, { st });
      assert.equal(r.dmg, 36, `${tag}: 经典分支 36`);
      assert.equal(r.mult, 1, `${tag}: 经典分支 mult = 1`);
      assert.ok(kinds(r).includes('pixilate'), `${tag}: 缺 pixilate 事件`);
      const ctl = E.calcDamage(HYPER_VOICE, charm, eevee, RNG, { st });
      assert.equal(ctl.dmg, 30, `${tag}: 对照 30`);
      assert.equal(ctl.mult, 1, `${tag}: 对照 mult = 1`);
      assert.equal(r.dmg / ctl.dmg, 1.2, `${tag}: 经典分支伤害比恰为 1.2（D-2）`);
    }
  });

  test('T4: 非一般招式不转换、不加威力（官方分支，calcDamage）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const fairy = mk(E, 700, '妖精皮肤', [HYDRO_PUMP]);
      const charm = mk(E, 700, '迷人之躯', [HYDRO_PUMP]);
      const eevee = mk(E, 133, '逃跑', [TACKLE]);
      const st = { sides: { A: { pets: [fairy], activeIdx: 0 }, B: { pets: [eevee], activeIdx: 0 } } };
      const r = E.calcDamage(HYDRO_PUMP, fairy, eevee, RNG, { chart: 'official', st });
      assert.equal(r.dmg, 33, `${tag}: 水炮 = 33（无 STAB，仙子伊布非水属性）`);
      assert.ok(!kinds(r).includes('pixilate'), `${tag}: 水炮不应触发 pixilate`);
      const ctl = E.calcDamage(HYDRO_PUMP, charm, eevee, RNG, { chart: 'official', st });
      assert.equal(r.dmg, ctl.dmg, `${tag}: 与迷人之躯对照完全相等`);
    }
  });

  test('T5: 道馆全路径——转换后打到飘浮耿鬼，事件文案走 abilityEventText（resolveGymRound）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const fairy = mk(E, 700, '妖精皮肤', [HYPER_VOICE]);
      const boss = mk(E, 94, '飘浮', [TACKLE]);
      const st = makeGymState(E, [fairy], [boss]);
      const hp0 = boss.hp;
      const r = E.resolveGymRound(st, { type: 'move', moveName: '巨声' }, RNG);
      assert.ok(r && !r.error, `${tag}: 不应报错：${r && r.error}`);
      assert.ok(boss.hp < hp0, `${tag}: Boss 应掉血（妖精对幽灵不免疫）`);
      const ev = ((r && r.events) || []).find((e) => e.type === 'ability' && e.ability === '妖精皮肤');
      assert.ok(ev, `${tag}: 缺妖精皮肤 ability 事件`);
      assert.ok(String(ev.text).includes('变成了妖精属性'), `${tag}: 文案应含“变成了妖精属性”，实际：${ev && ev.text}`);
    }
  });
});

describe('Batch 12 — 魔法镜（T6–T13）', () => {
  test('T6: 道馆反弹 weak——撒娇挂回玩家（resolveGymRound）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const player = mk(E, 133, '逃跑', [CHARM]);
      const boss = mk(E, 196, '魔法镜', [TACKLE]);
      const st = makeGymState(E, [player], [boss]);
      const r = E.resolveGymRound(st, { type: 'move', moveName: '撒娇' }, RNG);
      assert.ok(r && !r.error, `${tag}: 不应报错：${r && r.error}`);
      assert.equal(E.fxOf(st, 'A').weak, true, `${tag}: weak 应反弹到玩家`);
      assert.ok(!E.fxOf(st, 'B').weak, `${tag}: Boss 不应被挂上 weak`);
      assert.ok(((r && r.events) || []).some((e) => e.kind === 'magicbounce'), `${tag}: 缺 magicbounce 事件`);
    }
  });

  test('T7: 道馆反弹 smoke——烟幕挂回玩家（影子分身同属 smoke，D-8）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const player = mk(E, 133, '逃跑', [SMOKESCREEN]);
      const boss = mk(E, 196, '魔法镜', [TACKLE]);
      const st = makeGymState(E, [player], [boss]);
      const r = E.resolveGymRound(st, { type: 'move', moveName: '烟幕' }, RNG);
      assert.ok(r && !r.error, `${tag}: 不应报错：${r && r.error}`);
      assert.equal(E.fxOf(st, 'A').smoke, true, `${tag}: smoke 应反弹到玩家`);
      assert.ok(!E.fxOf(st, 'B').smoke, `${tag}: Boss 不应被挂上 smoke`);
      assert.ok(((r && r.events) || []).some((e) => e.kind === 'magicbounce'), `${tag}: 缺 magicbounce 事件`);
    }
  });

  test('T8: PvP 即时反弹（applyBattleAction）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const a = mk(E, 133, '逃跑', [CHARM]);
      const b = mk(E, 196, '魔法镜', [TACKLE]);
      const st = makePvpState(E, [a], [b], 'A');
      const r = E.applyBattleAction(st, 'A', '撒娇', RNG);
      assert.ok(r && !r.error, `${tag}: 不应报错：${r && r.error}`);
      assert.equal(E.fxOf(st, 'A').weak, true, `${tag}: weak 应反弹到 A`);
      assert.ok(!E.fxOf(st, 'B').weak, `${tag}: B 不应被挂上 weak`);
      const ev = ((r && r.events) || []).find((e) => e.kind === 'magicbounce');
      assert.ok(ev, `${tag}: 缺 magicbounce 事件`);
      assert.ok(String(ev.text).includes('魔法镜'), `${tag}: 文案应含“魔法镜”`);
    }
  });

  test('T9: PvP 预演反弹（stagePvpAttack＋applyStagedEffect）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const a = mk(E, 133, '逃跑', [CHARM]);
      const b = mk(E, 196, '魔法镜', [TACKLE]);
      const st = makePvpState(E, [a], [b], 'A');
      const staged = E.stagePvpAttack(st, 'A', '撒娇', RNG);
      assert.ok(staged && !staged.error, `${tag}: 预演不应报错：${staged && staged.error}`);
      assert.equal(staged.effectKind, 'weak', `${tag}: 撒娇应为 weak 效果`);
      // 路由层（src 的 stagePvpAttack 调用处）在预演结果上补 attacker 再调 applyStagedEffect；测试里照做。
      const r = E.applyStagedEffect(st, { ...staged, attacker: 'A' });
      assert.equal(E.fxOf(st, 'A').weak, true, `${tag}: weak 应反弹到 A`);
      assert.ok(!E.fxOf(st, 'B').weak, `${tag}: B 不应被挂上 weak`);
      assert.ok(((r && r.events) || []).some((e) => e.kind === 'magicbounce'), `${tag}: 缺 magicbounce 事件`);
    }
  });

  test('T10: charge 不反弹——生长照常挂给自己（applyBattleAction，D-7）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const a = mk(E, 133, '逃跑', [GROWTH]);
      const b = mk(E, 196, '魔法镜', [TACKLE]);
      const st = makePvpState(E, [a], [b], 'A');
      const r = E.applyBattleAction(st, 'A', '生长', RNG);
      assert.ok(r && !r.error, `${tag}: 不应报错：${r && r.error}`);
      assert.equal(E.fxOf(st, 'A').charge, true, `${tag}: 自我增益照常`);
      assert.ok(!((r && r.events) || []).some((e) => e.kind === 'magicbounce'), `${tag}: 不应有 magicbounce`);
    }
  });

  test('T11: 破格压制魔法镜——撒娇正常挂给防守方（applyBattleAction，D-11）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const a = mk(E, 127, '破格', [CHARM]);
      const b = mk(E, 196, '魔法镜', [TACKLE]);
      const st = makePvpState(E, [a], [b], 'A');
      const r = E.applyBattleAction(st, 'A', '撒娇', RNG);
      assert.ok(r && !r.error, `${tag}: 不应报错：${r && r.error}`);
      assert.equal(E.fxOf(st, 'B').weak, true, `${tag}: 破格下 weak 正常挂给 B`);
      assert.ok(!E.fxOf(st, 'A').weak, `${tag}: A 不应被反弹`);
      assert.ok(!((r && r.events) || []).some((e) => e.kind === 'magicbounce'), `${tag}: 不应有 magicbounce`);
    }
  });

  test('T12: 化学变化气体压制魔法镜（applyBattleAction，D-10）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const a = mk(E, 109, '化学变化气体', [CHARM]);
      const b = mk(E, 196, '魔法镜', [TACKLE]);
      const st = makePvpState(E, [a], [b], 'A');
      assert.equal(E.petAbility(b, st), null, `${tag}: 气体在场时 B 的特性读数为 null`);
      const r = E.applyBattleAction(st, 'A', '撒娇', RNG);
      assert.ok(r && !r.error, `${tag}: 不应报错：${r && r.error}`);
      assert.equal(E.fxOf(st, 'B').weak, true, `${tag}: 气体压制，weak 正常挂给 B`);
      assert.ok(!E.fxOf(st, 'A').weak, `${tag}: A 不应被反弹`);
      assert.ok(!((r && r.events) || []).some((e) => e.kind === 'magicbounce'), `${tag}: 不应有 magicbounce`);
    }
  });

  test('T13: 寄生种子不反弹——走伤害路径，drain 照常回血（applyBattleAction，D-6）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const a = mk(E, 133, '逃跑', [LEECH_SEED]);
      const b = mk(E, 196, '魔法镜', [TACKLE]);
      const st = makePvpState(E, [a], [b], 'A');
      a.hp = Math.max(1, Math.floor(a.maxHp / 2)); // 先把 A 压低，才能看出回复
      const aHp0 = a.hp;
      const bHp0 = b.hp;
      const r = E.applyBattleAction(st, 'A', '寄生种子', RNG);
      assert.ok(r && !r.error, `${tag}: 不应报错：${r && r.error}`);
      assert.ok(b.hp < bHp0, `${tag}: B 应掉血（伤害照常打出）`);
      assert.ok(a.hp > aHp0, `${tag}: A 应回血（drain 生效）：${aHp0} → ${a.hp}`);
      assert.ok(!((r && r.events) || []).some((e) => e.kind === 'magicbounce'), `${tag}: 不应有 magicbounce`);
    }
  });
});
