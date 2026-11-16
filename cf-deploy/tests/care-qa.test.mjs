// tests/care-qa.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql',
  '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql',
  '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql',
  '0013_bsn_math_chapters.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql',
  '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql',
  '0021_skill_levels.sql', '0022_warehouse.sql', '0023_care_qa_and_friendship.sql',
];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝', grade_label='三年级' WHERE id=1; UPDATE children SET name='测试小宝', grade_label='一年级' WHERE id=2;");
  raw.exec("INSERT OR REPLACE INTO settings(key, value) VALUES('care_enabled', '1');");
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
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>') } },
    raw,
  };
}

async function rawCall(env, path, { method = 'GET', body = null, cookie = '' } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers['Cookie'] = cookie;
  const req = new Request('http://localhost' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const res = await M.default.fetch(req, env);
  const setCookie = res.headers.get('set-cookie') || '';
  const cookiePair = setCookie ? setCookie.split(';')[0] : '';
  return { status: res.status, json: await res.json(), cookie: cookiePair };
}

async function loginChild(env, childId = 1) {
  const pLogin = await rawCall(env, '/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  const parentCookie = pLogin.cookie;
  await rawCall(env, '/api/parent/settings/update', {
    method: 'POST',
    cookie: parentCookie,
    body: {
      childPasswords: [
        { id: 1, password: '0000' },
        { id: 2, password: '0000' },
      ],
    },
  });
  const pwd = childId === 2 ? '0000' : '0000';
  const cLogin = await rawCall(env, '/api/child/login', {
    method: 'POST',
    body: { childId, password: pwd },
  });
  return cLogin.cookie;
}

describe('伙伴养成问答与友好度 (0023_care_qa_and_friendship)', () => {
  test('1. 出题池过滤与复习优先：三年级只出 grade=3 或 NULL 的 study 题，不出 riddle/custom，优先复习题，下发不含 answer_idx', async () => {
    const { raw, env } = makeEnv();
    const cookie1 = await loginChild(env, 1);

    raw.exec(`
      DELETE FROM quiz_questions;
      INSERT INTO quiz_questions(id, kind, grade, subject, question, options_json, answer_idx, explain, active, is_custom) VALUES
        (9001, 'riddle', 3, NULL, '脑筋急转弯', '["A","B","C","D"]', 0, 'riddle解析', 1, 0),
        (9002, 'study', 1, '数学', '一年级题', '["A","B","C","D"]', 1, '一年级解析', 1, 0),
        (9003, 'study', 3, '数学', '三年级新题', '["10","20","30","40"]', 2, '三年级新题解析', 1, 0),
        (9004, 'study', 3, '语文', '三年级复习题', '["甲","乙","丙","丁"]', 1, '复习题解析', 1, 0),
        (9005, 'study', 3, '英语', '自定义题', '["A","B","C","D"]', 0, '自定义解析', 1, 1);
      INSERT INTO quiz_attempts(child_id, question_id, date_shanghai, correct, xp_awarded, fragments_awarded, created_epoch)
      VALUES (1, 9004, '2026-01-01', 1, 5, 1, 1000);
    `);

    const qRes = await rawCall(env, '/api/care/qa/question?childId=1', { cookie: cookie1 });
    assert.equal(qRes.status, 200);
    assert.equal(qRes.json.ok, true);
    assert.equal(qRes.json.question.id, 9004, '应优先抽中 quiz_attempts 中答过的复习题 9004');
    assert.equal('answer_idx' in qRes.json.question, false, '下发题目绝不能含 answer_idx');
  });

  test('2. 答对奖励与答错解析：答对只 +5 经验、不加友好度（友好度改到照顾系统）；答错不加经验但返回 explain', async () => {
    const { raw, env } = makeEnv();
    const cookie1 = await loginChild(env, 1);

    raw.exec(`
      DELETE FROM quiz_questions;
      INSERT INTO quiz_questions(id, kind, grade, subject, question, options_json, answer_idx, explain, active, is_custom) VALUES
        (9101, 'study', 3, '数学', '3×4=?', '["10","12","14","16"]', 1, '三四十二', 1, 0),
        (9102, 'study', 3, '数学', '5×6=?', '["25","30","35","40"]', 1, '五六三十', 1, 0);
    `);

    const xpBefore = raw.prepare('SELECT total_xp, quiz_fragments FROM children WHERE id=1').get();

    // 第 1 题答对
    const ans1 = await rawCall(env, '/api/care/qa/answer', {
      method: 'POST', cookie: cookie1, body: { childId: 1, questionId: 9101, answerIdx: 1 },
    });
    assert.equal(ans1.status, 200);
    assert.equal(ans1.json.correct, true);
    assert.equal(ans1.json.friendship, 0, '问答答对不再加友好度');
    assert.equal(ans1.json.friendshipAwarded, 0);
    assert.equal(ans1.json.xpAwarded, 5);
    assert.equal(ans1.json.explain, '三四十二');

    const xpMid = raw.prepare('SELECT total_xp, quiz_fragments FROM children WHERE id=1').get();
    assert.equal(xpMid.total_xp, xpBefore.total_xp + 5);
    assert.equal(xpMid.quiz_fragments, xpBefore.quiz_fragments, '不给每日问答碎片');

    // 第 2 题答错
    const ans2 = await rawCall(env, '/api/care/qa/answer', {
      method: 'POST', cookie: cookie1, body: { childId: 1, questionId: 9102, answerIdx: 0 },
    });
    assert.equal(ans2.status, 200);
    assert.equal(ans2.json.correct, false);
    assert.equal(ans2.json.friendship, 0);
    assert.equal(ans2.json.friendshipAwarded, 0);
    assert.equal(ans2.json.xpAwarded, 0);
    assert.equal(ans2.json.explain, '五六三十');
  });

  test('3. 每日上限 3 道与同题不重复：同题重答 400，第 4 道抽题/答题均 400', async () => {
    const { raw, env } = makeEnv();
    const cookie1 = await loginChild(env, 1);

    raw.exec(`
      DELETE FROM quiz_questions;
      INSERT INTO quiz_questions(id, kind, grade, subject, question, options_json, answer_idx, explain, active, is_custom) VALUES
        (9201, 'study', 3, '数学', 'Q1', '["A","B","C","D"]', 0, 'E1', 1, 0),
        (9202, 'study', 3, '数学', 'Q2', '["A","B","C","D"]', 0, 'E2', 1, 0),
        (9203, 'study', 3, '数学', 'Q3', '["A","B","C","D"]', 0, 'E3', 1, 0),
        (9204, 'study', 3, '数学', 'Q4', '["A","B","C","D"]', 0, 'E4', 1, 0);
    `);

    const a1 = await rawCall(env, '/api/care/qa/answer', {
      method: 'POST', cookie: cookie1, body: { childId: 1, questionId: 9201, answerIdx: 0 },
    });
    assert.equal(a1.status, 200);

    // 同题当天重答 -> 400
    const a1Dup = await rawCall(env, '/api/care/qa/answer', {
      method: 'POST', cookie: cookie1, body: { childId: 1, questionId: 9201, answerIdx: 0 },
    });
    assert.equal(a1Dup.status, 400);

    await rawCall(env, '/api/care/qa/answer', {
      method: 'POST', cookie: cookie1, body: { childId: 1, questionId: 9202, answerIdx: 0 },
    });
    await rawCall(env, '/api/care/qa/answer', {
      method: 'POST', cookie: cookie1, body: { childId: 1, questionId: 9203, answerIdx: 0 },
    });

    // 第 4 道抽题与答题均 400
    const q4 = await rawCall(env, '/api/care/qa/question?childId=1', { cookie: cookie1 });
    assert.equal(q4.status, 400);

    const a4 = await rawCall(env, '/api/care/qa/answer', {
      method: 'POST', cookie: cookie1, body: { childId: 1, questionId: 9204, answerIdx: 0 },
    });
    assert.equal(a4.status, 400);
  });

  test('4. 问答答对不再加友好度（250 保持不变）；51 分一颗心换算（0–5 心）', async () => {
    const { raw, env } = makeEnv();
    const cookie1 = await loginChild(env, 1);

    raw.exec(`
      INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, friendship, created_epoch, updated_epoch)
      VALUES (1, 'pikachu', 172, 0, 'main', 250, 1000, 1000);
      DELETE FROM quiz_questions;
      INSERT INTO quiz_questions(id, kind, grade, subject, question, options_json, answer_idx, explain, active, is_custom)
      VALUES (9301, 'study', 3, '数学', 'Q', '["A","B","C","D"]', 0, 'E', 1, 0);
    `);

    const ans = await rawCall(env, '/api/care/qa/answer', {
      method: 'POST', cookie: cookie1, body: { childId: 1, questionId: 9301, answerIdx: 0 },
    });
    assert.equal(ans.status, 200);
    assert.equal(ans.json.friendship, 250, '问答答对不再加友好度，250 保持不变');
    assert.equal(ans.json.friendshipAwarded, 0);
    assert.equal(ans.json.hearts, 4, '250 对应 4 颗心');
    assert.equal(M.friendshipHeartsOf(153), 3);
    assert.equal(M.friendshipHeartsOf(204), 4);
    assert.equal(M.friendshipHeartsOf(50), 0);
  });

  test('5. 换主宠线后各线友好度独立存储（按 child_id + line_key 隔离）', async () => {
    const { raw, env } = makeEnv();
    const cookie1 = await loginChild(env, 1);

    raw.exec(`
      INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, friendship, created_epoch, updated_epoch) VALUES
        (1, 'pikachu', 172, 0, 'main', 120, 1000, 1000),
        (1, 'charmander', 4, 0, 'main', 30, 1000, 1000);
    `);

    const stPikachu = await rawCall(env, '/api/care/qa/status?childId=1', { cookie: cookie1 });
    assert.equal(stPikachu.json.friendship, 120);

    raw.exec(`UPDATE children SET line='charmander' WHERE id=1;`);
    const stCharmander = await rawCall(env, '/api/care/qa/status?childId=1', { cookie: cookie1 });
    assert.equal(stCharmander.json.friendship, 30);
  });

  test('6. 与每日问答完全独立：答题不写 quiz_attempts 表', async () => {
    const { raw, env } = makeEnv();
    const cookie1 = await loginChild(env, 1);

    raw.exec(`
      DELETE FROM quiz_questions;
      DELETE FROM quiz_attempts;
      INSERT INTO quiz_questions(id, kind, grade, subject, question, options_json, answer_idx, explain, active, is_custom)
      VALUES (9401, 'study', 3, '数学', 'Q', '["A","B","C","D"]', 0, 'E', 1, 0);
    `);

    const ans = await rawCall(env, '/api/care/qa/answer', {
      method: 'POST', cookie: cookie1, body: { childId: 1, questionId: 9401, answerIdx: 0 },
    });
    assert.equal(ans.status, 200);

    const qaCnt = raw.prepare('SELECT COUNT(*) AS cnt FROM quiz_attempts WHERE child_id=1').get();
    assert.equal(qaCnt.cnt, 0, '绝不写入 quiz_attempts');
  });

  test('7. 门控与权限：care_enabled=0 时返回 403 CARE_DISABLED；孩子 2 的会话查孩子 1 返回 403 FORBIDDEN', async () => {
    const { raw, env } = makeEnv();
    const cookie2 = await loginChild(env, 2);

    // 孩子 2 查孩子 1 -> 403 FORBIDDEN
    const crossRes = await rawCall(env, '/api/care/qa/status?childId=1', { cookie: cookie2 });
    assert.equal(crossRes.status, 403);
    assert.equal(crossRes.json.error, 'FORBIDDEN');

    // care_enabled=0 -> 403 CARE_DISABLED
    raw.exec("UPDATE settings SET value='0' WHERE key='care_enabled';");
    const disabledRes = await rawCall(env, '/api/care/qa/status?childId=2', { cookie: cookie2 });
    assert.equal(disabledRes.status, 403);
    assert.equal(disabledRes.json.error, 'CARE_DISABLED');
  });
});
