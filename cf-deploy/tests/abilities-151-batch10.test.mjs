// 文件：tests/abilities-151-batch10.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';

const M = await import('../src/index.js');
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);
const ENGINES = [['M', M], ['L', L]];

const TACKLE = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' };
const HYDRO_PUMP = { name: '水炮', type: '水', power: 110, damage_class: 'special' };

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

describe('Batch 10 — 结实（Sturdy）（T1–T6）', () => {
  test('T1: 满血致命伤留 1（道馆）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const player = mk(E, 95, '结实', [TACKLE]);
      player.maxHp = 10;
      player.hp = 10;
      const boss = mk(E, 150, '压迫感', [HYDRO_PUMP]);
      const st = makeGymState(E, [player], [boss]);
      const r = E.resolveGymRound(st, { type: 'move', moveName: '撞击' }, () => 0.5);
      const evs = (r && r.events) || [];
      assert.equal(player.hp, 1, `${tag}: Sturdy should leave 1 HP on lethal hit from full HP`);
      assert.ok(evs.some((e) => e.type === 'sturdy' && e.side === 'A'), `${tag}: missing sturdy event`);
      assert.ok(!evs.some((e) => e.type === 'faint'), `${tag}: must not faint when Sturdy triggers`);
    }
  });

  test('T2: 非满血致命伤正常昏厥（道馆）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const player = mk(E, 95, '结实', [TACKLE]);
      player.maxHp = 10;
      player.hp = 9;
      const boss = mk(E, 150, '压迫感', [HYDRO_PUMP]);
      const st = makeGymState(E, [player], [boss]);
      const r = E.resolveGymRound(st, { type: 'move', moveName: '撞击' }, () => 0.5);
      const evs = (r && r.events) || [];
      assert.equal(player.hp, 0, `${tag}: non-full HP must faint on lethal hit`);
      assert.ok(evs.some((e) => e.type === 'faint' && e.side === 'A'), `${tag}: missing faint event`);
      assert.ok(!evs.some((e) => e.type === 'sturdy'), `${tag}: Sturdy must not trigger below full HP`);
    }
  });

  test('T3: 结实与友好度硬撑只触发一个，先结实（道馆，D10）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const player = mk(E, 95, '结实', [TACKLE], { key: 'main' });
      player.maxHp = 10;
      player.hp = 10;
      const boss = mk(E, 150, '压迫感', [HYDRO_PUMP]);
      const st = makeGymState(E, [player], [boss]);
      st.gym = { ...(st.gym || {}), friendship: 255, endureUsed: false };
      const r = E.resolveGymRound(st, { type: 'move', moveName: '撞击' }, () => 0.5);
      const evs = (r && r.events) || [];
      assert.equal(player.hp, 1, `${tag}: Sturdy should leave 1 HP`);
      assert.ok(evs.some((e) => e.type === 'sturdy' && e.side === 'A'), `${tag}: missing sturdy event`);
      assert.equal(st.gym.endureUsed, false, `${tag}: tryEndure must not be consumed when Sturdy triggers`);
      assert.ok(!evs.some((e) => e.type === 'endure'), `${tag}: must not emit endure event`);
    }
  });

  test('T4: 化学变化气体压制结实，气体宠昏厥后恢复生效（直调 helper）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const gasPet = mk(E, 109, '化学变化气体', [TACKLE]);
      const victim = mk(E, 95, '结实', [TACKLE]);
      victim.maxHp = 10;
      victim.hp = 10;
      const st = {
        sides: {
          A: { pets: [gasPet], activeIdx: 0 },
          B: { pets: [victim], activeIdx: 0 },
        },
      };

      const evSuppressed = [];
      assert.equal(E.trySturdy(st, victim, 999, evSuppressed, 'B'), false, `${tag}: Neutralizing Gas must suppress Sturdy`);
      assert.equal(victim.hp, 10, `${tag}: victim HP must remain unchanged when suppressed`);
      assert.equal(evSuppressed.length, 0, `${tag}: no sturdy event when suppressed`);

      gasPet.hp = 0;
      const evActive = [];
      assert.equal(E.trySturdy(st, victim, 999, evActive, 'B'), true, `${tag}: Sturdy must trigger once gas pet faints`);
      assert.equal(victim.hp, 1, `${tag}: victim HP must become 1 when Sturdy triggers`);
      assert.ok(evActive.some((e) => e.type === 'sturdy' && e.side === 'B'), `${tag}: missing sturdy event after gas faints`);
    }
  });

  test('T5: PvP 满血致命伤留 1（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const onix = mk(E, 95, '结实', [TACKLE]);
      onix.maxHp = 10;
      onix.hp = 10;
      const mewtwo = mk(E, 150, '压迫感', [HYDRO_PUMP]);
      const st = makePvpState(E, [onix], [mewtwo], 'B');
      st.turn = 'B';
      const r = E.applyBattleAction(st, 'B', '水炮', () => 0.5);
      const evs = (r && r.events) || [];
      assert.equal(onix.hp, 1, `${tag}: PvP Sturdy should leave 1 HP`);
      assert.ok(evs.some((e) => e.type === 'sturdy' && e.side === 'A'), `${tag}: missing sturdy event in PvP`);
      assert.ok(!evs.some((e) => e.type === 'faint'), `${tag}: must not faint in PvP`);
      assert.ok(!st.winner, `${tag}: battle must not have a winner`);
    }
  });

  test('T6: 第二次致命伤正常昏厥（道馆，两回合）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const player = mk(E, 95, '结实', [TACKLE]);
      player.maxHp = 10;
      player.hp = 10;
      const boss = mk(E, 150, '压迫感', [HYDRO_PUMP]);
      const st = makeGymState(E, [player], [boss]);

      const r1 = E.resolveGymRound(st, { type: 'move', moveName: '撞击' }, () => 0.5);
      const evs1 = (r1 && r1.events) || [];
      assert.equal(player.hp, 1, `${tag}: round 1 should trigger Sturdy and leave 1 HP`);
      assert.ok(evs1.some((e) => e.type === 'sturdy' && e.side === 'A'), `${tag}: round 1 missing sturdy event`);
      assert.ok(boss.hp > 0, `${tag}: boss must stay alive for round 2`);

      const r2 = E.resolveGymRound(st, { type: 'move', moveName: '撞击' }, () => 0.5);
      const evs2 = (r2 && r2.events) || [];
      assert.equal(player.hp, 0, `${tag}: round 2 lethal hit at 1 HP must faint`);
      assert.ok(evs2.some((e) => e.type === 'faint' && e.side === 'A'), `${tag}: round 2 missing faint event`);
      assert.ok(!evs2.some((e) => e.type === 'sturdy'), `${tag}: round 2 must not trigger Sturdy`);
    }
  });
});
