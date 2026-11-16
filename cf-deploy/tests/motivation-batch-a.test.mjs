/* 任务 102 批次 A（Phase 1：打卡体验四项，2026-11-12）
 * node --test tests/motivation-batch-a.test.mjs
 * 覆盖：
 * ① A1 提交成功弹窗约 900ms 后自动收起（动作与「继续」一致），「继续」仍可提前关；弹窗被替换/已关闭时计时器不误动作；
 * ② A2 打卡页进度条标签（方案第 11 条＋前后对比示例图，2026-11-15 用户纠正后实施：表头一行「Submitted X of 5」左＋「Streak N day」右、无火焰图标；进度条轨道改 --track），不出现第二条进度条；
 * ③ A3 单科状态改为纯文字「未提交 / Not submitted」（方案第 11 条＋示例图；无胶囊底色），其它状态文案与「未提交」状态键不变；
 * ⑤ 方案第 11 条：空状态大框删除，21:30 提示改为顶部常驻白卡（.checkin-note），底部注脚删除；科目卡收紧（.checkin-list）；5 科在 664 高一屏放下（390px 实测，不在单测里）。
 * ④ A4 触控目标 ≥48px：CSS 规则与内联 style 的下限（真实渲染的 390px 实测见任务说明，不在单测里）。
 * 说明：A1 用注入假计时器直接运行 app.js 里真实的 celebrateCheckin 源码，不靠浏览器。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assetPath } from './asset-path.mjs';

const APP = readFileSync(assetPath('app.js'), 'utf8');
const CSS = readFileSync(assetPath('style.css'), 'utf8');

/* ---------- A1 ---------- */
function loadCelebrate() {
  const m = APP.match(/let celebrateTimer = null;[^\n]*\nfunction celebrateCheckin\([\s\S]*?\n}\n/);
  assert.ok(m, '找不到 celebrateCheckin 源码');
  const timers = []; let now = 0; let nextId = 0;
  const calls = [];
  const modalRoot = {
    html: '',
    get innerHTML() { return this.html; },
    set innerHTML(v) { this.html = v; },
    querySelector(sel) { return sel === '[data-celebrate]' && this.html.includes('data-celebrate') ? {} : null; },
  };
  const closeModal = () => { modalRoot.html = ''; calls.push('close'); };
  const goCheckinPage = (id) => calls.push('go:' + id);
  const fakeSetTimeout = (fn, ms) => { timers.push({ id: ++nextId, at: now + ms, fn }); return nextId; };
  const fakeClearTimeout = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
  const tick = (ms) => {
    now += ms;
    for (const t of [...timers].sort((a, b) => a.at - b.at)) {
      if (t.at <= now && timers.includes(t)) { timers.splice(timers.indexOf(t), 1); t.fn(); }
    }
  };
  const celebrate = new Function('modalRoot', 'ic', 'closeModal', 'goCheckinPage', 'setTimeout', 'clearTimeout',
    m[0] + '\nreturn celebrateCheckin;')(modalRoot, (n) => `[${n}]`, closeModal, goCheckinPage, fakeSetTimeout, fakeClearTimeout);
  return { celebrate, modalRoot, calls, tick, timers };
}

describe('A1 提交成功弹窗自动收起', () => {
  test('源码：弹窗带 data-celebrate 标记、「继续」按钮与动作不变、定时 900ms、有守卫', () => {
    assert.match(APP, /<div class="modal" data-celebrate="1">/);
    assert.match(APP, /<button class="bigbtn" onclick="closeModal\(\);goCheckinPage\(\$\{Number\(childId\)\}\)">继续<\/button>/);
    assert.match(APP, /celebrateTimer = setTimeout\(\(\) => \{[\s\S]*?querySelector\('\[data-celebrate\]'\)[\s\S]*?closeModal\(\); goCheckinPage\(Number\(childId\)\);[\s\S]*?\}, 900\);/);
  });
  test('弹窗内容保持原样：早交提示 / 非早交提示 / 连续打卡胶囊 / 邮戳', () => {
    const c = loadCelebrate();
    c.celebrate(true, 7, 5);
    assert.match(c.modalRoot.html, /提交成功！/);
    assert.match(c.modalRoot.html, /早交奖励已锁定！等家长审核通过就能拿到经验啦/);
    assert.match(c.modalRoot.html, /连续打卡 5 天/);
    assert.match(c.modalRoot.html, /class="stamp stamp-in stamp-big">已交</);
    c.celebrate(false, 7, undefined);
    assert.match(c.modalRoot.html, /已经交给家长审核啦，通过后就能拿到经验/);
    assert.doesNotMatch(c.modalRoot.html, /连续打卡/);
  });
  test('899ms 时弹窗还在，900ms 时自动收起并跳回打卡页（与「继续」同一动作，只执行一次）', () => {
    const c = loadCelebrate();
    c.celebrate(false, 7, 3);
    c.tick(899);
    assert.ok(c.modalRoot.html.includes('data-celebrate'), '900ms 前不应消失');
    assert.deepEqual(c.calls, []);
    c.tick(1);
    assert.equal(c.modalRoot.html, '');
    assert.deepEqual(c.calls, ['close', 'go:7']);
    c.tick(5000);
    assert.deepEqual(c.calls, ['close', 'go:7'], '之后不得再触发');
  });
  test('点「继续」提前关闭后，计时器不再重复跳转', () => {
    const c = loadCelebrate();
    c.celebrate(false, 7, 3);
    c.tick(300);
    // 「继续」按钮的 onclick：closeModal(); goCheckinPage(7)
    const closeModal = () => { c.modalRoot.html = ''; c.calls.push('close'); };
    closeModal(); c.calls.push('go:7');
    c.tick(5000);
    assert.deepEqual(c.calls, ['close', 'go:7']);
  });
  test('900ms 内被别的弹窗替换：计时器不关掉别人的弹窗、也不跳转', () => {
    const c = loadCelebrate();
    c.celebrate(false, 7, 3);
    c.tick(400);
    c.modalRoot.html = '<div class="overlay"><div class="modal">别的弹窗</div></div>';
    c.tick(2000);
    assert.deepEqual(c.calls, []);
    assert.match(c.modalRoot.html, /别的弹窗/);
  });
  test('连续两次庆祝：第一次的计时器被清掉，第二次从头计 900ms', () => {
    const c = loadCelebrate();
    c.celebrate(false, 7, 3);
    c.tick(500);
    c.celebrate(true, 7, 4);
    c.tick(899);                       // 距第二次 899ms（距第一次已 1399ms）
    assert.ok(c.modalRoot.html.includes('data-celebrate'));
    assert.deepEqual(c.calls, []);
    c.tick(1);
    assert.deepEqual(c.calls, ['close', 'go:7']);
    assert.equal(c.timers.length, 0);
  });
});

/* ---------- A2 ---------- */
describe('A2 打卡页进度条标签', () => {
  test('只有一条进度条（沿用已有的 .checkin-progress / .xpbar.progress），表头一行「Submitted X of 5」＋右「Streak N day」，轨道改 --track', () => {
    assert.equal((APP.match(/class="checkin-progress"/g) || []).length, 1);
    // 只数打卡页本身（goCheckinPage 函数体）里的进度条；别的页面各有自己的进度条，与本批无关
    const start = APP.indexOf('function goCheckinPage');
    assert.ok(start > 0, '找不到 goCheckinPage');
    const rest = APP.slice(start + 10);
    const end = rest.search(/\n(?:async )?function /);
    const body = rest.slice(0, end > 0 ? end : undefined);
    assert.equal((body.match(/class="xpbar progress"/g) || []).length, 1, '打卡页只应有一条进度条');
    assert.match(APP, /class="checkin-head"/);
    assert.match(APP, /Submitted \$\{doneCount\} of \$\{subs\.length\}/);
    assert.match(APP, /Streak \$\{k\.streak\}\$\{k\.streak === 1 \? ' day' : ' days'\}/);
    assert.doesNotMatch(body, /ic\('flame'\)/);
    assert.doesNotMatch(APP, /Submitted \$\{doneCount\}\/\$\{subs\.length\} · Approved/);
    assert.doesNotMatch(APP, /已交 \$\{doneCount\}\/\$\{subs\.length\} 科 · 已通过/);
    assert.doesNotMatch(APP, /今日打卡 \$\{doneCount\}/);
    assert.match(CSS, /\.checkin-progress \.xpbar\{background:var\(--track\)\}/);
    assert.match(CSS, /--track:#E3CFAF/);
    assert.match(CSS, /\.checkin-head\{display:flex;justify-content:space-between;align-items:baseline;margin:2px 0 6px\}/);
  });
  test('已交 = 非驳回（待审核 + 已通过）；进度条仍按已交填充（已通过数只在各科卡片显示）', () => {
    const m1 = APP.match(/const doneCount = (subs\.filter\([^\n]*\)\.length);/);
    assert.ok(m1);
    assert.doesNotMatch(APP, /const approvedCount = /);
    const calc = (subs) => new Function('subs', `return ${m1[1]};`)(subs);
    const S = (status) => ({ checkin: status ? { status } : null });
    assert.equal(calc([S('approved'), S('pending'), S('rejected'), S(null), S(null)]), 2);
    assert.equal(calc([S(null), S(null), S(null), S(null), S(null)]), 0);
    assert.equal(calc([S('approved'), S('approved'), S('approved'), S('approved'), S('approved')]), 5);
    assert.match(APP, /clip-path:inset\(0 \$\{[^}]*doneCount[^}]*\}% 0 0\)/);
  });
});

/* ---------- A3 ---------- */
describe('A3 单科「未提交」胶囊改为中性提示', () => {
  test('两处状态都改成纯文字（无胶囊底色），旧 .pill 已不在打卡页', () => {
    assert.match(APP, /checkinSlice3NotSubmitted: tr\('未提交', 'Not submitted'\),/);
    assert.match(APP, /<span class="sc-status none">\$\{LANG\.checkinSlice3NotSubmitted\}<\/span>/);
    assert.match(APP, /<span class="sc-status none">\$\{tr\('未提交', 'Not submitted'\)\}<\/span>/);
    assert.doesNotMatch(APP, /tr\('去交作业', "Let's go!"\)/);
    const start = APP.indexOf('function goCheckinPage');
    assert.ok(start > 0, '找不到 goCheckinPage');
    const rest = APP.slice(start + 10);
    const end = rest.search(/\n(?:async )?function /);
    const body = rest.slice(0, end > 0 ? end : undefined);
    assert.doesNotMatch(body, /class="pill /);
  });
  test('「未提交」是状态键也是显示文案，其它状态的显示文案不变', () => {
    assert.match(APP, /'未提交': LANG\.checkinSlice3NotSubmitted/);
    assert.match(APP, /tr\('待审核', 'Pending'\)/);
    assert.match(APP, /tr\('已通过', 'Approved'\)/);
  });
  test('状态文字是纯文字（无胶囊底色）；已通过绿字、待审核琥珀字、被驳回红字；已通过卡绿边保留', () => {
    assert.match(CSS, /\.sc-status\{font-size:var\(--fs-label\);color:var\(--text-2\)\}/);
    assert.doesNotMatch(CSS, /\.sc-status\{[^}]*background/);
    assert.match(CSS, /\.sc-status\.approved\{color:#2c7a3d\}/);
    assert.match(CSS, /\.sc-status\.pending\{color:#7c4a00\}/);
    assert.match(CSS, /\.sc-status\.rejected\{color:#b3261e\}/);
    assert.match(CSS, /\.subjcard:has\(\.sc-status\.approved\)\{border-color:#dcf5e0\}/);
  });
  test('胶囊样式仍是中性色，不用红色警示', () => {
    const rule = CSS.split('\n').find((l) => l.startsWith('.pill.none{'));
    assert.ok(rule);
    assert.doesNotMatch(rule, /danger|#F25C54|#f25c54|red/i);
  });
});

/* ---------- 方案第 11 条：空状态删除、21:30 提示改为顶部常驻白卡 ---------- */
describe('打卡页第 11 条：空状态删除、21:30 提示改为顶部常驻白卡', () => {
  test('空状态文案已删除；提示卡是 21:30 说明原文（示例图措辞），常驻显示', () => {
    assert.doesNotMatch(APP, /checkinSlice3Empty/);
    assert.doesNotMatch(APP, /今天还没开始打卡/);
    assert.doesNotMatch(APP, /const allNone = /);
    assert.doesNotMatch(APP, /class="checkin-hint"/);
    assert.match(APP, /checkinSlice3Note: \['每科单独审核，21:30 前提交有早交奖励，经验 ×1\.2。', 'Each subject is reviewed on its own. Submit before 21:30 for an early bonus, XP ×1\.2.'\]/);
    assert.match(APP, /<div class="checkin-note">\$\{tr\(\.\.\.LANG\.checkinSlice3Note\)\}<\/div>/);
  });
  test('提示卡样式是白卡（实线边、14px、次要色、上下留白）', () => {
    assert.match(CSS, /\.checkin-note\{background:var\(--card\);border:2px solid var\(--line\);border-radius:16px;padding:8px 14px;font-size:var\(--fs-cap\);color:var\(--text-2\);line-height:1\.5;margin:2px 0 10px\}/);
    assert.match(CSS, /--fs-cap:14px/);
  });
  test('科目卡收紧（只影响打卡页），5 科能放进 664 高', () => {
    assert.match(CSS, /\.checkin-list \.subjcard\{padding:8px 16px\}/);
    assert.match(APP, /<div class="checkin-list">\$\{subs\.map/);
  });
});

/* ---------- A4 ---------- */
const ruleOf = (selector) => {
  const line = CSS.split('\n').find((l) => l.startsWith(selector + '{'));
  assert.ok(line, '找不到规则 ' + selector);
  return line;
};
const px = (rule, prop) => { const m = rule.match(new RegExp('(?:^|[{;])' + prop + ':(\\d+)px')); return m ? Number(m[1]) : null; };

describe('A4 触控目标 ≥48px', () => {
  for (const sel of ['.iconbtn', '.smallbtn', '.sc-btn', '.navgrid .bigbtn', '.de-audio-btn,.de-rec-btn', '.dex-filter-chip']) {
    test(`${sel} 的 min-height ≥ 48`, () => { assert.ok(px(ruleOf(sel), 'min-height') >= 48, sel); });
  }
  test('.iconbtn 的 min-width 也 ≥ 48（中/锁图标按钮是方块）', () => { assert.ok(px(ruleOf('.iconbtn'), 'min-width') >= 48); });
  test('内联 style 的按钮 / 输入框不再有 <48px 的 min-height', () => {
    const bad = APP.split('\n').map((l, i) => [i + 1, l])
      .filter(([, l]) => /<(button|input)\b/.test(l) && /min-height:\s*(\d+)px/.test(l) && Number(l.match(/min-height:\s*(\d+)px/)[1]) < 48);
    assert.deepEqual(bad.map(([n]) => n), []);
  });
  test('家长设置页的线条精灵选择按钮（.linesprites，紧凑网格，不在本批范围）保持不变', () => {
    assert.match(ruleOf('.linegrid.linesprites .smallbtn'), /min-height:0/);
  });
});
