/* 双语注释开关单测：node --test tests/bilingual-annotation.test.mjs
 * 规则（用户 2026-10-31 定）：英文模式下，三年级已学单元（含当前单元）藏中文注释，
 * 未学单元显示；一年级、无映射集、进度门 null 时一律显示（fail-closed）。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import(new URL('../src/index.js', import.meta.url));
const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');

// 三年级默认进度：上册 Unit 2，englishOrder = 3*10000 + 0 + 2 = 30002
const PROGRESS_U2 = M.englishOrder('三年级上册 Unit 2 Different families');
assert.equal(PROGRESS_U2, 30002);

describe('oakEnglishOrder', () => {
  test('上册 u1-u6 与下册 b-u1-b-u6 映射到对应单元', () => {
    assert.equal(M.oakEnglishOrder('ep-pep3-u1'), M.englishOrder('三年级上册 Unit 1 Making friends'));
    assert.equal(M.oakEnglishOrder('ep-pep3-u2'), PROGRESS_U2);
    assert.equal(M.oakEnglishOrder('ep-pep3-u6'), M.englishOrder('三年级上册 Unit 6 Useful numbers'));
    assert.equal(M.oakEnglishOrder('ep-pep3b-u1'), M.englishOrder('三年级下册 Unit 1 Meeting new people'));
    assert.equal(M.oakEnglishOrder('ep-pep3b-u6'), M.englishOrder('三年级下册 Unit 6 Numbers in life'));
  });
  test('ep-pep3a-u3 与 u3 同单元', () => {
    assert.equal(M.oakEnglishOrder('ep-pep3a-u3'), M.englishOrder('三年级上册 Unit 3 Our animal friends'));
  });
  test('无映射集与一年级集返回 null（fail-closed）', () => {
    assert.equal(M.oakEnglishOrder('ep-card-03'), null);
    assert.equal(M.oakEnglishOrder('ep-video-firstnight'), null);
    assert.equal(M.oakEnglishOrder('ep-pep1-u1'), null);
    assert.equal(M.oakEnglishOrder(undefined), null);
  });
});

describe('showEnglishZh', () => {
  test('英文模式 + 三年级 + 已学单元（含当前单元）藏注释', () => {
    assert.equal(M.showEnglishZh(3, true, PROGRESS_U2, M.englishOrder('三年级上册 Unit 1 Making friends')), false);
    assert.equal(M.showEnglishZh(3, true, PROGRESS_U2, PROGRESS_U2), false);
  });
  test('英文模式 + 三年级 + 未学单元显示注释', () => {
    assert.equal(M.showEnglishZh(3, true, PROGRESS_U2, M.englishOrder('三年级上册 Unit 3 Our animal friends')), true);
    assert.equal(M.showEnglishZh(3, true, PROGRESS_U2, M.englishOrder('三年级下册 Unit 1 Meeting new people')), true);
  });
  test('开关关闭、一年级、顺序值 null 时一律显示', () => {
    assert.equal(M.showEnglishZh(3, false, PROGRESS_U2, PROGRESS_U2), true);
    assert.equal(M.showEnglishZh(1, true, PROGRESS_U2, PROGRESS_U2), true);
    assert.equal(M.showEnglishZh(3, true, null, PROGRESS_U2), true);
    assert.equal(M.showEnglishZh(3, true, PROGRESS_U2, null), true);
  });
});

describe('前端显隐接线（源码断言）', () => {
  test('Oak 译句行按 showZh 条件渲染，缺字段默认显示', () => {
    assert.match(appSrc, /s\.showZh !== false \? `<div class="oak-zh">/);
  });
  test('问答解析行按 showExplain 条件渲染，答题反馈行保留', () => {
    // 2026-10-31 切片 4a：解析标签改为 LANG.quizSlice4Explanation（字典仍含“解析：”），条件与反馈行不变
    assert.match(appSrc, /j\.showExplain !== false \? `<br><br>\$\{ic\('lightbulb'\)\} \$\{LANG\.quizSlice4Explanation\}/);
    assert.match(appSrc, /quizSlice4Explanation: tr\('解析：', 'Explanation:'\)/);
    assert.match(appSrc, /<div class="qexp"><b>\$\{extra\}<\/b>/);
  });
  // 2026-11-14 用户令标题简化为「中文|English」（旧「英文模式 / English mode」18px 下 211px、栏宽 183px，换两行）。
  test('家长设置有英文模式开关与 toggleEnglishMode（1a 起改为全站双写标题）', () => {
    assert.match(appSrc, /中文\|English/);
    assert.match(appSrc, /window\.toggleEnglishMode = async function/);
    assert.match(appSrc, /englishMode: on/);
  });
  test('错题复习渲染不动（本批不改复习面，见 DEPLOY 备注）', () => {
    // 任务 96：下一题按钮改由 QuizEngine.showResult 渲染（nextCall 串 'nextReview'），
    // 运行时输出仍是 onclick="nextReview()"，源码里不再出现该字面量
    assert.match(appSrc, /'nextReview', R\.idx \+ 1 </);
    assert.match(appSrc, /onclick="\$\{nextCall\}\(\)"/);
  });
});
