/* 特性 151 Batch 2（10 种阶段触发特性接线）：node --test tests/abilities-151-batch2.test.mjs
 * 覆盖：健壮胸肌／不服输／好胜／正义之心／碎裂铠甲／胆怯／愤怒穴位／自信过度／下载／变身者
 * （服务端 M＋离线端 L 双端）、PvP 经典分支与防守结算（staged）边界、道馆集成、abilityOf( 范围守卫。
 * 脚手架：与 tests/abilities-151-batch1.test.mjs 同款——M 来自 ../src/index.js；L 经 asset-path.mjs 取离线端 bundle；
 * calcDamage 参数顺序是 (move, atkPet, defPet, rng, opts)；makePet 的 moves 必须是 {name,power,…} 对象数组；
 * applyBattleAction 签名是 (st, side, moveName, rng, opts)，返回 {events} 或 {error}；
 * createBattleState 建队时即触发双方出场钩子（开局威吓／下载／变身者已在 st.log 里），
 * 出场类用例（T3–T7、T23–T28）直接断言建队后的 stages 与 st.log，不再重复调 triggerSwitchIn
 * （重复调会二次触发，阶段会多算一次——见 batch-2-claude-verified.md D-E）。
 * 离线端（L）用例在“镜像＋哈希轮换”之前会红（读的是旧 bundle），属预期。 */
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

const TACKLE = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' }; // 官方命中 100
const DARKBITE = { name: '咬碎', type: '恶', power: 80, damage_class: 'physical' }; // 官方 恶／物理／80／100
const SHADOWBALL = { name: '影子球', type: '幽灵', power: 80, damage_class: 'special' }; // 官方 幽灵／特殊／80／100
const OMINOUS = { name: '奇异之风', type: '幽灵', power: 60, damage_class: 'special' }; // 官方 幽灵／特殊／60；影子球是 smoke 招（MOVE_EFFECTS），全路径不造成伤害，不能当幽灵系伤害招用（见 D-P）
const XSCISSOR = { name: '十字剪', type: '虫', power: 80, damage_class: 'physical' }; // 官方 虫／物理／80／100
const HYPER = { name: '巨声', type: '普通', power: 90, damage_class: 'special' }; // 官方 普通／特殊／90
const SHOCK = { name: '电击', type: '电', power: 40, damage_class: 'special' };

// Batch 1 同款 mk：名字与属性取 SPECIES，defTypes 取 playerDefTypes，等级 20，moves 为对象数组。
// 注意：离线端 L 不导出 DEX_DETAILS（mk 不得读 E.DEX_DETAILS）；makePet 要求 moves 非空且每招 power > 0。
// 注意：L 的 SPECIES 缺 1–9／25／26／144／145／146／150（既有缺口，见 D-Q）；
//   mk 对缺失编号回落名字 `#${no}`，故跨端比文案的用例不得用这些编号当“名字会进文案”的宠（如变身者的对手）。
const mk = (E, no, ability, moves = [TACKLE], extra = {}) => {
  const sp = E.SPECIES[no];
  return E.makePet({ key: `p${no}`, name: sp ? sp.name : `#${no}`, type: sp ? sp.type : '普通', no, defTypes: E.playerDefTypes(no), level: 20, moves, ability, ...extra });
};

function makePvpState(E, petA, petB, firstSide = 'A') {
  const st = E.createBattleState({
    mode: 'pvp', firstSide,
    sides: {
      A: { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: Array.isArray(petA) ? petA : [petA] },
      B: { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: Array.isArray(petB) ? petB : [petB] },
    },
  });
  st.turn = firstSide;
  return st;
}

// 防守结算（staged）辅助：stagePvpAttack 预演 → resolveStagedAttack 按放弃防守结算。
function stagedHit(E, atk, def, moveName) {
  const st = makePvpState(E, atk, def, 'A');
  const staged = E.stagePvpAttack(st, 'A', moveName, R);
  assert.equal(staged.error, undefined, JSON.stringify(staged));
  const r = E.resolveStagedAttack(st, { ...staged, attacker: 'A' }, { skipped: true }, R);
  assert.equal(r.error, undefined, JSON.stringify(r));
  return { st, events: r.events };
}

test('T0 前置：stagedMoveForContact 按属性回落会把咬碎算成 special（既有口径），防守结算的 category 须取 staged.category', () => {
  // 既有行为锁定：stagedMoveForContact 只按 staged.moveType 回落，恶不在物理属性表里。
  assert.deepEqual(M.stagedMoveForContact({ moveName: '咬碎', moveType: '恶' }), { name: '咬碎', damage_class: 'special' });
  assert.deepEqual(M.stagedMoveForContact({ moveName: '影子球', moveType: '幽灵' }), { name: '影子球', damage_class: 'physical' });
  // 修正：stagePvpAttack 在 staged 对象上带真实 category（moveCategory(move)），双端一致。
  const atk = mk(M, 6, '猛火', [DARKBITE]);
  const def = mk(M, 95, '碎裂铠甲', [TACKLE]);
  const st = makePvpState(M, atk, def, 'A');
  const staged = M.stagePvpAttack(st, 'A', '咬碎', R);
  assert.equal(staged.error, undefined);
  assert.equal(staged.category, 'physical');
});

describe('Batch 2 — 健壮胸肌（T1–T2）', () => {
  test('T1: 健壮胸肌阻止 def 降档并返回 blocked: true, guard: 健壮胸肌', () => {
    const pidgey = mk(M, 16, '健壮胸肌');
    const res = M.changeStage(pidgey, 'def', -1);
    assert.deepEqual(res, { applied: false, blocked: true, guard: '健壮胸肌', from: 0, to: 0 });
  });

  test('T2: 健壮胸肌不挡 atk 降档，也不挡 def 升档', () => {
    const pidgey = mk(M, 16, '健壮胸肌');
    const rAtk = M.changeStage(pidgey, 'atk', -1);
    assert.equal(rAtk.applied, true);
    assert.equal(rAtk.to, -1);
    const rDefUp = M.changeStage(pidgey, 'def', 1);
    assert.equal(rDefUp.applied, true);
    assert.equal(rDefUp.to, 1);
  });
});

describe('Batch 2 — 不服输与好胜（T3–T7，建队时即触发，断言 st.log）', () => {
  test('T3: 威吓降档后不服输触发，攻击净变化 +1（-1 后 +2）且出精确事件', () => {
    const intimidator = mk(M, 23, '威吓');
    const mankey = mk(M, 56, '不服输');
    const st = makePvpState(M, intimidator, mankey);
    assert.equal(M.stagesOf(mankey).atk, 1);
    const idxIntim = st.log.findIndex((e) => e.ability === '威吓');
    const idxDefiant = st.log.findIndex((e) => e.ability === '不服输');
    assert.ok(idxIntim >= 0);
    assert.ok(idxDefiant > idxIntim);
    assert.equal(st.log[idxDefiant].text, `「不服输」发动！${mankey.name} 的攻击提升了！`);
  });

  test('T4: 威吓降档后好胜触发，特攻 +2 且出精确事件', () => {
    const intimidator = mk(M, 23, '威吓');
    const jiggly = mk(M, 39, '好胜');
    const st = makePvpState(M, intimidator, jiggly);
    assert.equal(M.stagesOf(jiggly).atk, -1);
    assert.equal(M.stagesOf(jiggly).spa, 2);
    const compEv = st.log.find((e) => e.ability === '好胜');
    assert.ok(compEv);
    assert.equal(compEv.text, `「好胜」发动！${jiggly.name} 的特攻提升了！`);
  });

  test('T5: 目标 atk 已为 -6 时威吓未实际降档（applied: false），不服输不触发', () => {
    const intimidator = mk(M, 23, '威吓');
    const mankey = mk(M, 56, '不服输');
    M.changeStage(mankey, 'atk', -6);
    const st = makePvpState(M, intimidator, mankey);
    assert.equal(M.stagesOf(mankey).atk, -6);
    assert.equal(st.log.filter((e) => e.type === 'ability').length, 0);
  });

  test('T6: 普通目标受威吓后仅降 atk 1 级且无额外特性事件（回归守卫）', () => {
    const intimidator = mk(M, 23, '威吓');
    const pika = mk(M, 25, '静电');
    const st = makePvpState(M, intimidator, pika);
    assert.equal(M.stagesOf(pika).atk, -1);
    const abilityEvs = st.log.filter((e) => e.type === 'ability');
    assert.equal(abilityEvs.length, 1);
    assert.equal(abilityEvs[0].ability, '威吓');
    assert.equal(abilityEvs[0].text, `「威吓」发动！${intimidator.name} 出场，${pika.name} 的攻击降低了！`);
  });

  test('T7: 离线端 L 重跑 T3 不服输完全一致', () => {
    const intimidator = mk(L, 23, '威吓');
    const mankey = mk(L, 56, '不服输');
    const st = makePvpState(L, intimidator, mankey);
    assert.equal(L.stagesOf(mankey).atk, 1);
    assert.equal(st.log.find((e) => e.ability === '不服输')?.text, `「不服输」发动！${mankey.name} 的攻击提升了！`);
  });
});

describe('Batch 2 — 正义之心（T8–T10）', () => {
  test('T8: 正义之心受恶系招咬碎命中后攻击 +1 并推精确事件', () => {
    const atk = mk(M, 6, '猛火', [DARKBITE]);
    const growlithe = mk(M, 58, '正义之心');
    const st = makePvpState(M, atk, growlithe, 'A');
    const r = M.applyBattleAction(st, 'A', '咬碎', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(M.stagesOf(growlithe).atk, 1);
    const ev = r.events.find((e) => e.ability === '正义之心');
    assert.ok(ev);
    assert.equal(ev.text, `「正义之心」发动！${growlithe.name} 的攻击提升了！`);
  });

  test('T9: 正义之心受非恶系招撞击不触发', () => {
    const atk = mk(M, 6, '猛火', [TACKLE]);
    const growlithe = mk(M, 58, '正义之心');
    const st = makePvpState(M, atk, growlithe, 'A');
    const r = M.applyBattleAction(st, 'A', '撞击', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(M.stagesOf(growlithe).atk, 0);
    assert.ok(!r.events.some((e) => e.ability === '正义之心'));
  });

  test('T10: 单元级守卫 — dmg===0 或 missed===true 时正义之心不触发', () => {
    const atk = mk(M, 6, '猛火');
    const d1 = mk(M, 58, '正义之心');
    const e1 = [];
    M.applyHitAbilityTriggers(atk, d1, { moveType: '恶', category: 'physical', critical: false, dmg: 0, missed: false }, e1, 'A', 'B');
    assert.equal(M.stagesOf(d1).atk, 0);
    assert.equal(e1.length, 0);

    const d2 = mk(M, 58, '正义之心');
    const e2 = [];
    M.applyHitAbilityTriggers(atk, d2, { moveType: '恶', category: 'physical', critical: false, dmg: 50, missed: true }, e2, 'A', 'B');
    assert.equal(M.stagesOf(d2).atk, 0);
    assert.equal(e2.length, 0);
  });
});

describe('Batch 2 — 碎裂铠甲（T11–T13）', () => {
  test('T11: 碎裂铠甲受物理招命中后 spe +1、def -1 并推精确事件', () => {
    const atk = mk(M, 6, '猛火', [TACKLE]);
    const onix = mk(M, 95, '碎裂铠甲');
    const st = makePvpState(M, atk, onix, 'A');
    const r = M.applyBattleAction(st, 'A', '撞击', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(M.stagesOf(onix).spe, 1);
    assert.equal(M.stagesOf(onix).def, -1);
    const ev = r.events.find((e) => e.ability === '碎裂铠甲');
    assert.ok(ev);
    assert.equal(ev.text, `「碎裂铠甲」发动！${onix.name} 的速度提升了，防御降低了！`);
  });

  test('T12: 碎裂铠甲受特殊招巨声不触发', () => {
    const atk = mk(M, 6, '猛火', [HYPER]);
    const onix = mk(M, 95, '碎裂铠甲');
    const st = makePvpState(M, atk, onix, 'A');
    const r = M.applyBattleAction(st, 'A', '巨声', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(M.stagesOf(onix).spe, 0);
    assert.equal(M.stagesOf(onix).def, 0);
    assert.ok(!r.events.some((e) => e.ability === '碎裂铠甲'));
  });

  test('T13: 物理招一击打倒碎裂铠甲宠时因昏厥（hp===0）不触发', () => {
    const atk = mk(M, 6, '猛火', [TACKLE]);
    const onix = mk(M, 95, '碎裂铠甲');
    onix.hp = 1;
    const st = makePvpState(M, atk, onix, 'A');
    const r = M.applyBattleAction(st, 'A', '撞击', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(onix.hp, 0);
    assert.equal(M.stagesOf(onix).spe, 0);
    assert.equal(M.stagesOf(onix).def, 0);
    assert.ok(!r.events.some((e) => e.ability === '碎裂铠甲'));
  });
});

describe('Batch 2 — 胆怯（T14–T16）', () => {
  test('T14: 胆怯受恶系招咬碎命中后 spe +1 并推精确事件', () => {
    const atk = mk(M, 6, '猛火', [DARKBITE]);
    const magikarp = mk(M, 129, '胆怯');
    magikarp.maxHp = 999;
    magikarp.hp = 999;
    const st = makePvpState(M, atk, magikarp, 'A');
    const r = M.applyBattleAction(st, 'A', '咬碎', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(M.stagesOf(magikarp).spe, 1);
    const ev = r.events.find((e) => e.ability === '胆怯');
    assert.ok(ev);
    assert.equal(ev.text, `「胆怯」发动！${magikarp.name} 的速度提升了！`);
  });

  test('T15: 胆怯受幽灵系奇异之风与虫系十字剪均各升 spe +1', () => {
    const atk1 = mk(M, 6, '猛火', [OMINOUS, XSCISSOR]);
    const k1 = mk(M, 129, '胆怯');
    k1.maxHp = 999;
    k1.hp = 999;
    const st1 = makePvpState(M, atk1, k1, 'A');
    const r1 = M.applyBattleAction(st1, 'A', '奇异之风', R, OFF);
    assert.equal(r1.error, undefined);
    assert.ok(k1.hp < 999, '奇异之风应造成伤害');
    assert.equal(M.stagesOf(k1).spe, 1);

    const atk2 = mk(M, 6, '猛火', [OMINOUS, XSCISSOR]);
    const k2 = mk(M, 129, '胆怯');
    k2.maxHp = 999;
    k2.hp = 999;
    const st2 = makePvpState(M, atk2, k2, 'A');
    const r2 = M.applyBattleAction(st2, 'A', '十字剪', R, OFF);
    assert.equal(r2.error, undefined);
    assert.equal(M.stagesOf(k2).spe, 1);
  });

  test('T16: 胆怯受普通系撞击与电系电击不触发（各用独立对局，避免回合翻转）', () => {
    const atk1 = mk(M, 6, '猛火', [TACKLE, SHOCK]);
    const k1 = mk(M, 129, '胆怯');
    k1.maxHp = 999;
    k1.hp = 999;
    const st1 = makePvpState(M, atk1, k1, 'A');
    const r1 = M.applyBattleAction(st1, 'A', '撞击', R, OFF);
    assert.equal(r1.error, undefined);
    assert.equal(M.stagesOf(k1).spe, 0);
    assert.ok(!r1.events.some((e) => e.ability === '胆怯'));

    const atk2 = mk(M, 6, '猛火', [TACKLE, SHOCK]);
    const k2 = mk(M, 129, '胆怯');
    k2.maxHp = 999;
    k2.hp = 999;
    const st2 = makePvpState(M, atk2, k2, 'A');
    const r2 = M.applyBattleAction(st2, 'A', '电击', R, OFF);
    assert.equal(r2.error, undefined);
    assert.equal(M.stagesOf(k2).spe, 0);
    assert.ok(!r2.events.some((e) => e.ability === '胆怯'));
  });
});

describe('Batch 2 — 愤怒穴位（T17–T19）', () => {
  test('T17: 愤怒穴位受到会心一击后 atk 拉满至 +6 并推精确事件', () => {
    const atk = mk(M, 6, '猛火', [TACKLE]);
    const mankey = mk(M, 56, '愤怒穴位');
    mankey.maxHp = 999;
    mankey.hp = 999;
    const st = makePvpState(M, atk, mankey, 'A');
    const r = M.applyBattleAction(st, 'A', '撞击', R, { chart: 'official', critRate: 1 });
    assert.equal(r.error, undefined);
    assert.equal(M.stagesOf(mankey).atk, 6);
    const ev = r.events.find((e) => e.ability === '愤怒穴位');
    assert.ok(ev);
    assert.equal(ev.text, `「愤怒穴位」发动！${mankey.name} 的攻击提升到最大了！`);
  });

  test('T18: 愤怒穴位预置 atk=-2 时受暴击同样直接拉满到 +6', () => {
    const atk = mk(M, 6, '猛火', [TACKLE]);
    const mankey = mk(M, 56, '愤怒穴位');
    mankey.maxHp = 999;
    mankey.hp = 999;
    M.changeStage(mankey, 'atk', -2);
    const st = makePvpState(M, atk, mankey, 'A');
    const r = M.applyBattleAction(st, 'A', '撞击', R, { chart: 'official', critRate: 1 });
    assert.equal(r.error, undefined);
    assert.equal(M.stagesOf(mankey).atk, 6);
  });

  test('T19: 愤怒穴位受非暴击不触发', () => {
    const atk = mk(M, 6, '猛火', [TACKLE]);
    const mankey = mk(M, 56, '愤怒穴位');
    mankey.maxHp = 999;
    mankey.hp = 999;
    const st = makePvpState(M, atk, mankey, 'A');
    const r = M.applyBattleAction(st, 'A', '撞击', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(M.stagesOf(mankey).atk, 0);
    assert.ok(!r.events.some((e) => e.ability === '愤怒穴位'));
  });
});

describe('Batch 2 — 自信过度（T20–T22）', () => {
  test('T20: 自信过度直接命中打倒对手后 atk +1 并推精确事件', () => {
    const pinsir = mk(M, 127, '自信过度', [TACKLE]);
    const def = mk(M, 19, '逃跑');
    def.hp = 1;
    const st = makePvpState(M, pinsir, def, 'A');
    const r = M.applyBattleAction(st, 'A', '撞击', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(def.hp, 0);
    assert.equal(M.stagesOf(pinsir).atk, 1);
    const ev = r.events.find((e) => e.ability === '自信过度');
    assert.ok(ev);
    assert.equal(ev.text, `「自信过度」发动！${pinsir.name} 打倒了对手，攻击提升了！`);
  });

  test('T21: 自信过度攻击未打倒对手时不触发', () => {
    const pinsir = mk(M, 127, '自信过度', [TACKLE]);
    const def = mk(M, 143, '免疫');
    def.maxHp = 999;
    def.hp = 999;
    const st = makePvpState(M, pinsir, def, 'A');
    const r = M.applyBattleAction(st, 'A', '撞击', R, OFF);
    assert.equal(r.error, undefined);
    assert.ok(def.hp > 0);
    assert.equal(M.stagesOf(pinsir).atk, 0);
    assert.ok(!r.events.some((e) => e.ability === '自信过度'));
  });

  test('T22: 对手因回合末中毒扣血倒下时，自信过度不触发', () => {
    const pinsir = mk(M, 127, '自信过度', [TACKLE]);
    const def = mk(M, 143, '免疫');
    def.maxHp = 200; // 毒 tick = max(1, floor(200/8)) = 25
    def.status = { kind: 'poison' }; // STATUS_KINDS 只有 poison/paralysis/burn/sleep，没有 'psn'
    const st = makePvpState(M, def, pinsir, 'A'); // firstSide 'A'，攻击方为 B 侧才跑回合末 tick
    // 先测一次撞击伤害，使受击后残血在 1 ~ 毒伤之间（与实战同 rng、同 opts，伤害一致）
    const probe = M.calcDamage(TACKLE, pinsir, def, R, OFF).dmg;
    assert.ok(probe > 0 && probe < 200, `probe=${probe}`);
    def.hp = probe + 5;
    st.turn = 'B'; // 仿 abilities-phase2.test.mjs:621，直接赋值轮到 B 行动
    const r = M.applyBattleAction(st, 'B', '撞击', R, OFF);
    assert.equal(r.error, undefined);
    assert.equal(def.hp, 0); // 受击后剩 5，毒 tick 25 扣光
    assert.equal(M.stagesOf(pinsir).atk, 0);
    assert.ok(!r.events.some((e) => e.ability === '自信过度'));
  });
});

describe('Batch 2 — 下载（T23–T25，建队时即触发；数值取真实 statsFor）', () => {
  test('T23: 对手防御 < 特防时下载提升攻击 +1（25 号皮卡丘 Lv.20：防御 21 < 特防 25）', () => {
    const porygon = mk(M, 137, '下载');
    const foe = mk(M, 25, '静电');
    assert.equal(foe.stats.defense, 21);
    assert.equal(foe.stats.sp_defense, 25);
    const st = makePvpState(M, porygon, foe);
    assert.equal(M.stagesOf(porygon).atk, 1);
    assert.equal(M.stagesOf(porygon).spa, 0);
    assert.equal(st.log.find((e) => e.ability === '下载')?.text, `「下载」发动！${porygon.name} 的攻击提升了！`);
  });

  test('T24: 对手防御 > 特防时下载提升特攻 +1（95 号大岩蛇 Lv.20：防御 69 > 特防 23）', () => {
    const porygon = mk(M, 137, '下载');
    const foe = mk(M, 95, '结实');
    assert.equal(foe.stats.defense, 69);
    assert.equal(foe.stats.sp_defense, 23);
    const st = makePvpState(M, porygon, foe);
    assert.equal(M.stagesOf(porygon).atk, 0);
    assert.equal(M.stagesOf(porygon).spa, 1);
    assert.equal(st.log.find((e) => e.ability === '下载')?.text, `「下载」发动！${porygon.name} 的特攻提升了！`);
  });

  test('T25: 对手防御 === 特防时下载提升特攻 +1（132 号百变怪 Lv.20：防御 24 = 特防 24）', () => {
    const porygon = mk(M, 137, '下载');
    const foe = mk(M, 132, '柔软');
    assert.equal(foe.stats.defense, 24);
    assert.equal(foe.stats.sp_defense, 24);
    const st = makePvpState(M, porygon, foe);
    assert.equal(M.stagesOf(porygon).atk, 0);
    assert.equal(M.stagesOf(porygon).spa, 1);
    assert.equal(st.log.find((e) => e.ability === '下载')?.text, `「下载」发动！${porygon.name} 的特攻提升了！`);
  });
});

describe('Batch 2 — 变身者（T26–T28，建队时即触发，断言 st.log）', () => {
  test('T26: 变身者出场复制对手外观、招式与首特性并推精确事件', () => {
    const ditto = mk(M, 132, '变身者', [{ name: '变身', type: '普通', power: 1, damage_class: 'status' }]);
    const pika = mk(M, 25, '静电', [SHOCK, { name: '十万伏特', type: '电', power: 90, damage_class: 'special' }]);
    const st = makePvpState(M, ditto, pika);
    assert.equal(ditto.no, 25);
    assert.equal(ditto.name, pika.name);
    assert.equal(ditto.ability, '静电');
    assert.deepEqual(ditto.moves.map((m) => m.name), ['电击', '十万伏特']);
    assert.equal(st.log.find((e) => e.ability === '变身者')?.text, `「变身者」发动！${pika.name} 变成了 ${pika.name} 的样子！`);
  });

  test('T27: 对手带实例特性时，变身者仍复制对手首特性（R3）', () => {
    const ditto = mk(M, 132, '变身者', [{ name: '变身', type: '普通', power: 1, damage_class: 'status' }]);
    const pikaRod = mk(M, 25, '避雷针', [SHOCK]);
    makePvpState(M, ditto, pikaRod);
    assert.equal(ditto.ability, '静电');
  });

  test('T28: 对手已昏厥（hp===0）时变身者不触发', () => {
    const ditto = mk(M, 132, '变身者', [{ name: '变身', type: '普通', power: 1, damage_class: 'status' }]);
    const pika = mk(M, 25, '静电', [SHOCK]);
    pika.hp = 0;
    const st = makePvpState(M, ditto, pika);
    assert.equal(ditto.no, 132);
    assert.ok(!st.log.some((e) => e.ability === '变身者'));
  });
});

describe('Batch 2 — 离线端（T29–T34，各为独立 test）', () => {
  test('T29: 离线端 L 重跑健壮胸肌（T1）＋不服输（T3）', () => {
    const pidgeyL = mk(L, 16, '健壮胸肌');
    assert.deepEqual(L.changeStage(pidgeyL, 'def', -1), { applied: false, blocked: true, guard: '健壮胸肌', from: 0, to: 0 });
    const stIntim = makePvpState(L, mk(L, 23, '威吓'), mk(L, 56, '不服输'));
    assert.equal(L.stagesOf(stIntim.sides.B.pets[0]).atk, 1);
    assert.equal(stIntim.log.find((e) => e.ability === '不服输')?.text, `「不服输」发动！${stIntim.sides.B.pets[0].name} 的攻击提升了！`);
  });

  test('T30: 离线端 L 重跑正义之心（T8）＋碎裂铠甲（T11），文案与 M 逐字相同', () => {
    const run = (E) => {
      const g = mk(E, 58, '正义之心');
      const rG = E.applyBattleAction(makePvpState(E, mk(E, 6, '猛火', [DARKBITE]), g, 'A'), 'A', '咬碎', R, OFF);
      const o = mk(E, 95, '碎裂铠甲');
      const rO = E.applyBattleAction(makePvpState(E, mk(E, 6, '猛火', [TACKLE]), o, 'A'), 'A', '撞击', R, OFF);
      return [
        rG.events.find((e) => e.ability === '正义之心')?.text,
        rO.events.find((e) => e.ability === '碎裂铠甲')?.text,
      ];
    };
    assert.deepEqual(run(L), run(M));
  });

  test('T31: 离线端 L 重跑胆怯（T14）＋愤怒穴位（T17），文案与 M 逐字相同', () => {
    const run = (E) => {
      const k = mk(E, 129, '胆怯');
      k.maxHp = k.hp = 999;
      const rK = E.applyBattleAction(makePvpState(E, mk(E, 6, '猛火', [DARKBITE]), k, 'A'), 'A', '咬碎', R, OFF);
      const a = mk(E, 56, '愤怒穴位');
      a.maxHp = a.hp = 999;
      const rA = E.applyBattleAction(makePvpState(E, mk(E, 6, '猛火', [TACKLE]), a, 'A'), 'A', '撞击', R, { chart: 'official', critRate: 1 });
      assert.equal(E.stagesOf(k).spe, 1);
      assert.equal(E.stagesOf(a).atk, 6);
      return [
        rK.events.find((e) => e.ability === '胆怯')?.text,
        rA.events.find((e) => e.ability === '愤怒穴位')?.text,
      ];
    };
    assert.deepEqual(run(L), run(M));
  });

  test('T32: 离线端 L 重跑下载（T23）＋变身者（T26），文案与 M 逐字相同', () => {
    // 注意：L 的 SPECIES 缺 1–9／25／26／144／145／146／150（既有缺口，见 D-Q），
    // 变身者对手不用 #25，改用 #19 小拉达（双端皆有真名）；T26（M 端）仍按任务单用 #25。
    // 下载用例的对手可用 #25：下载文案只含下载者自己的名字，对手名字不进文案。
    const run = (E) => {
      const dl = mk(E, 137, '下载');
      const foe = mk(E, 25, '静电');
      const stDl = makePvpState(E, dl, foe);
      assert.equal(E.stagesOf(dl).atk, 1);
      const dt = mk(E, 132, '变身者', [{ name: '变身', type: '普通', power: 1, damage_class: 'status' }]);
      const stDt = makePvpState(E, dt, mk(E, 19, '逃跑', [SHOCK]));
      assert.equal(dt.no, 19);
      return [
        stDl.log.find((e) => e.ability === '下载')?.text,
        stDt.log.find((e) => e.ability === '变身者')?.text,
      ];
    };
    assert.deepEqual(run(L), run(M));
  });

  test('T33: 离线端 L 重跑自信过度（T20），文案与 M 逐字相同', () => {
    const run = (E) => {
      const mx = mk(E, 127, '自信过度', [TACKLE]);
      const t = mk(E, 19, '逃跑');
      t.hp = 1;
      const r = E.applyBattleAction(makePvpState(E, mx, t, 'A'), 'A', '撞击', R, OFF);
      assert.equal(E.stagesOf(mx).atk, 1);
      return r.events.find((e) => e.ability === '自信过度')?.text;
    };
    assert.equal(run(L), run(M));
  });

  test('T34: 事件文案 M／L 逐字相同（T8／T11／T14／T17／T20／T23／T26 全量比对）', () => {
    const texts = (E) => {
      const out = {};
      const g = mk(E, 58, '正义之心');
      out.justified = E.applyBattleAction(makePvpState(E, mk(E, 6, '猛火', [DARKBITE]), g, 'A'), 'A', '咬碎', R, OFF).events.find((e) => e.ability === '正义之心')?.text;
      const o = mk(E, 95, '碎裂铠甲');
      out.weakArmor = E.applyBattleAction(makePvpState(E, mk(E, 6, '猛火', [TACKLE]), o, 'A'), 'A', '撞击', R, OFF).events.find((e) => e.ability === '碎裂铠甲')?.text;
      const k = mk(E, 129, '胆怯');
      k.maxHp = k.hp = 999;
      out.rattled = E.applyBattleAction(makePvpState(E, mk(E, 6, '猛火', [DARKBITE]), k, 'A'), 'A', '咬碎', R, OFF).events.find((e) => e.ability === '胆怯')?.text;
      const a = mk(E, 56, '愤怒穴位');
      a.maxHp = a.hp = 999;
      out.angerPoint = E.applyBattleAction(makePvpState(E, mk(E, 6, '猛火', [TACKLE]), a, 'A'), 'A', '撞击', R, { chart: 'official', critRate: 1 }).events.find((e) => e.ability === '愤怒穴位')?.text;
      const mx = mk(E, 127, '自信过度', [TACKLE]);
      const t = mk(E, 19, '逃跑');
      t.hp = 1;
      out.moxie = E.applyBattleAction(makePvpState(E, mx, t, 'A'), 'A', '撞击', R, OFF).events.find((e) => e.ability === '自信过度')?.text;
      const dl = mk(E, 137, '下载');
      out.download = makePvpState(E, dl, mk(E, 25, '静电')).log.find((e) => e.ability === '下载')?.text;
      const dt = mk(E, 132, '变身者', [{ name: '变身', type: '普通', power: 1, damage_class: 'status' }]);
      out.imposter = makePvpState(E, dt, mk(E, 19, '逃跑', [SHOCK])).log.find((e) => e.ability === '变身者')?.text;
      const stDef = makePvpState(E, mk(E, 23, '威吓'), mk(E, 56, '不服输'));
      out.defiant = stDef.log.find((e) => e.ability === '不服输')?.text;
      return out;
    };
    assert.deepEqual(texts(L), texts(M));
  });

  test('T35: 合作战函数不镜像到离线端，结算后辅助函数双端均存在', () => {
    assert.strictEqual(L.resolveCoopRound, undefined);
    assert.equal(typeof L.applyHitAbilityTriggers, 'function');
    assert.equal(typeof L.applyMoxie, 'function');
  });

  test('T36: 经典分支（不传 chart）下正义之心／碎裂铠甲／胆怯／愤怒穴位照常触发；防守结算（staged）按真实物特分类', () => {
    const g = mk(M, 58, '正义之心');
    const rG = M.applyBattleAction(makePvpState(M, mk(M, 6, '猛火', [DARKBITE]), g, 'A'), 'A', '咬碎', R);
    assert.equal(rG.error, undefined);
    assert.equal(M.stagesOf(g).atk, 1);

    const o = mk(M, 95, '碎裂铠甲');
    const rO = M.applyBattleAction(makePvpState(M, mk(M, 6, '猛火', [TACKLE]), o, 'A'), 'A', '撞击', R);
    assert.equal(rO.error, undefined);
    assert.equal(M.stagesOf(o).spe, 1);
    assert.equal(M.stagesOf(o).def, -1);

    const k = mk(M, 129, '胆怯');
    k.maxHp = k.hp = 999;
    const rK = M.applyBattleAction(makePvpState(M, mk(M, 6, '猛火', [DARKBITE]), k, 'A'), 'A', '咬碎', R);
    assert.equal(rK.error, undefined);
    assert.equal(M.stagesOf(k).spe, 1);

    const a = mk(M, 56, '愤怒穴位');
    a.maxHp = a.hp = 999;
    const rA = M.applyBattleAction(makePvpState(M, mk(M, 6, '猛火', [TACKLE]), a, 'A'), 'A', '撞击', R, { critRate: 1 });
    assert.equal(rA.error, undefined);
    assert.equal(M.stagesOf(a).atk, 6);

    // 防守结算：咬碎（物理·恶）应触发碎裂铠甲；奇异之风／巨声（特殊）不应触发。
    // stagedMoveForContact 只按属性回落（咬碎→special、影子球→physical，见 T0），
    // 故 category 取 staged.category（stagePvpAttack 带的真实分类），不用它回落。
    const o1 = mk(M, 95, '碎裂铠甲');
    o1.maxHp = o1.hp = 999;
    const h1 = stagedHit(M, mk(M, 6, '猛火', [DARKBITE]), o1, '咬碎');
    assert.equal(M.stagesOf(o1).spe, 1);
    assert.equal(M.stagesOf(o1).def, -1);
    assert.ok(h1.events.some((e) => e.ability === '碎裂铠甲'));

    const o2 = mk(M, 95, '碎裂铠甲');
    o2.maxHp = o2.hp = 999;
    const h2 = stagedHit(M, mk(M, 6, '猛火', [OMINOUS]), o2, '奇异之风');
    assert.ok(o2.hp < 999, '奇异之风应造成伤害，否则本用例空洞');
    assert.equal(M.stagesOf(o2).spe, 0);
    assert.equal(M.stagesOf(o2).def, 0);

    const o3 = mk(M, 95, '碎裂铠甲');
    o3.maxHp = o3.hp = 999;
    stagedHit(M, mk(M, 6, '猛火', [HYPER]), o3, '巨声');
    assert.ok(o3.hp < 999, '巨声应造成伤害，否则本用例空洞');
    assert.equal(M.stagesOf(o3).spe, 0);
    assert.equal(M.stagesOf(o3).def, 0);
  });

  test('T37: 道馆集成 — 碎裂铠甲玩家宠在道馆受馆主物理招命中后 spe +1、def -1', () => {
    const onix = mk(M, 95, '碎裂铠甲', [TACKLE], { level: 30 });
    onix.stats = { ...onix.stats, speed: 1 }; // 馆主先手（effectiveSpeed 只读 stats.speed）
    const bossPhys = mk(M, 74, '结实', [TACKLE], { level: 12 });
    bossPhys.stats = { ...bossPhys.stats, speed: 200 };
    const gymSt = M.createBattleState({
      mode: 'gym',
      firstSide: 'A',
      sides: { A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [onix] }, B: { childId: null, childName: '馆主', battleLevel: 12, activeIdx: 0, pets: [bossPhys] } },
    });
    const out = M.resolveGymRound(gymSt, { moveName: '撞击' }, () => 0.5);
    assert.equal(out.error, undefined, JSON.stringify(out));
    assert.equal(M.stagesOf(onix).spe, 1);
    assert.equal(M.stagesOf(onix).def, -1);
    assert.ok((out.events || []).some((e) => e.ability === '碎裂铠甲'));
  });

  test('T38: 道馆集成 — 自信过度玩家宠在道馆打倒馆主宠后 atk +1', () => {
    const pinsir = mk(M, 127, '自信过度', [TACKLE], { level: 30 });
    const bossWeak = mk(M, 74, '结实', [TACKLE], { level: 5 });
    bossWeak.hp = 1; // 非满血，结实（满血留 1）不触发
    const gymSt = M.createBattleState({
      mode: 'gym',
      firstSide: 'A',
      sides: { A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [pinsir] }, B: { childId: null, childName: '馆主', battleLevel: 5, activeIdx: 0, pets: [bossWeak] } },
    });
    const out = M.resolveGymRound(gymSt, { moveName: '撞击' }, () => 0.5);
    assert.equal(out.error, undefined, JSON.stringify(out));
    assert.equal(M.stagesOf(pinsir).atk, 1);
    assert.ok((out.events || []).some((e) => e.ability === '自信过度'));
  });

  test('T39: 范围守卫（abilityOf 恒为 4 处，服务端与离线端）', () => {
    const srvCode = readBackendSource();
    assert.equal((srvCode.match(/\babilityOf\(/g) || []).length, 4);
    const localCode = readFileSync(assetPath('engine-local.js'), 'utf8');
    assert.equal((localCode.match(/\babilityOf\(/g) || []).length, 4);
  });

  test('T40: 新辅助函数双端导出', () => {
    assert.equal(typeof M.applyHitAbilityTriggers, 'function');
    assert.equal(typeof M.applyMoxie, 'function');
    assert.equal(typeof L.applyHitAbilityTriggers, 'function');
    assert.equal(typeof L.applyMoxie, 'function');
  });
});
