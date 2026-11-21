/* Oak 查询收窄（Fable 优化 #1）：node --test tests/oak-query-narrow.test.mjs
 * 口径：种子探针为 LIMIT 1（不再 COUNT 全表）；集内查询只取 6 列（id/question/explain/
 * oak_episode/oak_topic/oak_audio）；当日尝试只取 2 列（question_id/xp_awarded）；
 * 同孩同日句子恒定（含 5 句集的补句）。断言以 X-D1-Queries 为准（TEST_MODE 才出；
 * SQL 截 70 字，集内查询以前缀辨认；quizPoolForChild 的同形 SELECT * 不在 oak-today
 * 路径上，故当日尝试的 SELECT * 应彻底消失）。
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0014_oak.sql', '0016_oak_audio_fix.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0032_oak_dialogue.sql', '0043_pet_instances_ability.sql'];

function makeEnv(migrations = MIGRATIONS) {
  const raw = new DatabaseSync(':memory:');
  for (const f of migrations) {
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
beforeEach(() => { M.resetEvoTableCache(); ({ env, raw } = makeEnv()); });

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

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

const SEED_COUNT = "SELECT COUNT(*) n FROM quiz_questions WHERE kind='oak'";
const SEED_PROBE = "SELECT 1 FROM quiz_questions WHERE kind='oak' LIMIT 1";
const EPISODE_PREFIX = 'SELECT id, question, explain, oak_episode, oak_topic, oak_audio FROM ';
const EPISODE_STAR_PREFIX = "SELECT * FROM quiz_questions WHERE kind='oak' AND grade=";
const ATTEMPTS_PREFIX = 'SELECT question_id, xp_awarded FROM quiz_attempts';
const ATTEMPTS_STAR = 'SELECT * FROM quiz_attempts WHERE child_id=? AND date_shanghai=?';

describe('Oak 查询收窄（Fable #1）', () => {
  test('种子探针是 LIMIT 1，不再 COUNT 全表', async () => {
    const pc = await parentCookie();
    const r = await call('/api/oak/today?child_id=1', { cookie: pc });
    assert.equal(r.status, 200);
    const qs = d1queries(r.res).map((q) => q.sql);
    assert.ok(qs.includes(SEED_PROBE), `应有 LIMIT 1 种子探针，实为 ${JSON.stringify(qs)}`);
    assert.ok(!qs.includes(SEED_COUNT), '不应再有裸 COUNT(*) 种子查询（补句窗口的 COUNT 带 grade/集过滤，不等于此串）');
  });

  test('集内查询只取 6 列，不再 SELECT *', async () => {
    const pc = await parentCookie();
    const r = await call('/api/oak/today?child_id=1', { cookie: pc });
    assert.equal(r.status, 200);
    const qs = d1queries(r.res).map((q) => q.sql);
    assert.ok(qs.some((s) => s.startsWith(EPISODE_PREFIX)), `应有 6 列集内查询，实为 ${JSON.stringify(qs)}`);
    assert.ok(!qs.some((s) => s.startsWith(EPISODE_STAR_PREFIX)), '集内查询不应再 SELECT *');
  });

  test('当日尝试只取 question_id, xp_awarded', async () => {
    const pc = await parentCookie();
    const r = await call('/api/oak/today?child_id=1', { cookie: pc });
    assert.equal(r.status, 200);
    const qs = d1queries(r.res).map((q) => q.sql);
    assert.ok(qs.some((s) => s.startsWith(ATTEMPTS_PREFIX)), `应有 2 列尝试查询，实为 ${JSON.stringify(qs)}`);
    assert.ok(!qs.includes(ATTEMPTS_STAR), 'oak-today 路径上不应再有 SELECT * 尝试查询（quizPoolForChild 的同形查询不在此路径）');
  });

  test('同孩同日两次 GET today 句子恒定', async () => {
    const pc = await parentCookie();
    for (const cid of [1, 2]) {
      const a = await call(`/api/oak/today?child_id=${cid}`, { cookie: pc });
      const b = await call(`/api/oak/today?child_id=${cid}`, { cookie: pc });
      assert.equal(a.status, 200);
      assert.equal(b.status, 200);
      assert.equal(a.j.episodeId, b.j.episodeId);
      assert.deepEqual(a.j.sentences.map((s) => s.id), b.j.sentences.map((s) => s.id));
      assert.equal(a.j.sentences.length, 6);
    }
  });

  test('补句集同日恒定：5 句集的第 6 句两次一致', async () => {
    // 在未来 30 天里找一个孩子 2 落在 5 句卡集的日子（补句窗口必跑），两次取组应逐句相同。
    const pool = [...new Set(raw.prepare("SELECT oak_episode FROM quiz_questions WHERE kind='oak' AND grade=1 ORDER BY oak_episode").all().map((r) => r.oak_episode))]
      .filter((ep) => { const k = (M.DAILY_ENGLISH_EPISODES[ep] || {}).k; return k === undefined || k === 'card' || k === 'video'; });
    const five = new Set(raw.prepare("SELECT oak_episode FROM quiz_questions WHERE kind='oak' AND grade=1 GROUP BY oak_episode HAVING COUNT(*) < 6").all().map((r) => r.oak_episode));
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const base = new Date(today + 'T00:00:00+08:00');
    let hit = null;
    for (let d = 0; d < 30; d++) {
      const ds = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(base.getTime() + d * 86400000));
      if (five.has(M.pickOakEpisode(pool, 2, ds))) { hit = ds; break; }
    }
    assert.ok(hit, '30 天内应有孩子 2 落在 5 句集的日子');
    const c2 = raw.prepare('SELECT * FROM children WHERE id=2').get();
    const g1 = await M.oakGroupForChild(env.DB, c2, hit, null);
    const g2 = await M.oakGroupForChild(env.DB, c2, hit, null);
    assert.equal(g1.sentences.length, 6);
    assert.deepEqual(g1.sentences.map((s) => s.id), g2.sentences.map((s) => s.id));
    assert.equal(g1.episodeId, g2.episodeId);
  });
});
