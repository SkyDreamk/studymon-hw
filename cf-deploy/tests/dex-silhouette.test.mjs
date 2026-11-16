// P0 图鉴剪影：未收集格为 --text-2 mask 剪影＋编号＋？？？，不露名字和条件。
// 关键边界：dex151 分支必须以 e.img 为守卫——无图时只留编号＋???，不留 80px 空洞；
// 有图时（主分册锁定项、门关闭形态服务端给图）才渲染 dex-sil。
// 2026-10-29 Option A 后，门关闭形态服务端也返回 img（名字仍 null）；img:null 仅为防御分支。
// 测试站 TEST_MODE 会全开图鉴门（全部 unlocked），剪影分支在测试站跑不到，
// 故此处用抽取真实函数＋fixture 的方式验证，不依赖线上状态。
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { assetPath } from './asset-path.mjs';

const app = () => readFileSync(assetPath('app.js'), 'utf8');
const css = () => readFileSync(assetPath('style.css'), 'utf8');

function sliceFn(source, startMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error('not found: ' + startMarker);
  let i = source.indexOf('{', start);
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces');
}

function loadDexSlot() {
  const factory = new Function('esc', 'eggHtml', 'EGG_FALLBACK',
    sliceFn(app(), 'function dexSlot(e, key) {') + '\nreturn dexSlot;');
  return factory((s) => String(s ?? ''), () => 'EGG', {});
}

function loadToggle(dex151) {
  // 注意：new Function 体是全局作用域，看不到本函数局部变量，因此 stub 全部在 factory 体内定义。
  // 任务 74：toggleDex151 改走 dex151SlotHtml＋dexFilterMatch（151 网格参与图鉴筛选），
  // 故须一并抽进筛选状态与纯函数（默认筛选全匹配，不影响剪影断言）。
  const factory = new Function('dexData', 'esc', 'eggHtml', 'EGG_FALLBACK', 'tr',
    sliceFn(app(), 'function dexSlot(e, key) {') + '\n'
    + "let dexFilter = { scope: 'all', type: null };\n"
    + 'let dex151Open = false;\n'
    + sliceFn(app(), 'function dexEntryTypes(e) {') + '\n'
    + sliceFn(app(), 'function dexFilterMatch(e) {') + '\n'
    + sliceFn(app(), 'function dex151SlotHtml(e) {') + '\n'
    + "const bodyStub = { innerHTML: '', hasChildNodes() { return this.innerHTML.length > 0; } };\n"
    + "const gridStub = { hidden: true, querySelector: (sel) => (sel === '.dex' ? bodyStub : null) };\n"
    + "const buttonStub = { textContent: '展开 ▸', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };\n"
    + "const sectionStub = { querySelector: (sel) => (sel === '#dex151-grid' ? gridStub : sel === '.dex151-toggle' ? buttonStub : null) };\n"
    + "const document = { getElementById: (id) => (id === 'dex151-section' ? sectionStub : null) };\n"
    + 'const window = {};\n'
    + sliceFn(app(), 'window.toggleDex151 = function() {') + '\n'
    + 'window.toggleDex151(); return bodyStub.innerHTML;');
  return factory({ dex151 }, (s) => String(s ?? ''), () => 'EGG', {}, (zh) => zh);
}

describe('dex silhouette (P0)', () => {
  test('dexSlot 锁定＋有图：mask 剪影＋编号＋？？？，不用原图 img', () => {
    const dexSlot = loadDexSlot();
    const html = dexSlot({ no: 42, unlocked: false, img: '/static/img/p42.webp' }, 'wild:42');
    assert.match(html, /dex-sil/);
    assert.match(html, /mask-image:url\(\/static\/img\/p42\.webp\)/);
    assert.match(html, /No\.42/);
    assert.match(html, /？？？/);
    assert.doesNotMatch(html, /<img/);
  });

  test('dexSlot 锁定＋无图：走蛋 fallback，不渲染剪影', () => {
    const dexSlot = loadDexSlot();
    const html = dexSlot({ no: null, unlocked: false, img: null, egg: {} }, 'egg:x');
    assert.doesNotMatch(html, /dex-sil/);
    assert.match(html, /EGG/);
  });

  test('dexSlot 已获得：原图＋名字，无剪影', () => {
    const dexSlot = loadDexSlot();
    const html = dexSlot({ no: 25, unlocked: true, name: '皮卡丘', img: '/static/img/p25.webp' }, 'dex:25');
    assert.match(html, /<img/);
    assert.match(html, /皮卡丘/);
    assert.doesNotMatch(html, /dex-sil/);
  });

  test('dex151 锁定＋无图（防御分支）：只留编号＋???，无剪影空洞', () => {
    const dex151 = Array.from({ length: 151 }, (_, i) => {
      const no = i + 1;
      return no === 25
        ? { no, unlocked: true, name: '皮卡丘', img: '/static/img/p25.webp' }
        : { no, unlocked: false, name: null, img: null };
    });
    const html = loadToggle(dex151);
    assert.doesNotMatch(html, /dex-sil/);
    assert.match(html, /No\.42/);
    assert.match(html, /\?\?\?/);
  });

  test('dex151 锁定＋有图：渲染剪影', () => {
    const dex151 = Array.from({ length: 151 }, (_, i) => {
      const no = i + 1;
      return no === 25
        ? { no, unlocked: true, name: '皮卡丘', img: '/static/img/p25.webp' }
        : { no, unlocked: false, name: null, img: '/static/img/p42.webp' };
    });
    const html = loadToggle(dex151);
    assert.match(html, /dex-sil/);
  });

  test('dex-sil CSS：--text-2 填色＋contain mask＋80px 图块', () => {
    const c = css();
    assert.match(c, /\.dex-sil\{[^}]*background:var\(--text-2\)/);
    assert.match(c, /\.dex-sil\{[^}]*mask-size:contain/);
    assert.match(c, /\.dex-sil\{[^}]*width:80px;height:80px/);
  });
});
