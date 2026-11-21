// tests/transform.test.mjs
// 变身（Transform，2026-11-17 用户批准）：百变怪 #132 的招式表已修正为只有变身（main b83cef8；
// 本分支只对齐百变怪一处，未整并招式表修正）；变身在战斗引擎里复制目标的种类/属性/能力值（除 HP 外）/
// 招式/第一特性，使用者自己的 HP 与等级不变，持续到换下场或战斗结束。
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';
import { readBackendSource } from './backend-src.mjs';

const M = await import(new URL('../src/index.js', import.meta.url));
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);

const HALF = () => 0.5;
const side = (childId, childName, pets) => ({ childId, childName, battleLevel: 18, activeIdx: 0, pets });

// 百变怪（Lv.18，有效等级 40）＋备战小火龙；馆主方大岩蛇（S1 王牌，Lv.13，有效 30）
function dittoPet() {
  return M.makePet({
    key: 'dex:132', name: '百变怪', type: '普通', no: 132, level: 40,
    defTypes: ['普通'], moves: [{ name: '变身', type: '普通', damage_class: '变化', power: 37 }],
  });
}
function onixPet() {
  const cfg = M.GYM_STAGES.find((g) => g.stage === 1);
  const ace = cfg.bossTeam[cfg.bossTeam.length - 1];
  return M.makePet({
    key: 'boss:95', name: '大岩蛇', type: '岩石', no: 95, level: M.effBossLevel(cfg),
    defTypes: M.bossDefTypes(95), hpMult: cfg.hpMult,
    moves: ace.moves.map(([n, t, p]) => ({ name: n, type: t, power: p })),
  });
}
function charmanderPet() {
  return M.makePet({
    key: 'dex:4', name: '小火龙', type: '火', no: 4, level: 40,
    defTypes: ['火'], moves: [{ name: '火花', type: '火', power: 40 }],
  });
}
function gymState() {
  const st = M.createBattleState({
    mode: 'gym', firstSide: 'A',
    sides: {
      A: side(1, '玩家', [dittoPet(), charmanderPet()]),
      B: side(null, '馆主', [onixPet()]),
    },
  });
  st.gym.friendship = 0;
  return st;
}

describe('变身（Transform）', () => {
  test('百变怪招式表只有变身；moveEffectOf（变身）= transform', () => {
    assert.deepEqual(M.COLLECTION_LEARNSET[132].map(([lv, n]) => [lv, n]), [[2, '变身']]);
    assert.equal(M.collectionMovesFor({ move_levels: '{}' }, 132, 20).map((m) => m.name).join(','), '变身');
    assert.equal(M.moveEffectOf('变身'), 'transform');
    assert.deepEqual(M.MOVES_OFFICIAL['变身'], { type: '普通', damage_class: '变化' });
  });

  test('applyTransform：复制种类/属性/能力值/招式/特性，HP 与等级不变', () => {
    const user = dittoPet();
    const target = onixPet();
    const hpBefore = user.hp;
    const maxHpBefore = user.maxHp;
    const statsBefore = { ...user.stats };
    const copied = M.applyTransform(user, target);
    assert.deepEqual(copied, { no: 95, name: '大岩蛇' });
    assert.equal(user.no, 95);
    assert.equal(user.name, '大岩蛇');
    assert.equal(user.type, '岩石');
    assert.deepEqual(user.defTypes, ['岩石', '地面']);
    assert.deepEqual(user.moves.map((m) => m.name), ['落石', '击落', '撞击']);
    assert.equal(user.ability, '坚硬脑袋'); // 大岩蛇第一特性
    assert.equal(user.hp, hpBefore);
    assert.equal(user.maxHp, maxHpBefore);
    assert.equal(user.level, 40); // 等级不变
    assert.equal(user.stats.hp, statsBefore.hp); // HP 能力值不复制
    assert.notEqual(user.stats.defense, statsBefore.defense); // 防御按大岩蛇种族值重算
    assert.equal(user.stats.defense, M.statsFor(95, 40).defense);
    assert.equal(user.stats.speed, M.statsFor(95, 40).speed);
    assert.equal(user.key, 'dex:132'); // 身份不变
  });

  test('revertTransform：还原种类/属性/能力值/招式/特性', () => {
    const user = dittoPet();
    const target = onixPet();
    M.applyTransform(user, target);
    assert.equal(M.revertTransform(user), true);
    assert.equal(user.no, 132);
    assert.equal(user.name, '百变怪');
    assert.equal(user.type, '普通');
    assert.deepEqual(user.defTypes, ['普通']);
    assert.deepEqual(user.moves.map((m) => m.name), ['变身']);
    assert.equal(user.ability, '柔软'); // 百变怪第一特性
    assert.equal(M.revertTransform(user), false); // 未变身时返回 false
  });

  test('道馆回合：百变怪用变身→变成大岩蛇、0 伤害、变身事件；下回合可用复制招式落石', () => {
    const st = gymState();
    const ditto = st.sides.A.pets[0];
    const hpBefore = ditto.hp;
    const r = M.resolveGymRound(st, { moveName: '变身' }, HALF);
    assert.equal(r.error, undefined, JSON.stringify(r));
    const tf = r.events.find((e) => e.kind === 'transform');
    assert.ok(tf, JSON.stringify(r.events));
    assert.match(tf.text, /变成了 大岩蛇 的样子/);
    assert.equal(ditto.no, 95);
    assert.equal(ditto.name, '大岩蛇');
    // 变身 0 伤害：本回合玩家方无攻击事件（HP 若变化只来自馆主同回合的攻击——大岩蛇的岩石招打岩石/地面为 0.25 倍，仅 1 点）
    assert.equal(r.events.find((e) => e.type === 'attack' && e.side === 'A'), undefined);
    assert.ok(ditto.hp >= hpBefore - 1, `变身后 HP 应只减馆主攻击的伤害，实际 ${ditto.hp}/${hpBefore}`);
    // 下回合：变身后的百变怪可用复制来的落石（岩石克火）
    const r2 = M.resolveGymRound(st, { moveName: '落石' }, HALF);
    assert.equal(r2.error, undefined, JSON.stringify(r2));
    const atk = r2.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(atk, JSON.stringify(r2.events));
    assert.equal(atk.move, '落石');
    assert.ok(atk.dmg > 0, `复制招式应造成伤害，实际 ${atk.dmg}`);
  });

  test('变身后攻击按复制的属性结算：落石（岩石）打火系小火龙 2 倍', () => {
    // 直接用 applyBattleAction：百变怪先变身成大岩蛇，再对火系目标用落石
    const user = dittoPet();
    const fire = M.makePet({
      key: 'boss:4', name: '小火龙', type: '火', no: 4, level: 30,
      defTypes: ['火'], moves: [{ name: '火花', type: '火', power: 40 }],
    });
    const st = M.createBattleState({
      mode: 'gym', firstSide: 'A',
      sides: { A: side(1, '玩家', [user]), B: side(null, '馆主', [onixPet()]) },
    });
    const r = M.applyBattleAction(st, 'A', '变身', HALF);
    assert.equal(r.events.find((e) => e.kind === 'transform')?.kind, 'transform');
    // 换目标为火系再打落石（用新对局，避免馆主大岩蛇干扰）
    const st2 = M.createBattleState({
      mode: 'gym', firstSide: 'A',
      sides: { A: side(1, '玩家', [user]), B: side(null, '馆主', [fire]) },
    });
    const r2 = M.applyBattleAction(st2, 'A', '落石', HALF);
    const atk = r2.events.find((e) => e.type === 'attack');
    assert.ok(atk, JSON.stringify(r2.events));
    assert.equal(atk.mult, 2); // 岩石克火
    assert.equal(atk.superEffective, true);
    assert.ok(atk.dmg > 0);
  });

  test('换下场还原：变身后换小火龙上场，百变怪恢复原形', () => {
    const st = gymState();
    M.resolveGymRound(st, { moveName: '变身' }, HALF);
    assert.equal(st.sides.A.pets[0].no, 95);
    const r = M.resolveGymRound(st, { swapToIdx: 1 }, HALF);
    assert.equal(r.error, undefined, JSON.stringify(r));
    assert.equal(st.sides.A.activeIdx, 1);
    const ditto = st.sides.A.pets[0]; // 已下场
    assert.equal(ditto.no, 132);
    assert.equal(ditto.name, '百变怪');
    assert.deepEqual(ditto.moves.map((m) => m.name), ['变身']);
    assert.equal(ditto.transformBackup, undefined);
  });

  test('昏厥还原：变身后倒下，clearPetBattleState 恢复原形', () => {
    const user = dittoPet();
    const target = onixPet();
    M.applyTransform(user, target);
    assert.equal(user.no, 95);
    user.hp = 0;
    M.clearPetBattleState(user);
    assert.equal(user.no, 132);
    assert.equal(user.name, '百变怪');
    assert.deepEqual(user.moves.map((m) => m.name), ['变身']);
  });

  test('服务端/本地引擎一致：applyTransform 与 revertTransform 逐字相同，本地引擎变身行为一致', async () => {
    const { readFileSync } = await import('node:fs');
    const { default: path } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const { readdirSync } = await import('node:fs');
    const engines = readdirSync(path.join(dir, '../public/static')).filter((f) => /^engine-local\.[0-9a-f]+\.js$/.test(f));
    assert.equal(engines.length, 1);
    const serverSrc = readBackendSource();
    const engineSrc = readFileSync(path.join(dir, '../public/static', engines[0]), 'utf8');
    const grab = (src, name) => {
      const i = src.indexOf(`function ${name}`);
      const j = src.indexOf('{', i);
      let depth = 0;
      for (let k = j; k < src.length; k++) {
        if (src[k] === '{') depth++;
        else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(i, k + 1); }
      }
      return null;
    };
    assert.equal(grab(engineSrc, 'applyTransform'), grab(serverSrc, 'applyTransform'));
    assert.equal(grab(engineSrc, 'revertTransform'), grab(serverSrc, 'revertTransform'));
    // 本地引擎同样能变身
    const user = L.makePet({
      key: 'dex:132', name: '百变怪', type: '普通', no: 132, level: 40,
      defTypes: ['普通'], moves: [{ name: '变身', type: '普通', damage_class: '变化', power: 37 }],
    });
    const target = L.makePet({
      key: 'boss:95', name: '大岩蛇', type: '岩石', no: 95, level: 30,
      defTypes: ['岩石', '地面'], hpMult: 3, moves: [{ name: '落石', type: '岩石', power: 50 }],
    });
    const copied = L.applyTransform(user, target);
    assert.deepEqual(copied, { no: 95, name: '大岩蛇' });
    assert.equal(user.no, 95);
    assert.deepEqual(user.moves.map((m) => m.name), ['落石']);
    assert.equal(L.moveEffectOf('变身'), 'transform');
  });

  test('变身对自己/无目标不生效，不抛错', () => {
    const user = dittoPet();
    assert.equal(M.applyTransform(user, user), null);
    assert.equal(M.applyTransform(user, null), null);
    assert.equal(M.applyTransform(null, onixPet()), null);
    assert.equal(M.revertTransform(null), false);
    assert.equal(user.no, 132); // 未变身
  });
});
