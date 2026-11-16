/* 每日问答单测：node --test tests/quiz.test.mjs */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import(new URL('../src/index.js', import.meta.url));

// 可种子随机数，保证选题目可复现
const seeded = (s) => () => (s = (s * 1103515245 + 13579) % 2147483648) / 2147483648;

describe('xpForLevel 不动（既有曲线）', () => {
  test('阈值', () => {
    assert.equal(M.xpForLevel(1), 0);
    assert.equal(M.xpForLevel(2), 40);
    assert.equal(M.xpForLevel(5), 400);
    assert.equal(M.xpForLevel(10), 1800);
    assert.equal(M.xpForLevel(15), 4200);
  });
  test('levelFromXp', () => {
    assert.equal(M.levelFromXp(0), 1);
    assert.equal(M.levelFromXp(399), 4);
    assert.equal(M.levelFromXp(400), 5);
  });
});

describe('题槽展开与每日题数', () => {
  test('expandQuizSubjects', () => {
    assert.deepEqual(M.expandQuizSubjects(['语文', '数学']), ['语文', '数学']);
    assert.deepEqual(M.expandQuizSubjects(['其他', '语文']), ['语文', '其他']);
    assert.deepEqual(M.expandQuizSubjects(['全部完成']), ['语文', '数学', '英语', '阅读', '其他']);
    assert.deepEqual(M.expandQuizSubjects(['火星语', '语文']), ['语文']);
    assert.deepEqual(M.expandQuizSubjects([]), []);
    assert.deepEqual(M.expandQuizSubjects(['语文', '语文']), ['语文']);
  });
  test('quizDailyTotal', () => {
    assert.equal(M.quizDailyTotal([]), 0);
    assert.equal(M.quizDailyTotal(['阅读']), 1);       // 1 科，不再含谜语
    assert.equal(M.quizDailyTotal(['语文', '数学']), 2);
    assert.equal(M.quizDailyTotal(['全部完成']), 5);   // 5 科，上限 5，不再含谜语
  });
});

describe('gradeNumFromLabel', () => {
  test('识别', () => {
    assert.equal(M.gradeNumFromLabel('三年级'), 3);
    assert.equal(M.gradeNumFromLabel('一年级'), 1);
    assert.equal(M.gradeNumFromLabel('Grade 3'), 3);
    assert.equal(M.gradeNumFromLabel('初一'), 1);
    assert.equal(M.gradeNumFromLabel('大班'), null);
    assert.equal(M.gradeNumFromLabel(''), null);
  });
});

describe('碎片计算', () => {
  test('fragmentsForCorrectTotal', () => {
    assert.equal(M.fragmentsForCorrectTotal(0), 0);
    assert.equal(M.fragmentsForCorrectTotal(4), 0);
    assert.equal(M.fragmentsForCorrectTotal(5), 1);
    assert.equal(M.fragmentsForCorrectTotal(10), 2);
  });
  test('fragmentAwardOnCorrect 进位', () => {
    assert.equal(M.fragmentAwardOnCorrect(0), 0); // 0→1
    assert.equal(M.fragmentAwardOnCorrect(4), 1); // 4→5 进位
    assert.equal(M.fragmentAwardOnCorrect(5), 0); // 5→6
    assert.equal(M.fragmentAwardOnCorrect(9), 1); // 9→10 进位
    assert.equal(M.fragmentAwardOnCorrect(14), 1); // 14→15 进位
  });
});

describe('selectDailyQuestions（当日选题）', () => {
  const rows = [
    { id: 1, kind: 'study', grade: 1, subject: '语文', active: 1 },
    { id: 2, kind: 'study', grade: 1, subject: '语文', active: 1 },
    { id: 3, kind: 'study', grade: 1, subject: '数学', active: 1 },
    { id: 4, kind: 'study', grade: 1, subject: '英语', active: 1 },
    { id: 5, kind: 'study', grade: 1, subject: '阅读', active: 1 },
    { id: 6, kind: 'study', grade: 3, subject: '语文', active: 1 },
    { id: 7, kind: 'study', grade: 3, subject: '数学', active: 1 },
    { id: 8, kind: 'riddle', grade: null, subject: null, active: 1 },
    { id: 9, kind: 'riddle', grade: null, subject: null, active: 1 },
    { id: 10, kind: 'custom', grade: null, subject: '数学', active: 1 }, // 通用自定义
    { id: 11, kind: 'custom', grade: 3, subject: '语文', active: 1 },    // 三年级自定义
    { id: 12, kind: 'study', grade: 1, subject: '语文', active: 0 },     // 禁用
  ];
  test('按科对口，不含脑筋急转弯，不重复', () => {
    const got = M.selectDailyQuestions(rows, { gradeNum: 1, subjects: ['语文', '数学'], excludeIds: [], rng: seeded(42) });
    assert.equal(got.length, 2);
    const ids = got.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length); // 无重复
    assert.equal(got[0].subject, '语文');
    assert.equal(got[0].grade, 1);
    assert.ok(['数学'].includes(got[1].subject) && got[1].kind !== 'riddle');
    assert.ok(got.every((q) => q.kind !== 'riddle')); // 2026-11-09 起每日选题永不出谜语
    assert.ok(!ids.includes(12)); // 禁用题不入选
  });
  test('自定义通用题可入选对应科目', () => {
    const got = M.selectDailyQuestions(rows, { gradeNum: 1, subjects: ['数学'], excludeIds: [3], rng: seeded(7) });
    assert.equal(got.length, 1);
    assert.equal(got[0].id, 10); // 数学 built-in 被排除后，选中通用自定义数学题
    assert.ok(got.every((q) => q.kind !== 'riddle'));
  });
  test('三年级不混入一年级题', () => {
    const got = M.selectDailyQuestions(rows, { gradeNum: 3, subjects: ['语文'], excludeIds: [], rng: seeded(3) });
    assert.ok(got[0].grade === 3 || got[0].grade == null);
    assert.equal(got.length, 1);
    assert.ok(got.every((q) => q.kind !== 'riddle'));
  });
  test('「其他」通用槽从任意科目选', () => {
    const got = M.selectDailyQuestions(rows, { gradeNum: 1, subjects: ['其他'], excludeIds: [], rng: seeded(9) });
    assert.equal(got.length, 1);
    assert.ok(got[0].kind !== 'riddle');
  });
  test('全部完成 → 5 题，永不出脑筋急转弯', () => {
    const many = rows.flatMap((r, i) => Array.from({ length: 3 }, (_, k) => ({ ...r, id: 100 + i * 3 + k })));
    const got = M.selectDailyQuestions(many, { gradeNum: 1, subjects: ['全部完成'], excludeIds: [], rng: seeded(5) });
    assert.equal(got.length, 5);
    assert.equal(new Set(got.map((q) => q.id)).size, 5);
    assert.equal(got.filter((q) => q.kind === 'riddle').length, 0);
  });
  test('excludeIds（24 小时答过）不入选', () => {
    const got = M.selectDailyQuestions(rows, { gradeNum: 1, subjects: ['语文'], excludeIds: [1, 2], rng: seeded(11) });
    // 一年级语文全被排除（禁用题 12 不可用），科目槽落空；2026-11-09 起不再用谜语兜底，无题
    assert.equal(got.length, 0);
  });
});

describe('招式技能等级', () => {
  test('effectiveMoves 合并已解锁并排序，技能等级默认 1 级', () => {
    const ms = M.effectiveMoves('pikachu', 2, ['打雷']);
    const names = ms.map((m) => m.name);
    assert.deepEqual(names, ['电光一闪', '打雷']);
    assert.equal(ms.find((m) => m.name === '打雷').early, true);
    assert.equal(ms.find((m) => m.name === '打雷').skillLevel, 1);
  });
  test('effectiveMoves 按 move_levels 读技能等级', () => {
    const ms = M.effectiveMoves('pikachu', 8, [], { '十万伏特': 2 });
    assert.equal(ms.find((m) => m.name === '十万伏特').skillLevel, 2);
    assert.equal(ms.find((m) => m.name === '电光一闪').skillLevel, 1);
  });
  test('newMovesBetween 过滤已解锁招式', () => {
    assert.ok(!M.newMovesBetween('pikachu', 7, 8, ['十万伏特']).some((m) => m[1] === '十万伏特'));
    assert.ok(M.newMovesBetween('pikachu', 7, 8, []).some((m) => m[1] === '十万伏特'));
  });
});

describe('questionLabel', () => {
  test('标签', () => {
    assert.equal(M.questionLabel({ kind: 'riddle' }), '脑筋急转弯');
    assert.equal(M.questionLabel({ kind: 'study', subject: '数学' }), '数学题');
    assert.equal(M.questionLabel({ kind: 'custom', subject: '英语' }), '英语题');
  });
});
