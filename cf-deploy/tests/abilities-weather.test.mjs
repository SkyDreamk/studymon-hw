/* 战斗特性第三期第一步——天气简化版（2026-11-07）：node --test tests/abilities-weather.test.mjs
 * 范围：只做晴/雨两态，触发走每日随机天气（gymDailyWeather，2026-11-17 起取代关卡写死配置），整场持续不计回合。
 * 效果：①晴天火×1.5/水×0.5、雨天水×1.5/火×0.5（calcDamage 基础伤害修正段，2026-11-17 按 App.md 管线从威力段移到基础伤害后、单独取整）；②叶绿素晴天速度×2、悠游自如雨天速度×2（只影响道馆出招顺序）；③UI 角标＋开局天气文案。
 * 不做：沙暴/冰雹、天气招式、特性触发、太阳之力/雨盘结算；沙隐 4 种继续 dormant。
 * 口径：D6 速度不进 PvP；D7 关卡设定；D8 简化版两态整场持续。
 * 确定性：固定 rng；精确伤害数均由 /tmp/probe-weather.mjs 实测（makePet 带 stats，走官方分支，服务端与离线端逐数一致）。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const M = await import(new URL('../src/index.js', import.meta.url));
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);

const R = () => 0.5;
const OFF = { chart: 'official', critRate: 0 };
const atk = (no, hp, maxHp, type, defTypes, stats, move) => ({ key: 'a', name: `攻方${no}`, type, no, level: 18, maxHp, hp, defTypes, stats, moves: [move] });
const def = (no, defTypes, hp = 100, stats) => ({ key: 'b', name: `守方${no}`, type: '普通', no, level: 18, maxHp: 100, hp, defTypes, stats, moves: [{ name: '撞击', type: '普通', power: 35 }] });
const pikaStats = { hp: 40, attack: 24, defense: 19, sp_attack: 23, sp_defense: 23, speed: 37 };
const popoStats = { hp: 42, attack: 21, defense: 19, sp_attack: 17, sp_defense: 17, speed: 25 };
const fire = { name: '火花', type: '火', power: 40 };
const water = { name: '水枪', type: '水', power: 40 };
const grass = { name: '藤鞭', type: '草', power: 40 };
const psy = { name: '念力', type: '超能力', power: 50 };
const rockStats = { hp: 100, attack: 20, defense: 50, sp_attack: 20, sp_defense: 50, speed: 30 };
const mkPet = (mod, no, name, type, move) => mod.makePet({ key: no === 45 ? 'boss' : 'main', name, type, no, defTypes: mod.playerDefTypes(no), level: 18, moves: [move] });
const gymState = (mod, weather, aNo, aName, aType, aMove, bNo, bName, bType, bMove) => mod.createBattleState({
  mode: 'gym', firstSide: 'A', weather,
  sides: {
    A: { childId: 1, childName: '玩家', battleLevel: 30, activeIdx: 0, pets: [mkPet(mod, aNo, aName, aType, aMove)] },
    B: { childId: null, childName: '馆主', battleLevel: 30, activeIdx: 0, pets: [mkPet(mod, bNo, bName, bType, bMove)] },
  },
});

describe('范围守卫', () => {
  test('叶绿素 9 种（43/44/45/69/70/71/102/103/114），野外 8 种，45 为 S4 馆主', () => {
    const got = {};
    for (const [no, d] of Object.entries(M.DEX_DETAILS)) {
      const a = d.abilities && d.abilities[0] ? d.abilities[0].name : null;
      if (a === '叶绿素') got[no] = a;
    }
    assert.deepEqual(got, { 43: '叶绿素', 44: '叶绿素', 45: '叶绿素', 69: '叶绿素', 70: '叶绿素', 71: '叶绿素', 102: '叶绿素', 103: '叶绿素', 114: '叶绿素' });
  });
  test('悠游自如 8 种（116/118/119/129/138/139/140/141），全野外', () => {
    const got = {};
    for (const [no, d] of Object.entries(M.DEX_DETAILS)) {
      const a = d.abilities && d.abilities[0] ? d.abilities[0].name : null;
      if (a === '悠游自如') got[no] = a;
    }
    assert.deepEqual(got, { 116: '悠游自如', 118: '悠游自如', 119: '悠游自如', 129: '悠游自如', 138: '悠游自如', 139: '悠游自如', 140: '悠游自如', 141: '悠游自如' });
  });
  test('沙隐 4 种（27/28/50/51）继续 dormant：晴/雨/沙暴速度均不变', () => {
    const got = {};
    for (const [no, d] of Object.entries(M.DEX_DETAILS)) {
      const a = d.abilities && d.abilities[0] ? d.abilities[0].name : null;
      if (a === '沙隐') got[no] = a;
    }
    assert.deepEqual(got, { 27: '沙隐', 28: '沙隐', 50: '沙隐', 51: '沙隐' });
    for (const no of [27, 28, 50, 51]) {
      const p = M.makePet({ key: 'p', name: '测', type: (M.SPECIES[no] || {}).type || '普通', no, defTypes: M.playerDefTypes(no), level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] });
      assert.equal(M.effectiveSpeed(p, 'sun'), M.effectiveSpeed(p));
      assert.equal(M.effectiveSpeed(p, 'rain'), M.effectiveSpeed(p));
      assert.equal(M.effectiveSpeed(p, 'sand'), M.effectiveSpeed(p));
    }
  });
  test('GYM_STAGES 不再写死天气（2026-11-17 每日随机）：weather 字段已删，天气由 gymDailyWeather 现掷', () => {
    assert.ok(M.GYM_STAGES.every((g) => !('weather' in g)), '服务端 GYM_STAGES 不应再有 weather 字段');
    assert.ok(L.GYM_STAGES.every((g) => !('weather' in g)), '离线 GYM_STAGES 不应再有 weather 字段');
    assert.equal(M.GYM_STAGES[0].bossNo, 95);
    assert.equal(M.GYM_STAGES[3].bossNo, 45);
    // 每日天气函数在，两边同一天同一关结果一致
    assert.equal(M.gymDailyWeather(1, '2026-11-17'), L.gymDailyWeather(1, '2026-11-17'));
  });
});

describe('calcDamage 天气火/水修正（基础伤害段，App.md 管线，探针实测数）', () => {
  const cases = [
    ['火-无天气', OFF, fire, 30, []],
    ['火-晴天', { ...OFF, weather: 'sun' }, fire, 42, [{ name: '大晴天', kind: 'weather', side: 'atk', pet: '攻方6', moveType: '火' }]],
    ['水-晴天', { ...OFF, weather: 'sun' }, water, 2, [{ name: '大晴天', kind: 'weather', side: 'atk', pet: '攻方6', moveType: '水' }]],
    ['水-雨天', { ...OFF, weather: 'rain' }, water, 7, [{ name: '下雨', kind: 'weather', side: 'atk', pet: '攻方6', moveType: '水' }]],
    ['火-雨天', { ...OFF, weather: 'rain' }, fire, 12, [{ name: '下雨', kind: 'weather', side: 'atk', pet: '攻方6', moveType: '火' }]],
    ['草-晴天（不受天气影响）', { ...OFF, weather: 'sun' }, grass, 2, []],
    ['草-雨天（不受天气影响）', { ...OFF, weather: 'rain' }, grass, 2, []],
  ];
  for (const [label, opts, move, dmg, ability] of cases) {
    test(`${label}：dmg ${dmg}，服务端与离线端一致`, () => {
      const a = atk(6, 100, 100, '火', ['火'], pikaStats, move);
      const d = def(43, ['草', '毒'], 100, popoStats);
      const rS = M.calcDamage(move, a, d, R, opts);
      const rL = L.calcDamage(move, a, d, R, opts);
      assert.equal(rS.dmg, dmg);
      assert.equal(rL.dmg, dmg);
      assert.deepEqual(rS.ability, ability);
      assert.deepEqual(rL.ability, ability);
    });
  }
  test('abilityEventText 天气文案：提升/减弱分两支', () => {
    assert.equal(M.abilityEventText({ kind: 'weather', name: '大晴天', pet: '小火龙', moveType: '火' }), '大晴天！小火龙 的火属性招式威力提升了！');
    assert.equal(M.abilityEventText({ kind: 'weather', name: '大晴天', pet: '杰尼龟', moveType: '水' }), '大晴天！杰尼龟 的水属性招式威力减弱了！');
    assert.equal(M.abilityEventText({ kind: 'weather', name: '下雨', pet: '杰尼龟', moveType: '水' }), '下雨！杰尼龟 的水属性招式威力提升了！');
    assert.equal(M.abilityEventText({ kind: 'weather', name: '下雨', pet: '小火龙', moveType: '火' }), '下雨！小火龙 的火属性招式威力减弱了！');
  });
  test('沙暴特防：念力打 95 大岩蛇，sand 伤害低于无天气；沙暴事件与文案', () => {
    for (const mod of [M, L]) {
      const a = atk(6, 100, 100, '超能力', ['超能力'], pikaStats, psy);
      const d = def(95, ['岩石', '地面'], 100, rockStats);
      const rN = mod.calcDamage(psy, a, d, R, { ...OFF, weather: null });
      const rS = mod.calcDamage(psy, a, d, R, { ...OFF, weather: 'sand' });
      assert.equal(rN.dmg, 7);
      assert.equal(rS.dmg, 4);
      assert.ok(rS.dmg < rN.dmg);
      assert.ok(rS.ability.some((e) => e.name === '沙暴' && e.kind === 'weather' && e.side === 'def'));
    }
    // 文案：服务端直接调 abilityEventText；离线端未导出该函数，走道馆回合集成验日志
    const txt = M.abilityEventText({ kind: 'weather', name: '沙暴', pet: '大岩蛇', moveType: '超能力' });
    assert.ok(txt.includes('提升了特防'));
    assert.ok(!txt.includes('威力减弱'));
    for (const mod of [M, L]) {
      const st = gymState(mod, 'sand', 25, '皮卡丘', '电', { name: '念力', type: '超能力', power: 50 }, 95, '大岩蛇', '岩石', { name: '岩石猛击', type: '岩石', power: 28 });
      mod.resolveGymRound(st, { moveName: '念力' }, R);
      assert.ok(st.log.some((e) => e.text === '沙暴！大岩蛇 借助沙暴提升了特防！'));
      assert.ok(!st.log.some((e) => e.text && e.text.includes('沙暴') && e.text.includes('威力减弱')));
    }
  });
});

describe('速度：叶绿素/悠游自如只在对应天气×2，PvP 不看速度', () => {
  test('叶绿素 43：基础 15、晴天 30、雨天 15；45（S4 馆主）：基础 23、晴天 46、雨天 23', () => {
    for (const [no, base, sun] of [[43, 15, 30], [45, 23, 46]]) {
      const p = M.makePet({ key: 'p', name: '测', type: (M.SPECIES[no] || {}).type || '普通', no, defTypes: M.playerDefTypes(no), level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] });
      const q = L.makePet({ key: 'p', name: '测', type: (L.SPECIES[no] || {}).type || '普通', no, defTypes: L.playerDefTypes(no), level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] });
      assert.equal(M.effectiveSpeed(p), base);
      assert.equal(M.effectiveSpeed(p, 'sun'), sun);
      assert.equal(M.effectiveSpeed(p, 'rain'), base);
      assert.equal(L.effectiveSpeed(q, 'sun'), sun);
      assert.equal(L.effectiveSpeed(q, 'rain'), base);
    }
  });
  test('悠游自如 116：基础 26、晴天 26、雨天 52；129：基础 33、晴天 33、雨天 66', () => {
    for (const [no, base, rain] of [[116, 26, 52], [129, 33, 66]]) {
      const p = M.makePet({ key: 'p', name: '测', type: (M.SPECIES[no] || {}).type || '普通', no, defTypes: M.playerDefTypes(no), level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] });
      const q = L.makePet({ key: 'p', name: '测', type: (L.SPECIES[no] || {}).type || '普通', no, defTypes: L.playerDefTypes(no), level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] });
      assert.equal(M.effectiveSpeed(p), base);
      assert.equal(M.effectiveSpeed(p, 'sun'), base);
      assert.equal(M.effectiveSpeed(p, 'rain'), rain);
      assert.equal(L.effectiveSpeed(q, 'sun'), base);
      assert.equal(L.effectiveSpeed(q, 'rain'), rain);
    }
  });
  test('不传天气＝PvP 口径：叶绿素/悠游自如均取基础速度', () => {
    for (const no of [43, 45, 116, 129]) {
      const p = M.makePet({ key: 'p', name: '测', type: (M.SPECIES[no] || {}).type || '普通', no, defTypes: M.playerDefTypes(no), level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] });
      assert.equal(M.effectiveSpeed(p), M.effectiveSpeed(p, null));
      assert.equal(M.effectiveSpeed(p), M.effectiveSpeed(p, undefined));
    }
  });
});

describe('开局与旧对局', () => {
  test('S4 开局：weather.kind 为 sun，日志首条为天气事件（先于威吓）', () => {
    const st = gymState(M, 'sun', 4, '小火龙', '火', fire, 45, '臭臭花', '草', { name: '花瓣狂舞', type: '草', power: 56 });
    assert.deepEqual(st.weather, { kind: 'sun' });
    assert.equal(st.log[0].type, 'weather');
    assert.equal(st.log[0].kind, 'sun');
    assert.equal(st.log[0].text, '大晴天！阳光照耀着对战场，火属性招式威力提升、水属性招式威力减弱！');
    const stL = gymState(L, 'sun', 4, '小火龙', '火', fire, 45, '臭臭花', '草', { name: '花瓣狂舞', type: '草', power: 56 });
    assert.deepEqual(stL.weather, { kind: 'sun' });
    assert.equal(stL.log[0].text, st.log[0].text);
  });
  test('雨天开局：weather.kind 为 rain，日志首条为下雨文案', () => {
    const st = gymState(M, 'rain', 7, '杰尼龟', '水', water, 45, '臭臭花', '草', { name: '花瓣狂舞', type: '草', power: 56 });
    assert.deepEqual(st.weather, { kind: 'rain' });
    assert.equal(st.log[0].type, 'weather');
    assert.equal(st.log[0].text, '下起雨了！水属性招式威力提升、火属性招式威力减弱！');
  });
  test('无天气开局：weather.kind 为 null，日志无天气事件', () => {
    const st = gymState(M, null, 4, '小火龙', '火', fire, 45, '臭臭花', '草', { name: '花瓣狂舞', type: '草', power: 56 });
    assert.deepEqual(st.weather, { kind: null });
    assert.ok(!st.log.some((e) => e.type === 'weather'));
  });
  test('旧对局（无 weather 字段）进 resolveGymRound：默认 null，不抛错', () => {
    const st = gymState(M, null, 4, '小火龙', '火', fire, 45, '臭臭花', '草', { name: '花瓣狂舞', type: '草', power: 56 });
    delete st.weather;
    const r = M.resolveGymRound(st, { moveName: '火花' }, R);
    assert.ok(!r.error);
    assert.deepEqual(st.weather, { kind: null });
  });
  test('道馆回合集成：S4 晴天小火龙火花，日志含天气提升文案；雨天角金鱼水枪（悠游自如雨天先手），日志含雨天提升文案', () => {
    const stS = gymState(M, 'sun', 4, '小火龙', '火', fire, 45, '臭臭花', '草', { name: '花瓣狂舞', type: '草', power: 56 });
    M.resolveGymRound(stS, { moveName: '火花' }, R);
    assert.ok(stS.log.some((e) => e.text === '大晴天！小火龙 的火属性招式威力提升了！'));
    const stR = gymState(M, 'rain', 116, '角金鱼', '水', water, 45, '臭臭花', '草', { name: '花瓣狂舞', type: '草', power: 56 });
    M.resolveGymRound(stR, { moveName: '水枪' }, R);
    assert.ok(stR.log.some((e) => e.text === '下雨！角金鱼 的水属性招式威力提升了！'));
  });
  test('PvP 对局无天气：createBattleState 不传 weather，kind 为 null', () => {
    const st = M.createBattleState({
      mode: 'pvp', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '玩家A', battleLevel: 30, activeIdx: 0, pets: [mkPet(M, 4, '小火龙', '火', fire)] },
        B: { childId: 2, childName: '玩家B', battleLevel: 30, activeIdx: 0, pets: [mkPet(M, 7, '杰尼龟', '水', water)] },
      },
    });
    assert.deepEqual(st.weather, { kind: null });
    assert.ok(!st.log.some((e) => e.type === 'weather'));
  });
});

describe('回合末沙暴结算（tickActiveStatuses）', () => {
  test('非岩/地/钢扣 1/16、岩/地/钢免疫，服务端与离线端一致', () => {
    for (const mod of [M, L]) {
      // (a) A 侧皮卡丘（电，非免疫）：扣 max(1, floor(maxHp/16))，推沙暴扣血事件
      const stA = gymState(mod, 'sand', 25, '皮卡丘', '电', { name: '电击', type: '电', power: 40 }, 95, '大岩蛇', '岩石', { name: '岩石猛击', type: '岩石', power: 28 });
      const petA = stA.sides.A.pets[0];
      const beforeA = petA.hp;
      const evA = [];
      mod.tickActiveStatuses(stA, R, evA);
      const expectA = Math.max(1, Math.floor(petA.maxHp / 16));
      assert.equal(petA.hp, beforeA - expectA);
      assert.ok(evA.some((e) => e.type === 'weather' && e.kind === 'sand' && e.pet === '皮卡丘' && e.text.includes('受到了沙暴的伤害')));
      // (b) A 侧大岩蛇（岩/地面，免疫）：hp 不变、无沙暴扣血事件（B 侧馆主同为大岩蛇亦免疫）
      const stB = gymState(mod, 'sand', 95, '大岩蛇', '岩石', { name: '岩石猛击', type: '岩石', power: 28 }, 95, '大岩蛇', '岩石', { name: '岩石猛击', type: '岩石', power: 28 });
      const petB = stB.sides.A.pets[0];
      const beforeB = petB.hp;
      const evB = [];
      mod.tickActiveStatuses(stB, R, evB);
      assert.equal(petB.hp, beforeB);
      assert.ok(!evB.some((e) => e.type === 'weather' && e.kind === 'sand'));
    }
  });
});
