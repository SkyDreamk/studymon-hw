// tests/sync-cache.test.mjs — 本地缓存完整版 · 服务端同步层（迁移 0020）
// Harness 与 tests/access.test.mjs 同款：node:sqlite 内存库 + 全量迁移 + D1 适配层驱动
// Worker 的真实 fetch 处理函数；env 另带假 PHOTOS 绑定（Map 实现 put/get/delete）。
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql'];
const PNG_1X1_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function makeEnv(withSync = true) {
  const raw = new DatabaseSync(':memory:');
  for (const f of (withSync ? MIGRATIONS : MIGRATIONS.filter((x) => x !== '0020_sync.sql'))) {
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
  const store = new Map();
  const PHOTOS = {
    async put(key, bytes, opts) { store.set(key, { bytes, opts }); },
    async get(key) { const v = store.get(key); return v ? { arrayBuffer: async () => v.bytes } : null; },
    async delete(key) { store.delete(key); },
  };
  return {
    env: { DB: db, TEST_MODE: '1', PHOTOS, ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw, store,
  };
}

let env, raw, store;
beforeEach(() => { M.resetEvoTableCache(); ({ env, raw, store } = makeEnv()); });

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

async function setup() {
  const pc = await parentCookie();
  const r = await call('/api/parent/settings/update', {
    method: 'POST', cookie: pc,
    body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '0000'), c2: await childCookie(2, '0000') };
}

async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200);
  return r.cookie;
}

function shToday() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }); }
function addDaysStr(ds, n) {
  const d = new Date(ds + 'T12:00:00+08:00');
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}

async function submitAndApprove(pc, childId, subject) {
  const sub = await call('/api/checkin', { method: 'POST', cookie: pc, body: { childId, subjects: [subject] } });
  assert.equal(sub.j.ok, true, '打卡提交应成功');
  const rev = await call('/api/parent/review', { method: 'POST', cookie: pc, body: { checkinId: sub.j.checkinId, decision: 'approve' } });
  assert.equal(rev.j.ok, true, '审核通过应成功');
  return sub.j.checkinId;
}

async function syncVersion(childId) {
  const r = raw.prepare('SELECT version FROM sync_versions WHERE child_id=?').get(childId);
  return r ? r.version : 0;
}

describe('sync 拉取', () => {
  test('全量：无 since 返回全部行，children 去敏感字段、settings 去 pin', async () => {
    const { c1 } = await setup();
    const { j } = await call('/api/sync?child_id=1', { cookie: c1 });
    assert.equal(j.ok, true, '全量同步应成功');
    // setup() 经 settings/update 设孩子密码会推版本（全局设置变更推全员），故基线为 1 不是 0
    assert.equal(j.version, await syncVersion(1), '全量同步版本应与 sync_versions 一致');
    assert.equal(j.version, 1, '设密码后同步版本应为 1');
    assert.equal(j.schema_version, 1, '同步结构版本应为 1');
    assert.equal(j.changed.children.length, 1, '只应返回当前孩子');
    for (const key of ['pwd_hash', 'pwd_fail_count', 'pwd_locked_until']) {
      assert.equal(Object.hasOwn(j.changed.children[0], key), false, `不得泄露敏感字段 ${key}`);
    }
    assert.ok(j.changed.settings.every((row) => row.key !== 'pin'), '设置不得包含家长 PIN');
    assert.ok(j.changed.quiz_questions.length > 0, '全量同步应包含题库');
  });

  test('增量：since=当前版本且无写入时 changed 与 deleted 均为空', async () => {
    const { c1 } = await setup();
    const v0 = await syncVersion(1);
    const { j } = await call(`/api/sync?child_id=1&since=${v0}`, { cookie: c1 });
    assert.equal(j.ok, true, '增量同步应成功');
    assert.deepEqual(j.changed, {}, '无写入时变化集应为空');
    assert.deepEqual(j.deleted, {}, '无删除时删除集应为空');
    assert.equal(j.version, v0, '无写入时版本应不变');
  });

  test('增量：打卡审核通过后只返回变化的行', async () => {
    const { pc, c1 } = await setup();
    const v0 = await syncVersion(1);
    assert.equal(v0, 1, '打卡前版本应为设密码后的 1');
    await submitAndApprove(pc, 1, '语文');
    const { j } = await call(`/api/sync?child_id=1&since=${v0}`, { cookie: c1 });
    assert.equal(j.ok, true, '审核后的增量同步应成功');
    assert.equal(j.changed.checkins.length, 1, '应返回一条变化的打卡');
    assert.ok(j.changed.checkins[0].ver > v0, '打卡行版本应推进');
    assert.equal(j.changed.children.length, 1, '应返回变化的孩子行');
    assert.ok(j.changed.children[0].total_xp > 0, '审核应增加孩子经验');
    assert.ok(j.version > v0, '审核应推进同步版本');
  });

  test('增量：since=当前版本时返回空', async () => {
    const { pc, c1 } = await setup();
    await submitAndApprove(pc, 1, '语文');
    const v1 = await syncVersion(1);
    const { j } = await call(`/api/sync?child_id=1&since=${v1}`, { cookie: c1 });
    assert.equal(j.ok, true, '当前版本同步应成功');
    assert.deepEqual(j.changed, {}, '当前版本不应返回变化');
    assert.deepEqual(j.deleted, {}, '当前版本不应返回删除');
  });

  test('未就绪：无 0020 的库调 sync 返回 503 SYNC_NOT_READY', async () => {
    const noSync = makeEnv(false);
    try {
      // 先在该库内登录家长（无会话时路由先回 401，到不了 sync 的 503 判定）
      const loginRes = await M.default.fetch(new Request('https://test.local/api/parent/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: '0000' }),
      }), noSync.env);
      assert.equal(loginRes.status, 200, '无同步表的库内家长登录应成功');
      const cookie = loginRes.headers.get('set-cookie').split(';')[0];
      const res = await M.default.fetch(new Request('https://test.local/api/sync?child_id=1', {
        headers: { Cookie: cookie },
      }), noSync.env);
      const j = await res.json();
      assert.equal(res.status, 503, '缺少同步迁移时应返回 503');
      assert.equal(j.error, 'SYNC_NOT_READY', '缺少同步表应报告同步未就绪');
    } finally {
      noSync.raw.close();
    }
  });
});

describe('commands 幂等', () => {
  test('checkin 命令：同 cmd_id 重放只落一条记录', async () => {
    const { pc } = await setup();
    const body = { cmd_id: 't6-checkin-1', child_id: 1, type: 'checkin', payload: { childId: 1, subjects: ['数学'] } };
    const first = await call('/api/commands', { method: 'POST', cookie: pc, body });
    const replay = await call('/api/commands', { method: 'POST', cookie: pc, body });
    assert.equal(first.j.ok, true, '首次打卡命令应成功');
    assert.equal(replay.j.ok, true, '重放打卡命令应成功');
    assert.ok(first.j.checkinId != null, '首次命令应返回打卡编号');
    assert.equal(replay.j.checkinId, first.j.checkinId, '重放应返回同一打卡编号');
    const rows = raw.prepare('SELECT * FROM checkins WHERE child_id=?').all(1);
    assert.equal(rows.length, 1, '本测试仅提交当日数学，重放不得增加打卡行');
    assert.equal(rows[0].id, first.j.checkinId, '唯一打卡行应属于首次命令');
  });

  test('checkin 命令：sync 能看到命令写入的行', async () => {
    const { pc, c1 } = await setup();
    const v0 = await syncVersion(1);
    const body = { cmd_id: 't7-checkin-1', child_id: 1, type: 'checkin', payload: { childId: 1, subjects: ['数学'] } };
    const first = await call('/api/commands', { method: 'POST', cookie: pc, body });
    const replay = await call('/api/commands', { method: 'POST', cookie: pc, body });
    assert.equal(first.j.ok, true, '首次命令应成功');
    assert.equal(replay.j.ok, true, '重放命令应成功');
    assert.equal(replay.j.checkinId, first.j.checkinId, '重放应复用原打卡');
    const { j } = await call(`/api/sync?child_id=1&since=${v0}`, { cookie: c1 });
    assert.equal(j.ok, true, '命令后的同步应成功');
    assert.equal(j.changed.checkins.length, 1, '同步应看到一条命令写入的打卡');
    assert.equal(j.changed.checkins[0].id, first.j.checkinId, '同步打卡应与命令结果一致');
  });

  test('缺 cmd_id 返回 CMD_ID_REQUIRED', async () => {
    const { pc } = await setup();
    const r = await call('/api/commands', {
      method: 'POST', cookie: pc,
      body: { child_id: 1, type: 'checkin', payload: {} },
    });
    assert.equal(r.status, 400, '缺命令编号应返回 400');
    assert.equal(r.j.error, 'CMD_ID_REQUIRED', '应报告缺少命令编号');
  });

  test('未知 type 返回 UNKNOWN_TYPE', async () => {
    const { pc } = await setup();
    const r = await call('/api/commands', {
      method: 'POST', cookie: pc,
      body: { cmd_id: 't9-x', child_id: 1, type: 'nope', payload: {} },
    });
    assert.equal(r.status, 400, '未知命令类型应返回 400');
    assert.equal(r.j.error, 'UNKNOWN_TYPE', '应报告未知命令类型');
  });

  test('quiz_answer 命令：答题落 quiz_attempts 行且 ver>0', async () => {
    const { pc, c1 } = await setup();
    // 2026-11-09 起每日选题不再含谜语；本夹具的 quiz_questions 无 chapter 列，
    // 语文题过不了语文门（空标签 fail-closed），改批数学（数学空标签放行），今日题单才非空
    await submitAndApprove(pc, 1, '数学');
    const today = await call('/api/quiz/today?child_id=1', { cookie: c1 });
    assert.equal(today.j.ok, true, '获取今日题目应成功');
    assert.ok(today.j.questions.length > 0, '审核科目后应有今日题目');
    const questionId = today.j.questions[0].id;
    const r = await call('/api/commands', {
      method: 'POST', cookie: c1,
      body: { cmd_id: 't10-qa-1', child_id: 1, type: 'quiz_answer', payload: { childId: 1, questionId, answerIdx: 0 } },
    });
    assert.equal(r.j.ok, true, '答题命令应成功');
    const row = raw.prepare('SELECT * FROM quiz_attempts WHERE child_id=? AND question_id=?').get(1, questionId);
    assert.ok(row, '答题应写入该孩子该题的尝试记录');
    assert.ok(row.ver > 0, '答题记录版本应大于 0');
  });
});

describe('quiz/all 与照片', () => {
  test('quiz/all 题数与 quiz_questions 计数一致', async () => {
    const { c1 } = await setup();
    const { j } = await call('/api/quiz/all?child_id=1', { cookie: c1 });
    const count = raw.prepare('SELECT COUNT(*) AS n FROM quiz_questions').get().n;
    assert.equal(j.ok, true, '获取完整题库应成功');
    assert.equal(j.childId, 1, '题库响应应对应孩子 1');
    assert.equal(j.count, count, '接口题数应与数据库一致');
    assert.equal(j.questions.length, count, '返回题目数组长度应与题数一致');
  });

  test('photo upload：写索引行且 ver>0，对象进桶', async () => {
    const { pc, c1 } = await setup();
    const sub = await call('/api/checkin', {
      method: 'POST', cookie: pc, body: { childId: 1, subjects: ['语文'] },
    });
    assert.equal(sub.j.ok, true, '未审核打卡提交应成功');
    const r = await call('/api/photo/upload', {
      method: 'POST', cookie: c1,
      body: { child_id: 1, checkin_id: sub.j.checkinId, name: 'a.png', data_b64: PNG_1X1_B64 },
    });
    assert.equal(r.j.ok, true, '照片上传应成功');
    assert.equal(typeof r.j.photoId, 'number', '照片编号应为数字');
    assert.equal(r.j.url, `/api/photos/${r.j.photoId}`, '照片地址应使用索引编号');
    const row = raw.prepare('SELECT * FROM checkin_photos WHERE id=?').get(r.j.photoId);
    assert.ok(row, '上传应写入照片索引');
    assert.ok(row.ver > 0, '照片索引版本应大于 0');
    assert.equal(store.size, 1, '照片对象应写入桶且仅一份');
  });

  test('删照片记 tombstone：增量 sync 的 deleted 含该照片行', async () => {
    const { pc, c1 } = await setup();
    const sub = await call('/api/checkin', {
      method: 'POST', cookie: pc, body: { childId: 1, subjects: ['语文'] },
    });
    assert.equal(sub.j.ok, true, '打卡提交应成功');
    const checkinId = sub.j.checkinId;
    const upload = await call('/api/photo/upload', {
      method: 'POST', cookie: c1,
      body: { child_id: 1, checkin_id: checkinId, name: 'a.png', data_b64: PNG_1X1_B64 },
    });
    assert.equal(upload.j.ok, true, '照片上传应成功');
    const photoId = upload.j.photoId;
    assert.equal(typeof photoId, 'number', '照片编号应为数字');
    assert.equal(store.size, 1, '上传对象应进入桶');
    const v0 = await syncVersion(1);
    const edit = await call('/api/checkin/edit', {
      method: 'POST', cookie: pc, body: { checkinId, photos: [] },
    });
    assert.equal(edit.j.ok, true, '清空打卡照片应成功');
    assert.equal(raw.prepare('SELECT * FROM checkin_photos WHERE id=?').get(photoId), undefined, '照片索引应被删除');
    const { j } = await call(`/api/sync?child_id=1&since=${v0}`, { cookie: c1 });
    assert.equal(j.ok, true, '删除后的增量同步应成功');
    assert.ok(Array.isArray(j.deleted.checkin_photos), '删除集应包含照片表');
    assert.ok(j.deleted.checkin_photos.map(Number).includes(photoId), '墓碑应包含被删除照片编号');
  });
});

describe('gym_settle', () => {
  test('won=false 返回 LOST，不结算', async () => {
    const { pc } = await setup();
    const r = await call('/api/gym/settle', {
      method: 'POST', cookie: pc,
      body: { cmd_id: 't14-lost', child_id: 1, stage: 1, won: false, date: shToday() },
    });
    assert.equal(r.j.ok, true, '失败战斗请求应正常处理');
    assert.equal(r.j.settled, false, '失败战斗不得结算');
    assert.equal(r.j.reason, 'LOST', '失败战斗应返回 LOST');
    assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM gym_battles').get().n, 0, '失败战斗不得落结算行');
  });

  test('过周返回 WEEK_PASSED', async () => {
    const { pc } = await setup();
    const r = await call('/api/gym/settle', {
      method: 'POST', cookie: pc,
      body: { cmd_id: 't15-week', child_id: 1, stage: 1, won: true, date: addDaysStr(shToday(), -7) },
    });
    assert.equal(r.status, 400, '过周结算应返回 400');
    assert.equal(r.j.error, 'WEEK_PASSED', '上周战斗应报告周已过期');
  });

  test('等级不足返回 LEVEL_TOO_LOW', async () => {
    const { pc } = await setup();
    assert.equal(raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp, 0, '孩子初始经验应为 0');
    const r = await call('/api/gym/settle', {
      method: 'POST', cookie: pc,
      body: { cmd_id: 't16-level', child_id: 1, stage: 1, won: true, date: shToday() },
    });
    assert.equal(r.status, 400, '等级不足应返回 400');
    assert.equal(r.j.error, 'LEVEL_TOO_LOW', '第一关应校验最低等级');
  });

  test('通关成功记 won 行且 ver>0，第二次 ALREADY_CLEARED', async () => {
    const { pc } = await setup();
    raw.exec('UPDATE children SET total_xp=10000 WHERE id=1');
    const eggsBefore = raw.prepare('SELECT COUNT(*) AS n FROM sealed_eggs WHERE child_id=1').get().n;
    const body = { cmd_id: 't17-win', child_id: 1, stage: 1, won: true, date: shToday() };
    const r = await call('/api/gym/settle', { method: 'POST', cookie: pc, body });
    assert.equal(r.j.ok, true, '高等级孩子通关结算应成功');
    assert.equal(r.j.settled, true, '胜利应完成结算');
    assert.equal(typeof r.j.battleId, 'number', '结算应返回数字战斗编号');
    const row = raw.prepare('SELECT * FROM gym_battles WHERE id=?').get(r.j.battleId);
    assert.ok(row, '通关应写入道馆战斗行');
    assert.equal(row.status, 'won', '战斗状态应为 won');
    assert.ok(row.ver > 0, '通关战斗行应推进版本');
    assert.ok(raw.prepare('SELECT COUNT(*) AS n FROM sealed_eggs WHERE child_id=1').get().n > eggsBefore, '通关应给该孩子新增封印蛋');
    const again = await call('/api/gym/settle', {
      method: 'POST', cookie: pc, body: { ...body, cmd_id: 't17-win2' },
    });
    assert.equal(again.status, 400, '同周同关再次结算应返回 400');
    assert.equal(again.j.error, 'ALREADY_CLEARED', '再次结算应报告已通关');
  });
});

describe('pvp_settle', () => {
  test('首场计次发奖，第二场 practice 不发奖，同 cmd_id 重放不重复', async () => {
    const { pc } = await setup();
    const balls = () => raw.prepare('SELECT balls FROM children WHERE id=1').get().balls;
    assert.equal(balls(), 3, '孩子初始球数应为 3');
    const body = { cmd_id: 't18-pvp-1', child_id: 1, winner_child_id: 1, loser_child_id: 2 };
    const first = await call('/api/pvp/settle', { method: 'POST', cookie: pc, body });
    assert.equal(first.j.ok, true, '首场对战结算应成功');
    assert.equal(first.j.counted, true, '首场应计次');
    assert.equal(first.j.practice, false, '首场不应是练习赛');
    assert.equal(typeof first.j.battleId, 'number', '首场应返回数字战斗编号');
    assert.equal(balls(), 4, '首场胜者应获得一个球');
    const row1 = raw.prepare('SELECT * FROM battles WHERE id=?').get(first.j.battleId);
    assert.ok(row1, '首场应落战斗行');
    assert.equal(row1.counted, 1, '首场数据库计次标志应为 1');
    assert.equal(row1.practice, 0, '首场数据库练习标志应为 0');

    const second = await call('/api/pvp/settle', {
      method: 'POST', cookie: pc, body: { ...body, cmd_id: 't18-pvp-2' },
    });
    assert.equal(second.j.ok, true, '第二场对战结算应成功');
    assert.equal(second.j.counted, false, '同周第二场不应计次');
    assert.equal(second.j.practice, true, '同周第二场应为练习赛');
    assert.equal(balls(), 4, '练习赛不得再次发球');
    const row2 = raw.prepare('SELECT * FROM battles WHERE id=?').get(second.j.battleId);
    assert.ok(row2, '第二场应落战斗行');
    assert.equal(row2.counted, 0, '第二场数据库计次标志应为 0');
    assert.equal(row2.practice, 1, '第二场数据库练习标志应为 1');

    const replay = await call('/api/pvp/settle', { method: 'POST', cookie: pc, body });
    assert.equal(replay.j.ok, true, '首场命令重放应成功');
    assert.equal(replay.j.battleId, first.j.battleId, '重放应返回首场战斗编号');
    assert.equal(balls(), 4, '重放不得重复发奖');
    assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM battles').get().n, 2, '重放不得新增第三条战斗记录');
  });
});