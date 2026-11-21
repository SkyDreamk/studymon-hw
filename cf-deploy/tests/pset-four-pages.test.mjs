/**
 * 任务 131：家长设置 4 页改一级-二级栏目（考试管理/题目管理/安全/假期合作道馆）
 * 运行命令：node --test tests/pset-four-pages.test.mjs
 * 仅对 public/static/app.js.orig 做源码断言，不运行浏览器、不连接后端。
 *
 * 考试管理（三级）：列表按孩子分行 → 孩子页（登记学校考试/单元测试抽奖两个入口）
 *   → 表单页（登记页含学校成绩列表，抽奖页含未答完/最近记录）。
 * 安全（三级）：列表两个入口（修改家长 PIN/孩子密码）→ 改 PIN 表单 / 孩子密码按孩子分行
 *   → 单孩密码表单。
 * 题目管理（二级）：列表页（统计＋新增入口＋我的自定义题）→ 新增表单单独一页。
 * 假期合作道馆（二级）：列表两个入口（假期设置/合作记录）→ 假期设置表单 / 合作记录列表。
 * 分发函数名不变（调度 case 不动），psetBack/psetBackLabel 已分层（见 user-mgmt-two-level）。
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

describe('任务 131：四页一级-二级栏目', () => {
  test('psetRow 共用行模板存在（图标＋标题＋副标题＋›，走 psetOpenSub）', () => {
    const f = functionBlock('psetRow');
    assert.ok(f.includes("onclick=\"psetOpenSub('${sub}')\""), '行模板缺 psetOpenSub');
    assert.ok(f.includes('pset-ic') && f.includes('pset-t') && f.includes('pset-c'));
  });

  test('调度 case 仍调四个分发函数（函数名不变）', () => {
    const sw = fn(app, "switch (state.psetDetail)", "return `<button class=\"pset-back\"");
    assert.ok(sw.includes("body = parentSettingsSecurityHtml(s);"), '缺安全');
    assert.ok(sw.includes('body = await parentEvoHtml();'), '缺考试管理');
    assert.ok(sw.includes('body = await parentQuestionsHtml();'), '缺题目管理');
    assert.ok(sw.includes('body = await parentCoopSettingsHtml();'), '缺合作道馆');
  });

  test('考试管理：分发器按 psetSub 分流，自身不展开表单', () => {
    const f = functionBlock('parentEvoHtml');
    assert.ok(f.includes('parentEvoListHtml(s)'), '缺列表分流');
    assert.ok(f.includes('parentEvoChildHtml(c)'), '缺孩子页分流');
    assert.ok(f.includes('parentEvoSchoolHtml(c)'), '缺登记页分流');
    assert.ok(f.includes('parentEvoUnitHtml(c)'), '缺抽奖页分流');
    assert.ok(!f.includes('st-subj-'), '分发器不应含登记表单');
    assert.ok(!f.includes('ut-subj-'), '分发器不应含抽奖表单');
  });

  test('考试管理列表：按孩子分行（图标＋“X 的考试管理”＋年级）', () => {
    const f = functionBlock('parentEvoListHtml');
    assert.ok(f.includes("psetRow('child-' + c.id, 'pencil', c.name + ' 的考试管理'"));
    assert.ok(!f.includes('st-subj-') && !f.includes('ut-subj-'), '列表不应展开表单');
  });

  test('考试管理孩子页：登记学校考试/单元测试抽奖两个入口', () => {
    const f = functionBlock('parentEvoChildHtml');
    assert.ok(f.includes("psetRow('child-' + c.id + '-school'"), '缺登记入口');
    assert.ok(f.includes("psetRow('child-' + c.id + '-unit'"), '缺抽奖入口');
    assert.ok(f.includes('学校成绩'), '登记入口缺成绩数副标');
    assert.ok(f.includes('未答完') || f.includes('开启一场单元测试'), '抽奖入口缺状态副标');
  });

  test('考试管理登记页：表单＋学校成绩列表', () => {
    const f = functionBlock('parentEvoSchoolHtml');
    for (const id of ['st-subj-', 'st-unit-', 'st-score-', 'st-full-', 'st-date-', 'st-photo-']) {
      assert.ok(f.includes(id), '缺输入 ' + id);
    }
    assert.ok(f.includes('saveSchoolTest('), '缺保存成绩');
    assert.ok(f.includes('学校成绩'), '缺成绩列表');
    assert.ok(f.includes('voidSchoolTest('), '缺作废');
    assert.ok(!f.includes('ut-subj-'), '登记页不应含抽奖表单');
  });

  test('考试管理抽奖页：表单＋未答完/最近记录', () => {
    const f = functionBlock('parentEvoUnitHtml');
    assert.ok(f.includes('ut-subj-') && f.includes('ut-unit-'), '缺抽奖表单');
    assert.ok(f.includes('startUnitTest('), '缺开启按钮');
    assert.ok(f.includes('未答完'), '缺未答完提示');
    assert.ok(f.includes('最近记录'), '缺最近记录');
  });

  test('安全：分发器按 psetSub 分流，自身不展开表单', () => {
    const f = functionBlock('parentSettingsSecurityHtml');
    assert.ok(f.includes("sub === 'pin'"), '缺改 PIN 分流');
    assert.ok(f.includes("sub === 'pw'"), '缺孩子密码分流');
    assert.ok(f.includes('pw-'), '缺单孩密码分流');
    assert.ok(!f.includes('newpin'), '分发器不应含改 PIN 表单');
    assert.ok(!f.includes('cpw-'), '分发器不应含孩子密码表单');
  });

  test('安全列表：修改家长 PIN/孩子密码两个入口', () => {
    const f = functionBlock('parentSecurityListHtml');
    assert.ok(f.includes("psetRow('pin'"), '缺改 PIN 入口');
    assert.ok(f.includes("psetRow('pw'"), '缺孩子密码入口');
    assert.ok(f.includes('已设置'), '孩子密码入口缺已设置数副标');
  });

  test('安全改 PIN 页：表单＋保存', () => {
    const f = functionBlock('parentSecurityPinHtml');
    assert.ok(f.includes('id="newpin"'), '缺 PIN 输入');
    assert.ok(f.includes('saveSecurity()'), '缺修改按钮');
  });

  test('安全孩子密码：按孩子分行，单孩页有设置/重置/清除', () => {
    const list = functionBlock('parentSecurityPwListHtml');
    assert.ok(list.includes("psetRow('pw-' + c.id"), '缺按孩子分行');
    assert.ok(list.includes('已设置') && list.includes('未设置'), '缺状态副标');
    const one = functionBlock('parentSecurityPwChildHtml');
    assert.ok(one.includes('id="cpw-${c.id}"'), '缺密码输入');
    assert.ok(one.includes('saveChildPw('), '缺设置/重置');
    assert.ok(one.includes('clearChildPw('), '缺清除');
  });

  test('题目管理：分发器＋列表（统计＋新增入口＋列表）＋新增页（表单）', () => {
    const f = functionBlock('parentQuestionsHtml');
    assert.ok(f.includes("state.psetSub === 'add'"), '缺新增分流');
    assert.ok(f.includes('parentQuestionAddHtml()'), '缺新增页');
    assert.ok(f.includes('parentQuestionsListHtml()'), '缺列表页');
    const list = functionBlock('parentQuestionsListHtml');
    assert.ok(list.includes('题库统计'), '列表缺统计');
    assert.ok(list.includes("psetRow('add'"), '列表缺新增入口');
    assert.ok(list.includes('我的自定义题'), '列表缺自定义题列表');
    assert.ok(list.includes('qToggle(') && list.includes('qDelete('), '列表缺禁用/删除');
    assert.ok(!list.includes('id="qq"'), '列表不应展开新增表单');
    const add = functionBlock('parentQuestionAddHtml');
    for (const id of ['id="qq"', 'id="qo0"', 'id="qa"', 'id="qsub"', 'id="qex"', 'id="qgr"']) {
      assert.ok(add.includes(id), '新增页缺输入 ' + id);
    }
    assert.ok(add.includes('qAdd()'), '新增页缺添加按钮');
  });

  test('题目管理：qAdd 成功后回列表（清 psetSub 再渲染）', () => {
    const f = fn(app, 'window.qAdd =', 'window.qDelete =');
    assert.ok(f.includes('state.psetSub = null;'), 'qAdd 成功后应清 psetSub 回列表');
  });

  test('合作道馆：分发器＋列表（假期设置/合作记录）＋假期设置页＋合作记录页', () => {
    const f = functionBlock('parentCoopSettingsHtml');
    assert.ok(f.includes("sub === 'settings'"), '缺假期设置分流');
    assert.ok(f.includes("sub === 'records'"), '缺合作记录分流');
    assert.ok(f.includes('parentCoopListHtml()'), '缺列表页');
    const list = functionBlock('parentCoopListHtml');
    assert.ok(list.includes("psetRow('settings'"), '列表缺假期设置入口');
    assert.ok(list.includes("psetRow('records'"), '列表缺合作记录入口');
    // 注意：parentCoopHolidayHtml 体内有行首 window._coopCfg 赋值，functionBlock 会误切，
    // 改用显式起止标记切片。
    const hol = fn(app, 'async function parentCoopHolidayHtml()', 'async function parentCoopRecordsHtml()');
    assert.ok(hol.includes('window._coopCfg = j;'), '假期设置页应设 _coopCfg（保存函数要用）');
    for (const id of ['coopHolId', 'coopHolStart', 'coopHolEnd', 'coopBaseLv', 'coopStatutory']) {
      assert.ok(hol.includes(id), '假期设置页缺输入 ' + id);
    }
    assert.ok(hol.includes('saveCoopHolidayConfig()'), '假期设置页缺保存');
    assert.ok(hol.includes('toggleCoopMaster('), '假期设置页缺总开关');
    assert.ok(!hol.includes('合作记录'), '假期设置页不应含记录列表');
    const rec = fn(app, 'async function parentCoopRecordsHtml()', 'window.parentCoopSettingsHtml =');
    assert.ok(rec.includes('合作记录'), '缺记录标题');
    assert.ok(rec.includes('ov.runs') || rec.includes('runs'), '缺远征记录');
    assert.ok(!rec.includes('coopHolId'), '记录页不应含设置表单');
  });

  test('合作道馆：总开关/保存后局部重渲染，不整页 reload', () => {
    const tog = fn(app, 'window.toggleCoopMaster =', 'window.saveCoopHolidayConfig =');
    assert.ok(tog.includes('renderParent()'), '总开关后应局部重渲染');
    assert.ok(!tog.includes('location.reload()'), '总开关不应整页 reload（会踢出子页）');
    const save = fn(app, 'window.saveCoopHolidayConfig =', '/* -------- 时间模拟');
    assert.ok(save.includes('renderParent()'), '保存后应局部重渲染');
    assert.ok(!save.includes('location.reload()'), '保存后不应整页 reload（会踢出子页）');
  });
});
