// 文件：tests/abilities-151-batch7.test.mjs
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
const BOSS_MOVES = [['撞击', '普通', 35]];

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

function mkDesc(E, no, ability, moves = [TACKLE], extra = {}) {
  const sp = (M.SPECIES && M.SPECIES[no]) || {};
  const defTypes = E.playerDefTypes(no);
  return {
    key: `p${no}`,
    name: sp.name || `#${no}`,
    type: sp.type || (defTypes && defTypes[0]) || '普通',
    no,
    defTypes,
    level: 20,
    moves,
    ability,
    ...extra,
  };
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
    mode: 'gym', firstSide: 'A', weather,
    sides: {
      A: { childName: '娃A', activeIdx: 0, pets: Array.isArray(playerPets) ? playerPets : [playerPets] },
      B: { childName: '馆主', pets: bossPets, activeIdx: bossActiveIdx },
    },
  });
}

function makeCoopState(E, bossNo, bossType, bossMoves, petA, petB) {
  const sideA = {
    childId: 1,
    childName: '大宝',
    battleLevel: 18,
    activeIdx: 0,
    pets: (Array.isArray(petA) ? petA : [petA]).map((d) => E.makePet(d)),
  };
  const sideB = {
    childId: 2,
    childName: '小宝',
    battleLevel: 18,
    activeIdx: 0,
    pets: (Array.isArray(petB) ? petB : [petB]).map((d) => E.makePet(d)),
  };
  return E.createCoopBattleState(
    { node_id: 'test-b7', kind: 'normal', bossNo, bossType, bossMoves, levelOffset: 0 },
    sideA,
    sideB,
    18,
  );
}

describe('Batch 7 — 换宠锁定：磁力、沙穴（T1–T13）', () => {
  test('T1: canSwitchOut — 沙穴锁任意换宠（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const st = makePvpState(E, [mk(E, 25, '静电'), mk(E, 7, '激流')], [mk(E, 50, '沙穴')]);
      assert.deepEqual(E.canSwitchOut(st, 'A'), { blocked: true, ability: '沙穴' }, tag);
    }
  });

  test('T2: canSwitchOut — 磁力锁钢属性换宠（双属性电/钢 #81）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const st = makePvpState(E, [mk(E, 81, '磁力'), mk(E, 7, '激流')], [mk(E, 81, '磁力')]);
      assert.deepEqual(E.canSwitchOut(st, 'A'), { blocked: true, ability: '磁力' }, tag);
    }
  });

  test('T3: canSwitchOut — 磁力放行非钢换宠（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const st = makePvpState(E, [mk(E, 25, '静电'), mk(E, 7, '激流')], [mk(E, 81, '磁力')]);
      assert.strictEqual(E.canSwitchOut(st, 'A'), null, tag);
    }
  });

  test('T4: canSwitchOut — 对手无锁特性放行（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const st = makePvpState(E, [mk(E, 25, '静电'), mk(E, 7, '激流')], [mk(E, 41, '精神力')]);
      assert.strictEqual(E.canSwitchOut(st, 'A'), null, tag);
    }
  });

  test('T5: canSwitchOut — 对手已昏厥（hp=0）放行（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const foe = mk(E, 50, '沙穴');
      foe.hp = 0;
      const st = makePvpState(E, [mk(E, 25, '静电'), mk(E, 7, '激流')], [foe]);
      assert.strictEqual(E.canSwitchOut(st, 'A'), null, tag);
    }
  });

  test('T6: PvP applyPvpSwap 被沙穴锁定，activeIdx 不变且无 swap 事件（M）', () => {
    const st = makePvpState(M, [mk(M, 25, '静电'), mk(M, 7, '激流')], [mk(M, 50, '沙穴')]);
    const r = M.applyPvpSwap(st, 'A', 1);
    assert.equal(r.error, 'SWAP_TRAPPED');
    assert.equal(r.ability, '沙穴');
    assert.equal(st.sides.A.activeIdx, 0);
    assert.ok(!(r.events || []).some((e) => e.type === 'swap'));
  });

  test('T7: PvP applyPvpSwap 对手非锁特性时放行（M）', () => {
    const st = makePvpState(M, [mk(M, 25, '静电'), mk(M, 7, '激流')], [mk(M, 41, '精神力')]);
    const r = M.applyPvpSwap(st, 'A', 1);
    assert.ok(!r.error, `unexpected error: ${r.error}`);
    assert.equal(st.sides.A.activeIdx, 1);
    assert.ok((r.events || []).some((e) => e.type === 'swap' && e.text && e.text.includes('上场！')));
  });

  test('T8: 道馆 resolveGymRound 被沙穴锁定，A.activeIdx 不变（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const st = makeGymState(E, [mk(E, 25, '静电'), mk(E, 7, '激流')], [mk(E, 50, '沙穴')]);
      const r = E.resolveGymRound(st, { swapToIdx: 1 }, () => 0.5);
      assert.equal(r.error, 'SWAP_TRAPPED', tag);
      assert.equal(r.ability, '沙穴', tag);
      assert.equal(st.sides.A.activeIdx, 0, tag);
    }
  });

  test('T9: 道馆 resolveGymRound 对手非锁特性时换宠放行（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const st = makeGymState(E, [mk(E, 25, '静电'), mk(E, 7, '激流')], [mk(E, 41, '精神力')]);
      const r = E.resolveGymRound(st, { swapToIdx: 1 }, () => 0.5);
      assert.ok(!r.error, `${tag}: unexpected error ${r.error}`);
      assert.equal(st.sides.A.activeIdx, 1, tag);
    }
  });

  test('T10: 合作战 resolveCoopRound 被沙穴锁定，席位 activeIdx 不变（M）', () => {
    const st = makeCoopState(
      M,
      50,
      '地面',
      BOSS_MOVES,
      [mkDesc(M, 25, '静电'), mkDesc(M, 7, '激流')],
      [mkDesc(M, 41, '精神力')],
    );
    st.sides.BOSS.pets[0].ability = '沙穴';
    const r = M.resolveCoopRound(
      st,
      { A: { type: 'switch', toIdx: 1 }, B: { type: 'move', moveName: '撞击' } },
      { kind: 'single', moveName: '撞击', targetSeat: 'B' },
      () => 0.5,
    );
    assert.equal(r.error, 'SWAP_TRAPPED');
    assert.equal(r.ability, '沙穴');
    assert.equal(st.sides.A.activeIdx, 0);
  });

  test('T11: 合作战 resolveCoopRound boss 为非锁特性（#125 电击兽）时放行（M）', () => {
    const st = makeCoopState(
      M,
      125,
      '电',
      BOSS_MOVES,
      [mkDesc(M, 25, '静电'), mkDesc(M, 7, '激流')],
      [mkDesc(M, 41, '精神力')],
    );
    const r = M.resolveCoopRound(
      st,
      { A: { type: 'switch', toIdx: 1 }, B: { type: 'move', moveName: '撞击' } },
      { kind: 'single', moveName: '撞击', targetSeat: 'B' },
      () => 0.5,
    );
    assert.ok(!r.error, `unexpected error: ${r.error}`);
    assert.equal(st.sides.A.activeIdx, 1);
  });

  test('T12: 昏厥自动顶上不受锁（D-5 决定性测试）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const weakB = mk(E, 25, '静电');
      weakB.hp = 1;
      const st = makePvpState(E, [mk(E, 50, '沙穴')], [weakB, mk(E, 7, '激流')]);
      const r = E.applyBattleAction(st, 'A', '撞击', () => 0.5);
      assert.ok(!r.error, `${tag}: unexpected error ${r.error}`);
      assert.equal(st.sides.B.activeIdx, 1, `${tag}: fainted side must promote next pet`);
      assert.ok((r.events || []).some((e) => e.type === 'swap' && e.text && e.text.includes('上场啦！')), tag);
    }
  });

  test('T13: 范围与红线守卫（abilityOf 4、canSwitchOut 5、SWAP_TRAPPED 5、foeSidesOf 5，且不进昏厥/遭遇换宠）（M）', async () => {
    const src = await readBackendSource();
    assert.equal((src.match(/\babilityOf\(/g) || []).length, 4);
    assert.equal((src.match(/\bcanSwitchOut\b/g) || []).length, 5);
    assert.equal((src.match(/\bSWAP_TRAPPED\b/g) || []).length, 5);
    assert.equal((src.match(/\bfoeSidesOf\(/g) || []).length, 6); // Batch 9：复制分支新增 1 处调用

    const sliceFn = (name) => {
      const m = src.match(new RegExp(`(?:async )?function ${name}\\(`));
      assert.ok(m && m.index !== undefined, `missing function ${name}`);
      const next = src.slice(m.index + 1).search(/\n(?:async )?function /);
      return next < 0 ? src.slice(m.index) : src.slice(m.index, m.index + 1 + next);
    };
    assert.equal((sliceFn('settleAfterDamage').match(/\bcanSwitchOut\b/g) || []).length, 0);
    assert.equal((sliceFn('apiEncounterSwitch').match(/\bcanSwitchOut\b/g) || []).length, 0);
  });
});
