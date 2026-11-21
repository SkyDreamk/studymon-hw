/**
 * 任务 130：用户管理改一级-二级栏目＋全站平铺 UI 统一处理
 * 运行命令：node --test tests/user-mgmt-two-level.test.mjs
 * 仅对 public/static/app.js.orig 做源码断言，不运行浏览器、不连接后端。
 *
 * 用户管理（psetDetail='settings'）不再一页全展开，改成：
 * 列表（parentUserMgmtListHtml）→ 子页（创建账号 / 账号列表 / 单孩设置 / 打卡设置），
 * psetSub 记子页，psetBack 分层返回（子页→用户管理列表→设置列表）。
 * 邀请码卡片撤出用户管理页（顶栏已有邀请码入口），邀请码页自带复制按钮。
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');

function fn(src, startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  assert.ok(a >= 0, '缺 ' + startMarker);
  const b = endMarker ? src.indexOf(endMarker, a + 1) : src.length;
  return src.slice(a, b >= 0 ? b : src.length);
}

function functionBlock(name) {
  const declaration = app.match(
    new RegExp('\\bfunction\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{')
  );
  assert.ok(declaration, '缺函数 ' + name);
  const startMarker = declaration[0];
  const tail = fn(app, startMarker);
  const nextDeclaration = tail.slice(startMarker.length).match(
    /^[ \t]*(?:(?:async[ \t]+)?function[ \t]+[A-Za-z_$][\w$]*[ \t]*\(|window\.[A-Za-z_$][\w$]*[ \t]*=)/m
  );
  return fn(app, startMarker, nextDeclaration ? nextDeclaration[0] : undefined);
}

describe('二级导航状态：psetSub', () => {
  test('state 有 psetSub；psetOpenSub 存在；psetOpen/换 tab/选孩子都清 psetSub', () => {
    assert.match(app, /psetDetail: null, psetSub: null,/);
    assert.ok(app.includes("window.psetOpenSub = (key) => { state.psetSub = key; renderParent(); };"));
    assert.ok(app.includes("window.psetOpen = (key) => { state.psetDetail = key; state.psetSub = null; renderParent(); };"));
    assert.match(app, /window\.parentTab = \(t\) => \{[^}]*state\.psetSub = null;/);
    assert.match(app, /window\.parentPick = \(id\) => \{[^}]*state\.psetSub = null;/);
  });

  test('psetBack 分层：先清 psetSub（回上一级），再清 psetDetail（回设置列表）', () => {
    const back = fn(app, 'window.psetBack =', 'window.psetOpenSub');
    assert.match(back, /if \(state\.psetSub\) \{ state\.psetSub = psetParentSub\(state\.psetSub\); renderParent\(\); return; \}/);
    assert.match(back, /state\.psetDetail = null; renderParent\(\);/);
  });

  test('psetParentSub 算上一级：三级回二级，其余回列表', () => {
    const f = functionBlock('psetParentSub');
    assert.ok(f.includes('child-'), '缺 child-<id>-xxx 模式');
    assert.ok(f.includes('[a-z]+'), '缺三级后缀模式');
    assert.ok(f.includes("return m[1];"), '三级应回二级');
    assert.ok(f.includes('(pw)-'), '缺 pw-<id> 模式');
    assert.ok(f.includes('return null;'), '其余应回列表');
  });

  test('返回按钮文案动态：无子页回设置，子页回所属栏目，三级回上一级', () => {
    const f = functionBlock('psetBackLabel');
    assert.ok(f.includes("if (!state.psetSub) return '← 返回设置';"));
    assert.ok(f.includes("settings: '用户管理'"), '缺用户管理');
    assert.ok(f.includes("evo: '考试管理'"), '缺考试管理');
    assert.ok(f.includes("questions: '题目管理'"), '缺题目管理');
    assert.ok(f.includes("security: '安全'"), '缺安全');
    assert.ok(f.includes("coop: '假期合作道馆'"), '缺假期合作道馆');
    assert.ok(f.includes("'← 返回孩子密码'"), '安全三级应回孩子密码');
    assert.ok(f.includes('的考试管理'), '考试管理三级应回该孩子的考试管理页');
    assert.equal((app.match(/\$\{psetBackLabel\(\)\}/g) || []).length, 3, '三处返回按钮（加载壳/加载失败/详情）都应调 psetBackLabel');
  });
});

describe('用户管理列表：只列栏目，不展开内容', () => {
  test('列表有创建账号、账号列表、每孩设置、打卡设置四类行，都走 psetOpenSub', () => {
    const list = fn(app, 'async function parentUserMgmtListHtml', 'async function parentCreateAccountHtml');
    // row() 模板生成 onclick="psetOpenSub('${sub}')"，四类行以 row('…') 传入
    assert.ok(list.includes("psetOpenSub('${sub}')"), 'row 模板缺 psetOpenSub');
    for (const sub of ["row('create'", "row('accounts'", "row('child-' + c.id", "row('checkin'"]) {
      assert.ok(list.includes(sub), '缺子栏目：' + sub);
    }
    assert.ok(list.includes('创建账号'));
    assert.ok(list.includes('账号列表'));
    assert.ok(list.includes("c.name + ' 的设置'"));
    assert.ok(list.includes('打卡设置'));
    // 列表本身不含任何表单输入（不展开）
    assert.doesNotMatch(list, /<input|<select|<textarea/);
  });

  test('case settings 按 psetSub 分流到五个子页，未知值回列表', () => {
    const settings = fn(app, 'async function parentSettingsHtml', '/* 111: 设置开关');
    assert.match(settings, /if \(!state\.psetSub\) body = await parentUserMgmtListHtml\(s\);/);
    assert.match(settings, /state\.psetSub === 'create'\) body = await parentCreateAccountHtml\(\);/);
    assert.match(settings, /state\.psetSub === 'accounts'\) body = await parentAccountsListHtml\(\);/);
    assert.match(settings, /state\.psetSub === 'checkin'\) body = parentCheckinSettingsHtml\(s\);/);
    assert.match(settings, /state\.psetSub\.startsWith\('child-'\)/);
    assert.match(settings, /parentChildSettingsHtml\(_c\)/);
  });
});

describe('子页：各只做一件事', () => {
  test('创建账号页有完整表单与创建按钮，不含账号列表与邀请码', () => {
    const create = fn(app, 'async function parentCreateAccountHtml', 'async function parentAccountsListHtml');
    for (const id of ['ac-user', 'ac-pw', 'ac-name', 'ac-av', 'ac-grade']) {
      assert.ok(create.includes(`id="${id}"`), '缺输入：' + id);
    }
    assert.ok(create.includes('onclick="acctCreate()"'));
    assert.doesNotMatch(create, /acct-row|inviteCard|生成邀请码/);
  });

  test('账号列表页有账号行、重置 PIN 与删除按钮，不含创建表单', () => {
    const list = fn(app, 'async function parentAccountsListHtml', 'const LINE_LABELS');
    assert.ok(list.includes('acctResetPw('));
    assert.ok(list.includes('acctDelete('));
    assert.ok(list.includes("role === 'child'"));
    assert.doesNotMatch(list, /ac-user|acctCreate\(\)|生成邀请码/);
  });

  test('单孩设置页只含该孩的名字、年级、三科进度、重置 PIN 与保存', () => {
    const child = functionBlock('parentChildSettingsHtml');
    for (const id of ['nm-${c.id}', 'gr-${c.id}', "'cp-' + c.id", "'mp-' + c.id", "'ep-' + c.id"]) {
      assert.ok(child.includes(id), '缺：' + id);
    }
    assert.ok(child.includes('acctResetByChild(${c.id})'));
    assert.ok(child.includes('<button class="bigbtn" onclick="saveSettings()">保存</button>'));
    // 不含其他孩子的输入与打卡设置
    assert.doesNotMatch(child, /kids\.map|subjectxp|basexp/);
  });

  test('打卡设置页只含五项与保存，不含孩子区块', () => {
    const checkin = functionBlock('parentCheckinSettingsHtml');
    for (const id of ['subjectxp', 'basexp', 'quizxp', 'quizrepeat', 'cutoff']) {
      assert.ok(checkin.includes(`id="${id}"`), '缺：' + id);
    }
    assert.ok(checkin.includes('<button class="bigbtn" onclick="saveSettings()">保存设置</button>'));
    assert.doesNotMatch(checkin, /nm-\$|learningSelectHtml/);
  });
});

describe('邀请码只在顶栏入口，不再 duplicate 进用户管理', () => {
  test('旧的 parentAccountMgmtHtml 与 parentSettingsFieldsHtml 已删除', () => {
    assert.doesNotMatch(app, /parentAccountMgmtHtml/);
    assert.doesNotMatch(app, /parentSettingsFieldsHtml/);
    assert.doesNotMatch(app, /inviteCard/);
  });

  test('邀请码页（parentInvitesHtml）有生成、到期与复制按钮', () => {
    const inv = fn(app, 'async function parentInvitesHtml', 'async function parentUserMgmtListHtml');
    assert.match(inv, /生成邀请码/);
    assert.match(inv, /到期/);
    assert.match(inv, /copyInvite\('/);
  });
});

describe('saveSettings 只保存当前页', () => {
  test('跳过不在 DOM 里的孩子；五项只在输入在时进 body；空 body 不发请求', () => {
    const save = fn(app, 'window.saveSettings = async', 'window.saveSecurity');
    assert.match(save, /if \(!nmEl\) continue;/);
    assert.match(save, /if \(!Object\.keys\(body\)\.length\) return;/);
    assert.match(save, /api\('\s*\/api\/parent\/settings\/update', body\)/);
  });
});
