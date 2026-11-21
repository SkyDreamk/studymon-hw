/* 第二期野外抓捕（共享战斗场景）后端测试：node --test tests/wild-capture.test.mjs
 * 覆盖：捕捉率档位（含超级 +15 / 高级 +30 / 失败 2 次后第 3 次必中 / 大师球）、start 幂等、
 * answer 一回合 1 题并按对错结算（requestId 重放不改 HP）、throw 服务端掷骰（注入随机源）
 * 与 requestId 幂等（不二次扣球）、倒下换人、全灭结束（status=fled）、pending 接回战斗状态、
 * 旧题组接口（无 requestId）不受影响。harness 同 encounter-approval-date（内存库＋迁移）。 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0026_rare_wheel.sql', '0027_daily_english.sql', '0028_care_wheel.sql', '0029_daily_english_assess.sql', '0030_daily_chinese.sql', '0031_daily_math.sql', '0043_pet_instances_ability.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
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
  const db = { prepare: (sql) => wrap(sql), async batch(stmts) { for (const s of stmts) await s.run(); return []; } };
  return { env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>') } }, raw };
}

let env, raw, c1;
async function call(path, { body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await M.default.fetch(new Request('https://test.local' + path, { method: 'POST', headers, body: body !== undefined ? JSON.stringify(body) : undefined }), env);
  const sc = res.headers.get('set-cookie');
  return { status: res.status, j: await res.json().catch(() => ({})), cookie: sc ? sc.split(';')[0] : cookie };
}
function today() {
  const o = {};
  for (const p of new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}
let rid = 0;
const R = () => `req-${Date.now()}-${++rid}`;

beforeEach(async () => {
  ({ env, raw } = makeEnv());
  const pin = await call('/api/parent/login', { body: { pin: '0000' } });
  await call('/api/parent/settings/update', { cookie: pin.cookie, body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] } });
  c1 = (await call('/api/child/login', { body: { childId: 1, password: '1111' } })).cookie;
  raw.prepare('UPDATE children SET total_xp=5000, balls=9, balls_super=9, balls_hyper=9, balls_master=2 WHERE id=1').run();
  for (let i = 1; i <= 40; i++) {
    raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,chapter) VALUES('study',3,'数学',?,'[\"对的\",\"错的\",\"不知道\",\"跳过\"]',0,'解析',1,0,0,NULL)").run(`野外题 ${i}：选「对的」`);
  }
});
afterEach(() => { delete globalThis.__wildRng; });

function newEnc(no = 16, name = '波波') {
  return Number(raw.prepare('INSERT INTO encounters(child_id,date,pokemon_no,name) VALUES(1,?,?,?)').run(today(), no, name).lastInsertRowid);
}
const answerOf = (qid) => raw.prepare('SELECT answer_idx FROM quiz_questions WHERE id=?').get(qid).answer_idx;
async function start(encId) {
  const p = await call('/api/encounter/pending', { cookie: c1, body: { childId: 1, wild: true } });
  assert.equal(p.j.encounter.phase, 'prebattle');
  const lead = p.j.encounter.prebattle.party[0].no;
  const s = await call('/api/encounter/start', { cookie: c1, body: { encounterId: encId, leadNo: lead } });
  assert.equal(s.j.ok, true, JSON.stringify(s.j));
  return s.j;
}
const ans = (encId, q, ok) => call('/api/encounter/answer', { cookie: c1, body: { encounterId: encId, questionId: q.id, answerIdx: ok ? answerOf(q.id) : (answerOf(q.id) + 1) % 4, requestId: R() } });
const thr = (encId, ball, requestId = R()) => call('/api/encounter/throw', { cookie: c1, body: { encounterId: encId, ball, requestId } });

test('wildCatchRate 档位：≥70→25；40–69→50；16–39→75；≤15→必中；超级+15、高级+30、封顶 100', () => {
  const w = (pct) => ({ hp: pct, maxHp: 100 });
  assert.equal(M.wildCatchRate(w(100), 'normal', 0).rate, 25);
  assert.equal(M.wildCatchRate(w(70), 'normal', 0).rate, 25);
  assert.equal(M.wildCatchRate(w(69), 'normal', 0).rate, 50);
  assert.equal(M.wildCatchRate(w(40), 'normal', 0).rate, 50);
  assert.equal(M.wildCatchRate(w(39), 'normal', 0).rate, 75);
  assert.equal(M.wildCatchRate(w(16), 'normal', 0).rate, 75);
  assert.equal(M.wildCatchRate(w(15), 'normal', 0).rate, 100);
  assert.equal(M.wildCatchRate(w(1), 'normal', 0).rate, 100);
  assert.equal(M.wildCatchRate(w(50), 'super', 0).rate, 65);
  assert.equal(M.wildCatchRate(w(50), 'hyper', 0).rate, 80);
  assert.equal(M.wildCatchRate(w(30), 'hyper', 0).rate, 100); // 75+30 封顶
  assert.equal(M.wildCatchRate(w(10), 'super', 0).rate, 100); // 必中档叠加仍 100
  assert.equal(M.wildCatchRate(w(100), 'normal', 2).rate, 100); // 失败 2 次后第 3 次必中
  assert.equal(M.wildCatchRate(w(100), 'normal', 1).rate, 25);
  assert.equal(M.wildCatchRate(w(100), 'master', 0).rate, 100);
});

test('预备战 pending：野生名字+随身队伍，无 HP；点入口不产生 start/throw', async () => {
  const id = newEnc();
  const p = await call('/api/encounter/pending', { cookie: c1, body: { childId: 1, wild: true } });
  assert.equal(p.j.ok, true);
  const e = p.j.encounter;
  assert.equal(e.id, id);
  assert.equal(e.phase, 'prebattle');
  assert.equal(e.view, null);
  assert.equal(e.prebattle.wild.name, '波波');
  assert.ok(e.prebattle.party.length >= 1 && e.prebattle.party.length <= 5);
  assert.equal(raw.prepare('SELECT quiz_state, balls_used FROM encounters WHERE id=?').get(id).quiz_state, null);
});

test('start：恰好开战一次，leadNo 即队首；重复 start 原样返回不重开', async () => {
  const id = newEnc();
  const s = await start(id);
  assert.equal(s.started, true);
  assert.equal(s.view.sides.A.pets[0].no, s.leadNo);
  assert.equal(s.view.sides.B.pets[0].hp, s.view.sides.B.pets[0].maxHp);
  assert.ok(s.question && s.question.options.length === 4);
  const before = raw.prepare('SELECT quiz_state FROM encounters WHERE id=?').get(id).quiz_state;
  const again = await call('/api/encounter/start', { cookie: c1, body: { encounterId: id, leadNo: s.leadNo } });
  assert.equal(again.j.already, true);
  assert.equal(raw.prepare('SELECT quiz_state FROM encounters WHERE id=?').get(id).quiz_state, before);
  const bad = await call('/api/encounter/start', { cookie: c1, body: { encounterId: newEnc(19, '小拉达'), leadNo: 150 } });
  assert.equal(bad.j.code, 'LEAD_NOT_CARRIED');
});

test('answer：答对打野生（22%）、答错挨打（25%）；同 requestId 重放不改 HP、不多一题', async () => {
  const id = newEnc();
  const s = await start(id);
  const w0 = s.view.sides.B.pets[0].maxHp;
  const rid1 = R();
  const q1 = s.question;
  const r1 = await call('/api/encounter/answer', { cookie: c1, body: { encounterId: id, questionId: q1.id, answerIdx: answerOf(q1.id), requestId: rid1 } });
  assert.equal(r1.j.ok, true, JSON.stringify(r1.j));
  assert.equal(r1.j.correct, true);
  assert.equal(r1.j.view.sides.B.pets[0].hp, w0 - Math.ceil(w0 * 0.22));
  assert.equal(r1.j.view.sides.A.pets[0].hp, s.view.sides.A.pets[0].maxHp);
  assert.ok(r1.j.question && r1.j.question.id !== q1.id);
  const stateBefore = raw.prepare('SELECT quiz_state FROM encounters WHERE id=?').get(id).quiz_state;
  const replay = await call('/api/encounter/answer', { cookie: c1, body: { encounterId: id, questionId: q1.id, answerIdx: answerOf(q1.id), requestId: rid1 } });
  assert.equal(replay.j.replay, true);
  assert.equal(replay.j.view.sides.B.pets[0].hp, r1.j.view.sides.B.pets[0].hp);
  assert.equal(raw.prepare('SELECT quiz_state FROM encounters WHERE id=?').get(id).quiz_state, stateBefore);
  const r2 = await ans(id, r1.j.question, false);
  assert.equal(r2.j.correct, false);
  const a0 = r2.j.view.sides.A.pets[0];
  assert.equal(a0.hp, a0.maxHp - Math.ceil(a0.maxHp * 0.25));
  assert.equal(r2.j.view.sides.B.pets[0].hp, r1.j.view.sides.B.pets[0].hp);
  // 旧题已换：用旧题号答会被挡
  const stale = await call('/api/encounter/answer', { cookie: c1, body: { encounterId: id, questionId: q1.id, answerIdx: 0, requestId: R() } });
  assert.equal(stale.status, 409);
  const noRid = await call('/api/encounter/answer', { cookie: c1, body: { encounterId: id, answers: [] } });
  assert.equal(noRid.j.ok, false); // 无 requestId 走旧题组口径：没有扔球不能答
});

test('throw：服务端掷骰（注入随机源）；骰值 < 捕捉率即中；晃 1–3；回包含 HP/库存；requestId 重放不二次扣球', async () => {
  const id = newEnc();
  await start(id);
  globalThis.__wildRng = () => 0.30; // roll=30：精灵球 25% 不中；晃动数 = 1+floor(0.3*3)=1
  const rid1 = R();
  const t1 = await thr(id, 'normal', rid1);
  assert.equal(t1.j.ok, true, JSON.stringify(t1.j));
  assert.equal(t1.j.catchRate, 25);
  assert.equal(t1.j.caught, false);
  assert.ok(t1.j.wobbles >= 1 && t1.j.wobbles <= 3);
  assert.equal(t1.j.balls, 8);
  assert.equal(t1.j.failedThrows, 1);
  assert.ok(t1.j.view.sides.B.pets[0].hp > 0 && t1.j.wild.maxHp > 0);
  const rep = await thr(id, 'normal', rid1);
  assert.equal(rep.j.replay, true);
  assert.equal(rep.j.wobbles, t1.j.wobbles);
  assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 8, '重放不再扣球');
  assert.equal(raw.prepare('SELECT balls_used FROM encounters WHERE id=?').get(id).balls_used, 1);
  // 超级球：100% 野生血量 → 25+15=40；roll 30 < 40 → 中
  const t2 = await thr(id, 'super');
  assert.equal(t2.j.catchRate, 40);
  assert.equal(t2.j.caught, true);
  assert.equal(t2.j.wobbles, 3);
  assert.equal(t2.j.status, 'caught');
  assert.equal(raw.prepare('SELECT status, hits FROM encounters WHERE id=?').get(id).status, 'caught');
  assert.ok(raw.prepare("SELECT 1 x FROM pokedex WHERE child_id=1 AND entry_key='wild:16'").get());
  assert.equal(raw.prepare('SELECT balls_super FROM children WHERE id=1').get().balls_super, 8);
});

test('失败 2 次后第 3 次必中；扔球回合野生不追打', async () => {
  const id = newEnc();
  const s = await start(id);
  globalThis.__wildRng = () => 0.99;
  const a0 = s.view.sides.A.pets[0].hp;
  const t1 = await thr(id, 'normal');
  const t2 = await thr(id, 'normal');
  assert.equal(t1.j.caught, false);
  assert.equal(t2.j.caught, false);
  assert.equal(t2.j.view.sides.A.pets[0].hp, a0, '扔球回合不挨打');
  const t3 = await thr(id, 'normal');
  assert.equal(t3.j.catchRate, 100);
  assert.equal(t3.j.forced, 'third');
  assert.equal(t3.j.caught, true);
});

test('低血档位：连答对到 ≤15% 时必中；中途 HP 档位按 50/75 取', async () => {
  const id = newEnc();
  let s = await start(id);
  let q = s.question;
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const r = await ans(id, q, true);
    q = r.j.question;
    const w = r.j.view.sides.B.pets[0];
    seen.push(M.wildCatchRate(w, 'normal', 0).rate);
    assert.ok(w.hp >= 1, '野生最低留 1 HP，不被打倒');
  }
  assert.deepEqual(seen, [25, 50, 75, 100]);
  const th = await thr(id, 'normal');
  assert.equal(th.j.catchRate, 100);
  assert.equal(th.j.caught, true);
});

test('大师球：预备战可扔、0 题、必中、扣 1 颗；requestId 重放不二次扣', async () => {
  const id = newEnc();
  const rid1 = R();
  const t = await thr(id, 'master', rid1);
  assert.equal(t.j.ok, true, JSON.stringify(t.j));
  assert.equal(t.j.caught, true);
  assert.equal(t.j.catchRate, 100);
  assert.equal(t.j.ballsMaster, 1);
  const rep = await thr(id, 'master', rid1);
  assert.equal(rep.j.replay, true);
  assert.equal(raw.prepare('SELECT balls_master FROM children WHERE id=1').get().balls_master, 1);
  assert.equal(raw.prepare('SELECT COUNT(*) n FROM quiz_attempts').get().n, 0, '全程不落作答记录');
  const non = await thr(newEnc(19, '小拉达'), 'normal');
  assert.equal(non.j.ok, false, '预备战只有大师球可扔');
});

test('倒下换人：答错到上场宠倒下 → 先换人才能继续；全灭 → 遭遇结束（fled）', async () => {
  const id = newEnc();
  const s = await start(id);
  let q = s.question;
  let last;
  for (let i = 0; i < 4; i++) { last = await ans(id, q, false); q = last.j.question; }
  assert.equal(last.j.view.sides.A.pets[0].hp, 0);
  const party = last.j.view.sides.A.pets;
  if (party.length > 1) {
    assert.equal(last.j.needSwitch, true);
    const blocked = await ans(id, q, true);
    assert.equal(blocked.j.ok, false);
    const sw = await call('/api/encounter/switch', { cookie: c1, body: { encounterId: id, swapToIdx: 1, requestId: R() } });
    assert.equal(sw.j.ok, true, JSON.stringify(sw.j));
    assert.equal(sw.j.view.sides.A.activeIdx, 1);
    assert.equal(sw.j.view.needSwitch, false);
    // 全部答错到全灭
    q = sw.j.question;
    for (let i = 0; i < 100 && !last.j.wipe; i++) {
      last = await ans(id, q, false);
      q = last.j.question;
      if (last.j.needSwitch) {
        const idx = last.j.view.sides.A.pets.findIndex((p) => p.hp > 0);
        const s2 = await call('/api/encounter/switch', { cookie: c1, body: { encounterId: id, swapToIdx: idx, requestId: R() } });
        assert.equal(s2.j.ok, true);
        q = s2.j.question;
      }
    }
  }
  assert.equal(last.j.wipe, true);
  assert.equal(last.j.status, 'fled');
  assert.equal(raw.prepare('SELECT status FROM encounters WHERE id=?').get(id).status, 'fled');
  const p = await call('/api/encounter/pending', { cookie: c1, body: { childId: 1, wild: true } });
  assert.equal(p.j.encounter, null);
});

test('pending 接回战斗：HP、失败次数、当前题、先发都在；离开后遭遇保留', async () => {
  const id = newEnc();
  const s = await start(id);
  globalThis.__wildRng = () => 0.99;
  const r = await ans(id, s.question, true);
  const t = await thr(id, 'normal');
  assert.equal(t.j.caught, false);
  const lv = await call('/api/encounter/leave', { cookie: c1, body: { encounterId: id } });
  assert.equal(lv.j.kept, true);
  const p = await call('/api/encounter/pending', { cookie: c1, body: { childId: 1, wild: true } });
  const e = p.j.encounter;
  assert.equal(e.phase, 'battle');
  assert.equal(e.failedThrows, 1);
  assert.equal(e.question.id, r.j.question.id);
  assert.equal(e.view.sides.B.pets[0].hp, t.j.view.sides.B.pets[0].hp);
  assert.equal(e.view.sides.A.pets[0].no, s.leadNo);
  assert.equal(e.balls, 8);
});

test('旧题组接口（无 requestId）不受影响', async () => {
  const id = newEnc();
  const th = await call('/api/encounter/throw', { cookie: c1, body: { encounterId: id, ball: 'normal' } });
  assert.equal(th.j.ok, true, JSON.stringify(th.j));
  assert.equal(th.j.questions.length, 1);
  assert.equal(th.j.wobbles, undefined);
});
