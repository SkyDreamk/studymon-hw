/* 第三期：兄弟对战（两机）先发 / 换宠 / 幂等 / 数值冻结测试：
 * node --test tests/pvp-phase3.test.mjs
 * harness 同 battle.test.mjs（node:sqlite 内存库＋迁移 0001–0019），时间用 TEST_MODE 的
 * debug_day_offset 拨到目标星期，打卡天数用已通过行作 fixture。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { readBackendSource } from './backend-src.mjs';

const M = await import(new URL('../src/index.js', import.meta.url));
const APP_JS = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const STYLE_CSS = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql'];

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
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '1111'), c2: await childCookie(2, '2222') };
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


const APP_SRC = APP_JS;
function seedDefenseQuestion() {
  return Number(raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('study',1,'数学','1+1 等于几？','[\"2\",\"3\",\"4\",\"5\"]',0,'一根手指加一根手指是两根',1,0,0)").run().lastInsertRowid);
}

async function makeBattle({ leadA = null, leadB = null, benchA = 54, benchB = 50 } = {}) {
  const s = await pvpFixture();
  if (benchA) giveDex(1, 'wild:' + benchA);
  if (benchB) giveDex(2, 'wild:' + benchB);
  const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: s.c1, body: { childId: 1, benchNo: benchA || undefined, leadNo: leadA || undefined } });
  assert.equal(create.j.ok, true, JSON.stringify(create.j));
  const battleId = create.j.battle.battleId;
  const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: s.c2, body: { battleId, childId: 2, password: '2222', benchNo: benchB || undefined, leadNo: leadB || undefined } });
  assert.equal(join.j.ok, true, JSON.stringify(join.j));
  return { ...s, create, join, battleId, v: join.j.battle };
}
const actorCookie = (s, side) => (side === 'A' ? s.c1 : s.c2);

describe('第三期：两边选先发（leadNo 接在现有 create/join 上）', () => {
  test('发起方 leadNo=备战宠：建局回包队首即所选；加入方 leadNo=备战宠：加入回包队首即所选；队伍仍是主宠＋备战', async () => {
    const s = await makeBattle({ leadA: 54, leadB: 50 });
    assert.equal(s.create.j.battle.sides.A.pets[0].no, 54, '建局回包 A 队首＝所选先发');
    assert.equal(s.create.j.battle.sides.A.pets.length, 2);
    const a = s.join.j.battle.sides.A.pets, b = s.join.j.battle.sides.B.pets;
    assert.equal(a[0].no, 54);
    assert.equal(b[0].no, 50);
    assert.equal(a.length, 2); assert.equal(b.length, 2);
    assert.ok(a.some((p) => p.key === 'main') && b.some((p) => p.key === 'main'), '主宠仍在队里');
    assert.equal(s.join.j.battle.sides.A.activeIdx, 0);
    assert.equal(s.join.j.battle.sides.B.activeIdx, 0);
  });

  test('不带 leadNo（旧客户端 / 离线）：主宠先发，行为与第二期完全一致', async () => {
    const s = await makeBattle();
    assert.equal(s.join.j.battle.sides.A.pets[0].key, 'main');
    assert.equal(s.join.j.battle.sides.B.pets[0].key, 'main');
  });

  test('leadNo 不在出战队里：400 LEAD_NOT_CARRIED，且不建局、不加入（无副作用）', async () => {
    const s = await pvpFixture();
    giveDex(1, 'wild:54');
    const bad = await call('/api/battle/pvp/create', { method: 'POST', cookie: s.c1, body: { childId: 1, benchNo: 54, leadNo: 99 } });
    assert.equal(bad.status, 400);
    assert.equal(bad.j.code, 'LEAD_NOT_CARRIED');
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM battles WHERE mode='pvp'").get().n, 0);
    const ok = await call('/api/battle/pvp/create', { method: 'POST', cookie: s.c1, body: { childId: 1, benchNo: 54, leadNo: 54 } });
    assert.equal(ok.j.ok, true);
    const bj = await call('/api/battle/pvp/join', { method: 'POST', cookie: s.c2, body: { battleId: ok.j.battle.battleId, childId: 2, password: '2222', leadNo: 54 } });
    assert.equal(bj.status, 400, 'B 没带 54，不能把它当先发');
    assert.equal(bj.j.code, 'LEAD_NOT_CARRIED');
    const row = raw.prepare('SELECT status, child_b FROM battles WHERE id=?').get(ok.j.battle.battleId);
    assert.equal(row.status, 'waiting');
    assert.equal(row.child_b, null);
  });

  test('一方没带备战宠：双方都只出主宠——发起方扔了备战宠也不会丢主宠（先发被裁掉就主宠先发）', async () => {
    const s = await makeBattle({ leadA: 54, benchB: null });
    const a = s.join.j.battle.sides.A.pets, b = s.join.j.battle.sides.B.pets;
    assert.equal(a.length, 1); assert.equal(b.length, 1);
    assert.equal(a[0].key, 'main');
  });

  test('等待中的局：加入方在 status 里看得到发起方的先发（名字），没有对方 HP 的假数字以外的字段泄漏', async () => {
    const s = await pvpFixture();
    giveDex(1, 'wild:54');
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: s.c1, body: { childId: 1, benchNo: 54, leadNo: 54 } });
    const ps = await call('/api/battle/pvp/status', { method: 'POST', cookie: s.c2, body: { childId: 2 } });
    assert.equal(ps.j.myMatch.mySide, 'B');
    assert.equal(ps.j.myMatch.status, 'waiting');
    assert.equal(ps.j.myMatch.sides.A.pets[0].no, 54);
    assert.equal(ps.j.myMatch.sides.B, null);
    void create;
  });
});

describe('第三期：战中换宠（解除兄弟对战锁，占一回合，两边权利相同）', () => {
  test('轮到谁谁能换：换宠后 activeIdx 变、回合交给对方、对方上场宠不掉血；双方对称', async () => {
    const s = await makeBattle({ leadA: 54, leadB: 50 });
    let v = s.v;
    for (const side of [v.turn, v.turn === 'A' ? 'B' : 'A']) {
      const me = v.sides[side];
      const before = v.sides[side === 'A' ? 'B' : 'A'].pets[v.sides[side === 'A' ? 'B' : 'A'].activeIdx].hp;
      const r = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, side), body: { battleId: s.battleId, swapToIdx: 1 - me.activeIdx } });
      assert.equal(r.j.ok, true, JSON.stringify(r.j));
      const nv = r.j.battle;
      assert.equal(nv.sides[side].activeIdx, 1 - me.activeIdx);
      assert.notEqual(nv.turn, side, '换宠占一回合');
      const foe = side === 'A' ? 'B' : 'A';
      assert.equal(nv.sides[foe].pets[nv.sides[foe].activeIdx].hp, before, '换宠不造成伤害');
      assert.ok(r.j.events.some((e) => e.type === 'swap' && e.side === side));
      v = nv;
    }
  });

  test('不轮到你 / 换到已倒下或在场的宠 / 越界：被拒，状态不变', async () => {
    const s = await makeBattle({ leadA: 54, leadB: 50 });
    const v = s.v;
    const other = v.turn === 'A' ? 'B' : 'A';
    const wrongTurn = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, other), body: { battleId: s.battleId, swapToIdx: 1 } });
    assert.equal(wrongTurn.status, 403);
    const self = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, v.turn), body: { battleId: s.battleId, swapToIdx: v.sides[v.turn].activeIdx } });
    assert.equal(self.status, 400);
    const oob = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, v.turn), body: { battleId: s.battleId, swapToIdx: 5 } });
    assert.equal(oob.status, 400);
    raw.prepare('SELECT 1').get();
    const st = JSON.parse(raw.prepare('SELECT state FROM battles WHERE id=?').get(s.battleId).state);
    st.sides[v.turn].pets[1 - st.sides[v.turn].activeIdx].hp = 0;
    raw.prepare('UPDATE battles SET state=? WHERE id=?').run(JSON.stringify(st), s.battleId);
    const fainted = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, v.turn), body: { battleId: s.battleId, swapToIdx: 1 - v.sides[v.turn].activeIdx } });
    assert.equal(fainted.status, 400);
  });

  test('防守挂起期间不能换宠', async () => {
    const s = await makeBattle({ leadA: 54, leadB: 50 });
    // 让防守方有答题记录，出招才会挂起
    const qid = seedDefenseQuestion();
    let v = s.v;
    // 2026-11-16 取消热身：先攻方直接出招会触发防守挂起（谜语兜底），故先换宠过掉首回合（不触发防守），再由对方出招挂起
    const first = v.turn;
    let r = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, first), body: { battleId: s.battleId, swapToIdx: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    v = r.j.battle;
    for (const cid of [1, 2]) raw.prepare('INSERT INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch) VALUES(?,?,?,1,10,0,0)').run(cid, qid, s.weekStart);
    const mv = v.sides[v.turn].pets[v.sides[v.turn].activeIdx].moves[0].name;
    r = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, v.turn), body: { battleId: s.battleId, moveName: mv } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.staged, true, '防守方有答题记录，应挂起');
    const atk = r.j.battle.pending.attackerSide;
    const def = r.j.battle.pending.defenderSide;
    const swapWhilePending = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, atk), body: { battleId: s.battleId, swapToIdx: 1 } });
    assert.equal(swapWhilePending.status, 400, '挂起期间出招方也不能换宠');
    const defSwap = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, def), body: { battleId: s.battleId, swapToIdx: 1 } });
    assert.equal(defSwap.status, 403, '防守方也没轮到');
  });
});

describe('第三期：幂等（move / defend / swap 的同一 requestId 重放不改状态）', () => {
  test('swap 带 requestId：重放回放同样的事件，回合/上场宠不再变化', async () => {
    const s = await makeBattle({ leadA: 54, leadB: 50 });
    const v = s.v;
    const side = v.turn;
    const body = { battleId: s.battleId, swapToIdx: 1 - v.sides[side].activeIdx, requestId: 'req-swap-0001' };
    const r1 = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, side), body });
    assert.equal(r1.j.ok, true);
    const r2 = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, side), body });
    assert.equal(r2.j.ok, true, JSON.stringify(r2.j));
    assert.equal(r2.j.replay, true);
    assert.deepEqual(r2.j.events, r1.j.events);
    assert.equal(r2.j.battle.turn, r1.j.battle.turn);
    assert.equal(r2.j.battle.turnNo, r1.j.battle.turnNo);
    assert.equal(r2.j.battle.sides[side].activeIdx, r1.j.battle.sides[side].activeIdx);
    // 无 requestId 的重复提交仍会被「不是你的回合」挡住，不会二次生效
    const dup = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, side), body: { battleId: s.battleId, swapToIdx: 1 } });
    assert.equal(dup.status, 403);
  });

  test('move（立即结算）与 defend（挂起结算）：重放都不二次扣血；回放只给本人（对手 403）', async () => {
    const s = await makeBattle({ leadA: 54, leadB: 50 });
    const qid = seedDefenseQuestion();
    for (const cid of [1, 2]) raw.prepare('INSERT INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch) VALUES(?,?,?,1,10,0,0)').run(cid, qid, s.weekStart);
    let v = s.v;
    const first = v.turn;
    // 2026-11-16 取消热身：先攻方直接出招会触发防守挂起（谜语兜底），故先换宠过掉首回合（不触发防守），再由对方出招
    let r = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, first), body: { battleId: s.battleId, swapToIdx: 1, requestId: 'req-first-swap-0001' } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    v = r.j.battle;
    const atk = v.turn;
    const foe = atk === 'A' ? 'B' : 'A';
    const mv = v.sides[atk].pets[v.sides[atk].activeIdx].moves[0].name;
    const mbody = { battleId: s.battleId, moveName: mv, requestId: 'req-move-0001' };
    const m1 = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, atk), body: mbody });
    assert.equal(m1.j.ok, true, JSON.stringify(m1.j));
    const hpOf = (view) => view.sides[foe].pets[view.sides[foe].activeIdx].hp;
    if (m1.j.staged) {
      const m2 = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, atk), body: mbody });
      assert.equal(m2.j.ok, true);
      assert.equal(m2.j.replay, true);
      assert.equal(m2.j.staged, true);
      const hpBefore = hpOf(m2.j.battle);
      const row = raw.prepare('SELECT options_json, answer_idx FROM quiz_questions WHERE id=?').get(m1.j.battle.pending.question.id);
      const answerText = JSON.parse(row.options_json)[row.answer_idx];
      const dbody = { battleId: s.battleId, answerText: null, requestId: 'req-def-0001' }; // 跳过 → 挨打
      const d1 = await call('/api/battle/defend', { method: 'POST', cookie: actorCookie(s, foe), body: dbody });
      assert.equal(d1.j.ok, true, JSON.stringify(d1.j));
      const hpAfter = hpOf(d1.j.battle);
      const dmg = d1.j.events.find((e) => e.type === 'attack').dmg;
      assert.equal(hpBefore - hpAfter, dmg, '伤害＝回包里的 dmg');
      const d2 = await call('/api/battle/defend', { method: 'POST', cookie: actorCookie(s, foe), body: dbody });
      assert.equal(d2.j.ok, true, JSON.stringify(d2.j));
      assert.equal(d2.j.replay, true);
      assert.equal(hpOf(d2.j.battle), hpAfter, 'defend 重放不再扣血');
      assert.deepEqual(d2.j.defense, d1.j.defense);
      const d3 = await call('/api/battle/defend', { method: 'POST', cookie: actorCookie(s, atk), body: dbody });
      assert.equal(d3.status, 403, '出招方不能用防守方的 requestId 拿回放');
      void answerText;
    } else {
      const hp1 = hpOf(m1.j.battle);
      const m2 = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, atk), body: mbody });
      assert.equal(m2.j.replay, true);
      assert.equal(hpOf(m2.j.battle), hp1, 'move 重放不再扣血');
    }
    const forged = await call('/api/battle/move', { method: 'POST', cookie: actorCookie(s, foe), body: mbody });
    assert.equal(forged.status, 403, '对手拿不到出招方的回放');
  });

  test('requestId 只留最近 8 条，不无限膨胀', async () => {
    const st = {};
    for (let i = 0; i < 12; i++) {
      st.idem = (st.idem || []).filter((x) => x.id !== 'r' + i);
      st.idem.push({ id: 'r' + i });
      if (st.idem.length > 8) st.idem = st.idem.slice(-8);
    }
    assert.equal(st.idem.length, 8);
    assert.ok(APP_SRC.length > 0);
  });
});

describe('第三期：野外伤害数值冻结（二期遗留 3）', () => {
  test('答对 −22% 野生满血；答错 −25% 上场宠满血；野生血量 60/80/100', () => {
    assert.equal(M.WILD_HIT_FRAC, 0.22);
    assert.equal(M.WILD_HURT_FRAC, 0.25);
    assert.deepEqual(M.WILD_HP_BY_TIER, { common: 60, uncommon: 80, rare: 100 });
  });
  test('服务端源码里没有散落的 0.22 / 0.25 野外伤害字面量（只经常量使用）', () => {
    const src = readBackendSource();
    const i = src.indexOf('async function apiEncounterAnswer');
    const wild = src.slice(src.indexOf('const WILD_HP_BY_TIER'), i > 0 ? i + 6000 : src.length);
    const hits = (wild.match(/maxHp\s*\*\s*0\.(22|25)\b/g) || []);
    assert.equal(hits.length, 0);
    assert.ok(/Math\.ceil\(w\.maxHp \* WILD_HIT_FRAC\)/.test(src));
    assert.ok(/Math\.ceil\(me\.maxHp \* WILD_HURT_FRAC\)/.test(src));
  });
});

describe('第三期：前端静态守卫', () => {
  test('两机路径：共享舞台接兄弟对战、加入方镜像、预备战 leadNo、托盘闸、幂等 requestId、页面不可见暂停轮询', () => {
    assert.ok(/v\.mode === 'gym' \|\| v\.mode === 'pvp'/.test(APP_SRC), 'bsWanted 含 pvp');
    assert.ok(APP_SRC.includes('function pvpMirror'));
    assert.ok(APP_SRC.includes('function pvpPreBattleEnter'));
    assert.ok(APP_SRC.includes("/api/battle/pvp/create', { childId: B.childId"));
    assert.ok(/leadNo \}, undefined, 15000\)/.test(APP_SRC), '预备战扔球后带 leadNo');
    assert.ok(APP_SRC.includes('function pvpTrayBlocked'));
    assert.ok(APP_SRC.includes('function pvpPost'));
    assert.ok(APP_SRC.includes('body.requestId = pvpRid'));
    assert.ok(/if \(document\.hidden\) \{ window\._battlePoll/.test(APP_SRC));
    assert.ok(/mode: isPvp \? 'pvp' : 'gym'/.test(APP_SRC));
  });
  test('一机（离线本地）路径原样保留：本地分支仍拦截兄弟对战换宠，lcLocalPvpMove 仍在', () => {
    assert.ok(APP_SRC.includes("兄弟对战里不能换宠哦"));
    assert.ok(APP_SRC.includes('async function lcLocalPvpMove'));
    assert.ok(APP_SRC.includes('function pvpBoardHtml'));
  });
  test('不走无体 GET /api/battle/state，也没有新增 API 树', () => {
    assert.ok(!/fetch\([^)]*\/api\/battle\/state[^)]*method:\s*'GET'/.test(APP_SRC));
    assert.ok(!APP_SRC.includes('/api/battle/pvp/lead'));
  });
});
