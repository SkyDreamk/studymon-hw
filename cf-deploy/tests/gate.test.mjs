/* 进度门全口径（2026-10-24 超纲事件后补齐；2026-10-24 北师大重标后夹具换表）：node --test tests/gate.test.mjs
 * 覆盖：① 抓捕选题接进度门（默认二单元门挡住分数/fail-closed 标记/四年级章节题；
 * 门随家长设定移动）；② 防守题按防守方进度过滤（历史超纲题不再复现；
 * 仅超纲记录时谜语兜底触发防守答题，无谜语时返回 null 走即时结算兜底；约 1/3 直接抽谜语）；③ 激活检查（数学学习题无标签/
 * 标签无法解析不得激活；非数学题与家长自定义题不在此限）；④ 批量校验脚本
 * CLI（有效文件过、违规文件非零退出、旧版章节被版本比对关挡住、fail-closed
 * 标记只警告不阻塞）；⑤ 北师大表与默认（1–6 年级表全可解析、年级字与表键一致、
 * 默认均为上册第 2 单元）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));
const MIGS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0013_bsn_math_chapters.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql'];

const C = {
  U1: '三年级上册 第1单元 混合运算',
  U2: '三年级上册 第2单元 观察物体',
  U3: '三年级上册 第3单元 加与减',
  U6: '三年级下册 第6单元 认识分数',
  ZH: '待核对（北师大未对应）',
  G4U6: '四年级上册 第6单元 除法',
  G1U2: '一年级上册 第2单元 比较',
  G1U3: '一年级上册 第3单元 加减法（一）',
};

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGS) raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
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
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
  return { env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } }, raw, db };
}

let env, raw, db;
const seeded = (s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const insQ = (id, kind, grade, subject, chapter, active = 1) => raw.prepare(
  `INSERT INTO quiz_questions(id,kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,topic_id,chapter)
   VALUES(?,?,?,?,?,?,?,?,?,0,1,?,?)`).run(id, kind, grade, subject, `题${id}`, '["A","B","C","D"]', 0, '', active, null, chapter);
const insAttempt = (child, qid, date, correct = 1) => raw.prepare(
  `INSERT INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch)
   VALUES(?,?,?,?,0,0,1)`).run(child, qid, date, correct);
const setProgress = (child, chapter) => raw.prepare(
  `INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(`math_progress_${child}`, chapter);

beforeEach(() => {
  ({ env, raw, db } = makeEnv());
  // 迁移自带原始题库（无 chapter 旧题），先清表再播受控题组，保证断言精确
  raw.exec('DELETE FROM quiz_questions');
  // 抓捕/防守池：101=三上二单元（门内）、102=三上一单元（门内）、103=分数（门外）、
  // 104=fail-closed 标记（无法解析，门外）、105=四年级章节但年级挂三年级（门外）、106=语文三上二单元（语文默认门内，2026-10-29 学习进度B：空标签 fail-closed 后旧空标签夹具改打规范标签，门未放宽）、
  // 107=谜语（不过门）、108=一年级二单元（一年级门内）、111=三上三单元（默认门外）、112=一年级三单元（一年级门外）
  insQ(101, 'study', 3, '数学', C.U2);
  insQ(102, 'study', 3, '数学', C.U1);
  insQ(103, 'study', 3, '数学', C.U6);
  insQ(104, 'study', 3, '数学', C.ZH);
  insQ(105, 'study', 3, '数学', C.G4U6);
  insQ(106, 'study', 3, '语文', '三年级上册 第2单元');
  insQ(107, 'riddle', null, null, null);
  insQ(108, 'study', 1, '数学', C.G1U2);
  insQ(111, 'study', 3, '数学', C.U3);
  insQ(112, 'study', 1, '数学', C.G1U3);
  // 激活检查专用（默认不激活）：120=数学无标签、121=数学标签无法解析、122=数学有效标签、123=语文无标签
  insQ(120, 'study', 3, '数学', null, 0);
  insQ(121, 'study', 3, '数学', '胡言乱语', 0);
  insQ(122, 'study', 3, '数学', C.U2, 0);
  insQ(123, 'study', 3, '语文', null, 0);
});

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
const activeOf = (id) => raw.prepare('SELECT active FROM quiz_questions WHERE id=?').get(id).active;

describe('抓捕选题接进度门', () => {
  test('默认二单元门：门内全出、分数/fail-closed 标记/四年级章节/三单元一律不出', async () => {
    const got = await M.pickCatchQuestions(db, { id: 1, grade_label: '三年级' }, 20, seeded(7));
    const ids = got.map((q) => q.id).sort((a, b) => a - b);
    assert.deepEqual(ids, [101, 102, 106]);
  });
  test('门随家长设定移动到三单元：三单元题可出、分数题仍不出', async () => {
    setProgress(1, C.U3);
    const got = await M.pickCatchQuestions(db, { id: 1, grade_label: '三年级' }, 20, seeded(7));
    const ids = got.map((q) => q.id).sort((a, b) => a - b);
    assert.deepEqual(ids, [101, 102, 106, 111]);
  });
  test('门随家长设定移动到三下六单元（认识分数）：分数题可出、四年级章节题仍不出', async () => {
    setProgress(1, C.U6);
    const got = await M.pickCatchQuestions(db, { id: 1, grade_label: '三年级' }, 20, seeded(7));
    const ids = got.map((q) => q.id);
    assert.ok(ids.includes(103), '六单元门内应含分数题');
    assert.ok(!ids.includes(105), '四年级章节题在任何三上门内都不应出');
  });
  test('一年级孩子走一年级门：一年级二单元可出、三年级题与一年级三单元不出', async () => {
    const got = await M.pickCatchQuestions(db, { id: 2, grade_label: '一年级' }, 20, seeded(7));
    const ids = got.map((q) => q.id).sort((a, b) => a - b);
    assert.deepEqual(ids, [108]);
  });
});


describe('抓捕／单元测试选题排除 Oak 题', () => {
  function insertOak(id, grade) {
    raw.prepare(`
      INSERT INTO quiz_questions
        (id, kind, grade, subject, chapter, question, options_json, answer_idx, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      'oak',
      grade,
      '英语',
      null,
      "It's rainy.",
      '["下雨了。"]',
      0,
      1
    );
  }

  test('抓捕永不返回 Oak 题（正常题池）', async () => {
    insertOak(130, 3);
    insertOak(131, 1);

    const questions = await M.pickCatchQuestions(
      db,
      { id: 1, grade_label: '三年级' },
      20,
      seeded(7)
    );
    const ids = questions.map((q) => Number(q.id));

    assert.ok(!ids.includes(130));
    assert.ok(!ids.includes(131));
  });

  test('抓捕题库只剩 Oak 题时返回空而不是 Oak 题', async () => {
    raw.exec('DELETE FROM quiz_questions');
    insertOak(130, 3);
    insertOak(131, 1);

    const questions = await M.pickCatchQuestions(
      db,
      { id: 1, grade_label: '三年级' },
      5,
      seeded(7)
    );

    assert.deepEqual(questions, []);
  });

  test('单元测试选题排除 Oak 题', async () => {
    insQ(140, 'study', 3, '英语', '三年级上册 Unit 1 Making friends');
    insertOak(130, 3);

    const questions = await M.pickUnitTestQuestions(
      db,
      { id: 1, grade_label: '三年级' },
      '英语',
      '三年级上册 Unit 1 Making friends',
      20,
      seeded(7)
    );
    const ids = questions.map((q) => Number(q.id));

    assert.ok(ids.includes(140));
    assert.ok(!ids.includes(130));
  });

  test('每日问答仍排除 Oak 题', async () => {
    const rows = [
      {
        id: 130,
        kind: 'oak',
        grade: 3,
        subject: '英语',
        chapter: null,
        question: "It's rainy.",
        options: ['下雨了。'],
        answer_idx: 0,
        active: true
      },
      {
        id: 141,
        kind: 'study',
        grade: 3,
        subject: '英语',
        chapter: 'Unit 1',
        question: 'Choose A.',
        options: ['A', 'B', 'C', 'D'],
        answer_idx: 0,
        active: true
      }
    ];

    const questions = await M.selectDailyQuestions(rows, {
      gradeNum: 3,
      subjects: ['英语'],
      excludeIds: [],
      history: new Map(),
      today: M.shDateStr(),
      correctWindowDays: 30,
      mathGate: null,
      rng: seeded(7)
    });
    const ids = questions.map((q) => Number(q.id));

    assert.ok(ids.includes(141));
    assert.ok(!ids.includes(130));
  });
});

describe('防守题按防守方进度过滤', () => {
  test('历史里有超纲题：防守题永不抽中分数题', async () => {
    const today = M.shDateStr();
    insAttempt(1, 101, today);
    insAttempt(1, 103, today);
    insAttempt(1, 106, today);
    const ws = M.weekStartMon(today);
    for (let i = 0; i < 20; i++) {
      // rng 恒 0.9 → 不走谜语分支（1/3），只验历史池过滤
      const q = await M.pickDefenseQuestion(db, 1, today, ws, () => 0.9);
      assert.ok(q, '池内有门内题时应出题');
      assert.notEqual(q.id, 103, '超纲历史题不得复现');
      assert.ok([101, 106].includes(q.id));
    }
  });
  test('仅有超纲历史记录：谜语兜底触发防守答题', async () => {
    const today = M.shDateStr();
    insAttempt(1, 103, today);
    const q = await M.pickDefenseQuestion(db, 1, today, M.weekStartMon(today));
    assert.ok(q, '历史池为空时应由谜语兜底出题');
    assert.equal(q.id, 107); // 夹具里唯一 active 谜语
    assert.equal(q.subject, '');
  });
  test('仅有超纲历史记录且无可用谜语：返回 null，走即时结算兜底', async () => {
    const today = M.shDateStr();
    insAttempt(1, 103, today);
    raw.exec("UPDATE quiz_questions SET active=0 WHERE kind='riddle'");
    const q = await M.pickDefenseQuestion(db, 1, today, M.weekStartMon(today));
    assert.equal(q, null);
  });
  test('约 1/3 直接抽脑筋急转弯（rng 恒小于 1/3 时恒抽谜语）', async () => {
    const today = M.shDateStr();
    insAttempt(1, 101, today);
    insAttempt(1, 106, today);
    const ws = M.weekStartMon(today);
    for (let i = 0; i < 10; i++) {
      const q = await M.pickDefenseQuestion(db, 1, today, ws, () => 0.1);
      assert.ok(q, '应出题');
      assert.equal(q.id, 107, 'rng<1/3 时应抽中谜语');
      assert.ok(Array.isArray(q.options) && q.options.length === 4);
    }
  });
  test('防守方进度移到三下六单元后：分数题可出', async () => {
    setProgress(1, C.U6);
    const today = M.shDateStr();
    insAttempt(1, 101, today);
    insAttempt(1, 103, today);
    const ws = M.weekStartMon(today);
    let seen = false;
    for (let i = 0; i < 40; i++) {
      // rng 恒 0.9 → 不走谜语分支，只验历史池
      const q = await M.pickDefenseQuestion(db, 1, today, ws, () => 0.9);
      if (q && q.id === 103) { seen = true; break; }
    }
    assert.ok(seen, '六单元门内分数题应可被抽中');
  });
});

describe('激活检查（入库标签规矩）', () => {
  test('questionActivationError 纯函数口径', () => {
    assert.equal(M.questionActivationError({ kind: 'study', subject: '数学', chapter: C.U2 }), null);
    assert.match(M.questionActivationError({ kind: 'study', subject: '数学', chapter: null }), /章节标签/);
    assert.match(M.questionActivationError({ kind: 'study', subject: '数学', chapter: '' }), /章节标签/);
    assert.match(M.questionActivationError({ kind: 'study', subject: '数学', chapter: '胡言乱语' }), /无法解析/);
    assert.equal(M.questionActivationError({ kind: 'study', subject: '语文', chapter: null }), null);
    assert.equal(M.questionActivationError({ kind: 'custom', subject: '数学', chapter: null }), null);
    assert.equal(M.questionActivationError({ kind: 'riddle', subject: null, chapter: null }), null);
  });
  test('开关接口：数学无标签/无法解析拒绝激活、有效标签可激活、语文无标签可激活、停用不受限', async () => {
    const pc = await parentCookie();
    let r = await call('/api/parent/questions/120/toggle', { method: 'POST', cookie: pc });
    assert.equal(r.status, 400);
    assert.equal(activeOf(120), 0);
    r = await call('/api/parent/questions/121/toggle', { method: 'POST', cookie: pc });
    assert.equal(r.status, 400);
    assert.equal(activeOf(121), 0);
    r = await call('/api/parent/questions/122/toggle', { method: 'POST', cookie: pc });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(activeOf(122), 1);
    r = await call('/api/parent/questions/123/toggle', { method: 'POST', cookie: pc });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(activeOf(123), 1);
    r = await call('/api/parent/questions/101/toggle', { method: 'POST', cookie: pc });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(activeOf(101), 0);
  });
});

describe('批量校验脚本 CLI', () => {
  test('有效文件过、违规文件非零退出、旧版章节被版本比对关挡住、标记只警告', () => {
    const okFile = '/tmp/gate-candidates-ok.json';
    const badFile = '/tmp/gate-candidates-bad.json';
    const oldPepFile = '/tmp/gate-candidates-oldpep.json';
    const markerFile = '/tmp/gate-candidates-marker.json';
    writeFileSync(okFile, JSON.stringify([
      { q: 't1', subject: '数学', chapter: C.U2, source: 's1' },
      { q: 't2', subject: '语文', chapter: null, source: 's2' },
    ]));
    writeFileSync(badFile, JSON.stringify([
      { q: 't1', subject: '数学', chapter: C.U2, source: 's1' },
      { q: 't2', subject: '数学', chapter: null, source: 's2' },
      { q: 't3', subject: '数学', chapter: '胡言乱语', source: 's3' },
    ]));
    const ok = spawnSync('node', ['scripts/check-quiz-candidates.mjs', okFile], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    const bad = spawnSync('node', ['scripts/check-quiz-candidates.mjs', badFile], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /违规/);
    writeFileSync(oldPepFile, JSON.stringify([
      { q: 't1', subject: '数学', chapter: '三年级上册 第6单元 分数的初步认识', source: 's1' },
    ]));
    const oldPep = spawnSync('node', ['scripts/check-quiz-candidates.mjs', oldPepFile], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
    assert.equal(oldPep.status, 1);
    assert.match(oldPep.stderr, /不在 MATH_CHAPTERS 表内/);
    writeFileSync(markerFile, JSON.stringify([
      { q: 't1', subject: '数学', chapter: '待核对（北师大未对应）', topicId: 'cnm_p076', source: 's1' },
    ]));
    const marker = spawnSync('node', ['scripts/check-quiz-candidates.mjs', markerFile], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
    assert.equal(marker.status, 0, marker.stderr);
    assert.match(marker.stderr + marker.stdout, /fail-closed/);
    unlinkSync(okFile);
    unlinkSync(badFile);
    unlinkSync(oldPepFile);
    unlinkSync(markerFile);
  });
});

describe('北师大表与默认（重标后）', () => {
  test('1–6 年级表全可解析、年级字与表键一致、严格递增', () => {
    for (const g of [1, 2, 3, 4, 5, 6]) {
      const list = M.MATH_CHAPTERS[g];
      assert.ok(Array.isArray(list) && list.length > 0, `${g} 年级表应存在`);
      for (let i = 0; i < list.length; i++) {
        const o = M.chapterOrder(list[i]);
        assert.ok(Number.isFinite(o), `${g} 年级 ${list[i]} 应可解析`);
        assert.equal(Math.floor(o / 10000), g, `${list[i]} 年级字应与表键 ${g} 一致`);
        if (i > 0) assert.ok(M.chapterOrder(list[i - 1]) < o, `${g} 年级表应严格递增：${list[i - 1]} < ${list[i]}`);
      }
    }
  });
  test('默认均为上册第 2 单元', () => {
    assert.equal(M.defaultMathChapter(1), '一年级上册 第2单元 比较');
    assert.equal(M.defaultMathChapter(3), '三年级上册 第2单元 观察物体');
    assert.equal(M.defaultMathChapter(2), '二年级上册 第2单元 购物');
    assert.equal(M.defaultMathChapter(4), '四年级上册 第2单元 线与角');
    assert.equal(M.defaultMathChapter(5), '五年级上册 第2单元 轴对称和平移');
    assert.equal(M.defaultMathChapter(6), '六年级上册 第2单元 百分数的应用');
  });
});
