/* 家长设置页模块化（分组列表＋详情页＋行内开关）单测：
 *  node --test tests/pset-modules.test.mjs
 * 断言 JS 模板标记（app.js）与 CSS 规则（style.css）：
 * ① 模块列表含全部组的行（time 组只在 testMode 出现，断言其条件渲染在位）；
 * ② 详情分支存在（state.psetDetail、psetOpen／psetBack）；
 * ③ 开关行含 role="switch" 与 aria-checked；返回按钮含 "返回设置"；
 * ④ CSS 含全部 .pset-* 规则且其中无 text-overflow:ellipsis；摘要行无省略。
 * ⑤ 2026-11-14 美化：英雄卡、开关行去状态字、图标槽 40px、行高 56px、摘要块级、说明对齐、开关滑动过渡。
 * 真实 Azure 调用 0 次。 */
import { assetPath } from './asset-path.mjs';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = () => readFileSync(assetPath('app.js'), 'utf8');
const css = () => readFileSync(assetPath('style.css'), 'utf8');
function rule(c, sel) {
  // 返工 2026-11-14：选择器里的正则元字符（.[]""等）须全部转义，只转义首个 . 会把
  // [aria-checked="true"] 当成字符组，导致属性选择器永远匹配不到。
  const m = c.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*\\}'));
  assert.ok(m, `缺 ${sel} 规则`);
  return m[0];
}

const PSET_GROUPS = ['settings', 'diag', 'evo', 'security', 'questions', 'time', 'coop', 'about'];

describe('家长设置模块列表', () => {
  test('列表容器与全部组的行标记在位（学习进度行已并入用户管理，不再有 math 组）', () => {
    const a = app();
    assert.ok(!a.includes("psetOpen('math')"), '学习进度行应已删除');
    assert.ok(a.includes('class="pset-list"'), '缺 pset-list 容器');
    for (const g of PSET_GROUPS) {
      assert.ok(a.includes(`psetOpen('${g}')`), `缺 ${g} 组行`);
    }
  });
  test('time 组只在 testMode 出现（条件渲染在位）', () => {
    const a = app();
    const idx = a.indexOf("psetOpen('time')");
    assert.ok(idx > -1, '缺 time 组行');
    const before = a.slice(Math.max(0, idx - 2000), idx);
    assert.match(before, /testMode/, 'time 组行附近无 testMode 条件');
  });
  test('详情分支存在：state.psetDetail、psetOpen／psetBack', () => {
    const a = app();
    assert.match(a, /state\.psetDetail/);
    assert.ok(a.includes('psetOpen'), '缺 psetOpen');
    assert.ok(a.includes('psetBack'), '缺 psetBack');
  });
  test('返回按钮含“返回设置”', () => {
    const a = app();
    assert.ok(a.includes('pset-back'), '缺 pset-back');
    assert.ok(a.includes('返回设置'), '缺“返回设置”文案');
  });
});

describe('家长设置行内开关', () => {
  test('开关行含 role="switch" 与 aria-checked', () => {
    const a = app();
    assert.match(a, /role="switch"/);
    assert.match(a, /aria-checked/);
  });
});

describe('家长设置 .pset-* CSS 规则', () => {
  test('全部 .pset-* 规则在位', () => {
    const c = css();
    for (const sel of ['.pset-list', '.pset-row', '.pset-ic', '.pset-tx',
      '.pset-t', '.pset-s', '.pset-c', '.pset-action', '.pset-detail', '.pset-back',
      '.pset-field', '.pset-toggle', '.pset-knob']) {
      assert.ok(c.includes(sel + '{') || c.includes(sel + '['), `缺 ${sel}`);
    }
  });
  test('.pset-row 按契约精确属性', () => {
    const r = rule(css(), '.pset-row');
    for (const p of ['display:flex', 'align-items:center', 'gap:10px', 'width:100%',
      'text-align:left', 'background:none', 'border:0', 'padding:10px 12px', 'cursor:pointer']) {
      assert.ok(r.includes(p), `.pset-row 缺 ${p}`);
    }
  });
  test('.pset-tx／.pset-ic／.pset-c 布局属性', () => {
    const c = css();
    assert.match(rule(c, '.pset-tx'), /flex:1/);
    assert.match(rule(c, '.pset-tx'), /min-width:0/);
    assert.match(rule(c, '.pset-ic'), /flex:none/);
    assert.match(rule(c, '.pset-c'), /flex:none/);
  });
  test('标题／摘要可换行、无省略', () => {
    const c = css();
    for (const sel of ['.pset-t', '.pset-s']) {
      const r = rule(c, sel);
      assert.doesNotMatch(r, /white-space:nowrap/);
      assert.doesNotMatch(r, /text-overflow:ellipsis/);
    }
    assert.doesNotMatch(c, /\.pset-[^{]+\{[^}]*text-overflow:ellipsis/);
  });
  test('.pset-field label 块级加粗可换行、控件全宽', () => {
    const c = css();
    assert.match(rule(c, '.pset-field label'), /display:block/);
    assert.match(rule(c, '.pset-field label'), /font-weight:600/);
    assert.doesNotMatch(rule(c, '.pset-field label'), /white-space:nowrap/);
    assert.doesNotMatch(rule(c, '.pset-field label'), /text-overflow:ellipsis/);
    assert.ok(c.includes('.pset-field input,.pset-field select,.pset-field textarea{width:100%}'));
  });
  test('.pset-toggle 开关尺寸与选中态', () => {
    const c = css();
    const r = rule(c, '.pset-toggle');
    assert.match(r, /width:48px/);
    assert.match(r, /height:28px/);
    assert.match(r, /border-radius:(999px|var\(--radius-pill\))/); // 任务 83：999px 抽为 --radius-pill，值相同
    assert.ok(c.includes('.pset-toggle[aria-checked="true"]'), '缺选中态规则');
    assert.ok(c.includes('.pset-toggle[aria-checked="true"] .pset-knob'), '缺选中态滑块规则');
    assert.match(rule(c, '.pset-knob'), /border-radius:50%/);
  });

  test('.pset-toggle 可点区域 ≥44×44（返工 2）：::after 上下各扩 8px，视觉仍 48×28', () => {
    const c = css();
    assert.ok(c.includes('.pset-toggle::after{content:'), '缺 ::after 扩点击区规则');
    assert.match(rule(c, '.pset-toggle::after'), /top:-8px/);
    assert.match(rule(c, '.pset-toggle::after'), /bottom:-8px/);
  });

  test('.pset-action 两按钮字号 16px（返工 2）：退出登录与重置全部数据不再是浏览器默认 13.33px', () => {
    const c = css();
    assert.match(rule(c, '.pset-action'), /font-size:16px/);
  });
});

describe('家长设置页分组顺序与列表结构', () => {
  test('组头顺序、退出登录为账号卡末行、重置在危险操作区、说明与分隔线在位', () => {
    const a = app();
    const idxLearn = a.indexOf('<div class="pset-h">学习</div>');
    const idxFunc = a.indexOf('<div class="pset-h">功能</div>');
    const idxTest = a.indexOf('<div class="pset-h">测试</div>');
    const idxOther = a.indexOf('<div class="pset-h">其他</div>');
    const idxAcc = a.indexOf('<div class="pset-h">账号与安全</div>');
    assert.ok(idxLearn > -1 && idxFunc > idxLearn && idxTest > idxFunc && idxOther > idxTest && idxAcc > idxOther);
    assert.ok(a.includes('<p class="pset-note">打开后，孩子能在伙伴页喂食、洗澡；每次 +10 友好度，喂对最爱口味每天再 +5 经验。需要对应道具。默认关闭。</p>'));
    assert.ok(a.includes('<p class="pset-note">打开后，每句跟读完自动请 AI 老师点评（只显示星级和需重练的词）；关闭后只录音对比听，不发评测。默认打开。</p>'));
    const idxLogout = a.indexOf('onclick="doLogout()"');
    assert.ok(idxLogout > -1);
    // 返工 2026-11-14：重置移出账号卡，单独放底部「危险操作」区——退出登录仍是账号卡末行，
    // 重置行在危险操作区头之后，是退出登录后唯一的 pset-row。
    const idxDanger = a.indexOf('<div class="pset-h">危险操作</div>');
    assert.ok(idxDanger > idxAcc, '危险操作区应在账号与安全之后');
    const idxReset = a.indexOf('class="pset-row pset-action pset-danger"');
    assert.ok(idxReset > idxDanger, '重置行应在危险操作区内');
    // 退出登录之后第一个 pset-row 应是重置行（注意：idxReset 指向 class=" 的开头，
    // 比其中的 pset-row 子串早 7 字符，直接比两个位置会恒差 7）。
    const idxNextRow = a.indexOf('pset-row', idxLogout + 1);
    assert.strictEqual(idxNextRow, idxReset + 7, '退出登录之后应只有重置行');
    assert.strictEqual(a.indexOf('pset-row pset-action pset-danger', idxLogout + 1), idxNextRow, '退出登录之后第一个 pset-row 应是重置行');
    assert.ok(!a.includes('<h2 style="margin-top:16px">数据</h2>'));
    assert.ok(a.includes('class="pset-row pset-action"'), '缺 action 行');
    assert.ok(css().includes('.pset-row+.pset-note+.pset-row{border-top:0.5px solid var(--line)}'), '缺 note 分隔线规则');
    assert.ok(idxAcc > idxTest && idxAcc > idxOther);
  });
});

describe('家长设置美化（2026-11-14 参考图）', () => {
  // 2026-11-14 用户令：英雄卡不需要，已去掉（参考图的大图头卡不进设置页）。
  test('英雄卡已去掉', () => {
    const a = app();
    assert.ok(!a.includes('class="pset-hero"'), '英雄卡应已去掉');
    assert.ok(!a.includes('<div class="pset-hero-t">家长设置</div>'), '英雄标题应已去掉');
    assert.ok(!a.includes('孩子的打卡、学习与开关，都在这里管。'), '英雄副标题应已去掉');
    assert.ok(!css().includes('.pset-hero'), '英雄卡 CSS 规则应已去掉');
  });
  test('开关行去掉状态字，状态由开关本身表达', () => {
    const a = app();
    const listBlock = a.slice(a.indexOf('function parentSettingsListHtml'), a.indexOf('function parentChildSettingsHtml'));
    assert.doesNotMatch(listBlock, /已开启|已关闭/);
    // 开关本体在 psetToggleHtml（§274 抽出）：listHtml 只含调用，字面 role="switch" 不在切片内是重构所致，非行为丢失——不断言切片含字面，断言 helper 含字面且列表三处都调它。
    const toggleBlock = a.slice(a.indexOf('function psetToggleHtml'), a.indexOf('function parentSettingsListHtml'));
    assert.ok(toggleBlock.includes('role="switch"'), '开关行须保留 role="switch"');
    assert.ok(toggleBlock.includes('aria-checked='), '开关行须保留 aria-checked');
    assert.equal((listBlock.match(/psetToggleHtml\(/g) || []).length, 3, '列表三处开关行应调 psetToggleHtml');
    assert.ok(listBlock.includes('中文|English'), '语言开关标题须保留');
    // 2026-11-14 用户令：第一行「设置」实际是用户管理（点进是孩子名字/年级/伙伴线/经验设置），改名。
    assert.ok(listBlock.includes('<span class="pset-t">用户管理</span>'), '第一行应为用户管理');
    assert.doesNotMatch(listBlock, /<span class="pset-t">设置<\/span>/);
  });
  test('重置行标红（危险操作）', () => {
    const a = app();
    assert.ok(a.includes('class="pset-row pset-action pset-danger"'), '重置行缺 pset-danger');
    assert.ok(css().includes('.pset-action.pset-danger{color:var(--danger-text)}'), '缺 pset-danger 规则');
  });
  test('返工 2026-11-14：重置确认改输家长 PIN，不再两次弹窗', () => {
    const a = app();
    assert.ok(a.includes("function askResetPin(msg = '输入家长 PIN 以确认重置全部数据')"), '缺 askResetPin（含可选提示文案，任务 129）');
    assert.ok(a.includes("api('/api/parent/verify-pin'"), 'PIN 校验应走现成的 verify-pin');
    const resetBlock = a.slice(a.indexOf('window.resetAll'), a.indexOf('window.resetAll') + 400);
    assert.ok(resetBlock.includes('askResetPin()'), 'resetAll 应先调 askResetPin');
    assert.ok(!resetBlock.includes('再确认一次'), 'resetAll 不应再有两次确认弹窗');
  });
  test('返工 2026-11-14：开关打开态 #2E7D46，三行整行可点、开关本身不冒泡', () => {
    const c = css();
    assert.match(rule(c, '.pset-toggle[aria-checked="true"]'), /#2E7D46/);
    const a = app();
    const listBlock = a.slice(a.indexOf('function parentSettingsListHtml'), a.indexOf('function parentSettingsFieldsHtml'));
    assert.ok(listBlock.includes('onclick="toggleCareEnabled('), '照顾行应整行可点');
    assert.ok(listBlock.includes('onclick="toggleOakAssess('), 'AI 点评行应整行可点');
    assert.ok(listBlock.includes('onclick="toggleEnglishMode('), '语言行应整行可点');
    const toggleBlock = a.slice(a.indexOf('function psetToggleHtml'), a.indexOf('function parentSettingsListHtml'));
    assert.ok(toggleBlock.includes('stopPropagation'), '开关本身点击不应冒泡到行（否则一次点会翻两次）');
  });
  test('美化 CSS：图标槽 40px、行高 56px、摘要块级、说明对齐、开关滑动过渡', () => {
    const c = css();
    assert.match(rule(c, '.pset-ic'), /width:40px/);
    assert.match(rule(c, '.pset-row'), /min-height:56px/);
    assert.match(rule(c, '.pset-s'), /display:block/);
    assert.match(rule(c, '.pset-note'), /padding:0 12px 10px 62px/);
    assert.match(rule(c, '.pset-knob'), /transition:left \.18s ease/);
  });
});
