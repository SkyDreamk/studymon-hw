/* 任务 111 布局实施（2026-11-14，用户确认 Q1–Q7 后开工，只改测试站）
 * node --test tests/task-111-layout.test.mjs
 * 覆盖：① 首页新顺序（伙伴小卡 → 统计独立成行 → 今日任务三行 → Go check in → 招式首行＋展开 → 四宫格 → 上传成绩 → 队伍）；
 * ② 招式只露首行 4 格（任务 118，2026-11-14：用户报技能栏右空 16px 且卡挤——任务 111 的 66px 定宽按 347px 内容宽算错，实测内容宽 362px，5×66＋4×4=346 留 16px 右空；66px 卡格内宽仅 58px，4 字名 56px 贴边。改 4 列等宽 grid 撑满内容宽，每格约 84px、格内宽约 72px；首行 slice(0,4)，其余 slice(4) 收进 #movesRest，展开条件改 >4；展开按钮移到「Moves learned」标题行右侧，照图鉴 .dex151-head 做法——侧边空隙实测仅 19px，放不下按钮）；对战选技能同日跟进：battleMovePickerHtml 也加 .moves5，改 4 列宽格（用户 17:38 反馈对战页仍是 4 列、右侧留白），道馆与 PvP 共用同一函数；
 * ③ 道馆新顺序（吸顶「已选」→ 顶栏 → 徽章墙 → 候补选择 → Stage 1–6 → 收藏馆 → 兄妹对战）；
 * ④ 候补只列随身队（主宠＋携带列表 j.collection，最多 4 只，合计 5 球），仓库里的不显示，「全部 151 只」折叠已删（2026-11-14 仓库口径，用户亲口定：5 只里点一只当备战）；选中态 3px #B54A00 描边＋右上角 20px 勾；
 * ⑤ 徽章墙删 "Lit"、未点亮灰底；关卡标题拆两层；克制提示已删（用户 2026-11-14：图鉴卡片已注明克制关系）；VS 卡英文模式全英文；
 * ⑥ 图鉴筛选行右缘渐隐；桌面底栏 520px 居中。
 * 说明：读取的是带哈希的构建产物（assetPath），不是 .orig；先轮换哈希再跑。
 * 真实 Azure 调用 0 次。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assetPath } from './asset-path.mjs';

const APP = readFileSync(assetPath('app.js'), 'utf8');
const CSS = readFileSync(assetPath('style.css'), 'utf8');

// app.js 的顶层函数以无缩进的 } 结束，函数内部块均有缩进（仿 gochild-snapshot.test.mjs）。
function functionBody(source, name) {
  const header = new RegExp(
    '^(?:async\\s+)?function\\s+' + name + '\\b[^\\n]*\\{[ \\t]*\\r?\\n',
    'm'
  );
  const match = header.exec(source);
  assert.ok(match, `缺 ${name} 函数声明`);
  const rest = source.slice(match.index + match[0].length);
  const end = rest.search(/^\}/m);
  assert.ok(end >= 0, `缺 ${name} 函数结束标记`);
  return rest.slice(0, end);
}

const childBody = functionBody(APP, 'goChild');
const gymBody = functionBody(APP, 'renderGymPage');

describe('首页新顺序', () => {
  test('伙伴小卡 → 统计 → 今日任务三行 → Go check in → 招式 → 四宫格', () => {
    const order = [
      'class="card minicard"',
      'class="statgrid"',
      'id="dailyEnglishEntry-',
      'onclick="goCheckinPage(',
      'biTitle(...LANG.childSlice2Moves)',
      'class="grid2 navgrid"',
    ];
    let prev = -1;
    for (const anchor of order) {
      const i = childBody.indexOf(anchor);
      assert.ok(i > prev, `goChild 内应按顺序出现 ${anchor}`);
      prev = i;
    }
  });

  test('旧问候卡与大伙伴区已撤：goChild 内无 card greet、无 div.hero', () => {
    assert.ok(!childBody.includes('class="card greet"'));
    assert.ok(!childBody.includes('<div class="hero">'));
  });

  test('伙伴小卡：问候语 tr() 单行、名字＋Lv、经验条、升级提示与累计经验同行', () => {
    assert.ok(childBody.includes('class="mc-greet">${tr(`嗨，'));
    assert.ok(childBody.includes('class="mc-sub">${tr(`再拿 ${k.xpToNext} 经验升级 · 累计经验 ${k.totalXp}`'));
    assert.ok(childBody.includes('class="xpbar mc-xp"'));
    assert.ok(childBody.includes('eggHtml(form.egg || EGG_FALLBACK, 72)'));
  });

  test('经验返还动画选择器跟到小卡，旧 .hero 选择器已撤', () => {
    assert.ok(APP.includes("app.querySelector('.minicard .xpbar > i')"));
    assert.ok(APP.includes("app.querySelector('.minicard .mc-img img')"));
    assert.ok(!APP.includes("querySelector('.hero .xpbar"));
  });

  test('统计标签单行：英文文案收短、tr() 取单语、CSS 数字 22px/600、标签 14px', () => {
    assert.ok(APP.includes("childSlice2Submitted: ['今日已交', 'Submitted']"));
    assert.ok(APP.includes("childSlice2Streak: ['连击天数', 'Streak']"));
    assert.ok(APP.includes("childSlice2Species: ['图鉴种数', 'Species']"));
    assert.ok(childBody.includes('<span>${tr(...LANG.childSlice2Submitted)}</span>'));
    assert.match(CSS, /\.statcell b\{display:block;font-size:22px;font-weight:600;line-height:1\.25\}/);
    assert.match(CSS, /\.statcell span\{font-size:14px;color:var\(--muted\);white-space:nowrap\}/);
    assert.match(CSS, /\.lang-en \.statcell span\{font-size:14px;white-space:nowrap\}/);
  });
});

describe('首页招式展开', () => {
  test('首行 4 格、其余收进 #movesRest（hidden），展开按钮在标题行，文案与下标偏移', () => {
    assert.ok(childBody.includes('moves.slice(0, 4).map((m, i) => moveBtn(m, i))'));
    assert.ok(childBody.includes('moves.slice(4).map((m, j) => moveBtn(m, j + 4))'));
    assert.ok(childBody.includes('id="movesRest" hidden'));
    assert.match(CSS, /\.moveicons\[hidden\]\{display:none\}/);
    assert.ok(childBody.includes("tr('全部招式 ▸', 'All moves ▸')"));
    assert.ok(APP.includes("tr('收起', 'Collapse')"));
    assert.ok(APP.includes('window.toggleMovesExpand = function (btn)'));
    assert.ok(childBody.includes('moves.length > 4 ? `<button type="button" class="smallbtn" id="movesExpandBtn"'));
    assert.ok(childBody.includes('class="section-title sec-head"><span>${biTitle(...LANG.childSlice2Moves)}</span>'));
    assert.match(CSS, /\.sec-head\{display:flex;justify-content:space-between;align-items:center;gap:12px\}/);
    assert.match(CSS, /\.moveicons\.moves5\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\);gap:8px\}/);
    assert.match(CSS, /\.moveicons\.moves5 \.moveicon\{width:auto;padding:10px 4px 8px\}/);
    assert.match(CSS, /\.moveicons\.moves5 \.moveicon img\{width:48px;height:48px\}/);
  });

  test('展开按钮在标题行：标题与按钮同行、首行在标题行下方、碎片行在全部招式下方', () => {
    const moveBtn = APP.indexOf('const moveBtn = (m, i) =>');
    assert.ok(moveBtn >= 0);
    const title = childBody.indexOf('biTitle(...LANG.childSlice2Moves)');
    const btn = childBody.indexOf('id="movesExpandBtn"');
    const first = childBody.indexOf('moves.slice(0, 4)');
    const rest = childBody.indexOf('moves.slice(4)');
    const frag = childBody.indexOf('quiz.fragments >= 3');
    // 2026-11-15 用户纠正：碎片注释须在全部技能下方，不得夹在首行与 #movesRest 之间截断招式网格。
    assert.ok(title > 0 && title < btn && btn < first && first < rest && rest < frag);
  });
});

describe('道馆新顺序', () => {
  test('吸顶「已选」→ 顶栏 → 徽章墙 → 候补选择 → 关卡标题 → 关卡 → 收藏馆 → 对战', () => {
    const order = [
      'class="gym-picked"',
      "childTop(biTitle('周末道馆'",
      'class="badgewall"',
      'id="benchSection"',
      'gym-stage-title',
      'j.stages.map(stageCard)',
      'onclick="goEggs(${G.id})"',
      '${pvpHtml}',
    ];
    let prev = -1;
    for (const anchor of order) {
      const i = gymBody.indexOf(anchor);
      assert.ok(i > prev, `renderGymPage 内应按顺序出现 ${anchor}`);
      prev = i;
    }
  });

  test('吸顶「已选」：sticky top:0、文案规则、点它滚到候补区', () => {
    assert.match(CSS, /\.gym-picked\{position:sticky;top:0;z-index:30;/);
    assert.ok(gymBody.includes("tr('已选：', 'Selected: ')"));
    assert.ok(gymBody.includes("tr('（主宠）', ' (Main companion)')"));
    assert.ok(gymBody.includes("document.getElementById('benchSection').scrollIntoView({behavior:'smooth',block:'start'})"));
    assert.match(CSS, /\.bench-section\{scroll-margin-top:56px\}/);
  });

  test('徽章墙：无 "Lit"/"已点亮" 文案，未点亮灰底＋「未获得」，已点亮不留空行（任务 120 去空白）', () => {
    assert.ok(!gymBody.includes('已点亮'));
    assert.ok(!gymBody.includes('Lit '));
    assert.ok(!gymBody.includes("b.lit ? '&nbsp;'"), '已点亮仍留空行（任务 120 已去掉）');
    assert.ok(gymBody.includes("b.lit ? '' :"), '已点亮应不渲染状态行');
    assert.ok(gymBody.includes("tr('未获得', 'Not earned')"), '未点亮仍应显示「未获得」');
    const rules = CSS.split('\n').filter((l) => l.startsWith('.badgeslot{'));
    assert.equal(rules.length, 1);
    assert.ok(rules[0].includes('background:#F0EBE0'));
    assert.ok(rules[0].includes('border:2px dashed'));
    assert.ok(rules[0].includes('padding:8px 2px'), '徽章格内边距不是 8px 2px（任务 120 收紧）');
  });

  test('候补只列随身队：benchList 取 j.collection（携带）去主宠，不用 benchOptions；已选备战换出携带队即清掉', () => {
    assert.ok(gymBody.includes('const benchList = (j.collection || []).filter((c) => c.no !== mainNo);'));
    assert.ok(!gymBody.includes('j.benchOptions'), '道馆选择器不得再吃 benchOptions 调试全量');
    assert.ok(!gymBody.includes('ownedList'), 'ownedList/dex 交集逻辑已删，随身队即携带列表');
    assert.ok(gymBody.includes("if (G.benchGym != null && !benchList.some((c) => c.no === G.benchGym)) G.benchGym = null;"));
    assert.ok(gymBody.includes('benchPickerHtml(benchList,'));
    assert.ok(gymBody.includes('id="benchBallsWrap"'));
  });

  test('「全部 151 只」折叠已删：无折叠按钮、无 toggle、无 _benchFull/_benchOwned，标题行只剩标题', () => {
    assert.ok(!gymBody.includes('benchFoldBtn'));
    assert.ok(!gymBody.includes('toggleGymBenchFold'));
    assert.ok(!gymBody.includes('benchOpen'));
    assert.ok(!gymBody.includes('_benchFull'));
    assert.ok(!gymBody.includes('_benchOwned'));
    assert.ok(!gymBody.includes('全部 151 只'));
    assert.ok(!APP.includes('window.toggleGymBenchFold = function (btn)'));
    assert.ok(gymBody.includes('class="section-title" style="margin-top:2px"'));
  });

  test('选中态：3px #B54A00 描边＋右上角 20px 勾，金色光环已删', () => {
    assert.match(CSS, /\.pokeball\.on \.pb-ball\{outline:3px solid #B54A00;outline-offset:2px;box-shadow:none\}/);
    const rules = CSS.split('\n').filter((l) => l.startsWith('.pokeball.on::after{'));
    assert.equal(rules.length, 1, '应恰有一条 .pokeball.on::after 规则');
    assert.ok(rules[0].includes('width:20px;height:20px'));
    assert.ok(rules[0].includes('content:"✓"'));
    assert.ok(!CSS.includes('#f5b301'));
  });

  test('关卡标题拆两层：20px/600 标题＋ 14px 副行，旧单行错句已拆', () => {
    assert.ok(gymBody.includes('class="section-title gym-stage-title"'));
    assert.ok(gymBody.includes("biTitle('道馆闯关', 'Gym challenges')"));
    assert.ok(gymBody.includes('class="gym-stage-sub"'));
    assert.ok(gymBody.includes('已打卡 ${j.weekApproved}/${j.need} 天 · Lv.${j.myLevel}'));
    assert.ok(!gymBody.includes('道馆闯关 打卡'));
    assert.match(CSS, /\.gym-stage-title\{font-size:20px;font-weight:600\}/);
    assert.match(CSS, /\.gym-stage-sub\{font-size:14px;color:var\(--text-2\);margin:2px 0 6px\}/);
  });

  test('克制提示已删：图鉴卡片已注明克制关系，道馆不再重复提示', () => {
    assert.ok(!gymBody.includes('mainCounters'));
    assert.ok(!gymBody.includes('counters stage'));
    assert.ok(!gymBody.includes('counterNote'));
    assert.ok(!APP.includes('打那关更轻松'));
  });

  test('VS 卡英文模式全英文：年级走 trGrade', () => {
    assert.ok(gymBody.includes('trGrade(who.grade)'));
  });
});

describe('对战选技能 4 列（任务 118：与首页同款 grid 撑满；2026-11-14 跟进：用户反馈对战页仍是 4 列留白）', () => {
  test('battleMovePickerHtml 复用首页 .moves5：一行 4 个，道馆与 PvP 共用', () => {
    assert.ok(APP.includes('function battleMovePickerHtml(moves) {'));
    assert.ok(APP.includes('return `<div class="moveicons moves5 battle-moves">'), '对战选技能容器应带 moves5（battle-moves 供出招中置灰用）');
    const calls = APP.split('battleMovePickerHtml(active.moves)').length - 1;
    assert.equal(calls, 2, '道馆与 PvP 各一处调用');
  });
});

describe('图鉴渐隐与桌面底栏', () => {
  test('图鉴筛选行右缘渐隐（mask），不折行', () => {
    assert.ok(CSS.includes('mask-image:linear-gradient(to right,#000 calc(100% - 36px),transparent 100%)'));
    assert.ok(CSS.includes('-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 36px),transparent 100%)'));
    assert.match(CSS, /\.dex-filter\{[^}]*display:flex;[^}]*overflow-x:auto/);
  });

  test('桌面底栏 520px 居中（≥600px），手机端规则不动', () => {
    assert.ok(CSS.includes('@media (min-width:600px){.tabbar{max-width:520px;margin-left:auto;margin-right:auto}}'));
    assert.match(CSS, /\.tabbar\{position:fixed;left:0;right:0;bottom:0;/);
  });
});
