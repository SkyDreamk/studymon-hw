/* 家长双列表单标签对齐与调试经验上限静态单测：
 * 运行：node --test tests/debug-labels.test.mjs
 * 覆盖：
 * ① 调试经验上限 17400、碎片短标签与 input 下方提示；
 * ② 孩子主标题完整显示、可换行，经验详情独立小字行；
 * ③ .formgrid 顶部对齐、格子 flex 纵向、label 不再强制单行截断（§70 省略规则已删）；
 * ④ 两个调试 grid、经验设置、时间模拟用 formgrid；孩子密码改 .pset-field 全宽块；
 * ⑤ 经验设置短标签与范围说明、密码未设置提示移出 label、
 *    时间偏移短标签与整数说明；
 * ⑥ 全局 grid2 和 label 规则保持原样。
 * 通过 assetPath 读取 app.js／style.css，不调用远程服务。
 * 真实 Azure 调用 0 次。 */
import { assetPath } from './asset-path.mjs';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = () => readFileSync(assetPath('app.js'), 'utf8');
const css = () => readFileSync(assetPath('style.css'), 'utf8');

function rule(c, sel) {
  const escaped = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = c.match(new RegExp(escaped + '\\{[^}]*\\}'));
  assert.ok(m, `缺 ${sel} 规则`);
  return m[0];
}

function section(a, start, end) {
  const from = a.indexOf(start);
  assert.notEqual(from, -1, `缺起点 ${start}`);
  const to = a.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `缺终点 ${end}`);
  return a.slice(from, to);
}

const settings = (a) => section(
  a, 'async function parentSettingsHtml()', 'async function parentQuestionsHtml()',
);
const debug = (a) => section(
  a, 'function parentDebugHtml(s, dbgChildren)', 'window.debugSaveTime =',
);

describe('调试卡短标签与标题拆行', () => {
  test('累计经验范围与 input 上限同步为 17400', () => {
    const a = app();
    const d = debug(a);
    assert.ok(d.includes('<label>累计经验 (0–17400)</label>'));
    assert.ok(d.includes(
      '<input type="number" id="dbg-xp-${c.id}" value="${c.totalXp}" min="0" max="17400">',
    ));
    assert.ok(!a.includes('累计经验（0–999999）'));
    assert.ok(!a.includes('max="999999"'));
  });

  test('碎片说明在同一格 input 下方，不再占 label', () => {
    const a = app();
    const d = debug(a);
    assert.ok(d.includes('<label>碎片数 (0–999)</label>'));
    assert.match(d,
      /id="dbg-frag-\$\{c\.id\}"[^>]*min="0" max="999">\s*<div style="color:var\(--text-2\);font-size:var\(--fs-parent-body\)">设 F 即视同答对 5F 题<\/div><\/div>/,
    );
    assert.ok(!a.includes('碎片数（0–999；设 F 即视同答对 5F 题）'));
  });

  test('主标题完整显示可换行，经验详情独立小字行且信息齐全', () => {
    const d = debug(app());
    const title = '<div><b>${esc(c.name)}</b> ${esc(c.lineLabel)} ${c.level} 级</div>';
    const detail = '<div style="color:var(--text-2);font-size:var(--fs-parent-body)">累计 ${c.totalXp} 经验 本级 ${c.xpIntoLevel}/${c.xpForLevelSpan} 距下一级 ${c.xpToNext}</div>';
    assert.ok(d.includes(title), '主标题需完整显示、可换行');
    assert.ok(!d.includes('text-overflow:ellipsis'), '调试区不得用省略截断内容型文案');
    assert.ok(d.includes(detail), '经验详情需独立小字行');
    assert.ok(d.includes(title + '\n  ' + detail), '标题与详情应为相邻两行');
  });

  test('其他调试标签与全宽招式说明不变', () => {
    const d = debug(app());
    for (const label of [
      '等级（1–30）',
      '精灵球数（0–99）',
      '超级球数（0–99）',
      '连击天数（0–365）',
      '招式（✓=已学会，随等级自动有；勾选=已解锁）',
    ]) {
      assert.ok(d.includes('<label>' + label + '</label>'), label);
    }
  });
});

describe('formgrid 作用域与输入框对齐', () => {
  test('顶部对齐、格子 flex 纵向、标签不再强制单行截断', () => {
    const c = css();
    assert.match(rule(c, '.formgrid'), /align-items:start/);
    const cell = rule(c, '.formgrid>div');
    assert.match(cell, /display:flex/);
    assert.match(cell, /flex-direction:column/);
    assert.ok(!c.includes('.formgrid label{'), '已删 .formgrid label 省略规则，label 完整显示、可换行');
    assert.doesNotMatch(c, /\.formgrid label\{[^}]*text-overflow:ellipsis/);
  });

  test('调试 grid 与经验 grid 用 formgrid，密码改 pset-field 全宽块', () => {
    const a = app();
    const s = settings(a);
    const d = debug(a);
    for (const label of ['等级（1–30）', '精灵球数（0–99）', '偏移天数']) {
      assert.ok(d.includes(
        '<div class="grid2 formgrid"><div><label>' + label + '</label>',
      ), label);
    }
    assert.ok(s.includes(
      '<div class="grid2 formgrid"><div><label>每科打卡经验</label>',
    ));
    assert.ok(s.includes('class="pset-field"'), '安全详情每孩一个 pset-field 块');
    assert.ok(s.includes('id="cpw-${c.id}"'), '孩子密码输入 id 保留');
    assert.ok(!s.includes(
      '<div class="grid2 formgrid">${s.children.map((c) => `<div><label>${esc(c.name)} 的密码：',
    ), '密码不再用 grid2 formgrid 两列包裹');
    assert.equal((d.match(/class="grid2 formgrid"/g) || []).length, 3);
    assert.equal((s.match(/class="grid2 formgrid"/g) || []).length, 1);
  });

  test('全局 grid2 未改；label 字重随返工 2026-11-14 由 700 改为 600', () => {
    const c = css();
    assert.equal(
      rule(c, '.grid2'),
      '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    );
    assert.ok(c.includes(
      '\nlabel{font-weight:600;display:block;margin-top:8px}',
    ));
  });
});

describe('其他家长双列表单同类修复', () => {
  test('经验设置前四个标签收短，范围与兼容说明保留', () => {
    const a = app();
    const s = settings(a);
    for (const label of [
      '每科打卡经验', '基础经验', '问答答对奖励', '答对不重复天数',
      '早交奖励截止时间',
    ]) {
      assert.ok(s.includes('<label>' + label + '</label>'), label);
    }
    for (const old of [
      '每科打卡经验（1–100）',
      '基础经验（兼容旧口径）',
      '问答答对奖励（0–100）',
      '答对题目不重复天数（7–90）',
    ]) {
      assert.ok(!a.includes(old), `旧标签仍在：${old}`);
    }
    assert.ok(s.includes(
      '<div style="color:var(--text-2);font-size:var(--fs-parent-body)">范围：每科 1–100、基础 10–200、问答 0–100、不重复 7–90 天；基础经验兼容旧口径</div>',
    ));
    for (const input of [
      'id="subjectxp" value="${s.subjectXp}" min="1" max="100"',
      'id="basexp" value="${s.baseXp}" min="10" max="200"',
      'id="quizxp" value="${s.quizXp}" min="0" max="100"',
      'id="quizrepeat" value="${s.quizRepeatDays}" min="7" max="90"',
    ]) {
      assert.ok(s.includes(input), input);
    }
  });

  test('密码 label 仅保留设置状态，未设置提示在 input 下方', () => {
    const a = app();
    const s = settings(a);
    assert.ok(s.includes(
      "${c.hasPassword ? ic('check') + ' 已设置' : '未设置'}</label>",
    ));
    assert.doesNotMatch(a, /孩子点头像时会提示找家长设置）(?:'\})?<\/label>/);
    assert.ok(!s.includes('未设置（孩子点头像时会提示找家长设置）'));
    assert.match(s,
      /id="cpw-\$\{c\.id\}"[^>]*>\s*\$\{c\.hasPassword \? '' : '<div style="color:var\(--text-2\);font-size:var\(--fs-parent-body\)">孩子点头像时会提示找家长设置<\/div>'\}/,
    );
  });

  test('时间偏移收短，整数可负说明保留在 input 下方', () => {
    const d = debug(app());
    assert.ok(d.includes('<label>偏移天数</label>'));
    assert.ok(!d.includes('偏移天数（整数，可负）'));
    assert.match(d,
      /id="dbg-off"[^>]*step="1">\s*<div style="color:var\(--text-2\);font-size:var\(--fs-parent-body\)">整数，可负<\/div><\/div>/,
    );
    assert.ok(d.includes('<label>模拟小时</label>'));
  });
});
