/* 特性 151 Batch 0（特性模型地基）：node --test tests/abilities-151-batch0.test.mjs
 * 覆盖：petAbility 回落、makePet ability 参数、rollInstanceAbility 各 source 分支、迁移 0043、
 * ensurePetInstance 掷出与不追溯、3 处抓捕成功点建 'catch' 实例、14 处调用点替换后行为不变、
 * 实例特性≠首特性时引擎读实例特性（M/L 双端）、建造路径取实例特性（含伊布线守卫）。
 * 脚手架：M 来自 ../src/index.js；L 经 asset-path.mjs 取离线端 bundle；seeded LCG 与 gate.test.mjs 同款（固定种子，结果确定）；
 * DB 与 HTTP 部分仿 wild-capture.test.mjs（node:sqlite 内存库＋真实 fetch 驱动）。 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { assetPath } from './asset-path.mjs';
import { readBackendSource } from './backend-src.mjs';

const M = await import(new URL('../src/index.js', import.meta.url));
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);

const seeded = (s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const R = () => 0.5;
const OFF = { chart: 'official', critRate: 0 };
const TACKLE = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' };
const THUNDERBOLT = { name: '十万伏特', type: '电', power: 40, damage_class: 'special' };
const QUAKE = { name: '地震', type: '地面', power: 100, damage_class: 'physical' };
// 真实数据（DEX_DETAILS）：19 逃跑/毅力/活力(隐)；25 静电/避雷针(隐)；35 迷人之躯/魔法防守/友情防守(隐)；
// 11 蜕皮（仅 1 条、无隐藏）；1 茂盛/叶绿素(隐)（1 条普通＋1 隐藏）。
const mk = (E, no, ability, moves = [TACKLE], extra = {}) => {
  const sp = E.SPECIES[no];
  return E.makePet({ key: `p${no}`, name: sp ? sp.name : `#${no}`, type: sp ? sp.type : '普通', no, defTypes: E.playerDefTypes(no), level: 20, moves, ability, ...extra });
};

describe('Batch 0 — 纯函数与引擎读数（服务端 M）', () => {
  test('T1: petAbility 在 pet.ability 非空时返回实例特性而非首特性', () => {
    assert.equal(M.abilityOf(25), '静电');
    assert.equal(M.petAbility({ no: 25, ability: '避雷针' }), '避雷针');
  });

  test('T2: petAbility 在 ability 缺失/null/空串时回落首特性；pet 为 null/undefined 返回 null（不抛错）', () => {
    assert.equal(M.petAbility({ no: 25, ability: null }), '静电');
    assert.equal(M.petAbility({ no: 25, ability: undefined }), '静电');
    assert.equal(M.petAbility({ no: 25, ability: '' }), '静电');
    assert.equal(M.petAbility({ no: 25 }), '静电');
    assert.strictEqual(M.petAbility(null), null);
    assert.strictEqual(M.petAbility(undefined), null);
    assert.strictEqual(M.abilityOf(null), null); // 依据：abilityOf 对 null 返回 null，不抛错
  });

  test('T3: makePet 的 ability 参数传入优先，不传回落首特性（不校验是否在 DEX 内）', () => {
    assert.equal(mk(M, 25, '避雷针').ability, '避雷针');
    assert.equal(mk(M, 25).ability, '静电');
    assert.equal(mk(M, 25, '').ability, '静电');
    assert.equal(mk(M, 25, '随便写的特性').ability, '随便写的特性');
  });

  test('T4: rollInstanceAbility：main/gift 固定首特性；egg 走 K1（45/45/10）', () => {
    assert.equal(M.rollInstanceAbility(19, 'main', seeded(1)), '逃跑');
    assert.equal(M.rollInstanceAbility(19, 'main', seeded(999)), '逃跑');
    assert.equal(M.rollInstanceAbility(19, 'gift', seeded(7)), '逃跑');
    const rng = seeded(42);
    const counts = { 迷人之躯: 0, 魔法防守: 0, 友情防守: 0 };
    for (let i = 0; i < 2000; i++) {
      const ab = M.rollInstanceAbility(35, 'egg', rng);
      assert.ok(ab in counts, `unexpected ability ${ab}`);
      counts[ab]++;
    }
    assert.ok(counts.迷人之躯 > 700 && counts.迷人之躯 < 1100, JSON.stringify(counts));
    assert.ok(counts.魔法防守 > 700 && counts.魔法防守 < 1100, JSON.stringify(counts));
    assert.ok(counts.友情防守 > 100 && counts.友情防守 < 300, JSON.stringify(counts));
  });

  test('T5: catch 分支在两条普通特性间 50/50', () => {
    const rng = seeded(123);
    const counts = { 逃跑: 0, 毅力: 0 };
    for (let i = 0; i < 200; i++) {
      const ab = M.rollInstanceAbility(19, 'catch', rng);
      assert.ok(ab in counts, `unexpected ability ${ab}`);
      counts[ab]++;
    }
    assert.ok(counts.逃跑 >= 80 && counts.逃跑 <= 120, JSON.stringify(counts));
    assert.ok(counts.毅力 >= 80 && counts.毅力 <= 120, JSON.stringify(counts));
  });

  test('T6: catch 分支永不掷出隐藏特性', () => {
    const rng = seeded(77);
    for (let i = 0; i < 200; i++) {
      const ab = M.rollInstanceAbility(35, 'catch', rng);
      assert.ok(ab === '迷人之躯' || ab === '魔法防守', `got ${ab}`);
    }
    for (let i = 0; i < 50; i++) assert.notEqual(M.rollInstanceAbility(19, 'catch', seeded(i + 1)), '活力');
  });

  test('T7: catch 分支只有 1 条普通特性时恒返回它（含有/无隐藏特性两种）', () => {
    for (let i = 0; i < 200; i++) {
      assert.equal(M.rollInstanceAbility(11, 'catch', seeded(i + 1)), '蜕皮'); // 1 普通、无隐藏
      assert.equal(M.rollInstanceAbility(1, 'catch', seeded(i + 1)), '茂盛'); // 1 普通＋隐藏叶绿素，隐藏不进池
    }
  });

  test('T8: 默认分支（45/45/10）三种槽位都能掷出且落在分布区间（egg 与另一个 source 各一遍）', () => {
    for (const src of ['egg', 'other']) {
      const rng = seeded(2026);
      const counts = { 迷人之躯: 0, 魔法防守: 0, 友情防守: 0 };
      for (let i = 0; i < 2000; i++) {
        const ab = M.rollInstanceAbility(35, src, rng);
        assert.ok(ab in counts, `unexpected ability ${ab}`);
        counts[ab]++;
      }
      assert.ok(counts.迷人之躯 > 700 && counts.迷人之躯 < 1100, `${src} ${JSON.stringify(counts)}`);
      assert.ok(counts.魔法防守 > 700 && counts.魔法防守 < 1100, `${src} ${JSON.stringify(counts)}`);
      assert.ok(counts.友情防守 > 100 && counts.友情防守 < 300, `${src} ${JSON.stringify(counts)}`);
    }
  });

  test('T9: 默认分支缺第二特性/缺隐藏特性时该档回落首特性', () => {
    // 11：只有蜕皮（无第二、无隐藏）→ 恒首特性
    const rng1 = seeded(11);
    for (let i = 0; i < 2000; i++) assert.equal(M.rollInstanceAbility(11, 'egg', rng1), '蜕皮');
    // 1：茂盛＋隐藏叶绿素（无第二普通特性）→ 0.45–0.90 档回落首特性，≥0.90 档为隐藏
    assert.equal(M.rollInstanceAbility(1, 'egg', () => 0.2), '茂盛');
    assert.equal(M.rollInstanceAbility(1, 'egg', () => 0.6), '茂盛');
    assert.equal(M.rollInstanceAbility(1, 'egg', () => 0.95), '叶绿素');
    // 19：三槽位边界
    assert.equal(M.rollInstanceAbility(19, 'egg', () => 0.449), '逃跑');
    assert.equal(M.rollInstanceAbility(19, 'egg', () => 0.45), '毅力');
    assert.equal(M.rollInstanceAbility(19, 'egg', () => 0.899), '毅力');
    assert.equal(M.rollInstanceAbility(19, 'egg', () => 0.9), '活力');
    // 无数据物种
    assert.strictEqual(M.rollInstanceAbility(99999, 'egg', R), null);
  });

  test('T10: 实例特性＝首特性时，替换后的读数点输出与替换前一致（真实首特性物种、不显式传 ability）', () => {
    // calcDamage：飘浮（92 鬼斯）免疫地面
    const gastly = mk(M, 92);
    assert.equal(gastly.ability, '飘浮');
    const rock = mk(M, 74, undefined, [QUAKE]);
    const d1 = M.calcDamage(QUAKE, rock, gastly, R, OFF);
    assert.equal(d1.dmg, 0);
    assert.equal(d1.ability[0].name, '飘浮');
    // changeStage：恒净之躯（72）挡降档
    const jelly = mk(M, 72);
    assert.deepEqual(M.changeStage(jelly, 'atk', -1), { applied: false, blocked: true, guard: '恒净之躯', from: 0, to: 0 });
    assert.equal(jelly.stages.atk, 0);
    // statusImmunityReason：免疫（143）挡中毒 → 'ability'（返回 'type'/'ability'/null，不是特性名）
    const snorlax = mk(M, 143);
    assert.equal(M.statusImmunityReason(snorlax, 'poison'), 'ability');
    assert.equal(M.statusImmunityReason(mk(M, 16), 'poison'), null);
    // applyContactTrigger：静电（25）30% 麻痹（rng 0.1 触发；签名 atk, def, move, rng, events, atkSide, defSide）
    const pika = mk(M, 25);
    const rattata = mk(M, 19);
    const evs = [];
    M.applyContactTrigger(rattata, pika, TACKLE, () => 0.1, evs, 'A', 'B');
    assert.deepEqual(rattata.status, { kind: 'paralysis' });
    assert.equal(evs.length, 2);
    // settleStatusTick：蜕皮（11）回合末 1/3 治愈（签名 pet, rng, events, side；rng 0.1 < 1/3）
    const metapod = mk(M, 11);
    metapod.status = { kind: 'paralysis' };
    const r = M.settleStatusTick(metapod, () => 0.1, [], 'A');
    assert.equal(r.cured, true);
    assert.strictEqual(metapod.status, null);
    // effectiveSpeed：叶绿素（首特性，如 43 走路草）晴天 ×2
    const oddish = mk(M, 43);
    assert.equal(oddish.ability, '叶绿素');
    assert.equal(M.effectiveSpeed(oddish, 'sun'), M.effectiveSpeed(oddish, null) * 2);
    // triggerSwitchIn：威吓（23）出场降对方 1 档攻击
    const ekans = mk(M, 23);
    const foe = mk(M, 16);
    const st = { sides: { A: { activeIdx: 0, pets: [ekans] }, B: { activeIdx: 0, pets: [foe] } } };
    M.triggerSwitchIn(st, 'A', []);
    assert.equal(foe.stages.atk, -1);
  });

  test('T11: 实例特性≠首特性时，引擎读实例特性而非首特性（M 与 L 双端）', () => {
    for (const E of [M, L]) {
      // ① 25 皮卡丘实例特性为隐藏槽位「避雷针」→ 电招免疫；条目带升档，经 applyAbilityStages 后特攻 +1
      const pikaRod = mk(E, 25, '避雷针');
      const foe = mk(E, 100, undefined, [THUNDERBOLT]);
      const r = E.calcDamage(THUNDERBOLT, foe, pikaRod, R, OFF);
      assert.equal(r.dmg, 0);
      assert.deepEqual(r.ability[0].stage, { key: 'spa', delta: 1 });
      E.applyAbilityStages(pikaRod, r.ability);
      assert.equal(pikaRod.stages.spa, 1);
      // 对照：首特性静电的皮卡丘吃电招不免疫
      assert.ok(E.calcDamage(THUNDERBOLT, foe, mk(E, 25), R, OFF).dmg > 0);

      // ② 19 小拉达实例特性为第二槽位「毅力」，灼伤打物理招：毅力 ×1.5 且无视灼伤减半，对照首特性「逃跑」吃灼伤 ×0.5
      const ratGuts = mk(E, 19, '毅力');
      const ratRun = mk(E, 19, '逃跑');
      ratGuts.status = { kind: 'burn' };
      ratRun.status = { kind: 'burn' };
      const target = mk(E, 143);
      const dmgGuts = E.calcDamage(TACKLE, ratGuts, target, R, OFF).dmg;
      const dmgRun = E.calcDamage(TACKLE, ratRun, target, R, OFF).dmg;
      // 净倍率约 1.5 / 0.5 = 3 倍（取整误差内）；区间断言
      assert.ok(dmgGuts >= dmgRun * 2.5 && dmgGuts <= dmgRun * 3.5, `Guts ${dmgGuts} vs RunAway ${dmgRun}`);
    }
  });

  test('T12: 范围守卫 — src/index.js 中 abilityOf( 仅剩 4 处（定义＋petAbility 回落＋makePet 回落＋applyTransform；变身永远复制首特性，用户 2026-11-18 定）', () => {
    const code = readBackendSource();
    assert.equal((code.match(/\babilityOf\(/g) || []).length, 4);
    const local = readFileSync(assetPath('engine-local.js'), 'utf8');
    assert.equal((local.match(/\babilityOf\(/g) || []).length, 4);
  });
});

// ---- DB / HTTP 脚手架（仿 wild-capture.test.mjs）----
const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0026_rare_wheel.sql', '0027_daily_english.sql', '0028_care_wheel.sql', '0029_daily_english_assess.sql', '0030_daily_chinese.sql', '0031_daily_math.sql'];
const MIG_0043 = '0043_pet_instances_ability.sql';
const readMig = (f) => readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8');

function makeEnv(files) {
  const raw = new DatabaseSync(':memory:');
  for (const f of files) raw.exec(readMig(f));
  const wrap = (sql) => ({
    _args: [],
    bind(...args) { this._args = args; return this; },
    async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
    async all() { return { results: raw.prepare(sql).all(...this._args) }; },
    async run() {
      const r = raw.prepare(sql).run(...this._args);
      return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  const db = { prepare: (sql) => wrap(sql), async batch(stmts) { for (const s of stmts) await s.run(); return []; } };
  return { env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>') } }, raw, db };
}
const instRow = (raw, childId, lineKey) => raw.prepare('SELECT * FROM pet_instances WHERE child_id=? AND line_key=?').get(childId, lineKey);

describe('Batch 0 — 迁移与 ensurePetInstance（T13–T17）', () => {
  test('T13: 迁移 0043 加可空 ability TEXT 列；0043 之前插入的旧行读出为 NULL', () => {
    const { raw } = makeEnv(MIGRATIONS);
    const now = Math.floor(Date.now() / 1000);
    raw.prepare(`INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, branch, source, egg_id, evolved_via, has_been_main, created_epoch, updated_epoch)
      VALUES(1, 'pikachu', 172, 0, NULL, 'main', NULL, NULL, 1, ?, ?)`).run(now, now);
    assert.equal(raw.prepare('PRAGMA table_info(pet_instances)').all().some((c) => c.name === 'ability'), false);
    raw.exec(readMig(MIG_0043));
    const col = raw.prepare('PRAGMA table_info(pet_instances)').all().find((c) => c.name === 'ability');
    assert.ok(col);
    assert.equal(col.type.toUpperCase(), 'TEXT');
    assert.equal(col.notnull, 0);
    assert.strictEqual(instRow(raw, 1, 'pikachu').ability, null);
  });

  test('T14: catch 建实例按 50/50 掷出并落库；再次调用返回同一行不重掷', async () => {
    const { db, raw } = makeEnv([...MIGRATIONS, MIG_0043]);
    const a = await M.ensurePetInstance(db, 1, 'species:19', '2026-11-18', 'catch', () => 0.8);
    assert.equal(a.ability, '毅力');
    assert.equal(a.source, 'catch');
    assert.equal(a.species_no, 19);
    assert.equal(a.has_been_main, 0);
    const again = await M.ensurePetInstance(db, 1, 'species:19', '2026-11-18', 'catch', () => 0.1);
    assert.equal(again.ability, '毅力');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM pet_instances WHERE child_id=1').get().n, 1);
    const b = await M.ensurePetInstance(db, 1, 'species:35', '2026-11-18', 'catch', () => 0.1);
    assert.equal(b.ability, '迷人之躯');
  });

  test('T15: main 建实例固定首特性，与 rng 无关；5 参旧调用（不传 rng）仍可用', async () => {
    const { db } = makeEnv([...MIGRATIONS, MIG_0043]);
    const a = await M.ensurePetInstance(db, 1, 'bulbasaur', '2026-11-18', 'main', () => 0.99);
    assert.equal(a.ability, '茂盛');
    assert.equal(a.has_been_main, 1);
    const b = await M.ensurePetInstance(db, 2, 'bulbasaur', '2026-11-18', 'main', () => 0.01);
    assert.equal(b.ability, '茂盛');
    // pikachu 线首形态是 172（皮丘），首特性静电
    const c = await M.ensurePetInstance(db, 1, 'pikachu', '2026-11-18');
    assert.equal(c.species_no, 172);
    assert.equal(c.ability, '静电');
  });

  test('T16: 已获得不追溯——旧 NULL 行再调用 ensurePetInstance 保持 NULL，不补掷', async () => {
    const { db, raw } = makeEnv([...MIGRATIONS, MIG_0043]);
    const now = Math.floor(Date.now() / 1000);
    raw.prepare(`INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, branch, source, egg_id, evolved_via, has_been_main, created_epoch, updated_epoch)
      VALUES(1, 'bulbasaur', 1, 0, NULL, 'main', NULL, NULL, 1, ?, ?)`).run(now, now);
    const legacy = await M.ensurePetInstance(db, 1, 'bulbasaur', '2026-11-18', 'main', () => 0.1);
    assert.strictEqual(legacy.ability, null);
    const legacyEgg = await M.ensurePetInstance(db, 1, 'bulbasaur', '2026-11-18', 'egg', () => 0.95);
    assert.strictEqual(legacyEgg.ability, null);
    assert.strictEqual(instRow(raw, 1, 'bulbasaur').ability, null);
  });

  test('T17: egg 建实例（孵化时刻）按 K1 掷出且幂等；三个槽位都可达', async () => {
    const { db } = makeEnv([...MIGRATIONS, MIG_0043]);
    const slots = [[0.1, '迷人之躯'], [0.6, '魔法防守'], [0.95, '友情防守']];
    let child = 10;
    for (const [r, want] of slots) {
      const inst = await M.ensurePetInstance(db, ++child, 'species:35', '2026-11-18', 'egg', () => r);
      assert.equal(inst.ability, want);
      assert.equal(inst.source, 'egg');
      const again = await M.ensurePetInstance(db, child, 'species:35', '2026-11-18', 'egg', () => 0.1);
      assert.equal(again.ability, want);
    }
  });
});

describe('Batch 0 — 抓捕成功点建实例（T18，HTTP 端到端）', () => {
  let env, raw, c1;
  async function call(path, { body, cookie } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers.Cookie = cookie;
    const res = await M.default.fetch(new Request('https://test.local' + path, { method: 'POST', headers, body: body !== undefined ? JSON.stringify(body) : undefined }), env);
    const sc = res.headers.get('set-cookie');
    return { status: res.status, j: await res.json().catch(() => ({})), cookie: sc ? sc.split(';')[0] : cookie };
  }
  let rid = 0;
  const reqId = () => `req-${Date.now()}-${++rid}`;
  const newEnc = (no, name) => Number(raw.prepare('INSERT INTO encounters(child_id,date,pokemon_no,name) VALUES(1,?,?,?)').run(M.shDateStr(), no, name).lastInsertRowid);
  const answerOf = (qid) => raw.prepare('SELECT answer_idx FROM quiz_questions WHERE id=?').get(qid).answer_idx;

  beforeEach(async () => {
    ({ env, raw } = makeEnv([...MIGRATIONS, MIG_0043]));
    const pin = await call('/api/parent/login', { body: { pin: '0000' } });
    await call('/api/parent/settings/update', { cookie: pin.cookie, body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] } });
    c1 = (await call('/api/child/login', { body: { childId: 1, password: '1111' } })).cookie;
    raw.prepare('UPDATE children SET total_xp=5000, balls=9, balls_super=9, balls_hyper=9, balls_master=5 WHERE id=1').run();
    for (let i = 1; i <= 40; i++) {
      raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,chapter) VALUES('study',3,'数学',?,'[\"对的\",\"错的\",\"不知道\",\"跳过\"]',0,'解析',1,0,0,NULL)").run(`题${i}`);
    }
  });
  afterEach(() => { delete globalThis.__wildRng; });

  test('③ 野外战斗扔球（有 requestId）：抓到才建 species:{no} 实例，source=catch，特性取自注入 rng（0.8→第二条毅力）', async () => {
    const id = newEnc(19, '小拉达');
    assert.equal(instRow(raw, 1, 'species:19'), undefined, '抓到之前无实例');
    globalThis.__wildRng = () => 0.8; // 骰值 80：普通球 25% 不中
    const miss = await call('/api/encounter/throw', { cookie: c1, body: { encounterId: id, ball: 'master', requestId: reqId() } });
    assert.equal(miss.j.ok, true, JSON.stringify(miss.j));
    assert.equal(miss.j.caught, true); // 大师球必中
    const inst = instRow(raw, 1, 'species:19');
    assert.ok(inst);
    assert.equal(inst.source, 'catch');
    assert.equal(inst.species_no, 19);
    assert.equal(inst.has_been_main, 0);
    assert.equal(inst.ability, '毅力');
  });

  test('③ 野外扔球未抓到：不建实例', async () => {
    const id = newEnc(19, '小拉达');
    const p = await call('/api/encounter/pending', { cookie: c1, body: { childId: 1, wild: true } });
    const s = await call('/api/encounter/start', { cookie: c1, body: { encounterId: id, leadNo: p.j.encounter.prebattle.party[0].no } });
    assert.equal(s.j.ok, true, JSON.stringify(s.j));
    globalThis.__wildRng = () => 0.99;
    const t = await call('/api/encounter/throw', { cookie: c1, body: { encounterId: id, ball: 'normal', requestId: reqId() } });
    assert.equal(t.j.caught, false);
    assert.equal(instRow(raw, 1, 'species:19'), undefined);
  });

  test('① 旧接口大师球即时抓（无 requestId）：建 catch 实例，特性为两条普通特性之一', async () => {
    const id = newEnc(35, '皮皮');
    const t = await call('/api/encounter/throw', { cookie: c1, body: { encounterId: id, ball: 'master' } });
    assert.equal(t.j.ok, true, JSON.stringify(t.j));
    const inst = instRow(raw, 1, 'species:35');
    assert.ok(inst, JSON.stringify(t.j));
    assert.equal(inst.source, 'catch');
    assert.ok(inst.ability === '迷人之躯' || inst.ability === '魔法防守', `got ${inst.ability}`);
  });

  test('② 旧问答遭遇（无 requestId，答对抓到）：建 catch 实例；抓到同物种第二次不重掷', async () => {
    const id = newEnc(19, '小拉达');
    const t = await call('/api/encounter/throw', { cookie: c1, body: { encounterId: id, ball: 'normal' } });
    assert.equal(t.j.ok, true, JSON.stringify(t.j));
    const answers = t.j.questions.map((q) => ({ questionId: q.id, answerIdx: answerOf(q.id) }));
    const a = await call('/api/encounter/answer', { cookie: c1, body: { encounterId: id, answers } });
    assert.equal(a.j.ok, true, JSON.stringify(a.j));
    assert.equal(a.j.status, 'caught', JSON.stringify(a.j));
    const inst = instRow(raw, 1, 'species:19');
    assert.ok(inst);
    assert.equal(inst.source, 'catch');
    assert.ok(inst.ability === '逃跑' || inst.ability === '毅力');
    const first = inst.ability;
    // 再抓一只同物种：实例已存在，不重掷
    const id2 = newEnc(19, '小拉达');
    globalThis.__wildRng = () => (first === '逃跑' ? 0.9 : 0.1); // 若重掷会掷到另一条
    await call('/api/encounter/throw', { cookie: c1, body: { encounterId: id2, ball: 'master', requestId: reqId() } });
    assert.equal(instRow(raw, 1, 'species:19').ability, first);
  });
});

describe('Batch 0 — 建造路径取实例特性（instAbilityFor / attachInstanceAbilities）', () => {
  test('T21: instAbilityFor 优先 line_key、再 species:{no}、再 species_no；特性须属于该形态，伊布线不串味', () => {
    const child = { line: 'pikachu', _instAbilityByLine: { pikachu: '静电', 'species:19': '毅力', eevee: '逃跑' }, _instAbilityByNo: { 172: '静电', 19: '毅力', 133: '逃跑' } };
    assert.equal(M.instAbilityFor(child, ['pikachu'], 26), '静电'); // 进化形态与首形态首特性相同
    assert.equal(M.instAbilityFor(child, [null, 'species:19'], 19), '毅力');
    assert.equal(M.instAbilityFor(child, [null, 'species:19'], 25), null); // 毅力不属于 25
    assert.equal(M.instAbilityFor(child, ['nope'], 19), '毅力'); // species_no 兜底
    // 伊布线：实例存的是 133 的「逃跑」，进化成雷伊布（135 蓄电）后不得把逃跑塞给它——否则蓄电免疫丢失
    assert.equal(M.instAbilityFor(child, ['eevee'], 133), '逃跑');
    assert.equal(M.instAbilityFor(child, ['eevee'], 135), null);
    assert.equal(M.makePet({ key: 'm', name: '雷伊布', type: '电', no: 135, level: 20, moves: [TACKLE], ability: M.instAbilityFor(child, ['eevee'], 135) }).ability, '蓄电');
    // 无映射/无形态号：不抛错、返回 null
    assert.strictEqual(M.instAbilityFor({}, ['pikachu'], 25), null);
    assert.strictEqual(M.instAbilityFor(child, ['pikachu'], null), null);
  });

  test('T22: attachInstanceAbilities 按 line_key/species_no 挂映射，NULL 行不进映射', async () => {
    const { db, raw } = makeEnv([...MIGRATIONS, MIG_0043]);
    const now = Math.floor(Date.now() / 1000);
    raw.prepare(`INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, branch, source, egg_id, evolved_via, has_been_main, ability, created_epoch, updated_epoch)
      VALUES(1, 'bulbasaur', 1, 0, NULL, 'main', NULL, NULL, 1, NULL, ?, ?)`).run(now, now); // 旧实例
    await M.ensurePetInstance(db, 1, 'species:19', '2026-11-18', 'catch', () => 0.8);
    const child = { id: 1 };
    await M.attachInstanceAbilities(db, child);
    assert.deepEqual(child._instAbilityByLine, { 'species:19': '毅力' });
    assert.deepEqual(child._instAbilityByNo, { 19: '毅力' });
    const other = { id: 2 };
    await M.attachInstanceAbilities(db, other);
    assert.deepEqual(other._instAbilityByLine, {});
  });
});

describe('Batch 0 — 离线端（L，T19–T20）', () => {
  test('T19: L.petAbility / L.makePet 与服务端一致；L 不含 rollInstanceAbility（离线端无 DEX_DETAILS）', () => {
    assert.equal(L.petAbility({ no: 25, ability: '避雷针' }), '避雷针');
    assert.equal(L.petAbility({ no: 25, ability: null }), '静电');
    assert.equal(L.petAbility({ no: 25 }), '静电');
    assert.strictEqual(L.petAbility(null), null);
    assert.strictEqual(L.petAbility(undefined), null);
    assert.equal(mk(L, 25, '避雷针').ability, '避雷针');
    assert.equal(mk(L, 25).ability, '静电');
    assert.equal(L.rollInstanceAbility, undefined);
    assert.equal(typeof L.petAbility, 'function');
  });

  test('T20: L 端调用点替换后行为不变（calcDamage 飘浮免疫、changeStage 恒净之躯守卫、蜕皮、静电）', () => {
    const gastly = mk(L, 92);
    assert.equal(L.calcDamage(QUAKE, mk(L, 74, undefined, [QUAKE]), gastly, R, OFF).dmg, 0);
    const jelly = mk(L, 72);
    assert.deepEqual(L.changeStage(jelly, 'atk', -1), { applied: false, blocked: true, guard: '恒净之躯', from: 0, to: 0 });
    const metapod = mk(L, 11);
    metapod.status = { kind: 'paralysis' };
    assert.equal(L.settleStatusTick(metapod, () => 0.1, [], 'A').cured, true);
    const rattata = mk(L, 19);
    L.applyContactTrigger(rattata, mk(L, 25), TACKLE, () => 0.1, [], 'A', 'B');
    assert.deepEqual(rattata.status, { kind: 'paralysis' });
  });
});
