/* 主页图标 01–09 与电系招式图标 10–13（2026-11-13，用户发“整站图标风格统一化”母版包）：
 * 19 张 1024×1024 RGBA 透明 PNG，外圈 2px 全透明、无白边；第二批 6 张与已归档母版 md5 相同。
 * 9 张首页图标转 96×96 WebP q90 进 public/static/img/home/，接进主页 6 个按钮＋每日三科卡片；
 * 4 张电系招式图标进 public/static/img/moves/，两处 .moveicons 渲染（主页招式列表＋对战出招）
 * 经 moveIconSrc 查表，有专属图标用专属图、其余招式仍用属性图标；卡牌馆招式行仍用能量点，不动。
 * 12-训练师档案网站暂无落点，先不接。只断言前端展示源码与磁盘图标文件，不碰后端逻辑。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const cssSrc = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');

const HOME = ['home-daily-english', 'home-daily-chinese', 'home-daily-math', 'home-checkin', 'home-oak', 'home-oak-english', 'home-collection', 'home-backpack', 'home-school-score'];
const MOVES = ['volt-tackle', 'thunder', 'thunderbolt', 'electro-ball'];

describe('主页图标 01–09 与招式图标 10–13（2026-11-13）', () => {
  test('9 张首页 WebP 与 4 张招式 WebP 已落盘', () => {
    for (const n of HOME) {
      assert.ok(existsSync(new URL(`../public/static/img/home/${n}.webp`, import.meta.url)), `missing home icon ${n}`);
    }
    for (const n of MOVES) {
      assert.ok(existsSync(new URL(`../public/static/img/moves/${n}.webp`, import.meta.url)), `missing move icon ${n}`);
    }
  });

  test('主页 6 个按钮用图标，不用 emoji/线图标', () => {
    assert.ok(appSrc.includes('<img class="btn-ic" src="/static/img/home/home-oak.webp"'), '大木博士之家按钮未用图标');
    assert.ok(appSrc.includes('<img class="btn-ic" src="/static/img/home/home-oak-english.webp"'), '英语交流按钮未用图标');
    assert.ok(appSrc.includes('<img class="btn-ic" src="/static/img/home/home-collection.webp"'), '收藏馆按钮未用图标');
    assert.ok(appSrc.includes('<img class="btn-ic" src="/static/img/home/home-backpack.webp"'), '背包按钮未用图标');
    assert.ok(appSrc.includes('<img class="btn-ic" src="/static/img/home/home-checkin.webp"'), '去打卡按钮未用图标');
    assert.ok(appSrc.includes('<img class="btn-ic" src="/static/img/home/home-school-score.webp"'), '上传学校成绩按钮未用图标');
    assert.ok(!appSrc.includes("💬 ${bi('英语交流'"), '英语交流仍用 💬');
    assert.ok(!appSrc.includes("${ic('flask')} ${tr('大木博士之家'"), '大木博士之家仍用线图标');
    assert.ok(!appSrc.includes("${ic('egg')} ${tr(...LANG.childSlice2Eggs)}"), '收藏馆仍用线图标');
    assert.ok(!appSrc.includes("${ic('backpack')} ${tr(...LANG.childSlice2Backpack)}"), '背包仍用线图标');
    assert.ok(!appSrc.includes("${ic('pencil')} ${tr(...LANG.childSlice2Checkin)}"), '去打卡仍用线图标');
    assert.ok(!appSrc.includes("${ic('award')} 上传学校成绩"), '上传学校成绩仍用线图标');
  });

  test('道馆页“我的收藏馆”按钮与家长端英语 chip 同步换图标', () => {
    assert.ok(appSrc.includes('<img class="btn-ic" src="/static/img/home/home-collection.webp"'), '道馆页收藏馆按钮未用图标');
    assert.ok(!appSrc.includes("${ic('egg')} ${tr(`我的收藏馆"), '道馆页收藏馆仍用线图标');
    assert.ok(appSrc.includes('<img class="chip-ic" src="/static/img/home/home-oak-english.webp"'), '家长端英语 chip 未用图标');
    assert.ok(!appSrc.includes('openOakEnglish(${esc(k.id)})">${ic(\'flask\')}'), '家长端英语 chip 仍用 flask 线图标');
  });

  test('每日三科卡片用图标，不用 📖/🔢', () => {
    assert.ok(appSrc.includes("icon: 'home-daily-english'"), '每日英语配置未挂图标');
    assert.ok(appSrc.includes("icon: 'home-daily-chinese'"), '每日语文配置未挂图标');
    assert.ok(appSrc.includes("icon: 'home-daily-math'"), '每日数学配置未挂图标');
    assert.ok(appSrc.includes('<img class="sm-ic" src="/static/img/home/${this.icon}.webp"'), '每日卡片渲染未用图标');
    assert.ok(!appSrc.includes('this.emoji'), '每日卡片渲染仍用 emoji');
    assert.ok(!appSrc.includes("emoji: '📖'"), '仍有 📖 配置');
    assert.ok(!appSrc.includes("emoji: '🔢'"), '仍有 🔢 配置');
  });

  test('4 个电系招式有专属图标映射，其余招式仍走属性图标', () => {
    assert.ok(appSrc.includes("const MOVE_ICONS = { '伏特攻击': 'volt-tackle', '打雷': 'thunder', '十万伏特': 'thunderbolt', '电球': 'electro-ball' }"), '招式图标映射缺失或名字不对');
    assert.ok(appSrc.includes('const moveIconSrc = (m) => MOVE_ICONS[m.name]'), 'moveIconSrc 未定义');
    const uses = appSrc.split('src="${moveIconSrc(m)}"').length - 1;
    assert.equal(uses, 2, `moveIconSrc 应在两处 moveicons 渲染使用，实为 ${uses} 处`);
    const legacy = appSrc.split("`/static/img/types/${TYPE_EN[m.type] || 'normal'}.webp`").length - 1;
    assert.equal(legacy, 1, `属性图标直引应只剩 moveIconSrc 兜底里的 1 处，实为 ${legacy} 处`);
  });

  test('图标尺寸规则在 style.css.orig', () => {
    assert.ok(cssSrc.includes('.sm-name img.sm-ic{width:44px;height:44px'), '缺 .sm-ic 规则（任务 107：32→44px，Daily 行 64px）');
    assert.ok(cssSrc.includes('.smallbtn img.chip-ic{width:20px;height:20px'), '缺 .chip-ic 规则');
  });
});

/* 图标落地（任务 107，2026-11-13 用户规格；原图直用，不简化）：2×2 图上文下居中（取代任务 106 的左对齐——
 * 图标进固定 52px 底板、文字长短不再带偏图标位置）；主按钮高 64 居中、次按钮浅色描边高 56；
 * 底板按用户 2026-11-14 纠正改为透明定位槽（图标本身透明、无底色；奶油底已撤）；按压改 4px 深色底边＋下移 2px；每日卡片图标 32→44px、招式图标 40→52px；
 * 源图统一换 192px 标准化版（icon-std，视觉大小已拉齐）。
 * 任务 119（2026-11-14 用户报导航格图标太小、框太大）：导航格图标放大约 68px（底板 76px）、文字置底——
 * .navgrid .bigbtn justify-content 改 flex-start、.btn-tx 加 margin-top:auto；任务 107 的「居中」口径被取代，
 * 底板基础规则（52/48/40、图标 40/38/30）仍在，导航格用更高特异性选择器压过 pl-52。 */
describe('图标落地（任务 107）', () => {
  test('navgrid 按钮图上文下、图标大、文字置底、min-height 104、文字最多两行', () => {
    const m = cssSrc.match(/\.navgrid \.bigbtn\{[^}]*\}/);
    assert.ok(m, '缺 .navgrid .bigbtn 规则');
    assert.ok(m[0].includes('flex-direction:column'), 'navgrid 按钮不是图上文下');
    assert.ok(m[0].includes('justify-content:flex-start'), 'navgrid 按钮不是 flex-start（任务 119：图标顶置、文字置底，居中已取代）');
    assert.ok(!m[0].includes('justify-content:center'), 'navgrid 按钮仍用居中（任务 119 已改 flex-start）');
    assert.ok(m[0].includes('min-height:104px'), 'navgrid 按钮不是 min-height 104px');
    assert.ok(m[0].includes('font-size:14px'), 'navgrid 字号不是 14px');
    assert.ok(m[0].includes('border-radius:22px'), 'navgrid 按钮圆角不是 22');
    assert.ok(cssSrc.includes('.navgrid .btn-tx{display:-webkit-box;-webkit-line-clamp:2'), 'navgrid 文字缺两行 clamp 兜底');
    assert.ok(cssSrc.includes('margin-top:auto'), 'navgrid 文字未钉底（缺 margin-top:auto）');
    assert.ok(!m[0].includes('white-space:nowrap'), 'navgrid 仍用 nowrap（一行铁律已由图上文下＋两行 clamp 取代）');
    assert.ok(cssSrc.includes('.navgrid .bigbtn .btn-plate{width:76px;height:76px}'), 'navgrid 底板不是 76px');
    assert.ok(cssSrc.includes('.navgrid .bigbtn .btn-plate img.btn-ic{width:68px;height:68px}'), 'navgrid 图标不是 68px');
    assert.ok(cssSrc.includes('.navgrid .bigbtn .btn-plate .ic{width:68px;height:68px}'), 'navgrid 线图标不是 68px');
  });

  test('6 个导航按钮图标进 52 底板、文字进 btn-tx', () => {
    for (const n of ['home-oak', 'home-oak-english', 'home-collection', 'home-backpack']) {
      assert.ok(appSrc.includes(`<span class="btn-plate pl-52"><img class="btn-ic" src="/static/img/home/${n}.webp"`), `${n} 未进 52 底板`);
    }
    assert.ok(appSrc.includes('<span class="btn-plate pl-52">${ic(\'puzzle\')}</span>'), '答题按钮线图标未进 52 底板');
    assert.ok(appSrc.includes('<span class="btn-tx">${tr(\'大木博士之家\''), '大木博士之家文字未进 btn-tx');
    assert.ok(appSrc.includes('<span class="btn-tx">${bi(\'英语交流\', \'English Chat\')}</span>'), '英语交流文字未进 btn-tx');
  });

  test('主按钮 hero：高 64 居中、48 底板；次按钮 secondary：浅色描边高 56、40 底板、双语', () => {
    assert.ok(appSrc.includes('<button class="bigbtn icbtn hero" onclick="goCheckinPage(${k.id})"><span class="btn-plate pl-48"><img class="btn-ic" src="/static/img/home/home-checkin.webp"'), '去打卡未挂 hero 或未进 48 底板');
    assert.ok(appSrc.includes('<button class="bigbtn icbtn secondary" onclick="openSchoolTestUpload(${childId})"><span class="btn-plate pl-40"><img class="btn-ic" src="/static/img/home/home-school-score.webp"'), '上传学校成绩未挂 secondary 或未进 40 底板');
    assert.ok(appSrc.includes("${tr('上传学校成绩', 'Upload School Results')}"), '上传学校成绩仍是纯中文（须双语；注意 loadSchoolTestEntry 是顶层函数，bi 不在作用域内，只能用全局 tr）');
    assert.ok(!appSrc.includes('<button class="bigbtn blue icbtn" onclick="openSchoolTestUpload'), '上传学校成绩仍是蓝色主按钮（须降为次按钮）');
    assert.ok(cssSrc.includes('.bigbtn.icbtn.hero{justify-content:center;height:64px;padding:8px 16px;border:0;border-radius:22px}'), '缺 hero 规则');
    assert.ok(cssSrc.includes('.bigbtn.icbtn.secondary{justify-content:center;height:56px;padding:6px 16px;border:2px solid #FFC98A;border-radius:22px;background:#fff'), '缺 secondary 规则');
  });

  test('icbtn 基础：flex 左对齐、gap 12、内边距 8px 16px；图标尺寸改由底板定', () => {
    const m = cssSrc.match(/\.bigbtn\.icbtn\{[^}]*\}/);
    assert.ok(m, '缺 .bigbtn.icbtn 规则');
    assert.ok(m[0].includes('display:flex'), 'icbtn 不是 flex');
    assert.ok(m[0].includes('justify-content:flex-start'), 'icbtn 未左对齐');
    assert.ok(m[0].includes('gap:12px'), 'icbtn 缺 gap:12px');
    assert.ok(m[0].includes('padding:8px 16px'), 'icbtn 内边距不是 8px 16px');
    assert.ok(!cssSrc.includes('.bigbtn.icbtn img.btn-ic{width:48px;height:48px}'), '48px 直引规则未删（图标尺寸改由底板定）');
  });

  test('屋内 3 按钮与道馆收藏馆按钮图标进 48 底板', () => {
    for (const n of ['pokemon-storage', 'partner-care', 'wheel-hub']) {
      assert.ok(appSrc.includes(`<span class="btn-plate pl-48"><img class="btn-ic" src="/static/img/feat/${n}.webp"`), `${n} 未进 48 底板`);
    }
    assert.ok(appSrc.includes('<span class="btn-plate pl-48"><img class="btn-ic" src="/static/img/home/home-collection.webp"'), '道馆页收藏馆按钮未进 48 底板');
  });

  test('底板规则：透明无底色（只作定位槽）、52/48/40 三档、图标 40/38/30', () => {
    assert.ok(cssSrc.includes('.btn-plate{display:inline-flex;flex:none;align-items:center;justify-content:center;background:transparent;border:0;border-radius:14px}'), '缺底板基础规则');
    assert.ok(!cssSrc.includes('background:#FFF6E3;border:1px solid #E7C9A0;border-radius:14px}'), '底板仍有奶油底（用户 2026-11-14 定：图标无底色）');
    assert.ok(cssSrc.includes('.btn-plate.pl-52{width:52px;height:52px}'), '缺 52 底板');
    assert.ok(cssSrc.includes('.btn-plate.pl-48{width:48px;height:48px}'), '缺 48 底板');
    assert.ok(cssSrc.includes('.btn-plate.pl-40{width:40px;height:40px}'), '缺 40 底板');
    assert.ok(cssSrc.includes('.btn-plate img.btn-ic{width:40px;height:40px}'), '52 底板内图标不是 40px');
    assert.ok(cssSrc.includes('.btn-plate.pl-48 img.btn-ic{width:38px;height:38px}'), '48 底板内图标不是 38px');
    assert.ok(cssSrc.includes('.btn-plate.pl-40 img.btn-ic{width:30px;height:30px}'), '40 底板内图标不是 30px');
    assert.ok(cssSrc.includes('.btn-plate .ic{width:40px;height:40px}'), '52 底板内线图标不是 40px');
  });

  test('按压：主按钮统一柔光阴影（返工 2026-11-14：4px 彩色底边改为单阴影 token）、按下下移 2px、阴影消失；禁用按钮无阴影', () => {
    // 返工 2026-11-14 item 5：四色 4px 底边全部改为 var(--shadow-float)，:active 改 box-shadow:none
    for (const c of ['#D98A3A', '#4C86C6', '#3E8A5C', '#E7C9A0']) {
      assert.ok(!cssSrc.includes(`box-shadow:0 4px 0 ${c}`), `仍有旧 4px 底边 ${c}`);
      assert.ok(!cssSrc.includes(`box-shadow:0 2px 0 ${c}`), `仍有旧 2px 底边 ${c}`);
    }
    assert.ok(cssSrc.includes('box-shadow:var(--shadow-float)'), '主按钮缺统一阴影 token');
    assert.ok(cssSrc.includes('.bigbtn:active{transform:translateY(2px);box-shadow:none}'), '按下未下移 2px 或阴影未消失');
    assert.ok(cssSrc.includes('.bigbtn.blue:active{box-shadow:none}'), '蓝色按钮按下阴影未消失');
    assert.ok(cssSrc.includes('.bigbtn.green:active{box-shadow:none}'), '绿色按钮按下阴影未消失');
    assert.ok(cssSrc.includes('.bigbtn.ghost:active{box-shadow:none}'), '描边按钮按下阴影未消失');
    assert.ok(cssSrc.includes('.bigbtn:disabled{opacity:var(--opacity-disabled);cursor:default;box-shadow:none}'), '禁用按钮仍有阴影');
  });

  test('阴影只留主按钮与弹层（返工 2 第 3 条）：blue/green/ghost/secondary 非主按钮须显式 box-shadow:none', () => {
    assert.ok(cssSrc.includes('.bigbtn{display:block;width:100%;font-size:22px;font-weight:600;color:var(--text);background:var(--pri);border:0;border-radius:var(--radius-control);padding:18px;margin:16px 0;cursor:pointer;transition:transform .1s;box-shadow:var(--shadow-float)}'), '主按钮（.bigbtn 基底）缺阴影');
    assert.ok(cssSrc.includes('.modal{background:#fff;border-radius:16px;padding:20px;max-width:400px;width:100%;text-align:center;box-shadow:var(--shadow-float);animation:pop 250ms var(--ease-out)}'), '弹层（.modal）缺阴影');
    assert.ok(cssSrc.includes('.bigbtn.blue{background:var(--blue);color:var(--text);box-shadow:none}'), 'blue 仍有阴影');
    assert.ok(cssSrc.includes('.bigbtn.green{background:var(--green);color:var(--text);box-shadow:none}'), 'green 仍有阴影');
    assert.ok(cssSrc.includes('.bigbtn.ghost{background:#fff;color:var(--text);border:2px solid var(--orange);box-shadow:none}'), 'ghost 仍有阴影');
    assert.ok(cssSrc.includes('.bigbtn.icbtn.secondary{justify-content:center;height:56px;padding:6px 16px;border:2px solid #FFC98A;border-radius:22px;background:#fff;box-shadow:none}'), 'secondary 仍有阴影');
  });

  test('每日行高 64、图标 44；招式格 76、图标 52；图标投影统一', () => {
    assert.ok(cssSrc.includes('min-height:64px'), '每日行不是 min-height 64px');
    assert.ok(cssSrc.includes('.sm-name img.sm-ic{width:44px;height:44px'), '每日图标不是 44px');
    assert.ok(cssSrc.includes('.moveicon{') && cssSrc.includes('width:76px'), '招式格不是 76px');
    assert.ok(cssSrc.includes('.moveicon img{width:52px;height:52px'), '招式图标不是 52px');
    assert.ok(cssSrc.includes('filter:drop-shadow(0 2px 0 rgba(90,59,30,.18))'), '缺图标投影');
  });

  test('深棕文字在彩色按钮上的对比度 ≥4.5:1（实测，不改白色）', () => {
    const root = cssSrc.match(/:root\{[^}]*\}/)[0];
    const v = (name) => root.match(new RegExp(`--${name}:(#[0-9A-Fa-f]{6})`))[1];
    const lum = (hex) => {
      const [r, g, b] = [0, 2, 4].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const text = v('text').slice(1);
    for (const [name, bg] of [['blue', v('blue').slice(1)], ['green', v('ok').slice(1)], ['pri', v('pri').slice(1)]]) {
      assert.ok(ratio(text, bg) >= 4.5, `深棕文字在 ${name} 上对比度 ${ratio(text, bg).toFixed(2)} < 4.5`);
    }
  });
});

describe('大木博士之家三按钮：中英双语同一文本块对齐（2026-11-13 用户截图纠正）', () => {
  test('三按钮文字用 biTx 收进同一 .bi-tx 块，英文在上、中文在下', () => {
    for (const [zh, en] of [['精灵仓库', 'Pokémon Storage'], ['伙伴养成', 'Partner Care'], ['转盘中心', 'Wheel Hub']]) {
      assert.ok(appSrc.includes(`\${biTx('${zh}', '${en}')}`), `${zh} 未用 biTx`);
    }
    // 任务 94 (JS-M1)：biTx 改读 state.lang（openOak 的 isBi 已删）
    assert.ok(appSrc.includes('const biTx = (zh, en) => state.lang === \'en\' ? `<span class="bi-tx"><span class="bi-en">${en}</span><span class="bi-sub">${zh}</span></span>` : `<span class="bi-tx">${zh}</span>`;'), '缺 biTx 定义');
  });

  test('openOak 三按钮里无裸 bi()（裸 bi 在 flex 按钮内会被拆成英文／中文两个并排 item，基线对不上）', () => {
    const hub = appSrc.slice(appSrc.indexOf('async function openOak(childId)'), appSrc.indexOf('window.openOak = openOak;'));
    // 标题 h2 与问候 <p> 仍用裸 bi（块容器内 <br> 换行，上下结构正常）
    assert.ok(hub.includes("${bi('大木博士之家'"), '标题不用 bi 了？');
    assert.ok(hub.includes("${bi('你好呀！今天想在家里做些什么呢？'"), '问候不用 bi 了？');
    const btns = hub.split('<button class="bigbtn');
    assert.equal(btns.length, 4, '屋内应有 3 个按钮');
    for (const b of btns.slice(1)) assert.ok(!b.includes('${bi('), '按钮里仍有裸 bi()');
  });

  test('.bi-tx 规则：纵向 flex、左对齐、占满剩余宽；中文在 show-gloss 下才显示为块', () => {
    assert.ok(cssSrc.includes('.bigbtn.icbtn .bi-tx{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left;line-height:1.3;min-width:0;flex:1 1 auto}'), '缺 .bi-tx 规则');
    assert.ok(cssSrc.includes('.bigbtn.icbtn .bi-tx .bi-en{font-weight:600}'), '缺 .bi-en 规则');
    assert.ok(cssSrc.includes('body.show-gloss .bigbtn.icbtn .bi-tx .bi-sub{display:block;font-size:var(--fs-label);color:var(--text-2);font-weight:400}'), '中文未在 show-gloss 下显示为块');
  });

  test('仓库副文案钉右缘、定宽 64px 换两行、去 margin-top（原 margin-top:2px 把它往下顶了 2px；不限宽时一行占 108px，会把 Pokémon Storage 挤成两行）', () => {
    assert.ok(appSrc.includes('margin-left:auto;text-align:right;flex:none;width:64px'), 'whSub 未钉右缘或未定宽 64px');
    assert.ok(!appSrc.includes('opacity:.85;margin-top:2px'), 'whSub 仍有 margin-top:2px');
  });
});
