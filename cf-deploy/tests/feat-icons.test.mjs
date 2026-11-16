/* 打卡网站图标 07–12（2026-11-13，用户发母版包）：1024×1024 RGBA 透明 PNG，
 * 外圈 2px 全透明、无白边。转 96×96 WebP q90 进 public/static/img/feat/（与 tab 图标同款），
 * 接进大木博士之家三按钮与道馆页两处标题。12-训练师档案网站暂无落点，先不接。
 * 只断言前端展示源码（app.js.orig / style.css.orig）与磁盘图标文件，不碰后端逻辑。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const cssSrc = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');

const FEAT = ['badge-wall', 'gym-challenge', 'partner-care', 'pokemon-storage', 'wheel-hub'];

describe('打卡网站图标 07–11（2026-11-13）', () => {
  test('5 张 96×96 WebP 已落盘', () => {
    for (const n of FEAT) {
      assert.ok(existsSync(new URL(`../public/static/img/feat/${n}.webp`, import.meta.url)), `missing feat icon ${n}`);
    }
  });

  test('大木博士之家三按钮用图标，不用 emoji/线图标', () => {
    assert.ok(appSrc.includes('<img class="btn-ic" src="/static/img/feat/pokemon-storage.webp"'), '仓库按钮未用图标');
    assert.ok(appSrc.includes('<img class="btn-ic" src="/static/img/feat/partner-care.webp"'), '养成按钮未用图标');
    assert.ok(appSrc.includes('<img class="btn-ic" src="/static/img/feat/wheel-hub.webp"'), '转盘按钮未用图标');
    const hub = appSrc.slice(appSrc.indexOf('async function openOak('), appSrc.indexOf('window.openOak'));
    assert.ok(!hub.includes('📦'), '屋内仍有 📦');
    assert.ok(!hub.includes('🎡'), '屋内仍有 🎡');
    assert.ok(!hub.includes("ic('heart')"), '屋内养成仍用线图标');
  });

  test('道馆页两处标题用图标', () => {
    assert.ok(appSrc.includes('<img class="sec-ic" src="/static/img/feat/badge-wall.webp"'), '徽章墙标题未用图标');
    assert.ok(appSrc.includes('<img class="sec-ic" src="/static/img/feat/gym-challenge.webp"'), '道馆闯关标题未用图标');
    assert.ok(!appSrc.includes("${ic('award')} ${biTitle(`我的徽章墙"), '徽章墙标题仍用线图标');
    assert.ok(!appSrc.includes("${ic('swords')} ${biTitle(`道馆闯关"), '道馆闯关标题仍用线图标');
  });

  test('图标尺寸规则在 style.css.orig', () => {
    assert.ok(cssSrc.includes('.bigbtn img.btn-ic{width:32px;height:32px'), '缺 .btn-ic 规则');
    assert.ok(cssSrc.includes('.section-title img.sec-ic{width:28px;height:28px'), '缺 .sec-ic 规则');
  });
});
