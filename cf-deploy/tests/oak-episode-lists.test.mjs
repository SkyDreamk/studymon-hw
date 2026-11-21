/* Oak 集清单静态化（Fable 优化 #15）：node --test tests/oak-episode-lists.test.mjs
 * 口径：静态模块 src/data/oak-episode-lists.js 必须与夹具库的 DISTINCT + 每集行数逐项一致
 * （漂移守卫——内容变了不重跑生成器就失败）；静态求和的候选总行数必须等于库里 COUNT(*)；
 * 同孩同日句子恒定（含 5 句集的补句）；二年级孩子落到一年级清单（child 14 情形）。
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));
const { OAK_EPISODE_ROWS } = await import(new URL('../src/data/oak-episode-lists.js', import.meta.url));
const { DAILY_ENGLISH_EPISODES } = await import(new URL('../src/data/daily-english.js', import.meta.url));

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
    raw, db,
  };
}

// 与 oakGroupForChild 内的 kind 过滤同一口径：card/video/未知放行，课本集过滤掉。
function kindPasses(ep) {
  const k = (DAILY_ENGLISH_EPISODES[ep] || {}).k;
  return k === undefined || k === 'card' || k === 'video';
}

function shanghaiDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

let env, raw, db;
beforeEach(() => { M.resetEvoTableCache(); ({ env, raw, db } = makeEnv()); });

describe('Oak 集清单静态化（Fable #15）', () => {
  test('漂移守卫：静态清单 == 库里 DISTINCT + 每集行数', () => {
    for (const g of [1, 3]) {
      // node:sqlite 行是 null-prototype 对象，先展成普通对象再比（deepStrictEqual 认原型）。
      const dbRows = raw.prepare(
        "SELECT oak_episode AS ep, COUNT(*) AS n FROM quiz_questions WHERE kind='oak' AND grade=? GROUP BY oak_episode ORDER BY oak_episode"
      ).all(g).map((r) => ({ ep: r.ep, n: r.n }));
      assert.deepEqual(OAK_EPISODE_ROWS[g], dbRows);
    }
    // 二年级库里没有 Oak 行，静态模块也只有 1/3 两档
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM quiz_questions WHERE kind='oak' AND grade=2").get().n, 0);
    assert.equal(OAK_EPISODE_ROWS[2], undefined);
  });

  test('静态求和的候选总行数 == 库里 COUNT(*)（全部集逐个核对）', () => {
    for (const g of [1, 3]) {
      const dbPool = raw.prepare(
        "SELECT DISTINCT oak_episode FROM quiz_questions WHERE kind='oak' AND grade=? ORDER BY oak_episode"
      ).all(g).map((r) => r.oak_episode).filter(kindPasses);
      const staticPool = OAK_EPISODE_ROWS[g].map((r) => r.ep).filter(kindPasses);
      assert.deepEqual(staticPool, dbPool);
      const nByEp = new Map(OAK_EPISODE_ROWS[g].map((r) => [r.ep, r.n]));
      for (const ep of dbPool) {
        const otherEps = dbPool.filter((e) => e !== ep);
        const placeholders = otherEps.map(() => '?').join(',');
        const live = raw.prepare(
          `SELECT COUNT(*) n FROM quiz_questions WHERE kind='oak' AND grade=? AND oak_episode IN (${placeholders})`
        ).get(g, ...otherEps).n;
        const fromStatic = otherEps.reduce((s, e) => s + (nByEp.get(e) || 0), 0);
        assert.equal(fromStatic, live, `grade ${g} episode ${ep}: static sum ${fromStatic} != live COUNT ${live}`);
      }
    }
  });

  test('同孩同日两次调用句子恒定；14 天扫集每孩每天 6 句', async () => {
    const c1 = raw.prepare('SELECT * FROM children WHERE id=1').get();
    const c2 = raw.prepare('SELECT * FROM children WHERE id=2').get();
    const nByEp1 = new Map(OAK_EPISODE_ROWS[1].map((r) => [r.ep, r.n]));
    const nByEp3 = new Map(OAK_EPISODE_ROWS[3].map((r) => [r.ep, r.n]));
    let child2ExtraDays = 0;
    let child1ExtraDays = 0;
    for (let d = 0; d < 14; d++) {
      const ds = shanghaiDate(d);
      for (const child of [c1, c2]) {
        const a = await M.oakGroupForChild(db, child, ds, null);
        const b = await M.oakGroupForChild(db, child, ds, null);
        assert.equal(a.episodeId, b.episodeId);
        assert.deepEqual(a.sentences.map((s) => s.id), b.sentences.map((s) => s.id));
        assert.equal(a.sentences.length, 6, `child ${child.id} ${ds}: expected 6 sentences, got ${a.sentences.length} (episode ${a.episodeId})`);
        // 5 句集才会走补句：g1 有 15 个 5 句集，g3 全是 6 句集
        if (child.id === 2 && nByEp1.get(a.episodeId) === 5) child2ExtraDays++;
        if (child.id === 1 && nByEp3.get(a.episodeId) === 5) child1ExtraDays++;
      }
    }
    assert.ok(child2ExtraDays >= 1, `expected >=1 extra-sentence day for child 2 in 14 days, got ${child2ExtraDays}`);
    assert.equal(child1ExtraDays, 0, 'grade-3 episodes are all 6 rows, extra path must never run');
  });

  test('二年级孩子落到一年级清单（child 14 情形）', async () => {
    const today = shanghaiDate(0);
    const c2g1 = raw.prepare('SELECT * FROM children WHERE id=2').get();
    const g1 = await M.oakGroupForChild(db, c2g1, today, null);
    const g1Pool = OAK_EPISODE_ROWS[1].map((r) => r.ep).filter(kindPasses);
    assert.ok(g1Pool.includes(g1.episodeId));
    // 同一孩子改成二年级：同一天必须拿到同一集、同一 6 句
    raw.prepare("UPDATE children SET grade_label='二年级' WHERE id=2").run();
    const c2g2 = raw.prepare('SELECT * FROM children WHERE id=2').get();
    assert.equal(c2g2.grade_label, '二年级');
    const g2 = await M.oakGroupForChild(db, c2g2, today, null);
    assert.equal(g2.episodeId, g1.episodeId);
    assert.deepEqual(g2.sentences.map((s) => s.id), g1.sentences.map((s) => s.id));
    assert.equal(g2.sentences.length, 6);
  });

  // 回退：库里只有自插合成集（无种子 Oak 行）时，静态清单在库里一行都没有，
  // 必须回退到库里 DISTINCT（与 #15 前同一口径），组为该合成集。iflytek/azure
  // 的 ep-test 夹具就靠这条回退（它们故意不引 0014 的 174 行真实题库）。
  test('回退：无种子 Oak 行、只有自插 ep-test 集时组为 ep-test', async () => {
    const noSeed = MIGRATIONS.filter((f) => !['0014_oak.sql', '0032_oak_dialogue.sql', '0016_oak_audio_fix.sql'].includes(f));
    const e2 = makeEnv(noSeed);
    // 0014 把三列 ALTER 与 174 行种子绑在一起；无种子夹具需手动补三列（不补行）。
    e2.raw.exec('ALTER TABLE quiz_questions ADD COLUMN oak_episode TEXT; ALTER TABLE quiz_questions ADD COLUMN oak_topic TEXT; ALTER TABLE quiz_questions ADD COLUMN oak_audio TEXT;');
    const texts = ['Hello world', 'Good morning', 'Thank you', 'How are you', 'Nice to meet you', 'See you later'];
    for (let i = 0; i < texts.length; i++) {
      e2.raw.prepare(`INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,oak_episode,oak_topic,oak_audio)
        VALUES('oak',1,'英语',?,'["x"]',0,?,1,0,1,'ep-test','test',?)`).run(texts[i], texts[i], `s00${i}.mp3`);
    }
    const c2 = e2.raw.prepare('SELECT * FROM children WHERE id=2').get();
    const g = await M.oakGroupForChild(e2.db, c2, shanghaiDate(0), null);
    assert.equal(g.episodeId, 'ep-test');
    assert.deepEqual(g.sentences.map((s) => s.en), texts);
  });

  // 回退路径的补句 total 走库里 COUNT：两集各 5 句时，无论哈希选中哪集，
  // 都必须从另一集补 1 句到 6 句（补句来自另一集，total=5 来自库里 COUNT）。
  test('回退：两集各 5 句时补句走库里 COUNT，6 句横跨两集', async () => {
    const noSeed = MIGRATIONS.filter((f) => !['0014_oak.sql', '0032_oak_dialogue.sql', '0016_oak_audio_fix.sql'].includes(f));
    const e2 = makeEnv(noSeed);
    e2.raw.exec('ALTER TABLE quiz_questions ADD COLUMN oak_episode TEXT; ALTER TABLE quiz_questions ADD COLUMN oak_topic TEXT; ALTER TABLE quiz_questions ADD COLUMN oak_audio TEXT;');
    const eps = { 'ep-test': ['Alpha one', 'Alpha two', 'Alpha three', 'Alpha four', 'Alpha five'],
      'ep-test2': ['Beta one', 'Beta two', 'Beta three', 'Beta four', 'Beta five'] };
    for (const [ep, texts] of Object.entries(eps)) {
      for (let i = 0; i < texts.length; i++) {
        e2.raw.prepare(`INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,oak_episode,oak_topic,oak_audio)
          VALUES('oak',1,'英语',?,'["x"]',0,?,1,0,1,?,'test',?)`).run(texts[i], texts[i], ep, `s00${i}.mp3`);
      }
    }
    const c2 = e2.raw.prepare('SELECT * FROM children WHERE id=2').get();
    const g = await M.oakGroupForChild(e2.db, c2, shanghaiDate(0), null);
    assert.equal(g.sentences.length, 6);
    const fromEps = new Set(e2.raw.prepare(
      `SELECT oak_episode FROM quiz_questions WHERE id IN (${g.sentences.map(() => '?').join(',')})`
    ).all(...g.sentences.map((s) => s.id)).map((r) => r.oak_episode));
    assert.equal(fromEps.size, 2, 'extra sentence must come from the other episode');
  });

  // 漂移：种子内容 + 额外自插集时静态清单优先——合成集永不入选（回退只在静态集
  // 在库里一行都没有时触发；静态集有行时不回退、不看库里多出来的集）。
  test('漂移：种子内容 + 额外自插集时合成集永不入选', async () => {
    const texts = ['Hello world', 'Good morning', 'Thank you', 'How are you', 'Nice to meet you', 'See you later'];
    for (let i = 0; i < texts.length; i++) {
      raw.prepare(`INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,oak_episode,oak_topic,oak_audio)
        VALUES('oak',1,'英语',?,'["x"]',0,?,1,0,1,'ep-test','test',?)`).run(texts[i], texts[i], `s00${i}.mp3`);
    }
    const c2 = raw.prepare('SELECT * FROM children WHERE id=2').get();
    const g1Pool = OAK_EPISODE_ROWS[1].map((r) => r.ep).filter(kindPasses);
    for (let d = 0; d < 14; d++) {
      const g = await M.oakGroupForChild(db, c2, shanghaiDate(d), null);
      assert.notEqual(g.episodeId, 'ep-test');
      assert.ok(g1Pool.includes(g.episodeId));
      assert.equal(g.sentences.length, 6);
    }
  });
});
