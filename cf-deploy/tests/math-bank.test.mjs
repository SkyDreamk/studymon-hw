/* 每日数学题库挂载单测：node --test tests/math-bank.test.mjs
 * 覆盖任务单 §6 七项：同孩同日恒定、进度过滤、年级隔离、构成 2 口算＋1 括号＋1 应用题＋1 题库题、
 * 答案有限数字且与数据一致（verify 抽查）、池空回退 3＋1＋1、映射表一致性（bsChapter 逐字匹配 MATH_CHAPTERS）。
 * 另含接口层：GET 与提交按同一 (child,date,progress) 重算，题库题可答、不下发答案。
 * 读真实源码与数据文件；不碰 D1、不部署。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readBackendSource } from './backend-src.mjs';

const M = await import(new URL('../src/index.js', import.meta.url));
const { MATH_BANK_TOPICS, MATH_BANK_QUESTIONS } = await import(new URL('../src/data/math-bank.js', import.meta.url));

// 独立于被测代码的章节顺序值：年级*10000 + (下册?1000:0) + 单元（综合与实践=90）
const GRADE = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
function ord(ch) {
  const u = ch.includes('综合与实践') ? 90 : Number(ch.match(/第(\d+)单元/)[1]);
  return GRADE[ch[0]] * 10000 + (ch.includes('下册') ? 1000 : 0) + u;
}
const topicById = new Map(MATH_BANK_TOPICS.map((t) => [t.id, t]));
const qById = new Map(MATH_BANK_QUESTIONS.map((q) => [q.id, q]));

const G1 = (id = 2) => ({ id, grade_label: '一年级' });
const G3 = (id = 1) => ({ id, grade_label: '三年级' });
const DEF1 = 10002, DEF3 = 30002;           // 默认进度：上册第 2 单元
const MAX = 99999;                           // 进度拉满（不过滤）
const dates = (n) => Array.from({ length: n }, (_, i) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`);
const bankOf = (r) => r.problems.filter((p) => p.kind === 'bank');

describe('1. 同孩同日恒定', () => {
  test('同一 (child,date,progress) 两次调用逐题相同；换日换题', () => {
    for (const [c, p] of [[G1(), DEF1], [G3(), DEF3], [G3(), 30008]]) {
      const a = M.dailyMathTodayFor(c, '2026-11-19', p);
      const b = M.dailyMathTodayFor(c, '2026-11-19', p);
      assert.deepEqual(a, b);
    }
    const ids = new Set(dates(60).map((d) => bankOf(M.dailyMathTodayFor(G3(), d, 30008))[0].bankId));
    assert.ok(ids.size >= 15, `60 天应轮出多种题，实际 ${ids.size}`);
  });
  test('缺省进度 ＝ 该年级默认进度（上册第 2 单元），不超前', () => {
    for (const d of dates(40)) {
      assert.deepEqual(M.dailyMathTodayFor(G3(), d), M.dailyMathTodayFor(G3(), d, DEF3));
      assert.deepEqual(M.dailyMathTodayFor(G1(), d), M.dailyMathTodayFor(G1(), d, DEF1));
    }
  });
});

describe('2. 进度过滤（绝不超前）', () => {
  for (const [name, c, prog] of [['三上第2单元', G3(), DEF3], ['三上第5单元', G3(), 30005], ['三下第1单元', G3(), 31001], ['一上第2单元', G1(), DEF1], ['一下第3单元', G1(), 11003]]) {
    test(`进度=${name}：题库题映射章节顺序值 ≤ 进度`, () => {
      const seen = new Set();
      for (let k = 1; k <= 8; k++) for (const d of dates(120)) {
        const b = bankOf(M.dailyMathTodayFor({ ...c, id: k }, d, prog));
        for (const p of b) { seen.add(p.bankId); assert.ok(ord(topicById.get(qById.get(p.bankId).topicId).bsChapter) <= prog, `${p.bankId} 超前`); }
      }
      assert.ok(seen.size > 0);
    });
  }
  test('三上第2单元：下册 / 四年级 / 综合与实践主题绝不出现', () => {
    const forbidden = new Set(MATH_BANK_QUESTIONS.filter((q) => ord(topicById.get(q.topicId).bsChapter) > DEF3).map((q) => q.topicId));
    assert.ok(forbidden.has('cnm_p099') && forbidden.has('cnm_p078') && forbidden.has('cnm_p056') && forbidden.has('cnm_p036') === false);
    for (let k = 1; k <= 10; k++) for (const d of dates(120)) {
      const p = bankOf(M.dailyMathTodayFor(G3(k), d, DEF3))[0];
      assert.ok(!forbidden.has(qById.get(p.bankId).topicId), `${p.bankId} 超前`);
    }
  });
  test('进度调高后池变大：三下第7单元能出三上第5单元的周长题（p078）', () => {
    const hit = (prog) => dates(300).some((d) => { const p = bankOf(M.dailyMathTodayFor(G3(), d, prog))[0]; return qById.get(p.bankId).topicId === 'cnm_p078'; });
    assert.equal(hit(DEF3), false);
    assert.equal(hit(31007), true);
  });
});

describe('3. 年级隔离', () => {
  test('一年级只出一年级题，三年级只出三年级题（进度拉满也不串）', () => {
    for (const d of dates(150)) {
      for (const [c, g] of [[G1(), 1], [G3(), 3]]) {
        for (const p of bankOf(M.dailyMathTodayFor(c, d, MAX))) assert.equal(topicById.get(qById.get(p.bankId).topicId).grade, g);
      }
    }
  });
});

describe('4. 构成 2 口算＋1 括号＋1 应用题＋1 题库题', () => {
  test('恒为 2+1+1+1，index 为 0..4，位置被打乱', () => {
    const bankPos = new Set();
    for (const [c, prog] of [[G1(), DEF1], [G3(), DEF3]]) for (const d of dates(100)) {
      const r = M.dailyMathTodayFor(c, d, prog);
      const cnt = {};
      r.problems.forEach((p, i) => { cnt[p.kind] = (cnt[p.kind] || 0) + 1; assert.equal(p.index, i); });
      assert.deepEqual(cnt, { calc: 2, bracket: 1, word: 1, bank: 1 });
      bankPos.add(r.problems.findIndex((p) => p.kind === 'bank'));
    }
    assert.equal(bankPos.size, 5, '题库题应出现在 5 个位置');
  });
  test('题库题对象形状 {kind:bank, op:"", q:题库原文, a:Number}', () => {
    const p = bankOf(M.dailyMathTodayFor(G3(), '2026-11-19', DEF3))[0];
    assert.equal(p.op, '');
    assert.equal(p.q, qById.get(p.bankId).prompt);
    assert.equal(typeof p.a, 'number');
  });
  test('仍是 5 道、过关线 4 不变', () => {
    assert.equal(M.DAILY_MATH_COUNT, 5);
    assert.equal(M.DAILY_MATH_PASS_COUNT, 4);
  });
});

// 极小的 Python 式算术求值（+ - * / // 括号 Fraction(a,b)/Fraction('x')），用于 verify 抽查
function pyEval(src) {
  const t = src.match(/Fraction|\/\/|[0-9.]+|[-+*\/(),]|'[^']*'/g); let i = 0;
  const peek = () => t[i], next = () => t[i++];
  function atom() {
    const x = next();
    if (x === '(') { const v = expr(); next(); return v; }
    if (x === '-') return -atom();
    if (x === 'Fraction') { next(); const a = arg(); let v = a; if (peek() === ',') { next(); v = a / arg(); } next(); return v; }
    return Number(x);
  }
  function arg() { const x = next(); return Number(x.replace(/'/g, '')); }
  function term() { let v = atom(); while (['*', '/', '//'].includes(peek())) { const o = next(), r = atom(); v = o === '*' ? v * r : o === '/' ? v / r : Math.floor(v / r); } return v; }
  function expr() { let v = term(); while (['+', '-'].includes(peek())) { const o = next(), r = term(); v = o === '+' ? v + r : v - r; } return v; }
  return expr();
}

describe('5. 答案有限数字且与数据一致', () => {
  test('数据文件：288 道、answer 全为有限数字、verify 求值等于答案、无 choice/分数/观察题', () => {
    assert.equal(MATH_BANK_QUESTIONS.length, 288);
    for (const q of MATH_BANK_QUESTIONS) {
      assert.equal(typeof q.answer, 'number'); assert.ok(Number.isFinite(q.answer), q.id);
      assert.ok(topicById.has(q.topicId), q.id);
      assert.ok(Math.abs(pyEval(q.verify) - q.answer) < 1e-9, `${q.id} verify=${q.verify} answer=${q.answer}`);
    }
    for (const id of ['cnm_p079', 'cnm_p080', 'cnm_p226', 'cnm_p227', 'cnm_p278']) assert.equal(MATH_BANK_QUESTIONS.filter((q) => q.topicId === id).length, 0, `${id} 不应有可用题`);
    for (const id of ['cnm_p221_q4', 'cnm_p274_q2', 'cnm_p274_q3']) assert.equal(MATH_BANK_QUESTIONS.filter((q) => q.id === id).length, 0, `${id} 观察题需看图、源数据无图，不应入池`);
  });
  test('与源数据一致（有 /tmp/cn-math-taxonomy 时）：Number(源 answer) 全等', () => {
    let src; try { src = JSON.parse(readFileSync('/tmp/cn-math-taxonomy/data/questions.json', 'utf8')); } catch { return; }
    const by = new Map((Array.isArray(src) ? src : Object.values(src)).map((q) => [q.id, q]));
    for (const q of MATH_BANK_QUESTIONS) { const s = by.get(q.id); assert.equal(s.type, 'numeric'); assert.equal(q.answer, Number(s.answer)); assert.equal(q.prompt, s.prompt); }
  });
  test('每日数学下发的题库题 a ＝ 数据文件 answer、有限数字', () => {
    for (const d of dates(100)) for (const [c, prog] of [[G1(), MAX], [G3(), MAX]]) {
      const p = bankOf(M.dailyMathTodayFor(c, d, prog))[0];
      assert.ok(Number.isFinite(p.a)); assert.equal(p.a, qById.get(p.bankId).answer);
    }
  });
});

describe('6. 池空回退', () => {
  test('进度下无可用题（进度 0）：退回 3 口算＋1 括号＋1 应用题，不报错、无空题', () => {
    for (const c of [G1(), G3()]) for (const d of dates(60)) {
      const r = M.dailyMathTodayFor(c, d, 0);
      assert.equal(r.error, undefined);
      const cnt = {}; for (const p of r.problems) { cnt[p.kind] = (cnt[p.kind] || 0) + 1; assert.ok(p.q && Number.isFinite(p.a)); }
      assert.deepEqual(cnt, { calc: 3, bracket: 1, word: 1 });
    }
  });
  test('进度在题库第一个可用章节之前（一年级进度 10000 恒空）；未知年级仍 NO_POOL', () => {
    assert.equal(bankOf(M.dailyMathTodayFor(G1(), '2026-11-19', 10000)).length, 0);
    assert.equal(M.dailyMathTodayFor({ id: 9, grade_label: '五年级' }, '2026-11-19', MAX).error, 'NO_POOL');
  });
});

describe('7. 映射表一致性', () => {
  test('99 个主题的 bsChapter 逐字在 MATH_CHAPTERS 对应年级列表内（年级列表取自 src/index.js 源文）', () => {
    const srcText = readBackendSource();
    const block = srcText.slice(srcText.indexOf('const MATH_CHAPTERS = {'), srcText.indexOf('const CHINESE_CHAPTERS'));
    const chapters = {};
    for (const m of block.matchAll(/^\s+(\d): \[(.*)\],$/gm)) chapters[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    assert.equal(MATH_BANK_TOPICS.length, 99);
    for (const t of MATH_BANK_TOPICS) {
      // 章节年级可低于主题年级（低年级映射，如二年级下册测量），故在 1~6 年级全表内逐字匹配，且不得高于主题年级之外的越界由进度过滤负责
      const all = Object.values(chapters).flat();
      assert.ok(all.includes(t.bsChapter), `${t.id} bsChapter 不在 MATH_CHAPTERS：${t.bsChapter}`);
      assert.ok([1, 3].includes(t.grade));
    }
  });
  test('与映射表 md 逐条一致（99 行 bsChapter）', () => {
    let md; try { md = readFileSync(new URL('../../work/future-tasks/math-bank/mapping-g1-g3.md', import.meta.url), 'utf8'); } catch { return; }
    const rows = md.split('\n').filter((l) => /^\| cnm_p\d+ /.test(l)).map((l) => l.split('|').slice(1, -1).map((s) => s.trim()));
    assert.equal(rows.length, 99);
    rows.forEach((r, i) => { assert.equal(MATH_BANK_TOPICS[i].id, r[0]); assert.equal(MATH_BANK_TOPICS[i].bsChapter, r[4]); });
  });
});
