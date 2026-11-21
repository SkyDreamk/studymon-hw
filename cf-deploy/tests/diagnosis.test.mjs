/* 先修回溯诊断单测：node --test tests/diagnosis.test.mjs
 * 覆盖设计稿 §8.1（纯函数与数据规则）：窗口边界、薄弱阈值、不稳、回溯顺序与上限、
 * fail-closed／p014 红线、环路不死循环、出题排除与进度门、确定性；另验迁移 0017 落库。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const TODAY = '2026-10-26';
const START = '2026-09-27'; // TODAY - 29 天，30 天窗口含两端

// qTopic：qid → topicId（只含数学学习题）
const QT = new Map([
  [101, 'cnm_p010'], [102, 'cnm_p010'], [103, 'cnm_p010'], [104, 'cnm_p010'], [105, 'cnm_p010'],
  [111, 'cnm_p021'], [112, 'cnm_p021'],
  [121, 'cnm_p006'], [122, 'cnm_p006'],
  [131, 'cnm_p999'], // 不在图内的 topic
]);
const att = (qid, date, correct) => ({ question_id: qid, date_shanghai: date, correct: !!correct });

describe('diagTopicStates 窗口统计', () => {
  test('窗口边界：第 30 天计入、第 31 天不计', () => {
    const s = M.diagTopicStates([
      att(101, '2026-09-26', false), // 窗口外（第 31 天）
      att(101, '2026-09-27', false), // 窗口内（第 30 天）
      att(102, '2026-10-26', false), // 当天
      att(103, '2026-10-27', false), // 未来
    ], QT, START, TODAY);
    const p010 = s.get('cnm_p010');
    assert.equal(p010.wrong, 2);
    assert.equal(p010.total, 2);
    assert.equal(p010.state, 'weak');
  });
  test('薄弱：错 2 次占比恰 50% 命中；错 2 次占比低于 50% 不命中', () => {
    const hit = M.diagTopicStates([
      att(101, '2026-10-20', false), att(102, '2026-10-21', false),
      att(103, '2026-10-22', true), att(104, '2026-10-23', true),
    ], QT, START, TODAY).get('cnm_p010');
    assert.equal(hit.state, 'weak'); // 2/4 = 50%
    const miss = M.diagTopicStates([
      att(101, '2026-10-20', false), att(102, '2026-10-21', false),
      att(103, '2026-10-22', true), att(104, '2026-10-23', true), att(105, '2026-10-24', true),
    ], QT, START, TODAY).get('cnm_p010');
    assert.equal(miss.state, 'ok'); // 2/5 = 40%
  });
  test('错 1 次只记不稳；无错为掌握；跨题聚合', () => {
    const s = M.diagTopicStates([
      att(111, '2026-10-20', false), // p021 错 1 次
      att(121, '2026-10-20', true), att(122, '2026-10-21', true), // p006 全对
      att(101, '2026-10-20', false), att(102, '2026-10-21', false), // p010 跨题 2 错
    ], QT, START, TODAY);
    assert.equal(s.get('cnm_p021').state, 'unstable');
    assert.equal(s.get('cnm_p006').state, 'ok');
    assert.equal(s.get('cnm_p010').state, 'weak');
    assert.equal(s.get('cnm_p010').wrong, 2);
  });
  test('不在图内的 topic 与无映射的作答不参与', () => {
    const s = M.diagTopicStates([
      att(131, '2026-10-20', false), att(131, '2026-10-21', false), // cnm_p999 不在图内
      att(999, '2026-10-20', false), // 无 topic 映射
    ], QT, START, TODAY);
    assert.equal(s.size, 0);
  });
});

describe('diagWeakestTopic 最弱点', () => {
  test('错次数最多者胜；并列取最近一次错最新者；再并列取 topicId 最小者', () => {
    const mk = (wrong, total, last) => ({ wrong, total, lastWrongDate: last, state: 'weak' });
    const states = new Map([
      ['cnm_p021', mk(2, 2, '2026-10-20')],
      ['cnm_p010', mk(3, 3, '2026-10-19')],
      ['cnm_p006', mk(3, 3, '2026-10-22')],
    ]);
    assert.equal(M.diagWeakestTopic(states), 'cnm_p006'); // 3 次且最新
    const tie = new Map([
      ['cnm_p021', mk(2, 2, '2026-10-20')],
      ['cnm_p010', mk(2, 2, '2026-10-20')],
    ]);
    assert.equal(M.diagWeakestTopic(tie), 'cnm_p010'); // 全并列取 id 最小
    assert.equal(M.diagWeakestTopic(new Map([['cnm_p021', { wrong: 1, total: 1, lastWrongDate: '2026-10-20', state: 'unstable' }]])), null);
  });
});

describe('diagFindRoot 回溯', () => {
  const noWeak = () => false;
  test('链头自为根因：cnm_p001 无先修', () => {
    const r = M.diagFindRoot('cnm_p001', noWeak);
    assert.deepEqual(r.chain.map((c) => c.topicId), ['cnm_p001']);
    assert.equal(r.rootId, 'cnm_p001');
    assert.equal(r.note, null);
  });
  test('第一个薄弱祖先即根因：p010 → p006（弱）即停', () => {
    const r = M.diagFindRoot('cnm_p010', (t) => t === 'cnm_p006');
    assert.deepEqual(r.chain.map((c) => c.topicId), ['cnm_p010', 'cnm_p006']);
    assert.equal(r.rootId, 'cnm_p006');
    assert.equal(r.chain[1].strength, 'hard');
  });
  test('hard 优先：p217 的 soft 先修弱时先到 soft，hard 先修不弱时才下潜', () => {
    // p217：hard→p034，soft→p009
    const softWeak = M.diagFindRoot('cnm_p217', (t) => t === 'cnm_p009');
    assert.equal(softWeak.rootId, 'cnm_p009');
    assert.equal(softWeak.chain[1].strength, 'soft');
    const noneWeak = M.diagFindRoot('cnm_p217', noWeak);
    assert.deepEqual(noneWeak.chain.map((c) => c.topicId),
      ['cnm_p217', 'cnm_p034', 'cnm_p032', 'cnm_p027', 'cnm_p026', 'cnm_p021', 'cnm_p020']);
    assert.equal(noneWeak.chain[1].strength, 'hard');
  });
  test('深度上限 6 层：p013 无弱祖先时链长 7（触发点＋6 层），根因为最深点', () => {
    const r = M.diagFindRoot('cnm_p013', noWeak);
    assert.equal(r.chain.length, 7);
    assert.deepEqual(r.chain.map((c) => c.topicId),
      ['cnm_p013', 'cnm_p012', 'cnm_p011', 'cnm_p007', 'cnm_p006', 'cnm_p004', 'cnm_p001']);
    assert.equal(r.rootId, 'cnm_p001');
    assert.equal(r.note, null);
  });
  test('fail-closed：触发点本身是 p076 时即停并记仅提示', () => {
    const r = M.diagFindRoot('cnm_p076', noWeak);
    assert.deepEqual(r.chain.map((c) => c.topicId), ['cnm_p076']);
    assert.equal(r.rootId, 'cnm_p076');
    assert.equal(r.note, 'fail-closed');
  });
  test('cnm_p014：p023 → p014 即停记无题可出；p024 → p023 → p014', () => {
    const r1 = M.diagFindRoot('cnm_p023', noWeak);
    assert.deepEqual(r1.chain.map((c) => c.topicId), ['cnm_p023', 'cnm_p014']);
    assert.equal(r1.rootId, 'cnm_p014');
    assert.equal(r1.note, 'no-question');
    const r2 = M.diagFindRoot('cnm_p024', noWeak);
    assert.deepEqual(r2.chain.map((c) => c.topicId), ['cnm_p024', 'cnm_p023', 'cnm_p014']);
    assert.equal(r2.note, 'no-question');
  });
  test('全图回溯必终止且链长 ≤7（无弱祖先时）', () => {
    for (const t of M.MATH_PREREQ_G1G3.topics.filter((x) => x.inScope)) {
      const r = M.diagFindRoot(t.id, noWeak);
      assert.ok(r.chain.length >= 1 && r.chain.length <= 7, `${t.id} 链长 ${r.chain.length}`);
      assert.ok(new Set(r.chain.map((c) => c.topicId)).size === r.chain.length, `${t.id} 链内重复`);
    }
  });
  test('确定性：同一输入同一输出', () => {
    const a = M.diagFindRoot('cnm_p217', (t) => t === 'cnm_p009');
    const b = M.diagFindRoot('cnm_p217', (t) => t === 'cnm_p009');
    assert.deepEqual(a, b);
  });
});

describe('diagPickReview 复习题选题', () => {
  const gate = M.mathGateFor(1, '一年级上册 第2单元 比较');
  const mkQ = (id, topicId, grade, chapter, active = 1) => ({
    id, kind: 'study', grade, subject: '数学', question: `Q${id}`, options: ['A', 'B', 'C', 'D'],
    answer_idx: 0, explain: '', chapter, topicId, active,
  });
  const pool = [
    mkQ(1, 'cnm_p010', 1, '一年级上册 第1单元 生活中的数'), // 从未答过
    mkQ(2, 'cnm_p010', 1, '一年级上册 第1单元 生活中的数'), // 答过 10-01
    mkQ(3, 'cnm_p010', 1, '一年级上册 第1单元 生活中的数'), // 答过 10-20
    mkQ(4, 'cnm_p010', 1, '一年级上册 第1单元 生活中的数'), // 当日题单
    mkQ(5, 'cnm_p010', 1, '一年级上册 第1单元 生活中的数'), // 当日已答
    mkQ(6, 'cnm_p010', 1, '一年级上册 第1单元 生活中的数', 0), // 已下架
    mkQ(7, 'cnm_p011', 1, '一年级上册 第1单元 生活中的数'), // 别的知识点
    mkQ(8, 'cnm_p010', 3, '三年级上册 第3单元 加与减'), // 年级不对（根因为一年级点）
    mkQ(9, 'cnm_p010', 1, '一年级上册 第7单元 加减法（二）'), // 超进度门
  ];
  const hist = new Map([
    [2, { lastDate: '2026-10-01', lastCorrect: true }],
    [3, { lastDate: '2026-10-20', lastCorrect: true }],
  ]);
  test('从未答过优先、其次最久远；排除当日题单／当日已答／下架／错知识点／错年级／超门', () => {
    const picked = M.diagPickReview(pool, {
      rootTopicId: 'cnm_p010',
      excludeIds: new Set([4]), answeredIds: new Set([5]), mathGate: gate, history: hist,
    });
    assert.deepEqual(picked.map((q) => q.id), [1, 2]);
  });
  test('已出过的题不重复；题不足时出实际数量、不报错', () => {
    const picked = M.diagPickReview(pool, {
      rootTopicId: 'cnm_p010',
      excludeIds: new Set([4]), answeredIds: new Set([5]),
      issuedIds: new Set([1, 2]), mathGate: gate, history: hist,
    });
    assert.deepEqual(picked.map((q) => q.id), [3]);
    assert.deepEqual(M.diagPickReview(pool, {
      rootTopicId: 'cnm_p010',
      excludeIds: new Set([4]), answeredIds: new Set([5]),
      issuedIds: new Set([1, 2, 3]), mathGate: gate, history: hist,
    }), []);
  });
  test('根因不在图内不出题', () => {
    assert.deepEqual(M.diagPickReview(pool, { rootTopicId: 'cnm_p999' }), []);
  });
});

describe('迁移 0017（诊断表）', () => {
  test('建表＋索引就位；一孩一根因同时只留一行 pending', () => {
    const raw = new DatabaseSync(':memory:');
    for (const f of [
      '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql',
      '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql',
      '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql',
      '0013_bsn_math_chapters.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql',
      '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql',
    ]) {
      raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
    }
    const tbl = raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quiz_diagnoses'").get();
    assert.ok(tbl, 'quiz_diagnoses 表存在');
    const idx = raw.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='quiz_diagnoses'").all().map((r) => r.name);
    assert.ok(idx.includes('idx_diag_pending'), 'pending 部分唯一索引存在');
    assert.ok(idx.includes('idx_diag_child_date'), 'child_date 索引存在');
    const ins = raw.prepare(
      "INSERT INTO quiz_diagnoses(child_id,trigger_topic_id,root_topic_id,chain_json,status,review_question_ids,review_correct,created_date,created_epoch) VALUES(?,?,?,?, 'pending','[]',0,?,?)",
    );
    ins.run(2, 'cnm_p021', 'cnm_p010', '[]', '2026-10-26', 1761500000);
    assert.throws(() => ins.run(2, 'cnm_p020', 'cnm_p010', '[]', '2026-10-26', 1761500001), /UNIQUE constraint failed/);
    ins.run(2, 'cnm_p021', 'cnm_p006', '[]', '2026-10-26', 1761500002); // 别的根因可以
    raw.prepare("UPDATE quiz_diagnoses SET status='done' WHERE root_topic_id='cnm_p010'").run();
    ins.run(2, 'cnm_p021', 'cnm_p010', '[]', '2026-10-27', 1761500003); // done 后可再建
    const n = raw.prepare("SELECT COUNT(*) n FROM quiz_diagnoses WHERE child_id=2").get().n;
    assert.equal(n, 3);
  });
});

/* 端到端（真实 fetch 驱动）：覆盖 diagRecompute／diagBuildView／apiQuizReview 的真实 SQL，
 * 2026-10-26 曾漏过 INSERT 占位符数不对的 bug——纯函数单测测不到 DB 层，必须有这一层。 */
describe('诊断接口端到端', () => {
  const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const CH1 = '一年级上册 第1单元 生活中的数'; // 在默认进度门（上册第 2 单元）内
  function makeEnv() {
    const raw = new DatabaseSync(':memory:');
    for (const f of [
      '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql',
      '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql',
      '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql',
      '0013_bsn_math_chapters.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql',
      '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql',
    ]) {
      raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
    }
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
  async function call(env, path, { method = 'GET', body, cookie } = {}) {
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
  test('触发→回溯→出题→复习答题（奖励 0、不计 correct_total）', async () => {
    const { env, raw } = makeEnv();
    // 题 id 用自增（0002 已种入谜语题，固定 id 会撞主键）
    const addQ = (topicId) => Number(raw.prepare(
      "INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,chapter,topic_id,active) VALUES('study',1,'数学',?,'[\"A\",\"B\",\"C\",\"D\"]',0,'解析',?, ?,1)",
    ).run(`${topicId} 题`, CH1, topicId).lastInsertRowid);
    const p010ids = [addQ('cnm_p010'), addQ('cnm_p010')];
    const p001ids = [addQ('cnm_p001'), addQ('cnm_p001'), addQ('cnm_p001'), addQ('cnm_p001')];
    // 当日每日问答：题单只有 p010 第一题，且该题今天已答（错）→ dailyDone 为真
    raw.prepare('INSERT INTO quiz_daily(child_id,date_shanghai,question_ids) VALUES(2,?,?)').run(TODAY, JSON.stringify([p010ids[0]]));
    const epoch = Math.floor(Date.now() / 1000);
    for (const qid of p010ids) {
      raw.prepare('INSERT INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch) VALUES(2,?,?,0,0,0,?)').run(qid, TODAY, epoch);
    }
    const login = await call(env, '/api/parent/login', { method: 'POST', body: { pin: '0000' } });
    assert.equal(login.status, 200);
    const pc = login.cookie;

    const d1 = await call(env, '/api/quiz/diagnosis?child_id=2', { cookie: pc });
    assert.equal(d1.status, 200, JSON.stringify(d1.j).slice(0, 200));
    assert.equal(d1.j.ok, true);
    assert.ok(d1.j.weak.some((w) => w.topicId === 'cnm_p010' && w.wrong === 2 && w.total === 2), JSON.stringify(d1.j.weak));
    assert.equal(d1.j.pending.root.topicId, 'cnm_p001');
    assert.deepEqual(d1.j.pending.chain.map((c) => c.topicId), ['cnm_p010', 'cnm_p006', 'cnm_p004', 'cnm_p001']);
    assert.equal(d1.j.dailyDone, true);
    assert.equal(d1.j.pending.reviewQuestions.length, 2);
    assert.deepEqual(d1.j.pending.reviewQuestions.map((q) => q.id), p001ids.slice(0, 2));

    const before = raw.prepare('SELECT quiz_correct_total, total_xp FROM children WHERE id=2').get();
    const r1 = await call(env, '/api/quiz/review', { method: 'POST', body: { child_id: 2, question_id: p001ids[0], answer_idx: 0 }, cookie: pc });
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.correct, true);
    assert.equal(r1.j.xpAwarded, 0);
    assert.equal(r1.j.fragmentsAwarded, 0);
    // 中途（只答 1/2）仍 pending，不置 done
    assert.equal(raw.prepare("SELECT status FROM quiz_diagnoses WHERE child_id=2").get().status, 'pending');
    const r2 = await call(env, '/api/quiz/review', { method: 'POST', body: { child_id: 2, question_id: p001ids[1], answer_idx: 1 }, cookie: pc });
    assert.equal(r2.j.correct, false);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM quiz_diagnoses WHERE child_id=2").get().n, 1, '复习中途行不置 done、不另建行');
    // 2026-11-17：整批答完即置 done（同一根因当天不再建新诊断）；中途（只答 1/2）仍 pending
    assert.equal(raw.prepare("SELECT status FROM quiz_diagnoses WHERE child_id=2").get().status, 'done');
    const atts = raw.prepare(`SELECT question_id, xp_awarded, fragments_awarded FROM quiz_attempts WHERE question_id IN (${p001ids[0]},${p001ids[1]}) ORDER BY question_id`).all();
    assert.deepEqual(atts.map((a) => [a.question_id, a.xp_awarded, a.fragments_awarded]), [[p001ids[0], 0, 0], [p001ids[1], 0, 0]]);
    assert.equal(raw.prepare('SELECT review_correct FROM quiz_diagnoses WHERE child_id=2').get().review_correct, 1);
    const after = raw.prepare('SELECT quiz_correct_total, total_xp FROM children WHERE id=2').get();
    assert.deepEqual(after, before, '复习不计 quiz_correct_total、不加经验');
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM ball_drops WHERE child_id=2").get().n, 0, '不触发掉球');
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM encounters WHERE child_id=2").get().n, 0, '不触发遭遇');
    const d2 = await call(env, '/api/quiz/diagnosis?child_id=2', { cookie: pc });
    // 2026-11-17：整批答完即置 done，同一根因当天不再新建，故 pending 为 null（当日不再出题）
    assert.equal(d2.j.pending, null, '两道复习题答完后当日不再出题');
  });
});
