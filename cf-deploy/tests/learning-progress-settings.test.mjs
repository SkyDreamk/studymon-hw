/**
 * 运行命令：node --test tests/learning-progress-settings.test.mjs
 * 真实 Azure 调用 0 次
 * 仅对 public/static/app.js.orig 做源码断言，不运行浏览器、不连接后端。
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

// 按下一段函数声明或 window 入口截取，避免断言误匹配文件中的其他旧代码。
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

  return fn(
    app,
    startMarker,
    nextDeclaration ? nextDeclaration[0] : undefined
  );
}

function saveBlock() {
  return fn(app, 'window.saveSettings = async', 'window.saveSecurity');
}

// 2026-11-16：学习进度页并入用户管理页（每孩一块：名字、年级标签、三科进度；五项打卡设置全站共用一块）
// 2026-11-16 任务 130：用户管理改一级-二级栏目——每孩设置与打卡设置各进独立详情页，
// parentSettingsFieldsHtml 拆为 parentChildSettingsHtml（单孩）与 parentCheckinSettingsHtml（五项）；
// saveSettings 只保存当前页在 DOM 里的区块（后端本就支持分段更新）。
describe('三门分块渲染（在用户管理页里）', () => {
  test('学习进度独立页、别名与保存入口已删除，helper 仍在', () => {
    assert.doesNotMatch(app, /parentSettingsLearningHtml|parentSettingsMathHtml/);
    assert.doesNotMatch(app, /saveLearningProgress|saveMathProgress/);
    assert.doesNotMatch(app, /psetOpen\('math'\)/);
    assert.doesNotMatch(app, /case 'math'/);
    for (const helper of [
      'gradeNumFromGradeLabel',
      'chineseUnitOptions',
      'englishUnitOptions',
      'progressView',
      'learningSelectHtml',
    ]) {
      assert.ok(functionBlock(helper).length > 0, '缺 helper ' + helper);
    }
  });

  test('每个孩子块里有名字、年级标签和语文、数学、英语三个下拉及对应 label', () => {
    const block = functionBlock('parentChildSettingsHtml');
    for (const id of ['nm-${c.id}', 'gr-${c.id}', "'cp-' + c.id", "'mp-' + c.id", "'ep-' + c.id"]) {
      assert.ok(block.includes(id), '用户管理缺 id：' + id);
    }
    for (const label of [
      '${esc(c.name)}的语文进度',
      '${esc(c.name)}的数学进度',
      '${esc(c.name)}的英语进度',
    ]) {
      assert.ok(block.includes(label), '缺 label：' + label);
    }
    // 三个下拉在名字/年级行之后；数学不使用本地列表；超前提示在单孩页
    assert.ok(block.indexOf("'cp-' + c.id") > block.indexOf('gr-${c.id}'));
    assert.match(block, /progressView\(\s*c\.mathProgress\s*,\s*null\s*,/);
    assert.ok(block.includes('题目只会从学到过的单元里出，不会超前。改完从明天的题目开始生效（今天已出的题单不变）。'));
  });

  test('五项打卡设置与范围说明只出现一次（全站共用，单独一页）；数学不使用本地列表', () => {
    const block = functionBlock('parentCheckinSettingsHtml');
    assert.equal((block.match(/<div class="grid2 formgrid">/g) || []).length, 1);
    for (const id of ['subjectxp', 'basexp', 'quizxp', 'quizrepeat', 'cutoff']) {
      assert.equal((block.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, id);
    }
    assert.equal((block.match(/范围：每科 1–100、基础 10–200、问答 0–100、不重复 7–90 天；基础经验兼容旧口径/g) || []).length, 1);
    // 打卡设置页不含孩子循环与三科下拉
    assert.doesNotMatch(block, /kids\.map|learningSelectHtml|nm-\$\{c\.id\}/);
  });

  test('打卡设置页只有一个保存按钮：保存设置；单孩页有自己的保存按钮', () => {
    const block = functionBlock('parentCheckinSettingsHtml');
    assert.equal((block.match(/<button class="bigbtn"/g) || []).length, 1);
    assert.ok(block.includes('<button class="bigbtn" onclick="saveSettings()">保存设置</button>'));
    const childBlock = functionBlock('parentChildSettingsHtml');
    assert.ok(childBlock.includes('<button class="bigbtn" onclick="saveSettings()">保存</button>'));
  });
});

describe('学习进度改名与摘要', () => {
  test('设置列表没有学习进度行；列表无摘要小字', () => {
    const listBlock = fn(app, 'function parentSettingsListHtml', 'function parentChildSettingsHtml');
    assert.doesNotMatch(listBlock, /学习进度/);
    assert.ok(listBlock.includes('用户管理'));
    assert.doesNotMatch(app, /learningSummary/);
    assert.doesNotMatch(app, /summaryChild/);
  });

  test('全文不再使用数学学习进度或保存数学进度旧文案', () => {
    assert.doesNotMatch(app, /数学学习进度/);
    assert.doesNotMatch(app, /保存数学进度/);
    assert.doesNotMatch(app, /保存学习进度/);
  });
});

describe('分段保存（任务 130：只发当前页在的区块）', () => {
  test('保存循环分别收集数学、语文、英语下拉值', () => {
    const block = saveBlock();
    for (const [array, element] of [
      ['mathProgress', 'mpEl'],
      ['chineseProgress', 'cpEl'],
      ['englishProgress', 'epEl'],
    ]) {
      const pattern = new RegExp(
        '\\b' + array +
        '\\.push\\(\\s*\\{\\s*id:\\s*c\\.id\\s*,\\s*chapter:\\s*reset\\s*\\?\\s*\'\'\\s*:\\s*' +
        element + '\\.value\\s*\\}\\s*\\)'
      );
      assert.match(block, pattern);
    }
    assert.equal((block.match(/Progress\.push\s*\(/g) || []).length, 3);
  });

  test('年级标签被改动时，该孩子三科进度这次清回默认', () => {
    const block = saveBlock();
    assert.match(block, /const reset = grade\.trim\(\) !== String\(c\.grade \|\| ''\)\.trim\(\);/);
  });

  test('一次设置更新请求提交 body；只含当前页在的区块', () => {
    const block = saveBlock();
    assert.equal(
      (block.match(/\/api\/parent\/settings\/update/g) || []).length,
      1
    );
    assert.match(block, /api\(\s*'\/api\/parent\/settings\/update'\s*,\s*body\s*\)/);
    // 不在当前页的孩子跳过（输入不在 DOM 里）
    assert.match(block, /const nmEl = document\.getElementById\('nm-' \+ c\.id\);/);
    assert.match(block, /if \(!nmEl\) continue;/);
    // 五项只在输入在 DOM 里时才进 body
    assert.match(block, /const xpMap = \{ basexp: 'baseXp', subjectxp: 'subjectXp', quizxp: 'quizXp', quizrepeat: 'quizRepeatDays', cutoff: 'cutoffTime' \};/);
    assert.match(block, /if \(!el\) continue;/);
    // 当前页无可保存项时不发请求
    assert.match(block, /if \(!Object\.keys\(body\)\.length\) return;/);
  });

  test('保存保留失败提示，且不通过 filter 丢弃空值', () => {
    const block = saveBlock();
    assert.ok(
      block.includes("alert(j.ok ? '已保存' : (j.error || '保存失败'))"),
      '缺保存成功或失败提示原文'
    );
    assert.doesNotMatch(block, /\.filter\s*\(/);
  });
});

describe('390px 无截断相关源码断言', () => {
  test('完整保存按钮存在，按钮所在行没有 nowrap 或 ellipsis', () => {
    const button = '<button class="bigbtn" onclick="saveSettings()">保存设置</button>';
    assert.ok(app.includes(button), '缺完整保存设置按钮');
    const buttonLines = app.split(/\r?\n/).filter((line) => line.includes(button));
    assert.ok(buttonLines.length > 0, '未找到保存按钮所在行');
    for (const line of buttonLines) {
      assert.doesNotMatch(line, /nowrap|ellipsis/i);
    }
  });

  test('默认文案完整存在，重复的 defaultHint 描述已删（§92 回归）', () => {
    for (const text of [
      '未设置（默认：上册第2单元）',
      '未设置（默认：上册 Unit 2）',
    ]) {
      assert.ok(app.includes(text), '缺默认文案：' + text);
    }
    assert.doesNotMatch(app, /defaultHint/);
    assert.doesNotMatch(app, /未设置，当前用默认/);
    const selectBlock = functionBlock('learningSelectHtml');
    assert.doesNotMatch(selectBlock, /isDefault \? `<div/);

    assert.ok(
      functionBlock('englishUnitOptions').includes('（自产）'),
      '英语单元缺自产附注'
    );
  });

  test('语文四个学期各列出第1至第8单元，无主题附注', () => {
    const block = functionBlock('chineseUnitOptions');

    assert.equal((block.match(/三年级上册 第/g) || []).length, 8);
    assert.equal((block.match(/三年级下册 第/g) || []).length, 8);
    assert.equal((block.match(/一年级上册 第/g) || []).length, 8);
    assert.equal((block.match(/一年级下册 第/g) || []).length, 8);

    for (const semester of [
      '三年级上册',
      '三年级下册',
      '一年级上册',
      '一年级下册',
    ]) {
      for (let unit = 1; unit <= 8; unit += 1) {
        const text = `${semester} 第${unit}单元`;
        assert.ok(block.includes(text), '缺语文单元：' + text);
      }
    }

    assert.doesNotMatch(block, /识字|汉语拼音|阅读/);
  });

  test('英语三年级上册7单元，其余学期6单元，一年级逐项带自产附注', () => {
    const block = functionBlock('englishUnitOptions');

    assert.equal((block.match(/三年级上册 Unit /g) || []).length, 7);
    assert.equal((block.match(/三年级下册 Unit /g) || []).length, 6);
    assert.equal((block.match(/一年级上册 Unit /g) || []).length, 6);
    assert.equal((block.match(/一年级下册 Unit /g) || []).length, 6);

    for (const text of [
      '三年级上册 Unit 1 Making friends',
      '三年级上册 Unit 2 Different families',
      '三年级上册 Unit 3 Our animal friends',
      '三年级上册 Unit 4 Plants around us',
      '三年级上册 Unit 5 The colourful world',
      '三年级上册 Unit 6 Useful numbers',
      '三年级上册 Unit 7 Revision: Being a good guest',
      '三年级下册 Unit 1 Meeting new people',
      '三年级下册 Unit 2 My words and actions',
      '三年级下册 Unit 3 Tools and senses for learning',
      '三年级下册 Unit 4 Healthy food',
      '三年级下册 Unit 5 Old things',
      '三年级下册 Unit 6 Numbers in life',
      '一年级上册 Unit 1 Hello!（自产）',
      '一年级上册 Unit 2 My Body（自产）',
      '一年级上册 Unit 3 Colours（自产）',
      '一年级上册 Unit 4 Numbers（自产）',
      '一年级上册 Unit 5 School Things（自产）',
      '一年级上册 Unit 6 Animals（自产）',
      '一年级下册 Unit 1 In the Classroom（自产）',
      '一年级下册 Unit 2 My Family（自产）',
      '一年级下册 Unit 3 Fruit（自产）',
      '一年级下册 Unit 4 Toys（自产）',
      '一年级下册 Unit 5 Weather（自产）',
      '一年级下册 Unit 6 Farm Animals（自产）',
    ]) {
      assert.ok(block.includes(text), '缺英语单元或自产附注：' + text);
    }
  });
});
