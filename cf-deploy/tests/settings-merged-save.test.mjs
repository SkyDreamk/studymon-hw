// 运行：node --test tests/settings-merged-save.test.mjs
import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const migrations = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0013_bsn_math_chapters.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql'];

let raw;
let db;
let env;

function wrap(raw) {
  return {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) {
          args = values;
          return this;
        },
        async first() {
          return raw.prepare(sql).get(...args) ?? null;
        },
        async all() {
          return { results: raw.prepare(sql).all(...args) };
        },
        async run() {
          const { changes, lastInsertRowid } = raw.prepare(sql).run(...args);
          return { meta: { changes, last_row_id: Number(lastInsertRowid) } };
        },
      };
    },
    async batch(stmts) {
      const results = [];
      for (const stmt of stmts) results.push(await stmt.run());
      return results;
    },
  };
}

beforeEach(() => {
  raw = new DatabaseSync(':memory:');
  for (const migration of migrations) {
    raw.exec(readFileSync(new URL('../migrations/' + migration, import.meta.url), 'utf8'));
  }
  db = wrap(raw);
  env = { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } };
});

afterEach(() => {
  raw.close();
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
  assert.equal(r.status, 200, '家长登录应成功');
  return r.cookie;
}

const settingsRow = () => Object.fromEntries(raw.prepare(
  "SELECT key,value FROM settings WHERE key IN ('base_xp','subject_xp','quiz_xp','quiz_repeat_days','cutoff_time') OR key LIKE '%_progress_%' ORDER BY key").all().map((r) => [r.key, r.value]));
const FIVE = { baseXp: 100, subjectXp: 100, quizXp: 100, quizRepeatDays: 30, cutoffTime: '21:30' };

describe('2026-11-16 合并保存：用户管理一次提交全部', () => {
  test('有二年级孩子且进度未设置时保存返回 200（空章节不查年级章节表）', async () => {
    raw.prepare("UPDATE children SET grade_label='二年级' WHERE id=2").run();
    const cookie = await parentCookie();
    const r = await call('/api/parent/settings/update', { method: 'POST', cookie, body: {
      children: [{ id: 1, name: '大宝', grade: '三年级' }, { id: 2, name: '小宝', grade: '二年级' }],
      mathProgress: [{ id: 1, chapter: '' }, { id: 2, chapter: '' }],
      chineseProgress: [{ id: 1, chapter: '' }, { id: 2, chapter: '' }],
      englishProgress: [{ id: 1, chapter: '' }, { id: 2, chapter: '' }],
      ...FIVE, subjectXp: 77,
    } });
    assert.equal(r.status, 200);
    assert.equal(settingsRow().subject_xp, '77');
  });

  test('二年级孩子给了真章节才报"暂无列表"，三科同款', async () => {
    raw.prepare("UPDATE children SET grade_label='二年级' WHERE id=2").run();
    const cookie = await parentCookie();
    for (const [f, msg] of [['mathProgress', '该年级暂无数学章节列表'], ['chineseProgress', '该年级暂无语文单元列表'], ['englishProgress', '该年级暂无英语单元列表']]) {
      const r = await call('/api/parent/settings/update', { method: 'POST', cookie, body: { [f]: [{ id: 2, chapter: '二年级上册 第1单元' }] } });
      assert.equal(r.status, 400, f);
      assert.equal(r.j.error, msg, f);
    }
  });

  test('进度非法时整次保存不写入任何东西（五项设置、孩子名字、年级、进度都不变）', async () => {
    const cookie = await parentCookie();
    const before = settingsRow();
    const kids = raw.prepare('SELECT id,name,grade_label FROM children ORDER BY id').all();
    const r = await call('/api/parent/settings/update', { method: 'POST', cookie, body: {
      children: [{ id: 1, name: '改名了', grade: '三年级' }],
      chineseProgress: [{ id: 1, chapter: '三年级上册 第3单元' }],
      mathProgress: [{ id: 1, chapter: '不存在的章节' }],
      baseXp: 50, subjectXp: 50, quizXp: 50, quizRepeatDays: 10, cutoffTime: '20:00',
    } });
    assert.equal(r.status, 400);
    assert.deepEqual(settingsRow(), before);
    assert.deepEqual(raw.prepare('SELECT id,name,grade_label FROM children ORDER BY id').all(), kids);
  });

  test('五项设置范围非法时也不写入（含进度）；范围规则不变', async () => {
    const cookie = await parentCookie();
    const before = settingsRow();
    for (const bad of [{ baseXp: 9 }, { baseXp: 201 }, { subjectXp: 0 }, { subjectXp: 101 }, { quizXp: -1 }, { quizXp: 101 }, { quizRepeatDays: 6 }, { quizRepeatDays: 91 }, { cutoffTime: '25:00' }]) {
      const r = await call('/api/parent/settings/update', { method: 'POST', cookie, body: {
        chineseProgress: [{ id: 1, chapter: '三年级上册 第3单元' }], ...FIVE, ...bad } });
      assert.equal(r.status, 400, JSON.stringify(bad));
      assert.deepEqual(settingsRow(), before, JSON.stringify(bad));
    }
  });

  test('同一次保存里改年级：进度按新年级校验', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/parent/settings/update', { method: 'POST', cookie, body: {
      children: [{ id: 2, name: '小宝', grade: '三年级' }],
      chineseProgress: [{ id: 2, chapter: '三年级上册 第3单元' }],
    } });
    assert.equal(r.status, 200);
    assert.equal(settingsRow()['chinese_progress_2'], '三年级上册 第3单元');
    const r2 = await call('/api/parent/settings/update', { method: 'POST', cookie, body: {
      children: [{ id: 2, name: '小宝', grade: '一年级' }],
      chineseProgress: [{ id: 2, chapter: '三年级上册 第4单元' }],
    } });
    assert.equal(r2.status, 400);
    assert.equal(raw.prepare('SELECT grade_label g FROM children WHERE id=2').get().g, '三年级');
  });
});
