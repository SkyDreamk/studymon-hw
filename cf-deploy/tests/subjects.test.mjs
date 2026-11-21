/* 打卡改版（按科）＋拍照上传＋问答去重升级 集成测试：node --test tests/subjects.test.mjs
 * harness 同 access.test（node:sqlite 内存库＋迁移 0001–0004），另加内存版假 R2（env.PHOTOS）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql']) {
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
  const store = new Map(); // 假 R2：key -> {bytes, contentType}
  const PHOTOS = {
    async put(key, bytes, opts) { store.set(key, { bytes: new Uint8Array(bytes), contentType: opts?.httpMetadata?.contentType }); },
    async get(key) { const o = store.get(key); return o ? { body: o.bytes } : null; },
    async delete(key) { store.delete(key); },
  };
  return {
    env: { DB: db, TEST_MODE: '1', PHOTOS, ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw, store,
  };
}

let env, raw, store;
beforeEach(() => { ({ env, raw, store } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const text = await res.text();
  let j = {};
  try { j = JSON.parse(text); } catch { /* 照片等非 JSON 响应 */ }
  return { status: res.status, j, text, headers: res.headers, cookie: sc ? sc.split(';')[0] : cookie };
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
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '1111'), c2: await childCookie(2, '2222') };
}
function setHour(h) {
  raw.exec(`INSERT OR REPLACE INTO settings(key, value) VALUES('debug_hour', '${h}')`);
}
async function submit(cookie, subject, extra = {}) {
  return call('/api/checkin', { method: 'POST', cookie, body: { subject, ...extra } });
}
async function review(pc, checkinId, decision, extra = {}) {
  return call('/api/parent/review', { method: 'POST', cookie: pc, body: { checkinId, decision, ...extra } });
}
const TINY_JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]).toString('base64');

describe('按科提交与审核', () => {
  test('两科独立提交 → 队列 2 条（带科目/备注）→ 逐条通过各得经验', async () => {
    const { pc, c1 } = await setup();
    setHour('22'); // 非快手时段：每科 15
    const a = await submit(c1, '语文', { note: '课文读了两遍' });
    assert.equal(a.j.ok, true);
    const b = await submit(c1, '数学');
    assert.equal(b.j.ok, true);
    assert.notEqual(a.j.checkinId, b.j.checkinId);
    // 同科重复提交被拒
    const dup = await submit(c1, '语文');
    assert.equal(dup.status, 400);

    const q = await call('/api/parent/pending', { cookie: pc });
    assert.equal(q.j.reviews.length, 2);
    const yw = q.j.reviews.find((r) => r.subject === '语文');
    assert.equal(yw.note, '课文读了两遍');
    assert.equal(yw.childName, '测试大宝');

    const r1 = await review(pc, a.j.checkinId, 'approve');
    assert.equal(r1.j.xpAwarded, 15);
    assert.equal(r1.j.subject, '语文');
    const r2 = await review(pc, b.j.checkinId, 'approve');
    assert.equal(r2.j.xpAwarded, 15);
    // 连击按天：两科同日通过，连击只 +1
    assert.equal(r1.j.streak, 1);
    assert.equal(r2.j.streak, 1);
    assert.equal(r2.j.isFirstOfDay, false);
    const ov = await call('/api/overview', { cookie: pc });
    assert.equal(ov.j.children[0].totalXp, 30);
  });

  test('快手按每科自己的提交时间判定：早交的科 ×1.2、晚交的科不加成', async () => {
    const { pc, c1 } = await setup();
    setHour('10'); // 21:30 前 → 快手
    const a = await submit(c1, '语文');
    setHour('22'); // 截止后
    const b = await submit(c1, '数学');
    const r1 = await review(pc, a.j.checkinId, 'approve');
    assert.equal(r1.j.isEarly, true);
    assert.equal(r1.j.xpAwarded, 18); // round(15 × 1.2)
    const r2 = await review(pc, b.j.checkinId, 'approve');
    assert.equal(r2.j.isEarly, false);
    assert.equal(r2.j.xpAwarded, 15);
  });

  test('待审核可改备注；通过后锁定不可改', async () => {
    const { pc, c1, c2 } = await setup();
    const a = await submit(c1, '英语');
    const e1 = await call('/api/checkin/edit', { method: 'POST', cookie: c1, body: { checkinId: a.j.checkinId, note: '单词抄了三遍' } });
    assert.equal(e1.j.ok, true);
    const q = await call('/api/parent/pending', { cookie: pc });
    assert.equal(q.j.reviews[0].note, '单词抄了三遍');
    await review(pc, a.j.checkinId, 'approve');
    const e2 = await call('/api/checkin/edit', { method: 'POST', cookie: c1, body: { checkinId: a.j.checkinId, note: '再改' } });
    assert.equal(e2.status, 400);
    // 别人改我的单 → 403
    const e3 = await call('/api/checkin/edit', { method: 'POST', cookie: c2, body: { checkinId: a.j.checkinId, note: 'x' } });
    assert.equal(e3.status, 403);
  });

  test('驳回展示原因 → 改后重交（回待审核、原因清空）→ 再通过', async () => {
    const { pc, c1 } = await setup();
    setHour('22'); // 非快手时段，经验断言稳定
    const a = await submit(c1, '阅读');
    const rej = await review(pc, a.j.checkinId, 'reject', { reason: '阅读记录没写完' });
    assert.equal(rej.j.rejected, true);
    const det = await call('/api/child?id=1', { cookie: c1 });
    const st = det.j.child.todaySubjects.find((s) => s.subject === '阅读').checkin;
    assert.equal(st.status, 'rejected');
    assert.equal(st.reason, '阅读记录没写完');
    // 驳回行不能走编辑接口，必须重新提交
    const e = await call('/api/checkin/edit', { method: 'POST', cookie: c1, body: { checkinId: a.j.checkinId, note: '补好了' } });
    assert.equal(e.status, 400);
    const re = await submit(c1, '阅读', { note: '补写完了' });
    assert.equal(re.j.ok, true);
    assert.equal(re.j.checkinId, a.j.checkinId); // 原行重交，不新建
    const det2 = await call('/api/child?id=1', { cookie: c1 });
    const st2 = det2.j.child.todaySubjects.find((s) => s.subject === '阅读').checkin;
    assert.equal(st2.status, 'pending');
    assert.equal(st2.reason, '');
    const ok = await review(pc, a.j.checkinId, 'approve');
    assert.equal(ok.j.xpAwarded, 15);
  });

  test('孩子今日五科状态汇总（overview.todaySubjects）', async () => {
    const { pc, c1 } = await setup();
    await submit(c1, '语文');
    const ov = await call('/api/overview', { cookie: pc });
    const k = ov.j.children[0];
    assert.equal(k.todaySubjects.length, 5);
    assert.equal(k.todaySubmittedCount, 1);
    assert.equal(k.todayApprovedCount, 0);
    assert.equal(k.todaySubjects.find((s) => s.subject === '数学').checkin, null);
  });
});

describe('问答按科解锁', () => {
  test('只通过语文 → 只出语文题；再通过数学 → 数学题解锁', async () => {
    const { pc, c1 } = await setup();
    // 学习进度B：语文/英语空标签 fail-closed，种子题须打默认门内标签（三年级上册第2单元），门未放宽
    raw.exec("UPDATE quiz_questions SET chapter='三年级上册 第2单元' WHERE kind='study' AND grade=3 AND subject IN ('语文','数学')");
    setHour('22');
    const before = await call('/api/quiz/today?child_id=1', { cookie: c1 });
    assert.equal(before.j.quota, 0);
    const a = await submit(c1, '语文');
    await review(pc, a.j.checkinId, 'approve');
    const t1 = await call('/api/quiz/today?child_id=1', { cookie: c1 });
    assert.equal(t1.j.quota, 1); // 语文 1（2026-11-09 起每日选题不再含脑筋急转弯）
    assert.deepEqual(t1.j.subjects, ['语文']);
    assert.equal(t1.j.questions.length, 1);
    assert.ok(t1.j.questions.every((q) => q.subject === '语文' && q.kind !== 'riddle'));
    const b = await submit(c1, '数学');
    await review(pc, b.j.checkinId, 'approve');
    const t2 = await call('/api/quiz/today?child_id=1', { cookie: c1 });
    assert.equal(t2.j.quota, 2);
    assert.ok(t2.j.questions.some((q) => q.subject === '数学'));
    assert.equal(t2.j.questions.length, 2);
  });
});

describe('选题去重（纯函数）', () => {
  const TODAY = '2026-10-20';
  const q = (id, subject, kind = 'knowledge') => ({ id, subject, kind, grade: 3, active: 1 });
  const pick = (pool, hist) => M.selectDailyQuestions(pool, {
    gradeNum: 3, subjects: ['语文'], history: hist, today: TODAY, rng: () => 0,
  }).map((x) => x.id);

  test('答对过的题 30 天内不再出（有未出过的题时被跳过）；31 天前答对可重出', () => {
    const hist = new Map([[1, { lastDate: '2026-10-10', lastCorrect: true }]]); // 10 天前答对
    const ids = pick([q(1, '语文'), q(2, '语文'), q(3, null, 'riddle')], hist);
    assert.ok(ids.includes(2) && !ids.includes(1));
    const hist31 = new Map([[1, { lastDate: '2026-09-19', lastCorrect: true }]]); // 31 天前答对
    const ids2 = pick([q(1, '语文'), q(3, null, 'riddle')], hist31);
    assert.ok(ids2.includes(1));
  });

  test('答错的题：2 天前不出、4 天前可重出；同槽有未出过的题优先未出过', () => {
    const pool = [q(1, '语文'), q(2, '语文'), q(3, null, 'riddle')];
    const hWrong2 = new Map([[1, { lastDate: '2026-10-18', lastCorrect: false }], [2, { lastDate: '2026-10-16', lastCorrect: false }]]);
    const ids = pick(pool, hWrong2);
    assert.ok(ids.includes(2) && !ids.includes(1)); // 4 天前错题（复习）胜出，2 天前的被压
    const hMixed = new Map([[2, { lastDate: '2026-10-16', lastCorrect: false }]]);
    const ids2 = pick(pool, hMixed);
    assert.ok(ids2.includes(1)); // 未出过的题（id=1）优先于错题复习
  });

  test('池全被窗口挡住时按最久未出现放宽补齐，保证凑满题量不报错', () => {
    const pool = [q(1, '语文'), q(2, '语文'), q(3, null, 'riddle')];
    const hist = new Map([
      [1, { lastDate: '2026-10-15', lastCorrect: true }], // 5 天前
      [2, { lastDate: '2026-10-11', lastCorrect: true }], // 9 天前（更久）
      [3, { lastDate: '2026-10-17', lastCorrect: true }],
    ]);
    const ids = pick(pool, hist);
    assert.equal(ids.length, 1); // quota=1（2026-11-09 起每日选题不再含谜语）凑满
    assert.ok(ids.includes(2)); // 最久未出现的先补
  });
});

describe('拍照上传（R2 假桶）', () => {
  test('带图提交 → 家长可读图；别的孩子读 → 403；未登录 → 401', async () => {
    const { pc, c1, c2 } = await setup();
    const a = await submit(c1, '语文', { photos: [{ data: TINY_JPG, contentType: 'image/jpeg' }] });
    assert.equal(a.j.ok, true);
    const q = await call('/api/parent/pending', { cookie: pc });
    const photos = q.j.reviews[0].photos;
    assert.equal(photos.length, 1);
    const pid = photos[0].id;
    const byParent = await call('/api/photos/' + pid, { cookie: pc });
    assert.equal(byParent.status, 200);
    assert.match(byParent.headers.get('content-type'), /image\/jpeg/);
    const bySelf = await call('/api/photos/' + pid, { cookie: c1 });
    assert.equal(bySelf.status, 200);
    const byOther = await call('/api/photos/' + pid, { cookie: c2 });
    assert.equal(byOther.status, 403);
    const anon = await call('/api/photos/' + pid);
    assert.equal(anon.status, 401);
    assert.equal(store.size, 1); // R2 里恰好一个对象
  });

  test('超过 3 张被拒；编辑换图：旧图删除、新图生效', async () => {
    const { pc, c1 } = await setup();
    const four = await submit(c1, '数学', {
      photos: [1, 2, 3, 4].map(() => ({ data: TINY_JPG, contentType: 'image/jpeg' })),
    });
    assert.equal(four.status, 400);
    const a = await submit(c1, '数学', { photos: [{ data: TINY_JPG, contentType: 'image/jpeg' }] });
    assert.equal(a.j.ok, true);
    const q1 = await call('/api/parent/pending', { cookie: pc });
    const oldId = q1.j.reviews[0].photos[0].id;
    const e = await call('/api/checkin/edit', {
      method: 'POST', cookie: c1,
      body: { checkinId: a.j.checkinId, photos: [{ data: TINY_JPG, contentType: 'image/jpeg' }, { data: TINY_JPG, contentType: 'image/jpeg' }] },
    });
    assert.equal(e.j.ok, true);
    const gone = await call('/api/photos/' + oldId, { cookie: pc });
    assert.equal(gone.status, 404); // 旧图已删
    const q2 = await call('/api/parent/pending', { cookie: pc });
    assert.equal(q2.j.reviews[0].photos.length, 2);
    assert.equal(store.size, 2);
  });

  test('debug-reset 连带清照片索引与 R2 对象', async () => {
    const { pc, c1 } = await setup();
    await submit(c1, '语文', { photos: [{ data: TINY_JPG, contentType: 'image/jpeg' }] });
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM checkin_photos').get().n, 1);
    const r = await call('/api/parent/debug-reset', { method: 'POST', cookie: pc, body: { confirm: true } });
    assert.equal(r.j.ok, true);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM checkin_photos').get().n, 0);
    assert.equal(store.size, 0);
  });
});
