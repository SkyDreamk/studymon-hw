import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOcrDraft } from '../src/index.js';

test('1. 合法 JSON 解析成功并保留完整草稿字段', () => {
  const input = JSON.stringify({
    question: '下列哪个字是左右结构？',
    options: ['明', '早', '国', '问'],
    answer_idx: 0,
    explain: '“明”由日和月组成，是左右结构。',
  });
  const res = parseOcrDraft(input);
  assert.deepEqual(res, {
    ok: true,
    draft: {
      question: '下列哪个字是左右结构？',
      options: ['明', '早', '国', '问'],
      answer_idx: 0,
      explain: '“明”由日和月组成，是左右结构。',
    },
  });
});

test('2. 包裹在 ```json 代码块中的合法 JSON 可正常解析', () => {
  const input = '```json\n{"question":"3 + 5 = ?","options":["6","7","8","9"],"answer_idx":2,"explain":"3加5等于8"}\n```';
  const res = parseOcrDraft(input);
  assert.equal(res.ok, true);
  assert.equal(res.draft.question, '3 + 5 = ?');
  assert.equal(res.draft.answer_idx, 2);
});

test('3. answer_idx 为 null 时解析成功且保留 null', () => {
  const input = JSON.stringify({
    question: 'Choose the correct word.',
    options: ['apple', 'banana', 'orange', 'grape'],
    answer_idx: null,
    explain: '',
  });
  const res = parseOcrDraft(input);
  assert.equal(res.ok, true);
  assert.strictEqual(res.draft.answer_idx, null);
});

test('4. options 仅有 3 项时拒绝', () => {
  const input = JSON.stringify({
    question: '题干',
    options: ['A', 'B', 'C'],
    answer_idx: 1,
    explain: '',
  });
  const res = parseOcrDraft(input);
  assert.deepEqual(res, { ok: false, error: '识别结果不是一道完整的选择题' });
});

test('5. question 为空字符串或纯空格时拒绝', () => {
  const input = JSON.stringify({
    question: '   ',
    options: ['A', 'B', 'C', 'D'],
    answer_idx: 0,
    explain: '',
  });
  const res = parseOcrDraft(input);
  assert.deepEqual(res, { ok: false, error: '识别结果不是一道完整的选择题' });
});

test('6. question 超过 300 字符时自动截断至 300 字符而非报错', () => {
  const longQ = '题'.repeat(350);
  const res = parseOcrDraft(JSON.stringify({
    question: longQ,
    options: ['A', 'B', 'C', 'D'],
    answer_idx: 3,
    explain: '',
  }));
  assert.equal(res.ok, true);
  assert.equal(res.draft.question.length, 300);
});

test('7. options 单项超过 100 字符时自动截断至 100 字符而非报错', () => {
  const longOpt = '选'.repeat(140);
  const res = parseOcrDraft(JSON.stringify({
    question: '题干',
    options: [longOpt, 'B', 'C', 'D'],
    answer_idx: 0,
    explain: '',
  }));
  assert.equal(res.ok, true);
  assert.equal(res.draft.options[0].length, 100);
});

test('8. 纯非 JSON 文本拒绝', () => {
  const res = parseOcrDraft('抱歉，图片太模糊无法识别题目内容。');
  assert.deepEqual(res, { ok: false, error: '识别结果不是一道完整的选择题' });
});

test('9. 模型返回无完整选择题的空模板时拒绝', () => {
  const res = parseOcrDraft('{"question": "", "options": [], "answer_idx": null, "explain": ""}');
  assert.deepEqual(res, { ok: false, error: '识别结果不是一道完整的选择题' });
});

test('10. 模型直接返回结构化对象时直接校验通过', () => {
  const res = parseOcrDraft({
    question: '3 + 5 = ?',
    options: ['6', '7', '8', '9'],
    answer_idx: 2,
    explain: '',
  });
  assert.equal(res.ok, true);
  assert.equal(res.draft.question, '3 + 5 = ?');
  assert.equal(res.draft.answer_idx, 2);
});

test('11. JSON 后带尾随句号时仍可解析', () => {
  const res = parseOcrDraft('{"question":"3 + 5 = ?","options":["6","7","8","9"],"answer_idx":2,"explain":""}.');
  assert.equal(res.ok, true);
  assert.equal(res.draft.question, '3 + 5 = ?');
});

test('12. JSON 前后有多余文字时提取花括号内容解析', () => {
  const res = parseOcrDraft('识别结果如下：{"question":"题干","options":["A","B","C","D"],"answer_idx":1,"explain":""}，请核对。');
  assert.equal(res.ok, true);
  assert.equal(res.draft.answer_idx, 1);
});

test('13. 对象输入缺少字段时拒绝', () => {
  const res = parseOcrDraft({ question: '题干', options: ['A', 'B'] });
  assert.deepEqual(res, { ok: false, error: '识别结果不是一道完整的选择题' });
});
