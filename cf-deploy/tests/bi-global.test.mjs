// tests/bi-global.test.mjs
// 任务 94 (JS-M1)：bi / biTitle 提全局——21 处本地定义全删，只剩两个全局函数；
// dailyBi 改为一行的 alias；openOak 的 biTx 改读 state.lang。
// 行为等价：全局函数在 en/zh 下的输出与旧本地定义逐字节一致。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');

function extractFn(src, sig) {
  const start = src.indexOf(sig);
  assert.ok(start >= 0, sig + ' not found in app.js.orig');
  let i = src.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error(sig + ' braces not balanced');
}

function loadGlobals(lang) {
  const sandbox = { state: { lang } };
  vm.createContext(sandbox);
  for (const sig of ['function bi(zh, en)', 'function biTitle(zh, en)', 'function dailyBi(zh, en)']) {
    vm.runInContext(extractFn(SRC, sig), sandbox);
  }
  return sandbox;
}

test('本地定义清零：无 const isBi、无本地 const bi/biTitle、无 careBiHelpers', () => {
  assert.equal((SRC.match(/const isBi = state\.lang/g) || []).length, 0);
  assert.equal((SRC.match(/^\s*const bi = /gm) || []).length, 0);
  assert.equal((SRC.match(/^\s*const biTitle = /gm) || []).length, 0);
  assert.ok(!SRC.includes('careBiHelpers'), 'careBiHelpers 已删干净');
});

test('全局 bi / biTitle 存在且只定义一次，位置在 tr 之后', () => {
  assert.equal((SRC.match(/^function bi\(zh, en\) \{/gm) || []).length, 1);
  assert.equal((SRC.match(/^function biTitle\(zh, en\) \{/gm) || []).length, 1);
  assert.ok(SRC.indexOf('function bi(zh, en)') > SRC.indexOf('function tr(zh, en)'));
  assert.ok(SRC.indexOf('function biTitle(zh, en)') > SRC.indexOf('function tr(zh, en)'));
});

test('行为等价：en/zh 下全局输出与旧本地定义逐字节一致', () => {
  const en = loadGlobals('en');
  const zh = loadGlobals('zh');
  const wantEnBi = 'Hello<span class="bi-sub"><br>你好</span>';
  const wantEnTitle = 'Hello<span class="bi-title-zh"> · 你好</span>';
  assert.equal(en.bi('你好', 'Hello'), wantEnBi);
  assert.equal(en.biTitle('你好', 'Hello'), wantEnTitle);
  assert.equal(zh.bi('你好', 'Hello'), '你好');
  assert.equal(zh.biTitle('你好', 'Hello'), '你好');
  // 非 en 语言（如 undefined）同样走中文分支
  const other = loadGlobals('fr');
  assert.equal(other.bi('你好', 'Hello'), '你好');
});

test('dailyBi 是 alias：与 bi 输出一致', () => {
  for (const lang of ['en', 'zh']) {
    const g = loadGlobals(lang);
    assert.equal(g.dailyBi('你好', 'Hello'), g.bi('你好', 'Hello'));
    assert.ok(SRC.includes('function dailyBi(zh, en) { return bi(zh, en); }'));
  }
});

test('openOak 的 biTx 改读 state.lang（原 isBi 已删）', () => {
  const m = SRC.match(/const biTx = \(zh, en\) => state\.lang === 'en' \? /);
  assert.ok(m, 'biTx 应直接读 state.lang');
  assert.equal((SRC.match(/const biTx = /g) || []).length, 1);
});
