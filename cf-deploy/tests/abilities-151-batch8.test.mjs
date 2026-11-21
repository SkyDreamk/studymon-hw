// 文件：tests/abilities-151-batch8.test.mjs
// Batch 8 — 天气扩展：冰雹、雪隐、日照、冰冻之躯（T1–T13）
// 初稿由手机 Gemini 写，eno 修正 2 处致命缺陷：
//   D2-1: T6 改用 #87 白海狮（水／冰，免疫冰雹扣血）；#86 小海狮是纯水，冰雹里先扣后回净 0。
//   D2-2: T10 落空分支改查 {type:'miss'} 事件（道馆落空推 miss 事件，无 attack 事件、无 missed 字段）；删掉空断言。
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';
import { readBackendSource } from './backend-src.mjs';

const M = await import('../src/index.js');
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);
const ENGINES = [['M', M], ['L', L]];

const TACKLE = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' };

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
      B: { childName: '馆主', pets: bossPets, activeIdx: bossActiveIdx },
    },
  });
}

describe('Batch 8 — 天气扩展：冰雹、雪隐、日照、冰冻之躯（T1–T13）', () => {
  test('T1: 默认天气池进冰雹，S4/S7/S8 分关池不含冰雹（M）', () => {
    assert.ok(M.GYM_WEATHER_POOL.includes('hail'));
    for (const stage of [4, 7, 8]) {
      assert.ok(!M.GYM_WEATHER_POOLS[stage].includes('hail'), `stage ${stage} pool must not include hail`);
    }
  });

  test('T2: gymDailyWeather 60 天扫荡 — S1 出现冰雹、S4 永不出现冰雹（M）', () => {
    let s1Hail = 0;
    let s4Hail = 0;
    const baseMs = Date.UTC(2026, 10, 18);
    for (let i = 0; i < 60; i++) {
      const d = new Date(baseMs + i * 86400 * 1000).toISOString().slice(0, 10);
      if (M.gymDailyWeather(1, d) === 'hail') s1Hail++;
      if (M.gymDailyWeather(4, d) === 'hail') s4Hail++;
    }
    assert.ok(s1Hail > 0, 'stage 1 default pool should roll hail within 60 days');
    assert.equal(s4Hail, 0, 'stage 4 restricted pool must never roll hail');
  });

  test('T3: 开局冰雹文案写入 st.log（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const st = makeGymState(E, [mk(E, 25, '静电')], [mk(E, 7, '激流')], 'hail');
      const hailEv = (st.log || []).find((e) => e.type === 'weather' && e.kind === 'hail');
      assert.ok(hailEv, `${tag}: missing opening hail weather event`);
      assert.equal(hailEv.text, '下起了冰雹！非冰属性宝可梦会受到冰雹伤害！', tag);
    }
  });

  test('T4: 冰雹回合末对非冰属性扣 1/16 体力并推 hail 事件（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const pika = mk(E, 25, '静电');
      const foe = mk(E, 144, '压迫感');
      const hp0 = pika.hp;
      const expectedDmg = Math.max(1, Math.floor(pika.maxHp / 16));
      const st = makePvpState(E, [pika], [foe], 'A', 'hail');
      const events = [];
      E.tickActiveStatuses(st, () => 0.5, events);
      assert.equal(pika.hp, hp0 - expectedDmg, tag);
      const ev = events.find((e) => e.type === 'weather' && e.kind === 'hail' && e.pet === pika.name);
      assert.ok(ev, `${tag}: missing hail damage event`);
      assert.equal(ev.text, `冰雹！${pika.name} 受到了冰雹的伤害！（-${expectedDmg}）`, tag);
    }
  });

  test('T5: 冰雹免疫 — 冰属性（#144）与非冰雪隐均扣 0，对照 #25 静电扣 1/16（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const articuno = mk(E, 144, '压迫感');
      const pikaSnowCloak = mk(E, 25, '雪隐');
      const hp144 = articuno.hp;
      const hp25Cloak = pikaSnowCloak.hp;
      const stImm = makePvpState(E, [articuno], [pikaSnowCloak], 'A', 'hail');
      E.tickActiveStatuses(stImm, () => 0.5, []);
      assert.equal(articuno.hp, hp144, `${tag}: Ice type must be immune to hail`);
      assert.equal(pikaSnowCloak.hp, hp25Cloak, `${tag}: Snow Cloak must be immune to hail`);

      const pikaStatic = mk(E, 25, '静电');
      const hp25Static = pikaStatic.hp;
      const expectedDmg = Math.max(1, Math.floor(pikaStatic.maxHp / 16));
      const stCtrl = makePvpState(E, [pikaStatic], [mk(E, 144, '压迫感')], 'A', 'hail');
      E.tickActiveStatuses(stCtrl, () => 0.5, []);
      assert.equal(pikaStatic.hp, hp25Static - expectedDmg, `${tag}: control Pikachu should take hail damage`);
    }
  });

  test('T6: 冰冻之躯在冰雹回合末回复 floor(maxHp/16) 并推精确事件（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      // D2-1 修正：用 #87 白海狮（水／冰，免疫冰雹扣血，只有回复生效）。
      // #86 小海狮是纯水，冰雹里先扣后回净 0，不能测净回复。
      const dewgong = mk(E, 87, '冰冻之躯');
      dewgong.hp = Math.floor(dewgong.maxHp / 2);
      const before = dewgong.hp;
      const expectedHeal = Math.floor(dewgong.maxHp / 16);
      const st = makePvpState(E, [dewgong], [mk(E, 144, '压迫感')], 'A', 'hail');
      const events = [];
      E.tickActiveStatuses(st, () => 0.5, events);
      assert.equal(dewgong.hp, before + expectedHeal, tag);
      const ev = events.find((e) => e.type === 'ability' && e.ability === '冰冻之躯');
      assert.ok(ev, `${tag}: missing 冰冻之躯 heal event`);
      assert.equal(ev.text, `「冰冻之躯」发动！${dewgong.name} 回复了 ${expectedHeal} 点体力！`, tag);
    }
  });

  test('T7: 魔法防守挡下冰雹伤害并推魔法防守事件（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const abra = mk(E, 63, '魔法防守');
      const hp0 = abra.hp;
      const st = makePvpState(E, [abra], [mk(E, 144, '压迫感')], 'A', 'hail');
      const events = [];
      E.tickActiveStatuses(st, () => 0.5, events);
      assert.equal(abra.hp, hp0, `${tag}: Magic Guard must block hail damage`);
      const ev = events.find((e) => e.type === 'ability' && e.ability === '魔法防守');
      assert.ok(ev, `${tag}: missing 魔法防守 event`);
      assert.equal(ev.text, `「魔法防守」发动！${abra.name} 不受招式以外的伤害！`, tag);
    }
  });

  test('T8: 沙隐在沙暴下闪避（rng 0.85 未命中），对照拨沙命中（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const atk = mk(E, 25, '静电');
      const defVeil = mk(E, 27, '沙隐');
      const defCtrl = mk(E, 27, '拨沙');
      const opts = { chart: 'official', weather: 'sand', critRate: 0 };
      const rVeil = E.calcDamage(TACKLE, atk, defVeil, () => 0.85, opts);
      const rCtrl = E.calcDamage(TACKLE, atk, defCtrl, () => 0.85, opts);
      assert.equal(rVeil.missed, true, `${tag}: Sand Veil should evade at roll 85`);
      assert.notEqual(rCtrl.missed, true, `${tag}: control Sandshrew should be hit at roll 85`);
    }
  });

  test('T9: 雪隐在冰雹下闪避（rng 0.85 未命中），对照压迫感命中（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const atk = mk(E, 25, '静电');
      const defCloak = mk(E, 144, '雪隐');
      const defCtrl = mk(E, 144, '压迫感');
      const opts = { chart: 'official', weather: 'hail', critRate: 0 };
      const rCloak = E.calcDamage(TACKLE, atk, defCloak, () => 0.85, opts);
      const rCtrl = E.calcDamage(TACKLE, atk, defCtrl, () => 0.85, opts);
      assert.equal(rCloak.missed, true, `${tag}: Snow Cloak should evade at roll 85`);
      assert.notEqual(rCtrl.missed, true, `${tag}: control Articuno should be hit at roll 85`);
    }
  });

  test('T10: D10 取高不叠加 — 友好度 5 vs 沙隐 20，rng 0.78 命中、rng 0.85 闪避（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const runAt = (rollVal) => {
        const player = mk(E, 27, '沙隐', [TACKLE], { key: 'main' });
        const boss = mk(E, 25, '静电', [TACKLE]);
        const st = makeGymState(E, [player], [boss], 'sand');
        st.gym = { ...(st.gym || {}), friendship: 204 };
        const hpBefore = player.hp;
        const r = E.resolveGymRound(st, { type: 'move', moveName: '撞击' }, () => rollVal);
        const bossAttackEv = (r.events || []).find((e) => e.side === 'B' && e.type === 'attack');
        const bossMissEv = (r.events || []).find((e) => e.side === 'B' && e.type === 'miss');
        return { hpBefore, hpAfter: player.hp, bossAttackEv, bossMissEv };
      };

      // D2-2 修正：命中分支查 attack 事件（attack 事件无 missed 字段，靠 hp 断言）；
      // 闪避分支查 miss 事件（落空时道馆推 miss 事件，无 attack 事件）。
      const hitRun = runAt(0.78);
      assert.ok(hitRun.bossAttackEv, `${tag}: expected boss attack event at 0.78`);
      assert.ok(hitRun.hpAfter < hitRun.hpBefore, `${tag}: player should take damage at 0.78`);

      const missRun = runAt(0.85);
      assert.ok(missRun.bossMissEv, `${tag}: expected boss miss event at 0.85`);
      assert.equal(missRun.hpAfter, missRun.hpBefore, `${tag}: player should take 0 damage at 0.85`);
    }
  });

  test('T11: 日照 triggerSwitchIn 覆盖关卡天气为大晴天并推精确事件（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const ninetales = mk(E, 38, '日照');
      const st = makeGymState(E, [ninetales], [mk(E, 25, '静电')], 'sand');
      st.weather = { kind: 'sand' };
      const events = [];
      E.triggerSwitchIn(st, 'A', events);
      assert.equal(st.weather.kind, 'sun', tag);
      const ev = events.find((e) => e.type === 'ability' && e.ability === '日照');
      assert.ok(ev, `${tag}: missing 日照 event`);
      assert.equal(ev.text, `「日照」发动！${ninetales.name} 出场，大晴天出现了！`, tag);
    }
  });

  test('T12: 日照实战换宠改写天气（resolveGymRound 换上日照宠后天气变为 sun）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const squirtle = mk(E, 7, '激流');
      const ninetales = mk(E, 38, '日照');
      const st = makeGymState(E, [squirtle, ninetales], [mk(E, 25, '静电')], 'sand');
      assert.equal(st.weather.kind, 'sand', `${tag}: weather must start as sand before swapping in Drought`);
      const r = E.resolveGymRound(st, { swapToIdx: 1 }, () => 0.5);
      assert.ok(!r.error, `${tag}: unexpected error ${r.error}`);
      assert.equal(st.weather.kind, 'sun', `${tag}: swapping in Drought must set weather to sun`);
    }
  });

  test('T13: 范围与红线守卫（abilityOf 4、isHailImmune 3、分关池无 hail、let dodge 等）（M）', async () => {
    const src = await readBackendSource();
    assert.equal((src.match(/\babilityOf\(/g) || []).length, 4);
    assert.equal((src.match(/\bisHailImmune\b/g) || []).length, 3);
    assert.ok((src.match(/'hail'/g) || []).length >= 4);
    assert.ok((src.match(/\bisSandImmune\b/g) || []).length >= 3);

    const poolsLine = src.split('\n').find((line) => line.includes('const GYM_WEATHER_POOLS ='));
    assert.ok(poolsLine, 'missing GYM_WEATHER_POOLS line');
    assert.ok(!poolsLine.includes("'hail'"), 'GYM_WEATHER_POOLS must not include hail');

    const labelLine = src.split('\n').find((line) => line.includes('const WEATHER_LABEL ='));
    assert.ok(labelLine && labelLine.includes("hail: '冰雹'"), 'WEATHER_LABEL must include hail');

    assert.equal((src.match(/let dodge = \(opts && opts\.dodgePct\) \|\| 0;/g) || []).length, 1);
    assert.equal((src.match(/const dodge = \(opts && opts\.dodgePct\) \|\| 0;/g) || []).length, 0);
  });
});
