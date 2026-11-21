/* 特性 151 Batch 5（B-1 着迷系统：迷人之躯／迟钝）：node --test tests/abilities-151-batch5.test.mjs
 * 覆盖：迷人之躯接触触发 30%（T1–T5）、着迷 50% 阻断与共存（T6–T9）、
 * 无误触发与 RNG 顺序（T10–T12）、守卫与回归（T13）。
 * （服务端 M＋离线端 L 双端；L 在“镜像＋哈希轮换”之前会红，属预期。）
 * 脚手架：Batch 4 同款——M 来自 ../src/index.js（动态 import）；L 经 asset-path.mjs 取离线端 bundle；
 * calcDamage 参数顺序是 (move, atkPet, defPet, rng, opts)；makePet 的 moves 必须是 {name,power,…} 对象数组；
 * 名字与属性取 SPECIES／playerDefTypes；makePvpState 为 Batch 3 同款。
 * 着迷存独立字段 pet.infatuated（D-0），不进 pet.status 单槽；T7 为 D-0 决定性测试。
 * Gemini 初稿勘误（eno 核验，见任务单核验勘误）：mk 默认 moves 不得为字符串数组（makePet 会抛错）、
 * 名字来源须为 SPECIES（DEX_DETAILS 无 name 字段）、L 须走 pathToFileURL（assetPath 返回绝对路径）。
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
const EARTHQUAKE = { name: '地震', type: '地面', power: 100, damage_class: 'physical' };

const mk = (E, no, ability, moves = [TACKLE], extra = {}) => {
  // 名字与主属性取服务端 M.SPECIES：离线端 L 的 SPECIES 缺 15 种（含 #25 皮卡丘、#7 杰尼龟等主宠线，
  // 预存结构、与 Batch 5 无关），若用 E.SPECIES 则 L 端名字会落为 `#25`、主属性落为普通，
  // 导致 T1/T8 的事件文案断言失败。名字与主属性只是夹具元数据，不影响被测的特性逻辑；
  // 防御属性仍取各引擎自己的 playerDefTypes（L 端该函数正常，#25 返回 [电]）。
  const sp = M.SPECIES[no];
  return E.makePet({ key: `p${no}`, name: sp ? sp.name : `#${no}`, type: sp ? sp.type : '普通', no, defTypes: E.playerDefTypes(no), level: 20, moves, ability, ...extra });
};
// Batch 3 同款 makePvpState，另加 weather 参数（null=无天气）。
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

describe('Batch 5 — 着迷系统：迷人之躯与迟钝（T1–T13）', () => {
  test('T1: 迷人之躯接触触发使攻击方着迷并输出特性与状态事件（M+L）', () => {
    for (const E of [M, L]) {
      const atk = mk(E, 25, '静电');
      const def = mk(E, 35, '迷人之躯');
      const events = [];
      E.applyContactTrigger(atk, def, TACKLE, counting([0.1]), events, 'A', 'B', null);
      assert.equal(atk.infatuated, true);
      const abEv = events.find((e) => e.ability === '迷人之躯');
      const stEv = events.find((e) => e.kind === 'infatuation');
      assert.ok(abEv, 'missing 迷人之躯 event');
      assert.equal(abEv.text, '「迷人之躯」发动！皮皮 让 皮卡丘 着迷了！');
      assert.ok(stEv, 'missing infatuation status event');
      assert.equal(stEv.text, '皮卡丘 着迷了！');
    }
  });

  test('T2: 掷骰 >= 0.3 时迷人之躯不触发（M+L）', () => {
    for (const E of [M, L]) {
      const atk = mk(E, 25, '静电');
      const def = mk(E, 35, '迷人之躯');
      const events = [];
      E.applyContactTrigger(atk, def, TACKLE, counting([0.5]), events, 'A', 'B', null);
      assert.ok(!atk.infatuated);
      assert.equal(events.length, 0);
    }
  });

  test('T3: 非接触招式（火花特殊招、地震非接触物理招）不触发迷人之躯（M+L）', () => {
    for (const E of [M, L]) {
      for (const move of [EMBER, EARTHQUAKE]) {
        const atk = mk(E, 25, '静电');
        const def = mk(E, 35, '迷人之躯');
        const events = [];
        E.applyContactTrigger(atk, def, move, counting([0.1]), events, 'A', 'B', null);
        assert.ok(!atk.infatuated, `${move.name} should not trigger infatuation`);
        assert.equal(events.length, 0, `${move.name} should emit no events`);
      }
    }
  });

  test('T4: 防守方昏厥（hp=0）时不触发迷人之躯（M+L）', () => {
    for (const E of [M, L]) {
      const atk = mk(E, 25, '静电');
      const def = mk(E, 35, '迷人之躯');
      def.hp = 0;
      const events = [];
      E.applyContactTrigger(atk, def, TACKLE, counting([0.1]), events, 'A', 'B', null);
      assert.ok(!atk.infatuated);
      assert.equal(events.length, 0);
    }
  });

  test('T5: 迟钝挡下着迷，只出迟钝守卫事件且无迷人之躯特性事件（M+L）', () => {
    for (const E of [M, L]) {
      const atk = mk(E, 79, '迟钝');
      const def = mk(E, 35, '迷人之躯');
      const events = [];
      E.applyContactTrigger(atk, def, TACKLE, counting([0.1]), events, 'A', 'B', null);
      assert.ok(!atk.infatuated);
      const guardEv = events.find((e) => e.ability === '迟钝');
      assert.ok(guardEv, 'missing 迟钝 guard event');
      assert.equal(guardEv.text, '「迟钝」发动！呆呆兽 不会着迷！');
      assert.ok(!events.some((e) => e.ability === '迷人之躯'), 'must not emit 迷人之躯 event when blocked');
    }
  });

  test('T6: 着迷 50% 阻断行动（0.4 阻断、0.6 可行动）（M+L）', () => {
    for (const E of [M, L]) {
      const pet = mk(E, 25, '静电');
      pet.infatuated = true;
      assert.equal(E.statusBlocksAction(pet, counting([0.4])), 'infatuation');
      assert.strictEqual(E.statusBlocksAction(pet, counting([0.6])), null);
    }
  });

  test('T7: 着迷与中毒共存（D-0 决定性测试：不被挡也不覆盖 pet.status）（M+L）', () => {
    for (const E of [M, L]) {
      const atk = mk(E, 25, '静电');
      atk.status = { kind: 'poison' };
      const def = mk(E, 35, '迷人之躯');
      const events = [];
      E.applyContactTrigger(atk, def, TACKLE, counting([0.1]), events, 'A', 'B', null);
      assert.equal(atk.status?.kind, 'poison', 'poison status must be preserved');
      assert.equal(atk.infatuated, true, 'infatuated must coexist with poison');
    }
  });

  test('T8: 主动下场清除着迷并推解除事件，同时保留中毒状态（M+L）', () => {
    for (const E of [M, L]) {
      const pet = mk(E, 25, '静电');
      pet.infatuated = true;
      pet.status = { kind: 'poison' };
      const st = makePvpState(E, [pet, mk(E, 35, '迷人之躯')], mk(E, 7, '激流'));
      const ev = [];
      E.onPetLeavesField(st, 'A', pet, ev);
      assert.equal(pet.infatuated, false, 'infatuated should clear on switch out');
      assert.equal(pet.status?.kind, 'poison', 'poison should persist on switch out');
      const endEv = ev.find((e) => e.kind === 'infatuation-end');
      assert.ok(endEv, 'missing infatuation-end event');
      assert.equal(endEv.text, '皮卡丘 的着迷解除了！');
    }
  });

  test('T9: 昏厥清除着迷与持续状态（M+L）', () => {
    for (const E of [M, L]) {
      const pet = mk(E, 25, '静电');
      pet.infatuated = true;
      pet.status = { kind: 'poison' };
      E.clearPetBattleState(pet);
      assert.equal(pet.infatuated, false);
      assert.strictEqual(pet.status, null);
    }
  });

  test('T10: 飞毛腿与神奇鳞片不认着迷，仅认 pet.status（M+L）', () => {
    for (const E of [M, L]) {
      const quickPet = mk(E, 25, '飞毛腿');
      quickPet.infatuated = true;
      assert.equal(E.effectiveSpeed(quickPet, null), 41, 'Quick Feet must ignore infatuation');
      quickPet.status = { kind: 'poison' };
      assert.equal(E.effectiveSpeed(quickPet, null), 61.5, 'Quick Feet must trigger on poison');

      const atk = mk(E, 25, '静电');
      const opts = { chart: 'official', critRate: 0 };
      const defBase = mk(E, 35, '神奇鳞片');
      const defInfat = mk(E, 35, '神奇鳞片');
      defInfat.infatuated = true;
      const defPoison = mk(E, 35, '神奇鳞片');
      defPoison.status = { kind: 'poison' };

      const dmgBase = E.calcDamage(TACKLE, atk, defBase, R, opts).dmg;
      const dmgInfat = E.calcDamage(TACKLE, atk, defInfat, R, opts).dmg;
      const dmgPoison = E.calcDamage(TACKLE, atk, defPoison, R, opts).dmg;
      assert.equal(dmgInfat, dmgBase, 'Marvel Scale must ignore infatuation');
      assert.ok(dmgPoison < dmgBase, 'Marvel Scale must reduce physical damage on poison');
    }
  });

  test('T11: statusBlockedText 三态阻断文案精确匹配（M+L）', () => {
    for (const E of [M, L]) {
      assert.equal(E.statusBlockedText('sleep', '皮卡丘'), '皮卡丘 睡着了，不能行动！');
      assert.equal(E.statusBlockedText('paralysis', '皮卡丘'), '皮卡丘 麻痹了，动不了！');
      assert.equal(E.statusBlockedText('infatuation', '皮卡丘'), '皮卡丘 着迷了，无法行动！');
    }
  });

  test('T12: RNG 检定顺序固定为麻痹→着迷，麻痹阻断后不再为着迷掷骰（M+L）', () => {
    for (const E of [M, L]) {
      const pet = mk(E, 25, '静电');
      pet.status = { kind: 'paralysis' };
      pet.infatuated = true;

      const r1 = counting([0.5, 0.4]);
      assert.equal(E.statusBlocksAction(pet, r1), 'infatuation');
      assert.equal(r1.n, 2, 'paralysis check then infatuation check');

      const r2 = counting([0.1, 0.9]);
      assert.equal(E.statusBlocksAction(pet, r2), 'paralysis');
      assert.equal(r2.n, 1, 'must short-circuit after paralysis blocks');
    }
  });

  test('T13: 范围与红线守卫（abilityOf 4 处、三元 0 处、四处函数命中 infatuated）（M）', () => {
    const src = readBackendSource();
    assert.equal((src.match(/\babilityOf\(/g) || []).length, 4);
    assert.equal((src.match(/blocked === 'sleep' \?/g) || []).length, 0);
    assert.equal((src.match(/=== 'sleep' \? `\$\{/g) || []).length, 0);

    const sliceFn = (name) => {
      const start = src.indexOf(`function ${name}(`);
      assert.ok(start >= 0, `missing function ${name}`);
      const end = src.indexOf('\nfunction ', start + 1);
      return src.slice(start, end < 0 ? src.length : end);
    };
    for (const fnName of ['tryInflictInfatuation', 'statusBlocksAction', 'onPetLeavesField', 'clearPetBattleState']) {
      assert.match(sliceFn(fnName), /\.infatuated\b/, `missing infatuated reference in ${fnName}`);
    }
  });
});
