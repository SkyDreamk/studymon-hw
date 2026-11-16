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
  return fn(app, 'window.saveLearningProgress', 'window.saveSecurity');
}

describe('三门分块渲染', () => {
  test('学习进度详情函数存在，并使用学习进度标题', () => {
    const block = functionBlock('parentSettingsLearningHtml');
    assert.match(block, /function\s+parentSettingsLearningHtml\s*\(\s*s\s*\)/);
    assert.ok(block.includes('学习进度'), '详情缺学习进度标题');

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

  test('每个孩子有语文、数学、英语三个下拉及对应 label', () => {
    const block = functionBlock('parentSettingsLearningHtml');

    for (const id of ["'cp-' + c.id", "'mp-' + c.id", "'ep-' + c.id"]) {
      assert.ok(block.includes(id), '详情缺下拉 id：' + id);
    }

    for (const label of [
      '${esc(c.name)}的语文进度',
      '${esc(c.name)}的数学进度',
      '${esc(c.name)}的英语进度',
    ]) {
      assert.ok(block.includes(label), '详情缺 label：' + label);
    }
  });

  test('孩子分块上下排列，不使用 grid2；数学不使用本地列表', () => {
    const block = functionBlock('parentSettingsLearningHtml');
    assert.doesNotMatch(block, /grid2/);
    assert.match(block, /progressView\(\s*c\.mathProgress\s*,\s*null\s*,/);
  });

  test('旧数学详情函数保留为学习进度详情的薄别名', () => {
    const block = functionBlock('parentSettingsMathHtml');
    assert.match(
      block,
      /function\s+parentSettingsMathHtml\s*\(\s*s\s*\)\s*\{\s*return\s+parentSettingsLearningHtml\(s\);\s*\}/
    );
  });
});

describe('学习进度改名与摘要', () => {
  test('列表行保留 math 路由，学习进度行只有标题无小字（§83 形态，§92 回归）', () => {
    assert.match(
      app,
      /<button class="pset-row" onclick="psetOpen\('math'\)"><span class="pset-ic">[\s\S]*?<span class="pset-t">学习进度<\/span><\/span><span class="pset-c">›<\/span><\/button>/
    );
    assert.doesNotMatch(app, /learningSummary/);
    assert.doesNotMatch(app, /summaryChild/);
    const listBlock = fn(app, 'function parentSettingsListHtml', 'function learningSelectHtml');
    assert.doesNotMatch(listBlock, /学习进度<\/span><span class="pset-s">/);
  });

  test('全文不再使用数学学习进度或保存数学进度旧文案', () => {
    assert.doesNotMatch(app, /数学学习进度/);
    assert.doesNotMatch(app, /保存数学进度/);
  });
});

describe('一次保存发三数组', () => {
  test('保存循环分别收集数学、语文、英语下拉值', () => {
    const block = saveBlock();

    for (const [array, element] of [
      ['mathProgress', 'mpEl'],
      ['chineseProgress', 'cpEl'],
      ['englishProgress', 'epEl'],
    ]) {
      const pattern = new RegExp(
        '\\b' + array +
        '\\.push\\(\\s*\\{\\s*id:\\s*c\\.id\\s*,\\s*chapter:\\s*' +
        element + '\\.value\\s*\\}\\s*\\)'
      );
      assert.match(block, pattern);
    }

    assert.equal((block.match(/\.push\s*\(/g) || []).length, 3);
  });

  test('三数组通过一次设置更新请求提交', () => {
    const block = saveBlock();
    assert.equal(
      (block.match(/\/api\/parent\/settings\/update/g) || []).length,
      1
    );
    assert.match(
      block,
      /api\(\s*'\/api\/parent\/settings\/update'\s*,\s*\{\s*mathProgress\s*,\s*chineseProgress\s*,\s*englishProgress\s*\}\s*\)/
    );
  });

  test('保存保留失败提示，且不通过 filter 丢弃空值', () => {
    const block = saveBlock();
    assert.ok(
      block.includes("alert(j.ok ? '已保存' : (j.error || '保存失败'))"),
      '缺保存成功或失败提示原文'
    );
    assert.doesNotMatch(block, /\.filter\s*\(/);
  });

  test('旧保存入口指向新的学习进度保存入口', () => {
    const block = saveBlock();
    assert.ok(
      block.includes('window.saveMathProgress = window.saveLearningProgress;'),
      '缺旧保存入口别名'
    );
  });
});

describe('390px 无截断相关源码断言', () => {
  test('完整保存按钮存在，按钮所在行没有 nowrap 或 ellipsis', () => {
    const button =
      '<button class="bigbtn" onclick="saveLearningProgress()">保存学习进度</button>';

    assert.ok(app.includes(button), '缺完整保存学习进度按钮');
    assert.ok(
      app.includes('onclick="saveLearningProgress()">保存学习进度</button>'),
      '保存按钮文案或 onclick 不完整'
    );

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
