/* 仓库底色区分＋底部导航图标风格（任务 69/70，2026-11-09）：
 * 参考小红书圆周派同款 App 图标布局：携带格淡黄底＋金黄边框、仓库格白底＋浅灰边框；
 * 底部导航选中态标签变红加粗、图标保持彩色、选中态与当前页一致。
 * 只断言前端展示源码（app.js.orig / style.css.orig），不碰后端逻辑。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const cssSrc = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');

describe('任务 69：仓库携带/待命底色区分', () => {
  test('主宠格与携带格用淡黄渐变底＋金黄边框', () => {
    const main = appSrc.slice(appSrc.indexOf('class="party-slot main-slot"'), appSrc.indexOf('class="party-slot main-slot"') + 600);
    assert.match(main, /background:linear-gradient\(180deg,#FFFBEB,#FEF3C7\)/);
    assert.match(main, /border:1\.5px solid #D4A017/);
    const carried = appSrc.slice(appSrc.indexOf('class="party-slot carried-slot"'), appSrc.indexOf('class="party-slot carried-slot"') + 700);
    assert.match(carried, /background:linear-gradient\(180deg,#FFFBEB,#FEF3C7\)/);
    assert.match(carried, /1\.5px solid #D4A017/);
  });

  test('换出目标仍用危险红虚线边框（动作态优先于底色；任务 81-P0：#ef4444→var(--danger,#F25C54)）', () => {
    const carried = appSrc.slice(appSrc.indexOf('class="party-slot carried-slot"'), appSrc.indexOf('class="party-slot carried-slot"') + 700);
    assert.match(carried, /isSwapTarget \? '2px dashed var\(--danger,#F25C54\)' : '1\.5px solid #D4A017'/);
  });

  test('仓库格保持白底＋浅灰边框（与携带格形成对照）', () => {
    const wh = appSrc.slice(appSrc.indexOf('function renderWarehouseView()'), appSrc.indexOf('function cancelWarehouseSwap()'));
    assert.match(wh, /background:var\(--card-bg,#fff\);border:\$\{selected \? '2px solid #FF9F43' : '1\.5px solid var\(--border,#e5e7eb\)'\}/);
  });

  test('两卡底部各有一行灰色小字提示（点击会发生什么），双语', () => {
    const wh = appSrc.slice(appSrc.indexOf('function renderWarehouseView()'), appSrc.indexOf('function cancelWarehouseSwap()'));
    assert.match(wh, /点击携带宠 → 送回仓库休息/);
    assert.match(wh, /Tap a carried partner → send back to storage/);
    assert.match(wh, /点击仓库宠 → 加入随身队伍/);
    assert.match(wh, /Tap a stored partner → join the party/);
  });

  test('携带提示只在有携带宠且非交换时显示（交换横幅已说明换出流程，不重复）', () => {
    const wh = appSrc.slice(appSrc.indexOf('function renderWarehouseView()'), appSrc.indexOf('function cancelWarehouseSwap()'));
    assert.match(wh, /carried\.length && !swapPendingTakeNo \? `<div/);
    assert.match(wh, /stored\.length \? `<div/);
  });
});

describe('任务 70：底部导航图标风格', () => {
  test('选中态标签变深棕 #B54A00 加粗（返工 2026-11-14 item 2：--orange-d #F08A24 对比度 2.51:1 改为 #B54A00；图标保持彩色，不随选中态变灰）', () => {
    assert.match(cssSrc, /\.tabbar button\.on\{color:var\(--tab-on\);font-weight:600\}/);
  });

  test('选中态仍保留深棕顶条（双重提示，不冲突）', () => {
    assert.match(cssSrc, /\.tabbar button\.on::before\{content:"";position:absolute;top:0;left:30%;right:30%;height:4px;border-radius:0 0 4px 4px;background:var\(--tab-on\)\}/);
  });

  test('标签不换行（390px 下图标与标签不得换行、不得用省略号藏字）', () => {
    assert.match(cssSrc, /\.tabbar button\{[^}]*white-space:nowrap[^}]*\}/);
  });

  test('英文模式标签字号 14px（Companions 在 16px 粗体下宽 101px，超 tab 格约 89px 内容宽；14px 约 88px 才放得下）', () => {
    assert.match(cssSrc, /\.lang-en \.tabbar button\{font-size:14px\}/);
  });

  test('图标用小程序图标母版两态 PNG（2026-11-13 网页版图标同步更新）', () => {
    const tab = appSrc.slice(appSrc.indexOf('function tabbar()'), appSrc.indexOf('/* 孩子子页常驻顶栏'));
    assert.match(tab, /<span class="e">\$\{ic\(\['child', 'eggs', 'encounter', 'daily-english', 'backpack'\], 'tab-home'\)\}<\/span>\$\{tr\(\.\.\.LANG\.companions\)\}/);
    assert.match(tab, /<span class="e">\$\{ic\(\['checkin', 'subject'\], 'tab-checkin'\)\}<\/span>\$\{tr\(\.\.\.LANG\.checkin\)\}/);
    assert.match(tab, /<span class="e">\$\{ic\(\['gym'\], 'tab-gym'\)\}<\/span>\$\{tr\(\.\.\.LANG\.gym\)\}/);
    assert.match(tab, /<span class="e">\$\{ic\(\['pokedex'\], 'tab-pokedex'\)\}<\/span>\$\{tr\(\.\.\.LANG\.pokedex\)\}/);
    assert.doesNotMatch(tab, /🐾|📝|🏯|📖/);
    assert.doesNotMatch(tab, /ic\('(paw|pencil|swords|book)'\)/);
  });

  test('选中态与当前页一致：每日英语与背包归属伙伴 tab（子页不再无高亮）', () => {
    const tab = appSrc.slice(appSrc.indexOf('function tabbar()'), appSrc.indexOf('/* 孩子子页常驻顶栏'));
    assert.match(tab, /on\(\['child', 'eggs', 'encounter', 'daily-english', 'backpack'\]\)/);
  });

  test('对战页不归属任何 tab（道馆战与兄弟对战共用 battle 视图，不硬指一个，避开错高亮）', () => {
    const tab = appSrc.slice(appSrc.indexOf('function tabbar()'), appSrc.indexOf('/* 孩子子页常驻顶栏'));
    assert.doesNotMatch(tab, /'battle'/);
  });
});
