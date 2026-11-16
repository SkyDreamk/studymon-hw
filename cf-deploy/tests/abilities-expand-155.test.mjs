/* 战斗特性扩到 155（2026-11-07）：node --test tests/abilities-expand-155.test.mjs
 * 第三步＋14 种主宠线与馆主 1–9、25/26、45、95、125；唯一新接线是 95 坚硬脑袋（零实效守卫标记，
 * 按特性名注册，无战斗效果）。1–9 的茂盛/猛火/激流一期已实现、25/26/125 的静电二期已实现、
 * 45 的叶绿素天气已实现，本文件写测试验证四路触发。
 * 口径：D1 首特性、D4 接触判定、D6 速度不进 PvP、D7/D8 天气关卡设定两态整场。
 * 确定性：固定 rng；精确伤害数均由 /tmp/probe-155*.mjs 实测（makePet 带 stats，走官方分支）。
 * 野外路：野外对战经 calcDamage 结算，calcDamage 级逐种验证即野外路（沿用 141 口径）。
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
const vine = { name: '藤鞭', type: '草', power: 40 };
const ember = { name: '火花', type: '火', power: 40 };
const water = { name: '水枪', type: '水', power: 40 };
const elec = { name: '十万伏特', type: '电', power: 40 };
const tackle = { name: '撞击', type: '普通', power: 35 };
const contact = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' };
const bobo = { key: 'boss', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] };

// 已实装特性集合（一期 9＋二期 2a 5＋二期 2b 13＋引火 1＋本批叶绿素 1＋坚硬脑袋 1＝30 个）。
const IMPLEMENTED = new Set([
  '茂盛', '猛火', '激流', '虫之预感', '厚脂肪', '飘浮', '硬壳盔甲', '储水', '蓄电',
  '威吓', '避雷针', '电气引擎', '怪力钳', '恒净之躯',
  '静电', '毒刺', '同步', '蜕皮', '柔软', '毅力', '孢子', '干劲', '不眠', '免疫', '火焰之躯', '自然回复', '早起',
  '引火', '叶绿素', '坚硬脑袋',
]);
const B141 = [121, 131, 133, 134, 135, 136, 143, 147, 151];
const B155 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 25, 26, 45, 95, 125];
const POOL_155 = (() => {
  const wild = M.WILD.map((w) => w.no);
  return [...new Set([...wild, ...B141, ...B155])];
})();

describe('范围守卫（扩到 155）', () => {
  test('14 种首特性逐种核对（1–3 茂盛、4–6 猛火、7–9 激流、25/26/125 静电、45 叶绿素、95 坚硬脑袋）', () => {
    const want = {
      1: '茂盛', 2: '茂盛', 3: '茂盛', 4: '猛火', 5: '猛火', 6: '猛火',
      7: '激流', 8: '激流', 9: '激流', 25: '静电', 26: '静电', 45: '叶绿素', 95: '坚硬脑袋', 125: '静电',
    };
    for (const [no, name] of Object.entries(want)) assert.equal(M.abilityOf(Number(no)), name, `${no} 号首特性`);
    for (const [no, name] of Object.entries(want)) assert.equal(L.abilityOf(Number(no)), name, `离线 ${no} 号首特性`);
  });
  test('覆盖数核算：池子 155（无重叠）；池内已覆盖 99；14 种全覆盖；顺带坚硬脑袋 7 种均在池内', () => {
    assert.equal(POOL_155.length, 155);
    // 45/125/25/26/1–9 均不在野外池内，union 无重叠：141＋14＝155。
    const wild = new Set(M.WILD.map((w) => w.no));
    assert.deepEqual(B155.filter((no) => wild.has(no)), []);
    const covered = POOL_155.filter((no) => IMPLEMENTED.has(M.abilityOf(no)));
    assert.equal(covered.length, 99);
    assert.deepEqual(B155.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).sort((a, b) => a - b), B155);
    assert.deepEqual(B155.filter((no) => !IMPLEMENTED.has(M.abilityOf(no))), []);
    // 坚硬脑袋顺带 7 种：74/75/76/104/105/142/208，均已在野外池内（95 为本批新种）。
    const rockSide = [74, 75, 76, 104, 105, 142, 208];
    for (const no of rockSide) {
      assert.equal(M.abilityOf(no), '坚硬脑袋', `${no} 首特性`);
      assert.ok(wild.has(no), `${no} 在野外池内`);
      assert.ok(covered.includes(no), `${no} 已覆盖`);
    }
    // 全宇宙（DEX_DETAILS 161 种）首特性已覆盖 102 种；141 时 30 特性口径下池内为 85 种（99－14）。
    const allNos = Object.keys(M.DEX_DETAILS).map(Number);
    assert.equal(allNos.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).length, 102);
    const pool141 = [...new Set([...M.WILD.map((w) => w.no), ...B141])];
    assert.equal(pool141.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).length, 85);
  });
  test('叶绿素 9 种、静电 7 种全清单（与天气批/二期批一致）', () => {
    const chloro = Object.entries(M.DEX_DETAILS)
      .filter(([, d]) => d.abilities && d.abilities[0] && d.abilities[0].name === '叶绿素')
      .map(([no]) => Number(no)).sort((a, b) => a - b);
    assert.deepEqual(chloro, [43, 44, 45, 69, 70, 71, 102, 103, 114]);
    const stat = Object.entries(M.DEX_DETAILS)
      .filter(([, d]) => d.abilities && d.abilities[0] && d.abilities[0].name === '静电')
      .map(([no]) => Number(no)).sort((a, b) => a - b);
    assert.deepEqual(stat, [25, 26, 125, 172, 179, 180, 181]);
  });
  test('零实效注册：ABILITY_NO_EFFECT 两端一致，含坚硬脑袋与压迫感（159 批加入压迫感）', () => {
    assert.deepEqual([...M.ABILITY_NO_EFFECT], ['坚硬脑袋', '压迫感']);
    assert.deepEqual([...L.ABILITY_NO_EFFECT], ['坚硬脑袋', '压迫感']);
    // 8 种首特性坚硬脑袋的种均被该注册覆盖（按特性名，不按种号）。
    for (const no of [74, 75, 76, 95, 104, 105, 142, 208]) {
      assert.ok(M.ABILITY_NO_EFFECT.has(M.abilityOf(no)), `${no} 在零实效注册内`);
    }
  });
  test('第二特性不生效：111/112 的坚硬脑袋是第二特性，首特性避雷针；电招打 111 出避雷针条目', () => {
    assert.equal(M.abilityOf(111), '避雷针');
    assert.equal(M.abilityOf(112), '避雷针');
    const r = M.calcDamage(elec, pet(25, '皮卡丘', [elec]), pet(111, '独角犀牛', [tackle]), R, OFF);
    assert.equal(r.dmg, 0);
    assert.equal(r.ability.length, 1);
    assert.equal(r.ability[0].name, '避雷针');
    assert.deepEqual(r.ability[0].stage, { key: 'spa', delta: 1 });
  });
});

describe('低血量同系强化（1–9，calcDamage 级）', () => {
  // 探针实测（Lv18、40 威力同系招打波波）：满血/低血（floor(maxHp/3)）/刚过 1/3/低血量非同系招。
  const cases = [
    [1, '妙蛙种子', vine, 44, 9, 13, 9, 8],
    [2, '妙蛙草', vine, 49, 10, 15, 10, 9],
    [3, '妙蛙花', vine, 56, 13, 20, 13, 12],
    [4, '小火龙', ember, 42, 18, 25, 18, 8],
    [5, '火恐龙', ember, 48, 21, 31, 21, 10],
    [6, '喷火龙', ember, 56, 28, 40, 28, 12],
    [7, '杰尼龟', water, 43, 15, 22, 15, 8],
    [8, '卡咪龟', water, 49, 18, 27, 18, 9],
    [9, '水箭龟', water, 56, 22, 33, 22, 12],
  ];
  for (const [no, name, move, maxHp, full, low, over, tackleLow] of cases) {
    test(`${no} ${name}：满血 ${full}、低血量 ${low}、刚过 1/3 为 ${over}、低血量撞击 ${tackleLow}`, () => {
      const atkFull = pet(no, name, [move]);
      assert.equal(atkFull.maxHp, maxHp);
      assert.equal(M.calcDamage(move, atkFull, pet(16, '波波', [tackle]), R, OFF).dmg, full);
      assert.equal(M.calcDamage(move, atkFull, pet(16, '波波', [tackle]), R, OFF).ability.length, 0);
      const atkLow = pet(no, name, [move], Math.floor(maxHp / 3));
      const rLow = M.calcDamage(move, atkLow, pet(16, '波波', [tackle]), R, OFF);
      assert.equal(rLow.dmg, low);
      assert.equal(rLow.ability.length, 1);
      assert.equal(rLow.ability[0].kind, 'lowhp');
      assert.equal(rLow.ability[0].name, M.abilityOf(no));
      const atkOver = pet(no, name, [move], Math.floor(maxHp / 3) + 1);
      const rOver = M.calcDamage(move, atkOver, pet(16, '波波', [tackle]), R, OFF);
      assert.equal(rOver.dmg, over);
      assert.equal(rOver.ability.length, 0);
      const rTackle = M.calcDamage(tackle, pet(no, name, [tackle], Math.floor(maxHp / 3)), pet(16, '波波', [tackle]), R, OFF);
      assert.equal(rTackle.dmg, tackleLow);
      assert.equal(rTackle.ability.length, 0);
    });
  }
  test('边界：1 号 maxHp 44，hp 14（恰为 floor(44/3)）触发、hp 15 不触发', () => {
    const at14 = pet(1, '妙蛙种子', [vine], 14);
    assert.equal(M.calcDamage(vine, at14, pet(16, '波波', [tackle]), R, OFF).ability.length, 1);
    const at15 = pet(1, '妙蛙种子', [vine], 15);
    assert.equal(M.calcDamage(vine, at15, pet(16, '波波', [tackle]), R, OFF).ability.length, 0);
  });
});

describe('静电（25/26/125，接触级）', () => {
  test('applyContactTrigger 逐种：rng 0.1 触发麻痹（特性＋状态两事件）、0.5 不触发', () => {
    for (const [no, name] of [[25, '皮卡丘'], [26, '雷丘'], [125, '电击兽']]) {
      const a = pet(16, '波波', [tackle]);
      const d = pet(no, name, [tackle]);
      const evs = [];
      M.applyContactTrigger(a, d, contact, () => 0.1, evs, 'A', 'B');
      assert.deepEqual(a.status, { kind: 'paralysis' }, `${no} 0.1 应麻痹`);
      assert.ok(evs.some((e) => e.type === 'ability' && e.ability === '静电'), `${no} 应有静电事件`);
      assert.ok(evs.some((e) => e.type === 'status' && e.kind === 'paralysis'), `${no} 应有状态事件`);
      const a2 = pet(16, '波波', [tackle]);
      const evs2 = [];
      M.applyContactTrigger(a2, d, contact, () => 0.5, evs2, 'A', 'B');
      assert.equal(a2.status, null, `${no} 0.5 不应麻痹`);
      assert.equal(evs2.length, 0, `${no} 0.5 不应有事件`);
    }
  });
  test('非接触（地震）/特殊招（十万伏特）不触发静电', () => {
    const d = pet(25, '皮卡丘', [tackle]);
    const c = pet(16, '波波', [tackle]);
    M.applyContactTrigger(c, d, { name: '地震', type: '地面', power: 100, damage_class: 'physical' }, () => 0.1, [], 'A', 'B');
    assert.equal(c.status, null);
    const s = pet(16, '波波', [tackle]);
    M.applyContactTrigger(s, d, { name: '十万伏特', type: '电', power: 40, damage_class: 'special' }, () => 0.1, [], 'A', 'B');
    assert.equal(s.status, null);
  });
});

describe('叶绿素 45（S4 晴天）', () => {
  test('effectiveSpeed：45 基础 23、晴天 46、雨天 23、无天气 23；两端一致', () => {
    for (const mod of [M, L]) {
      const p = mod.makePet({ key: 'p', name: '测', type: (mod.SPECIES[45] || {}).type || '草', no: 45, defTypes: mod.playerDefTypes(45), level: 18, moves: [tackle] });
      assert.equal(mod.effectiveSpeed(p), 23);
      assert.equal(mod.effectiveSpeed(p, 'sun'), 46);
      assert.equal(mod.effectiveSpeed(p, 'rain'), 23);
      assert.equal(mod.effectiveSpeed(p, null), 23);
    }
  });
  test('calcDamage 级：叶绿素不碰伤害，45 攻/守均无 ability 条目', () => {
    const rAtk = M.calcDamage(vine, pet(45, '臭臭花', [vine]), pet(16, '波波', [tackle]), R, OFF);
    assert.equal(rAtk.ability.length, 0);
    const rDef = M.calcDamage(water, pet(7, '杰尼龟', [water]), pet(45, '臭臭花', [vine]), R, OFF);
    assert.equal(rDef.ability.length, 0);
  });
});

describe('坚硬脑袋 95（零实效）', () => {
  test('calcDamage 对照：95 与 121（场外特性对照种）同 stats 时四招双向逐数相等', () => {
    const stats = { hp: 50, attack: 40, defense: 40, sp_attack: 40, sp_defense: 40, speed: 40 };
    const mk = (no) => ({ key: 'x', name: `测${no}`, type: '岩石', no, level: 18, maxHp: 100, hp: 100, defTypes: ['岩石', '地面'], stats, moves: [tackle], stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: null, flashFire: false });
    const want = { '撞击': 4, '火花': 4, '水枪': 33, '地震': 25 };
    for (const move of [tackle, ember, water, { name: '地震', type: '地面', power: 40 }]) {
      const r95a = M.calcDamage(move, mk(95), mk(16), R, OFF);
      const r121a = M.calcDamage(move, mk(121), mk(16), R, OFF);
      assert.deepEqual(r95a, r121a, `攻方 ${move.name}`);
      assert.equal(r95a.dmg, want[move.name], `攻方 ${move.name} dmg`);
      assert.equal(r95a.ability.length, 0);
      const r95d = M.calcDamage(move, mk(16), mk(95), R, OFF);
      const r121d = M.calcDamage(move, mk(16), mk(121), R, OFF);
      assert.deepEqual(r95d, r121d, `守方 ${move.name}`);
      assert.equal(r95d.dmg, want[move.name], `守方 ${move.name} dmg`);
      assert.equal(r95d.ability.length, 0);
    }
  });
  test('速度：95 晴天速度＝基础速度 30，无天气加成', () => {
    const p = pet(95, '大岩蛇', [tackle]);
    assert.equal(M.effectiveSpeed(p), 30);
    assert.equal(M.effectiveSpeed(p, 'sun'), 30);
    assert.equal(M.effectiveSpeed(p, 'rain'), 30);
  });
  test('tryInflictStatus：95 中毒不被特性挡下，正常上状态', () => {
    const p95 = pet(95, '大岩蛇', [tackle]);
    const r = M.tryInflictStatus(p95, 'poison', R, 'A');
    assert.equal(r.blocked, undefined);
    assert.deepEqual(p95.status, { kind: 'poison' });
  });
});

describe('道馆集成（扩到 155）', () => {
  function gymState(mainDesc, bossDesc, weather = null) {
    const st = M.createBattleState({
      mode: 'gym', firstSide: 'A', weather,
      sides: {
        A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [M.makePet(mainDesc)] },
        B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [M.makePet(bossDesc)] },
      },
    });
    st.gym.friendship = 0;
    st.gym.endureUsed = false;
    return st;
  }
  test('茂盛：低血量 3 妙蛙花藤鞭打波波馆主 → boss 42→22、茂盛事件在攻击事件之前', () => {
    const st = gymState(
      { key: 'main', name: '妙蛙花', type: '草', no: 3, defTypes: M.playerDefTypes(3), level: 18, moves: [vine] },
      bobo,
    );
    st.sides.A.pets[0].hp = 18;
    const r = M.resolveGymRound(st, { moveName: '藤鞭' }, R);
    assert.equal(r.error, undefined);
    assert.equal(st.sides.B.pets[0].hp, 22);
    const ev = r.events.find((e) => e.type === 'ability' && e.ability === '茂盛');
    assert.ok(ev, JSON.stringify(r.events));
    const atkEv = r.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(r.events.indexOf(ev) < r.events.indexOf(atkEv));
  });
  test('静电：玩家撞击打 26 雷丘馆主，rng 0.1 → 玩家麻痹、静电事件在攻击事件之后', () => {
    const st = gymState(
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] },
      { key: 'boss', name: '雷丘', type: '电', no: 26, defTypes: ['电'], level: 18, moves: [{ name: '电光一闪', type: '电', power: 40 }] },
    );
    const r = M.resolveGymRound(st, { moveName: '撞击' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' });
    const ev = r.events.find((e) => e.type === 'ability' && e.ability === '静电');
    assert.ok(ev, JSON.stringify(r.events));
    const atkEv = r.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(r.events.indexOf(ev) > r.events.indexOf(atkEv));
  });
  test('S4 叶绿素顺序翻转：晴天馆主 45（46）先于小火龙（28）出手；无天气时玩家先手', () => {
    const petal = { name: '花瓣狂舞', type: '草', power: 56 };
    const mk = (weather) => gymState(
      { key: 'main', name: '小火龙', type: '火', no: 4, defTypes: ['火'], level: 18, moves: [ember] },
      { key: 'boss', name: '臭臭花', type: '草', no: 45, defTypes: M.playerDefTypes(45), level: 18, moves: [petal] },
      weather,
    );
    const stSun = mk('sun');
    const rSun = M.resolveGymRound(stSun, { moveName: '火花' }, R);
    assert.equal(rSun.error, undefined);
    assert.equal(rSun.events.find((e) => e.type === 'attack').side, 'B');
    assert.equal(rSun.events.find((e) => e.type === 'attack').move, '花瓣狂舞');
    const stNull = mk(null);
    const rNull = M.resolveGymRound(stNull, { moveName: '火花' }, R);
    assert.equal(rNull.error, undefined);
    assert.equal(rNull.events.find((e) => e.type === 'attack').side, 'A');
    assert.equal(rNull.events.find((e) => e.type === 'attack').move, '火花');
  });
  test('S4 晴天火/水修正：小火龙火花日志含提升文案；水箭龟水枪存活（56→23）且日志含减弱文案', () => {
    const petal = { name: '花瓣狂舞', type: '草', power: 56 };
    const stF = gymState(
      { key: 'main', name: '小火龙', type: '火', no: 4, defTypes: ['火'], level: 18, moves: [ember] },
      { key: 'boss', name: '臭臭花', type: '草', no: 45, defTypes: M.playerDefTypes(45), level: 18, moves: [petal] },
      'sun',
    );
    const rF = M.resolveGymRound(stF, { moveName: '火花' }, R);
    assert.equal(rF.error, undefined);
    assert.ok(stF.log.some((e) => e.text === '大晴天！小火龙 的火属性招式威力提升了！'));
    const stW = gymState(
      { key: 'main', name: '水箭龟', type: '水', no: 9, defTypes: M.playerDefTypes(9), level: 18, moves: [water] },
      { key: 'boss', name: '臭臭花', type: '草', no: 45, defTypes: M.playerDefTypes(45), level: 18, moves: [petal] },
      'sun',
    );
    const rW = M.resolveGymRound(stW, { moveName: '水枪' }, R);
    assert.equal(rW.error, undefined);
    assert.equal(stW.sides.A.pets[0].hp, 23);
    assert.ok(stW.log.some((e) => e.text === '大晴天！水箭龟 的水属性招式威力减弱了！'));
  });
  test('坚硬脑袋无操作：95 主宠一回合、95 馆主一回合，均无 ability 事件', () => {
    const stA = gymState(
      { key: 'main', name: '大岩蛇', type: '岩石', no: 95, defTypes: M.playerDefTypes(95), level: 18, moves: [tackle] },
      bobo,
    );
    const rA = M.resolveGymRound(stA, { moveName: '撞击' }, R);
    assert.equal(rA.error, undefined);
    assert.equal(rA.events.filter((e) => e.type === 'ability').length, 0, JSON.stringify(rA.events));
    const stB = gymState(
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] },
      { key: 'boss', name: '大岩蛇', type: '岩石', no: 95, defTypes: M.playerDefTypes(95), level: 18, moves: [tackle] },
    );
    const rB = M.resolveGymRound(stB, { moveName: '撞击' }, R);
    assert.equal(rB.error, undefined);
    assert.equal(rB.events.filter((e) => e.type === 'ability').length, 0, JSON.stringify(rB.events));
  });
});

describe('PvP 集成（扩到 155）', () => {
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
  test('猛火：A 低血量 6 喷火龙火花打 B 波波 → B 42→13（默认表 29 点）、猛火事件', () => {
    const { st, b } = pvpState(
      { key: 'main', name: '喷火龙', type: '火', no: 6, defTypes: M.playerDefTypes(6), level: 18, moves: [ember] },
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] },
    );
    st.sides.A.pets[0].hp = 18;
    const r = M.applyBattleAction(st, 'A', '火花', R, pvpOpts);
    assert.equal(r.error, undefined);
    assert.equal(b.hp, 13);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '猛火'), JSON.stringify(r.events));
  });
  test('静电：A 撞击打 B 125 电击兽，rng 0.1 → A 麻痹、静电事件', () => {
    const { st, a } = pvpState(
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] },
      { key: 'main', name: '电击兽', type: '电', no: 125, defTypes: ['电'], level: 18, moves: [{ name: '电击', type: '电', power: 40 }] },
    );
    const r = M.applyBattleAction(st, 'A', '撞击', () => 0.1, pvpOpts);
    assert.equal(r.error, undefined);
    assert.deepEqual(a.status, { kind: 'paralysis' });
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '静电'), JSON.stringify(r.events));
  });
  test('叶绿素不进 PvP：对局 weather 为 null，45 藤鞭一回合无 ability 事件', () => {
    const { st } = pvpState(
      { key: 'main', name: '臭臭花', type: '草', no: 45, defTypes: M.playerDefTypes(45), level: 18, moves: [vine] },
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] },
    );
    assert.deepEqual(st.weather, { kind: null });
    const r = M.applyBattleAction(st, 'A', '藤鞭', R, pvpOpts);
    assert.equal(r.error, undefined);
    assert.equal(r.events.filter((e) => e.type === 'ability').length, 0, JSON.stringify(r.events));
  });
  test('坚硬脑袋无操作：A 95 撞击打 B 波波，一回合无 ability 事件', () => {
    const { st } = pvpState(
      { key: 'main', name: '大岩蛇', type: '岩石', no: 95, defTypes: M.playerDefTypes(95), level: 18, moves: [tackle] },
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] },
    );
    const r = M.applyBattleAction(st, 'A', '撞击', R, pvpOpts);
    assert.equal(r.error, undefined);
    assert.equal(r.events.filter((e) => e.type === 'ability').length, 0, JSON.stringify(r.events));
  });
});

describe('合作战集成（扩到 155）', () => {
  function coopState(bossNo, bossType, bossMoves, petA, petB) {
    const sideA = { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petA)] };
    const sideB = { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petB)] };
    return M.createCoopBattleState({ node_id: 'test-n1', kind: 'normal', bossNo, bossType, bossMoves, levelOffset: 0 }, sideA, sideB, 18);
  }
  test('激流：A 低血量 9 水箭龟水枪打 143 馆主 → boss 85→63、激流事件', () => {
    const st = coopState(
      143, '普通', [['撞击', '普通', 35]],
      { key: 'main', name: '水箭龟', type: '水', no: 9, defTypes: M.playerDefTypes(9), level: 18, moves: [water] },
      bobo,
    );
    st.sides.A.pets[0].hp = 18;
    const boss = st.sides.BOSS.pets[0];
    assert.equal(boss.maxHp, 85);
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '水枪' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, R);
    assert.equal(r.error, undefined);
    assert.equal(boss.hp, 63);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '激流'), JSON.stringify(r.events));
    assert.equal(st.round_no, 2);
  });
  test('静电：A 喷火龙撞击打 125 馆主，rng 0.1 → A 麻痹、静电事件', () => {
    const st = coopState(
      125, '电', [['电击', '电', 40]],
      { key: 'main', name: '喷火龙', type: '火', no: 6, defTypes: M.playerDefTypes(6), level: 18, moves: [tackle] },
      bobo,
    );
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '电击', targetSeat: 'A' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' });
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '静电'), JSON.stringify(r.events));
    assert.equal(st.round_no, 2);
  });
  test('叶绿素玩家席无操作：A 45 臭臭花撞击打 74 馆主，一回合无 ability 事件', () => {
    const st = coopState(
      74, '岩石', [['撞击', '普通', 35]],
      { key: 'main', name: '臭臭花', type: '草', no: 45, defTypes: M.playerDefTypes(45), level: 18, moves: [tackle] },
      bobo,
    );
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, R);
    assert.equal(r.error, undefined);
    assert.equal(r.events.filter((e) => e.type === 'ability').length, 0, JSON.stringify(r.events));
    assert.equal(st.round_no, 2);
  });
  test('坚硬脑袋馆主无操作：A/B 撞击打 95 馆主，一回合无 ability 事件', () => {
    const st = coopState(
      95, '岩石', [['撞击', '普通', 35]],
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] },
      bobo,
    );
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, R);
    assert.equal(r.error, undefined);
    assert.equal(r.events.filter((e) => e.type === 'ability').length, 0, JSON.stringify(r.events));
    assert.equal(st.round_no, 2);
  });
});

describe('服务端与离线一致（扩到 155）', () => {
  test('calcDamage 低血量 9 种逐数一致', () => {
    const cases = [
      [1, vine], [2, vine], [3, vine], [4, ember], [5, ember], [6, ember], [7, water], [8, water], [9, water],
    ];
    // 离线端 SPECIES 表不含 1–9 主宠线，名字/属性用本表硬编码（已对 DEX_DETAILS 核对）。
    const names = { 1: ['妙蛙种子', '草'], 2: ['妙蛙草', '草'], 3: ['妙蛙花', '草'], 4: ['小火龙', '火'], 5: ['火恐龙', '火'], 6: ['喷火龙', '火'], 7: ['杰尼龟', '水'], 8: ['卡咪龟', '水'], 9: ['水箭龟', '水'] };
    for (const [no, move] of cases) {
      const mk = (mod) => {
        const [name, type] = names[no];
        const p = mod.makePet({ key: `p${no}`, name, type, no, defTypes: mod.playerDefTypes(no), level: 18, moves: [move] });
        p.hp = Math.floor(p.maxHp / 3);
        return p;
      };
      const mkB = (mod) => mod.makePet({ key: 'b', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] });
      const s = M.calcDamage(move, mk(M), mkB(M), R, OFF);
      const l = L.calcDamage(move, mk(L), mkB(L), R, OFF);
      assert.deepEqual(l, s, `${no} 低血量`);
    }
  });
  test('calcDamage 95 对照逐数一致（95 与 121 同 stats 四招双向）', () => {
    const stats = { hp: 50, attack: 40, defense: 40, sp_attack: 40, sp_defense: 40, speed: 40 };
    const mk = (no) => ({ key: 'x', name: `测${no}`, type: '岩石', no, level: 18, maxHp: 100, hp: 100, defTypes: ['岩石', '地面'], stats, moves: [tackle], stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: null, flashFire: false });
    for (const move of [tackle, ember, water, { name: '地震', type: '地面', power: 40 }]) {
      assert.deepEqual(L.calcDamage(move, mk(95), mk(16), R, OFF), M.calcDamage(move, mk(95), mk(16), R, OFF), `攻方 ${move.name}`);
      assert.deepEqual(L.calcDamage(move, mk(16), mk(95), R, OFF), M.calcDamage(move, mk(16), mk(95), R, OFF), `守方 ${move.name}`);
    }
  });
  test('S4 顺序翻转事件流一致（晴天馆主先手、无天气玩家先手）', () => {
    const petal = { name: '花瓣狂舞', type: '草', power: 56 };
    const mk = (mod, weather) => {
      const st = mod.createBattleState({
        mode: 'gym', firstSide: 'A', weather,
        sides: {
          A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [mod.makePet({ key: 'main', name: '小火龙', type: '火', no: 4, defTypes: ['火'], level: 18, moves: [ember] })] },
          B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [mod.makePet({ key: 'boss', name: '臭臭花', type: '草', no: 45, defTypes: mod.playerDefTypes(45), level: 18, moves: [petal] })] },
        },
      });
      st.gym.friendship = 0;
      st.gym.endureUsed = false;
      return st;
    };
    for (const weather of ['sun', null]) {
      const s1 = mk(M, weather);
      const l1 = mk(L, weather);
      const r1 = M.resolveGymRound(s1, { moveName: '火花' }, R);
      const r2 = L.resolveGymRound(l1, { moveName: '火花' }, R);
      assert.deepEqual(r2.events, r1.events, `weather=${weather}`);
      assert.equal(l1.sides.A.pets[0].hp, s1.sides.A.pets[0].hp);
      assert.equal(l1.sides.B.pets[0].hp, s1.sides.B.pets[0].hp);
    }
  });
});
