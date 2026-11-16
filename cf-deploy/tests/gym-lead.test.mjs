// tests/gym-lead.test.mjs
// 任务 126 道馆先发宠物 leadNo（2026-11-15）：开局带全部随身宠物（最多 5 只），leadNo 指定先发；
// 不传 leadNo 时主宠先发、行为与旧版一致；leadNo 须是随身宠物（主宠或携带列表），否则 LEAD_NOT_CARRIED。
// 换宠仍耗一回合（resolveGymRound：换宠方本回合不出招，馆主照常攻击——结论见本文件末尾注释与 §300）。
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql',
  '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql',
  '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql',
  '0013_bsn_math_chapters.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql',
  '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql',
  '0021_skill_levels.sql', '0022_warehouse.sql',
];

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
function setXp(childId, xp) { raw.prepare('UPDATE children SET total_xp=? WHERE id=?').run(xp, childId); }
// 孩子 1：携带六尾 37、地鼠 50；可达鸭 54 已拥有但未携带（供“须随身”校验用）。
function seedCarried() {
  raw.prepare("INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(1, 'wild:37', '2026-01-01', 1)").run();
  raw.prepare("INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(1, 'wild:50', '2026-01-01', 1)").run();
  raw.prepare("INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(1, 'wild:54', '2026-01-01', 0)").run();
}
const teamNos = (battle) => battle.sides.A.pets.map((p) => p.no);
const mainNoOf = (battle) => (battle.sides.A.pets.find((p) => p.key === 'main') || {}).no;

describe('任务 126 道馆先发 leadNo', () => {
  test('0. 前端接线：开局传 leadNo；卡片有“让它先发”；换宠每个替补各一个按钮', () => {
    const src = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
    assert.ok(src.includes('leadNo: G.leadGym || undefined'), 'startStage 应传 leadNo');
    assert.ok(src.includes('leadGym: null'), '道馆页状态应有 leadGym');
    assert.ok(src.includes('pickGymLeadFromCard'), '卡片应有选先发入口');
    assert.ok(src.includes('让它先发'), '卡片应有“让它先发”按钮');
    assert.ok(src.includes('先发：'), '道馆页应显示先发选择');
    assert.ok(src.includes('const benchIdxs = turnSide.pets.map'), '换宠按钮应按每个替补生成');
    assert.ok(!src.includes('const benchIdx = turnSide.pets.findIndex'), '单替补按钮写法应已换掉');
  });

  test('1. leadNo=37（携带六尾）→ 六尾先发，全队 3 只', async () => {
    const { c1 } = await setup();
    setXp(1, 1500); // Lv.9，主宠皮丘 172
    seedCarried();
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, leadNo: 37 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const b = r.j.battle;
    assert.equal(b.sides.A.activeIdx, 0);
    assert.equal(b.sides.A.pets[0].no, 37, '先发应为六尾');
    assert.equal(b.sides.A.pets[0].active, true);
    assert.equal(b.sides.A.pets.length, 3, '全队应为主宠＋2 只携带');
    assert.deepEqual([...teamNos(b)].sort((x, y) => x - y), [37, 50, 172].sort((x, y) => x - y), '全队应含主宠 172 与两只携带');
    assert.equal(mainNoOf(b), 172);
  });

  test('2. 不传 leadNo → 主宠先发，全队仍为 3 只（向后兼容）', async () => {
    const { c1 } = await setup();
    setXp(1, 1500);
    seedCarried();
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const b = r.j.battle;
    assert.equal(b.sides.A.pets[0].key, 'main', '不传 leadNo 时主宠先发');
    assert.equal(b.sides.A.pets[0].no, 172);
    assert.equal(b.sides.A.pets.length, 3);
    assert.deepEqual([...teamNos(b)].sort((x, y) => x - y), [37, 50, 172].sort((x, y) => x - y));
  });

  test('3. leadNo=50 + benchNo=37 → 先发 50，备战 37 固定在 pets[1]', async () => {
    const { c1 } = await setup();
    setXp(1, 1500);
    seedCarried();
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, leadNo: 50, benchNo: 37 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const b = r.j.battle;
    assert.equal(b.sides.A.pets[0].no, 50, '先发应为地鼠');
    assert.equal(b.sides.A.pets[1].no, 37, '备战应固定在 pets[1]');
    assert.equal(b.sides.A.pets.length, 3);
    assert.equal(mainNoOf(b), 172);
  });

  test('4. benchNo=143 非携带调试路径保留：pets[1] 仍为 143，携带队也在', async () => {
    const { c1 } = await setup();
    setXp(1, 1500);
    seedCarried();
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, benchNo: 143 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const b = r.j.battle;
    assert.equal(b.sides.A.pets[1].no, 143, '非携带备战仍应占 pets[1]');
    assert.equal(b.sides.A.pets.length, 4, '主宠＋备战 143＋2 只携带');
    assert.deepEqual([...teamNos(b)].sort((x, y) => x - y), [37, 50, 143, 172].sort((x, y) => x - y));
  });

  test('5. 非法 leadNo → LEAD_NOT_CARRIED，且不建对局、不作废旧对局', async () => {
    const { c1 } = await setup();
    setXp(1, 1500);
    seedCarried();
    const countBattles = () => raw.prepare("SELECT COUNT(*) AS n FROM battles WHERE mode='gym' AND child_a=1").get().n;
    for (const bad of [54, 143, 999]) {
      const before = countBattles();
      const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, leadNo: bad } });
      assert.equal(r.status, 400, `leadNo=${bad} 应 400：${JSON.stringify(r.j)}`);
      assert.equal(r.j.ok, false);
      assert.equal(r.j.code, 'LEAD_NOT_CARRIED', `leadNo=${bad} 应返回 LEAD_NOT_CARRIED`);
      assert.equal(countBattles(), before, `leadNo=${bad} 失败不应新建对局`);
    }
    // 54 已拥有但未携带、143 测试模式视同拥有但未携带、999 不存在：三者都不在随身队。
  });

  test('6. 主宠也可指定为先发 leadNo=172 → 仍在队首', async () => {
    const { c1 } = await setup();
    setXp(1, 1500);
    seedCarried();
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, leadNo: 172 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.battle.sides.A.pets[0].no, 172);
    assert.equal(r.j.battle.sides.A.pets[0].key, 'main');
    assert.equal(r.j.battle.sides.A.pets.length, 3);
  });

  test('7. 无携带、无备战 → 只有主宠 1 只（旧行为）', async () => {
    const { c2 } = await setup();
    setXp(2, 1500); // Lv.9，小火龙 4
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c2, body: { childId: 2, stage: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.battle.sides.A.pets.length, 1);
    assert.equal(r.j.battle.sides.A.pets[0].key, 'main');
    assert.equal(r.j.battle.sides.A.pets[0].no, 4);
  });
});

// 换宠是否耗一回合（结论，第一期保持现有规则不变）：是。
// resolveGymRound：换宠先行，新宠承受本回合全部攻击，换宠方本回合不出招
// （gymStrike 对非 move 动作返回 dmg 0；馆主同回合照常出招，见 §300）。
// 故中途换宠仍占一整回合，只换“谁在场上挨打”，不白嫖一次出招。
