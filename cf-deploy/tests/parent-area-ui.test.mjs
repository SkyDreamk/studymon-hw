// 用户系统 v2 多家庭：家长区前端（家长入口按钮、家长模式、切换条、我家设置、系统管理、「我的」页）源码断言
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');
const fn = (start, end) => { const i = app.indexOf(start); assert.ok(i >= 0, start); return app.slice(i, app.indexOf(end, i + 1)); };

describe('家长入口按钮', () => {
  const b = fn('function parentEntryBtn()', '/* 首页右上角头像按钮');
  test('带字；有待审显示「（N 待审）」；窄屏短文案「家长（N）」', () => {
    assert.match(b, /tr\(\.\.\.LANG\.parentEntry\)/);
    assert.match(app, /parentEntry: \['家长入口'/);
    assert.match(b, /待审）/);
    assert.match(b, /tr\('家长', 'Parent'\)/);
    assert.match(b, /pe-full/); assert.match(b, /pe-short/);
  });
  test('CSS：390 宽切到短文案，不用省略号', () => {
    assert.match(css, /@media \(max-width:430px\)\{\.parent-entry \.pe-full\{display:none\}/);
    const rule = css.slice(css.indexOf('.parent-entry{'), css.indexOf('.parent-entry{') + 120);
    assert.ok(!/ellipsis/.test(rule));
  });
  test('首页、子页顶栏、孩子主页、「我的」页、改 PIN 页、学习进度页都用同一组件，且在头像按钮左边', () => {
    assert.equal((app.match(/\$\{parentEntryBtn\(\)\}/g) || []).length, 6);
    assert.ok(!/<button class="iconbtn" onclick="goParent\(\)"/.test(app));
    assert.match(app, /parentEntryBtn\(\)\}\$\{meBtnHtml\(\)\}/);
    assert.match(app, /parentEntryBtn\(\)\}\$\{state\.sessionKind === 'child' \? meBtnHtml\(\) : ''\}/);
  });
});

describe('家长模式', () => {
  test('验 PIN 不改 sessionKind，记 homeChildId；退出调 /api/parent/exit 回同一孩子', () => {
    const e = fn('function enterParentMode', 'function leaveParentMode');
    assert.ok(!/sessionKind\s*=[^=]/.test(e));
    assert.match(e, /homeChildId/);
    assert.ok(!/state\.sessionKind = 'parent'/.test(fn('async function submitPin', 'async function goHome2')));
    const x = fn('async function exitParent', 'window.exitParent');
    assert.match(x, /\/api\/parent\/exit/);
    assert.match(x, /goChild\(home\)/);
  });
  test('api() 遇 401 PARENT_EXPIRED 丢掉家长模式并回孩子页', () => {
    assert.match(app, /j\.error === 'PARENT_EXPIRED'\) \{[\s\S]{0,200}parentExpired\(\)/);
    const p = fn('function parentExpired', 'async function exitParent');
    assert.match(p, /leaveParentMode\(\)/); assert.match(p, /backToHomeChild\(\)/);
  });
  test('loadOverview 在家长模式中不覆盖孩子会话信息', () => {
    assert.match(app, /if \(j\.session && !state\.parentMode\)/);
  });
});

describe('家长区页面', () => {
  const chrome = fn('function parentChromeHtml', 'async function renderParent');
  test('顶栏：← 回到<孩子>、家长区、⚙ 我家设置；三个页签', () => {
    assert.match(chrome, /← \$\{tr\('回到', 'Back to '\)\}\$\{esc\(home\.name\)\}/);
    assert.match(chrome, /家长区/); assert.match(chrome, /ic\('settings'\)/);
    assert.match(chrome, /'审核', 'Review'/); assert.match(chrome, /'统计', 'Stats'/); assert.match(chrome, /'历史', 'History'/);
  });
  test('我家设置页没有切换条和页签', () => {
    assert.match(chrome, /\$\{inSet \? '' : `\$\{parentSwitchHtml\(f\)\}/);
  });
  const sw = fn('function parentSwitchHtml', 'window.parentPick');
  test('切换条：1 个孩子身份条不可点；2～3 平分；4+ 横滑且有待审的在前；待设年级', () => {
    assert.match(sw, /kids\.length === 1/);
    assert.match(sw, /pf-ident/);
    assert.ok(!/onclick="parentPick/.test(sw.slice(0, sw.indexOf('const list'))));
    assert.match(sw, /kids\.length >= 4 \? 'scroll' : 'n' \+ kids\.length/);
    assert.match(sw, /\(b\.pending \|\| 0\) - \(a\.pending \|\| 0\)/);
    assert.match(sw, /待设年级/);
    assert.match(css, /\.pf-bar\{position:sticky;top:0/);
    assert.match(css, /\.pf-card\.on\{[^}]*border:3px/);
  });
  test('每次进家长区重新拉 family-children；三个页签带 ?childId=', () => {
    assert.match(fn('async function renderParent', 'window.parentTab ='), /loadParentFamily\(\)/);
    assert.match(app, /\/api\/parent\/family-children/);
    assert.match(app, /api\('\/api\/parent\/pending' \+ pcQ\(\)\)/);
    assert.match(app, /api\('\/api\/parent\/stats' \+ pcQ\(\)\)/);
    assert.match(app, /api\('\/api\/parent\/history' \+ pcQ\(\)\)/);
  });
  test('内容第一行写是谁；通过/驳回按钮不带名字（短文案＋tr 双语）', () => {
    assert.match(app, /的待审作业/);
    assert.match(app, /\$\{tr\('通过', 'Approve'\)\}/);
    assert.match(app, /\$\{tr\('驳回', 'Reject'\)\}/);
    assert.match(app, /\$\{tr\('改经验', 'Adjust XP'\)\}/);
    assert.doesNotMatch(app, /通过\$\{esc\(r\.childName\)\}的作业/);
    assert.doesNotMatch(app, /驳回\$\{esc\(r\.childName\)\}的作业/);
  });
  test('URL /parent?child=&tab= 同步、popstate、刷新恢复', () => {
    const u = fn('function parentUrl', 'function parseParentUrl');
    assert.match(u, /'\/parent\?'/); assert.match(u, /q\.set\('child'/); assert.match(u, /q\.set\('tab'/);
    assert.match(app, /addEventListener\('popstate'/);
    assert.match(app, /async function bootEntry/);
    assert.match(app, /location\.pathname === '\/parent'/);
    assert.match(app, /\nbootEntry\(\);/);
  });
});

describe('我家设置 / 系统管理', () => {
  test('邀请码页有生成邀请码＋到期＋复制；单孩设置页有重置 PIN', () => {
    // 任务 130：邀请码卡片撤出用户管理页，邀请码只在顶栏邀请码入口（parentInvitesHtml）
    const m = fn('async function parentInvitesHtml', 'async function parentAccountMgmtHtml');
    assert.match(m, /生成邀请码/); assert.match(m, /到期/); assert.match(m, /copyInvite/);
    assert.doesNotMatch(app, /parentAccountMgmtHtml/);
    assert.match(app, /acctResetByChild\(\$\{c\.id\}\)/);
    const childBlock = fn('function parentChildSettingsHtml', 'function parentCheckinSettingsHtml');
    assert.ok(childBlock.includes('acctResetByChild(${c.id})'));
  });
  test('用户管理：孩子账号行有「删除」按钮（家长账号没有）；点删除先输管理 PIN 再弹警示（确认/返回）', () => {
    const m = fn('async function parentAccountsListHtml', 'const LINE_LABELS');
    assert.match(m, /acctDelete\(\$\{a\.childId\}/);
    assert.match(m, /role === 'child'/);
    const d = fn('async function acctDelete', 'async function inviteCreate');
    assert.match(d, /askResetPin\('输入家长 PIN 以确认删除孩子'\)/);
    assert.match(d, /askConfirm\(/);
    assert.match(d, /'确认', '返回'/);
    assert.match(d, /\/api\/parent\/accounts\/delete/);
    assert.match(d, /renderParent\(\)/);
    const rp = fn('function askResetPin', '/* 页面内自定义输入弹窗');
    assert.match(rp, /msg = '输入家长 PIN 以确认重置全部数据'/);
  });
  test('临时授权 24 小时', () => {
    assert.match(app, /\/api\/parent\/family\/temp-auth/);
    assert.match(app, /24 小时/);
  });
  test('系统管理入口只给 sysadmin，进入前再输 PIN；页面不含孩子数据', () => {
    assert.match(app, /const canAdmin = perms\.includes\('admin\.access'\);/); // 角色权限表：admin.access 才渲染（后端 sysadmin 才有）
    assert.match(app, /\$\{canAdmin \? `<div class="pset-h">/);
    assert.match(app, /\$\{canGlobal \? `<div class="pset-h">功能<\/div>/); // 三个全站开关行同理，没权限不渲染
    const a = fn('async function adminOpen', 'async function parentAdminHtml');
    assert.match(a, /\/api\/admin\/enter/);
    const page = fn('async function parentAdminHtml', 'async function parentSettingsHtml');
    for (const w of ['/api/admin/overview', '/api/admin/defaults', '/api/admin/family/status', '/api/admin/invites/create']) assert.ok(app.includes(w), w);
    assert.ok(!/\/api\/photos|family\/view|childName|\.children|todaySubjects/.test(page), '系统管理页不读也不显示孩子数据');
  });
});

describe('「我的」页', () => {
  const me = fn('function renderMe', 'function meOpenEdit');
  test('大头像＋右下角小铅笔开编辑菜单（换头像/改名都在里面选）；弹框选头像，点一个换上并关闭', () => {
    assert.match(me, /me-av-big/); assert.match(me, /me-pencil/); assert.match(me, /meOpenEdit\(\)/);
    assert.match(css, /\.me-pencil\{position:absolute;right:-2px;bottom:-2px/);
    // 编辑菜单里两项：换头像（进头像网格）、改名字（进改名弹框）；主页面不再单列“显示名”一行
    const menu = fn('function meOpenEdit', 'function meOpenNameEdit');
    assert.match(menu, /meOpenAvatars\(\)/); assert.match(menu, /meOpenNameEdit\(\)/);
    assert.match(app, /me-name-modal/);
    assert.doesNotMatch(me, /id="me-name"/);
    assert.match(fn('async function meSetAvatar', 'async function meSaveName'), /closeModal\(\)/);
    assert.match(app, /me-avgrid/);
  });
  test('修改 PIN 是导航按键，点进才进改 PIN 界面；主页面无 inline 三输入', () => {
    assert.match(me, /meOpenChangePw\(\)/);
    assert.match(me, /me-navrow/);
    assert.match(css, /\.me-navrow\{display:flex/);
    assert.doesNotMatch(me, /id="me-pw0"/);
    const pw = fn('function meOpenChangePw', '/* 点头像右下角的小铅笔');
    assert.match(pw, /id="me-pw0"/); assert.match(pw, /id="me-pw1"/); assert.match(pw, /id="me-pw2"/);
    assert.match(pw, /renderMe\(\)/);
  });
  test('学习进度只给孩子（导航按键，点进才选，同改 PIN）；保存后提示新进度明天生效', () => {
    assert.match(me, /isChildMe\(m\)/);
    assert.match(me, /meOpenProgress\(\)/);
    assert.match(me, /me-navrow/);
    assert.doesNotMatch(me, /meProgressHtml\(\)/);
    assert.match(fn('function isChildMe', 'function meProgressHtml'), /parent/);
    const p = fn('function meProgressHtml', 'function renderMe');
    for (const id of ['mep-chinese', 'mep-math', 'mep-english']) assert.match(p, new RegExp(id));
    const scr = fn('function renderMeProgress', 'function meOpenProgress');
    assert.match(scr, /meProgressHtml\(\)/);
    assert.match(scr, /renderMe\(\)/);
    assert.match(app, /明天起按新进度出题，今天的题不变/);
    assert.match(app, /\/api\/me\/progress/);
  });
});
