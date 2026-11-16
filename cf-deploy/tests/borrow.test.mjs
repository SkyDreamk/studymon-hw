import { assetPath } from './asset-path.mjs';
/* 借鉴包 v1 测试：node --test tests/borrow.test.mjs
 * 覆盖：暴击（引擎）、PvP 防守第四档「守护」与权重、图鉴扩充与稀有度、
 * 精灵球掉落（判定/每日上限）、答题触发遭遇（每日一场）、答题抓捕全流程、
 * 道馆备战克制 counters。harness 同 battle.test（node:sqlite 内存库＋迁移 0001–0006）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0019_evo_items.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
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
  const db = {
    prepare: (sql) => wrap(sql),
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw,
  };
}

let env, raw;
beforeEach(() => { ({ env, raw } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}
async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200);
  return r.cookie;
}
async function setup() {
  const pc = await parentCookie();
  const r = await call('/api/parent/settings/update', {
    method: 'POST', cookie: pc,
    body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '0000'), c2: await childCookie(2, '0000') };
}

function realTodayStr() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}

/* 序列 rng：依次吐出给定值（耗尽后重复最后一个） */
const seq = (...vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };

const pet = (name, type, hp, moves, level = 5) => ({ key: name, name, type, no: null, img: null, level, maxHp: hp, hp, moves });
const side = (childId, childName, pets) => ({ childId, childName, battleLevel: 5, activeIdx: 0, pets });

/* 种一道「今天已通过」的打卡 + 题库（三年级语文 study 题 + 谜语；语文题打三年级上册第2单元标签，学习进度B fail-closed 默认门内） */
async function seedQuizDay(c1) {
  const today = realTodayStr();
  raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
    VALUES(1,?,'["语文"]','语文','10:00',1,0,'approved',15,'10:05')`).run(today);
  raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,chapter) VALUES('study',3,'语文','「春」天的春是哪个字？','[\"春\",\"冬\",\"夏\",\"秋\"]',0,'春天',1,0,0,'三年级上册 第2单元')").run();
  raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('riddle',NULL,NULL,'什么东西越洗越脏？','[\"水\",\"手\",\"衣服\",\"碗\"]',0,'水越洗越脏',1,0,0)").run();
  const t = await call('/api/quiz/today?child_id=1', { cookie: c1 });
  assert.equal(t.j.ok, true, JSON.stringify(t.j));
  return t.j;
}

/* 题库自带种子题（迁移 0002），答案位置不固定：一律从库里查 answer_idx 再作答 */
function correctIdx(qid) {
  return raw.prepare('SELECT answer_idx FROM quiz_questions WHERE id=?').get(qid).answer_idx;
}
function wrongIdx(q) {
  return (correctIdx(q.id) + 1) % q.options.length;
}

/* 种抓捕题库：5 道三年级数学题（正确答案一律 idx 0） */
function seedCatchBank() {
  for (let i = 1; i <= 5; i++) {
    raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('study',3,'数学',?,'[\"对的\",\"错的\",\"不知道\",\"跳过\"]',0,'解析',1,0,0)")
      .run(`抓捕题 ${i}：选「对的」`);
  }
}

function insertEncounter(childId, no, name) {
  raw.prepare('INSERT INTO encounters(child_id, date, pokemon_no, name) VALUES(?,?,?,?)')
    .run(childId, realTodayStr(), no, name);
  return Number(raw.prepare('SELECT last_insert_rowid() AS id').get().id);
}

/* ---------------- 暴击 ---------------- */

describe('暴击（§1）', () => {
  test('calcDamage：暴击 roll 命中 → ×1.5 且 critical=true；未命中与边界（恰 1/16）不暴击', () => {
    const move = { name: '电击', type: '电', power: 50 };
    // rng 序列：第 1 掷 = 伤害浮动 0.5（×1.0），第 2 掷 = 暴击判定
    const crit = M.calcDamage(move, { level: 10, type: '电', stats: null }, { level: 10, type: '火', stats: null }, seq(0.5, 0));
    assert.equal(crit.critical, true);
    assert.equal(crit.dmg, 75); // 50 × (0.5+0.05×10) × 1.0 = 50 → ×1.5
    const noCrit = M.calcDamage(move, { level: 10, type: '电', stats: null }, { level: 10, type: '火', stats: null }, seq(0.5, 0.5));
    assert.equal(noCrit.critical, false);
    assert.equal(noCrit.dmg, 50);
    const edge = M.calcDamage(move, { level: 10, type: '电', stats: null }, { level: 10, type: '火', stats: null }, seq(0.5, 1 / 16));
    assert.equal(edge.critical, false); // 恰等于概率不算暴击（< 才算）
    assert.equal(M.CRIT_RATE, 1 / 16);
    assert.equal(M.CRIT_MULT, 1.5);
  });

  test('applyBattleAction：暴击事件带 critical 与「会心一击！」，伤害落账一致', () => {
    const a = pet('皮丘', '电', 500, [{ name: '电击', type: '电', power: 50 }]);
    const b = pet('小火龙', '火', 500, [{ name: '火花', type: '火', power: 40 }]);
    const st = M.createBattleState({ mode: 'gym', firstSide: 'B', sides: { A: side(1, '大宝', [a]), B: side(null, '馆主', [b]) } });
    M.applyBattleAction(st, 'B', null, () => 0.5); // 先攻方跳过
    const r = M.applyBattleAction(st, 'A', '电击', seq(0.5, 0));
    const atk = r.events.find((e) => e.type === 'attack');
    assert.equal(atk.critical, true);
    assert.ok(atk.text.includes('会心一击'));
    // 50 × (0.5+0.05×5) = 37.5 → 38 → 暴击 ×1.5 = 57
    assert.equal(atk.dmg, 57);
    assert.equal(st.sides.B.pets[0].hp, 500 - 57);
  });
});

/* ---------------- 防守守护档 ---------------- */

describe('PvP 防守四档（§2）', () => {
  test('DEFENSE_KINDS：四档比例与权重（闪避20/格挡30/防御30/守护20，守护 ×0.75）', () => {
    assert.equal(M.DEFENSE_KINDS.length, 4);
    const by = Object.fromEntries(M.DEFENSE_KINDS.map((d) => [d.kind, d]));
    assert.equal(by.dodge.ratio, 0);
    assert.equal(by.block.ratio, 0.5);
    assert.equal(by.guard.ratio, 2 / 3);
    assert.equal(by.ward.ratio, 0.75);
    assert.equal(by.ward.label, '守护');
    assert.deepEqual(M.DEFENSE_KINDS.map((d) => d.weight), [20, 30, 30, 20]);
  });

  test('pickDefenseKind：权重区间边界', () => {
    assert.equal(M.pickDefenseKind(() => 0).kind, 'dodge');
    assert.equal(M.pickDefenseKind(() => 0.1999).kind, 'dodge');
    assert.equal(M.pickDefenseKind(() => 0.2).kind, 'block');
    assert.equal(M.pickDefenseKind(() => 0.4999).kind, 'block');
    assert.equal(M.pickDefenseKind(() => 0.5).kind, 'guard');
    assert.equal(M.pickDefenseKind(() => 0.7999).kind, 'guard');
    assert.equal(M.pickDefenseKind(() => 0.8).kind, 'ward');
    assert.equal(M.pickDefenseKind(() => 0.9999).kind, 'ward');
  });

  test('resolveStagedAttack：守护把伤害打七五折并出守护事件', () => {
    const petA = pet('妙蛙种子', '草', 200, [{ name: '藤鞭', type: '草', power: 40 }]);
    const petB = pet('小火龙', '火', 200, [{ name: '火花', type: '火', power: 40 }]);
    const st = M.createBattleState({ mode: 'pvp', firstSide: 'B', sides: { A: side(1, '大宝', [petA]), B: side(2, '小宝', [petB]) } });
    M.applyBattleAction(st, 'B', null, () => 0.5);
    const staged = M.stagePvpAttack(st, 'A', '藤鞭', () => 0.5);
    assert.equal(staged.dmg, 30); // 40 × (0.5+0.05×5) × 1.0
    assert.equal(staged.critical, false); // rng 0.5 不暴击
    const r = M.resolveStagedAttack(st, { ...staged, attacker: 'A' }, { kind: 'ward' });
    const def = r.events.find((e) => e.type === 'defense');
    assert.equal(def.kind, 'ward');
    assert.ok(def.text.includes('守护'));
    assert.ok(def.text.includes('四分之一'));
    assert.equal(st.sides.B.pets[0].hp, 200 - Math.floor(30 * 0.75));
  });
});

/* ---------------- PvP 平衡调整（2026-10-24，用户拍板三项一起调） ---------------- */

describe('PvP 平衡调整（暴击降 / HP 拉长）', () => {
  test('参数常量：PvP 暴击 1/24 ×1.3、HP 倍率 1.4；全局暴击与 HP 公式不变', () => {
    assert.equal(M.PVP_CRIT_RATE, 1 / 24);
    assert.equal(M.PVP_CRIT_MULT, 1.3);
    assert.equal(M.PVP_HP_MULT, 1.4);
    assert.equal(M.pvpMaxHp(5), 168); // round(120 × 1.4)
    assert.equal(M.pvpMaxHp(3), 134); // round(96 × 1.4)
    // 道馆/合作共用口径一字未动
    assert.equal(M.CRIT_RATE, 1 / 16);
    assert.equal(M.CRIT_MULT, 1.5);
    assert.equal(M.battleMaxHp(5), 120);
  });

  test('stagePvpAttack：暴击走 PvP 口径（roll 0.05 不暴击、0.02 暴击且 ×1.3）', () => {
    const mk = () => {
      const a = pet('皮丘', '电', 500, [{ name: '电击', type: '电', power: 50 }]);
      const b = pet('小火龙', '火', 500, [{ name: '火花', type: '火', power: 40 }]);
      const st = M.createBattleState({ mode: 'pvp', firstSide: 'B', sides: { A: side(1, '大宝', [a]), B: side(2, '小宝', [b]) } });
      M.applyBattleAction(st, 'B', null, () => 0.5); // 先攻方跳过
      return st;
    };
    // 伤害浮动 0.5（×1.0）→ rolled = round(50×0.75) = 38；暴击 roll 0.05：旧全局 1/16 会暴击，PvP 1/24 不暴击
    const noCrit = M.stagePvpAttack(mk(), 'A', '电击', seq(0.5, 0.05));
    assert.equal(noCrit.critical, false);
    assert.equal(noCrit.dmg, 38);
    // 暴击 roll 0.02 < 1/24 → 暴击，倍率 ×1.3（非全局 ×1.5）：round(38×1.3) = 49
    const crit = M.stagePvpAttack(mk(), 'A', '电击', seq(0.5, 0.02));
    assert.equal(crit.critical, true);
    assert.equal(crit.dmg, 49);
  });

  test('calcDamage 默认口径（道馆/合作）未被 PvP 参数污染：roll 0.05 仍暴击 ×1.5', () => {
    const move = { name: '电击', type: '电', power: 50 };
    const r = M.calcDamage(move, { level: 5, type: '电', stats: null }, { level: 5, type: '火', stats: null }, seq(0.5, 0.05)); // 不传 opts
    assert.equal(r.critical, true);
    assert.equal(r.dmg, 57); // round(38 × 1.5)
  });
});

/* ---------------- 图鉴与稀有度 ---------------- */

describe('图鉴扩充（§3）', () => {
  test('WILD 132 只：三档 4/58/70，每只都有 SPECIES 与 COLLECTION_MOVES', () => {
    assert.equal(M.WILD.length, 132);
    const tiers = { common: 0, uncommon: 0, rare: 0 };
    for (const w of M.WILD) {
      tiers[w.tier]++;
      assert.ok(M.SPECIES[w.no], `物种 ${w.no} 缺 SPECIES`);
      assert.equal(M.SPECIES[w.no].name, w.name);
      assert.ok(M.COLLECTION_MOVES[w.no], `物种 ${w.no} 缺 COLLECTION_MOVES`);
      for (const [n, p] of M.COLLECTION_MOVES[w.no]) {
        assert.ok(n && p >= 40 && p <= 66, `${w.name} 招式 ${n} 威力 ${p} 应在 40–66`);
      }
    }
    assert.deepEqual(tiers, { common: 4, uncommon: 58, rare: 70 });
  });

  test('新物种招式与规格表逐项一致', () => {
    assert.deepEqual(M.COLLECTION_MOVES[50], [['挖洞突袭', 46], ['泥巴投掷', 40]]);
    assert.deepEqual(M.COLLECTION_MOVES[37], [['火焰小尾', 44], ['火花飞舞', 54]]);
    assert.deepEqual(M.COLLECTION_MOVES[74], [['滚动撞击', 46], ['落石小雨', 56]]);
    assert.deepEqual(M.COLLECTION_MOVES[98], [['水泡连弹', 46], ['蟹钳重击', 56]]);
    assert.deepEqual(M.COLLECTION_MOVES[179], [['静电绒毛', 42], ['小小雷光', 54]]);
    assert.deepEqual(M.COLLECTION_MOVES[58], [['小火轮', 46], ['火焰冲锋', 56]]);
    assert.deepEqual(M.COLLECTION_MOVES[123], [['旋风连斩', 52], ['镰刀疾风', 60]]);
    assert.deepEqual(M.COLLECTION_MOVES[111], [['独角猛撞', 58], ['大地践踏', 62]]);
    assert.equal(M.SPECIES[179].type, '电');
    assert.equal(M.SPECIES[111].type, '地面');
  });

  test('抓捕题数按档位 1/2/3；遭遇抽选按 60/30/10 分档', () => {
    assert.equal(M.catchQuestionsFor(16), 1);
    assert.equal(M.catchQuestionsFor(50), 1);
    assert.equal(M.catchQuestionsFor(54), 2);
    assert.equal(M.catchQuestionsFor(179), 2);
    assert.equal(M.catchQuestionsFor(58), 3);
    assert.equal(M.catchQuestionsFor(111), 3);
    assert.equal(M.catchQuestionsFor(17), 2); // 第一批新增：比比鸟少见 2 题
    assert.equal(M.catchQuestionsFor(149), 3); // 第一批新增：快龙稀有 3 题
    assert.equal(M.catchQuestionsFor(900), 3); // 第一批新增：劈斧螳螂稀有 3 题
    assert.equal(M.catchQuestionsFor(10), 2); // 第二批新增：绿毛虫少见 2 题
    assert.equal(M.catchQuestionsFor(34), 3); // 第二批新增：尼多王稀有 3 题
    assert.equal(M.catchQuestionsFor(35), 2); // 第三批新增：皮皮少见 2 题
    assert.equal(M.catchQuestionsFor(65), 3); // 第三批新增：胡地稀有 3 题
    assert.equal(M.catchQuestionsFor(69), 2); // 第四批新增：喇叭芽少见 2 题
    assert.equal(M.catchQuestionsFor(89), 3); // 第四批新增：臭臭泥稀有 3 题
    assert.equal(M.catchQuestionsFor(92), 2); // 第五批新增：鬼斯少见 2 题
    assert.equal(M.catchQuestionsFor(115), 3); // 第五批新增：袋兽稀有 3 题
    assert.equal(M.catchQuestionsFor(116), 2); // 第六批新增：墨海马少见 2 题
    assert.equal(M.catchQuestionsFor(142), 3); // 第六批新增：化石翼龙稀有 3 题
    assert.equal(M.catchQuestionsFor(51), 3); // 51 补进：三地鼠稀有 3 题
    assert.equal(M.pickWildSpecies(seq(0, 0)).no, 16); // roll 0 → common 首只波波
    assert.equal(M.pickWildSpecies(seq(0.65, 0)).no, 54); // roll 65 → uncommon 首只可达鸭
    assert.equal(M.pickWildSpecies(seq(0.95, 0.999)).no, 51); // roll 95 → rare 末只三地鼠（51 补进后末位）
  });

  test('覆盖校验：四关馆主每关都至少有一只常见档克制宠', () => {
    for (const g of M.GYM_STAGES) {
      const bossTypes = M.bossDefTypes(g.bossNo);
      const counters = M.WILD.filter((w) => w.tier === 'common' && M.typeMultOfficialMulti(M.SPECIES[w.no].type, bossTypes) >= 2);
      assert.ok(counters.length >= 1, `第 ${g.stage} 关（${bossTypes.join('/')}）缺常见克制宠，现有克制：${counters.map((c) => c.name).join('/') || '无'}`);
    }
  });

  test('S8 程序化断言：枚举 132 只野外池逐关校验，常见档克制集合非空且与 countersForType 同源一致', () => {
    assert.equal(M.WILD.length, 132);
    for (const g of M.GYM_STAGES) {
      const bossTypes = M.bossDefTypes(g.bossNo);
      const hits = M.WILD.filter((w) => w.tier === 'common' && M.typeMultOfficialMulti(M.SPECIES[w.no].type, bossTypes) >= 2);
      assert.ok(hits.length >= 1, `第 ${g.stage} 关 ${M.SPECIES[g.bossNo].name}（${bossTypes.join('/')}）无常见档克制宠`);
      // 徽章用的 countersForType 必须把这些宠的属性算作克制该关（断言与引擎口径同源）
      for (const w of hits) assert.ok(M.countersForType(M.SPECIES[w.no].type).includes(g.stage), `${w.name} 应被徽章标为克制第 ${g.stage} 关`);
    }
  });
});

/* ---------------- 掉球与遭遇触发 ---------------- */

describe('精灵球掉落与遭遇触发（§4/§5）', () => {
  test('rollBallDrop：先判高级 1%、再判普通 30%', () => {
    assert.equal(M.rollBallDrop(seq(0.009)), 'super');
    assert.equal(M.rollBallDrop(seq(0.01, 0.05)), 'normal'); // 0.01 不算高级（< 才算），落普通判定
    assert.equal(M.rollBallDrop(seq(0.5, 0.29)), 'normal');
    assert.equal(M.rollBallDrop(seq(0.5, 0.30)), null);
    assert.equal(M.rollBallDrop(seq(0.5, 0.5)), null);
    assert.equal(M.rollWildEncounter(() => 0.09), true);
    assert.equal(M.rollWildEncounter(() => 0.1), false);
  });

  test('答对掉超级球（掷点全程 0.005）：库存 +1、记账一行', async () => {
    const { c1 } = await setup();
    const today = await seedQuizDay(c1);
    const q = today.questions.find((x) => x.kind !== 'riddle');
    const orig = Math.random;
    Math.random = () => 0.005;
    try {
      const r = await call('/api/quiz/answer', { method: 'POST', cookie: c1, body: { child_id: 1, question_id: q.id, answer_idx: correctIdx(q.id) } });
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      assert.equal(r.j.correct, true);
      assert.deepEqual(r.j.drop, { kind: 'super' });
    } finally { Math.random = orig; }
    const c = raw.prepare('SELECT balls, balls_super FROM children WHERE id=1').get();
    assert.equal(c.balls, 3);
    assert.equal(c.balls_super, 1);
    const drops = raw.prepare("SELECT kind FROM ball_drops WHERE child_id=1").all();
    assert.equal(drops.length, 1);
    assert.equal(drops[0].kind, 'super');
  });

  test('每日掉落上限 3：已掉满时答对不再掉球、不记账', async () => {
    const { c1 } = await setup();
    const today = realTodayStr();
    raw.prepare('INSERT INTO ball_drops(child_id, date_shanghai, kind, created_epoch) VALUES(1,?,?,0)').run(today, 'normal');
    raw.prepare('INSERT INTO ball_drops(child_id, date_shanghai, kind, created_epoch) VALUES(1,?,?,0)').run(today, 'super');
    raw.prepare('INSERT INTO ball_drops(child_id, date_shanghai, kind, created_epoch) VALUES(1,?,?,0)').run(today, 'normal');
    const t = await seedQuizDay(c1);
    const q = t.questions.find((x) => x.kind !== 'riddle');
    const orig = Math.random;
    Math.random = () => 0.005; // 必掉的掷点也掉不出来
    try {
      const r = await call('/api/quiz/answer', { method: 'POST', cookie: c1, body: { child_id: 1, question_id: q.id, answer_idx: correctIdx(q.id) } });
      assert.equal(r.j.correct, true);
      assert.equal(r.j.drop, null);
    } finally { Math.random = orig; }
    const c = raw.prepare('SELECT balls, balls_super FROM children WHERE id=1').get();
    assert.equal(c.balls, 3);
    assert.equal(c.balls_super, 0);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM ball_drops WHERE child_id=1').get().n, 3);
  });

  test('答题触发遭遇（掷点 0.05）：生成一场 pending 遭遇并在响应里带出', async () => {
    const { c1 } = await setup();
    const t = await seedQuizDay(c1);
    const q = t.questions.find((x) => x.kind !== 'riddle');
    const orig = Math.random;
    Math.random = () => 0.05;
    try {
      const r = await call('/api/quiz/answer', { method: 'POST', cookie: c1, body: { child_id: 1, question_id: q.id, answer_idx: correctIdx(q.id) } });
      assert.equal(r.j.correct, true);
      assert.ok(r.j.encounter, '响应应带 encounter');
      assert.equal(r.j.encounter.no, 16); // 掷点 0.05 → common 首只波波
    } finally { Math.random = orig; }
    const enc = raw.prepare("SELECT * FROM encounters WHERE child_id=1 AND status='pending'").get();
    assert.ok(enc);
    assert.equal(enc.pokemon_no, 16);
  });

  test('当天已有遭遇（哪怕已处理完）时答题不再叠加触发', async () => {
    const { c1 } = await setup();
    insertEncounter(1, 39, '胖丁');
    raw.prepare("UPDATE encounters SET status='fled' WHERE child_id=1").run();
    const t = await seedQuizDay(c1);
    const q = t.questions.find((x) => x.kind !== 'riddle');
    const orig = Math.random;
    Math.random = () => 0.05; // 必触发的掷点
    try {
      const r = await call('/api/quiz/answer', { method: 'POST', cookie: c1, body: { child_id: 1, question_id: q.id, answer_idx: correctIdx(q.id) } });
      assert.equal(r.j.correct, true);
      assert.equal(r.j.encounter, null);
    } finally { Math.random = orig; }
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM encounters WHERE child_id=1').get().n, 1);
  });
});

/* ---------------- 答题抓捕 ---------------- */

describe('答题抓捕（§5）', () => {
  test('judgeCatch A 方案：普通球全对；超级球多 1 题、答对原档题数即中', () => {
    // 普通球（need=档位题数，total=实出题数）：全对才中，错 1 题不中
    assert.equal(M.judgeCatch('normal', 1, 1, 1), true);
    assert.equal(M.judgeCatch('normal', 0, 1, 1), false);
    assert.equal(M.judgeCatch('normal', 1, 2, 2), false);
    assert.equal(M.judgeCatch('normal', 2, 2, 2), true);
    assert.equal(M.judgeCatch('normal', 2, 3, 3), false);
    assert.equal(M.judgeCatch('normal', 3, 3, 3), true);
    // 超级球常见（原 1 题 → 出 2 题）：对 0 不中、对 1 即中
    assert.equal(M.judgeCatch('super', 0, 2, 1), false);
    assert.equal(M.judgeCatch('super', 1, 2, 1), true);
    assert.equal(M.judgeCatch('super', 2, 2, 1), true);
    // 超级球少见（原 2 题 → 出 3 题）：对 1 不中、对 2 即中
    assert.equal(M.judgeCatch('super', 1, 3, 2), false);
    assert.equal(M.judgeCatch('super', 2, 3, 2), true);
    assert.equal(M.judgeCatch('super', 3, 3, 2), true);
    // 超级球稀有（原 3 题 → 出 4 题）：对 2 不中、对 3 即中
    assert.equal(M.judgeCatch('super', 2, 4, 3), false);
    assert.equal(M.judgeCatch('super', 3, 4, 3), true);
    assert.equal(M.judgeCatch('super', 4, 4, 3), true);
  });

  test('常见档：投普通球出 1 题，全对抓中进图鉴，球库存 -1', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 16, '波波');
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th.j.ok, true, JSON.stringify(th.j));
    assert.equal(th.j.questions.length, 1);
    assert.equal(th.j.ballsUsed, 1);
    assert.equal(th.j.balls, 2);
    const q = th.j.questions[0];
    const an = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: [{ questionId: q.id, answerIdx: correctIdx(q.id) }] } });
    assert.equal(an.j.ok, true, JSON.stringify(an.j));
    assert.equal(an.j.hit, true);
    assert.equal(an.j.status, 'caught');
    const enc = raw.prepare('SELECT status, hits, balls_used FROM encounters WHERE id=?').get(encId);
    assert.equal(enc.status, 'caught');
    assert.equal(enc.hits, 1); // 新口径：是否命中过
    assert.ok(raw.prepare("SELECT 1 x FROM pokedex WHERE child_id=1 AND entry_key='wild:16'").get());
  });

  test('少见档 + 超级球：出 3 题（原 2+1），答对 2 题命中、答对 1 题不中', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    raw.prepare('UPDATE children SET balls_super=2 WHERE id=1').run();
    const encId = insertEncounter(1, 54, '可达鸭');
    const th1 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'super' } });
    assert.equal(th1.j.ok, true, JSON.stringify(th1.j));
    assert.equal(th1.j.questions.length, 3); // 超级球出题数 = 档位 2 + 1
    assert.equal(th1.j.ballsSuper, 1); // 已扣 1 颗超级球
    const [a1, a2, a3] = th1.j.questions;
    const miss = await call('/api/encounter/answer', {
      method: 'POST', cookie: c1,
      body: { encounterId: encId, answers: [{ questionId: a1.id, answerIdx: correctIdx(a1.id) }, { questionId: a2.id, answerIdx: wrongIdx(a2) }, { questionId: a3.id, answerIdx: wrongIdx(a3) }] },
    });
    assert.equal(miss.j.correctCount, 1);
    assert.equal(miss.j.hit, false); // 少见档达标线是答对 2 题
    assert.equal(miss.j.status, 'pending');
    const th2 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'super' } });
    assert.equal(th2.j.ok, true, JSON.stringify(th2.j));
    assert.equal(th2.j.questions.length, 3);
    assert.equal(th2.j.ballsSuper, 0);
    const [b1, b2, b3] = th2.j.questions;
    const an = await call('/api/encounter/answer', {
      method: 'POST', cookie: c1,
      body: { encounterId: encId, answers: [{ questionId: b1.id, answerIdx: correctIdx(b1.id) }, { questionId: b2.id, answerIdx: correctIdx(b2.id) }, { questionId: b3.id, answerIdx: wrongIdx(b3) }] },
    });
    assert.equal(an.j.correctCount, 2);
    assert.equal(an.j.hit, true);
    assert.equal(an.j.status, 'caught');
  });

  test('常见档 + 超级球：出 2 题（原 1+1），答对 0 题不中、答对 1 题命中', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    raw.prepare('UPDATE children SET balls_super=1 WHERE id=1').run();
    const encId = insertEncounter(1, 16, '波波');
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'super' } });
    assert.equal(th.j.ok, true, JSON.stringify(th.j));
    assert.equal(th.j.questions.length, 2); // 超级球出题数 = 档位 1 + 1
    const zero = await call('/api/encounter/answer', {
      method: 'POST', cookie: c1,
      body: { encounterId: encId, answers: th.j.questions.map((q) => ({ questionId: q.id, answerIdx: wrongIdx(q) })) },
    });
    assert.equal(zero.j.correctCount, 0);
    assert.equal(zero.j.hit, false); // 对 0 题不中（旧裁定关注的白送场景在新口径下依旧不成立）
    assert.equal(zero.j.status, 'pending');
    const th2 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th2.j.questions.length, 1); // 普通球仍出档位原题数
    const q = th2.j.questions[0];
    const an = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: [{ questionId: q.id, answerIdx: correctIdx(q.id) }] } });
    assert.equal(an.j.hit, true);
    assert.equal(an.j.status, 'caught');
  });

  test('稀有档 + 超级球：出 4 题（原 3+1），答对 3 题命中、答对 2 题不中', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    raw.prepare('UPDATE children SET balls_super=2 WHERE id=1').run();
    const encId = insertEncounter(1, 58, '卡蒂狗');
    const th1 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'super' } });
    assert.equal(th1.j.ok, true, JSON.stringify(th1.j));
    assert.equal(th1.j.questions.length, 4); // 超级球出题数 = 档位 3 + 1
    const missAnswers = th1.j.questions.map((q, i) => ({ questionId: q.id, answerIdx: i < 2 ? correctIdx(q.id) : wrongIdx(q) }));
    const miss = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: missAnswers } });
    assert.equal(miss.j.correctCount, 2);
    assert.equal(miss.j.hit, false); // 稀有档达标线是答对 3 题
    const th2 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'super' } });
    assert.equal(th2.j.ok, true, JSON.stringify(th2.j));
    assert.equal(th2.j.questions.length, 4);
    const hitAnswers = th2.j.questions.map((q, i) => ({ questionId: q.id, answerIdx: i < 3 ? correctIdx(q.id) : wrongIdx(q) }));
    const an = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: hitAnswers } });
    assert.equal(an.j.correctCount, 3);
    assert.equal(an.j.hit, true);
    assert.equal(an.j.status, 'caught');
  });

  test('稀有档普通球：3 次投球全错 → 逃跑；球耗尽', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 58, '卡蒂狗');
    let last;
    for (let round = 1; round <= 3; round++) {
      const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
      assert.equal(th.j.ok, true, JSON.stringify(th.j));
      assert.equal(th.j.questions.length, 3);
      const answers = th.j.questions.map((q) => ({ questionId: q.id, answerIdx: wrongIdx(q) })); // 全错
      last = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers } });
      assert.equal(last.j.hit, false);
      assert.equal(last.j.ballsUsed, round);
    }
    assert.equal(last.j.status, 'fled');
    const enc = raw.prepare('SELECT status, hits FROM encounters WHERE id=?').get(encId);
    assert.equal(enc.status, 'fled');
    assert.equal(enc.hits, 0);
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 0);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM pokedex WHERE child_id=1 AND entry_key='wild:58'").get().n, 0);
  });

  test('未答完的题组可续答：重复投球不重复扣球、题目不变', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 43, '走路草');
    const th1 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th1.j.ok, true);
    const th2 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th2.j.ok, true);
    assert.equal(th2.j.resumed, true);
    assert.deepEqual(th2.j.questions.map((q) => q.id), th1.j.questions.map((q) => q.id));
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 2); // 只扣过 1 颗
    assert.equal(raw.prepare('SELECT balls_used FROM encounters WHERE id=?').get(encId).balls_used, 1);
  });

  test('没有球时不能投：报错且遭遇保留 pending', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    raw.prepare('UPDATE children SET balls=0, balls_super=0 WHERE id=1').run();
    const encId = insertEncounter(1, 39, '胖丁');
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th.j.ok, false);
    assert.match(th.j.error, /没有精灵球/);
    assert.equal(raw.prepare('SELECT status FROM encounters WHERE id=?').get(encId).status, 'pending');
  });
});

/* ---------------- 修复批：克制同源 / 原子性 / 抓捕历史 / 续答 ---------------- */

describe('克制判定与实战同源（修复一）', () => {
  test('countersForType 与引擎 typeMultOfficialMulti 逐项对齐（徽章不得与实战脱节）', () => {
    assert.deepEqual(M.countersForType('电'), [2]); // 电 vs 第 2 关宝石海星（水/超能力）：calcDamage 同样给 ×2
    assert.deepEqual(M.countersForType('火'), [4]);
    assert.deepEqual(M.countersForType('地面'), [1, 3, 5, 6]); // 地面 vs 第 4 关霸王花（草/毒）= 0.5×2 = 1，不克制；克火 5 关、克地面/岩石 6 关
    assert.deepEqual(M.countersForType('水'), [1, 5, 6]);
    assert.deepEqual(M.countersForType('飞行'), [4]);
    for (const t of M.TYPES) {
      for (const g of M.GYM_STAGES) {
        const expect = M.typeMultOfficialMulti(t, M.bossDefTypes(g.bossNo)) >= 2;
        assert.equal(M.countersForType(t).includes(g.stage), expect, `${t} vs 第 ${g.stage} 关`);
      }
    }
  });

  test('gym/status：多只收藏宠 counters + 小宝（火线）mainCounters', async () => {
    const { c1, c2 } = await setup();
    for (const no of [179, 111, 54, 37]) {
      raw.prepare("INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(1,?, '2026-01-01')").run(`wild:${no}`);
    }
    const r = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const by = Object.fromEntries(r.j.collection.map((c) => [c.no, c.counters]));
    assert.deepEqual(by[179], [2]); // 咩利羊（电）克水关
    assert.deepEqual(by[111], [1, 3, 5, 6]); // 独角犀牛（地面）克岩石+电+火+地面
    assert.deepEqual(by[54], [1, 5, 6]); // 可达鸭（水）克岩石+火+地面
    assert.deepEqual(by[37], [4]); // 六尾（火）克草
    const r2 = await call('/api/gym/status', { method: 'POST', cookie: c2, body: { childId: 2 } });
    assert.deepEqual(r2.j.mainCounters, [4]); // 小宝主宠火系克草 4 关
  });
});

describe('原子性（M1/M4/M5）', () => {
  test('M1 并发连点投球：只扣 1 颗球、只记 1 次投球、两边拿到同一组题', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 16, '波波');
    const [a, b] = await Promise.all([
      call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } }),
      call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } }),
    ]);
    assert.equal(a.j.ok, true, JSON.stringify(a.j));
    assert.equal(b.j.ok, true, JSON.stringify(b.j));
    assert.deepEqual(a.j.questions.map((q) => q.id), b.j.questions.map((q) => q.id));
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 2); // 净扣 1 颗
    assert.equal(raw.prepare('SELECT balls_used FROM encounters WHERE id=?').get(encId).balls_used, 1);
  });

  test('M4 并发答对不突破掉落上限：记账先行，给球数=记账数', async () => {
    const { c1 } = await setup();
    const today = realTodayStr();
    raw.prepare('INSERT INTO ball_drops(child_id, date_shanghai, kind, created_epoch) VALUES(1,?,?,0)').run(today, 'normal');
    const t = await seedQuizDay(c1);
    assert.equal(t.questions.length, 1); // 2026-11-09 起每日选题不再含谜语，只剩语文 1 题
    const orig = Math.random;
    Math.random = () => 0.005; // 必掉超级球的掷点
    try {
      const rs = await Promise.all(t.questions.map((q) => call('/api/quiz/answer', { method: 'POST', cookie: c1, body: { child_id: 1, question_id: q.id, answer_idx: correctIdx(q.id) } })));
      for (const r of rs) assert.equal(r.j.correct, true, JSON.stringify(r.j));
      assert.equal(rs.map((r) => r.j.drop).filter(Boolean).length, 1); // 已有 1 个，上限 3 → 再掉 1 个
    } finally { Math.random = orig; }
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM ball_drops WHERE child_id=1').get().n, 2);
    assert.equal(raw.prepare('SELECT balls_super FROM children WHERE id=1').get().balls_super, 1);
  });

  test('M5 并发答对只生成一场遭遇', async () => {
    const { c1 } = await setup();
    const t = await seedQuizDay(c1);
    const orig = Math.random;
    Math.random = () => 0.05; // 必触发遭遇的掷点
    try {
      const rs = await Promise.all(t.questions.map((q) => call('/api/quiz/answer', { method: 'POST', cookie: c1, body: { child_id: 1, question_id: q.id, answer_idx: correctIdx(q.id) } })));
      for (const r of rs) assert.equal(r.j.correct, true, JSON.stringify(r.j));
      assert.equal(rs.map((r) => r.j.encounter).filter(Boolean).length, 1);
    } finally { Math.random = orig; }
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM encounters WHERE child_id=1').get().n, 1);
  });
});

describe('抓捕历史与续答（M2/M6）', () => {
  test('M2 抓捕作答落 quiz_attempts（不发经验/碎片），同场下一组题不重复', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 58, '卡蒂狗'); // 稀有档 3 题
    const th1 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th1.j.ok, true, JSON.stringify(th1.j));
    assert.equal(th1.j.questions.length, 3);
    const ids1 = th1.j.questions.map((q) => q.id);
    const before = raw.prepare('SELECT quiz_correct_total, total_xp FROM children WHERE id=1').get();
    const an1 = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: th1.j.questions.map((q) => ({ questionId: q.id, answerIdx: wrongIdx(q) })) } });
    assert.equal(an1.j.hit, false);
    const atts = raw.prepare('SELECT question_id, xp_awarded, fragments_awarded FROM quiz_attempts WHERE child_id=1').all();
    assert.deepEqual(new Set(atts.map((a) => a.question_id)), new Set(ids1));
    assert.ok(atts.every((a) => a.xp_awarded === 0 && a.fragments_awarded === 0));
    const after = raw.prepare('SELECT quiz_correct_total, total_xp FROM children WHERE id=1').get();
    assert.equal(after.quiz_correct_total, before.quiz_correct_total); // 抓捕不涨答对计数
    assert.equal(after.total_xp, before.total_xp);
    const th2 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th2.j.ok, true, JSON.stringify(th2.j));
    assert.equal(th2.j.questions.length, 3);
    assert.ok(th2.j.questions.every((q) => !ids1.includes(q.id)), '同场第二组题不得与第一组重复');
  });

  test('M6 最后一颗球扔出后（库存 0）pending 仍回题组、可答完结算', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 16, '波波'); // 常见档 1 题；孩子有 3 颗普通球
    for (let round = 1; round <= 2; round++) {
      const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
      assert.equal(th.j.ok, true, JSON.stringify(th.j));
      const q = th.j.questions[0];
      const an = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: [{ questionId: q.id, answerIdx: wrongIdx(q) }] } });
      assert.equal(an.j.hit, false);
    }
    const th3 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th3.j.ok, true, JSON.stringify(th3.j));
    assert.equal(th3.j.balls, 0); // 库存耗尽
    const p = await call('/api/encounter/pending', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(p.j.ok, true);
    assert.ok(p.j.encounter, '遭遇应仍在');
    assert.ok(p.j.encounter.quiz && p.j.encounter.quiz.questions.length === 1, 'pending 应回传未答题组');
    assert.equal(p.j.encounter.balls, 0);
    const q3 = p.j.encounter.quiz.questions[0];
    const an3 = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: [{ questionId: q3.id, answerIdx: correctIdx(q3.id) }] } });
    assert.equal(an3.j.hit, true);
    assert.equal(an3.j.status, 'caught');
  });
});

/* ---------------- 继续答题（resume）修复（2026-10-24 正式站实测 bug） ----------------
 * 事发状态（正式库遭遇 id=3 实测）：稀有档已扔 2 颗普通球、两组题都答完未命中
 * （quiz_state=NULL）、普通球库存 0、遭遇仍 pending——前端旧「继续答题」按钮
 * 按 ballsUsed>0 无条件渲染，点击走新投球 → 被库存校验挡下报「没有精灵球」，
 * 与按钮「不用球也能进」的文案矛盾。修复口径：继续答题（resume:true）只认未答完
 * 的题组，不查库存、不扣球；没有待答题组时如实报错，绝不落入扣球路径。 */

describe('继续答题 resume 修复（2026-10-24）', () => {
  test('事发复现：两组题都答完未命中＋库存 0 → resume 如实报错、不提没球、不扣球、遭遇保留', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    raw.prepare('UPDATE children SET balls=2, balls_super=0 WHERE id=1').run();
    const encId = insertEncounter(1, 123, '飞天螳螂'); // 稀有档 3 题，普通球须全对
    for (let round = 0; round < 2; round++) {
      const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
      assert.equal(th.j.ok, true, JSON.stringify(th.j));
      assert.equal(th.j.questions.length, 3);
      // 每组对 2 错 1（普通球须全对 → 未命中），与正式库事发记录同构
      const answers = th.j.questions.map((q, i) => ({ questionId: q.id, answerIdx: i < 2 ? correctIdx(q.id) : wrongIdx(q) }));
      const an = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers } });
      assert.equal(an.j.hit, false);
      assert.equal(an.j.status, 'pending');
    }
    const enc = raw.prepare('SELECT status, balls_used, quiz_state FROM encounters WHERE id=?').get(encId);
    assert.deepEqual([enc.status, enc.balls_used, enc.quiz_state], ['pending', 2, null]); // 与事发库状态逐项一致
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 0);
    // 点「继续答题」：不得再报「没有精灵球」，不得扣球/改状态
    const rs = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal', resume: true } });
    assert.equal(rs.j.ok, false);
    assert.doesNotMatch(rs.j.error, /没有精灵球/);
    assert.match(rs.j.error, /都答完啦/);
    const enc2 = raw.prepare('SELECT status, balls_used, quiz_state FROM encounters WHERE id=?').get(encId);
    assert.deepEqual([enc2.status, enc2.balls_used, enc2.quiz_state], ['pending', 2, null]);
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 0);
    // 对照：不带 resume 的新投球仍然是库存口径（规则未动）
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th.j.ok, false);
    assert.match(th.j.error, /没有精灵球/);
  });

  test('resume 继承原会话：超级球最后一颗扔出后库存 0 续答不换球种、不扣球、达标线按 A 方案', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    raw.prepare('UPDATE children SET balls=0, balls_super=1 WHERE id=1').run();
    const encId = insertEncounter(1, 58, '卡蒂狗'); // 稀有档：超级球 4 题、答对 3 即中
    const th1 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'super' } });
    assert.equal(th1.j.ok, true, JSON.stringify(th1.j));
    assert.equal(th1.j.ball, 'super');
    assert.equal(th1.j.questions.length, 4);
    assert.equal(th1.j.ballsSuper, 0); // 最后一颗超级球已出
    // 退出回来点继续答题（前端不带球种）：服务端按题组存的球种续答
    const rs = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, resume: true } });
    assert.equal(rs.j.ok, true, JSON.stringify(rs.j));
    assert.equal(rs.j.resumed, true);
    assert.equal(rs.j.ball, 'super');
    assert.deepEqual(rs.j.questions.map((q) => q.id), th1.j.questions.map((q) => q.id)); // 题目不变
    assert.equal(raw.prepare('SELECT balls_super FROM children WHERE id=1').get().balls_super, 0); // 未重复扣
    assert.equal(raw.prepare('SELECT balls_used FROM encounters WHERE id=?').get(encId).balls_used, 1);
    // 答对 3/4 → A 方案达标线（稀有原档 3）→ 命中抓中
    const answers = rs.j.questions.map((q, i) => ({ questionId: q.id, answerIdx: i < 3 ? correctIdx(q.id) : wrongIdx(q) }));
    const an = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers } });
    assert.equal(an.j.hit, true);
    assert.equal(an.j.status, 'caught');
  });

  test('resume 时题组题目被删光：按原球种重出题、不扣球、pending 回传新题组', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 43, '走路草'); // 常见档 1 题
    const th1 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th1.j.ok, true, JSON.stringify(th1.j));
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 2);
    raw.prepare('DELETE FROM quiz_questions WHERE id=?').run(th1.j.questions[0].id); // 家长把这道题删了
    const rs = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, resume: true } });
    assert.equal(rs.j.ok, true, JSON.stringify(rs.j));
    assert.equal(rs.j.resumed, true);
    assert.equal(rs.j.ball, 'normal');
    assert.equal(rs.j.questions.length, 1);
    assert.notEqual(rs.j.questions[0].id, th1.j.questions[0].id);
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 2); // 没再扣球
    const p = await call('/api/encounter/pending', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(p.j.encounter.quiz.questions[0].id, rs.j.questions[0].id);
  });

  test('resume 隔离：别的孩子对本场遭遇续答 → 403；无题组时也不能借 resume 绕过', async () => {
    const { c1, c2 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 43, '走路草');
    const th1 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th1.j.ok, true, JSON.stringify(th1.j));
    const rs = await call('/api/encounter/throw', { method: 'POST', cookie: c2, body: { encounterId: encId, resume: true } });
    assert.equal(rs.status, 403);
    const enc = raw.prepare('SELECT quiz_state FROM encounters WHERE id=?').get(encId);
    assert.ok(enc.quiz_state, '题组未被他人动过');
  });

  test('前端接线：继续答题只走 resumeCatch（不再误接 throwCatchBall），resume 请求带 resume:true', () => {
    const appJs = readFileSync(assetPath('app.js'), 'utf8');
    assert.match(appJs, /onclick="resumeCatch\(\)"/);
    assert.doesNotMatch(appJs, /onclick="throwCatchBall\('normal'\)">▶️ 继续答题/);
    assert.match(appJs, /resume: true/);
  });
});

/* ---------------- 抓捕留空改版（2026-10-24） ----------------
 * 用户拍板：提交时有题没答先提醒（还有 N 道题没答哦），孩子显式点「就这样交」
 * （confirmBlanks=true）才按现行口径结算；不确认不结算、不落账、题组原样保留。
 * 答题界面有「先退出」：不提交不结算，pending 回带同一组题续答，球不退也不重扣。
 * 追加规格（用户 2026-10-24 13:29）：已选答案存服务端草稿（点选即存/退出再存），
 * 重进恢复已选答案，从没答的题接着答；判定仍在最终提交时发生，口径不变。 */
describe('抓捕留空改版（2026-10-24）', () => {
  test('留空未确认：400 拦截，题组/落账/球数全部原样不动', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 54, '可达鸭'); // 少见档：普通球 2 题
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th.j.ok, true, JSON.stringify(th.j));
    assert.equal(th.j.questions.length, 2);
    const [q1] = th.j.questions;
    const r = await call('/api/encounter/answer', {
      method: 'POST', cookie: c1,
      body: { encounterId: encId, answers: [{ questionId: q1.id, answerIdx: correctIdx(q1.id) }] }, // 第二题留空
    });
    assert.equal(r.status, 400);
    assert.equal(r.j.ok, false);
    assert.equal(r.j.blanks, 1);
    assert.match(r.j.error, /还有 1 道题没答哦/);
    const enc = raw.prepare('SELECT status, quiz_state, balls_used FROM encounters WHERE id=?').get(encId);
    assert.equal(enc.status, 'pending');
    assert.ok(enc.quiz_state, '题组原样保留，未被结算清掉');
    assert.equal(enc.balls_used, 1);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM quiz_attempts WHERE child_id=1').get().n, 0, '未落任何答题账');
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 2, '球只在投出时扣过 1 颗');
  });

  test('留空显式确认（confirmBlanks）：照常结算，留空判错并落账', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 54, '可达鸭');
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    const [q1, q2] = th.j.questions;
    const r = await call('/api/encounter/answer', {
      method: 'POST', cookie: c1,
      body: { encounterId: encId, confirmBlanks: true, answers: [{ questionId: q1.id, answerIdx: correctIdx(q1.id) }] },
    });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.correctCount, 1); // 答了的对、留空的错
    assert.equal(r.j.hit, false); // 少见档普通球须全对
    assert.equal(r.j.status, 'pending');
    const enc = raw.prepare('SELECT quiz_state FROM encounters WHERE id=?').get(encId);
    assert.equal(enc.quiz_state, null, '确认后题组正常结算清掉');
    const rows = raw.prepare('SELECT question_id, correct FROM quiz_attempts WHERE child_id=1 ORDER BY question_id').all();
    assert.equal(rows.length, 2, '两题都落账（与全答口径一致）');
    assert.equal(rows.find((x) => x.question_id === q1.id).correct, 1);
    assert.equal(rows.find((x) => x.question_id === q2.id).correct, 0, '留空落账为答错');
  });

  test('answerIdx=null 算留空且永远判错（堵旧 Number(null)=0 在正确答案为首项时误判答对）', async () => {
    const { c1 } = await setup();
    seedCatchBank(); // 本组题正确答案一律 idx 0
    const encId = insertEncounter(1, 54, '可达鸭');
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    const nullAnswers = th.j.questions.map((q) => ({ questionId: q.id, answerIdx: null }));
    const blocked = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: nullAnswers } });
    assert.equal(blocked.status, 400);
    assert.equal(blocked.j.blanks, 2);
    const r = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: nullAnswers, confirmBlanks: true } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.correctCount, 0, 'null 不是「选了第 1 项」，不得误判答对');
  });

  test('退出续答（API 层）：pending 反复回带同一组题，球不重扣；孩子详情带 hasQuiz 标记', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 54, '可达鸭');
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    const thrownIds = th.j.questions.map((q) => q.id).sort((a, b) => a - b);
    // 「先退出」在服务端无任何写操作——退出后重进就是再调 pending，两次都应回带同一组题
    for (let i = 0; i < 2; i++) {
      const p = await call('/api/encounter/pending', { method: 'POST', cookie: c1, body: { childId: 1 } });
      assert.equal(p.j.ok, true, JSON.stringify(p.j));
      assert.deepEqual(p.j.encounter.quiz.questions.map((q) => q.id).sort((a, b) => a - b), thrownIds);
      assert.equal(p.j.encounter.quiz.ball, 'normal');
    }
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 2, '重进不重复扣球');
    const cd = await call('/api/child?id=1', { cookie: c1 });
    assert.equal(cd.j.child.pendingEncounter.hasQuiz, true, '孩子页入口据此显示「继续抓」（2026-10-27 §53 由「继续答题」收短）');
    // 续答答完正常结算
    const an = await call('/api/encounter/answer', {
      method: 'POST', cookie: c1,
      body: { encounterId: encId, answers: th.j.questions.map((q) => ({ questionId: q.id, answerIdx: correctIdx(q.id) })) },
    });
    assert.equal(an.j.hit, true);
    assert.equal(an.j.status, 'caught');
    const cd2 = await call('/api/child?id=1', { cookie: c1 });
    assert.equal(cd2.j.child.pendingEncounter, null);
  });

  test('草稿保存与恢复：答 2 留 1（点选即存）→ 直接关页重进恢复已选 → 补答第 3 题提交抓中', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 58, '卡蒂狗'); // 稀有档：普通球 3 题
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th.j.ok, true, JSON.stringify(th.j));
    assert.equal(th.j.questions.length, 3);
    const [q1, q2, q3] = th.j.questions;
    // 模拟点选即存：答对前两题（草稿整表存），第三题不答、不提交、不走退出钮（直接关页路径）
    const draft = { [q1.id]: correctIdx(q1.id), [q2.id]: correctIdx(q2.id) };
    const sv = await call('/api/encounter/draft', { method: 'POST', cookie: c1, body: { encounterId: encId, sel: draft } });
    assert.equal(sv.j.ok, true, JSON.stringify(sv.j));
    assert.deepEqual(sv.j.sel, draft);
    // 草稿不是提交：不落账、不结算、球数不变
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM quiz_attempts WHERE child_id=1').get().n, 0);
    const encMid = raw.prepare('SELECT status, balls_used FROM encounters WHERE id=?').get(encId);
    assert.equal(encMid.status, 'pending');
    assert.equal(encMid.balls_used, 1);
    // 重进：整组题相同、前两题选项原样恢复、第三题待答
    const p = await call('/api/encounter/pending', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.deepEqual(p.j.encounter.quiz.questions.map((q) => q.id), th.j.questions.map((q) => q.id));
    assert.deepEqual(p.j.encounter.quiz.sel, draft);
    assert.equal(p.j.encounter.quiz.sel[q3.id], undefined);
    // 补答第三题后整组提交（恢复的选项＋新选）→ 全对抓中
    const an = await call('/api/encounter/answer', {
      method: 'POST', cookie: c1,
      body: { encounterId: encId, answers: [...Object.entries(draft).map(([qid, idx]) => ({ questionId: Number(qid), answerIdx: idx })), { questionId: q3.id, answerIdx: correctIdx(q3.id) }] },
    });
    assert.equal(an.j.ok, true, JSON.stringify(an.j));
    assert.equal(an.j.hit, true);
    assert.equal(an.j.status, 'caught');
    assert.ok(raw.prepare("SELECT 1 x FROM pokedex WHERE child_id=1 AND entry_key='wild:58'").get());
  });

  test('草稿校验与隔离：外来题号/越界下标被丢弃；他人存草稿 403；结算后再存 400', async () => {
    const { c1, c2 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 54, '可达鸭'); // 少见档 2 题
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    const [q1, q2] = th.j.questions;
    const sv = await call('/api/encounter/draft', {
      method: 'POST', cookie: c1,
      body: { encounterId: encId, sel: { [q1.id]: 0, [q2.id]: 99, 999999: 1 } }, // q2 越界、999999 外来题号
    });
    assert.equal(sv.j.ok, true, JSON.stringify(sv.j));
    assert.deepEqual(sv.j.sel, { [q1.id]: 0 }, '只有本题组的合法选项被存下');
    const other = await call('/api/encounter/draft', { method: 'POST', cookie: c2, body: { encounterId: encId, sel: { [q1.id]: 1 } } });
    assert.equal(other.status, 403);
    const p = await call('/api/encounter/pending', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.deepEqual(p.j.encounter.quiz.sel, { [q1.id]: 0 }, '他人写入未污染草稿');
    // 全对结算后题组已清：再存草稿应被拒
    const an = await call('/api/encounter/answer', {
      method: 'POST', cookie: c1,
      body: { encounterId: encId, answers: th.j.questions.map((q) => ({ questionId: q.id, answerIdx: correctIdx(q.id) })) },
    });
    assert.equal(an.j.status, 'caught');
    const late = await call('/api/encounter/draft', { method: 'POST', cookie: c1, body: { encounterId: encId, sel: { [q1.id]: 0 } } });
    assert.equal(late.status, 400);
  });

  test('前端接线：退出按钮、留空双选提醒、确认提交带 confirmBlanks、入口「继续抓」标签', () => {
    const appJs = readFileSync(assetPath('app.js'), 'utf8');
    assert.match(appJs, /onclick="exitCatchQuiz\(\)"/);
    assert.match(appJs, /先退出，下次接着答/);
    assert.match(appJs, /function showCatchBlankConfirm\(n\)/);
    assert.match(appJs, /回去接着答/);
    assert.match(appJs, /onclick="closeModal\(\);submitCatchAnswers\(true\)"/);
    assert.match(appJs, /confirmBlanks: forceSubmit/);
    // 只有严格 true 才算确认（按钮 onclick 传入的事件对象不得绕过提醒）
    assert.match(appJs, /const forceSubmit = confirmed === true/);
    assert.match(appJs, /k\.pendingEncounter\.hasQuiz/);
    // 2026-10-27 §53：伙伴页入口由「继续答题！{名}」收短为「继续抓！{名}」（5 字名＋图标在 14px 下才放得下一行）；遭遇页内全宽「继续答题」按钮不动
    assert.match(appJs, /继续抓！/);
    // 草稿：点选即存、退出前再存、重进恢复已选答案
    assert.match(appJs, /api\('\/api\/encounter\/draft', \{ encounterId: E\.data\.id, sel: E\.sel \}\)/);
    const selFn = appJs.slice(appJs.indexOf('function selectCatchOpt'), appJs.indexOf('window.selectCatchOpt'));
    assert.match(selFn, /saveCatchDraft\(\)/);
    const exitFn = appJs.slice(appJs.indexOf('async function exitCatchQuiz'), appJs.indexOf('window.exitCatchQuiz'));
    assert.match(exitFn, /await saveCatchDraft\(\)/);
    assert.match(appJs, /j\.encounter\.quiz\.sel/);
  });
});

describe('PvP 卡死修复前端接线（2026-10-24）', () => {
  const appJs = readFileSync(assetPath('app.js'), 'utf8');

  test('加入凭证 sessionStorage 持久化：join 存、enterBattleView 恢复、结束/弃赛清除', () => {
    assert.match(appJs, /sessionStorage\.setItem\('pvpTok:' \+ bid, token\)/);
    assert.match(appJs, /function readPvpToken\(bid\)/);
    assert.match(appJs, /const savedTok = readPvpToken\(battle\.battleId\)/);
    assert.match(appJs, /storePvpToken\(battleId, j\.joinToken\)/);
    assert.match(appJs, /clearPvpToken\(B\.battleId\)/);
  });

  test('战斗动作全线带 busy 闸与异常重同步（不再静默无反馈）', () => {
    assert.match(appJs, /window\._battleBusy = true/);
    // battleMove / battleDefendIdx / battleSwap 出错或异常后都 refreshBattleState 重同步
    const moveFn = appJs.slice(appJs.indexOf('async function battleMove'), appJs.indexOf('function applyBattleResponse'));
    assert.match(moveFn, /catch \(e\)/);
    assert.match(moveFn, /refreshBattleState\(\)/);
    const defFn = appJs.slice(appJs.indexOf('async function battleDefendIdx'), appJs.indexOf('window.battleDefendIdx'));
    assert.match(defFn, /catch \(e\)/);
    assert.match(defFn, /refreshBattleState\(\)/);
    // 动作请求带 15 秒超时，不再无限挂死
    assert.match(appJs, /api\('\/api\/battle\/move', body, undefined, 15000\)/);
    assert.match(appJs, /api\('\/api\/battle\/defend', body, undefined, 15000\)/);
  });

  test('行动方看门狗与轮询异常续链都在', () => {
    assert.match(appJs, /function watchdogBattleState\(\)/);
    assert.match(appJs, /window\._battleWatch = setTimeout\(watchdogBattleState, 6000\)/);
    // refreshBattleState 的 catch 续上下一轮轮询（旧实现一抛异常轮询永久停摆）
    const refFn = appJs.slice(appJs.indexOf('async function refreshBattleState'), appJs.indexOf('/* 行动方看门狗'));
    assert.match(refFn, /catch \(e\)/);
    assert.match(refFn, /setTimeout\(refreshBattleState, 3000\)/);
  });
});

describe('道馆备战克制提示（§6）', () => {
  test('gym/status：收藏宠带 counters、主宠带 mainCounters、ballsSuper 下发', async () => {
    const { c1 } = await setup();
    raw.prepare("INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(1,'wild:50','2026-01-01')").run();
    raw.prepare("INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(1,'wild:16','2026-01-01')").run();
    const r = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const dm = r.j.collection.find((c) => c.no === 50); // 地鼠（地面）：克岩石 1 关、电 3 关、火 5 关与地面 6 关
    assert.deepEqual(dm.counters, [1, 3, 5, 6]);
    const bb = r.j.collection.find((c) => c.no === 16); // 波波（飞行）：克草 4 关
    assert.deepEqual(bb.counters, [4]);
    assert.deepEqual(r.j.mainCounters, [2]); // 大宝主宠电系：克水 2 关
    assert.equal(r.j.ballsSuper, 0);
  });
});

/* ---------------- 建议改 A 批（S2/S4/S5/S6/S10/S11/S12/S16/S20） ---------------- */

function shDayStr(ms) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}

describe('建议改 A 批（健壮性/公平性）', () => {
  test('S5 dexKeyForSpecies：字符串入参做 Number 归一化，不错键', () => {
    assert.equal(M.dexKeyForSpecies('50'), 'wild:50');
    assert.equal(M.dexKeyForSpecies(50), 'wild:50');
    assert.equal(M.dexKeyForSpecies('151'), 'rare:151');
    assert.equal(M.dexKeyForSpecies('143'), 'egg:143');
  });

  test('S6 speciesOfDexKey：馆主键（无 COLLECTION_MOVES）返回 null，不被当收藏宠', () => {
    // 2026-11-14 全量 151 批：95/125 已补招式表，不再是馆主特例（同 121）；无名册的例子改用 152。
    assert.equal(M.speciesOfDexKey('egg:95'), 95); // 大岩蛇：已补招式表，不再是馆主特例
    assert.equal(M.speciesOfDexKey('egg:121'), 121); // 宝石海星：已补招式表，不再是馆主特例
    assert.equal(M.speciesOfDexKey('egg:125'), 125); // 电击兽：已补招式表，不再是馆主特例
    assert.equal(M.speciesOfDexKey('egg:152'), null); // 菊草叶：无收藏招式
    assert.equal(M.speciesOfDexKey('wild:50'), 50);
    assert.equal(M.speciesOfDexKey('egg:143'), 143); // 卡比兽：封印蛋物种，有收藏招式
    assert.equal(M.speciesOfDexKey('rare:151'), 151);
    assert.equal(M.speciesOfDexKey('gym:95'), null);
  });

  test('S4 rollRng：有限但越界的值钳制到 [0,1)，非有限仍抛错', () => {
    assert.equal(M.rollRng(() => -0.5), 0);
    assert.equal(M.rollRng(() => -100), 0);
    const hi = M.rollRng(() => 2);
    assert.ok(hi < 1 && hi > 0.999, `钳后应贴近 1 而小于 1，实际 ${hi}`);
    assert.equal(M.rollRng(() => 0.25), 0.25);
    assert.throws(() => M.rollRng(() => NaN), TypeError);
    assert.throws(() => M.rollRng(() => Infinity), TypeError);
    assert.doesNotThrow(() => M.pickWildSpecies(seq(-1, 0))); // 负数注入不得让下标为负抛错
    const r = M.calcDamage({ name: '电击', type: '电', power: 50 }, { level: 10, type: '电', stats: null }, { level: 10, type: '火', stats: null }, seq(2, 0.5));
    assert.equal(r.critical, false);
    assert.ok(r.dmg <= 55, `浮动钳制后伤害不得超过 ×1.1 上限，实际 ${r.dmg}`); // 50 × 1.0 × ≤1.1
  });

  test('S2 暴击被闪避：文案不再并列「会心一击」与 0 伤害', () => {
    const petA = pet('皮丘', '电', 200, [{ name: '电击', type: '电', power: 50 }]);
    const petB = pet('小火龙', '火', 200, [{ name: '火花', type: '火', power: 40 }]);
    const st = M.createBattleState({ mode: 'pvp', firstSide: 'B', sides: { A: side(1, '大宝', [petA]), B: side(2, '小宝', [petB]) } });
    M.applyBattleAction(st, 'B', null, () => 0.5);
    const staged = M.stagePvpAttack(st, 'A', '电击', seq(0.5, 0)); // 第二掷 0 → 暴击
    assert.equal(staged.critical, true);
    const r = M.resolveStagedAttack(st, { ...staged, attacker: 'A' }, { kind: 'dodge' });
    const atk = r.events.find((e) => e.type === 'attack');
    assert.equal(atk.dmg, 0);
    assert.ok(!atk.text.includes('会心一击'), atk.text);
    assert.ok(!atk.text.includes('0 点伤害'), atk.text);
    assert.equal(st.sides.B.pets[0].hp, 200); // 数值不变：闪避仍是 0 伤害
  });

  test('S10 隔日遭遇：昨天的遭遇不能投球，昨天的题组不能续答', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const yd = shDayStr(Date.now() - 86400000);
    raw.prepare('INSERT INTO encounters(child_id, date, pokemon_no, name) VALUES(1,?,?,?)').run(yd, 16, '波波');
    const oldId = Number(raw.prepare('SELECT last_insert_rowid() AS id').get().id);
    const thOld = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: oldId, ball: 'normal' } });
    assert.equal(thOld.j.ok, false, JSON.stringify(thOld.j));
    assert.match(thOld.j.error, /之前留下的/);
    // 今天投球出的题组，把遭遇日期回拨到昨天后续答 → 同样拒绝
    const encId = insertEncounter(1, 16, '波波');
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th.j.ok, true, JSON.stringify(th.j));
    const q = th.j.questions[0];
    raw.prepare('UPDATE encounters SET date=? WHERE id=?').run(yd, encId);
    const an = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: [{ questionId: q.id, answerIdx: correctIdx(q.id) }] } });
    assert.equal(an.j.ok, false, JSON.stringify(an.j));
    assert.match(an.j.error, /之前留下的/);
  });

  test('S12 题库不足：有效题少于档位应答数时不扣球并提示', async () => {
    const { c1 } = await setup();
    raw.prepare('UPDATE quiz_questions SET active=0').run();
    raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('study',3,'数学','唯一一道有效题','[\"对的\",\"错的\",\"不知道\",\"跳过\"]',0,'解析',1,0,0)").run();
    const encId = insertEncounter(1, 58, '卡蒂狗'); // 稀有档普通球需 3 题
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th.j.ok, false, JSON.stringify(th.j));
    assert.match(th.j.error, /题不够/);
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 3); // 一颗没扣
    const enc = raw.prepare('SELECT balls_used, quiz_state FROM encounters WHERE id=?').get(encId);
    assert.equal(enc.balls_used, 0);
    assert.equal(enc.quiz_state, null);
  });

  test('S11 题被删：total 按有效题数计，答对剩余题照常命中', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 54, '可达鸭'); // 少见档普通球 2 题
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th.j.ok, true, JSON.stringify(th.j));
    assert.equal(th.j.questions.length, 2);
    const [q1, q2] = th.j.questions;
    raw.prepare('DELETE FROM quiz_questions WHERE id=?').run(q2.id); // 家长删掉其中一题
    const an = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: [{ questionId: q1.id, answerIdx: correctIdx(q1.id) }] } });
    assert.equal(an.j.ok, true, JSON.stringify(an.j));
    assert.equal(an.j.total, 1); // 已删题不占分母、不算错
    assert.equal(an.j.correctCount, 1);
    assert.equal(an.j.hit, true);
    assert.equal(an.j.status, 'caught');
  });

  test('S11 整组题全删：退回本次投球的球、清题组、可重新投球', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    const encId = insertEncounter(1, 16, '波波'); // 常见档 1 题
    const th = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th.j.ok, true, JSON.stringify(th.j));
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 2);
    raw.prepare('DELETE FROM quiz_questions WHERE id=?').run(th.j.questions[0].id);
    const an = await call('/api/encounter/answer', { method: 'POST', cookie: c1, body: { encounterId: encId, answers: [{ questionId: th.j.questions[0].id, answerIdx: 0 }] } });
    assert.equal(an.j.ok, false, JSON.stringify(an.j));
    assert.equal(an.j.refunded, true);
    assert.match(an.j.error, /退回/);
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 3); // 球已退回
    const enc = raw.prepare('SELECT status, quiz_state, balls_used FROM encounters WHERE id=?').get(encId);
    assert.equal(enc.status, 'pending');
    assert.equal(enc.quiz_state, null);
    const th2 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } });
    assert.equal(th2.j.ok, true, JSON.stringify(th2.j)); // 清组后可重新投球出题
    assert.equal(th2.j.questions.length, 1);
  });

  test('S20 resume：超级球题组续答不换球种、不重复扣球、回传库存为真实值', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    raw.prepare('UPDATE children SET balls_super=2 WHERE id=1').run();
    const encId = insertEncounter(1, 43, '走路草'); // 常见档
    const th1 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'super' } });
    assert.equal(th1.j.ok, true, JSON.stringify(th1.j));
    assert.equal(th1.j.ball, 'super');
    assert.equal(th1.j.questions.length, 2); // 超级球 1+1
    assert.equal(th1.j.ballsSuper, 1);
    const th2 = await call('/api/encounter/throw', { method: 'POST', cookie: c1, body: { encounterId: encId, ball: 'normal' } }); // 换参数再点
    assert.equal(th2.j.ok, true, JSON.stringify(th2.j));
    assert.equal(th2.j.resumed, true);
    assert.equal(th2.j.ball, 'super'); // 回传球种等于原题组球种
    assert.deepEqual(th2.j.questions.map((q) => q.id), th1.j.questions.map((q) => q.id));
    assert.equal(th2.j.ballsSuper, 1); // 真实库存，未重复扣超级球
    assert.equal(th2.j.balls, 3); // 普通球一颗没动
    assert.equal(raw.prepare('SELECT balls_super FROM children WHERE id=1').get().balls_super, 1);
    assert.equal(raw.prepare('SELECT balls_used FROM encounters WHERE id=?').get(encId).balls_used, 1);
  });

  test('S16 视图不透传 hits 原值：pending 与孩子详情只给派生字段 caught', async () => {
    const { c1 } = await setup();
    seedCatchBank();
    insertEncounter(1, 16, '波波');
    const p = await call('/api/encounter/pending', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(p.j.ok, true);
    assert.ok(p.j.encounter);
    assert.equal(p.j.encounter.caught, false);
    assert.ok(!('hits' in p.j.encounter), 'encounterView 不得再透传 hits');
    const d = await call('/api/child?id=1', { cookie: c1 });
    assert.equal(d.j.ok, true, JSON.stringify(d.j));
    assert.ok(d.j.child.pendingEncounter);
    assert.equal(d.j.child.pendingEncounter.caught, false);
    assert.ok(!('hits' in d.j.child.pendingEncounter), '孩子详情 pendingEncounter 不得再透传 hits');
  });
});
