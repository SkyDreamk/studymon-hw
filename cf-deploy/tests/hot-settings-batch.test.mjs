/* 热路径设置批量取（Fable 优化 #3）：node --test tests/hot-settings-batch.test.mjs
 * 口径：每热路径入口只发 1 次 settings 批量查询（+ 需要家庭覆盖键时 1 次 families 查询），
 * 其余 settings 相关查询只剩测试模式的 4 次调试 preamble（applyDebugTime，生产为 0 次）。
 * 计数以 X-D1-Queries 为准（TEST_MODE 才出），含 settings 表与 families.settings_json 两类。
 * 家庭覆盖语义与 getEffSetting 同款（非空才赢）；缺失键为 null，走各处原默认值。
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0021_skill_levels.sql', '0024_evo_reward.sql', '0043_pet_instances_ability.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  // 线上忠实夹具：v2 用户系统有 families 表 + children.family_id（本链 0001–0024 没有，在此补建）
  raw.exec(`ALTER TABLE children ADD COLUMN family_id INTEGER;
    CREATE TABLE IF NOT EXISTS families(id INTEGER PRIMARY KEY, settings_json TEXT);
    INSERT OR REPLACE INTO families(id, settings_json) VALUES(1, '{}');
    UPDATE children SET family_id=1;`);
  try { raw.exec("ALTER TABLE quiz_questions ADD COLUMN oak_episode TEXT; ALTER TABLE quiz_questions ADD COLUMN oak_audio TEXT;"); } catch { /* 列已存在（0014 已加） */ }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const yday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() - 86400000));
  for (const [k, v] of [
    ['english_mode', '1'], ['care_enabled', '1'], ['subject_xp', '15'], ['base_xp', '15'],
    ['cutoff_time', '21:30'], ['quiz_xp', '10'], ['quiz_repeat_days', '7'],
    ['grade_year_1', '2026'], ['grade_year_2', '2026'],
    ['math_progress_1', '{"chapter":2}'], ['chinese_progress_1', '{"unit":2}'], ['english_progress_1', '{"unit":2}'],
    ['math_progress_2', '{"chapter":2}'], ['chinese_progress_2', '{"unit":2}'], ['english_progress_2', '{"unit":2}'],
  ]) raw.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').run(k, v);
  for (const [cid, date, subject, status] of [[1, yday, '语文', 'approved'], [1, today, '语文', 'approved'], [1, today, '数学', 'pending'], [2, yday, '语文', 'approved'], [2, today, '语文', 'approved']]) {
    raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
      VALUES(?,?,?,?,'10:00',1,0,?,15,'10:05')`).run(cid, date, JSON.stringify([subject]), subject, status);
  }
  // 一道三年级语文 study 题（chapter 通用复习 → 过语文进度门）
  raw.prepare(`INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,chapter)
    VALUES('study',3,'语文','1+1=?','["1","2","3","4"]',1,'','通用复习')`).run();
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

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await M.default.fetch(new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  }), env);
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, res, cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

function d1queries(res) {
  const h = res.headers.get('x-d1-queries') || '';
  if (!h) return [];
  return h.split(';').map((part) => {
    const mm = part.trim().match(/^(\d+):([\d.]+):(.*)$/);
    return mm ? { i: Number(mm[1]), wall: Number(mm[2]), sql: mm[3].trim() } : null;
  }).filter(Boolean);
}

// settings 相关查询：settings 表单查/批量 + families.settings_json（家庭覆盖）
function settingsQueries(res) {
  return d1queries(res).filter((e) => e.sql.includes('settings'));
}

function batchEntry(res) {
  return settingsQueries(res).find((e) => e.sql.includes('SELECT key, value FROM settings WHERE key IN'));
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

describe('热路径设置批量取（Fable 优化 #3）', () => {
  beforeEach(() => { ({ env, raw } = makeEnv()); });

  test('overview：settings 相关查询恰 6 次（4 preamble + 1 次 10 键批量 + 1 次 families），响应值不变', async () => {
    const pc = await parentCookie();
    const r = await call('/api/overview', { cookie: pc });
    assert.equal(r.status, 200);
    const sq = settingsQueries(r.res);
    assert.equal(sq.length, 6, `overview settings 相关查询应为 6，实得 ${sq.length}：${sq.map((e) => e.sql).join(' | ')}`);
    const b = batchEntry(r.res);
    assert.ok(b, '应有一次 settings 批量查询');
    assert.equal((b.sql.match(/\?/g) || []).length, 10, `批量应一次取 10 个键，实得 ${b.sql}`);
    assert.equal(sq.filter((e) => e.sql.includes('FROM families')).length, 1, '应恰查 1 次 families 覆盖行');
    assert.equal(r.j.englishMode, true);
    assert.equal(r.j.children.length, 2);
    assert.equal(r.j.children[0].quizToday.quota, 1);
    assert.ok(r.j.children[0].oakToday, 'oak 摘要应有');
  });

  test('child：settings 相关查询恰 6 次，care 与 quiz/oak 摘要都在', async () => {
    const pc = await parentCookie();
    const r = await call('/api/child?id=1', { cookie: pc });
    assert.equal(r.status, 200);
    const sq = settingsQueries(r.res);
    assert.equal(sq.length, 6, `child settings 相关查询应为 6，实得 ${sq.length}`);
    const b = batchEntry(r.res);
    assert.ok(b, '应有一次 settings 批量查询');
    assert.equal((b.sql.match(/\?/g) || []).length, 6, `批量应一次取 6 个键，实得 ${b.sql}`);
    assert.ok(r.j.child.care, 'care_enabled=1 时 care 应有值');
    assert.equal(r.j.child.quizToday.quota, 1);
    assert.ok(r.j.child.oakToday, 'oak 摘要应有');
  });

  test('quiz-today：settings 相关查询恰 6 次，quizXp 取自设置', async () => {
    const pc = await parentCookie();
    const r = await call('/api/quiz/today?child_id=1', { cookie: pc });
    assert.equal(r.status, 200);
    const sq = settingsQueries(r.res);
    assert.equal(sq.length, 6, `quiz-today settings 相关查询应为 6，实得 ${sq.length}`);
    assert.equal((batchEntry(r.res).sql.match(/\?/g) || []).length, 5, '批量应一次取 5 个键');
    assert.equal(r.j.quizXp, 10);
    assert.equal(r.j.questions.length, 1, '应选中夹具里的语文题');
  });

  test('家庭覆盖：quiz_xp 覆盖 25 生效；空字符串覆盖不生效（与 getEffSetting 同款）', async () => {
    const pc = await parentCookie();
    raw.exec(`UPDATE families SET settings_json='{"quiz_xp": 25}' WHERE id=1`);
    let r = await call('/api/quiz/today?child_id=1', { cookie: pc });
    assert.equal(r.j.quizXp, 25, '家庭覆盖 25 应赢过全局 10');
    raw.exec(`UPDATE families SET settings_json='{"quiz_xp": ""}' WHERE id=1`);
    r = await call('/api/quiz/today?child_id=1', { cookie: pc });
    assert.equal(r.j.quizXp, 10, '空字符串覆盖应被忽略、回落全局 10');
  });

  test('缺失键：删 english_mode/quiz_repeat_days/quiz_xp 后仍 200，走原默认值', async () => {
    raw.exec(`DELETE FROM settings WHERE key IN ('english_mode','quiz_repeat_days','quiz_xp')`);
    const pc = await parentCookie();
    const o = await call('/api/overview', { cookie: pc });
    assert.equal(o.status, 200);
    assert.equal(o.j.englishMode, false);
    const q = await call('/api/quiz/today?child_id=1', { cookie: pc });
    assert.equal(q.status, 200);
    assert.equal(q.j.quizXp, 10, 'quiz_xp 缺失应默认 10');
    assert.equal(q.j.questions.length, 1, '进度键还在，题单应正常');
  });

  test('oak-today：settings 相关查询恰 6 次，assessEnabled 与句子都在', async () => {
    const pc = await parentCookie();
    const r = await call('/api/oak/today?child_id=1', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(settingsQueries(r.res).length, 6, 'oak-today settings 相关查询应为 6');
    assert.equal((batchEntry(r.res).sql.match(/\?/g) || []).length, 4, '批量应一次取 4 个键');
    assert.equal(r.j.assessEnabled, true, 'oak_assess 未设应默认开');
    assert.equal(r.j.sentences.length, 6, '当日 Oak 集应为 6 句');
  });

  test('oak-listen：settings 相关查询恰 6 次，听第一句 200', async () => {
    const pc = await parentCookie();
    const t = await call('/api/oak/today?child_id=1', { cookie: pc });
    const qid = t.j.sentences[0].id;
    const r = await call('/api/oak/listen', { method: 'POST', cookie: pc, body: { child_id: 1, question_id: qid } });
    assert.equal(r.status, 200);
    assert.equal(r.j.listened, true);
    assert.equal(settingsQueries(r.res).length, 6, 'oak-listen settings 相关查询应为 6');
    assert.equal((batchEntry(r.res).sql.match(/\?/g) || []).length, 3, '批量应一次取 3 个键');
  });

  test('quiz-answer：settings 相关查询恰 6 次，答对得 10 XP（掉落随机，不 assert）', async () => {
    const pc = await parentCookie();
    const t = await call('/api/quiz/today?child_id=1', { cookie: pc });
    const q = t.j.questions[0];
    const r = await call('/api/quiz/answer', { method: 'POST', cookie: pc, body: { child_id: 1, question_id: q.id, answer_idx: 1 } });
    assert.equal(r.status, 200);
    assert.equal(r.j.correct, true);
    assert.equal(r.j.xpAwarded, 10);
    assert.equal(settingsQueries(r.res).length, 6, 'quiz-answer settings 相关查询应为 6');
    assert.equal((batchEntry(r.res).sql.match(/\?/g) || []).length, 7, '批量应一次取 7 个键');
  });

  test('diagnosis：本夹具无当日诊断行，math 门分支不走，settings 相关查询只剩 4 次 preamble', async () => {
    const pc = await parentCookie();
    const r = await call('/api/quiz/diagnosis?child_id=1', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(settingsQueries(r.res).length, 4, 'diagnosis 本夹具应只剩 4 次 preamble');
  });

  test('daily-english：本身不读设置，settings 相关查询只剩 4 次 preamble', async () => {
    const pc = await parentCookie();
    const r = await call('/api/daily-english?child_id=1', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(settingsQueries(r.res).length, 4, 'daily-english 应只剩 4 次 preamble');
  });
});
