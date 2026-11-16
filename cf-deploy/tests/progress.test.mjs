/* 数学学习进度门单测（北师大表，2026-10-24 重标后）：node --test tests/progress.test.mjs */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const M = await import(new URL('../src/index.js', import.meta.url));
const seeded = (s) => () => (s = (s * 1103515245 + 13579) % 2147483648) / 2147483648;

const C = {
  S3U1: '三年级上册 第1单元 混合运算',
  S3U2: '三年级上册 第2单元 观察物体',
  S3U4: '三年级上册 第4单元 乘与除',
  S3ZH: '三年级上册 综合与实践 数学好玩',
  X3U1: '三年级下册 第1单元 除法',
  X3U2: '三年级下册 第2单元 图形的运动',
  X3ZH: '三年级下册 综合与实践 数学好玩',
  X2U4: '二年级下册 第4单元 测量',
  X4U6: '四年级上册 第6单元 除法',
};

function buildRows(spec) {
  const rows = [];
  let id = 1;
  for (const [chapter, count] of spec) {
    for (let i = 0; i < count; i++) {
      rows.push({ id: id++, kind: 'study', grade: 3, subject: '数学', active: 1, chapter });
    }
  }
  return rows;
}

function mkRows() {
  return buildRows([
    [C.S3U1, 6],
    [C.S3U2, 6],
    [C.S3U4, 6],
    [C.X3U2, 6],
    [C.X2U4, 6],
    [C.X4U6, 6],
    [null, 6],
  ]);
}

function drawFrom(rows, gate, n, seed) {
  const rng = seeded(seed);
  const counts = new Map();
  for (let i = 0; i < n; i++) {
    const picked = M.selectDailyQuestions(rows, {
      gradeNum: 3,
      subjects: ['数学'],
      rng,
      mathGate: gate,
    });
    assert.equal(picked.length, 1, `第 ${i} 次应恰好返回 1 题`);
    const key = picked[0].chapter ?? 'NULL';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function drawChapters(gate, n, seed) {
  return drawFrom(mkRows(), gate, n, seed);
}

describe('chapterOrder', () => {
  test('单元序号解析', () => {
    assert.equal(M.chapterOrder(C.S3U1), 30001);
    assert.equal(M.chapterOrder(C.S3U2), 30002);
    assert.equal(M.chapterOrder(C.X3U2), 31002);
    assert.equal(M.chapterOrder(C.X2U4), 21004);
    assert.equal(M.chapterOrder(C.X4U6), 40006);
    assert.equal(M.chapterOrder(C.S3ZH), 30090);
  });

  test('排序链严格递增', () => {
    const chain = [
      '二年级下册 第4单元 测量',
      '三年级上册 第1单元 混合运算',
      '三年级上册 第2单元 观察物体',
      '三年级上册 第8单元 认识小数',
      '三年级上册 综合与实践 数学好玩',
      '三年级下册 第1单元 除法',
      '三年级下册 综合与实践 数学好玩',
    ];
    for (let i = 1; i < chain.length; i++) {
      const a = M.chapterOrder(chain[i - 1]);
      const b = M.chapterOrder(chain[i]);
      assert.ok(Number.isFinite(a) && Number.isFinite(b), `${chain[i - 1]} / ${chain[i]} 应可解析`);
      assert.ok(a < b, `${chain[i - 1]}(${a}) 应 < ${chain[i]}(${b})`);
    }
  });

  test('解析失败返回 null', () => {
    for (const bad of ['', null, undefined, '火星文', '三年级']) {
      assert.equal(M.chapterOrder(bad), null, `输入 ${String(bad)} 应返回 null`);
    }
  });
});

describe('MATH_CHAPTERS 与默认', () => {
  test('表长度（北师大 1–6 年级）', () => {
    // 2026-10-27 §53 附带修正（与跨行无关）：表已按 2026-10-26 课本核对结果修正，
    // 旧期望 19/18 含 phantom 单元；新表：1 年级去 3 个 phantom（一下购物、一下统计、一上统计）19→16，
    // 2 年级补二上第 9 单元除法 18→19；其余不变。12 道题重标（p033/p034/p036）仍待用户定，不在此处。
    assert.equal(M.MATH_CHAPTERS[1].length, 16);
    assert.equal(M.MATH_CHAPTERS[2].length, 19);
    assert.equal(M.MATH_CHAPTERS[3].length, 17);
    assert.equal(M.MATH_CHAPTERS[4].length, 16);
    assert.equal(M.MATH_CHAPTERS[5].length, 17);
    assert.equal(M.MATH_CHAPTERS[6].length, 13);
  });

  test('每张表 chapterOrder 严格递增；综合与实践（数学好玩）= 册末 90', () => {
    for (const g of [1, 2, 3, 4, 5, 6]) {
      const list = M.MATH_CHAPTERS[g];
      for (let i = 0; i < list.length; i++) {
        const o = M.chapterOrder(list[i]);
        assert.ok(Number.isFinite(o), `${g} 年级第 ${i} 项 ${list[i]} 应可解析`);
        if (list[i].includes('综合与实践')) assert.ok(o % 1000 === 90 || o % 10000 === 90, `${list[i]} 综合与实践应为 90 桶`);
        if (i > 0) {
          const p = M.chapterOrder(list[i - 1]);
          assert.ok(p < o, `${g} 年级：${list[i - 1]}(${p}) 应 < ${list[i]}(${o})`);
        }
      }
    }
    // 锚点：各册数学好玩均为该册 90 桶
    assert.equal(M.chapterOrder('一年级上册 综合与实践 数学好玩'), 10090);
    assert.equal(M.chapterOrder('一年级下册 综合与实践 数学好玩'), 11090);
    assert.equal(M.chapterOrder('三年级上册 综合与实践 数学好玩'), 30090);
    assert.equal(M.chapterOrder('三年级下册 综合与实践 数学好玩'), 31090);
  });

  test('defaultMathChapter（北师大：均为上册第 2 单元）', () => {
    assert.equal(M.defaultMathChapter(1), '一年级上册 第2单元 比较');
    assert.equal(M.defaultMathChapter(2), '二年级上册 第2单元 购物');
    assert.equal(M.defaultMathChapter(3), '三年级上册 第2单元 观察物体');
    assert.equal(M.defaultMathChapter(4), '四年级上册 第2单元 线与角');
    assert.equal(M.defaultMathChapter(5), '五年级上册 第2单元 轴对称和平移');
    assert.equal(M.defaultMathChapter(6), '六年级上册 第2单元 百分数的应用');
  });
});

describe('mathGateFor', () => {
  test('三上U2', () => {
    const g = M.mathGateFor(3, C.S3U2);
    assert.ok(g);
    assert.equal(g.ord, 30002);
    assert.equal(g.currentOrd, 30002);
    assert.equal(g.prevOrd, 30001);
  });

  test('三上U1 无前一章', () => {
    const g = M.mathGateFor(3, C.S3U1);
    assert.ok(g);
    assert.equal(g.prevOrd, null);
  });

  test('无效输入返回 null', () => {
    assert.equal(M.mathGateFor(3, '不存在的章节'), null);
    assert.equal(M.mathGateFor(2, C.S3U1), null);
    assert.equal(M.mathGateFor(7, C.S3U1), null);
  });
});

describe('进度门过滤', () => {
  test('进度=三上U1：只出 U1/二下U4/NULL', () => {
    const gate = M.mathGateFor(3, C.S3U1);
    assert.ok(gate);
    const cnt = drawChapters(gate, 300, 11);
    const allowed = new Set([C.S3U1, C.X2U4, 'NULL']);
    for (const k of cnt.keys()) {
      assert.ok(allowed.has(k), `不应出现章节 ${k}`);
    }
    assert.equal(cnt.get(C.S3U2) || 0, 0);
    assert.equal(cnt.get(C.S3U4) || 0, 0);
    assert.equal(cnt.get(C.X3U2) || 0, 0);
    assert.equal(cnt.get(C.X4U6) || 0, 0);
  });

  test('进度=三上U2：U2 可出，后续章节不出', () => {
    const gate = M.mathGateFor(3, C.S3U2);
    assert.ok(gate);
    const cnt = drawChapters(gate, 300, 22);
    assert.ok((cnt.get(C.S3U2) || 0) > 0, 'U2 应能抽到');
    assert.equal(cnt.get(C.S3U4) || 0, 0);
    assert.equal(cnt.get(C.X3U2) || 0, 0);
    assert.equal(cnt.get(C.X4U6) || 0, 0);
  });

  test('封存题全进度不出；最大进度下其余章节均可出', () => {
    const list = M.MATH_CHAPTERS[3];
    assert.equal(list.length, 17);
    let sealed = 0;
    let lastCnt = null;
    list.forEach((ch, i) => {
      const gate = M.mathGateFor(3, ch);
      assert.ok(gate, `${ch} 应能生成进度门`);
      const cnt = drawChapters(gate, 60, 1000 + i);
      sealed += cnt.get(C.X4U6) || 0;
      if (i === list.length - 1) lastCnt = cnt;
    });
    assert.equal(sealed, 0, '四上除法在任何三上/三下进度下都不应出现');
    for (const k of [C.S3U1, C.S3U2, C.S3U4, C.X3U2, C.X2U4, 'NULL']) {
      assert.ok((lastCnt.get(k) || 0) > 0, `最大进度下 ${k} 应能抽到`);
    }
  });

  test('无门对照：四下U9 可被抽到', () => {
    const cnt = drawChapters(null, 300, 33);
    assert.ok((cnt.get(C.X4U6) || 0) > 0, '无门时四上除法应能抽到');
  });
});

describe('normalizeQuizRow 透传（回归：组题真实路径）', () => {
  test('DB 原始行经 normalize 后 chapter 不丢、进度门仍生效', () => {
    // 模拟 quiz_questions 原始行形状（options_json 为字符串、带 chapter 列）
    const raw = (id, chapter) => ({
      id, kind: 'study', grade: 3, subject: '数学', question: 'q' + id,
      options_json: '["1","2"]', answer_idx: 0, explain: '', active: 1,
      is_custom: 0, chapter, topic_id: null,
    });
    const rows = [];
    for (let i = 0; i < 6; i++) rows.push(raw(100 + i, C.S3U1));
    for (let i = 0; i < 6; i++) rows.push(raw(200 + i, C.X3U2)); // 超前章节，必须被门拦住
    const norm = rows.map(M.normalizeQuizRow);
    assert.equal(norm[0].chapter, C.S3U1, 'normalize 应透传 chapter');
    assert.equal(norm[6].chapter, C.X3U2, 'normalize 应透传 chapter');
    const gate = M.mathGateFor(3, C.S3U1);
    const rng = seeded(777);
    for (let i = 0; i < 200; i++) {
      const picked = M.selectDailyQuestions(norm, { gradeNum: 3, subjects: ['数学'], rng, mathGate: gate });
      assert.equal(picked.length, 1);
      assert.equal(picked[0].chapter, C.S3U1, '进度=U1 时只能抽到 U1 的题');
    }
  });
});

describe('权重', () => {
  test('current/prev 加权', () => {
    const rows = buildRows([
      [C.S3U1, 10],
      [C.X3U1, 10],
      [C.X3U2, 10],
      [C.X2U4, 10],
    ]);
    const gate = M.mathGateFor(3, C.X3U2);
    assert.ok(gate);
    const n = 4000;
    const cnt = drawFrom(rows, gate, n, 4242);
    const cur = cnt.get(C.X3U2) || 0;
    const prev = cnt.get(C.X3U1) || 0;
    const u1 = cnt.get(C.S3U1) || 0;
    const ratio = (cur + prev) / n;
    assert.ok(ratio >= 0.58 && ratio <= 0.75, `current+prev 占比 ${ratio} 应在 0.58–0.75`);
    assert.ok(cur > u1, `current(${cur}) 应 > 三上U1(${u1})`);
    assert.ok(prev > u1, `prev(${prev}) 应 > 三上U1(${u1})`);
  });
});
