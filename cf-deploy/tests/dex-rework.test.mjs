/* 图鉴卡片返工（2026-10-27，用户手机实测四件）单测：
 *  node --test tests/dex-rework.test.mjs
 * ① 伊布分支分区已撤：后端 /api/pokedex 不再返回 eeveeBranches，未获得分支不展示、不给详情；
 *    伊布本体卡片只列已获得的分支（进化一个点亮一个，路线由孩子自己发现）；
 * ② 进化线全量审计：dexEvoChain 对全部 165 只＋主宠线＋伊布分支＋馆主＋稀有逐条跑，
 *    不得含亲密度/白天/夜晚/美丽花；仙子伊布条件须提妖精技能石；隆隆岩 10 级门槛；
 * ③ 道馆精灵球：matchupsForType 与实战同源（TYPE_CHART 只做弱点 ×2）；前端道馆选择器为精灵球、
 *    点球开卡片、卡片内有克制列表与“带它备战”按钮；PvP 两栏选择器不动；
 * ④ 抽奖入口横幅已撤（2026-10-27 用户定：不固定在每个界面、不要广告标签感）：
 *    面板顶部横幅＋跳转函数＋横幅按钮全部清理；两区锚点＋“上传单元测试抽奖”标题保留
 *    （设置页内登记区不动）；上传成绩入口改放孩子端伙伴页，家长审批在审核 tab。
 * ⑥ 主宠球按实际形态：mainPetEntry 用 /api/child 的 form（attachEvoForm 挂载的实际形态）按 formIdx 找当前条目；
 *    蛋孩子不再被错认成一阶（主宠球曾显示皮丘、点开无反应）；蛋点球弹 5 级孵化提示，不进卡片。
 * 真实 Azure 调用 0 次。 */
import { assetPath } from './asset-path.mjs';
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const M = await import(new URL('../src/index.js', import.meta.url));
const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql',
  '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql',
  '0010_pvp_rematch.sql', '0019_evo_items.sql',
];
let raw, env;
function makeEnv() {
  raw = new DatabaseSync(':memory:');
  for (const name of MIGRATIONS) raw.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  raw.exec("UPDATE children SET name='测试伙伴'");
  const db = {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() { return raw.prepare(sql).get(...args) || null; },
        async all() { return { results: raw.prepare(sql).all(...args) }; },
        async run() { const r = raw.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
      };
    },
    async batch(stmts) { return Promise.all(stmts.map((s) => s.run())); },
  };
  return { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } };
}
async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await M.default.fetch(new Request('https://test.local' + path, {
    method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
  }), env);
  return { status: res.status, j: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0], res };
}
async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}
/* 全面解锁（2026-10-28）：DEBUG_GATES_OPEN 改为 = isTestMode(env) 后，以下旧断言须在正式模式（无 TEST_MODE）下跑才仍成立；测试站放行行为改由 tests/test-mode-unlock.test.mjs 覆盖。 */
async function toProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(env.DB, env);
}

async function pokedex(childId, cookie) {
  const r = await call('/api/pokedex', { method: 'POST', body: { childId }, cookie });
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, true);
  return r.j;
}

describe('dex rework 2026-10-27', () => {
  beforeEach(() => { env = makeEnv(); });
  afterEach(() => raw.close());

  test('① 伊布分支分区已撤：后端无 eeveeBranches、未获得分支不泄露详情', async () => {
    await toProd();
    const cookie = await parentCookie();
    const j = await pokedex(1, cookie);
    // 大宝默认皮丘线、未进化任何伊布分支：响应里不再有 eeveeBranches 字段，8 个分支号在任何分区都不出现
    assert.equal(Object.hasOwn(j, 'eeveeBranches'), false);
    const allNos = [...j.lineEntries, ...j.wild, ...j.others, ...j.eggSpecies, ...j.collection].map((e) => e.no);
    for (const no of [134, 135, 136, 196, 197, 470, 471, 700]) assert.equal(allNos.includes(no), false, `#${no} 不应出现`);
    // 其余未获得条目仍不泄露详情（野外未获得示例）
    const lockedWild = j.wild.find((e) => !e.unlocked);
    assert.ok(lockedWild);
    for (const field of ['types', 'moves', 'abilities', 'stats', 'evo', 'matchups', 'obtainedAt']) assert.equal(Object.hasOwn(lockedWild, field), false);
  });

  test('② 进化线全量审计：165 只＋主宠线＋馆主，无官方亲密度/昼夜/美丽花', async () => {
    const details = JSON.parse(readFileSync(new URL('../data/pokedex-details.json', import.meta.url), 'utf8'));
    const nos = details.species.map((s) => Number(s.no));
    assert.equal(nos.length, 165);
    const banned = ['亲密度', '白天', '夜晚', '美丽花', '182'];
    const chainText = (c) => JSON.stringify(c);
    for (const no of nos) {
      const c = M.dexEvoChain(no);
      for (const bad of banned) assert.equal(chainText(c).includes(bad), false, `#${no} 含禁用词 ${bad}`);
    }
    // 主宠线 5 条：终极一律 16级＋石，无官方 32/36 级
    for (const [key, line] of Object.entries(M.LINES)) {
      if (key === 'eevee') continue;
      const fin = line.forms[2];
      const txt = chainText(M.dexEvoChain(fin.no));
      assert.match(txt, /16级＋.+之石/);
      assert.doesNotMatch(txt, /32级|36级/);
    }
    // 隆隆岩 10 级门槛、护具、黑奇石、金属膜、电力增强器
    assert.equal(M.dexEvoChain(76).chain[2].cond, '连接交换（10级以上）');
    assert.equal(M.dexEvoChain(464).chain[2].cond, '使用护具连接交换');
    assert.deepEqual(M.dexEvoChain(123).branches.map((b) => b.cond), ['使用金属膜连接交换', '使用黑奇石']);
    assert.equal(M.dexEvoChain(208).chain[1].cond, '使用金属膜连接交换');
    assert.equal(M.dexEvoChain(466).chain[1].cond, '使用电力增强器连接交换');
    // 馆主链
    assert.equal(M.dexEvoChain(125).chain[1].cond, '使用电力增强器连接交换');
    assert.deepEqual(M.dexEvoChain(151), { chain: [{ no: 151, name: '梦幻', cond: null }], branches: null });
  });

  test('③ matchupsForType 与 PvE 官方口径同源（弱点 ×2、抗性 ×0.5、免疫 ×0）', () => {
    const mu = M.matchupsForType;
    assert.deepEqual(mu('电'), { strong: ['水', '飞行'], weak: ['地面'], resist: ['电', '飞行'], immune: [] });
    assert.deepEqual(mu('水'), { strong: ['火', '地面', '岩石'], weak: ['电', '草'], resist: ['水', '火'], immune: [] });
    assert.deepEqual(mu('火'), { strong: ['草'], weak: ['水', '地面', '岩石'], resist: ['火', '草'], immune: [] });
    assert.deepEqual(mu('草'), { strong: ['水', '地面', '岩石'], weak: ['火', '飞行'], resist: ['电', '水', '草', '地面'], immune: [] });
    assert.deepEqual(mu('地面'), { strong: ['电', '火', '岩石'], weak: ['水', '草'], resist: ['岩石'], immune: ['电'] });
    assert.deepEqual(mu('岩石'), { strong: ['火', '飞行'], weak: ['水', '草', '地面'], resist: ['火', '飞行', '普通'], immune: [] });
    assert.deepEqual(mu('飞行'), { strong: ['草'], weak: ['电', '岩石'], resist: ['草'], immune: ['地面'] });
    assert.deepEqual(mu('龙'), { strong: ['龙'], weak: ['龙'], resist: ['电', '水', '火', '草'], immune: [] });
    assert.deepEqual(mu('普通'), { strong: [], weak: [], resist: [], immune: [] });
    assert.deepEqual(mu('冰'), { strong: [], weak: [], resist: [], immune: [] });
    assert.deepEqual(mu(null), { strong: [], weak: [], resist: [], immune: [] });
    for (const t of M.TYPES) {
      for (const v of M.TYPES) {
        assert.equal(mu(t).strong.includes(v), M.typeMultOfficial(t, v) === 2, `${t} 克 ${v}`);
        assert.equal(mu(t).resist.includes(v), M.typeMultOfficial(v, t) === 0.5, `${v} 抗 ${t}`);
        assert.equal(mu(t).immune.includes(v), M.typeMultOfficial(v, t) === 0, `${v} 免疫 ${t}`);
        assert.equal(mu(t).weak.includes(v), M.typeMultOfficial(v, t) === 2, `${v} 克 ${t}`);
      }
    }
  });

  test('③/① 前端静态：分支格子可点、卡片有克制区与未获得标记、道馆精灵球、PvP 不动', () => {
    const app = readFileSync(assetPath('app.js'), 'utf8');
    const css = readFileSync(assetPath('style.css'), 'utf8');
    // 伊布分支分区已撤：格子函数、分区标题、石头名表一并清理（未获得分支不展示、不给详情）
    assert.doesNotMatch(app, /function dexBranchSlot\(/);
    assert.doesNotMatch(app, /伊布进化分支/);
    assert.doesNotMatch(app, /EVO_STONE_NAMES/);
    // 卡片：克制关系区＋道馆“带它备战”；“未获得 · 仅展示资料”标记已删（未获得条目打不开卡片），
    // 卡片切片里 dex-card-unlocked 的断言一并删掉（该类只剩 style.css.orig 里的样式定义，样式断言在后文保留）
    const card = app.slice(app.indexOf('function openDexCard('), app.indexOf('window.toggleDex151'));
    assert.doesNotMatch(card, /dex-card-unlocked/);
    assert.doesNotMatch(card, /未获得 · 仅展示资料/);
    assert.match(card, /dex-card-matchups/);
    assert.match(card, /克制关系（PvE 官方口径）/);
    assert.match(card, /抗性：/);
    assert.doesNotMatch(card, /无抗性/);
    assert.match(card, /PvE 官方口径/);
    assert.match(card, /PvP 答题对战另有规则/);
    assert.match(card, /pickGymBenchFromCard/);
    assert.match(card, /带它备战/);
    assert.match(card, /只带主宠/);
    // 道馆选择器：精灵球样式，点球开卡片；旧胶囊渲染已删
    const bench = app.slice(app.indexOf('function benchPickerHtml('), app.indexOf('/* 对战规则：单场战报一句话'));
    assert.match(bench, /class="pokeball/);
    assert.match(bench, /pb-ball/);
    assert.match(bench, /openGymBenchCard\(/);
    assert.doesNotMatch(bench, /class="movechip pick/);
    // 紧凑版（2026-10-27 用户纠正）：球下只一行名字，不画任何附加信息行
    assert.doesNotMatch(bench, /克制第/);
    assert.doesNotMatch(bench, /<small/);
    assert.doesNotMatch(bench, /不带备战/);
    assert.doesNotMatch(bench, /与主宠同步/);
    assert.doesNotMatch(bench, /系 · 备战/);
    // 克制宠仍排前（只排序，徽章已移进卡片）
    assert.match(bench, /克制宠排前/);
    assert.match(app, /function openGymBenchCard\(no\)/);
    assert.match(app, /function pickGymBenchFromCard\(\)/);
    assert.match(app, /window\._dexCardGym = \{ childId: G\.id, benchNo: no \|\| null \}/);
    // closeModal 清上下文，防卡片从图鉴页打开还带“带它备战”
    assert.match(app, /function closeModal\(\) \{ modalRoot\.innerHTML = ''; window\._dexCardGym = null;/);
    // PvP 两栏选择器（2026-11-05 用户验收：改精灵球样式，与道馆同款；旧文字胶囊已删）
    assert.match(app, /function pvpTeamPickerHtml\(o\)/);
    const pvp = app.slice(app.indexOf('function pvpTeamPickerHtml('), app.indexOf('function renderGymPage'));
    assert.match(pvp, /class="pokeball/);
    assert.match(pvp, /pb-ball/);
    assert.doesNotMatch(pvp, /class="movechip pick/);
    assert.doesNotMatch(pvp, /pvp-caps/);
    // 样式在位
    assert.match(css, /\.benchballs\{/);
    assert.match(css, /\.pokeball\{/);
    assert.match(css, /\.pb-ball\{/);
    // 紧凑版尺寸：球 52px（48–56px 区间内），按钮 min-width 64px
    assert.match(css, /\.pb-ball\{[^}]*width:52px;height:52px/);
    assert.match(css, /\.pokeball\{[^}]*min-width:64px/);
    assert.match(css, /\.dex-card-unlocked\{/);
    assert.match(css, /\.dex-card-matchups\{/);
  });

  test('⑤ 随身队伍点开属性卡片（2026-11-05 用户验收）：主宠＋携带格可点，仓库态存入/交换不动', () => {
    const app = readFileSync(assetPath('app.js'), 'utf8');
    const row = app.slice(app.indexOf('function partyRowFiveBallsHtml('), app.indexOf('window.partyRowFiveBallsHtml'));
    assert.match(row, /openPartyPetCard\(\$\{Number\(opts\.childId\)\}, \$\{Number\(c\.no\)\}\)/);
    assert.match(row, /openPartyPetCard\(\$\{Number\(opts\.childId\)\}, \$\{mainNo\}\)/);
    assert.match(row, /warehouseStorePet\(/);
    assert.match(row, /confirmWarehouseSwap\(/);
    assert.match(app, /function openPartyPetCard\(childId, no\)/);
    const fn = app.slice(app.indexOf('function openPartyPetCard('), app.indexOf('window.openPartyPetCard'));
    assert.match(fn, /openDexCard\(hit\.key\)/);
    assert.doesNotMatch(fn, /_dexCardGym/);
    assert.match(fn, /e\.no === n && e\.unlocked/);
  });

  test('④ 前端静态：抽奖入口横幅已撤、孩子端上传学校成绩入口在位', () => {
    const app = readFileSync(assetPath('app.js'), 'utf8');
    // 横幅已撤：全站任何 tab 都不再出现；跳转函数与横幅按钮一并清理（不留死代码）
    assert.doesNotMatch(app, /🎁 抽奖入口/);
    assert.doesNotMatch(app, /goParentLottery\(/);
    assert.doesNotMatch(app, /lotteryBanner/);
    assert.doesNotMatch(app, /登记学校成绩抽转盘/);
    // 两区锚点 id（每孩唯一）与新标题保留（设置页内登记区不动）
    assert.match(app, /id="school-test-\$\{c\.id\}"/);
    assert.match(app, /id="unit-test-\$\{c\.id\}"/);
    assert.match(app, /<h3 id="unit-test-\$\{c\.id\}"[^>]*>\$\{ic\('pencil'\)\} 上传单元测试抽奖<\/h3>/);
    // 旧标题已改名
    assert.doesNotMatch(app, /App 单元测试（85 分以上抽奖）/);
    // 孩子端入口：伙伴页挂载点＋加载函数＋上传表单＋提交接口
    assert.match(app, /id="schoolTestEntry-\$\{k\.id\}"/);
    assert.match(app, /loadSchoolTestEntry\(k\.id\)/);
    assert.match(app, /上传学校成绩/);
    assert.match(app, /openSchoolTestUpload\(/);
    // 2026-11-14 用户令：上传表单单加一个「期末考试」快捷选项（点一下考试名称填「期末考试」；稀有转盘认 unit 含「期末」，值须是中文）
    assert.ok(app.includes("document.getElementById('cst-unit').value='期末考试'"), '孩子端上传表单缺期末考试快捷选项');
    assert.match(app, /document\.getElementById\('st-unit-\$\{c\.id\}'\)\.value='期末考试'/, '家长端登记表单缺期末考试快捷选项');
    assert.match(app, /\/api\/child\/school-test\/submit/);
    assert.match(app, /\/api\/child\/school-tests\?childId=/);
    // 家长审核 tab：待审核成绩卡片＋通过／驳回＋试卷照片查看
    assert.match(app, /reviewSchoolTest\(/);
    assert.match(app, /\/api\/parent\/school-test\/review/);
    assert.match(app, /\/api\/parent\/school-photo\/\$\{r\.id\}/);
  });

  test('⑥ 主宠球按实际形态（蛋孩子不认成一阶；终极须用过石头）', () => {
    const app = readFileSync(assetPath('app.js'), 'utf8');
    // mainPetEntry：用 /api/child 的 form（实际形态），按 formIdx 找当前条目；已进化分支走 collection＋branchNo
    const fn = app.slice(app.indexOf('function mainPetEntry('), app.indexOf('window.mainPetEntry'));
    assert.match(fn, /form\.formIdx/);
    assert.match(fn, /e\.current && e\.formIdx === idx/);
    assert.match(fn, /form\.branch/);
    assert.match(fn, /form\.branchNo/);
    assert.match(fn, /dx\.collection/);
    // 两处调用（点球开卡、道馆渲染）都走 mainPetEntry；旧的 e.current && e.no != null 分支查找已删，全文件 0 处
    assert.equal((app.match(/mainPetEntry\(dx, G\.form\)/g) || []).length, 2);
    assert.equal((app.match(/e\.current && e\.no != null/g) || []).length, 0);
    // goGym 把 /api/child 的 form 存进 _gymPage
    assert.match(app, /form: cd\.ok \? cd\.child\.form : null/);
    // 蛋：球里蛋图标（名字显示主宠名，蛋态为“神秘的蛋”；紧凑版已删“还是颗蛋”副文案），点球弹 5 级孵化提示，不进卡片
    assert.doesNotMatch(app, /还是颗蛋 · 升到 5 级孵化/);
    assert.match(app, /还是颗蛋呢！升到 5 级就孵化成/);
  });

  test('⑦ 美化三处修正：真实蛋＋底部原版 emoji＋家长设置精灵立绘', () => {
    const app = readFileSync(assetPath('app.js'), 'utf8');
    // ① 真实的蛋（§52 按物种区分）：旧 emoji 蛋纹已删，全部蛋渲染走 eggHtml（CSS 底色＋花纹）
    assert.doesNotMatch(app, /eggPatternIcon/);
    assert.doesNotMatch(app, /egg\.pattern/);
    assert.doesNotMatch(app, /🥚/);
    assert.match(app, /function eggHtml\(d, size\)/);
    assert.match(app, /eggHtml\(form\.egg \|\| EGG_FALLBACK, 72\)/); // 伙伴小卡蛋（任务 111：大卡 150 → 小卡 72）
    assert.match(app, /eggHtml\(k\.form\.egg \|\| EGG_FALLBACK, 110\)/); // 照顾页
    assert.match(app, /eggHtml\(form\.egg \|\| EGG_FALLBACK, 60\)/); // avatarHtml
    assert.match(app, /eggHtml\(e\.egg \|\| EGG_FALLBACK, 56\)/); // 图鉴格子
    assert.match(app, /eggHtml\(e\.egg \|\| EGG_FALLBACK, 32\)/); // 封印蛋页（封印＋奖励两行）
    assert.match(app, /eggHtml\(e\.egg \|\| EGG_FALLBACK, 24\)/); // 背包蛋行
    assert.match(app, /eggHtml\(it\.egg \|\| EGG_FALLBACK, 24\)/); // 道具图标 egg:*
    assert.match(app, /eggHtml\(eggDesign \|\| EGG_FALLBACK, 20\)/); // 道馆备战球（20px 仍可分辨）
    assert.match(app, /eggHtml\(mp\.egg \|\| EGG_FALLBACK, 34\)/); // PvP 选择器主宠行
    assert.match(app, /eggHtml\(mp\.egg \|\| EGG_FALLBACK, 72\)/); // VS 卡
    assert.match(app, /eggHtml\(p\.egg \|\| EGG_FALLBACK, size\)/); // 战斗 petFace
    // 封印蛋页与对战卡：蛋按物种画，不再用通用蛋
    assert.doesNotMatch(app, /ic\('sparkles'\) : '🥚'/);
    // ③ 底部导航改用小程序图标母版两态 PNG（2026-11-13 用户令网页版图标同步更新；标题仍走 tr()/LANG）
    const tab = app.slice(app.indexOf('function tabbar()'), app.indexOf('/* 孩子子页常驻顶栏'));
    assert.match(tab, /\/static\/img\/tabs\/\$\{name\}\$\{keys\.includes\(v\) \? '-active' : ''\}\.webp/);
    assert.match(tab, /<span class="e">\$\{ic\(\['child', 'eggs', 'encounter', 'daily-english', 'backpack'\], 'tab-home'\)\}<\/span>\$\{tr\(\.\.\.LANG\.companions\)\}/);
    assert.match(tab, /<span class="e">\$\{ic\(\['checkin', 'subject'\], 'tab-checkin'\)\}<\/span>\$\{tr\(\.\.\.LANG\.checkin\)\}/);
    assert.match(tab, /<span class="e">\$\{ic\(\['gym'\], 'tab-gym'\)\}<\/span>\$\{tr\(\.\.\.LANG\.gym\)\}/);
    assert.match(tab, /<span class="e">\$\{ic\(\['pokedex'\], 'tab-pokedex'\)\}<\/span>\$\{tr\(\.\.\.LANG\.pokedex\)\}/);
    assert.doesNotMatch(tab, /🐾|📝|🏯|📖/);
    assert.match(app, /companions: \['伙伴', 'Companions'\]/);
    assert.match(app, /checkin: \['打卡', 'Check-in'\]/);
    assert.match(app, /gym: \['道馆', 'Gym'\]/);
    assert.match(app, /pokedex: \['图鉴', 'Pokédex'\]/);
    assert.doesNotMatch(tab, /ic\('(paw|pencil|swords|book)'\)/);
    // ② 家长设置伙伴线：立绘 img＋linesprites 排版
    assert.match(app, /class="linegrid linesprites"/);
    assert.match(app, /l\.img \? `<img loading="lazy" src="\$\{l\.img\}"/);
  });

  test('⑧ 伙伴怪兽线紧凑版：参考道馆备战球排，立绘在上、小字在下、五条线一排', () => {
    const app = readFileSync(assetPath('app.js'), 'utf8');
    const css = readFileSync(assetPath('style.css'), 'utf8');
    // 后端 lines 带 short（去“线”字后缀），供一行小字标签用
    assert.match(src, /short: v\.label\.replace\(\/线\$\/, ''\)/);
    // 前端按钮：立绘在上、short 标签在下、选中 ✓ 为右上角徽；旧的“线名 ✓”拼进标签写法已删
    assert.match(app, /<span>\$\{esc\(l\.short \|\| l\.label\)\}<\/span>/);
    assert.match(app, /<i class="linecheck">✓<\/i>/);
    assert.doesNotMatch(app, /\$\{l\.label\}\$\{c\.line === l\.key \? ' ✓' : ''\}/);
    // CSS：五列一排、纵向（立绘上＋标签下）、标签 .72rem 一行；旧横排样式已删
    assert.match(css, /\.linegrid\.linesprites\{display:grid;grid-template-columns:repeat\(5,1fr\);gap:6px/);
    assert.match(css, /\.linegrid\.linesprites \.smallbtn\{position:relative;flex-direction:column;gap:2px;min-height:0;padding:6px 2px/);
    assert.match(css, /\.linegrid\.linesprites \.smallbtn span\{font-size:\.66rem;line-height:1\.2;white-space:nowrap\}/);
    assert.match(css, /\.linegrid\.linesprites \.smallbtn \.linecheck\{position:absolute/);
    // 旧横排样式已删：守卫只对本规则断言（2026-11-13 任务 106：justify-content:flex-start 已合法用于 navgrid/icbtn 左对齐，全文件断言会误杀）
    const spriteBtn = css.match(/\.linegrid\.linesprites \.smallbtn\{[^}]*\}/);
    assert.ok(spriteBtn, '缺 linesprites smallbtn 规则');
    assert.doesNotMatch(spriteBtn[0], /justify-content:flex-start/);
  });
});
