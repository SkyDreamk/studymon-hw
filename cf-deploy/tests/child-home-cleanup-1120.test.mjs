/* 孩子页四项清理（2026-11-20 用户三图反馈）：图1碎片说明移出伙伴页主区、只在招式展开弹框显示；
 * 图2孩子页不再直接列试卷审批，顶部连击 chip 点开打卡日志页（连击＋审批）；图3科目下拉加期末考试
 * （孩子＋家长两表）、删 Final exam 快捷按钮、选期末考试自动填考试名；图3满分不再预填 100，
 * 留空默认 100（后端 || 100 已有）、标签去掉（默认 100）。只断言前端源码，不碰后端逻辑。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');

describe('孩子页四项清理（2026-11-20）', () => {
  test('图1：伙伴页主区不再显示碎片说明行', () => {
    assert.ok(!appSrc.includes('${quiz.fragments >= 3'), '伙伴页仍有碎片说明三元块');
    assert.ok(!appSrc.includes('再答对 ${quiz.nextFragmentIn} 题得下一块'), '伙伴页仍有“再答对 N 题”说明');
  });

  test('图1：招式展开弹框里有碎片说明行（renderMoveDetail）', () => {
    assert.ok(appSrc.includes('_fragLine'), 'renderMoveDetail 未加碎片说明行');
    assert.ok(appSrc.includes("bi('技能碎片 ', 'Skill fragments ')"), '弹框碎片行文案缺失');
    assert.ok(appSrc.includes('3枚可给一个招式升1级'), '弹框碎片行升级说明缺失');
  });

  test('图1：图鉴卡片里的碎片行不动（已是展开态）', () => {
    assert.ok(appSrc.includes('${bi(...LANG.childSlice2Fragments)}${dexFrags}/3'), '图鉴卡片碎片行被误删');
  });

  test('图2：顶部连击 chip 是日志按钮，点开打卡日志', () => {
    assert.ok(appSrc.includes('<button type="button" class="topchip"'), '顶部连击仍是 span，不是按钮');
    assert.ok(appSrc.includes('onclick="openCheckinLog(${k.id})"'), '连击按钮未接 openCheckinLog');
    assert.ok(appSrc.includes('function openCheckinLog(childId)'), 'openCheckinLog 未定义');
    assert.ok(appSrc.includes('window.openCheckinLog = openCheckinLog'), 'openCheckinLog 未挂 window');
  });

  test('图2：打卡日志页含连击情况＋试卷审批记录', () => {
    const i = appSrc.indexOf('function openCheckinLog(childId)');
    assert.ok(i > 0, 'openCheckinLog 未找到');
    const body = appSrc.slice(i, i + 4000);
    assert.ok(body.includes("api('/api/child?id=' + childId)"), '日志页未拉孩子数据（连击/本周）');
    assert.ok(body.includes("api('/api/child/school-tests?childId=' + childId)"), '日志页未拉试卷审批记录');
    assert.ok(body.includes('连续打卡'), '日志页未显示连续打卡');
    assert.ok(body.includes('本周已打卡'), '日志页未显示本周打卡');
    assert.ok(body.includes('试卷上传审批'), '日志页未显示试卷审批标题');
    assert.ok(body.includes('goChild(${childId})'), '日志页返回未接 goChild');
  });

  test('图2：孩子页上传成绩入口只剩按钮，不再列审批记录', () => {
    const i = appSrc.indexOf('async function loadSchoolTestEntry(childId)');
    assert.ok(i > 0, 'loadSchoolTestEntry 未找到');
    const end = appSrc.indexOf('/* 打卡日志', i);
    assert.ok(end > i, '打卡日志注释未找到');
    const body = appSrc.slice(i, end);
    assert.ok(body.includes('openSchoolTestUpload'), '上传按钮缺失');
    assert.ok(!body.includes('school-tests?childId'), '孩子页仍在拉试卷审批记录');
    assert.ok(!body.includes('slice(0, 5)'), '孩子页仍在列审批记录');
  });

  test('图3：科目下拉框有期末考试（孩子＋家长两表），快捷按钮已删', () => {
    assert.ok(appSrc.includes('<option>期末考试</option></select>'), '科目下拉未加期末考试');
    assert.ok(!appSrc.includes("class=\"smallbtn\" onclick=\"document.getElementById('cst-unit').value='期末考试'\""), '孩子表 Final exam 快捷按钮仍在');
    assert.ok(!appSrc.includes("class=\"smallbtn\" onclick=\"document.getElementById('st-unit-${c.id}').value='期末考试'\""), '家长表期末考试快捷按钮仍在');
    assert.ok(appSrc.includes("if(this.value==='期末考试')"), '选期末考试未自动填考试名');
  });

  test('图3：满分不再预填 100，标签去掉默认，留空即默认 100', () => {
    assert.ok(!appSrc.includes('满分（默认 100）'), '满分标签仍有（默认 100）');
    assert.ok(!appSrc.includes('Full score (default 100)'), '满分英文标签仍有 (default 100)');
    assert.ok(!appSrc.includes('id="cst-full" value="100"'), '孩子表满分仍预填 100');
    assert.ok(!appSrc.includes('id="st-full-${c.id}" value="100"'), '家长表满分仍预填 100');
    assert.ok(appSrc.includes('placeholder="${tr(\'默认 100\', \'Default 100\')}"'), '孩子表满分缺“默认 100”占位提示');
    assert.ok(appSrc.includes('placeholder="默认 100"'), '家长表满分缺“默认 100”占位提示');
  });

  test('满分留空仍默认 100（后端 || 100 未动）', () => {
    assert.ok(appSrc.includes("const fullScore = Number(document.getElementById('cst-full').value) || 100;"), '孩子表满分默认值逻辑被改');
    assert.ok(appSrc.includes("const fullScore = Number(document.getElementById('st-full-' + childId).value) || 100;"), '家长表满分默认值逻辑被改');
  });
});
