// 文件：tests/abilities-151-batch9.test.mjs
// Batch 9 — 复制／诅咒之躯（定身）／破格／化学变化气体（T1–T13）
// Claude 初稿（基线 main 434260a）。说明：DEX 实测 #127 凯罗斯首特性是怪力钳、#109/#110 首特性是飘浮，
// 破格／化学变化气体都是第二特性，所以相关宠一律显式传实例 ability；makePet 的 ability 参数缺省会回落首特性，
// 所以“不设 ability”时 pet.ability 也不是 undefined（任务单 §4.3 此处不准，已按实测写）。
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
const QUICK = { name: '电光一闪', type: '普通', power: 40, damage_class: 'physical' };
const SONIC = { name: '巨声', type: '普通', power: 90, damage_class: 'special' }; // SOUND_MOVES 内

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

const abilityEvents = (events, name) => (events || []).filter((e) => e.type === 'ability' && e.ability === name);

describe('Batch 9 — 复制／诅咒之躯／破格／化学变化气体（T1–T13）', () => {
  test('T1: 复制出场复制对手当前生效特性（实例特性，非首特性，与变身 R3 不同）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      // 开局即触发：A 先出场，复制 B 的静电。
      const a = mk(E, 137, '复制');
      const b = mk(E, 25, '静电');
      const st = makePvpState(E, a, b);
      assert.equal(a.ability, '静电', `${tag}: 开局复制到静电`);
      const open = abilityEvents(st.log, '复制');
      assert.equal(open.length, 1, `${tag}: 开局推 1 条复制事件`);
      assert.equal(open[0].text, `「复制」发动！${a.name} 复制了 ${b.name} 的「静电」！`, tag);

      // 直调 triggerSwitchIn：把 A 复位成复制再触发。
      a.ability = '复制';
      const events = [];
      E.triggerSwitchIn(st, 'A', events);
      assert.equal(a.ability, '静电', tag);
      assert.equal(abilityEvents(events, '复制').length, 1, tag);

      // 对照：B 的实例特性是避雷针（#25 首特性是静电），复制到避雷针——证复制读实例特性。
      const a2 = mk(E, 137, '复制');
      const b2 = mk(E, 25, '避雷针');
      makePvpState(E, a2, b2);
      assert.equal(M.abilityOf(25), '静电', 'sanity: #25 首特性是静电');
      assert.equal(a2.ability, '避雷针', `${tag}: 复制读实例特性而非首特性`);
    }
  });

  test('T2: 复制不复制被压制的特性（对手是化学变化气体）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const a = mk(E, 137, '复制');
      const gas = mk(E, 109, '化学变化气体');
      const st = makePvpState(E, a, gas);
      assert.equal(a.ability, '复制', `${tag}: 被压制时不改写 pet.ability`);
      assert.equal(abilityEvents(st.log, '复制').length, 0, `${tag}: 开局无复制事件`);
      const events = [];
      E.triggerSwitchIn(st, 'A', events);
      assert.equal(a.ability, '复制', tag);
      assert.equal(events.length, 0, `${tag}: 直调也无事件`);
    }
  });

  test('T3: 诅咒之躯 30% 定身（命中分支＋已定身不重复）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      assert.equal(typeof E.applyCursedBody, 'function', `${tag}: applyCursedBody 须导出`);
      const atk = mk(E, 25, '静电');
      const def = mk(E, 94, '诅咒之躯');
      const st = makePvpState(E, atk, def);
      assert.ok(!atk.disabledMove, `${tag}: 初始无定身`);

      // 掷骰 0.1 < 0.3：触发。
      const events = [];
      E.applyCursedBody(def, atk, '撞击', () => 0.1, events, 'B', 'A', st);
      assert.equal(atk.disabledMove, '撞击', tag);
      const ev = abilityEvents(events, '诅咒之躯');
      assert.equal(ev.length, 1, tag);
      assert.equal(ev[0].text, `「诅咒之躯」发动！${atk.name} 的「撞击」陷入了定身状态！`, tag);

      // 已定身：不重复触发、不推事件。
      const events2 = [];
      E.applyCursedBody(def, atk, '撞击', () => 0.1, events2, 'B', 'A', st);
      assert.equal(events2.length, 0, `${tag}: 已定身不重复推事件`);

      // 对照：掷骰 0.5 >= 0.3 不触发。
      const atk2 = mk(E, 25, '静电');
      const def2 = mk(E, 94, '诅咒之躯');
      const st2 = makePvpState(E, atk2, def2);
      const events3 = [];
      E.applyCursedBody(def2, atk2, '撞击', () => 0.5, events3, 'B', 'A', st2);
      assert.ok(!atk2.disabledMove, `${tag}: 0.5 不触发`);
      assert.equal(events3.length, 0, tag);

      // 对照：防守方不是诅咒之躯不触发。
      const atk3 = mk(E, 25, '静电');
      const def3 = mk(E, 52, '捡拾');
      const st3 = makePvpState(E, atk3, def3);
      E.applyCursedBody(def3, atk3, '撞击', () => 0.1, [], 'B', 'A', st3);
      assert.ok(!atk3.disabledMove, tag);
    }
  });

  test('T4: 定身招式服务端拒绝 MOVE_DISABLED（道馆＋PvP 即时＋PvP 两段式），换另一招正常（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const moves = [TACKLE, QUICK];

      // 道馆
      const stG = makeGymState(E, [mk(E, 25, '静电', moves)], [mk(E, 52, '捡拾')]);
      stG.sides.A.pets[0].disabledMove = '撞击';
      assert.deepEqual(E.resolveGymRound(stG, { moveName: '撞击' }, () => 0.5), { error: 'MOVE_DISABLED' }, `${tag}: 道馆`);
      const rg = E.resolveGymRound(stG, { moveName: '电光一闪' }, () => 0.5);
      assert.ok(!rg.error, `${tag}: 道馆换招正常 ${rg.error}`);

      // PvP 即时
      const stP = makePvpState(E, mk(E, 25, '静电', moves), mk(E, 52, '捡拾'));
      stP.sides.A.pets[0].disabledMove = '撞击';
      assert.deepEqual(E.applyBattleAction(stP, 'A', '撞击', () => 0.5), { error: 'MOVE_DISABLED' }, `${tag}: PvP 即时`);
      const rp = E.applyBattleAction(stP, 'A', '电光一闪', () => 0.5);
      assert.ok(!rp.error, `${tag}: PvP 即时换招正常 ${rp.error}`);

      // PvP 两段式预演
      const stS = makePvpState(E, mk(E, 25, '静电', moves), mk(E, 52, '捡拾'));
      stS.sides.A.pets[0].disabledMove = '撞击';
      assert.deepEqual(E.stagePvpAttack(stS, 'A', '撞击', () => 0.5), { error: 'MOVE_DISABLED' }, `${tag}: PvP 两段式`);
      const rs = E.stagePvpAttack(stS, 'A', '电光一闪', () => 0.5);
      assert.ok(!rs.error, `${tag}: PvP 两段式换招正常 ${rs.error}`);

      // 没学过的招仍报 MOVE_NOT_LEARNED（校验顺序：先 NOT_LEARNED 后 DISABLED）。
      assert.deepEqual(E.applyBattleAction(makePvpState(E, mk(E, 25, '静电', moves), mk(E, 52, '捡拾')), 'A', '没有这招', () => 0.5), { error: 'MOVE_NOT_LEARNED' }, tag);
    }
  });

  test('T5: 定身下场／昏厥清除（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const pet = mk(E, 25, '静电');
      const st = makePvpState(E, [pet, mk(E, 52, '捡拾')], mk(E, 94, '诅咒之躯'));
      pet.disabledMove = '撞击';
      E.onPetLeavesField(st, 'A', pet, []);
      assert.equal(pet.disabledMove, null, `${tag}: 下场清除`);
      pet.disabledMove = '撞击';
      E.clearPetBattleState(pet);
      assert.equal(pet.disabledMove, null, `${tag}: 昏厥清除`);
    }
  });

  test('T6: 破格绕过 calcDamage 防守特性（隔音）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const def = mk(E, 100, '隔音');
      const atk = mk(E, 127, '破格', [SONIC]);
      const r = E.calcDamage(SONIC, atk, def, () => 0.5);
      assert.ok(r.dmg > 0, `${tag}: 破格无视隔音 dmg=${r.dmg}`);
      assert.notEqual(r.mult, 0, tag);
      // 对照：#127 首特性（怪力钳）时巨声被隔音挡下。
      const atk2 = mk(E, 127, '怪力钳', [SONIC]);
      const r2 = E.calcDamage(SONIC, atk2, def, () => 0.5);
      assert.equal(r2.dmg, 0, `${tag}: 非破格被隔音免疫`);
      assert.equal(r2.mult, 0, tag);
    }
  });

  test('T7: 破格绕过防守方接触触发（静电）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const def = mk(E, 25, '静电');
      const atk = mk(E, 127, '破格');
      const st = makePvpState(E, atk, def);
      const events = [];
      E.applyContactTrigger(atk, def, TACKLE, () => 0.1, events, 'A', 'B', null, st);
      assert.equal(atk.status, null, `${tag}: 破格绕过静电`);
      assert.equal(events.length, 0, tag);

      // 对照：攻击方非破格（怪力钳）同条件触发麻痹。
      const atk2 = mk(E, 127, '怪力钳');
      const def2 = mk(E, 25, '静电');
      const st2 = makePvpState(E, atk2, def2);
      const events2 = [];
      E.applyContactTrigger(atk2, def2, TACKLE, () => 0.1, events2, 'A', 'B', null, st2);
      assert.equal(atk2.status && atk2.status.kind, 'paralysis', `${tag}: 对照应麻痹`);
    }
  });

  test('T8: 破格只绕过防守方特性——攻击方毒手照常，诅咒之躯被破格绕过（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      // 攻击方自己的特性不受破格影响：毒手照常触发（一只宠只有一个实例特性，故用 #52 毒手代表“攻击方自己的特性”）。
      const atk = mk(E, 52, '毒手');
      const def = mk(E, 25, '静电');
      const st = makePvpState(E, atk, def);
      const events = [];
      E.applyAttackerContactTrigger(atk, def, TACKLE, () => 0.1, events, 'A', 'B', null, st);
      assert.equal(def.status && def.status.kind, 'poison', `${tag}: 毒手照常中毒`);

      // 破格绕过诅咒之躯。
      const atk2 = mk(E, 127, '破格');
      const def2 = mk(E, 94, '诅咒之躯');
      const st2 = makePvpState(E, atk2, def2);
      E.applyCursedBody(def2, atk2, '撞击', () => 0.1, [], 'B', 'A', st2);
      assert.ok(!atk2.disabledMove, `${tag}: 破格绕过诅咒之躯`);
      // 对照：非破格被定身。
      const atk3 = mk(E, 127, '怪力钳');
      const def3 = mk(E, 94, '诅咒之躯');
      const st3 = makePvpState(E, atk3, def3);
      E.applyCursedBody(def3, atk3, '撞击', () => 0.1, [], 'B', 'A', st3);
      assert.equal(atk3.disabledMove, '撞击', tag);
    }
  });

  test('T9: 化学变化气体压制全场（含持有者），下场即恢复（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const gas = mk(E, 109, '化学变化气体');
      const backup = mk(E, 52, '捡拾');
      const foe = mk(E, 25, '威吓');
      const st = makePvpState(E, [gas, backup], foe);
      assert.equal(E.petAbility(foe, st), null, `${tag}: 对手特性被压制`);
      assert.equal(E.petAbility(gas, st), null, `${tag}: 持有者自己也被压制（K8）`);
      assert.equal(E.petAbility(foe), '威吓', `${tag}: 不传 st 走旧逻辑`);
      // 开局 B 的威吓被压制：A 攻击阶段不变，日志无特性事件。
      assert.equal(abilityEvents(st.log, '威吓').length, 0, tag);
      assert.equal(gas.stages.atk, 0, tag);
      const ev = [];
      E.triggerSwitchIn(st, 'B', ev);
      assert.equal(ev.length, 0, `${tag}: 压制期间 triggerSwitchIn 不触发`);

      // 持有者下场：特性恢复，B 再出场威吓生效。
      E.onPetLeavesField(st, 'A', gas, []);
      st.sides.A.activeIdx = 1;
      assert.equal(E.petAbility(foe, st), '威吓', `${tag}: 下场即恢复`);
      const ev2 = [];
      E.triggerSwitchIn(st, 'B', ev2);
      assert.equal(abilityEvents(ev2, '威吓').length, 1, tag);
      assert.equal(backup.stages.atk, -1, tag);
    }
  });

  test('T10: 化学变化气体压制 calcDamage（隔音），气体宠下场后恢复（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const gas = mk(E, 109, '化学变化气体', [SONIC]);
      const backup = mk(E, 25, '静电', [SONIC]);
      const def = mk(E, 100, '隔音');
      const st = makePvpState(E, [gas, backup], def);
      // 传 st：气体在场，隔音被压制，巨声打得进。
      const r = E.calcDamage(SONIC, gas, def, () => 0.5, { st });
      assert.ok(r.dmg > 0, `${tag}: 气体压制隔音 dmg=${r.dmg}`);
      // 对照：不传 st（旧逻辑）隔音生效——证明压制来自 st 线程，不是别处。
      const r0 = E.calcDamage(SONIC, gas, def, () => 0.5);
      assert.equal(r0.dmg, 0, `${tag}: 不传 st 时隔音照旧`);
      // 气体宠下场：隔音恢复。
      st.sides.A.activeIdx = 1;
      const r2 = E.calcDamage(SONIC, backup, def, () => 0.5, { st });
      assert.equal(r2.dmg, 0, `${tag}: 气体宠下场后隔音恢复`);
    }
  });

  test('T11: 化学变化气体压制回合末特性（雨盘）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      const rainDish = mk(E, 54, '雨盘');
      const gas = mk(E, 109, '化学变化气体');
      const foeBackup = mk(E, 52, '捡拾');
      const st = makePvpState(E, rainDish, [gas, foeBackup], 'A', 'rain');
      rainDish.hp = rainDish.maxHp - 30;
      const hp0 = rainDish.hp;
      const events = [];
      E.tickActiveStatuses(st, () => 0.5, events);
      assert.equal(rainDish.hp, hp0, `${tag}: 雨盘被压制不回复`);
      assert.equal(abilityEvents(events, '雨盘').length, 0, tag);

      // 对照：气体宠下场（B 切到备战宠）后回复 1/16。
      st.sides.B.activeIdx = 1;
      const events2 = [];
      E.tickActiveStatuses(st, () => 0.5, events2);
      assert.equal(rainDish.hp, hp0 + Math.floor(rainDish.maxHp / 16), `${tag}: 气体下场后雨盘回复 1/16`);
      assert.equal(abilityEvents(events2, '雨盘').length, 1, tag);
    }
  });

  test('T12: 复制到破格后绕过隔音（复制＋破格联动）（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      // 写死做法：开局触发复制；之后把 B 方上场宠切到 #100，直接 calcDamage（不重调 triggerSwitchIn）。
      const a = mk(E, 137, '复制', [TACKLE, SONIC]);
      const b1 = mk(E, 127, '破格');
      const b2 = mk(E, 100, '隔音');
      const st = makePvpState(E, a, [b1, b2]);
      assert.equal(a.ability, '破格', `${tag}: 开局复制到破格`);
      st.sides.B.activeIdx = 1;
      const r = E.calcDamage(SONIC, a, b2, () => 0.5, { st });
      assert.ok(r.dmg > 0, `${tag}: 复制来的破格绕过隔音 dmg=${r.dmg}`);
      // 对照：复制前（特性还是复制）隔音生效。
      a.ability = '复制';
      const r2 = E.calcDamage(SONIC, a, b2, () => 0.5, { st });
      assert.equal(r2.dmg, 0, `${tag}: 未复制到破格时隔音生效`);
    }
  });

  test('T13: 范围与红线守卫（M 读 src/index.js；L 读 engine-local）', async () => {
    const lines = (src, needle) => src.split('\n').filter((l) => l.includes(needle)).length;
    const funcBody = (src, header) => {
      const i = src.indexOf(header);
      assert.ok(i >= 0, `missing ${header}`);
      return src.slice(i, src.indexOf('\n}\n', i));
    };
    const m = await readBackendSource();
    assert.equal(lines(m, 'abilityOf('), 4, 'abilityOf( 恒为 4 行（R2）');
    assert.ok(lines(m, 'isGasActive') >= 2);
    assert.ok(lines(m, 'rawAbility') >= 3);
    assert.ok(lines(m, 'applyCursedBody') >= 2);
    assert.ok(lines(m, 'disabledMove') >= 6);
    assert.ok(lines(m, 'MOVE_DISABLED') >= 3);
    assert.ok(lines(m, "'破格'") >= 4);
    assert.ok(lines(m, "'复制'") >= 2);
    assert.ok(lines(m, "'诅咒之躯'") >= 2);
    assert.ok(lines(m, '化学变化气体') >= 2); // 不带引号计数（含注释）：代码里带引号的比较只有 isGasActive 一处
    assert.ok(lines(m, 'petAbility(pet, st)') >= 1);
    // 防递归红线：isGasActive 只能用 rawAbility，不得调 petAbility。
    assert.ok(!funcBody(m, 'function isGasActive(').includes('petAbility('), 'isGasActive 不得用 petAbility');
    assert.ok(funcBody(m, 'function isGasActive(').includes('rawAbility('), 'isGasActive 必须用 rawAbility');
    // 变身口径不变（R3）。
    assert.ok(m.includes('user.ability = abilityOf(target.no);'), 'applyTransform 口径不得改');

    const l = await readFile(assetPath('engine-local.js'), 'utf8');
    assert.equal(lines(l, 'abilityOf('), 4, 'L: abilityOf( 恒为 4 行');
    assert.ok(lines(l, 'isGasActive') >= 2);
    assert.ok(lines(l, 'rawAbility') >= 3);
    assert.ok(lines(l, 'applyCursedBody') >= 2);
    assert.ok(lines(l, 'MOVE_DISABLED') >= 3);
    assert.ok(!funcBody(l, 'function isGasActive(').includes('petAbility('), 'L: isGasActive 不得用 petAbility');
  });
});
