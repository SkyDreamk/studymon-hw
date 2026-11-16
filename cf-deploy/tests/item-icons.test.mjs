/* 全站图标统一换卡米猫风格（任务 72，2026-11-09）：
 * 来源：小红书游戏卡米猫《只剩个头》笔记图 1/图 2 技能栏特写（见 icon-style-reference.md）。
 * 属性图标 10 张（9 种＋妖精新补）＋道具图标 31 张，均为生成图 webp（圆角方卡＋同色渐变底＋粗描边＋白高光）。
 * 只断言前端展示源码（app.js.orig / style.css.orig / hash-assets.mjs）与磁盘图标文件，不碰后端逻辑与规则。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { assetHash } from './asset-path.mjs';

const H = assetHash();
assert.match(H || '', /^[0-9a-f]{8}$/, '先跑 node scripts/hash-assets.mjs');

const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const cssSrc = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');
const hashSrc = readFileSync(new URL('../scripts/hash-assets.mjs', import.meta.url), 'utf8');

const TYPE_SLUGS = ['electric', 'fire', 'water', 'grass', 'ground', 'rock', 'normal', 'flying', 'dragon', 'fairy'];
const ITEM_SLUGS = [
  'stone-thunder', 'stone-fire', 'stone-water', 'stone-leaf', 'stone-ice', 'stone-sun', 'stone-moon', 'stone-fairy-skill',
  'ball', 'ball-hyper', 'ball-master',
  'medicine-potion', 'medicine-super-potion', 'medicine-berry-juice', 'medicine-water', 'medicine-revive',
  'care-apple', 'care-berry', 'care-cookie', 'care-meat', 'care-milk', 'care-honey',
  'care-bubble', 'care-shower', 'care-petal', 'care-herb',
  'item-metal-coat', 'item-electirizer', 'item-protector', 'item-black-augurite', 'item-xp',
];

describe('任务 72：属性图标 10 张 webp（含妖精新补）', () => {
  test('TYPE_EN 含妖精→fairy，共 10 种属性', () => {
    assert.match(appSrc, /'妖精': 'fairy'/);
    for (const [zh, en] of [['电', 'electric'], ['火', 'fire'], ['水', 'water'], ['草', 'grass'], ['岩石', 'rock'], ['地面', 'ground'], ['普通', 'normal'], ['飞行', 'flying'], ['龙', 'dragon'], ['妖精', 'fairy']]) {
      assert.ok(appSrc.includes(`'${zh}': '${en}'`), zh);
    }
  });

  test('属性图标引用全是 webp，无 svg 残留', () => {
    assert.equal(appSrc.includes('/static/img/types/${TYPE_EN[m.type]'), true);
    // 2026-11-13 任务 106：两处 moveicons 渲染改走 moveIconSrc，属性图标模板只剩兜底里的 1 处
    assert.equal((appSrc.match(/\/static\/img\/types\/\$\{TYPE_EN\[m\.type\] \|\| 'normal'\}\.webp/g) || []).length, 1);
    assert.equal((appSrc.match(/\/static\/img\/types\/\$\{en\}\.webp/g) || []).length, 2); // typeChip 1 处＋任务 74 图鉴筛选 chip 1 处
    assert.equal(appSrc.includes('.svg'), false);
  });

  test('磁盘上有 10 张属性图标 webp（轮换后为 hash 名），旧 SVG 已删', () => {
    const files = readdirSync(new URL('../public/static/img/types', import.meta.url));
    for (const slug of TYPE_SLUGS) assert.ok(files.includes(`${slug}.${H}.webp`), slug);
    assert.equal(files.some((f) => f.endsWith('.svg')), false);
  });
});

describe('任务 72：道具图标 31 张 webp，ITEM_ICON 映射全', () => {
  test('ITEM_ICON 覆盖石头 8、球 3、伤药 5、照顾 10、进化道具 4、经验 1', () => {
    const map = appSrc.slice(appSrc.indexOf('const ITEM_ICON = {'), appSrc.indexOf('};', appSrc.indexOf('const ITEM_ICON = {')));
    for (const [key, slug] of [
      ['stone:thunder', 'stone-thunder'], ['stone:fire', 'stone-fire'], ['stone:water', 'stone-water'], ['stone:leaf', 'stone-leaf'],
      ['stone:ice', 'stone-ice'], ['stone:sun', 'stone-sun'], ['stone:moon', 'stone-moon'], ['stone:fairy-skill', 'stone-fairy-skill'],
      ['ball', 'ball'], ['ball:hyper', 'ball-hyper'], ['ball:master', 'ball-master'],
      ['medicine:potion', 'medicine-potion'], ['medicine:super-potion', 'medicine-super-potion'], ['medicine:berry-juice', 'medicine-berry-juice'],
      ['medicine:water', 'medicine-water'], ['medicine:revive', 'medicine-revive'],
      ['care:apple', 'care-apple'], ['care:berry', 'care-berry'], ['care:cookie', 'care-cookie'], ['care:meat', 'care-meat'],
      ['care:milk', 'care-milk'], ['care:honey', 'care-honey'],
      ['care:bubble', 'care-bubble'], ['care:shower', 'care-shower'], ['care:petal', 'care-petal'], ['care:herb', 'care-herb'],
      ['item:metal-coat', 'item-metal-coat'], ['item:electirizer', 'item-electirizer'], ['item:protector', 'item-protector'], ['item:black-augurite', 'item-black-augurite'],
      ['xp', 'item-xp'],
    ]) {
      assert.ok(map.includes(`'${key}': '${slug}'`), `${key} → ${slug}`);
    }
  });

  test('磁盘上有 31 张道具图标 webp（轮换后为 hash 名）', () => {
    const files = readdirSync(new URL('../public/static/img/icons', import.meta.url));
    assert.equal(files.length, 31);
    for (const slug of ITEM_SLUGS) assert.ok(files.includes(`${slug}.${H}.webp`), slug);
  });

  test('ITEM_ICON_SRC 模板指向 icons 目录 webp', () => {
    assert.match(appSrc, /const ITEM_ICON_SRC = \(slug\) => `\/static\/img\/icons\/\$\{slug\}\.webp`;/);
  });
});

describe('任务 72：各处渲染用图（背包／转盘／中奖记录／照顾）', () => {
  test('itemIcon：球仍走 CSS、蛋仍走 eggHtml，其余有图用图、无图回退 ic', () => {
    const fn = appSrc.slice(appSrc.indexOf('function itemIcon(it)'), appSrc.indexOf('function stickerIcon'));
    assert.match(fn, /if \(key\.startsWith\('ball:'\)/);
    assert.match(fn, /if \(key\.startsWith\('egg:'\)\) return eggHtml/);
    assert.match(fn, /if \(ITEM_ICON\[key\]\) return itemIconImg\(key, ''\);/);
    assert.match(fn, /return ic\(map\[key\] \|\| 'gift'\);/);
  });

  test('转盘揭示：无服务端图时用奖品 key 的道具图', () => {
    assert.match(appSrc, /const img = cur\.prizeImg \|\| itemIconUrl\(curWinner\(\)\.key\);/);
  });

  test('中奖记录文案：prizeKey 有图用图，无图回退 emoji', () => {
    const fn = appSrc.slice(appSrc.indexOf('function oakDrawPrizeText(d)'), appSrc.indexOf('/* Oak 评测结果框里的抽奖行'));
    assert.match(fn, /const img = d\.prizeKey \? itemIconUrl\(d\.prizeKey\) : null;/);
    assert.match(fn, /d\.prizeEmoji \? esc\(d\.prizeEmoji\)/);
  });

  test('照顾格子与飞行动画用 careFxIconFor（有图用图，无图回退 emoji）', () => {
    assert.match(appSrc, /<span class="care-emoji">\$\{careFxIconFor\(kind, key\)\}<\/span>/);
    assert.match(appSrc, /function careFxIconFor\(kind, key\)/);
    assert.match(appSrc, /flyEl\.innerHTML = careFxIconFor\('feed', key\);/);
    assert.match(appSrc, /itemIconUrl\('care:' \+ key\)/);
  });
});

describe('任务 72：CSS 白角裁切与 hash 轮换', () => {
  test('.item-ic 有圆角（裁掉生成图白角），属性/照顾图标尺寸分档', () => {
    assert.match(cssSrc, /\.item-ic\{width:24px;height:24px;border-radius:22%;/);
    assert.match(cssSrc, /\.typechip img\{border-radius:22%\}/);
    assert.match(cssSrc, /\.moveicon img\{border-radius:22%\}/);
    assert.match(cssSrc, /\.care-emoji \.item-ic\{width:28px;height:28px\}/);
    assert.match(cssSrc, /\.care-fx-fly \.item-ic\{width:32px;height:32px\}/);
  });

  test('hash-assets：types 改 webp 计 10，icons 新发现计 31，锚点跟进', () => {
    assert.ok(hashSrc.includes('/^static\\/img\\/types\\/[^/]+\\.webp$/'), 'types 发现正则');
    assert.ok(hashSrc.includes('if (types.length !== 10)'), 'types 计 10');
    assert.ok(hashSrc.includes('/^static\\/img\\/icons\\/[^/]+\\.webp$/'), 'icons 发现正则');
    assert.ok(hashSrc.includes('if (icons.length !== 31)'), 'icons 计 31');
    assert.ok(hashSrc.includes('"/static/img/types/${TYPE_EN[m.type] || \'normal\'}.webp", 1'), '属性锚点 1 处（2026-11-13 任务 106：两处渲染改走 moveIconSrc，只剩兜底）');
    assert.ok(hashSrc.includes("'/static/img/types/${en}.webp', 2"), 'typechip＋筛选 chip 锚点 2 处（任务 74）');
    assert.ok(hashSrc.includes("`/static/img/icons/${slug}.webp`', 1"), '道具图标锚点 1 处');
  });
});

describe('任务 72：不动的东西（球 CSS、蛋绘制、ic 线条图标）', () => {
  test('itemIcon 球分支仍用 pb-mini CSS，蛋分支仍用 eggHtml', () => {
    const fn = appSrc.slice(appSrc.indexOf('function itemIcon(it)'), appSrc.indexOf('function stickerIcon'));
    assert.match(fn, /return '<span class="pb-mini ' \+ cls \+ '"><\/span>';/);
  });

  test('ic() 线条图标体系仍在（UI 小图标不动）', () => {
    assert.match(appSrc, /const IC = \{/);
    assert.match(appSrc, /const IC_FILL = \{/);
  });

  test('底部导航用小程序图标母版两态 PNG（2026-11-13 网页版图标同步更新）', () => {
    assert.match(appSrc, /ic\(\['child', 'eggs', 'encounter', 'daily-english', 'backpack'\], 'tab-home'\)/);
    assert.match(appSrc, /ic\(\['checkin', 'subject'\], 'tab-checkin'\)/);
    assert.match(appSrc, /ic\(\['gym'\], 'tab-gym'\)/);
    assert.match(appSrc, /ic\(\['pokedex'\], 'tab-pokedex'\)/);
    assert.match(appSrc, /\/static\/img\/tabs\/\$\{name\}\$\{keys\.includes\(v\) \? '-active' : ''\}\.webp/);
    for (const n of ['tab-home', 'tab-home-active', 'tab-checkin', 'tab-checkin-active', 'tab-gym', 'tab-gym-active', 'tab-pokedex', 'tab-pokedex-active']) {
      assert.ok(existsSync(new URL(`../public/static/img/tabs/${n}.webp`, import.meta.url)), `missing tab icon ${n}`);
    }
  });

  test('后端 ITEM_CATALOG 未动（图标只在前端换）', () => {
    const srv = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
    assert.match(srv, /'stone:thunder': \{ name: '雷之石', emoji: '⚡'/);
    assert.equal(srv.includes('/static/img/icons/'), false);
  });
});
