/* 每日数学口算单测：node --test tests/daily-math.test.mjs
 * 覆盖：出题器（种子固定：同一天同一孩子恒为同一 5 道、两孩年级范围不同、未知年级 fail-closed；
 * 年级范围：一年级 20 以内加减为主＋100 以内两位数加减一位数、三年级表内乘除＋多位数加减）；
 * 答题（每题一次作答、提交后锁定不可改、答错返回正确答案、未完成不记日志不发机会）；
 * 打卡门禁（3/5 不通过、4/5 通过记日志发 1 次养成转盘机会、重复打卡不重发、已打卡后锁定）。
 * 回归（2026-11-09 截图验收发现）：英文模式下数学输入框 placeholder 不得含 dmBi 的 HTML
 * 标记（否则 `"` 提前终结属性、input 渲染成 raw 文本）；GET 已存答案须附答错题的 correctAnswer。
 * 不部署、不碰 staging D1；不消耗真实打卡记录（内存库）。
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0026_rare_wheel.sql', '0027_daily_english.sql', '0028_care_wheel.sql', '0029_daily_english_assess.sql', '0030_daily_chinese.sql', '0031_daily_math.sql'];

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
beforeEach(async () => {
  ({ env, raw } = makeEnv());
  const parent = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(parent.status, 200);
  const set = await call('/api/parent/settings/update', {
    method: 'POST', cookie: parent.cookie,
    body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] },
  });
  assert.equal(set.j.ok, true);
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

async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200, `child ${id} 登录应成功：${JSON.stringify(r.j)}`);
  return r.cookie;
}

async function todayMath(childId, cookie) {
  const r = await call('/api/daily-math?child_id=' + childId, { cookie });
  assert.equal(r.j.ok, true);
  return { date: r.j.date, problems: r.j.problems };
}
function wheelChances(childId, source) {
  return raw.prepare('SELECT COUNT(*) n FROM care_wheel_chances WHERE child_id=? AND source=?').get(childId, source).n;
}
// 解析题面 "7 × 8 = ?"（减号为 U+2212）
function parseQ(q) {
  const m = /^(\d+) ([+−×÷]) (\d+) = \?$/.exec(q);
  assert.ok(m, `题面格式异常：${q}`);
  return { a: Number(m[1]), op: m[2], b: Number(m[3]) };
}
// 括号填数验算：把答案代入 ()，等式两边应相等（只含数字与 + − × ÷）
function checkBracket(p, gradeNum) {
  const m = /^(.+) = (.+)$/.exec(p.q);
  assert.ok(m, `括号题格式异常：${p.q}`);
  const evalSide = (s) => {
    const t = s.replace('()', `(${p.a})`);
    assert.ok(/^[\d\s()+\-−×÷]+$/.test(t), `括号题含非法字符：${p.q}`);
    const js = t.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
    return Function(`return (${js})`)();
  };
  assert.equal(evalSide(m[1]), evalSide(m[2]), `括号题答案错：${p.q}，答案 ${p.a}`);
  assert.ok(Number.isInteger(p.a) && p.a >= 1, `括号题答案应为正整数：${p.q}`);
  const nums = (p.q.match(/\d+/g) || []).map(Number);
  if (gradeNum === 1) {
    assert.ok(nums.every((n) => n <= 20) && p.a <= 20, `一年级括号题数字超纲：${p.q}`);
  } else {
    assert.ok(nums.every((n) => n <= 999) && p.a <= 999, `三年级括号题数字超纲：${p.q}`);
    if (p.op === '×' || p.op === '÷') assert.ok(p.a <= 81, `三年级表内乘除括号题答案超纲：${p.q}`);
  }
}
// 应用题验算：按模板 id 查 solve，用代入的 nums 重算答案；中英文题干须含全部代入数字
const WORD_TPL = new Map();
for (const t of [...M.DAILY_MATH_WORD_G1, ...M.DAILY_MATH_WORD_G3]) WORD_TPL.set(t.id, t);
function checkWord(p, gradeNum) {
  const tpl = WORD_TPL.get(p.tpl);
  assert.ok(tpl, `应用题模板未知：${p.tpl}（${p.q}）`);
  assert.equal(p.a, tpl.solve(p.nums), `应用题答案错：${p.q}，答案 ${p.a}`);
  for (const n of p.nums) assert.ok(p.q.includes(String(n)), `应用题中文题干应含数字 ${n}：${p.q}`);
  assert.ok(p.qEn && p.qEn.length > 0, `应用题须有英文题干：${p.q}`);
  for (const n of p.nums) assert.ok(p.qEn.includes(String(n)), `应用题英文题干数字应与中文一致：${p.qEn}`);
  assert.ok(Number.isInteger(p.a) && p.a >= 0, `应用题答案应为非负整数：${p.q}`);
  if (gradeNum === 1) {
    assert.ok(p.nums.every((n) => n <= 20) && p.a <= 20, `一年级应用题只用 20 以内加减：${p.q}`);
  } else {
    assert.ok(p.nums.every((n) => n <= 300) && p.a <= 300, `三年级应用题数字超纲：${p.q}`);
  }
}
// 用种子重算当日正确答案（与服务端同一口径：dailyMathTodayFor 返回 { date, problems }）
function todayAnswers(childId, gradeLabel, date) {
  const child = { id: childId, grade_label: gradeLabel };
  return M.dailyMathTodayFor(child, date).problems.map((p) => p.a);
}

describe('出题器（种子 child_id＋当天日期）', () => {
  test('5 道恒定：同一天同一孩子恒为同一 5 道；两孩题不同', () => {
    assert.equal(M.DAILY_MATH_COUNT, 5);
    assert.equal(M.DAILY_MATH_PASS_COUNT, 4, '4/5 通过线');
    const dabao = { id: 1, grade_label: '三年级' };
    const a = M.dailyMathTodayFor(dabao, '2026-11-09');
    const b = M.dailyMathTodayFor(dabao, '2026-11-09');
    assert.deepEqual(a.problems, b.problems, '同孩同日应恒为同一 5 道');
    assert.equal(a.problems.length, 5);
    const xiaobao = { id: 2, grade_label: '一年级' };
    const c = M.dailyMathTodayFor(xiaobao, '2026-11-09');
    assert.notDeepEqual(a.problems, c.problems, '两孩当日题应不同');
  });
  test('次日换题；未知年级 fail-closed 不编题', () => {
    const dabao = { id: 1, grade_label: '三年级' };
    const a = M.dailyMathTodayFor(dabao, '2026-11-09');
    const b = M.dailyMathTodayFor(dabao, '2026-11-10');
    assert.notDeepEqual(a.problems, b.problems, '次日应换题');
    assert.equal(M.dailyMathTodayFor({ id: 9, grade_label: '五年级' }, '2026-11-09').error, 'NO_POOL');
  });
  test('一年级范围：20 以内加减为主，100 以内两位数加减一位数不超纲', () => {
    // 40 天 × 5 道＝200 道抽样（走 dailyMathTodayFor 公共口径）
    for (let d = 1; d <= 40; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      for (const p of M.dailyMathTodayFor({ id: 2, grade_label: '一年级' }, date).problems) {
        if (p.kind === 'bracket') { checkBracket(p, 1); continue; }
        if (p.kind === 'word') { checkWord(p, 1); continue; }
        assert.equal(p.kind, 'calc', `未知题型：${p.kind}`);
        const { a, op, b } = parseQ(p.q);
        assert.ok(op === '+' || op === '−', `一年级只出加减，实际：${p.q}`);
        const in20 = a <= 20 && b <= 20 && (op === '+' ? a + b <= 20 : a >= b);
        const in100 = a >= 10 && a <= 99 && b >= 1 && b <= 9 && (op === '+' ? a + b <= 99 : a >= b);
        assert.ok(in20 || in100, `一年级题超纲：${p.q}`);
        assert.equal(p.a, op === '+' ? a + b : a - b, `一年级答案错：${p.q}`);
      }
    }
  });
  test('三年级范围：表内乘除（2–9）＋多位数加减，不超纲', () => {
    for (let d = 1; d <= 40; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      for (const p of M.dailyMathTodayFor({ id: 1, grade_label: '三年级' }, date).problems) {
        if (p.kind === 'bracket') { checkBracket(p, 3); continue; }
        if (p.kind === 'word') { checkWord(p, 3); continue; }
        assert.equal(p.kind, 'calc', `未知题型：${p.kind}`);
        const { a, op, b } = parseQ(p.q);
        if (op === '×') {
          assert.ok(a >= 2 && a <= 9 && b >= 2 && b <= 9, `表内乘法超纲：${p.q}`);
          assert.equal(p.a, a * b);
        } else if (op === '÷') {
          assert.ok(b >= 2 && b <= 9 && a % b === 0 && a / b >= 2 && a / b <= 9, `表内除法超纲/不整除：${p.q}`);
          assert.equal(p.a, a / b);
        } else if (op === '+') {
          assert.ok(a >= 10 && a <= 99 && b >= 10 && b <= 99, `两位数加法超纲：${p.q}`);
          assert.equal(p.a, a + b);
        } else if (op === '−') {
          assert.ok(a >= 100 && a <= 999 && b >= 10 && b <= 99 && a >= b, `三位数减法超纲/负数：${p.q}`);
          assert.equal(p.a, a - b);
        } else {
          assert.fail(`三年级不应出 ${op}：${p.q}`);
        }
      }
    }
  });
});

describe('接口 GET /api/daily-math', () => {
  test('返回当日 5 道题（不带答案）、answers 空、correctCount 0、未完成', async () => {
    const c1 = await childCookie(1, '0000');
    const r = await call('/api/daily-math?child_id=1', { cookie: c1 });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.problems.length, 5);
    for (const p of r.j.problems) {
      assert.ok(p.kind === 'calc' || p.kind === 'bracket' || p.kind === 'word', `题型未知：${p.kind}`);
      if (p.kind === 'calc') assert.ok(p.q && p.q.endsWith('= ?'), '口算题面应以 = ? 结尾');
      if (p.kind === 'bracket') assert.ok(p.q && p.q.includes('()') && p.q.includes('='), '括号题面应含 () 与 =');
      if (p.kind === 'word') {
        assert.ok(p.q && p.q.endsWith('？'), '应用题中文题干应以？结尾');
        assert.ok(p.qEn && p.qEn.endsWith('?'), '应用题须附英文题干');
      }
      assert.equal(p.a, undefined, 'GET 不应下发答案');
      assert.equal(p.tpl, undefined, 'GET 不应下发模板 id');
      assert.equal(p.nums, undefined, 'GET 不应下发代入数字');
    }
    assert.deepEqual(r.j.answers, {});
    assert.equal(r.j.correctCount, 0);
    assert.equal(r.j.completed, false);
    assert.equal(r.j.careWheelChances, 0);
  });
  test('未登录 401；跨孩 403', async () => {
    const anon = await call('/api/daily-math?child_id=1');
    assert.equal(anon.status, 401);
    const c1 = await childCookie(1, '0000');
    const cross = await call('/api/daily-math?child_id=2', { cookie: c1 });
    assert.equal(cross.status, 403);
  });
});

describe('接口 POST /api/daily-math/answer（每题一次作答）', () => {
  test('答对记 correct、答错返回正确答案；重复提交返回已有结果不重复计', async () => {
    const c1 = await childCookie(1, '0000');
    const { date, problems } = await todayMath(1, c1);
    const answers = todayAnswers(1, '三年级', date);
    // 第 1 题答对
    let r = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: 0, answer: answers[0] } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.correct, true);
    assert.equal(r.j.correctCount, 1);
    // 第 1 题重复提交（改答案）：返回已有结果，不重复计
    r = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: 0, answer: answers[0] + 999 } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.already, true, '重复提交应标记 already');
    assert.equal(r.j.correct, true, '重复提交不应改写已有结果');
    assert.equal(r.j.correctCount, 1, '重复提交不应重复计分');
    // 第 2 题答错：返回正确答案
    r = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: 1, answer: answers[1] + 1 } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.correct, false);
    assert.equal(r.j.correctAnswer, answers[1], '答错应返回正确答案');
    assert.equal(r.j.correctCount, 1);
    // 第 2 题重复提交（改成正确答案）：仍判错，不可改
    r = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: 1, answer: answers[1] } });
    assert.equal(r.j.already, true);
    assert.equal(r.j.correct, false, '答错后改正确答案仍应判错（不可改）');
    assert.equal(r.j.correctCount, 1);
    // GET 应回显已答结果
    const g = await call('/api/daily-math?child_id=1', { cookie: c1 });
    assert.equal(g.j.answers['0'].correct, true);
    assert.equal(g.j.answers['1'].correct, false);
    assert.equal(g.j.correctCount, 1);
    void problems;
  });
  test('非法 index / 非数字答案拒绝；未登录/跨孩拒绝', async () => {
    const c1 = await childCookie(1, '0000');
    const badIdx = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: 5, answer: 1 } });
    assert.equal(badIdx.status, 400);
    const badAns = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: 0, answer: 'abc' } });
    assert.equal(badAns.status, 400);
    const anon = await call('/api/daily-math/answer', { method: 'POST', body: { childId: 1, index: 0, answer: 1 } });
    assert.equal(anon.status, 401);
    const cross = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 2, index: 0, answer: 1 } });
    assert.equal(cross.status, 403);
  });
});

describe('打卡门禁：4/5 才记完成（2026-11-09）', () => {
  async function answerN(childId, cookie, date, gradeLabel, n, correctFirst) {
    const answers = todayAnswers(childId, gradeLabel, date);
    for (let i = 0; i < n; i++) {
      const ans = correctFirst ? answers[i] : answers[i] + 1;
      const r = await call('/api/daily-math/answer', { method: 'POST', cookie, body: { childId, index: i, answer: ans } });
      assert.equal(r.j.ok, true);
    }
  }
  test('3/5 打卡被拒，不记日志、不发转盘机会', async () => {
    const c1 = await childCookie(1, '0000');
    const { date } = await todayMath(1, c1);
    await answerN(1, c1, date, '三年级', 3, true);
    const r = await call('/api/daily-math/checkin', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.ok, false);
    assert.equal(r.j.error, 'NOT_PASSED');
    assert.equal(r.j.correctCount, 3);
    assert.equal(r.j.needed, 4);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM daily_math_logs WHERE child_id=1').get().n, 0, '未达 4/5 不应记日志');
    assert.equal(wheelChances(1, 'daily-math'), 0, '未达 4/5 不应发转盘机会');
  });
  test('4/5 打卡成功：记日志、发 1 次养成转盘机会；重复打卡不重发', async () => {
    const c1 = await childCookie(1, '0000');
    const { date } = await todayMath(1, c1);
    await answerN(1, c1, date, '三年级', 4, true);
    const r = await call('/api/daily-math/checkin', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.completed, true);
    // GET 复核：已完成、答对 4/5
    const g = await call('/api/daily-math?child_id=1', { cookie: c1 });
    assert.equal(g.j.completed, true);
    assert.equal(g.j.correctCount, 4);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM daily_math_logs WHERE child_id=1 AND date_shanghai=?').get(date).n, 1, '达标应记日志');
    assert.equal(wheelChances(1, 'daily-math'), 1, '达标应发 1 次养成转盘机会');
    const r2 = await call('/api/daily-math/checkin', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r2.j.ok, true);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM daily_math_logs WHERE child_id=1 AND date_shanghai=?').get(date).n, 1);
    assert.equal(wheelChances(1, 'daily-math'), 1, '重复打卡不应重发机会');
  });
  test('已打卡后答题锁定：answer 返回 completed', async () => {
    const c1 = await childCookie(1, '0000');
    const { date } = await todayMath(1, c1);
    await answerN(1, c1, date, '三年级', 4, true);
    await call('/api/daily-math/checkin', { method: 'POST', cookie: c1, body: { childId: 1 } });
    const answers = todayAnswers(1, '三年级', date);
    const r = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: 4, answer: answers[4] } });
    assert.equal(r.j.ok, false);
    assert.equal(r.j.error, 'completed', '已打卡后不应再答题');
  });
  test('打卡不加经验（total_xp 不变）', async () => {
    const c1 = await childCookie(1, '0000');
    const { date } = await todayMath(1, c1);
    const before = raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp;
    await answerN(1, c1, date, '三年级', 5, true);
    await call('/api/daily-math/checkin', { method: 'POST', cookie: c1, body: { childId: 1 } });
    const after = raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp;
    assert.equal(after, before, '每日数学打卡不应加经验');
  });
});

describe('回归 2026-11-09 截图验收：placeholder 与刷新后正确答案', () => {
  // 从 app.js.orig 抽出 dailyBi + dmRowHtml，在沙箱里渲染（与 dex-filter.test.mjs 同一手法；任务 82：dmBi 已并入 dailyBi）
  function renderRow({ lang, answers, problems, index = 4 }) {
    const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
    // 任务 82：dmBi 已并入通用 dailyBi，dmUpdateRow 已并入 DM.updateRow；分别抽 dailyBi 与 dmRowHtml 再拼合
    const biStart = appSrc.indexOf('function dailyBi(');
    const biEnd = appSrc.indexOf('\n}\n', biStart) + 3;
    const rowStart = appSrc.indexOf('function dmRowHtml(');
    const rowEnd = appSrc.indexOf('async function dmAnswer(', rowStart);
    assert.ok(biStart >= 0 && biEnd > biStart && rowStart >= 0 && rowEnd > rowStart, '应能在 app.js.orig 找到 dailyBi/dmRowHtml');
    const src = appSrc.slice(biStart, biEnd) + '\n' + appSrc.slice(rowStart, rowEnd);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const factory = new Function('window', 'state', 'lcNetOff', 'esc', `${src}; return { dmBi: dailyBi, dmRowHtml };`);
    const F = factory(
      { _dm: { problems: problems || [{ q: '12 ÷ 4 = ?' }, { q: '72 + 45 = ?' }, { q: '3 × 5 = ?' }, { q: '2 × 5 = ?' }, { q: '9 × 3 = ?' }], answers, done: false, correctCount: 0 } },
      { lang },
      () => false,
      esc,
    );
    return F.dmRowHtml(index);
  }

  test('Bug 1：英文模式 placeholder 须为纯文本 Answer，不含 HTML 标记/未转义引号', () => {
    const html = renderRow({ lang: 'en', answers: {} });
    const m = /placeholder="([^"]*)"/.exec(html);
    assert.ok(m, `input 应有完好的 placeholder 属性，实际：${html.slice(0, 400)}`);
    assert.equal(m[1], 'Answer', '英文 placeholder 应为纯文本 Answer');
    assert.ok(!m[1].includes('<'), 'placeholder 值里不应出现 dmBi 的 span 标记');
    assert.ok(html.includes('placeholder="Answer" style="flex:1;'), 'placeholder 后应紧跟 style 属性（属性未被提前终结）');
    assert.ok(!html.includes('答案" style='), '不应出现 raw 文本 `答案" style=`（旧 bug 的残留形态）');
  });

  test('Bug 1：中文模式 placeholder 为纯文本 答案', () => {
    const html = renderRow({ lang: 'zh', answers: {} });
    const m = /placeholder="([^"]*)"/.exec(html);
    assert.ok(m, '中文模式 input 也应有完好的 placeholder');
    assert.equal(m[1], '答案');
  });

  test('Bug 1：答错反馈渲染用 correctAnswer，不出现 undefined', () => {
    const html = renderRow({ lang: 'en', answers: { 4: { answer: 26, correct: false, correctAnswer: 27 } } });
    assert.ok(html.includes('the answer is 27'), `答错反馈应显示正确答案 27，实际：${html.slice(-300)}`);
    assert.ok(!html.includes('undefined'), '反馈里不应出现 undefined');
  });

  test('Bug 2：答错后 GET /api/daily-math 应回显 correctAnswer（刷新后仍可见）', async () => {
    const c1 = await childCookie(1, '0000');
    const { date } = await todayMath(1, c1);
    const answers = todayAnswers(1, '三年级', date);
    const r = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: 1, answer: answers[1] + 1 } });
    assert.equal(r.j.correct, false);
    assert.equal(r.j.correctAnswer, answers[1], '提交当下应返回正确答案');
    const g = await call('/api/daily-math?child_id=1', { cookie: c1 });
    assert.equal(g.j.answers['1'].correct, false);
    assert.equal(g.j.answers['1'].correctAnswer, answers[1], 'GET 已存答案须附答错题的 correctAnswer');
    for (const p of g.j.problems) assert.equal(p.a, undefined, 'GET 题面仍不应下发答案');
  });

  test('Bug 2：答对的题 GET 不附 correctAnswer（与 POST 口径一致）', async () => {
    const c1 = await childCookie(1, '0000');
    const { date } = await todayMath(1, c1);
    const answers = todayAnswers(1, '三年级', date);
    await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: 0, answer: answers[0] } });
    const g = await call('/api/daily-math?child_id=1', { cookie: c1 });
    assert.equal(g.j.answers['0'].correct, true);
    assert.equal(g.j.answers['0'].correctAnswer, undefined, '答对的题不应附 correctAnswer');
  });
});

describe('新题型：括号填数＋应用题（2026-11-09，任务表 78）', () => {
  // 看图列算式、比大小（填＞＜＝）本次不加：前者要配图、后者不走数字输入框。
  test('每天构成恰为 3 口算＋1 括号＋1 应用题；位置由种子定', () => {
    const bracketIdx = new Set(), wordIdx = new Set();
    for (let d = 1; d <= 40; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      for (const [id, label] of [[1, '三年级'], [2, '一年级']]) {
        const ps = M.dailyMathTodayFor({ id, grade_label: label }, date).problems;
        assert.equal(ps.length, 5);
        const kinds = ps.map((p) => p.kind).sort();
        assert.deepEqual(kinds, ['bracket', 'calc', 'calc', 'calc', 'word'], `${label} ${date} 构成应为 3 口算＋1 括号＋1 应用题`);
        bracketIdx.add(ps.findIndex((p) => p.kind === 'bracket'));
        wordIdx.add(ps.findIndex((p) => p.kind === 'word'));
      }
    }
    assert.ok(bracketIdx.size > 1, '括号题位置应随种子变化，不应总在同一位');
    assert.ok(wordIdx.size > 1, '应用题位置应随种子变化，不应总在同一位');
  });

  test('同孩同日恒定：构成与题目（含题型）两次调用相同', () => {
    const a = M.dailyMathTodayFor({ id: 1, grade_label: '三年级' }, '2026-11-09');
    const b = M.dailyMathTodayFor({ id: 1, grade_label: '三年级' }, '2026-11-09');
    assert.deepEqual(a.problems, b.problems);
    const c = M.dailyMathTodayFor({ id: 2, grade_label: '一年级' }, '2026-11-09');
    assert.deepEqual(c.problems.map((p) => p.kind).sort(), ['bracket', 'calc', 'calc', 'calc', 'word']);
  });

  test('括号填数与应用题答案重算正确（40 天抽样）', () => {
    for (let d = 1; d <= 40; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      for (const [id, label, g] of [[1, '三年级', 3], [2, '一年级', 1]]) {
        for (const p of M.dailyMathTodayFor({ id, grade_label: label }, date).problems) {
          if (p.kind === 'bracket') checkBracket(p, g);
          if (p.kind === 'word') checkWord(p, g);
        }
      }
    }
  });

  test('应用题模板池：每年级 5 条，id 不重复，答案与 solve 一致', () => {
    assert.equal(M.DAILY_MATH_WORD_G1.length, 5, '一年级应用题模板 5 条');
    assert.equal(M.DAILY_MATH_WORD_G3.length, 5, '三年级应用题模板 5 条');
    const ids = new Set();
    for (const t of [...M.DAILY_MATH_WORD_G1, ...M.DAILY_MATH_WORD_G3]) {
      assert.ok(!ids.has(t.id), `模板 id 重复：${t.id}`);
      ids.add(t.id);
      const r = t.gen((n) => Math.floor(Math.random() * n));
      assert.ok(r.zh && r.en && Number.isInteger(r.a), `模板 ${t.id} 生成异常`);
      assert.equal(r.a, t.solve(r.nums), `模板 ${t.id} 答案与 solve 不一致`);
      for (const n of r.nums) {
        assert.ok(r.zh.includes(String(n)), `模板 ${t.id} 中文题干应含数字 ${n}`);
        assert.ok(r.en.includes(String(n)), `模板 ${t.id} 英文题干数字应与中文一致`);
      }
    }
  });

  test('GET 返回新题型的 kind 与 qEn（应用题附英文，口算/括号不附）', async () => {
    const c1 = await childCookie(1, '0000');
    const r = await call('/api/daily-math?child_id=1', { cookie: c1 });
    assert.equal(r.j.ok, true);
    const kinds = r.j.problems.map((p) => p.kind).sort();
    assert.deepEqual(kinds, ['bracket', 'calc', 'calc', 'calc', 'word']);
    for (const p of r.j.problems) {
      if (p.kind === 'word') assert.ok(p.qEn, '应用题 GET 应附 qEn');
      else assert.equal(p.qEn, undefined, '口算/括号 GET 不应附 qEn');
    }
  });

  test('答题流程对新题型同样有效：括号答对、应用题答错返正确答案', async () => {
    const c1 = await childCookie(1, '0000');
    const { date } = await todayMath(1, c1);
    const answers = todayAnswers(1, '三年级', date);
    const probs = M.dailyMathTodayFor({ id: 1, grade_label: '三年级' }, date).problems;
    const bi = probs.findIndex((p) => p.kind === 'bracket');
    const wi = probs.findIndex((p) => p.kind === 'word');
    assert.ok(bi >= 0 && wi >= 0, '当日应有括号题与应用题');
    let r = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: bi, answer: answers[bi] } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.correct, true, '括号题答对应当判对');
    r = await call('/api/daily-math/answer', { method: 'POST', cookie: c1, body: { childId: 1, index: wi, answer: answers[wi] + 1 } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.correct, false, '应用题答错应当判错');
    assert.equal(r.j.correctAnswer, answers[wi], '应用题答错应返回正确答案');
    const g = await call('/api/daily-math?child_id=1', { cookie: c1 });
    assert.equal(g.j.answers[String(wi)].correctAnswer, answers[wi], 'GET 回显：答错的应用题 correctAnswer 仍在');
  });
});

describe('新题型渲染（2026-11-09，任务表 78；吸取 77② 补修教训：属性值只放纯文本）', () => {
  // 复用回归块的 renderRow 沙箱手法（dailyBi＋dmRowHtml 从 app.js.orig 抽出；任务 82：dmBi 已并入 dailyBi）
  function renderRow({ lang, answers, problems, index }) {
    const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
    // 任务 82：dmBi 已并入通用 dailyBi，dmUpdateRow 已并入 DM.updateRow；分别抽 dailyBi 与 dmRowHtml 再拼合
    const biStart = appSrc.indexOf('function dailyBi(');
    const biEnd = appSrc.indexOf('\n}\n', biStart) + 3;
    const rowStart = appSrc.indexOf('function dmRowHtml(');
    const rowEnd = appSrc.indexOf('async function dmAnswer(', rowStart);
    assert.ok(biStart >= 0 && biEnd > biStart && rowStart >= 0 && rowEnd > rowStart, '应能在 app.js.orig 找到 dailyBi/dmRowHtml');
    const src = appSrc.slice(biStart, biEnd) + '\n' + appSrc.slice(rowStart, rowEnd);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const factory = new Function('window', 'state', 'lcNetOff', 'esc', `${src}; return { dmBi: dailyBi, dmRowHtml };`);
    const F = factory(
      { _dm: { problems, answers, done: false, correctCount: 0 } },
      { lang },
      () => false,
      esc,
    );
    return F.dmRowHtml(index);
  }
  const WORD = { kind: 'word', q: '小红有 12 颗糖，吃了 5 颗，还剩几颗？', qEn: 'Xiaohong has 12 candies. She eats 5. How many are left?', op: '−' };
  const BRACKET = { kind: 'bracket', q: '() + 3 = 6', op: '+' };
  const CALC = { kind: 'calc', q: '3 × 5 = ?', op: '×' };
  const PROBLEMS = [CALC, BRACKET, WORD, CALC, CALC];

  test('应用题英文模式：中英双显、placeholder 纯文本、无 HTML 破损', () => {
    const html = renderRow({ lang: 'en', answers: {}, problems: PROBLEMS, index: 2 });
    assert.ok(html.includes('Xiaohong has 12 candies'), '英文模式应用题应显示英文题干');
    assert.ok(html.includes('小红有 12 颗糖'), '英文模式应用题应附中文副句');
    assert.ok(html.includes('placeholder="Answer"'), '应用题 placeholder 应为纯文本 Answer');
    assert.ok(!html.includes('undefined'), '应用题渲染不应出现 undefined');
    assert.ok(html.includes('dm-input-2'), '应用题输入框 id 应正常');
  });

  test('括号填数英文模式：显示 () 与 Fill in the blank、placeholder 纯文本', () => {
    const html = renderRow({ lang: 'en', answers: {}, problems: PROBLEMS, index: 1 });
    assert.ok(html.includes('() + 3 = 6'), '括号题应显示 () 空白');
    assert.ok(html.includes('Fill in the blank'), '括号题应有英文提示 Fill in the blank');
    assert.ok(html.includes('placeholder="Answer"'), '括号题 placeholder 应为纯文本 Answer');
    assert.ok(!html.includes('undefined'), '括号题渲染不应出现 undefined');
  });

  test('应用题中文模式：只显示中文题干；括号提示为中文', () => {
    const html = renderRow({ lang: 'zh', answers: {}, problems: PROBLEMS, index: 2 });
    assert.ok(html.includes('小红有 12 颗糖'), '中文模式应用题应显示中文题干');
    assert.ok(!html.includes('Xiaohong has'), '中文模式不应显示英文题干');
    assert.ok(html.includes('placeholder="答案"'), '中文模式 placeholder 应为 答案');
    const htmlB = renderRow({ lang: 'zh', answers: {}, problems: PROBLEMS, index: 1 });
    assert.ok(htmlB.includes('填一填'), '中文模式括号提示应为 填一填');
    assert.ok(!htmlB.includes('Fill in the blank'), '中文模式不应显示英文提示');
  });

  test('应用题答错反馈渲染正确答案（刷新后回显口径）', () => {
    const html = renderRow({ lang: 'en', answers: { 2: { answer: 8, correct: false, correctAnswer: 7 } }, problems: PROBLEMS, index: 2 });
    assert.ok(html.includes('the answer is 7'), '应用题答错反馈应显示正确答案');
    assert.ok(!html.includes('undefined'), '反馈里不应出现 undefined');
  });
});
