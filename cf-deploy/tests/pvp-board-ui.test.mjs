/* 兄弟对战“只剩个头”棋盘 UI（任务 71，2026-11-09）：
 * 参考小红书游戏卡米猫《你终于：宠物小精灵只剩头头啦！》图 1/图 2：
 * 单位 = 头部头像＋底框 UI（血条、属性、等级进底框），对手在上、我方在下
 * 两排，顶部信息栏（回合＋轮到谁），底部技能栏。
 * 只断言前端展示源码（app.js.orig / style.css.orig），不碰后端逻辑与规则。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readBackendSource } from './backend-src.mjs';

const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const cssSrc = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');
const pvpBoard = appSrc.slice(appSrc.indexOf('function pvpBoardHtml(v)'), appSrc.indexOf('function battleStageHtml(v)'));
const gymStage = appSrc.slice(appSrc.indexOf('function battleStageHtml(v)'), appSrc.indexOf('function renderBattleView()'));

describe('任务 71：兄弟对战棋盘只用于 PvP，道馆舞台不动', () => {
  test('battleStageHtml 在 mode pvp 时走棋盘，其余模式走原舞台', () => {
    // 第三期：线上两机对战改走共享舞台；棋盘只留给离线本地对战（B.local）和舞台加载失败的降级
    assert.match(gymStage, /if \(v && v\.mode === 'pvp' && !bsWanted\(v\)\) return pvpBoardHtml\(v\);/);
  });

  test('道馆舞台仍用完整立绘（对手正面、玩家背身、训练师背身）', () => {
    assert.match(gymStage, /figure-defender/);
    assert.match(gymStage, /figure-attacker/);
    assert.match(gymStage, /backImg\(aPet\.no\)/);
    assert.match(gymStage, /avatarBackImg\(A\.line\)/);
  });

  test('天气角标抽成共用 helper，两路舞台都用它', () => {
    assert.match(appSrc, /function battleWeatherBadge\(v\)/);
    assert.match(pvpBoard, /battleWeatherBadge\(v\)/);
    assert.match(gymStage, /battleWeatherBadge\(v\)/);
  });
});

describe('任务 71：棋盘布局（2v2，对手在上、我方在下）', () => {
  test('每方两只都上板：行渲染遍历 side.pets，不只画出战宠', () => {
    assert.match(pvpBoard, /side\.pets\.map\(\(p, i\) => unit\(p, i, side, sideKey\)\)/);
  });

  test('顶部信息栏：回合数＋轮到谁（防守阶段显示防守方、结束显示获胜方）', () => {
    assert.match(pvpBoard, /第 \$\{v\.turnNo \|\| 1\} 回合/);
    assert.match(pvpBoard, /轮到 \$\{esc\(turnSide\.childName\)\}/);
    assert.match(pvpBoard, /正在防守/);
    assert.match(pvpBoard, /获胜！/);
  });

  test('行标签区分我方/对手（背身规则的替代区分方式）', () => {
    assert.match(pvpBoard, /对手 \$\{esc\(B \? B\.childName : ''\)\}/);
    assert.match(pvpBoard, /我方 \$\{esc\(A \? A\.childName : ''\)\}/);
    assert.match(pvpBoard, /<div class="pvp-vs">VS<\/div>/);
  });

  test('底框含名字、等级、属性、血条、血量数字', () => {
    assert.match(pvpBoard, /class="pvp-name"/);
    assert.match(pvpBoard, /class="pvp-lv">Lv\.\$\{p\.level\}/);
    assert.match(pvpBoard, /typeChip\(p\.type\)/);
    assert.match(pvpBoard, /class="hp-track"/);
    assert.match(pvpBoard, /class="hp-num"/);
  });

  test('出战宠金框＋“出战中”，待命“待命”，倒下“已倒下”', () => {
    assert.match(pvpBoard, /is-active.*is-bench.*is-fainted/s);
    assert.match(pvpBoard, /tr\('出战中', 'In battle'\)/);
    assert.match(pvpBoard, /tr\('待命', 'Benched'\)/);
    assert.match(pvpBoard, /tr\('已倒下', 'Fainted'\)/);
  });

  test('棋盘不画备战徽章（两只已在行里，画了就是重复）', () => {
    assert.doesNotMatch(pvpBoard, /bench\(/);
  });
});

describe('任务 71：头像取法与动画钩子', () => {
  test('头像用正面立绘做 CSS 放大裁切（站内无头部单图，不新增资产）', () => {
    assert.match(pvpBoard, /p\.img \|\| frontImgFor\(p\)/);
    assert.match(cssSrc, /\.pvp-head img\{width:155%;max-width:none;height:auto;margin:-3% 0 0 -6%;display:block\}/);
  });

  test('棋盘不用背身图（头像统一正面；背身规则只留在道馆舞台）', () => {
    assert.doesNotMatch(pvpBoard, /backImg|avatarBackImg/);
  });

  test('动画钩子保留：容器 bs-stage、出战宠血条 bs-hp-A/B、飘字 bs-dmg、招式名 bs-skill、跳过按钮', () => {
    assert.match(pvpBoard, /id="bs-stage"/);
    assert.match(pvpBoard, /id="bs-hp-\$\{sideKey\}"/);
    assert.match(pvpBoard, /id="bs-hpnum-\$\{sideKey\}"/);
    assert.match(pvpBoard, /id="bs-dmg"/);
    assert.match(pvpBoard, /id="bs-skill"/);
    assert.match(pvpBoard, /id="bs-skip" onclick="skipStageAnimation\(\)"/);
  });

  test('血条 id 只给出战宠（待命宠不挂 id，动画只改出战宠血条）', () => {
    assert.match(pvpBoard, /const hpId = active \? ` id="bs-hp-\$\{sideKey\}"` : '';/);
    assert.match(pvpBoard, /const hpNumId = active \? ` id="bs-hpnum-\$\{sideKey\}"` : '';/);
  });
});

describe('任务 71：底部技能栏与棋盘样式', () => {
  test('兄弟对战招式选择器包进 pvp-skillbar（结构先搭好，图标沿用现有招式图标）', () => {
    const rv = appSrc.slice(appSrc.indexOf('function renderBattleView()'), appSrc.indexOf('/* 防守剩余时间文案'));
    assert.match(rv, /<div class="pvp-skillbar">\$\{battleMovePickerHtml\(active\.moves, active\.disabledMove\)\}<\/div>/);
  });

  test('棋盘为浅色底＋细格纹（道馆深色木质舞台不动）', () => {
    assert.match(cssSrc, /\.battle-stage\.pvp-board\{[^}]*background:linear-gradient\(180deg,var\(--surface\),var\(--amber-bg\)\)/); // 任务 83：#FFF3D6 已抽为 --amber-bg（值同为 #fff3d6）
    assert.match(cssSrc, /\.battle-stage\.pvp-board::before\{background-image:repeating-conic-gradient\(rgba\(77,111,193,\.06\) 0% 25%,transparent 0% 50%\);background-size:26px 26px\}/);
  });

  test('出战卡金框＋淡黄底（与任务 69 携带格同款），待命卡白底灰边', () => {
    assert.match(cssSrc, /\.pvp-unit\.is-active\{border-color:#D4A017;background:linear-gradient\(180deg,#FFFBEB,#FEF3C7\)/);
    assert.match(cssSrc, /\.pvp-unit\{[^}]*background:#fff;border:2px solid var\(--line\)/);
  });

  test('技能栏为白底圆角条，招式图标沿用现有 moveicon（不自创新风格）', () => {
    assert.match(cssSrc, /\.pvp-skillbar\{background:#fff;border:2px solid var\(--line\);border-radius:16px;padding:10px;margin-top:8px\}/);
    assert.match(cssSrc, /\.pvp-skillbar \.moveicons\{margin-top:0\}/);
  });

  test('头像框 40px 圆角（任务 73 小头像化）、名字单行不换行藏字', () => {
    assert.match(cssSrc, /\.pvp-head\{width:40px;height:40px;overflow:hidden;border-radius:12px;/);
    assert.doesNotMatch(cssSrc, /\.pvp-name\{[^}]*text-overflow:ellipsis/);
  });
});

/* 任务 73：棋盘图标缩小、备战宠全部上板（2026-11-09，用户反馈）：
 * 每方一行放出战 2 只＋全部备战宠（携带上限 5 只、出战 2 只、备战最多 3 只）；
 * 出战卡金框＋淡黄底＋“出战中”，备战卡待命样式（白底灰边＋“待命”角标）；
 * 底框精简为名字单行＋「Lv＋属性图标」一行＋血条＋血量数字，属性只露图标不露文字；
 * 备战宠只作展示，不加中途换宠规则。 */
const srvSrc = readBackendSource();

describe('任务 73：备战宠上板（展示数据由服务端补）', () => {
  test('battleView 的 sideView 映射 bench：按当前 battleLevel 现算等级与满血体力', () => {
    assert.match(srvSrc, /bench: \(s\.benchDisplay \|\| \[\]\)\.map\(\(b\) => \{/);
    assert.match(srvSrc, /const maxHp = pvpBenchHp\(b\.no, s\.battleLevel\);/);
    assert.match(srvSrc, /level: s\.battleLevel, hp: maxHp, maxHp, fainted: false/);
  });

  test('备战体力与出战同口径：实际六围 × PvP 倍率，无六围回落 pvpMaxHp', () => {
    assert.match(srvSrc, /function pvpBenchHp\(no, level\) \{/);
    assert.match(srvSrc, /const st = \(no != null\) \? statsFor\(no, level\) : null;/);
    assert.match(srvSrc, /if \(st\) return Math\.round\(st\.hp \* PVP_HP_MULT\);/);
  });

  test('建局快照备战（出战宠除外），失败不阻塞建局', () => {
    assert.match(srvSrc, /sideA\.benchDisplay = await pvpBenchDisplayIds\(db, me\.id, benchNo \? \[benchNo\] : \[\]\);/);
  });

  test('加入时按裁剪后实际出战阵容重算两方备战（被裁掉的出战宠回备战）', () => {
    assert.match(srvSrc, /st\.sides\.A\.benchDisplay = await pvpBenchDisplayIds\(db, row\.child_a, st\.sides\.A\.pets\.map\(\(p\) => p\.no\)\);/);
    assert.match(srvSrc, /sideB\.benchDisplay = await pvpBenchDisplayIds\(db, joiner\.id, sideB\.pets\.map\(\(p\) => p\.no\)\);/);
  });

  test('备战 = 随身携带宠减去出战宠（按 no 排除，主宠物种不在可收集池故不误排）', () => {
    assert.match(srvSrc, /async function pvpBenchDisplayIds\(db, childId, battleNos\) \{/);
    assert.match(srvSrc, /const carried = await carriedCollection\(db, childId\);/);
    assert.match(srvSrc, /return carried\.filter\(\(c\) => !inBattle\.has\(Number\(c\.no\)\)\)/);
  });
});

describe('任务 73：棋盘小卡（每方一行 5 卡）', () => {
  test('行渲染追加 side.bench 展示宠（待命样式、不挂血条 id）', () => {
    assert.match(pvpBoard, /\$\{\(side\.bench \|\| \[\]\)\.map\(\(p\) => unit\(p, -1, side, sideKey, true\)\)\.join\(''\)\}/);
    assert.match(pvpBoard, /const unit = \(p, i, side, sideKey, isDisplayBench\) => \{/);
    assert.match(pvpBoard, /const active = !isDisplayBench && i === side\.activeIdx;/);
  });

  test('底框精简：名字单行＋「Lv＋属性图标」一行（pvp-sub），属性只露图标', () => {
    assert.match(pvpBoard, /<div class="pvp-name">\$\{esc\(p\.name\)\}<\/div>/);
    assert.match(pvpBoard, /<div class="pvp-sub"><span class="pvp-lv">Lv\.\$\{p\.level\}<\/span><span class="pvp-type">\$\{typeChip\(p\.type\)\}<\/span><\/div>/);
    assert.match(cssSrc, /\.pvp-type \.typechip\{font-size:0;line-height:0;padding:2px 3px\}/);
    assert.match(cssSrc, /\.pvp-sub\{display:flex;justify-content:center;align-items:center;gap:4px;margin:1px 0 3px\}/);
  });

  test('小卡尺寸：行间隙 6px、卡片圆角 12px、名字 14px、Lv 14px、血条 6px（返工 2026-11-14：12px 提到阶梯下限 14px）', () => {
    assert.match(cssSrc, /\.pvp-row\{display:flex;gap:6px;justify-content:center\}/);
    assert.match(cssSrc, /\.pvp-unit\{[^}]*border-radius:12px;padding:6px 3px 6px/);
    assert.match(cssSrc, /\.pvp-name\{font-size:14px;font-weight:600;color:var\(--bs-text\);text-align:center;white-space:nowrap\}/);
    assert.match(cssSrc, /\.pvp-lv\{font-size:14px;font-weight:600;color:var\(--bs-sub\);white-space:nowrap\}/);
    assert.match(cssSrc, /\.pvp-unit \.hp-track\{height:6px\}/);
    assert.match(cssSrc, /\.pvp-unit \.hp-num\{text-align:center;font-size:14px;margin-top:2px\}/);
  });

  test('备战宠只作展示：棋盘不挂换宠按钮、不画备战徽章', () => {
    assert.doesNotMatch(pvpBoard, /battleSwap\(/);
    assert.doesNotMatch(pvpBoard, /bench\(/);
  });
});
