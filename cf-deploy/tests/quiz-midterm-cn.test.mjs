// tests/quiz-midterm-cn.test.mjs — 三年级语文期中重点题 20 道（2026-11-09 入库）
// 来源：小红书《三上语文期中98分，3天够了》（淇淇麻麻资料铺，人教版）已展示页；
// chapter 一律「通用复习」（学习进度B语文断档口径），语文门恒放行，门未放宽。
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import(new URL('../src/index.js', import.meta.url));
const bank = JSON.parse(readFileSync(new URL('../quiz-bank.json', import.meta.url), 'utf8'));
const fresh = JSON.parse(readFileSync(new URL('../work/quiz-midterm-cn-20261109.json', import.meta.url), 'utf8'));

const defaultGates = () => ({
  mathGate: M.mathGateFor(3, M.defaultMathChapter(3)),
  chineseGate: M.chineseGateFor(3, M.defaultChineseChapter(3)),
  englishGate: M.englishGateFor(3, M.defaultEnglishChapter(3)),
});
const seeded = (s) => () => (s = (s * 1103515245 + 13579) % 2147483648) / 2147483648;
const toRow = (r, id) => ({
  id, kind: 'study', grade: 3, subject: '语文', question: r.q,
  options_json: JSON.stringify(r.options), answer_idx: r.answer, explain: r.explain,
  active: 1, is_custom: 0, chapter: r.chapter, topic_id: null,
});

describe('期中语文题入库（2026-11-09）', () => {
  test('题库里恰有 20 道三年级语文「通用复习」新题，类别齐全', () => {
    assert.equal(fresh.length, 20);
    const cats = {};
    for (const r of fresh) cats[r.cat] = (cats[r.cat] || 0) + 1;
    for (const c of ['古诗', '谚语名言', '人物品质', '词语分类', '近义词', '搭配', '课文道理', '课文重点', '句子仿写']) {
      assert.ok((cats[c] || 0) >= 1, `类别 ${c} 至少 1 道`);
    }
    assert.deepEqual(cats, { '古诗': 4, '谚语名言': 2, '人物品质': 3, '词语分类': 4, '近义词': 1, '搭配': 2, '课文道理': 2, '课文重点': 1, '句子仿写': 1 });
    const inBank = bank.grade3.filter((q) => q.subject === '语文' && q.chapter === '通用复习');
    assert.equal(inBank.length, 20, 'quiz-bank.json 里三年级语文通用复习题应恰为新入的 20 道');
    for (const r of fresh) {
      assert.ok(inBank.some((q) => q.q === r.q && q.answer === r.answer), `题库应含新题：${r.q}`);
    }
  });

  test('格式：4 选 1、答案下标合法、选项无重复、explain 非空', () => {
    for (const r of fresh) {
      assert.equal(r.subject, '语文');
      assert.equal(r.chapter, '通用复习');
      assert.ok(r.q && r.q.length > 0);
      assert.equal(r.options.length, 4, r.q);
      assert.equal(new Set(r.options).size, 4, `选项重复：${r.q}`);
      assert.ok(Number.isInteger(r.answer) && r.answer >= 0 && r.answer <= 3, r.q);
      assert.ok(r.explain && r.explain.length > 0, r.q);
    }
  });

  test('过门：默认语文门（上册第 2 单元）下 20 道全放行', () => {
    const gate = M.chineseGateFor(3, M.defaultChineseChapter(3));
    assert.ok(gate, '默认语文门应存在');
    for (const r of fresh) {
      assert.equal(M.chineseGatePass({ kind: 'study', subject: '语文', chapter: r.chapter }, gate), true, r.q);
    }
  });

  test('每日选题：只给语文题池时能选中新期中题，且永不出谜语', () => {
    const rows = fresh.map((r, i) => M.normalizeQuizRow(toRow(r, 9000 + i)));
    const picked = M.selectDailyQuestions(rows, {
      gradeNum: 3, subjects: ['语文'], ...defaultGates(),
      history: new Map(), today: '2026-11-09', rng: seeded(7),
    });
    assert.equal(picked.length, 1);
    assert.ok(picked[0].id >= 9000 && picked[0].id < 9020, '选中的应为新期中题');
    assert.equal(picked[0].kind, 'study');
    // 混入谜语也不应被选中（2026-11-09 起每日选题无谜语槽）
    const mixed = [...rows, M.normalizeQuizRow({ id: 9999, kind: 'riddle', grade: null, subject: null, question: '谜', options_json: '["A","B","C","D"]', answer_idx: 0, explain: '', active: 1, is_custom: 0, chapter: null, topic_id: null })];
    const picked2 = M.selectDailyQuestions(mixed, {
      gradeNum: 3, subjects: ['语文'], ...defaultGates(),
      history: new Map(), today: '2026-11-09', rng: seeded(7),
    });
    assert.ok(picked2.every((q) => q.kind !== 'riddle'));
  });
});
