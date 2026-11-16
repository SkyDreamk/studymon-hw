/* 全站双语第一批之 1a 单测：node --test tests/bilingual-batch1a.test.mjs
 * 范围：overview 管线、首页/底栏/开关行翻译、年级标签翻译；不含 goChild/打卡/问答/Oak 正文（后续分片）。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const backSrc = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');

describe('语言管线', () => {
  test('overview 返回 englishMode', () => {
    // 111: overview 读 english_mode 的方式已改为 Promise.all 批量（原顺序单键），
    // 断言改为守行为：overview 从 english_mode 取值、返回 englishMode。
    assert.match(backSrc, /getSetting\(db, 'english_mode'\)/);
    assert.match(backSrc, /englishMode: englishModeRaw === '1',/);
  });
  test('loadOverview 从 overview 取语言，默认中文', () => {
    assert.match(appSrc, /state\.lang = j\.englishMode \? 'en' : 'zh';/);
    assert.match(appSrc, /function tr\(zh, en\) \{\n  return state\.lang === 'en' \? en : zh;\n\}/);
  });
});

describe('首页与底栏', () => {
  test('首页标题、家长入口、底栏四 Tab 走 tr()', () => {
    assert.match(appSrc, /tr\(\.\.\.LANG\.homeTitle\)/);
    assert.match(appSrc, /tr\(\.\.\.LANG\.parentEntry\)/);
    assert.match(appSrc, /tr\(\.\.\.LANG\.companions\)/);
    assert.match(appSrc, /tr\(\.\.\.LANG\.checkin\)/);
    assert.match(appSrc, /tr\(\.\.\.LANG\.gym\)/);
    assert.match(appSrc, /tr\(\.\.\.LANG\.pokedex\)/);
  });
  test('年级标签英文模式翻为 Grade 1/3，其他原样', () => {
    assert.match(appSrc, /function trGrade\(label\)/);
    assert.match(appSrc, /if \(label === '一年级'\) return 'Grade 1';/);
    assert.match(appSrc, /if \(label === '三年级'\) return 'Grade 3';/);
  });
  // 2026-11-14 设置页美化：开关行去掉与开关重复的「已开启/已关闭」状态字（英文模式行曾因此换行断裂），
  // 状态改由开关本身（role="switch"＋aria-checked）表达；中英双写由标题＋说明承担。
  // 同日用户令标题简化为「中文|English」（旧标题 18px 下 211px、栏宽 183px，换两行）。
  test('开关行始终中英双写', () => {
    assert.match(appSrc, /中文\|English/);
    assert.match(appSrc, /riddles stay in Chinese/);
    // 111: 开关改为 psetToggleHtml 统一生成（运行时 onclick 仍是 toggleEnglishMode(true/false)），
    // 断言改为守接线：英文行把 'toggleEnglishMode' 交给 helper、helper 按 checked 生成 onclick。
    assert.match(appSrc, /psetToggleHtml\(s\.englishMode, 'toggleEnglishMode', loading\)/);
    assert.match(appSrc, /function psetToggleHtml\(checked, fnName, loading\)/);
    assert.doesNotMatch(appSrc, /中文\|English<\/span><span class="pset-s">/);
  });
  test('脑筋急转弯内容未被翻译函数触碰', () => {
    // 本批不引入 riddle 翻译字典键
    assert.doesNotMatch(appSrc, /riddle.*tr\(/i);
  });
});

describe('英文模式字号修复（2026-10-31 用户截图）', () => {
  const cssSrc = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');
  test('英文模式顶栏/卡片/按钮缩小，中文规则原样', () => {
    // 返工 2026-11-14 item 5：1.12rem→20px、中文 1.35rem→22px，英文仍比中文小一档
    assert.match(cssSrc, /\.lang-en \.topbar \.title\{font-size:20px\}/);
    assert.match(cssSrc, /\.lang-en \.kidname\{font-size:20px\}/);
    assert.match(cssSrc, /\.lang-en \.streak\{font-size:var\(--fs-label\)\}/);
    assert.match(cssSrc, /\.topbar \.title\{font-size:22px/);
  });
  test('body lang-en 类随语言切换，卡片内容可收缩、箭头不收缩', () => {
    assert.match(appSrc, /document\.body\.classList\.toggle\('lang-en', state\.lang === 'en'\)/);
    assert.match(appSrc, /<div style="flex:1;min-width:0">/);
    assert.match(appSrc, /<div style="font-size:22px;flex:none">›<\/div>/);
  });
});

describe('英文连续打卡 pill 收短（2026-10-31 17:05 截图）', () => {
  test('英文 streak 文案为 Streak:，中文不变', () => {
    assert.match(appSrc, /streak: \['连续打卡 ', 'Streak: '\]/);
    assert.match(appSrc, /days: \[' 天', ' days'\]/);
  });
});

describe('第一批切片 2：伙伴页 goChild 翻译', () => {
  test('伙伴页静态文案走 tr()/LANG，动态名原样', () => {
    assert.match(appSrc, /childSlice2Home: \['首页', 'Home'\]/);
    assert.match(appSrc, /childSlice2Moves: \['已学会的招式', 'Moves learned'\]/);
    assert.match(appSrc, /tr\(\.\.\.LANG\.childSlice2Checkin\)/);
    assert.match(appSrc, /esc\(form\.formName\)/);
    assert.match(appSrc, /esc\(m\.name\)/);
  });
  test('今日作业区已删（2026-11-09，用户定：与 Check-in 页重复）', () => {
    assert.doesNotMatch(appSrc, /childSlice2Homework/);
    assert.doesNotMatch(appSrc, /childSubjectStatus/);
    assert.doesNotMatch(appSrc, /childSlice2NotSubmitted/);
  });
});

describe('第一批切片 3：打卡页 goCheckinPage 翻译', () => {
  test('打卡页标题、按钮、状态、提示走翻译键', () => {
    assert.match(appSrc, /checkinSlice3Submit: tr\('提交', 'Submit'\)/);
    assert.match(appSrc, /checkinSlice3Edit: tr\('修改', 'Edit'\)/);
    assert.match(appSrc, /checkinSlice3Photos: tr\('照片', 'Photos'\)/);
    assert.match(appSrc, /childTop\(biTitle\(\.\.\.LANG\.checkinSlice3Title/);
  });
});

describe('第一批切片 4a：问答弹窗翻译', () => {
  test('问答弹窗与反馈走 quizSlice4 键，复习面不动', () => {
    assert.match(appSrc, /quizSlice4Submit: tr\('提交答案', 'Submit answer'\)/);
    assert.match(appSrc, /quizSlice4CorrectXP:/);
    assert.match(appSrc, /quizSlice4Encounter:/);
    assert.match(appSrc, /onclick="submitReviewAnswer\(\)">提交答案<\/button>/);
  });
});

describe('第一批切片 4b：Oak 弹窗翻译', () => {
  test('Oak 弹窗、录音、评估文案走 oakSlice4 键，showZh 逻辑不动', () => {
    assert.match(appSrc, /oakSlice4Title: \['大木博士', 'Dr\. Oak'\]/);
    assert.match(appSrc, /oakSlice4Record: \['跟读录音', 'Read aloud/);
    assert.match(appSrc, /oakSlice4Practice:/);
    assert.match(appSrc, /s\.showZh !== false/);
  });
});

describe('第一批英文溢出修补包（2026-10-31 18:19 截图）', () => {
  test('打卡页标题收短、问答按钮收短、本周单复数', () => {
    assert.match(appSrc, /checkinSlice3Title: \['作业打卡', 'Check-in'\]/);
    assert.match(appSrc, /questionsRemaining: \[' 题）', ' left\)'\]/);
    assert.match(appSrc, /weekApproved===1 \? 'Checked in 1 day this week'/);
  });
  test('英文模式统计标签单行不换行（任务 111：标签 14px 单行，旧换行规则废止）、Oak chip 不换行不压缩', () => {
    const cssSrc = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');
    assert.match(cssSrc, /\.lang-en \.statcell span\{font-size:14px;white-space:nowrap\}/);
    assert.doesNotMatch(cssSrc, /\.lang-en \.statcell span\{[^}]*white-space:normal/);
    assert.match(cssSrc, /\.lang-en \.qchip\{white-space:nowrap;flex:none\}/);
  });
});

describe('第二批切片1：背包与封印蛋（2026-10-31）', () => {
  test('封印蛋与背包界面文案走 tr()、动态名原样', () => {
    assert.match(appSrc, /eggSlice1Title: \['收藏馆', 'Collection Hall'\]/);
    assert.match(appSrc, /tr\('封印蛋', 'Sealed eggs'\)|Sealed eggs/);
    assert.match(appSrc, /bpSlice1Title: \['背包', 'Backpack'\]/);
    assert.match(appSrc, /biTitle\('精灵球', 'Poké Balls'\)/);
    assert.match(appSrc, /biTitle\('道具', 'Items'\)/);
    assert.match(appSrc, /biTitle\('伙伴与进化', 'Companions & Evolution'\)/);
    assert.match(appSrc, /tr\('进化！', 'Evolve!'\)/);
    assert.match(appSrc, /esc\(it\.name\)/);
    assert.match(appSrc, /esc\(e\.speciesName/);
  });
});

describe('第二批：背包/封印蛋/图鉴/道馆/PvP/照顾/对战擂台（2026-10-31）', () => {
  test('第二批界面文案走 tr()、动态名原样', () => {
    assert.match(appSrc, /biTitle\('精灵球', 'Poké Balls'\)/);
    assert.match(appSrc, /biTitle\('伙伴与进化', 'Companions & Evolution'\)/);
    assert.match(appSrc, /biTitle\('我的图鉴', 'My Pokédex'\)/);
    assert.match(appSrc, /tr\('种族值', 'Base stats'\)/);
    assert.match(appSrc, /biTitle\('周末道馆', 'Weekend Gym'\)/);
    assert.match(appSrc, /biTitle\('兄弟对战 周末冠军赛', 'Sibling battles Weekend championship'\)/);
    assert.match(appSrc, /biTitle\('照顾伙伴', 'Care for companion'\)/);
    assert.match(appSrc, /道馆第 \$\{v\.stage\} 关/);
    assert.match(appSrc, /防守还剩 \$\{left\} 秒/);
    assert.match(appSrc, /esc\(it\.name\)/);
    assert.match(appSrc, /esc\(e\.name\)/);
  });
  test('合作状态常量未被改写（英文映射在用处）', () => {
    assert.match(appSrc, /const COOP_STATE_TXT = \{ gathering: '集结中'/);
  });
});

describe('背包页中英双语演示（2026-10-31，仅英文模式、仅背包页）', () => {
  test('双语 helper 与样式存在、中文模式原样', () => {
    assert.match(appSrc, /const isBi = state\.lang === 'en';/);
    assert.match(appSrc, /const bi = \(zh, en\) => isBi \? `\$\{en\}<span class="bi-sub"><br>\$\{zh\}<\/span>` : zh;/);
    assert.match(appSrc, /const biTitle = \(zh, en\) => isBi \? `\$\{en\}<span class="bi-title-zh"> · \$\{zh\}<\/span>` : zh;/);
    assert.match(appSrc, /ballCell\('<span class="pb-mini"><\/span>', bi\('精灵球', 'Poké Ball'\)/);
    const cssSrc = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');
    assert.match(cssSrc, /\.bi-sub\{font-size:var\(--fs-label\);color:var\(--text-2\);font-weight:400\}/);
  });
  test('释义开关：默认关、按孩子记忆、仅背包页顶栏有按钮', () => {
    assert.match(appSrc, /function glossKey\(\)\{ return 'gloss_' \+ selfChildId\(\); \}/);
    assert.match(appSrc, /function glossOn\(\)\{ try \{ return localStorage\.getItem\(glossKey\(\)\) === '1';/);
    assert.match(appSrc, /function toggleGloss\(btn\)\{ const on = !glossOn\(\);/);
    assert.match(appSrc, /function childTop\(title, backFn, streak, glossBtn\)/);
    assert.match(appSrc, /state\.lang === 'en' && glossBtn \? `<button class="iconbtn\$\{glossOn\(\) \? ' gloss-on' : ''\}" onclick="toggleGloss\(this\)"/);
    assert.match(appSrc, /childTop\(`\$\{ic\('backpack'\)\} \$\{biTitle\(\.\.\.LANG\.bpSlice1Title\)\}`, `goChild\(\$\{id\}\)`, undefined, true\)/);
    assert.match(appSrc, /document\.body\.classList\.toggle\('show-gloss', state\.lang === 'en' && glossOn\(\)\);/);
    const cssSrc = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');
    assert.match(cssSrc, /\.bi-sub\{display:none\}/);
    assert.match(cssSrc, /body\.show-gloss \.bi-sub\{display:inline\}/);
    assert.match(cssSrc, /\.bi-title-zh\{display:none\}/);
    assert.match(cssSrc, /body\.show-gloss \.bi-title-zh\{display:inline\}/);
    assert.match(cssSrc, /\.topbar span \.iconbtn\.gloss-on\{background:#FF9F43;color:#fff;border-color:#FF9F43\}/);
  });
});

describe('顶栏去火焰标、打卡页表头显示连续打卡（2026-10-31；方案第 11 条改后）', () => {
  test('childTop 无 topchip、打卡页表头一行显示连续打卡（无火焰标）', () => {
    const childTopSrc = appSrc.slice(appSrc.indexOf('function childTop('), appSrc.indexOf('function childTop(') + 900);
    assert.doesNotMatch(childTopSrc, /topchip/);
    assert.match(childTopSrc, /toggleGloss\(this\)/);
    assert.match(appSrc, /class="checkin-head"/);
    assert.match(appSrc, /`Streak \$\{k\.streak\}\$\{k\.streak === 1 \? ' day' : ' days'\}`/);
  });
});

describe('释义开关推广 Slice A：childTop 调用处＋孩子主页（2026-10-31）', () => {
  test('9 处孩子端调用传 glossBtn、合作 3 处不动、主页问候语单行用 tr()（任务 111 Q1：小卡只有一行，bi() 会撑成两行）', () => {
    assert.match(appSrc, /childTop\(biTitle\(\.\.\.LANG\.checkinSlice3Title\), `goChild\(\$\{id\}\)`, k\.streak, true\)/);
    assert.match(appSrc, /childTop\(ic\('utensils'\) \+ ' ' \+ biTitle\('照顾伙伴', 'Care for companion'\), 'goChild\(' \+ id \+ '\)', undefined, true\)/);
    assert.match(appSrc, /childTop\('合作营地', `goChild\(\$\{p\.childId\}\)`\)/);
    assert.match(appSrc, /childTop\('合作战斗', `goCoop\(\$\{state\.childId\}\)`\)/);
    assert.doesNotMatch(appSrc, /childTop\('合作营地', `goChild\(\$\{p\.childId\}\)`, undefined, true\)/);
    assert.match(appSrc, /function childTop\(title, backFn, streak, glossBtn\) \{\n  document\.body\.classList\.toggle\('show-gloss', state\.lang === 'en' && glossOn\(\)\);/);
    assert.match(appSrc, /const biTitle = \(zh, en\) => isBi \? `\$\{en\}<span class="bi-title-zh"> · \$\{zh\}<\/span>` : zh;\n  const MAIN_LINES/);
    assert.match(appSrc, /biTitle\(\.\.\.LANG\.childSlice2Moves\)/);
    // 返工 2026-11-14 item 4：问候语收短（去“，今天也要加油哦”/“, let's go today!”），仍用 tr() 单行
    assert.match(appSrc, /tr\(`嗨，\$\{esc\(k\.name\)\}！\$\{greetPair\[0\]\}`, `Hi, \$\{esc\(k\.name\)\}! \$\{greetPair\[1\]\}`\)/);
  });
});

describe('释义开关推广 Slice B：打卡页 bi 化（2026-10-31；方案第 11 条改后）', () => {
  test('打卡页标题走 biTitle；21:30 提示卡走 tr（单语、示例图措辞）；空状态已删除', () => {
    assert.doesNotMatch(appSrc, /checkinSlice3Empty/);
    assert.match(appSrc, /checkinSlice3Note: \['每科单独审核，21:30 前提交有早交奖励，经验 ×1\.2。'/);
    assert.match(appSrc, /class="checkin-note"/);
    assert.match(appSrc, /tr\(\.\.\.LANG\.checkinSlice3Note\)/);
    assert.match(appSrc, /class="checkin-head"/);
    assert.match(appSrc, /checkinSlice3Submit: tr\('提交', 'Submit'\)/);
  });
});

describe('释义开关推广 Slice C：科目详情＋单元测试＋学校成绩上传（2026-10-31）', () => {
  test('三页 bi／tr 已接线、中文原文未动、select 选项未动', () => {
    assert.match(appSrc, /tr\(\.\.\.SUBJ_STATUS\[c\.status\]\)/);
    assert.match(appSrc, /bi\(`家长说：\$\{esc\(c\.reason\)\}<br>改好后点下面按钮重新提交。`/);
    assert.match(appSrc, /biTitle\('单元测试', 'Unit test'\)/);
    assert.match(appSrc, /counter\.textContent = state\.lang === 'en' \? `Answered/);
    assert.match(appSrc, /biTitle\('上传学校成绩', 'Upload school test score'\)/);
    assert.match(appSrc, /<select id="cst-subj"><option>语文<\/option><option>数学<\/option><option>英语<\/option><option>阅读<\/option><\/select>/);
    assert.match(appSrc, /tr\('交给爸爸妈妈审核', 'Submit for parent review'\)/);
  });
});

describe('释义开关推广 Slice D：野外遭遇 bi 化（2026-10-31）', () => {
  test('遭遇页标题／hero／按钮走 bi／tr，题干与 alert 未动', () => {
    assert.match(appSrc, /biTitle\('野外遭遇', 'Wild encounter'\)/);
    assert.match(appSrc, /bi\(`野生的\$\{esc\(e\.name\)\}出现了！`, `A wild \$\{esc\(e\.name\)\} appeared!`\)/);
    assert.match(appSrc, /tr\('确认答案，看看抓没抓到！', 'Check answers and see if you caught it!'\)/);
    assert.match(appSrc, /tr\(`扔大师球（有 \$\{e\.ballsMaster \|\| 0\} 颗，直接抓到，不用答题）`/);
    assert.match(appSrc, /alert\('现在没有野外遭遇'\)/);
  });
});

// Slice E1：道馆页 bi 化（标题 biTitle、兄弟对战说明 bi、加入按钮 tr）
test('sliceE1 gym biTitle + pvp picker bi + join button tr', () => {
  assert.match(appSrc, /childTop\(biTitle\('周末道馆', 'Weekend Gym'\)/);
  assert.match(appSrc, /biTitle\('兄弟对战 周末冠军赛', 'Sibling battles Weekend championship'\)/);
  assert.match(appSrc, /bi\('兄弟对战只在周末开放。/);
  assert.match(appSrc, /bi\('主宠固定出战，选 1 只备战宠', 'Main companion always fights, pick 1 backup pet'\)/);
  assert.match(appSrc, /tr\('加入对战！', 'Join battle!'\)/);
  assert.ok(!appSrc.includes("tr('zh', 'en')"), 'no tr(zh,en) isBi');
});

// Slice E2：图鉴＋照顾 bi 化
test('sliceE2 pokedex + care biTitle/bi', () => {
  assert.match(appSrc, /childTop\(biTitle\('我的图鉴', 'My Pokédex'\)/);
  assert.match(appSrc, /groupHtml\('伙伴进化线', 'Companion evolution lines', fLine\)/);
  assert.match(appSrc, /biTitle\('关都图鉴 151', 'Kanto Pokédex 151'\)/);
  assert.match(appSrc, /bi\('皮丘（172）、咩利羊（179）在原分册，不计入 151 进度。'/);
  assert.match(appSrc, /bi\('还没有学会招式', 'No moves learned yet'\)/);
  assert.match(appSrc, /childTop\(ic\('utensils'\) \+ ' ' \+ biTitle\('照顾伙伴', 'Care for companion'\)/);
  assert.match(appSrc, /biTitle\('喂食（每天一次）', 'Feeding \(once a day\)'\)/);
  assert.match(appSrc, /bi\('每天喂食、洗澡各一次，每次 \+10 友好度；喂对最爱口味再 \+5 经验。需要对应道具，没有就先去养成转盘抽一个。友好度越高，道馆单人战时主宠越容易硬撑、闪避和暴击。'/);
  assert.match(appSrc, /tr\('展开 ▸', 'Expand ▸'\)/);
});

// Slice F：对战擂台＋封印蛋＋问答弹窗 bi 化（Oak 弹窗不动）
test('sliceF battle + eggs + quiz bi', () => {
  assert.match(appSrc, /document\.body\.classList\.toggle\('show-gloss', glossOn\(\)\)/);
  assert.match(appSrc, /biTitle\('战况', 'Battle log'\)/);
  assert.match(appSrc, /bi\('等待对方进入对战——对方加入后，对战才开始哦'/);
  assert.match(appSrc, /bi\('用药算一次出招机会：这回合你用药就不出招/);
  assert.match(appSrc, /childTop\(biTitle\(\.\.\.LANG\.eggSlice1Title\)/);
  assert.match(appSrc, /biTitle\('奖励蛋（高级转盘／稀有转盘／单元测试获得，7 天孵化）'/);
  assert.match(appSrc, /quizSlice4ReadAloud: \['识字不多的话，请爸爸妈妈把题目读给你听哦'/);
  assert.match(appSrc, /bi\(\.\.\.LANG\.quizSlice4ReadAloud\)/);
  assert.match(appSrc, /bi\(\.\.\.LANG\.quizSlice4Pending\)/);
});
