/* 特性 151 Batch 1（6 种特性接线＋避雷针吸引）：node --test tests/abilities-151-batch1.test.mjs
 * 覆盖：隔音／战斗盔甲／复眼／无防守／胆量／神奇鳞片（服务端 M＋离线端 L 双端）、合作战避雷针吸引（仅服务端）、
 * PvP 经典分支边界、真实馆主数据集成、abilityOf( 范围守卫。
 * 脚手架：与 tests/abilities-151-batch0.test.mjs 同款——M 来自 ../src/index.js；L 经 asset-path.mjs 取离线端 bundle；
 * calcDamage 参数顺序是 (move, atkPet, defPet, rng, opts)；makePet 的 moves 必须是 {name,power,…} 对象数组。
 * 合作战用例仿 tests/abilities-expand-155.test.mjs 的 coopState()（createCoopBattleState，宠在 sides.X.pets）。
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
// 计数 rng：每次调用 n++，按 vals 依次返回（用尽后返回最后一个值）。
const counting = (vals) => {
  const f = () => { f.n++; return vals[Math.min(f.n - 1, vals.length - 1)]; };
  f.n = 0;
  return f;
};

const TACKLE = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' }; // 官方命中 100
// 铁尾：官方命中 75，且服务端／离线端的 MOVES_OFFICIAL 里都有（离线表只有 115 条，没有百万吨重拳等命中<100 的普通招）。
const IRONTAIL = { name: '铁尾', type: '钢', power: 100, damage_class: 'physical' };
const HYPER = { name: '巨声', type: '普通', power: 90, damage_class: 'special' }; // MOVES_OFFICIAL 里无 power，招式对象自带
const FIGHT = { name: '音速拳', type: '格斗', power: 60, damage_class: 'physical' }; // 同上，官方表无 power
const SHOCK = { name: '电击', type: '电', power: 40, damage_class: 'special' };

// 真实数据（DEX_DETAILS）：6 猛火/太阳之力(隐)；12 复眼/有色眼镜(隐)；25 静电/避雷针(隐)；66 毅力/无防守；
// 92 飘浮；100 隔音/静电；115 早起/胆量；140 悠游自如/战斗盔甲；143 免疫/厚脂肪；147 蜕皮/神奇鳞片(隐)。
const mk = (E, no, ability, moves = [TACKLE], extra = {}) => {
  const sp = E.SPECIES[no];
  return E.makePet({ key: `p${no}`, name: sp ? sp.name : `#${no}`, type: sp ? sp.type : '普通', no, defTypes: E.playerDefTypes(no), level: 20, moves, ability, ...extra });
};
const dmgOf = (E, move, atk, def, rng = R, opts = OFF) => E.calcDamage(move, atk, def, rng, opts);

// 合作战 state：仿 abilities-expand-155 的 coopState()；petB 可传数组（换宠用例）。
const coopState = (bossNo, bossType, bossMoves, petA, petB) => {
  const sideA = { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petA)] };
  const sideB = { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: (Array.isArray(petB) ? petB : [petB]).map((d) => M.makePet(d)) };
  return M.createCoopBattleState({ node_id: 'test-b1', kind: 'normal', bossNo, bossType, bossMoves, levelOffset: 0 }, sideA, sideB, 18);
};
const cp = (no, name, type, ability, moves = [TACKLE]) => ({ key: 'main', name, type, no, defTypes: M.playerDefTypes(no), level: 18, moves, ability });
const BOSS_MOVES = [['电击', '电', 40], ['撞击', '普通', 35]];
const hasRedirect = (events) => events.some((e) => e.text && e.text.includes('引到了自己身上'));
const ABSORB = '吸收了电属性招式，特攻提升了！';

test('T0 前置守卫: 铁尾官方命中=75（M、L 同），否则命中类用例会空转', () => {
  assert.equal(M.officialAccuracy('铁尾'), 75);
  assert.equal(L.officialAccuracy('铁尾'), 75);
});

describe('Batch 1 — 隔音（T1–T5）', () => {
  test('T1: 隔音防守方吃声音招巨声，dmg===0、mult===0 且返回 immune 条目', () => {
    const atk = mk(M, 6, '猛火');
    const def = mk(M, 100, '隔音');
    const res = dmgOf(M, HYPER, atk, def);
    assert.equal(res.dmg, 0);
    assert.equal(res.mult, 0);
    assert.deepEqual(res.ability[0], { name: '隔音', kind: 'immune', side: 'def', pet: def.name, moveType: '普通', heal: 0 });
  });

  test('T2: 隔音防守方吃非声音招撞击正常受伤', () => {
    assert.ok(dmgOf(M, TACKLE, mk(M, 6, '猛火'), mk(M, 100, '隔音')).dmg > 0);
  });

  test('T3: SOUND_MOVES 恰为 7 个，均在 MOVES_OFFICIAL 里，逐个打隔音宠均 mult===0', () => {
    const expected = ['巨声', '吵闹', '虫鸣', '回声', '魅惑之声', '打鼾', '轮唱'].sort();
    assert.deepEqual([...M.SOUND_MOVES].sort(), expected);
    const atk = mk(M, 6, '猛火');
    const def = mk(M, 100, '隔音');
    for (const name of expected) {
      const info = M.MOVES_OFFICIAL[name];
      assert.ok(info, `MOVES_OFFICIAL 缺 ${name}`);
      // 巨声／魅惑之声在官方表里无 power，必须由招式对象自带（power 缺失会被 calcDamage 当成无效招式）。
      const move = { name, type: info.type, power: info.power || 60, damage_class: info.damage_class };
      const res = dmgOf(M, move, atk, def);
      assert.equal(res.mult, 0, `${name} 应被隔音拦下`);
      assert.equal(res.dmg, 0);
    }
  });

  test('T4: 隔音事件文案精确匹配', () => {
    const def = mk(M, 100, '隔音');
    const res = dmgOf(M, HYPER, mk(M, 6, '猛火'), def);
    assert.equal(M.abilityEventText(res.ability[0], 0), `「隔音」发动！${def.name} 听不见声音，声音类招式没有效果！`);
  });

  test('T5: 隔音免疫不消耗 rng', () => {
    const rng = counting([0.5]);
    dmgOf(M, HYPER, mk(M, 6, '猛火'), mk(M, 100, '隔音'), rng);
    assert.equal(rng.n, 0);
  });
});

describe('Batch 1 — 战斗盔甲（T6–T7）', () => {
  test('T6: critRate=1 下战斗盔甲不暴击，同种首特性悠游自如暴击', () => {
    const atk = mk(M, 6, '猛火');
    const opts = { chart: 'official', critRate: 1 };
    assert.equal(dmgOf(M, TACKLE, atk, mk(M, 140, '战斗盔甲'), R, opts).critical, false);
    assert.equal(dmgOf(M, TACKLE, atk, mk(M, 140, '悠游自如'), R, opts).critical, true);
  });

  test('T7: 战斗盔甲 rng 调用次数与对照暴击路径一致（命中、暴击、随机档共 3 次）', () => {
    const atk = mk(M, 6, '猛火');
    const opts = { chart: 'official', critRate: 1 };
    const r1 = counting([0.1, 0.1, 0.5]);
    const r2 = counting([0.1, 0.1, 0.5]);
    dmgOf(M, TACKLE, atk, mk(M, 140, '战斗盔甲'), r1, opts);
    dmgOf(M, TACKLE, atk, mk(M, 140, '悠游自如'), r2, opts);
    assert.equal(r1.n, 3);
    assert.equal(r1.n, r2.n);
  });
});

describe('Batch 1 — 复眼（T8–T10）', () => {
  test('T8: 75 命中招在 rng=0.9 下无特性未命中，复眼（75×1.3=97.5）命中', () => {
    const def = mk(M, 143, '免疫');
    const resMiss = dmgOf(M, IRONTAIL, mk(M, 12, '有色眼镜'), def, counting([0.9, 0.5, 0.5]));
    const resHit = dmgOf(M, IRONTAIL, mk(M, 12, '复眼'), def, counting([0.9, 0.5, 0.5]));
    assert.equal(resMiss.missed, true);
    assert.notEqual(resHit.missed, true);
    assert.ok(resHit.dmg > 0);
  });

  test('T9: 复眼与闪避加成叠加（100×1.3−5=125 > 99），无特性同条件未命中', () => {
    const def = mk(M, 143, '免疫');
    const opts = { chart: 'official', critRate: 0, dodgePct: 5 };
    assert.equal(dmgOf(M, TACKLE, mk(M, 12, '有色眼镜'), def, counting([0.99, 0.5, 0.5]), opts).missed, true);
    assert.notEqual(dmgOf(M, TACKLE, mk(M, 12, '复眼'), def, counting([0.99, 0.5, 0.5]), opts).missed, true);
  });

  test('T10: 无特性攻击方在命中/闪避/rng 网格上与旧公式逐格一致', () => {
    const atk = mk(M, 6, '猛火');
    const def = mk(M, 143, '免疫');
    for (const [move, acc] of [[TACKLE, 100], [IRONTAIL, 75]]) {
      for (const dodgePct of [0, 5]) {
        for (const r of [0.04, 0.74, 0.75, 0.94, 0.99]) {
          const res = dmgOf(M, move, atk, def, counting([r, 0.5, 0.5]), { chart: 'official', critRate: 0, dodgePct });
          assert.equal(Boolean(res.missed), !(r * 100 < acc - dodgePct), `acc=${acc} dodge=${dodgePct} r=${r}`);
        }
      }
    }
  });
});

describe('Batch 1 — 无防守（T11–T13）', () => {
  test('T11: 攻击方带无防守时 75 命中招 rng=0.99 必中', () => {
    const res = dmgOf(M, IRONTAIL, mk(M, 66, '无防守'), mk(M, 143, '免疫'), counting([0.99, 0.5, 0.5]));
    assert.notEqual(res.missed, true);
    assert.ok(res.dmg > 0);
  });

  test('T12: 防守方带无防守时对方 75 命中招 rng=0.99 必中', () => {
    const res = dmgOf(M, IRONTAIL, mk(M, 6, '猛火'), mk(M, 67, '无防守'), counting([0.99, 0.5, 0.5]));
    assert.notEqual(res.missed, true);
    assert.ok(res.dmg > 0);
  });

  test('T13: 无防守路径照掷命中随机数，rng 调用次数与普通命中路径同为 3 次', () => {
    const def = mk(M, 143, '免疫');
    const r1 = counting([0.99, 0.5, 0.5]);
    const r2 = counting([0.1, 0.5, 0.5]);
    dmgOf(M, IRONTAIL, mk(M, 66, '无防守'), def, r1);
    dmgOf(M, IRONTAIL, mk(M, 66, '毅力'), def, r2);
    assert.equal(r1.n, 3);
    assert.equal(r2.n, 3);
  });
});

describe('Batch 1 — 胆量（T14–T17）', () => {
  test('T14: 胆量普通招打鬼斯（幽灵/毒）得 mult===1、dmg>0 且记录 scrappy，文案精确', () => {
    const gastly = mk(M, 92, '飘浮');
    const scrappy = mk(M, 115, '胆量');
    assert.equal(dmgOf(M, TACKLE, mk(M, 115, '早起'), gastly).mult, 0);
    const res = dmgOf(M, TACKLE, scrappy, gastly);
    assert.equal(res.mult, 1);
    assert.ok(res.dmg > 0);
    const entry = res.ability.find((a) => a.kind === 'scrappy');
    assert.ok(entry && entry.name === '胆量');
    assert.equal(M.abilityEventText(entry, 0), `「胆量」发动！${scrappy.name} 的招式击中了幽灵属性的对手！`);
  });

  test('T15: 胆量格斗招打鬼斯解除幽灵免疫后对毒为 mult===0.5；无胆量为 0', () => {
    const gastly = mk(M, 92, '飘浮');
    assert.equal(dmgOf(M, FIGHT, mk(M, 115, '早起'), gastly).mult, 0);
    const res = dmgOf(M, FIGHT, mk(M, 115, '胆量'), gastly);
    assert.equal(res.mult, 0.5);
    assert.ok(res.dmg > 0);
  });

  test('T16: 胆量普通招打纯幽灵防守方得 mult===1', () => {
    const pureGhost = mk(M, 92, '飘浮', [TACKLE], { type: '幽灵', defTypes: ['幽灵'] });
    assert.equal(dmgOf(M, TACKLE, mk(M, 115, '胆量'), pureGhost).mult, 1);
  });

  test('T17: 胆量边界 — 电招打地面仍免疫；普通招打非幽灵无 scrappy 条目；经典分支行为不变', () => {
    const scrappy = mk(M, 115, '胆量');
    assert.equal(dmgOf(M, SHOCK, scrappy, mk(M, 50, '沙隐')).mult, 0);
    assert.ok(!dmgOf(M, TACKLE, scrappy, mk(M, 143, '免疫')).ability.some((a) => a.kind === 'scrappy'));
    const gastly = mk(M, 92, '飘浮');
    const resClassic = M.calcDamage(TACKLE, scrappy, gastly, R);
    assert.ok(!resClassic.ability.some((a) => a.kind === 'scrappy'));
    assert.equal(resClassic.mult, M.calcDamage(TACKLE, mk(M, 115, '早起'), gastly, R).mult);
  });
});

describe('Batch 1 — 神奇鳞片（T18–T20）', () => {
  test('T18: 防守方带灼伤时物理招防御×1.5，伤害比例在 0.60–0.75 且记录 marvelscale', () => {
    const atk = mk(M, 6, '猛火');
    const healthy = mk(M, 147, '神奇鳞片');
    const burned = mk(M, 147, '神奇鳞片');
    burned.status = { kind: 'burn' };
    const dmgHealthy = dmgOf(M, TACKLE, atk, healthy).dmg;
    const res = dmgOf(M, TACKLE, atk, burned);
    const ratio = res.dmg / dmgHealthy;
    assert.ok(res.dmg < dmgHealthy);
    assert.ok(ratio >= 0.60 && ratio <= 0.75, `ratio=${ratio}`);
    assert.ok(res.ability.some((a) => a.kind === 'marvelscale' && a.name === '神奇鳞片'));
  });

  test('T19: 神奇鳞片带状态吃特殊招，伤害与无状态逐位相同且无 marvelscale 条目', () => {
    const atk = mk(M, 6, '猛火');
    const healthy = mk(M, 147, '神奇鳞片');
    const burned = mk(M, 147, '神奇鳞片');
    burned.status = { kind: 'burn' };
    const res = dmgOf(M, HYPER, atk, burned);
    assert.equal(res.dmg, dmgOf(M, HYPER, atk, healthy).dmg);
    assert.ok(!res.ability.some((a) => a.kind === 'marvelscale'));
  });

  test('T20: 无状态物理招不触发神奇鳞片；带麻痹触发时文案精确匹配', () => {
    const atk = mk(M, 6, '猛火');
    const def = mk(M, 147, '神奇鳞片');
    assert.ok(!dmgOf(M, TACKLE, atk, def).ability.some((a) => a.kind === 'marvelscale'));
    def.status = { kind: 'paralysis' };
    const entry = dmgOf(M, TACKLE, atk, def).ability.find((a) => a.kind === 'marvelscale');
    assert.ok(entry);
    assert.equal(M.abilityEventText(entry, 0), `「神奇鳞片」发动！${def.name} 因为异常状态，防御提升了！`);
  });
});

describe('Batch 1 — 合作战避雷针吸引（T21–T28、T39–T40，仅服务端）', () => {
  const petA = () => cp(6, '喷火龙', '火', '猛火');
  const rodB = () => cp(25, '皮卡丘', '电', '避雷针');

  test('T21: 馆主单体电招打 A 席，B 席避雷针吸引并吸收提升特攻；事件顺序为重定向→免疫→攻击', () => {
    const st = coopState(125, '电', BOSS_MOVES, petA(), rodB());
    const A = st.sides.A.pets[0];
    const B = st.sides.B.pets[0];
    const hpA0 = A.hp;
    const hpB0 = B.hp;
    const out = M.resolveCoopRound(st, {}, { kind: 'single', moveName: '电击', targetSeat: 'A' }, R);
    assert.equal(out.error, undefined);
    assert.equal(A.hp, hpA0);
    assert.equal(B.hp, hpB0);
    assert.equal(B.stages.spa, 1);
    const evs = out.events;
    const bossName = st.sides.BOSS.pets[0].name;
    const iRedirect = evs.findIndex((e) => e.type === 'ability' && e.text === `「避雷针」发动！${B.name} 把 ${bossName} 的电属性招式引到了自己身上！`);
    const iImmune = evs.findIndex((e) => e.type === 'ability' && e.text && e.text.includes(ABSORB));
    const iAttack = evs.findIndex((e) => e.type === 'attack' && e.target === B.name && e.immune === true);
    assert.ok(iRedirect >= 0, '缺重定向事件');
    assert.ok(iImmune > iRedirect, '免疫事件须在重定向之后');
    assert.ok(iAttack > iImmune, '攻击事件须在免疫之后');
    assert.equal(evs[iRedirect].side, 'B');
  });

  test('T22: 馆主非电属性单体招不触发重定向', () => {
    const st = coopState(125, '电', BOSS_MOVES, petA(), rodB());
    const hpA0 = st.sides.A.pets[0].hp;
    const out = M.resolveCoopRound(st, {}, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, R);
    assert.ok(st.sides.A.pets[0].hp < hpA0);
    assert.equal(st.sides.B.pets[0].stages.spa, 0);
    assert.ok(!hasRedirect(out.events));
  });

  test('T23: 蓄势锁定招（fromLock:true）不触发重定向', () => {
    const st = coopState(125, '电', BOSS_MOVES, petA(), rodB());
    const hpA0 = st.sides.A.pets[0].hp;
    const out = M.resolveCoopRound(st, {}, { kind: 'single', moveName: '电击', targetSeat: 'A', fromLock: true }, R);
    assert.ok(st.sides.A.pets[0].hp < hpA0);
    assert.equal(st.sides.B.pets[0].stages.spa, 0);
    assert.ok(!hasRedirect(out.events));
  });

  test('T24: 馆主全体横扫电招不触发重定向；A 受伤、B 走既有免疫', () => {
    const st = coopState(125, '电', BOSS_MOVES, petA(), rodB());
    const hpA0 = st.sides.A.pets[0].hp;
    const out = M.resolveCoopRound(st, {}, { kind: 'sweep', moveName: '电击' }, R);
    assert.ok(st.sides.A.pets[0].hp < hpA0);
    assert.equal(st.sides.B.pets[0].stages.spa, 1);
    assert.ok(!hasRedirect(out.events));
  });

  test('T25: 避雷针持有者已是目标席（targetSeat:B）时不发重定向事件，仅走既有免疫', () => {
    const st = coopState(125, '电', BOSS_MOVES, petA(), rodB());
    const out = M.resolveCoopRound(st, {}, { kind: 'single', moveName: '电击', targetSeat: 'B' }, R);
    assert.equal(st.sides.B.pets[0].stages.spa, 1);
    assert.ok(!hasRedirect(out.events));
    assert.ok(out.events.some((e) => e.text && e.text.includes(ABSORB)));
  });

  test('T26: 避雷针持有者已昏厥（hp=0）时不重定向，目标 A 正常受伤', () => {
    const st = coopState(125, '电', BOSS_MOVES, petA(), rodB());
    st.sides.B.pets[0].hp = 0;
    const hpA0 = st.sides.A.pets[0].hp;
    const out = M.resolveCoopRound(st, {}, { kind: 'single', moveName: '电击', targetSeat: 'A' }, R);
    assert.ok(st.sides.A.pets[0].hp < hpA0);
    assert.ok(!hasRedirect(out.events));
  });

  test('T27: 玩家席电招攻击馆主，不被队友席避雷针吸走（重定向只作用于 bossAction）', () => {
    const shock = { name: '电击', type: '电', power: 40, damage_class: 'special' };
    const st = coopState(143, '普通', [['撞击', '普通', 35]], cp(25, '皮卡丘', '电', '静电', [shock]), cp(25, '皮卡丘', '电', '避雷针', [shock]));
    const boss = st.sides.BOSS.pets[0];
    const hp0 = boss.hp;
    const out = M.resolveCoopRound(st, { A: { type: 'move', moveName: '电击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, R);
    assert.equal(out.error, undefined);
    assert.ok(boss.hp < hp0);
    assert.equal(st.sides.B.pets[0].stages.spa, 0);
    assert.ok(!hasRedirect(out.events));
  });

  test('T28: 重定向不增加 rng 消耗（与直接命中持有者调用次数相等）', () => {
    const runOnce = (targetSeat) => {
      const st = coopState(125, '电', BOSS_MOVES, petA(), rodB());
      const rng = counting([0.5]);
      const out = M.resolveCoopRound(st, {}, { kind: 'single', moveName: '电击', targetSeat }, rng);
      assert.equal(out.error, undefined);
      return rng.n;
    };
    assert.equal(runOnce('A'), runOnce('B'));
  });

  test('T39: 换宠先于重定向 — B 席本回合换上避雷针宠后成功吸引馆主对 A 的电招', () => {
    const st = coopState(125, '电', BOSS_MOVES, petA(), [cp(7, '杰尼龟', '水', '激流'), rodB()]);
    const hpA0 = st.sides.A.pets[0].hp;
    const out = M.resolveCoopRound(st, { B: { type: 'switch', toIdx: 1 } }, { kind: 'single', moveName: '电击', targetSeat: 'A' }, R);
    assert.equal(out.error, undefined);
    const newB = st.sides.B.pets[1];
    assert.equal(st.sides.A.pets[0].hp, hpA0);
    assert.equal(newB.stages.spa, 1);
    assert.ok(out.events.some((e) => e.type === 'ability' && e.pet === newB.name && e.text.includes('引到了自己身上')));
  });

  test('T40: 目标自己已是持有者时不重定向到另一席持有者', () => {
    const st = coopState(125, '电', BOSS_MOVES, rodB(), rodB());
    const out = M.resolveCoopRound(st, {}, { kind: 'single', moveName: '电击', targetSeat: 'A' }, R);
    assert.equal(st.sides.A.pets[0].stages.spa, 1);
    assert.equal(st.sides.B.pets[0].stages.spa, 0);
    assert.ok(!hasRedirect(out.events));
  });
});

describe('Batch 1 — 离线端一致性、经典分支与范围守卫（T29–T38）', () => {
  const localCode = readFileSync(assetPath('engine-local.js'), 'utf8');
  const serverCode = readBackendSource();

  test('T29: 离线端 L.SOUND_MOVES 与隔音行为与服务端一致', () => {
    assert.deepEqual([...L.SOUND_MOVES].sort(), [...M.SOUND_MOVES].sort());
    const atk = mk(L, 6, '猛火');
    const def = mk(L, 100, '隔音');
    assert.equal(dmgOf(L, HYPER, atk, def).mult, 0);
    assert.ok(dmgOf(L, TACKLE, atk, def).dmg > 0);
  });

  test('T30: 离线端战斗盔甲防暴击与服务端一致', () => {
    const atk = mk(L, 6, '猛火');
    const opts = { chart: 'official', critRate: 1 };
    assert.equal(dmgOf(L, TACKLE, atk, mk(L, 140, '战斗盔甲'), R, opts).critical, false);
    assert.equal(dmgOf(L, TACKLE, atk, mk(L, 140, '悠游自如'), R, opts).critical, true);
  });

  test('T31: 离线端复眼提升命中与服务端一致', () => {
    const def = mk(L, 143, '免疫');
    assert.equal(dmgOf(L, IRONTAIL, mk(L, 12, '有色眼镜'), def, counting([0.9, 0.5, 0.5])).missed, true);
    assert.notEqual(dmgOf(L, IRONTAIL, mk(L, 12, '复眼'), def, counting([0.9, 0.5, 0.5])).missed, true);
  });

  test('T32: 离线端无防守双方必中与服务端一致', () => {
    assert.notEqual(dmgOf(L, IRONTAIL, mk(L, 66, '无防守'), mk(L, 143, '免疫'), counting([0.99, 0.5, 0.5])).missed, true);
    assert.notEqual(dmgOf(L, IRONTAIL, mk(L, 6, '猛火'), mk(L, 67, '无防守'), counting([0.99, 0.5, 0.5])).missed, true);
  });

  test('T33: 离线端胆量击中幽灵属性与服务端一致', () => {
    const gastly = mk(L, 92, '飘浮');
    const scrappy = mk(L, 115, '胆量');
    assert.equal(dmgOf(L, TACKLE, scrappy, gastly).mult, 1);
    assert.equal(dmgOf(L, FIGHT, scrappy, gastly).mult, 0.5);
  });

  test('T34: 离线端神奇鳞片行为与服务端一致；3 处新文案在离线 bundle 与服务端源码里逐字相同', () => {
    const atk = mk(L, 6, '猛火');
    const healthy = mk(L, 147, '神奇鳞片');
    const burned = mk(L, 147, '神奇鳞片');
    burned.status = { kind: 'burn' };
    assert.ok(dmgOf(L, TACKLE, atk, burned).dmg < dmgOf(L, TACKLE, atk, healthy).dmg);
    assert.equal(dmgOf(L, HYPER, atk, burned).dmg, dmgOf(L, HYPER, atk, healthy).dmg);
    // 离线 bundle 不导出 abilityEventText／abilityEvents，文案按源码逐字比对。
    for (const frag of [
      "if (e.name === '隔音') return `「隔音」发动！${e.pet} 听不见声音，声音类招式没有效果！`;",
      "if (e.kind === 'scrappy') return `「胆量」发动！${e.pet} 的招式击中了幽灵属性的对手！`;",
      "if (e.kind === 'marvelscale') return `「神奇鳞片」发动！${e.pet} 因为异常状态，防御提升了！`;",
    ]) {
      assert.ok(serverCode.includes(frag), `服务端缺：${frag}`);
      assert.ok(localCode.includes(frag), `离线端缺：${frag}`);
    }
    // 离线端条目与服务端同形（fields 逐一相等，文案渲染由服务端 abilityEventText 负责）。
    const eL = dmgOf(L, TACKLE, atk, burned).ability.find((a) => a.kind === 'marvelscale');
    const eM = dmgOf(M, TACKLE, mk(M, 6, '猛火'), Object.assign(mk(M, 147, '神奇鳞片'), { status: { kind: 'burn' } })).ability.find((a) => a.kind === 'marvelscale');
    assert.deepEqual(eL, eM);
  });

  test('T35: 避雷针吸引不镜像到离线端', () => {
    assert.strictEqual(L.coopLightningRodSeat, undefined);
    assert.ok(!localCode.includes('coopLightningRodSeat'));
  });

  test('T36: PvP 经典分支边界 — 战斗盔甲/隔音/神奇鳞片生效，复眼/无防守/胆量不改变经典分支', () => {
    const atk = mk(M, 6, '猛火');
    assert.equal(M.calcDamage(TACKLE, atk, mk(M, 140, '战斗盔甲'), R, { critRate: 1 }).critical, false);
    assert.equal(M.calcDamage(HYPER, atk, mk(M, 100, '隔音'), R).mult, 0);
    const healthy = mk(M, 147, '神奇鳞片');
    const burned = mk(M, 147, '神奇鳞片');
    burned.status = { kind: 'burn' };
    assert.ok(M.calcDamage(TACKLE, atk, burned, R).dmg < M.calcDamage(TACKLE, atk, healthy, R).dmg);
    assert.strictEqual(M.calcDamage(IRONTAIL, mk(M, 12, '复眼'), mk(M, 143, '免疫'), R).missed, undefined);
    assert.strictEqual(M.calcDamage(IRONTAIL, mk(M, 66, '无防守'), mk(M, 143, '免疫'), R).missed, undefined);
    const gastly = mk(M, 92, '飘浮');
    assert.equal(M.calcDamage(TACKLE, mk(M, 115, '胆量'), gastly, R).mult, M.calcDamage(TACKLE, mk(M, 115, '早起'), gastly, R).mult);
  });

  test('T37: 真实馆主数据集成 — S3 霹雳电球(100)、S6 魔墙人偶(122) 按生产建宠方式得隔音并免疫巨声', () => {
    const s3 = M.GYM_STAGES.find((g) => g.stage === 3);
    const s6 = M.GYM_STAGES.find((g) => g.stage === 6);
    assert.equal(s3.bossTeam[0].no, 100);
    assert.ok(s6.bossTeam.some((p) => p.no === 122));
    const build = (no, level) => {
      const sp = M.SPECIES[no];
      return M.makePet({ key: `b${no}`, name: sp.name, type: sp.type, no, defTypes: M.playerDefTypes(no), level, moves: [TACKLE] });
    };
    const boss100 = build(100, 16);
    const boss122 = build(122, 26);
    assert.equal(boss100.ability, '隔音');
    assert.equal(boss122.ability, '隔音');
    const player = mk(M, 6, '猛火');
    assert.equal(dmgOf(M, HYPER, player, boss100).mult, 0);
    assert.equal(dmgOf(M, HYPER, player, boss122).mult, 0);
  });

  test('T38: 范围守卫 — src/index.js 与离线 bundle 中 abilityOf( 均恒为 4 处', () => {
    assert.equal((serverCode.match(/\babilityOf\(/g) || []).length, 4);
    assert.equal((localCode.match(/\babilityOf\(/g) || []).length, 4);
  });
});
