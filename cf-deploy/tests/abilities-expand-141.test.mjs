/* 战斗特性扩到 141（2026-11-07）：node --test tests/abilities-expand-141.test.mjs
 * 第二步＋9 种关都备战宠 121/131/133/134/135/136/143/147/151；唯一新接线特性是引火
 * （136 首特性；同时覆盖野外 37/38 九尾线）。131/134/135 的储水/蓄电、143 免疫、
 * 147 蜕皮、151 同步是一、二期已实现的，本文件写测试验证四路触发；121 发光、133 逃跑
 * 是场外特性，确认战斗中无操作不报错。
 * 口径：D1 首特性、D4 接触判定、D6 速度不进 PvP（一、二期沿用）。
 * 确定性：固定 rng；精确伤害数均由 /tmp/probe-141.mjs 实测（makePet 带 stats，走官方分支）。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const M = await import(new URL('../src/index.js', import.meta.url));
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);

const R = () => 0.5;
const OFF = { chart: 'official', critRate: 0 };
const pet = (no, name, moves, hp = null) => {
  const sp = M.SPECIES[no];
  const p = M.makePet({ key: `p${no}`, name, type: sp ? sp.type : '普通', no, defTypes: M.playerDefTypes(no), level: 18, moves });
  if (hp != null) p.hp = hp;
  return p;
};
const fire64 = { name: '喷射火焰', power: 64, type: '火' };
const fire40 = { name: '火花', power: 40, type: '火' };
const fire54 = { name: '火花飞舞', power: 54, type: '火' };
const water40 = { name: '水枪', power: 40, type: '水' };
const elec40 = { name: '十万伏特', power: 40, type: '电' };
const tackle = { name: '撞击', type: '普通', power: 35 };
const bobo = { key: 'boss', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] };

// 已实装特性集合（一期 9＋二期 2a 5＋二期 2b 13＋本批引火 1＝28 个）。
const IMPLEMENTED = new Set([
  '茂盛', '猛火', '激流', '虫之预感', '厚脂肪', '飘浮', '硬壳盔甲', '储水', '蓄电',
  '威吓', '避雷针', '电气引擎', '怪力钳', '恒净之躯',
  '静电', '毒刺', '同步', '蜕皮', '柔软', '毅力', '孢子', '干劲', '不眠', '免疫', '火焰之躯', '自然回复', '早起',
  '引火',
]);
const WILD_141 = (() => {
  // 野外 132（WILD 表）＋本批 9 种。
  const wild = M.WILD.map((w) => w.no);
  return [...new Set([...wild, 121, 131, 133, 134, 135, 136, 143, 147, 151])];
})();

describe('范围守卫（扩到 141）', () => {
  test('9 种首特性逐种核对（121 发光、131 储水、133 逃跑、134 储水、135 蓄电、136 引火、143 免疫、147 蜕皮、151 同步）', () => {
    const want = { 121: '发光', 131: '储水', 133: '逃跑', 134: '储水', 135: '蓄电', 136: '引火', 143: '免疫', 147: '蜕皮', 151: '同步' };
    for (const [no, name] of Object.entries(want)) assert.equal(M.abilityOf(Number(no)), name, `${no} 号首特性`);
    assert.equal(M.abilityOf(37), '引火');
    assert.equal(M.abilityOf(38), '引火');
  });
  test('覆盖数核算：141 合计 70 种；9 种里 7 种已覆盖，121/133 场外 dormant；引火首特性全种 37/38/136', () => {
    assert.equal(WILD_141.length, 141);
    const covered = WILD_141.filter((no) => IMPLEMENTED.has(M.abilityOf(no)));
    assert.equal(covered.length, 70);
    const nine = [121, 131, 133, 134, 135, 136, 143, 147, 151];
    assert.deepEqual(nine.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).sort((a, b) => a - b), [131, 134, 135, 136, 143, 147, 151]);
    assert.deepEqual(nine.filter((no) => !IMPLEMENTED.has(M.abilityOf(no))).sort((a, b) => a - b), [121, 133]);
    const flashFireNos = Object.entries(M.DEX_DETAILS)
      .filter(([, d]) => d.abilities && d.abilities[0] && d.abilities[0].name === '引火')
      .map(([no]) => Number(no)).sort((a, b) => a - b);
    assert.deepEqual(flashFireNos, [37, 38, 136]);
  });
  test('第二特性不生效：58/59 的引火是第二特性，火招打 58 无免疫条目', () => {
    assert.equal(M.abilityOf(58), '威吓');
    assert.equal(M.abilityOf(59), '威吓');
    const r = M.calcDamage(fire64, pet(5, '火恐龙', [fire64]), pet(58, '卡蒂狗', [tackle]), R, OFF);
    assert.ok(r.dmg > 0 && r.ability.length === 0, JSON.stringify(r));
  });
});

describe('引火（新接线）', () => {
  test('calcDamage 免疫：喷射火焰打 136/37/38 → dmg 0、mult 0，条目带 flashFire、heal 0', () => {
    for (const [no, name] of [[136, '火伊布'], [37, '六尾'], [38, '九尾']]) {
      const defPet = pet(no, name, [fire64]);
      const r = M.calcDamage(fire64, pet(5, '火恐龙', [fire64]), defPet, R, OFF);
      assert.equal(r.dmg, 0, `${no} dmg`);
      assert.equal(r.mult, 0, `${no} mult`);
      assert.equal(r.ability.length, 1, `${no} ability`);
      assert.equal(r.ability[0].name, '引火');
      assert.equal(r.ability[0].flashFire, true);
      assert.equal(r.ability[0].heal, 0);
      assert.match(M.abilityEventText(r.ability[0], 0), /引火.*吸收了火属性招式/);
    }
  });
  test('applyAbilityFlashFire 挂标记；makePet 初始 false；无条目不挂', () => {
    const p = pet(136, '火伊布', [fire64]);
    assert.equal(p.flashFire, false);
    M.applyAbilityFlashFire(p, []);
    assert.equal(p.flashFire, false);
    M.applyAbilityFlashFire(p, [{ name: '引火', kind: 'immune', flashFire: true }]);
    assert.equal(p.flashFire, true);
    // 储水条目不带 flashFire，不挂标记
    const q = pet(131, '拉普拉斯', [water40]);
    M.applyAbilityFlashFire(q, [{ name: '储水', kind: 'immune', heal: 18 }]);
    assert.equal(q.flashFire, false);
  });
  test('火伤加成：136 喷射火焰 57 vs 39；37 火花飞舞 29 vs 21；38 喷射火焰 50 vs 35，均带 flashfire 事件', () => {
    const cases = [
      [136, '火伊布', fire64, 57, 39],
      [37, '六尾', fire54, 29, 21],
      [38, '九尾', fire64, 50, 35],
    ];
    for (const [no, name, move, wantOn, wantOff] of cases) {
      const on = pet(no, name, [move]);
      on.flashFire = true;
      const off = pet(no, name, [move]);
      const rOn = M.calcDamage(move, on, pet(16, '波波', [tackle]), R, OFF);
      const rOff = M.calcDamage(move, off, pet(16, '波波', [tackle]), R, OFF);
      assert.equal(rOn.dmg, wantOn, `${no} 有标记`);
      assert.equal(rOff.dmg, wantOff, `${no} 无标记`);
      assert.equal(rOn.ability.length, 1);
      assert.equal(rOn.ability[0].kind, 'flashfire');
      assert.match(M.abilityEventText(rOn.ability[0], 0), /引火.*火属性招式威力提升/);
      assert.equal(rOff.ability.length, 0);
    }
  });
  test('非火招不触发：撞击打 136 正常伤害无条目；带标记的 136 用撞击与无标记同伤害、无 flashfire 事件', () => {
    const r = M.calcDamage(tackle, pet(16, '波波', [tackle]), pet(136, '火伊布', [fire64]), R, OFF);
    assert.equal(r.dmg, 10);
    assert.equal(r.ability.length, 0);
    const on = pet(136, '火伊布', [tackle]);
    on.flashFire = true;
    const off = pet(136, '火伊布', [tackle]);
    const rOn = M.calcDamage(tackle, on, pet(16, '波波', [tackle]), R, OFF);
    const rOff = M.calcDamage(tackle, off, pet(16, '波波', [tackle]), R, OFF);
    assert.equal(rOn.dmg, rOff.dmg);
    assert.equal(rOn.ability.length, 0);
  });
  test('离场/昏厥清除标记：onPetLeavesField 与 clearPetBattleState 均清零', () => {
    const p = pet(136, '火伊布', [fire64]);
    p.flashFire = true;
    p.stages.atk = 1;
    M.onPetLeavesField(null, 'A', p, []);
    assert.equal(p.flashFire, false);
    p.flashFire = true;
    p.status = { kind: 'poison' };
    M.clearPetBattleState(p);
    assert.equal(p.flashFire, false);
    assert.equal(p.status, null);
  });
});

describe('储水/蓄电/免疫/蜕皮/同步（calcDamage 级）', () => {
  test('储水：水枪打 131/134 → dmg 0、heal 18（maxHp 74）；蓄电：十万伏特打 135 → heal 12（maxHp 51）', () => {
    for (const [no, name, move, heal] of [[131, '拉普拉斯', water40, 18], [134, '水伊布', water40, 18], [135, '雷伊布', elec40, 12]]) {
      const defPet = pet(no, name, [water40]);
      const atkPet = no === 135 ? pet(25, '皮卡丘', [elec40]) : pet(7, '杰尼龟', [water40]);
      const r = M.calcDamage(move, atkPet, defPet, R, OFF);
      assert.equal(r.dmg, 0, `${no} dmg`);
      assert.equal(r.mult, 0, `${no} mult`);
      assert.equal(r.ability[0].heal, heal, `${no} heal`);
      assert.equal(defPet.maxHp, heal * 4 + (heal === 18 ? 2 : 3), `${no} maxHp`); // 74=18*4+2，51=12*4+3
    }
  });
  test('免疫：143 tryInflictStatus 中毒被特性挡下，事件为 ability 免疫', () => {
    const snor = pet(143, '卡比兽', [tackle]);
    const r = M.tryInflictStatus(snor, 'poison', R, 'A');
    assert.equal(r.blocked, true);
    assert.equal(r.event.ability, '免疫');
    assert.equal(snor.status, null);
  });
  test('蜕皮：147 回合末 rng 0.1 治愈（扣 5 后治愈）、rng 0.5 不治愈', () => {
    const p1 = pet(147, '迷你龙', [tackle]);
    p1.status = { kind: 'poison' };
    const hp1 = p1.hp;
    const ev1 = [];
    const r1 = M.settleStatusTick(p1, () => 0.1, ev1, 'A');
    assert.equal(r1.cured, true);
    assert.equal(r1.dmg, 5);
    assert.equal(p1.hp, hp1 - 5);
    assert.equal(p1.status, null);
    assert.ok(ev1.some((e) => e.type === 'ability' && e.ability === '蜕皮'), JSON.stringify(ev1));
    const p2 = pet(147, '迷你龙', [tackle]);
    p2.status = { kind: 'poison' };
    const r2 = M.settleStatusTick(p2, () => 0.5, [], 'A');
    assert.equal(r2.cured, false);
    assert.deepEqual(p2.status, { kind: 'poison' });
  });
  test('同步：151 中毒时把状态传给对方（只传一次），双方都中毒＋同步事件', () => {
    const mew = pet(151, '梦幻', [tackle]);
    const src = pet(16, '波波', [tackle]);
    const ev = [];
    const ok = M.applyStatusInflict(mew, src, 'poison', '毒刺', R, ev, 'B', 'A');
    assert.equal(ok, true);
    assert.deepEqual(mew.status, { kind: 'poison' });
    assert.deepEqual(src.status, { kind: 'poison' });
    assert.ok(ev.some((e) => e.type === 'ability' && e.ability === '同步'), JSON.stringify(ev));
  });
  test('场外特性无操作：水枪打 121 dmg 4、ability 空；撞击打 133 正常伤害、ability 空', () => {
    const r1 = M.calcDamage(water40, pet(7, '杰尼龟', [water40]), pet(121, '宝石海星', [water40]), R, OFF);
    assert.equal(r1.dmg, 4);
    assert.equal(r1.mult, 0.5);
    assert.equal(r1.ability.length, 0);
    const r2 = M.calcDamage(tackle, pet(16, '波波', [tackle]), pet(133, '伊布', [tackle]), R, OFF);
    assert.ok(r2.dmg > 0);
    assert.equal(r2.ability.length, 0);
  });
});

describe('道馆集成（扩到 141）', () => {
  function gymState(mainDesc, bossDesc, benchDesc = null) {
    const pets = [M.makePet(mainDesc)];
    if (benchDesc) pets.push(M.makePet(benchDesc));
    const st = M.createBattleState({
      mode: 'gym', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets },
        B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [M.makePet(bossDesc)] },
      },
    });
    st.gym.friendship = 0;
    st.gym.endureUsed = false;
    return st;
  }
  test('储水：玩家水枪打 131 馆主 → 免疫＋回复 18（馆主 hp 54→72）、储水事件', () => {
    const boss = { key: 'boss', name: '拉普拉斯', type: '水', no: 131, defTypes: M.playerDefTypes(131), level: 18, moves: [water40] };
    const st = gymState(
      { key: 'main', name: '杰尼龟', type: '水', no: 7, defTypes: ['水'], level: 18, moves: [water40] },
      boss,
    );
    const bossPet = st.sides.B.pets[0];
    bossPet.hp = bossPet.maxHp - 20;
    const r = M.resolveGymRound(st, { moveName: '水枪' }, R);
    assert.equal(r.error, undefined);
    const ev = r.events.find((e) => e.type === 'ability' && e.ability === '储水');
    assert.ok(ev, JSON.stringify(r.events));
    assert.match(ev.text, /回复了 18 点体力/);
    assert.equal(bossPet.hp, bossPet.maxHp - 2);
  });
  test('引火两回合：玩家喷射火焰打 136 馆主 → 免疫＋挂标记；次回合馆主火花带 flashfire 事件、标记仍在', () => {
    const st = gymState(
      { key: 'main', name: '火恐龙', type: '火', no: 5, defTypes: ['火'], level: 18, moves: [fire64, tackle] },
      { key: 'boss', name: '火伊布', type: '火', no: 136, defTypes: ['火'], level: 18, moves: [fire40] },
    );
    const bossPet = st.sides.B.pets[0];
    const bossHp = bossPet.hp;
    const r1 = M.resolveGymRound(st, { moveName: '喷射火焰' }, R);
    assert.equal(r1.error, undefined);
    assert.ok(r1.events.some((e) => e.type === 'ability' && e.ability === '引火'), JSON.stringify(r1.events));
    assert.equal(bossPet.hp, bossHp);
    assert.equal(bossPet.flashFire, true);
    const r2 = M.resolveGymRound(st, { moveName: '撞击' }, R);
    assert.equal(r2.error, undefined);
    assert.ok(r2.events.some((e) => e.type === 'ability' && e.ability === '引火' && e.side === 'B'), JSON.stringify(r2.events));
    assert.equal(bossPet.flashFire, true);
    assert.ok(bossPet.hp < bossHp, '次回合撞击应造成伤害');
  });
  test('野外六尾引火：馆主小火轮打玩家 37 → 免疫＋挂标记；次回合玩家火花飞舞带 flashfire 事件', () => {
    const st = gymState(
      { key: 'main', name: '六尾', type: '火', no: 37, defTypes: ['火'], level: 18, moves: [fire54, tackle] },
      { key: 'boss', name: '卡蒂狗', type: '火', no: 58, defTypes: ['火'], level: 18, moves: [{ name: '小火轮', power: 46, type: '火' }] },
    );
    const me = st.sides.A.pets[0];
    const r1 = M.resolveGymRound(st, { moveName: '火花飞舞' }, R);
    assert.equal(r1.error, undefined);
    assert.equal(me.flashFire, true);
    assert.ok(r1.events.some((e) => e.type === 'ability' && e.ability === '引火'), JSON.stringify(r1.events));
    const r2 = M.resolveGymRound(st, { moveName: '火花飞舞' }, R);
    assert.equal(r2.error, undefined);
    assert.ok(r2.events.some((e) => e.type === 'ability' && e.ability === '引火' && e.side === 'A'), JSON.stringify(r2.events));
  });
  test('免疫：玩家 143 撞击打毒刺馆主（尼多兰 29），rng 0.1 → 接触触发被免疫挡下，玩家不中毒', () => {
    const st = gymState(
      { key: 'main', name: '卡比兽', type: '普通', no: 143, defTypes: ['普通'], level: 18, moves: [tackle] },
      { key: 'boss', name: '尼多兰', type: '普通', no: 29, defTypes: M.playerDefTypes(29), level: 18, moves: [tackle] },
    );
    const r = M.resolveGymRound(st, { moveName: '撞击' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.equal(st.sides.A.pets[0].status, null);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '免疫'), JSON.stringify(r.events));
  });
  test('蜕皮：玩家 147 中毒，回合末 rng 0.1 → 扣 5 后治愈、蜕皮事件', () => {
    const st = gymState(
      { key: 'main', name: '迷你龙', type: '龙', no: 147, defTypes: ['龙'], level: 18, moves: [tackle] },
      bobo,
    );
    const me = st.sides.A.pets[0];
    me.status = { kind: 'poison' };
    const hpBefore = me.hp;
    // 序列 rng：前两次 0.5（馆主蓄势判定 0.5>0.25 不蓄势、命中 50<100），其后 0.1（蜕皮 30% 检定命中治愈）。
    let n = 0;
    const rng = () => (n++ < 2 ? 0.5 : 0.1);
    const r = M.resolveGymRound(st, { moveName: '撞击' }, rng);
    assert.equal(r.error, undefined);
    assert.equal(me.status, null);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '蜕皮'), JSON.stringify(r.events));
    const bossAtk = r.events.find((e) => e.type === 'attack' && e.side === 'B');
    assert.equal(me.hp, hpBefore - bossAtk.dmg - 5);
  });
  test('同步：玩家 151 撞击打孢子馆主（派拉斯 46），rng 0.1 → 玩家麻痹、馆主也被同步麻痹', () => {
    const st = gymState(
      { key: 'main', name: '梦幻', type: '普通', no: 151, defTypes: M.playerDefTypes(151), level: 18, moves: [tackle] },
      { key: 'boss', name: '派拉斯', type: '草', no: 46, defTypes: M.playerDefTypes(46), level: 18, moves: [tackle] },
    );
    const r = M.resolveGymRound(st, { moveName: '撞击' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' });
    assert.deepEqual(st.sides.B.pets[0].status, { kind: 'paralysis' });
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '同步'), JSON.stringify(r.events));
  });
  test('场外特性无操作：玩家 133 撞击打波波馆主、馆主 121 在场，一回合无 ability 事件', () => {
    const st = gymState(
      { key: 'main', name: '伊布', type: '普通', no: 133, defTypes: ['普通'], level: 18, moves: [tackle] },
      { key: 'boss', name: '宝石海星', type: '水', no: 121, defTypes: ['水'], level: 18, moves: [water40] },
    );
    const r = M.resolveGymRound(st, { moveName: '撞击' }, R);
    assert.equal(r.error, undefined);
    assert.equal(r.events.filter((e) => e.type === 'ability').length, 0, JSON.stringify(r.events));
  });
});

describe('PvP 集成（扩到 141）', () => {
  function pvpState(aDesc, bDesc) {
    const a = M.makePet(aDesc);
    const b = M.makePet(bDesc);
    const st = M.createBattleState({
      mode: 'pvp', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [a] },
        B: { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [b] },
      },
    });
    st.turn = 'A'; st.acted = { A: 1, B: 1 };
    return { st, a, b };
  }
  const pvpOpts = { critRate: M.PVP_CRIT_RATE, critMult: M.PVP_CRIT_MULT };
  test('即时结算：A 喷射火焰打 B 136 → 免疫、0 伤害、B 挂标记、引火事件', () => {
    const { st, b } = pvpState(
      { key: 'main', name: '火恐龙', type: '火', no: 5, defTypes: ['火'], level: 18, moves: [fire64] },
      { key: 'main', name: '火伊布', type: '火', no: 136, defTypes: ['火'], level: 18, moves: [fire64] },
    );
    const bossHp = b.hp;
    const r = M.applyBattleAction(st, 'A', '喷射火焰', R, pvpOpts);
    assert.equal(r.error, undefined);
    assert.equal(b.hp, bossHp);
    assert.equal(b.flashFire, true);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '引火'), JSON.stringify(r.events));
    assert.ok(r.events.some((e) => e.type === 'attack' && e.dmg === 0 && e.immune === true), JSON.stringify(r.events));
  });
  test('即时结算：A 水枪打 B 134 → 免疫＋回复（hp 56→74 满），储水事件', () => {
    const { st, b } = pvpState(
      { key: 'main', name: '杰尼龟', type: '水', no: 7, defTypes: ['水'], level: 18, moves: [water40] },
      { key: 'main', name: '水伊布', type: '水', no: 134, defTypes: ['水'], level: 18, moves: [water40] },
    );
    b.hp = b.maxHp - 18;
    const r = M.applyBattleAction(st, 'A', '水枪', R, pvpOpts);
    assert.equal(r.error, undefined);
    assert.equal(b.hp, b.maxHp);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '储水' && /回复了 18 点体力/.test(e.text)), JSON.stringify(r.events));
  });
  test('挂起结算收到引火条目时挂标记（对照：不带条目不挂）', () => {
    const { st, b } = pvpState(
      { key: 'main', name: '火恐龙', type: '火', no: 5, defTypes: ['火'], level: 18, moves: [fire64] },
      { key: 'main', name: '火伊布', type: '火', no: 136, defTypes: ['火'], level: 18, moves: [fire64] },
    );
    const staged = {
      attacker: 'A', moveName: '喷射火焰', moveType: '火', petName: '火恐龙', targetName: '火伊布',
      dmg: 0, mult: 0, critical: false, mods: [], drain: false,
      ability: [{ name: '引火', kind: 'immune', side: 'def', pet: '火伊布', moveType: '火', heal: 0, flashFire: true }],
    };
    const r = M.resolveStagedAttack(st, staged, { skipped: true }, R);
    assert.equal(r.error, undefined);
    assert.equal(b.flashFire, true);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '引火'), JSON.stringify(r.events));
    const { st: st2, b: b2 } = pvpState(
      { key: 'main', name: '火恐龙', type: '火', no: 5, defTypes: ['火'], level: 18, moves: [fire64] },
      { key: 'main', name: '火伊布', type: '火', no: 136, defTypes: ['火'], level: 18, moves: [fire64] },
    );
    const r2 = M.resolveStagedAttack(st2, { ...staged, ability: [] }, { skipped: true }, R);
    assert.equal(r2.error, undefined);
    assert.equal(b2.flashFire, false);
    assert.equal(r2.events.filter((e) => e.type === 'ability').length, 0);
  });
});

describe('合作战集成（扩到 141）', () => {
  function coopState(bossNo, bossType, bossMoves, petA, petB) {
    const sideA = { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petA)] };
    const sideB = { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petB)] };
    return M.createCoopBattleState({ node_id: 'test-n1', kind: 'normal', bossNo, bossType, bossMoves, levelOffset: 0 }, sideA, sideB, 18);
  }
  test('储水：A 水枪打 131 馆主 → 免疫＋回复 floor(maxHp/4)，储水事件', () => {
    const st = coopState(
      131, '水', [['水枪', '水', 40]],
      { key: 'main', name: '杰尼龟', type: '水', no: 7, defTypes: ['水'], level: 18, moves: [water40] },
      bobo,
    );
    const boss = st.sides.BOSS.pets[0];
    const heal = Math.floor(boss.maxHp / 4);
    boss.hp = boss.maxHp - 30;
    const hpBefore = boss.hp;
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '水枪' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '水枪', targetSeat: 'A' }, R);
    assert.equal(r.error, undefined);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '储水'), JSON.stringify(r.events));
    const bAtk = r.events.find((e) => e.type === 'attack' && e.side === 'B');
    assert.equal(boss.hp, hpBefore + heal - bAtk.dmg);
    assert.equal(st.round_no, 2);
  });
  test('蜕皮：A 147 中毒，回合末 rng 0.1 → 扣 5 后治愈、蜕皮事件', () => {
    const st = coopState(
      74, '岩石', [['撞击', '普通', 35]],
      { key: 'main', name: '迷你龙', type: '龙', no: 147, defTypes: ['龙'], level: 18, moves: [tackle] },
      bobo,
    );
    const me = st.sides.A.pets[0];
    me.status = { kind: 'poison' };
    const hpBefore = me.hp;
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.equal(me.status, null);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '蜕皮'), JSON.stringify(r.events));
    const bossAtk = r.events.find((e) => e.type === 'attack' && e.side === 'BOSS');
    assert.equal(me.hp, hpBefore - bossAtk.dmg - 5);
    assert.equal(st.round_no, 2);
  });
  test('同步：A 151 撞击打孢子馆主（派拉斯 46），rng 0.1 → A 麻痹、馆主也被同步麻痹', () => {
    const st = coopState(
      46, '草', [['撞击', '普通', 35]],
      { key: 'main', name: '梦幻', type: '普通', no: 151, defTypes: M.playerDefTypes(151), level: 18, moves: [tackle] },
      bobo,
    );
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' });
    assert.deepEqual(st.sides.BOSS.pets[0].status, { kind: 'paralysis' });
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '同步'), JSON.stringify(r.events));
    assert.equal(st.round_no, 2);
  });
});

describe('服务端与离线一致（扩到 141）', () => {
  test('calcDamage 引火免疫/加成逐数一致', () => {
    const cases = [];
    const atk5 = (flash) => { const p = pet(5, '火恐龙', [fire64]); p.flashFire = flash; return p; };
    cases.push([fire64, atk5(false), pet(136, '火伊布', [fire64])]);
    const on136 = pet(136, '火伊布', [fire64]); on136.flashFire = true;
    cases.push([fire64, on136, pet(16, '波波', [tackle])]);
    cases.push([fire64, pet(136, '火伊布', [fire64]), pet(16, '波波', [tackle])]);
    const on37 = pet(37, '六尾', [fire54]); on37.flashFire = true;
    cases.push([fire54, on37, pet(16, '波波', [tackle])]);
    for (const [move, a, d] of cases) {
      const s = M.calcDamage(move, a, d, R, OFF);
      const l = L.calcDamage(move, a, d, R, OFF);
      assert.deepEqual(l, s, `${move.name} 攻方${a.no}→守方${d.no}`);
    }
  });
  test('道馆一回合引火场景事件流相同（火恐龙喷射火焰打 136 馆主）', () => {
    const mk = (M_) => {
      const st = M_.createBattleState({
        mode: 'gym', firstSide: 'A',
        sides: {
          A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [M_.makePet({ key: 'main', name: '火恐龙', type: '火', no: 5, defTypes: ['火'], level: 18, moves: [fire64] })] },
          B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [M_.makePet({ key: 'boss', name: '火伊布', type: '火', no: 136, defTypes: ['火'], level: 18, moves: [fire40] })] },
        },
      });
      st.gym.friendship = 0;
      st.gym.endureUsed = false;
      return st;
    };
    const s1 = mk(M);
    const l1 = mk(L);
    const r1 = M.resolveGymRound(s1, { moveName: '喷射火焰' }, R);
    const r2 = L.resolveGymRound(l1, { moveName: '喷射火焰' }, R);
    assert.deepEqual(r2.events, r1.events);
    assert.equal(l1.sides.A.pets[0].hp, s1.sides.A.pets[0].hp);
    assert.equal(l1.sides.B.pets[0].hp, s1.sides.B.pets[0].hp);
    assert.equal(l1.sides.B.pets[0].flashFire, s1.sides.B.pets[0].flashFire);
  });
});
