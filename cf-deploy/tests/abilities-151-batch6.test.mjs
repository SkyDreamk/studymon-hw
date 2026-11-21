// 文件：tests/abilities-151-batch6.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';
import { readBackendSource } from './backend-src.mjs';

const M = await import('../src/index.js');
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);
const ENGINES = [['M', M], ['L', L]];

const R = () => 0.5;
const counting = (vals) => {
  const f = () => {
    f.n++;
    return vals[Math.min(f.n - 1, vals.length - 1)];
  };
  f.n = 0;
  return f;
};

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
      A: { childName: '娃A', pets: Array.isArray(petA) ? petA : [petA] },
      B: { childName: '娃B', pets: Array.isArray(petB) ? petB : [petB] },
    },
  });
  st.turn = firstSide;
  return st;
}

const TACKLE = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' };
const EMBER = { name: '火花', type: '火', power: 40, damage_class: 'special' };
const EARTHQUAKE = { name: '地震', type: '地面', power: 100, damage_class: 'physical' };

describe('Batch 6 — 畏缩系统：精神力、恶臭、不屈之心（T1–T13）', () => {
  test('T1: 恶臭触发使防守方畏缩并输出特性与状态事件（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const atk = mk(E, 88, '恶臭');
      const def = mk(E, 25, '静电');
      const events = [];
      E.applyStenchFlinch(atk, def, TACKLE, counting([0.05]), events, 'A', 'B');
      assert.equal(def.flinch, true, `${tag}: def should flinch`);
      const abEv = events.find((e) => e.ability === '恶臭');
      const stEv = events.find((e) => e.kind === 'flinch');
      assert.ok(abEv, `${tag}: missing 恶臭 event`);
      assert.equal(abEv.text, '「恶臭」发动！臭泥 让 皮卡丘 畏缩了！', tag);
      assert.ok(stEv, `${tag}: missing flinch status event`);
      assert.equal(stEv.text, '皮卡丘 畏缩了！', tag);
    }
  });

  test('T2: 掷骰 >= 0.1 时恶臭不触发（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const atk = mk(E, 88, '恶臭');
      const def = mk(E, 25, '静电');
      const events = [];
      E.applyStenchFlinch(atk, def, TACKLE, counting([0.5]), events, 'A', 'B');
      assert.ok(!def.flinch, `${tag}: def should not flinch`);
      assert.equal(events.length, 0, tag);
    }
  });

  test('T3: 非接触招式（火花特殊招、地震非接触物理招）同样触发恶臭（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      for (const move of [EMBER, EARTHQUAKE]) {
        const atk = mk(E, 88, '恶臭');
        const def = mk(E, 25, '静电');
        const events = [];
        E.applyStenchFlinch(atk, def, move, counting([0.05]), events, 'A', 'B');
        assert.equal(def.flinch, true, `${tag}: ${move.name} must trigger 恶臭`);
      }
    }
  });

  test('T4: 防守方昏厥（hp=0）时不触发恶臭（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const atk = mk(E, 88, '恶臭');
      const def = mk(E, 25, '静电');
      def.hp = 0;
      const events = [];
      E.applyStenchFlinch(atk, def, TACKLE, counting([0.05]), events, 'A', 'B');
      assert.ok(!def.flinch, `${tag}: fainted defender should not flinch`);
      assert.equal(events.length, 0, tag);
    }
  });

  test('T5: 精神力挡下畏缩，只出精神力守卫事件且无恶臭特性事件（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const atk = mk(E, 88, '恶臭');
      const def = mk(E, 41, '精神力');
      const events = [];
      E.applyStenchFlinch(atk, def, TACKLE, counting([0.05]), events, 'A', 'B');
      assert.ok(!def.flinch, `${tag}: Inner Focus should block flinch`);
      const guardEv = events.find((e) => e.ability === '精神力');
      assert.ok(guardEv, `${tag}: missing 精神力 guard event`);
      assert.equal(guardEv.text, '「精神力」发动！超音蝠 不会畏缩！', tag);
      assert.ok(!events.some((e) => e.ability === '恶臭'), `${tag}: must not emit 恶臭 event when blocked`);
    }
  });

  test('T6: 不屈之心在畏缩置位时速度 +1、事件顺序正确，且速度 +6 时不推事件（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const atk = mk(E, 88, '恶臭');
      const def = mk(E, 66, '不屈之心');
      const events = [];
      E.applyStenchFlinch(atk, def, TACKLE, counting([0.05]), events, 'A', 'B');
      assert.equal(def.flinch, true, tag);
      assert.equal(M.stagesOf(def).spe, 1, `${tag}: Steadfast must raise spe to 1`);
      const idxStench = events.findIndex((e) => e.ability === '恶臭');
      const idxFlinch = events.findIndex((e) => e.kind === 'flinch');
      const idxSteadfast = events.findIndex((e) => e.ability === '不屈之心');
      assert.ok(idxStench >= 0, `${tag}: missing 恶臭 event`);
      assert.ok(idxFlinch > idxStench, `${tag}: flinch event must follow 恶臭`);
      assert.ok(idxSteadfast > idxFlinch, `${tag}: 不屈之心 event must follow flinch`);
      assert.equal(events[idxSteadfast].text, '「不屈之心」发动！腕力 的速度提升了！', tag);

      const defMax = mk(E, 66, '不屈之心');
      defMax.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 6 };
      const evMax = [];
      E.applyStenchFlinch(atk, defMax, TACKLE, counting([0.05]), evMax, 'A', 'B');
      assert.equal(defMax.flinch, true, tag);
      assert.equal(M.stagesOf(defMax).spe, 6, tag);
      assert.ok(!evMax.some((e) => e.ability === '不屈之心'), `${tag}: must not emit 不屈之心 when spe already +6`);
    }
  });

  test('T7: 畏缩阻断行动并当场清除标记，同时与中毒状态共存（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const pet = mk(E, 25, '静电');
      pet.infatuated = false;
      pet.flinch = true;
      pet.status = { kind: 'poison' };
      assert.equal(E.statusBlocksAction(pet, counting([0.9])), 'flinch', tag);
      assert.equal(pet.flinch, false, `${tag}: flinch flag must clear on block`);
      assert.equal(pet.status?.kind, 'poison', `${tag}: poison status must be preserved`);
      assert.strictEqual(E.statusBlocksAction(pet, counting([0.9])), null, `${tag}: cleared flinch must not block again`);
    }
  });

  test('T8: 检定顺序为麻痹→着迷→畏缩，前序阻断时畏缩标记保留（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const pet = mk(E, 25, '静电');
      pet.status = { kind: 'paralysis' };
      pet.infatuated = true;
      pet.flinch = true;

      assert.equal(E.statusBlocksAction(pet, counting([0.1, 0.9])), 'paralysis', tag);
      assert.equal(pet.flinch, true, `${tag}: flinch must stay when paralysis blocks`);

      assert.equal(E.statusBlocksAction(pet, counting([0.5, 0.4])), 'infatuation', tag);
      assert.equal(pet.flinch, true, `${tag}: flinch must stay when infatuation blocks`);

      assert.equal(E.statusBlocksAction(pet, counting([0.5, 0.6])), 'flinch', tag);
      assert.equal(pet.flinch, false, `${tag}: flinch must clear once it blocks`);
    }
  });

  test('T9: 主动下场清除畏缩并推解除事件，同时保留中毒状态（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const pet = mk(E, 25, '静电');
      pet.flinch = true;
      pet.status = { kind: 'poison' };
      const st = makePvpState(E, [pet, mk(E, 41, '精神力')], mk(E, 7, '激流'));
      const ev = [];
      E.onPetLeavesField(st, 'A', pet, ev);
      assert.equal(pet.flinch, false, `${tag}: flinch should clear on switch out`);
      assert.equal(pet.status?.kind, 'poison', `${tag}: poison should persist on switch out`);
      const endEv = ev.find((e) => e.kind === 'flinch-end');
      assert.ok(endEv, `${tag}: missing flinch-end event`);
      assert.equal(endEv.text, '皮卡丘 的畏缩解除了！', tag);
    }
  });

  test('T10: 昏厥清除畏缩与持续状态（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const pet = mk(E, 25, '静电');
      pet.flinch = true;
      pet.status = { kind: 'poison' };
      E.clearPetBattleState(pet);
      assert.equal(pet.flinch, false, tag);
      assert.strictEqual(pet.status, null, tag);
    }
  });

  test('T11: statusBlockedText 四态阻断文案精确匹配（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      assert.equal(E.statusBlockedText('sleep', '皮卡丘'), '皮卡丘 睡着了，不能行动！', tag);
      assert.equal(E.statusBlockedText('paralysis', '皮卡丘'), '皮卡丘 麻痹了，动不了！', tag);
      assert.equal(E.statusBlockedText('infatuation', '皮卡丘'), '皮卡丘 着迷了，无法行动！', tag);
      assert.equal(E.statusBlockedText('flinch', '皮卡丘'), '皮卡丘 畏缩了，无法行动！', tag);
    }
  });

  test('T12: 畏缩阻断不消耗 rng（c.n === 0），对照着迷阻断消耗 1 次 rng（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const petFlinch = mk(E, 25, '静电');
      petFlinch.flinch = true;
      const cFlinch = counting([0.9]);
      assert.equal(E.statusBlocksAction(petFlinch, cFlinch), 'flinch', tag);
      assert.equal(cFlinch.n, 0, `${tag}: flinch block must not consume rng`);

      const petInfat = mk(E, 25, '静电');
      petInfat.infatuated = true;
      const cInfat = counting([0.4]);
      assert.equal(E.statusBlocksAction(petInfat, cInfat), 'infatuation', tag);
      assert.equal(cInfat.n, 1, `${tag}: infatuation block must consume 1 rng`);
    }
  });

  test('T13: 范围与红线守卫（abilityOf 4 处、三元 0 处、.flinch 6 行且命中四函数、applyStenchFlinch 9 处）（M）', async () => {
    const src = await readBackendSource();
    assert.equal((src.match(/\babilityOf\(/g) || []).length, 4);
    assert.equal((src.match(/=== 'sleep' \? `\$\{/g) || []).length, 0);

    const flinchLines = src.split('\n').filter((line) => /\.flinch\b/.test(line));
    assert.equal(flinchLines.length, 6, `expected 6 .flinch lines, got ${flinchLines.length}`);

    const sliceFn = (name) => {
      const start = src.indexOf(`function ${name}(`);
      assert.ok(start >= 0, `missing function ${name}`);
      const end = src.indexOf('\nfunction ', start + 1);
      return src.slice(start, end < 0 ? src.length : end);
    };
    for (const fnName of ['tryInflictFlinch', 'statusBlocksAction', 'onPetLeavesField', 'clearPetBattleState']) {
      assert.match(sliceFn(fnName), /\.flinch\b/, `missing .flinch reference in ${fnName}`);
    }

    const stenchLines = src.split('\n').filter((line) => line.includes('applyStenchFlinch'));
    assert.equal(stenchLines.length, 9, `expected 9 applyStenchFlinch lines, got ${stenchLines.length}`);
  });
});
