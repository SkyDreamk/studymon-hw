/* 特性 151 Batch 4（11 种伤害管线特性）：node --test tests/abilities-151-batch4.test.mjs
 * 覆盖：技术高手／铁拳／活力／分析／狙击手／有色眼镜／适应力／纯朴／多重鳞片／过滤／干燥皮肤
 * （服务端 M＋离线端 L 双端；分析结算层 T14–T16 仅服务端，L 只覆盖 calcDamage 直调）、abilityOf( 范围守卫、旧行为回归抽查。
 * 脚手架：Batch 3 同款——M 来自 ../src/index.js（动态 import）；L 经 asset-path.mjs 取离线端 bundle；
 * calcDamage 参数顺序是 (move, atkPet, defPet, rng, opts)；makePet 的 moves 必须是 {name,power,…} 对象数组；
 * 名字与属性取 SPECIES／playerDefTypes；事件文案用 M.abilityEventText；
 * applyBattleAction 签名是 (st, side, moveName 字符串, rng, opts)，返回 {events}／{error}。
 * 撞击统一用手写 power 35（官方表为 40）；音速拳／虫咬表内无 power，手写 40；百万吨重拳手写 80；雷电拳表内 75。
 * 期望值均按任务单 §5 公式手算：base=floor(floor(10×effPower×A/D)/50)+2 → ×0.93 → ×stab → ×mult → ×abilityDefMod → 有色眼镜 ×2。
 * 任务单偏差（已手算复核，见交付汇总）：附录 B 的克制表有误——普通→岩石实为 0.5（非 1）、虫→岩石实为 1（非 0.5）、格斗→超能力实为 0.5（非 2）；#122 防守属性实为超能力/妖精（附录 A 写单超能力）。
 * 凡以 #74（岩石/地面）为防守方的普通招，期望值按 mult 0.5 重算（T1/T3/T7/T8a/T15）；T6/T10 夹具因机制不触发而换招（见各用例注释）；
 * stagePvpAttack 不带 chart:'official'（走经典分支），预演伤害按经典口径重算（T16）。
 * 离线端（L）用例在“镜像＋哈希轮换”之前会红（读的是旧 bundle），属预期。
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
const THUNDERBOLT = { name: '十万伏特', type: '电', power: 90, damage_class: 'special' };
const THUNDERPUNCH = { name: '雷电拳', type: '电', power: 75, damage_class: 'physical' };
const WATERGUN = { name: '水枪', type: '水', power: 40, damage_class: 'special' };
const MACH_PUNCH = { name: '音速拳', type: '格斗', power: 40, damage_class: 'physical' };
const POISONSTING = { name: '毒针', type: '毒', power: 40, damage_class: 'physical' };
const BUGBITE = { name: '虫咬', type: '虫', power: 40, damage_class: 'physical' };
const MEGAPUNCH = { name: '百万吨重拳', type: '普通', power: 80, damage_class: 'physical' };

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


// 双端循环：同一断言在服务端 M 与离线端 L 各跑一遍。
const ENDS = [['M', M], ['L', L]];
const has = (res, kind) => res.ability.some((a) => a.kind === kind);

for (const [tag, E] of ENDS) {
  describe(`Batch 4 [${tag}] — 技术高手（T1）`, () => {
    test(`T1: 技术高手 35 威力撞击 4 伤（对照 3）；威力 80 不触发 [${tag}]`, () => {
      // 手算（#74 普通 mult 0.5）：52.5 威力 → base 7 → 6 → ×1.5=9 → ×0.5=4；对照 4→6→3；80 威力 base 10 → 9 → 13 → 6。
      const res = E.calcDamage(TACKLE, mk(E, 52, '技术高手'), mk(E, 74), R, OFF);
      assert.equal(res.dmg, 4);
      assert.ok(has(res, 'technician'));
      const ctrl = E.calcDamage(TACKLE, mk(E, 52), mk(E, 74), R, OFF);
      assert.equal(ctrl.dmg, 3);
      assert.ok(!has(ctrl, 'technician'));
      const big = E.calcDamage(MEGAPUNCH, mk(E, 52, '技术高手'), mk(E, 74), R, OFF);
      assert.equal(big.dmg, 6);
      assert.ok(!has(big, 'technician'));
    });
  });

  describe(`Batch 4 [${tag}] — 铁拳（T2）`, () => {
    test(`T2: 铁拳雷电拳 37 伤（对照 31）；非拳招无条目 [${tag}]`, () => {
      const res = E.calcDamage(THUNDERPUNCH, mk(E, 107, '铁拳'), mk(E, 4), R, OFF);
      assert.equal(res.dmg, 37);
      assert.ok(has(res, 'ironfist'));
      const ctrl = E.calcDamage(THUNDERPUNCH, mk(E, 107), mk(E, 4), R, OFF);
      assert.equal(ctrl.dmg, 31);
      assert.ok(!has(ctrl, 'ironfist'));
      const nonPunch = E.calcDamage(TACKLE, mk(E, 107, '铁拳'), mk(E, 4), R, OFF);
      assert.ok(!has(nonPunch, 'ironfist'));
    });
  });

  describe(`Batch 4 [${tag}] — 活力（T3）`, () => {
    test(`T3: 活力物理威力 5 伤（对照 3）[${tag}]`, () => {
      // 手算（mult 0.5）：52.5 威力 base 8 → 7 → ×1.5=10 → ×0.5=5；对照 35 威力 base 5 → 4 → ×1.5=6 → ×0.5=3。
      const res = E.calcDamage(TACKLE, mk(E, 19, '活力'), mk(E, 74), R, OFF);
      assert.equal(res.dmg, 5);
      assert.ok(has(res, 'hustle'));
      const ctrl = E.calcDamage(TACKLE, mk(E, 19), mk(E, 74), R, OFF);
      assert.equal(ctrl.dmg, 3);
      assert.ok(!has(ctrl, 'hustle'));
    });

    test(`T3: 活力命中×0.8，命中掷 85 落空，对照命中；特殊招不受影响 [${tag}]`, () => {
      const hustle = E.calcDamage(TACKLE, mk(E, 19, '活力'), mk(E, 74), counting([0.85, 0.5, 0.5]), { chart: 'official', critRate: 0 });
      assert.equal(hustle.missed, true);
      const ctrl = E.calcDamage(TACKLE, mk(E, 19), mk(E, 74), counting([0.85, 0.5, 0.5]), { chart: 'official', critRate: 0 });
      assert.ok(!ctrl.missed);
      assert.ok(ctrl.dmg > 0);
      const special = E.calcDamage(EMBER, mk(E, 19, '活力'), mk(E, 74), counting([0.85, 0.5, 0.5]), { chart: 'official', critRate: 0 });
      assert.ok(!special.missed);
      assert.ok(!has(special, 'hustle'));
    });
  });

  describe(`Batch 4 [${tag}] — 分析（T4）`, () => {
    test(`T4: 分析 movedLast 水枪 38 伤（不传/false 32 无条目）[${tag}]`, () => {
      const res = E.calcDamage(WATERGUN, mk(E, 120, '分析'), mk(E, 4), R, { ...OFF, movedLast: true });
      assert.equal(res.dmg, 38);
      assert.ok(has(res, 'analytic'));
      const no = E.calcDamage(WATERGUN, mk(E, 120, '分析'), mk(E, 4), R, OFF);
      assert.equal(no.dmg, 32);
      assert.ok(!has(no, 'analytic'));
      const f = E.calcDamage(WATERGUN, mk(E, 120, '分析'), mk(E, 4), R, { ...OFF, movedLast: false });
      assert.equal(f.dmg, 32);
      assert.ok(!has(f, 'analytic'));
    });
  });

  describe(`Batch 4 [${tag}] — 狙击手（T5/T5b）`, () => {
    test(`T5: 狙击手暴击 39 伤（3 倍；对照 19）；不暴击无条目 [${tag}]`, () => {
      const res = E.calcDamage(TACKLE, mk(E, 15, '狙击手'), mk(E, 4), counting([0.5, 0.01, 0.5]), { chart: 'official' });
      assert.equal(res.critical, true);
      assert.equal(res.dmg, 39);
      assert.ok(has(res, 'sniper'));
      const ctrl = E.calcDamage(TACKLE, mk(E, 15), mk(E, 4), counting([0.5, 0.01, 0.5]), { chart: 'official' });
      assert.equal(ctrl.dmg, 19);
      assert.ok(!has(ctrl, 'sniper'));
      const noCrit = E.calcDamage(TACKLE, mk(E, 15, '狙击手'), mk(E, 4), R, OFF);
      assert.ok(!has(noCrit, 'sniper'));
    });

    test(`T5b: PvP 口径（critMult 1.3）下狙击手仍 3 倍 39，对照 16 [${tag}]`, () => {
      const pvp = { chart: 'official', critRate: 1 / 24, critMult: 1.3 };
      const res = E.calcDamage(TACKLE, mk(E, 15, '狙击手'), mk(E, 4), counting([0.5, 0.01, 0.5]), pvp);
      assert.equal(res.dmg, 39);
      const ctrl = E.calcDamage(TACKLE, mk(E, 15), mk(E, 4), counting([0.5, 0.01, 0.5]), pvp);
      assert.equal(ctrl.dmg, 16);
    });
  });

  describe(`Batch 4 [${tag}] — 有色眼镜（T6）`, () => {
    test(`T6: 有色眼镜撞击打岩石/地面 4 伤（对照 2）；虫咬 mult 1 无条目 [${tag}]`, () => {
      // 任务单用虫咬打 #74，但虫→岩石/地面实为 mult 1（不触发）。改用撞击（普通→岩石/地面 mult 0.5）：
      // A=27 D=45 威力 35：base 6 → 5 → 无 STAB → ×0.5=2 → ×2=4；对照 2；虫咬 mult 1 无条目（dmg 7）。
      const res = E.calcDamage(TACKLE, mk(E, 48, '有色眼镜'), mk(E, 74), R, OFF);
      assert.equal(res.dmg, 4);
      assert.ok(has(res, 'tintedlens'));
      const ctrl = E.calcDamage(TACKLE, mk(E, 48), mk(E, 74), R, OFF);
      assert.equal(ctrl.dmg, 2);
      assert.ok(!has(ctrl, 'tintedlens'));
      const neutral = E.calcDamage(BUGBITE, mk(E, 48, '有色眼镜'), mk(E, 74), R, OFF);
      assert.equal(neutral.dmg, 7);
      assert.ok(!has(neutral, 'tintedlens'));
    });
  });

  describe(`Batch 4 [${tag}] — 适应力（T7）`, () => {
    test(`T7: 适应力本系 STAB 2 → 5 伤（对照 3）；非本系无条目 [${tag}]`, () => {
      // 手算（mult 0.5）：base 6 → 5 → ×2=10 → ×0.5=5；对照 5 → ×1.5=7 → ×0.5=3。
      const res = E.calcDamage(TACKLE, mk(E, 133, '适应力'), mk(E, 74), R, OFF);
      assert.equal(res.dmg, 5);
      assert.ok(has(res, 'adaptability'));
      const ctrl = E.calcDamage(TACKLE, mk(E, 133), mk(E, 74), R, OFF);
      assert.equal(ctrl.dmg, 3);
      assert.ok(!has(ctrl, 'adaptability'));
      const off = E.calcDamage(EMBER, mk(E, 133, '适应力'), mk(E, 74), R, OFF);
      assert.ok(!has(off, 'adaptability'));
    });
  });

  describe(`Batch 4 [${tag}] — 纯朴（T8）`, () => {
    test(`T8a: 攻方纯朴无视防方 +2 防阶段：3 伤（对照 1）[${tag}]`, () => {
      // 手算（mult 0.5）：D=45 → base 7 → 6 → ×0.5=3；对照 D=90 → base 4 → 3 → ×0.5=1。
      const def = mk(E, 74); def.stages.def = 2;
      const res = E.calcDamage(TACKLE, mk(E, 36, '纯朴'), def, R, OFF);
      assert.equal(res.dmg, 3);
      const e = res.ability.find((a) => a.kind === 'unaware');
      assert.ok(e);
      assert.equal(e.side, 'atk');
      const def2 = mk(E, 74); def2.stages.def = 2;
      const ctrl = E.calcDamage(TACKLE, mk(E, 36), def2, R, OFF);
      assert.equal(ctrl.dmg, 1);
      assert.ok(!has(ctrl, 'unaware'));
    });

    test(`T8b: 防方纯朴无视攻方 +2 攻阶段：7 伤（对照 15）[${tag}]`, () => {
      const atk = mk(E, 52); atk.stages.atk = 2;
      const res = E.calcDamage(TACKLE, atk, mk(E, 36, '纯朴'), R, OFF);
      assert.equal(res.dmg, 7);
      const e = res.ability.find((a) => a.kind === 'unaware');
      assert.ok(e);
      assert.equal(e.side, 'def');
      const atk2 = mk(E, 52); atk2.stages.atk = 2;
      const ctrl = E.calcDamage(TACKLE, atk2, mk(E, 36), R, OFF);
      assert.equal(ctrl.dmg, 15);
    });

    test(`T8c: 双方阶段为 0 时纯朴不推条目 [${tag}]`, () => {
      const res = E.calcDamage(TACKLE, mk(E, 36, '纯朴'), mk(E, 74), R, OFF);
      assert.ok(!has(res, 'unaware'));
      const res2 = E.calcDamage(TACKLE, mk(E, 52), mk(E, 36, '纯朴'), R, OFF);
      assert.ok(!has(res2, 'unaware'));
    });
  });

  describe(`Batch 4 [${tag}] — 多重鳞片（T9）`, () => {
    test(`T9: 多重鳞片满血 2 伤（对照 5）；残血 5 伤无条目 [${tag}]`, () => {
      const res = E.calcDamage(TACKLE, mk(E, 25), mk(E, 149, '多重鳞片'), R, OFF);
      assert.equal(res.dmg, 2);
      assert.ok(has(res, 'multiscale'));
      const ctrl = E.calcDamage(TACKLE, mk(E, 25), mk(E, 149), R, OFF);
      assert.equal(ctrl.dmg, 5);
      const hurt = mk(E, 149, '多重鳞片'); hurt.hp = hurt.maxHp - 1;
      const res2 = E.calcDamage(TACKLE, mk(E, 25), hurt, R, OFF);
      assert.equal(res2.dmg, 5);
      assert.ok(!has(res2, 'multiscale'));
    });
  });

  describe(`Batch 4 [${tag}] — 过滤（T10）`, () => {
    test(`T10: 过滤效果绝佳 15 伤（对照 20）；mult<=1 无条目 [${tag}]`, () => {
      // 任务单用音速拳打 #122，但格斗→#122 实为 mult 0.25（#122 防守属性是超能力/妖精，非单超能力），过滤不触发；
      // 虫→#122 也只有 mult 1。改用毒针（毒→超能力 1 × 毒→妖精 2 = mult 2，毛球毒系 STAB）：
      // A=27 D=31 威力 40：base 8 → 7 → ×1.5=10 → ×2=20 → ×0.75=15；对照 20。音速拳 mult 0.25 与撞击 mult 1 均无条目。
      const res = E.calcDamage(POISONSTING, mk(E, 48), mk(E, 122, '过滤'), R, OFF);
      assert.equal(res.dmg, 15);
      assert.ok(has(res, 'filter'));
      const ctrl = E.calcDamage(POISONSTING, mk(E, 48), mk(E, 122), R, OFF);
      assert.equal(ctrl.dmg, 20);
      assert.ok(!has(ctrl, 'filter'));
      const resisted = E.calcDamage(MACH_PUNCH, mk(E, 107), mk(E, 122, '过滤'), R, OFF);
      assert.ok(!has(resisted, 'filter'));
      const neutral = E.calcDamage(TACKLE, mk(E, 107), mk(E, 122, '过滤'), R, OFF);
      assert.ok(!has(neutral, 'filter'));
    });
  });

  describe(`Batch 4 [${tag}] — 干燥皮肤（T11–T13）`, () => {
    test(`T11: 干燥皮肤受火招 22 伤（对照 18）[${tag}]`, () => {
      const res = E.calcDamage(EMBER, mk(E, 4), mk(E, 124, '干燥皮肤'), R, OFF);
      assert.equal(res.dmg, 22);
      assert.ok(has(res, 'dryskin'));
      const ctrl = E.calcDamage(EMBER, mk(E, 4), mk(E, 124), R, OFF);
      assert.equal(ctrl.dmg, 18);
      assert.ok(!has(ctrl, 'dryskin'));
    });

    test(`T12: 干燥皮肤吸水回复 11 点（20→31）；对照孢子 6 伤 [${tag}]`, () => {
      const def = mk(E, 46, '干燥皮肤');
      assert.equal(def.maxHp, 44);
      def.hp = 20;
      const res = E.calcDamage(WATERGUN, mk(E, 7), def, R, OFF);
      assert.equal(res.dmg, 0);
      assert.equal(res.mult, 0);
      const imm = res.ability.find((a) => a.kind === 'immune');
      assert.ok(imm);
      assert.equal(imm.name, '干燥皮肤');
      assert.equal(imm.heal, 11);
      const healed = E.applyAbilityHeal(def, res.ability);
      assert.equal(healed, 11);
      assert.equal(def.hp, 31);
      const ctrl = E.calcDamage(WATERGUN, mk(E, 7), mk(E, 46), R, OFF);
      assert.equal(ctrl.dmg, 6);
      assert.ok(!has(ctrl, 'immune'));
    });

    test(`T13: 干燥皮肤晴扣 5 / 雨回 5 / 无天气不变 [${tag}]`, () => {
      const sun = mk(E, 46, '干燥皮肤');
      const evSun = [];
      E.tickActiveStatuses(makePvpState(E, sun, mk(E, 7), 'A', 'sun'), R, evSun);
      assert.equal(sun.hp, 39);
      assert.ok(evSun.some((e) => e.ability === '干燥皮肤'));
      const rain = mk(E, 46, '干燥皮肤'); rain.hp = 30;
      const evRain = [];
      E.tickActiveStatuses(makePvpState(E, rain, mk(E, 7), 'A', 'rain'), R, evRain);
      assert.equal(rain.hp, 35);
      assert.ok(evRain.some((e) => e.ability === '干燥皮肤'));
      const none = mk(E, 46, '干燥皮肤'); none.hp = 30;
      const evNone = [];
      E.tickActiveStatuses(makePvpState(E, none, mk(E, 7), 'A', null), R, evNone);
      assert.equal(none.hp, 30);
      assert.ok(!evNone.some((e) => e.ability === '干燥皮肤'));
    });
  });
}

describe('Batch 4 — 事件文案（服务端）', () => {
  test('abilityEventText 11 个新 kind 与干燥皮肤水回复文案', () => {
    const t = (kind, extra = {}) => entryText({ name: 'X', kind, side: 'atk', pet: '宠', moveType: '火', ...extra });
    assert.equal(t('technician'), '「技术高手」发动！宠 的火属性招式威力提升了！');
    assert.equal(t('ironfist'), '「铁拳」发动！宠 的火属性招式威力提升了！');
    assert.equal(t('hustle'), '「活力」发动！宠 的火属性招式威力提升了！');
    assert.equal(t('analytic'), '「分析」发动！宠 后出手，火属性招式威力提升了！');
    assert.equal(t('sniper'), '「狙击手」发动！宠 的会心一击伤害大幅提升了！');
    assert.equal(t('tintedlens'), '「有色眼镜」发动！宠 的招式看穿了对手的抗性，伤害提升了！');
    assert.equal(t('adaptability'), '「适应力」发动！宠 的本系招式威力大幅提升了！');
    assert.equal(t('unaware'), '「纯朴」发动！宠 无视了对手的能力变化！');
    assert.equal(t('multiscale'), '「多重鳞片」发动！宠 体力全满，受到的伤害减半了！');
    assert.equal(t('filter'), '「过滤」发动！宠 受到的效果绝佳伤害减弱了！');
    assert.equal(t('dryskin'), '「干燥皮肤」发动！宠 受到的火属性伤害提升了！');
    assert.equal(M.abilityEventText({ name: '干燥皮肤', kind: 'immune', pet: '宠' }, 11), '「干燥皮肤」发动！宠 吸收了水属性招式，回复了 11 点体力！');
    assert.equal(M.abilityEventText({ name: '干燥皮肤', kind: 'immune', pet: '宠' }, 0), '「干燥皮肤」发动！宠 吸收了水属性招式，但体力已满！');
  });
});

describe('Batch 4 — 分析结算层（T14–T16，服务端）', () => {
  const attackOf = (events, side) => (events || []).find((e) => e.type === 'attack' && e.side === side);
  const analyticOf = (events, side) => (events || []).find((e) => e.type === 'ability' && e.ability === '分析' && e.side === side);

  test('T14: 道馆速度分支，慢攻方（后手）分析触发：27 伤 + analytic 事件', () => {
    const player = mk(M, 81, '分析', [THUNDERBOLT]);
    const boss = mk(M, 100, undefined, [THUNDERBOLT]);
    const st = makeGymState(player, [boss], null);
    const out = M.resolveGymRound(st, { type: 'move', moveName: '十万伏特' }, R);
    assert.equal(out.error, undefined);
    const events = out.events || [];
    const bossIdx = events.findIndex((e) => e.type === 'attack' && e.side === 'B');
    const playerIdx = events.findIndex((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(bossIdx >= 0 && playerIdx > bossIdx, '馆主应先出手');
    assert.equal(attackOf(events, 'A').dmg, 27);
    assert.ok(analyticOf(events, 'A'));
    assert.ok(player.hp > 0);
  });

  test('T15: 道馆速度分支，快攻方（先手）不触发分析：2 伤无条目', () => {
    // 手算：水系无 STAB，base 5 → 4 → 撞击打 #74 mult 0.5 → 2（任务单按 mult 1 写 4）。
    const player = mk(M, 120, '分析', [TACKLE]);
    const boss = mk(M, 74, undefined, [TACKLE]);
    const st = makeGymState(player, [boss], null);
    const out = M.resolveGymRound(st, { type: 'move', moveName: '撞击' }, R);
    assert.equal(out.error, undefined);
    const events = out.events || [];
    const aIdx = events.findIndex((e) => e.type === 'attack' && e.side === 'A');
    const bIdx = events.findIndex((e) => e.type === 'attack' && e.side === 'B');
    assert.ok(aIdx >= 0 && (bIdx < 0 || aIdx < bIdx), '玩家应先出手');
    assert.equal(attackOf(events, 'A').dmg, 2);
    assert.ok(!analyticOf(events, 'A'));
  });

  test('T16: PvP 先攻方不触发（32），后攻方触发（38）；stagePvpAttack 预演同口径', () => {
    const pvp = { chart: 'official', critRate: 0 };
    const stA = makePvpState(M, mk(M, 120, '分析', [WATERGUN]), mk(M, 4, undefined, [TACKLE]), 'A');
    const rA = M.applyBattleAction(stA, 'A', '水枪', R, pvp);
    assert.equal(rA.error, undefined);
    assert.equal(attackOf(rA.events, 'A').dmg, 32);
    assert.ok(!analyticOf(rA.events, 'A'));

    const stB = makePvpState(M, mk(M, 120, '分析', [WATERGUN]), mk(M, 4, undefined, [TACKLE]), 'B');
    const rB1 = M.applyBattleAction(stB, 'B', '撞击', R, pvp);
    assert.equal(rB1.error, undefined);
    const rB2 = M.applyBattleAction(stB, 'A', '水枪', R, pvp);
    assert.equal(rB2.error, undefined);
    assert.equal(attackOf(rB2.events, 'A').dmg, 38);
    assert.ok(analyticOf(rB2.events, 'A'));

    const stSA = makePvpState(M, mk(M, 120, '分析', [WATERGUN]), mk(M, 4, undefined, [TACKLE]), 'A');
    const sA = M.stagePvpAttack(stSA, 'A', '水枪', R);
    assert.equal(sA.error, undefined);
    // stagePvpAttack 不带 chart:'official'，预演走经典分支（无 STAB、无随机档偏移）：
    // 无分析 base=floor(floor(10×40×33/25)/50)+2=12 → ×2=24；分析 52 威力 base=15 → ×2=30。
    assert.equal(sA.dmg, 24);
    assert.ok(!sA.ability.some((a) => a.kind === 'analytic'));
    const stSB = makePvpState(M, mk(M, 4, undefined, [TACKLE]), mk(M, 120, '分析', [WATERGUN]), 'A');
    const rS1 = M.applyBattleAction(stSB, 'A', '撞击', R, pvp);
    assert.equal(rS1.error, undefined);
    const sB = M.stagePvpAttack(stSB, 'B', '水枪', R);
    assert.equal(sB.error, undefined);
    assert.equal(sB.dmg, 30);
    assert.ok(sB.ability.some((a) => a.kind === 'analytic'));
  });
});

describe('Batch 4 — 守卫与回归（T17–T19）', () => {
  test('T17: abilityOf( 在服务端与离线端均为 4 处', () => {
    const srcM = readBackendSource();
    const srcL = readFileSync(assetPath('engine-local.js'), 'utf8');
    assert.equal((srcM.match(/\babilityOf\(/g) || []).length, 4);
    assert.equal((srcL.match(/\babilityOf\(/g) || []).length, 4);
  });

  test('T18: PUNCH_MOVES 导出为 7 元集合（服务端＋离线端）', () => {
    for (const E of [M, L]) {
      assert.equal(E.PUNCH_MOVES.size, 7);
      for (const n of ['雷电拳', '火焰拳', '音速拳', '百万吨重拳', '暗影拳', '冰冻拳', '子弹拳']) assert.ok(E.PUNCH_MOVES.has(n), n);
    }
  });

  test('T19: 旧行为回归抽查——隔音、自信过度、太阳之力', () => {
    for (const E of [M, L]) {
      const SOUND = { name: '巨声', type: '普通', power: 90, damage_class: 'special' };
      const iso = E.calcDamage(SOUND, mk(E, 4), mk(E, 109, '隔音'), R, OFF);
      assert.equal(iso.dmg, 0);
      assert.equal(iso.ability[0].kind, 'immune');
      const solar = E.calcDamage(EMBER, mk(E, 4, '太阳之力'), mk(E, 7), R, { ...OFF, weather: 'sun' });
      assert.equal(solar.dmg, 12);
    }
    const pinsir = mk(M, 127, '自信过度', [TACKLE]);
    const def = mk(M, 19, '逃跑');
    def.hp = 1;
    const st = makePvpState(M, pinsir, def, 'A');
    const r = M.applyBattleAction(st, 'A', '撞击', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(M.stagesOf(pinsir).atk, 1);
    assert.ok(r.events.some((e) => e.ability === '自信过度'));
  });
});
