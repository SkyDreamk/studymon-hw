/* 对战规则三阶段测试（DESIGN-对战规则-方案-v1.md §4）：
 * node --test tests/pvp-rules.test.mjs
 * harness 同 battle.test.mjs（node:sqlite 内存库＋迁移 0001–0019），时间用 TEST_MODE 的
 * debug_day_offset 拨到目标星期，打卡天数用已通过行作 fixture。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));
const APP_JS = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const STYLE_CSS = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  const wrap = (sql) => ({
    _args: [],
    bind(...args) { this._args = args; return this; },
    async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
    async all() { return { results: raw.prepare(sql).all(...this._args) }; },
    async run() {
      const r = raw.prepare(sql).run(...this._args);
      return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  const db = {
    prepare: (sql) => wrap(sql),
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw,
  };
}

let env, raw;
beforeEach(() => { ({ env, raw } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}
async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200);
  return r.cookie;
}
async function setup() {
  const pc = await parentCookie();
  const r = await call('/api/parent/settings/update', {
    method: 'POST', cookie: pc,
    body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '0000'), c2: await childCookie(2, '0000') };
}

function realTodayStr() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}
function gotoWeekday(targetDow) {
  const todayStr = realTodayStr();
  const [y, m, d] = todayStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = (targetDow - dow + 7) % 7;
  raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset',?)").run(String(delta));
  const dateStr = M.addDays(todayStr, delta);
  return { dateStr, weekStart: M.weekStartMon(dateStr) };
}
function seedApprovedDays(childId, weekStart, n = 4) {
  for (let i = 0; i < n; i++) {
    raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
      VALUES(?,?, '["语文"]','语文','10:00',1,0,'approved',15,'10:05')`).run(childId, M.addDays(weekStart, i));
  }
}
function setXp(childId, xp) { raw.prepare('UPDATE children SET total_xp=? WHERE id=?').run(xp, childId); }
function giveDex(childId, key) {
  raw.prepare("INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,'2026-01-01')").run(childId, key);
}
async function pvpFixture() {
  const s = await setup();
  const { weekStart } = gotoWeekday(6); // 周六
  seedApprovedDays(1, weekStart, 4);
  seedApprovedDays(2, weekStart, 4);
  setXp(1, M.xpForLevel(12)); // 大宝 Lv.12
  setXp(2, M.xpForLevel(5));  // 小宝 Lv.5
  return { ...s, weekStart };
}
async function playPvpToEnd(c1, c2, battleId, v) {
  let guard = 0;
  while (v.status === 'active' && guard++ < 120) {
    // 2026-11-09 起防守题可能为脑筋急转弯：挂起就按题库正确答案作答，继续打
    if (v.phase === 'defense' && v.pending) {
      const qid = v.pending.question.id;
      const row = raw.prepare('SELECT options_json, answer_idx FROM quiz_questions WHERE id=?').get(qid);
      const options = JSON.parse(row.options_json);
      const answerText = options[row.answer_idx];
      const r = await call('/api/battle/defend', { method: 'POST', cookie: v.pending.defenderSide === 'A' ? c1 : c2, body: { battleId, answerText } });
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      v = r.j.battle;
      continue;
    }
    const side = v.sides[v.turn];
    const pet = side.pets[side.activeIdx];
    const mv = pet.moves[0];
    const body = { battleId, moveName: v.canAttack ? mv.name : null };
    const r = v.turn === 'A'
      ? await call('/api/battle/move', { method: 'POST', cookie: c1, body })
      : await call('/api/battle/move', { method: 'POST', cookie: c2, body });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    v = r.j.battle;
  }
  assert.ok(guard < 120, '对战应在有限回合内结束');
  assert.equal(v.status, 'finished');
  return v;
}

/* ---------------- 阶段 0：状态文案（R16/R17/R19）＋ 四态按钮（C8） ---------------- */

describe('对战规则阶段 0：状态文案与四态按钮', () => {
  test('pvp status 透传主宠展示字段（VS 卡用）：名字／立绘／属性／年级', async () => {
    const { c1 } = await pvpFixture();
    const ps = await call('/api/battle/pvp/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(ps.j.ok, true, JSON.stringify(ps.j));
    // 大宝 Lv.12 → 皮卡丘线 2 阶（皮卡丘 p25，电系）；小宝 Lv.5 → 1 阶（小火龙，火系）
    assert.equal(ps.j.me.mainPet.name, '皮卡丘');
    assert.equal(ps.j.me.mainPet.type, '电');
    assert.match(ps.j.me.mainPet.img, /p25\./);
    assert.equal(ps.j.me.grade, '三年级');
    assert.equal(ps.j.other.mainPet.name, '小火龙');
    assert.equal(ps.j.other.mainPet.type, '火');
    assert.match(ps.j.other.mainPet.img, /p4\./);
    assert.equal(ps.j.other.grade, '一年级');
  });

  test('前端静态守卫：标题／R16／R17／R19／C8 四态文案在位，旧标题与经验文案不在', () => {
    // C12 标题
    assert.ok(APP_JS.includes('兄弟对战 周末冠军赛'));
    assert.ok(!APP_JS.includes('兄弟对战（周末限定 · 每周 1 场）'), '旧标题应已替换');
    // R16：未到周末／打卡进度
    assert.ok(APP_JS.includes('还没到周末 周六 0 点开放'));
    assert.ok(APP_JS.includes('再完成'));
    assert.ok(APP_JS.includes('天就能开战'));
    assert.ok(!APP_JS.includes('兄弟对战只在周末开放哦'), '旧门禁文案应已替换为 R16 文案');
    // R17：场次计数＋再来一局三态
    assert.ok(APP_JS.includes('本周已战 <b>0/1 场</b>'));
    assert.ok(APP_JS.includes('本周已战 <b>1/1 场</b>'));
    assert.ok(APP_JS.includes('胜者 <b>+1 精灵球</b>，记为本周冠军'));
    assert.ok(APP_JS.includes('再来一局：<b>等爸爸妈妈批准</b>'));
    assert.ok(APP_JS.includes('家长已批准再来一局（剩 1 场）'));
    assert.ok(APP_JS.includes('再来一局已用完'));
    // R19：黄色虚线提示框
    assert.ok(APP_JS.includes('兄弟对战只在周末开放。'));
    assert.ok(APP_JS.includes('平时好好打卡、攒够 4 天，周末带着伙伴们来争本周冠军吧！'));
    assert.ok(APP_JS.includes('class="pvp-tip"'));
    // C8：四态主按钮
    assert.ok(APP_JS.includes("${ic('clock')}") && APP_JS.includes("tr('还没到周末'"));
    assert.ok(APP_JS.includes("${ic('pencil')}") && APP_JS.includes("tr('打卡还没满 4 天'"));
    assert.ok(APP_JS.includes("${ic('swords')}") && APP_JS.includes("tr('开始对战'"));
    assert.ok(APP_JS.includes("${ic('trophy')}") && APP_JS.includes("tr('本周冠军已决出'"));
    assert.ok(APP_JS.includes("${ic('hourglass')}") && APP_JS.includes("tr('等爸爸妈妈批准'"));
    // C1 否决：对战绝不提经验奖励
    assert.ok(!APP_JS.includes('+12 经验') && !APP_JS.includes('胜者 +12'), '对方经验口径不得出现');
    assert.ok(APP_JS.includes('不发经验'));
    // VS 卡：压平说明在位
    assert.ok(APP_JS.includes('等级按较低一方压平'));
    // CSS：状态行／提示框／灰按钮样式在位
    assert.ok(STYLE_CSS.includes('.pvp-state'));
    assert.ok(STYLE_CSS.includes('.pvp-count'));
    assert.ok(STYLE_CSS.includes('.pvp-tip'));
    assert.ok(STYLE_CSS.includes('.bigbtn.gray'));
  });
});

/* ---------------- 阶段 1：出战选择器改版（R18） ---------------- */

describe('对战规则阶段 1：出战选择器', () => {
  test('pvpCounter 与实战 typeMult 同源：水克火为真、草不克电为假、地面克电为真', async () => {
    const { c1 } = await pvpFixture();
    giveDex(1, 'wild:55'); // 大宝：哥达鸭（水）→ 克小宝主宠火
    giveDex(2, 'wild:43'); // 小宝：走路草（草）→ 不克大宝主宠电
    giveDex(2, 'wild:50'); // 小宝：地鼠（地面）→ 克大宝主宠电
    const ps = await call('/api/battle/pvp/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(ps.j.ok, true, JSON.stringify(ps.j));
    const my55 = ps.j.myCollection.find((c) => c.no === 55);
    assert.ok(my55, '大宝收藏应含哥达鸭');
    assert.equal(my55.pvpCounter, true, '水克火，角标应为真');
    const o43 = ps.j.otherCollection.find((c) => c.no === 43);
    assert.ok(o43, '小宝收藏应含走路草');
    assert.equal(o43.pvpCounter, false, '草不克电，角标应为假');
    const o50 = ps.j.otherCollection.find((c) => c.no === 50);
    assert.ok(o50, '小宝收藏应含地鼠');
    assert.equal(o50.pvpCounter, true, '地面克电，角标应为真');
    // 与实战同一事实源：typeMult 直接复核
    assert.equal(M.typeMult('水', '火'), 2);
    assert.equal(M.typeMult('草', '电'), 1);
    assert.equal(M.typeMult('地面', '电'), 2);
  });

  test('选宠进局与选择一致：建房 benchNo 落进 sides.A.pets[1]，加入方 benchNo 落进 sides.B.pets[1]', async () => {
    const { c1, c2 } = await pvpFixture();
    giveDex(1, 'wild:54'); // 大宝带可达鸭（水，野外池；#55 哥达鸭不在野外池，dex 键是 egg:55）
    giveDex(2, 'wild:50'); // 小宝带地鼠
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1, benchNo: 54 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    assert.equal(create.j.battle.sides.A.pets.length, 2);
    assert.equal(create.j.battle.sides.A.pets[1].no, 54);
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c1, body: { battleId, childId: 2, password: '0000', benchNo: 50 } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    assert.equal(join.j.battle.sides.B.pets.length, 2);
    assert.equal(join.j.battle.sides.B.pets[1].no, 50);
  });

  test('前端静态守卫：两栏选择器在位、对方栏禁用、旧单栏选择器已撤', () => {
    assert.ok(APP_JS.includes('function pvpTeamPickerHtml'));
    assert.ok(APP_JS.includes('的出战伙伴'));
    assert.ok(APP_JS.includes('对方加入时自己选'));
    assert.ok(APP_JS.includes('已选好，加入后开战'));
    assert.ok(APP_JS.includes('主宠固定出战，选 1 只备战宠'));
    assert.ok(APP_JS.includes('pvpCounter'), '克制角标应读后端 pvpCounter');
    assert.ok(APP_JS.includes('克制'), '角标文案应含“克制”');
    assert.ok(APP_JS.includes('克制！'), '备战行角标应含“克制！”');
    assert.ok(!APP_JS.includes('我带哪只备战？'), '建房旧单栏选择器标题应已撤');
    // 隔离：非交互栏胶囊带 disabled（登录方点不动对方栏）
    const helper = APP_JS.slice(APP_JS.indexOf('function pvpTeamPickerHtml'), APP_JS.indexOf('function renderGymPage'));
    assert.ok(helper.includes('disabled'), '选择器 helper 应对非交互栏输出 disabled');
    // CSS
    assert.ok(STYLE_CSS.includes('.pvp-pickers'));
    assert.ok(STYLE_CSS.includes('.pvp-picker'));
    assert.ok(STYLE_CSS.includes('.benchballs'), 'PvP 备战选择器与道馆同款精灵球排');
  });
});

/* ---------------- 修复：加入方在浏览器里看得到 waiting 局（2026-10-27 浏览器验收发现） ---------------- */

describe('对战规则修复：加入方 status 看得到对方 waiting 局', () => {
  test('加入方 pvp/status 返回对方 waiting 局（mySide=B）；再点开始对战不建第二局；加入后双方 status 一致', async () => {
    const { c1, c2 } = await pvpFixture();
    giveDex(1, 'wild:54'); // 大宝带可达鸭
    giveDex(2, 'wild:50'); // 小宝带地鼠
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1, benchNo: 54 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    // 加入方查 status：应看到对方的 waiting 局，mySide=B（此前查不到，加入表单是死代码）
    const ps2 = await call('/api/battle/pvp/status', { method: 'POST', cookie: c2, body: { childId: 2 } });
    assert.equal(ps2.j.ok, true, JSON.stringify(ps2.j));
    assert.ok(ps2.j.myMatch, '加入方 status 应含对方 waiting 局');
    assert.equal(ps2.j.myMatch.battleId, battleId);
    assert.equal(ps2.j.myMatch.status, 'waiting');
    assert.equal(ps2.j.myMatch.mySide, 'B');
    // 加入方再点“开始对战”：create 应回 opponentWaiting，不建第二局
    const again = await call('/api/battle/pvp/create', { method: 'POST', cookie: c2, body: { childId: 2 } });
    assert.equal(again.j.ok, true, JSON.stringify(again.j));
    assert.equal(again.j.opponentWaiting, true);
    assert.equal(again.j.battle.battleId, battleId);
    const n = raw.prepare("SELECT COUNT(*) n FROM battles WHERE mode='pvp' AND week_start=? AND status='waiting'").get(ps2.j.weekStart).n;
    assert.equal(n, 1, '本周 waiting 局应只有一局');
    // 加入后：双方 status 都是同一局，mySide 各为 A/B
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c1, body: { battleId, childId: 2, password: '0000', benchNo: 50 } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    const ps1 = await call('/api/battle/pvp/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(ps1.j.myMatch.battleId, battleId);
    assert.equal(ps1.j.myMatch.mySide, 'A');
    const ps2b = await call('/api/battle/pvp/status', { method: 'POST', cookie: c2, body: { childId: 2 } });
    assert.equal(ps2b.j.myMatch.battleId, battleId);
    assert.equal(ps2b.j.myMatch.mySide, 'B');
    assert.equal(ps2b.j.myMatch.status, 'active');
  });

  test('debug-reset 清掉再来一局申请：已批准的申请不残留到下一轮', async () => {
    const { pc, c1, c2 } = await pvpFixture();
    giveDex(1, 'wild:54');
    giveDex(2, 'wild:50');
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1, benchNo: 54 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c1, body: { battleId, childId: 2, password: '0000', benchNo: 50 } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    await playPvpToEnd(c1, c2, battleId, join.j.battle);
    const req = await call('/api/battle/pvp/rematch/request', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(req.j.ok, true, JSON.stringify(req.j));
    const list = await call('/api/parent/pvp-rematch', { cookie: pc });
    assert.equal(list.j.rematch.status, 'pending');
    const dec = await call('/api/parent/pvp-rematch/decide', { method: 'POST', cookie: pc, body: { id: list.j.requestId, approve: true } });
    assert.equal(dec.j.ok, true, JSON.stringify(dec.j));
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM pvp_rematch_requests').get().n, 1);
    // debug-reset 回出厂：申请表应清空，否则已批准的申请同周内一直打开对战（canOpen），污染下一轮
    const rst = await call('/api/parent/debug-reset', { method: 'POST', cookie: pc, body: { confirm: true } });
    assert.equal(rst.j.ok, true, JSON.stringify(rst.j));
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM pvp_rematch_requests').get().n, 0, 'debug-reset 后再来一局申请表应为空');
  });
});

/* ---------------- 阶段 2：荣誉墙（L2/L5） ---------------- */

describe('对战规则阶段 2：荣誉墙', () => {
  test('defenseSummaryFromLog：只计答对的四档，超时／放弃／答错不计，闪避单独计', () => {
    const log = [
      { type: 'defense', side: 'A', kind: 'dodge' },
      { type: 'defense', side: 'A', kind: 'block' },
      { type: 'defense', side: 'A', kind: 'timeout' },
      { type: 'defense', side: 'A', kind: 'failed' },
      { type: 'defense', side: 'B', kind: 'guard' },
      { type: 'defense', side: 'B', kind: 'ward' },
      { type: 'defense', side: 'B', kind: 'skipped' },
      { type: 'attack', side: 'A' },
      { type: 'defense', side: 'C', kind: 'dodge' }, // 非法 side 忽略
    ];
    assert.deepEqual(M.defenseSummaryFromLog(log), {
      A: { answered: 2, dodges: 1 },
      B: { answered: 2, dodges: 0 },
    });
    assert.deepEqual(M.defenseSummaryFromLog(null), { A: { answered: 0, dodges: 0 }, B: { answered: 0, dodges: 0 } });
    assert.deepEqual(M.defenseSummaryFromLog([]), { A: { answered: 0, dodges: 0 }, B: { answered: 0, dodges: 0 } });
  });

  test('完整对战：防守表现随结算进战报 recent[0].defense，与库内日志逐项一致', async () => {
    const { c1, c2 } = await pvpFixture();
    setXp(2, M.xpForLevel(12)); // 双方同为 Lv.12
    const { weekStart } = gotoWeekday(6);
    // 双方各有一道答对过的题，防守答题双向都会触发
    raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('study',1,'数学','1+1 等于几？','[\"2\",\"3\",\"4\",\"5\"]',0,'一根手指加一根手指是两根',1,0,0)").run();
    const qid = Number(raw.prepare('SELECT last_insert_rowid() AS id').get().id);
    for (const cid of [1, 2]) {
      raw.prepare('INSERT INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch) VALUES(?,?,?,1,10,0,0)').run(cid, qid, weekStart);
    }
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c1, body: { battleId, childId: 2, password: '0000' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    let v = join.j.battle;
    // 打完：遇防守挂起就按题库正确答案作答（防守题可能是历史科目题，也可能是 2026-11-09 起混入的脑筋急转弯），否则出招
    let guard = 0;
    while (v.status === 'active' && guard++ < 200) {
      if (v.phase === 'defense' && v.pending) {
        const qid = v.pending.question.id;
        const row = raw.prepare('SELECT options_json, answer_idx FROM quiz_questions WHERE id=?').get(qid);
        const options = JSON.parse(row.options_json);
        const answerText = options[row.answer_idx];
        const cookie = v.pending.defenderSide === 'A' ? c1 : c2;
        const r = await call('/api/battle/defend', { method: 'POST', cookie, body: { battleId, answerText } });
        assert.equal(r.j.ok, true, JSON.stringify(r.j));
        assert.equal(r.j.defense.correct, true);
        v = r.j.battle;
        continue;
      }
      const side = v.sides[v.turn];
      const pet = side.pets[side.activeIdx];
      const body = { battleId, moveName: v.canAttack ? pet.moves[0].name : null };
      const r = v.turn === 'A'
        ? await call('/api/battle/move', { method: 'POST', cookie: c1, body })
        : await call('/api/battle/move', { method: 'POST', cookie: c2, body });
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      v = r.j.battle;
    }
    assert.ok(guard < 200, '对战应在有限回合内结束');
    assert.equal(v.status, 'finished');

    // 库内日志逐项复核：recent[0].defense 须等于对日志跑同一纯函数的结果
    const row = raw.prepare('SELECT state FROM battles WHERE id=?').get(battleId);
    const st = JSON.parse(row.state);
    const expected = M.defenseSummaryFromLog(st.log);
    assert.ok(expected.A.answered + expected.B.answered > 0, '本场应至少有一次成功防守');
    assert.deepEqual(st.result.defense, expected);
    const ps = await call('/api/battle/pvp/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(ps.j.champions.length, 1);
    assert.equal(ps.j.recent.length, 1);
    assert.deepEqual(ps.j.recent[0].defense, expected);
    // 胜者是冠军；败者防守表现只在战报里，不进冠军榜（冠军榜只有胜者）
    assert.equal(ps.j.champions[0].childId, v.winnerChildId);
  });

  test('前端静态守卫：荣誉墙近 4 周口径＋防守子句＋上周冠军入口在位', () => {
    assert.ok(APP_JS.includes("${ic('trophy')}") && APP_JS.includes("biTitle('荣誉墙'"));
    assert.ok(APP_JS.includes('最近战报（近 4 周）'));
    assert.ok(APP_JS.includes('champions.slice(0, 4)'), '历周冠军只取近 4 周');
    assert.ok(APP_JS.includes('recent.slice(0, 4)'), '战报只取近 4 周');
    assert.ok(!APP_JS.includes('🏆 历周冠军'), '旧“历周冠军”标题应已换成荣誉墙');
    assert.ok(!APP_JS.includes('最近战绩'), '旧“最近战绩”标题应已换成近 4 周战报');
    assert.ok(APP_JS.includes('function pvpDefenseClause'));
    assert.ok(APP_JS.includes('守住了'));
    assert.ok(APP_JS.includes('次闪避'));
    assert.ok(APP_JS.includes('上周冠军'));
    assert.ok(APP_JS.includes('查看荣誉墙 ›'));
    assert.ok(APP_JS.includes('href="#pvp-honor"'));
  });
});
