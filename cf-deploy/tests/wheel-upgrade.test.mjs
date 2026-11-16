/* 转盘系统升级单测：node --test tests/wheel-upgrade.test.mjs
 * 覆盖：Oak 新奖池（权重和 100、逐项命中、care/伤药/石头授予＋落库）、
 * 照顾消耗（有道具扣 1、无道具返回 NO_ITEM、每日一次与最爱＋5 XP 不变、喂食/洗澡各 +10 友好度）、
 * 高级转盘扇区（奖品→扇区下标、蛋档全拥有时蛋扇区消失）、
 * 稀有转盘（终极池去重、空池禁转、期末发放与幂等、转盘接口 CAS 与发蛋）、
 * 迁移 0025 oak_draws 重建（数据全保留）。
 * 点评接口用 mock 讯飞分数，真实讯飞调用 0 次；不部署、不碰 staging D1。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0023_care_qa_and_friendship.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0026_rare_wheel.sql'];

function makeEnv(migrations = MIGRATIONS) {
  const raw = new DatabaseSync(':memory:');
  for (const f of migrations) {
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
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) },
      IFLYTEK_APPID: 'test-appid', IFLYTEK_API_KEY: 'test-apikey-fedcba9876543210', IFLYTEK_API_SECRET: 'test-secret-dummy-fedcba9876543210' },
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

async function callRaw(path, { method = 'POST', body, headers = {}, cookie } = {}) {
  const req = new Request('https://test.local' + path, { method, headers, body });
  if (cookie) req.headers.set('Cookie', cookie);
  const res = await M.default.fetch(req, env);
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

async function toProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(env.DB, env);
}

function mkWavBody(totalLen = 2000) {
  const buf = Buffer.alloc(totalLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + (totalLen - 44), 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(16000, 24); buf.writeUInt32LE(32000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(totalLen - 44, 40);
  return buf;
}

async function withIflytekScores(pron, fn) {
  const RealWS = globalThis.WebSocket;
  let calls = 0;
  const xml = `<?xml version="1.0" encoding="utf-8" ?><FinalResult><ret value="0"/>`
    + `<read_sentence content="x" total_score="${pron}" accuracy_score="${pron}" fluency_score="${pron}" integrity_score="100" standard_score="${pron}"></read_sentence></FinalResult>`;
  class FakeWS {
    constructor(url) { this.url = url; this.sent = []; this.listeners = {}; calls++; }
    addEventListener(t, fn2) {
      (this.listeners[t] ||= []).push(fn2);
      if (t === 'open') setTimeout(() => this.emit('open', {}), 0);
    }
    send(s) {
      this.sent.push(s);
      let f;
      try { f = JSON.parse(s); } catch (_) { return; }
      if (f.business && f.business.cmd === 'auw' && f.business.aus === 4) {
        setTimeout(() => this.emit('message', { data: JSON.stringify({ code: 0, sid: 't', data: { status: 2, data: Buffer.from(xml).toString('base64') } }) }), 0);
      }
    }
    close() {}
    emit(t, ev) { for (const fn2 of this.listeners[t] || []) fn2(ev); }
  }
  globalThis.WebSocket = FakeWS;
  try {
    const r = await fn();
    assert.equal(calls, 1);
    return r;
  } finally { globalThis.WebSocket = RealWS; }
}

async function withRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return await fn(); } finally { Math.random = orig; }
}

function seqRandom(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

async function assess(cookie, childId, refText, pron) {
  return withIflytekScores(pron, async () => callRaw(`/api/oak/assess?child_id=${childId}`, {
    body: mkWavBody(2000),
    headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(refText) },
    cookie,
  }));
}

async function today(cookie, childId) {
  const r = await call(`/api/oak/today?child_id=${childId}`, { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, true);
  return r.j;
}

function todayStr() { return M.shDateStr(); }
function nowEpoch() { return Math.floor(Date.now() / 1000); }

function invQty(childId, key) {
  const r = raw.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').get(childId, key);
  return r ? r.qty : 0;
}
function oakDraws() { return raw.prepare('SELECT * FROM oak_draws ORDER BY created_epoch').all(); }
function rareChances(childId) {
  return raw.prepare('SELECT * FROM rare_wheel_chances WHERE child_id=? ORDER BY id').all(childId);
}
function giveItem(childId, key, qty) {
  raw.prepare('INSERT INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(?,?,?,?) ON CONFLICT(child_id, item_key) DO UPDATE SET qty=qty+excluded.qty')
    .run(childId, key, qty, nowEpoch());
}
function ownSpecies(childId, no) {
  raw.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)').run(childId, no, 'egg', nowEpoch());
}
function insertRareChance(childId, source, refId, createdEpoch = 100) {
  const ins = raw.prepare('INSERT INTO rare_wheel_chances(child_id, source, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?)')
    .run(childId, source, refId, createdEpoch, todayStr());
  return Number(ins.lastInsertRowid);
}
function insertSchoolRecord(childId, unit, score, status = 'active') {
  const pct = Math.round((score / 100) * 1000) / 10;
  const ins = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, photo_key, photo_expires_epoch, reward_granted, status, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?,?,?,0,?,?,?)")
    .run(childId, '数学', unit, score, 100, pct, todayStr(), null, null, status, nowEpoch(), todayStr());
  return Number(ins.lastInsertRowid);
}
async function backpack(cookie, childId = 1) {
  const r = await call(`/api/evo/backpack?childId=${childId}`, { cookie });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  return r.j;
}

describe('Oak 新奖池（纯函数）', () => {
  test('权重和为 100，逐项命中每种奖品至少一例', () => {
    assert.equal(M.OAK_WHEEL_POOL.length, 18);
    assert.equal(M.OAK_WHEEL_POOL.reduce((a, [, w]) => a + w, 0), 100);
    let cum = 0;
    for (const [key, w] of M.OAK_WHEEL_POOL) {
      const mid = (cum + w / 2) / 100;
      assert.equal(M.oakRollDraw(() => mid).prizeKey, key, `rng ${mid} 应命中 ${key}`);
      cum += w;
    }
    assert.equal(cum, 100);
  });

  test('ITEM_CATALOG 加 10 条 care 条目，kind 为 care，名/emoji 照 CARE_FOODS/CARE_BATHS', () => {
    for (const f of M.CARE_FOODS) {
      const cat = M.ITEM_CATALOG['care:' + f.key];
      assert.ok(cat, 'care:' + f.key);
      assert.equal(cat.name, f.name);
      assert.equal(cat.emoji, f.emoji);
      assert.equal(cat.kind, 'care');
    }
    for (const b of M.CARE_BATHS) {
      const cat = M.ITEM_CATALOG['care:' + b.key];
      assert.ok(cat, 'care:' + b.key);
      assert.equal(cat.name, b.name);
      assert.equal(cat.emoji, b.emoji);
      assert.equal(cat.kind, 'care');
    }
    assert.deepEqual(M.oakPrizeDisplay('item', 'care:apple'), { prizeName: '红苹果', prizeEmoji: '🍎' });
    assert.deepEqual(M.oakPrizeDisplay('xp', 'xp'), { prizeName: '经验+10', prizeEmoji: '⭐' });
    assert.deepEqual(M.oakPrizeDisplay('ball', 'ball'), { prizeName: '普通精灵球', prizeEmoji: '🔴' });
  });

  test('oakWheelFor：18 个扇区、权重和 100、winnerIndex 指向本次奖品', () => {
    const entries = M.oakWheelEntries();
    assert.equal(entries.length, 18);
    assert.deepEqual(entries.map((e) => e.key), M.OAK_WHEEL_POOL.map(([k]) => k));
    assert.equal(entries.reduce((a, e) => a + e.weight, 0), 100);
    for (const [key] of M.OAK_WHEEL_POOL) {
      const w = M.oakWheelFor(key);
      assert.equal(w.sectors.length, 18);
      assert.equal(w.total, 100);
      assert.equal(w.sectors[w.winnerIndex].key, key, `${key} 的 winnerIndex 应指回自身扇区`);
    }
    assert.equal(M.oakWheelFor('bogus').winnerIndex, -1, '未知奖品 winnerIndex 为 -1，前端 fallback 老口径');
  });
});

describe('迁移 0025：oak_draws 重建', () => {
  test('旧行全保留（含 updated_epoch/ver），prize_key 为 NULL；新 CHECK 接受 item、拒绝非法值', () => {
    const raw2 = new DatabaseSync(':memory:');
    for (const f of MIGRATIONS.slice(0, MIGRATIONS.indexOf('0025_oak_draw_item.sql'))) {
      raw2.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
    }
    raw2.prepare("INSERT INTO oak_draws(child_id, date_shanghai, prize, xp_awarded, balls_awarded, created_epoch, updated_epoch, ver) VALUES(1,'2026-11-06','xp',10,0,100,42,7)").run();
    raw2.prepare("INSERT INTO oak_draws(child_id, date_shanghai, prize, xp_awarded, balls_awarded, created_epoch, updated_epoch, ver) VALUES(2,'2026-11-06','ball',0,1,101,43,8)").run();
    raw2.exec(readFileSync(new URL('../migrations/0025_oak_draw_item.sql', import.meta.url), 'utf8'));
    const rows = raw2.prepare('SELECT * FROM oak_draws ORDER BY child_id').all();
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((r) => [r.child_id, r.prize, r.prize_key, r.xp_awarded, r.balls_awarded, r.updated_epoch, r.ver]),
      [[1, 'xp', null, 10, 0, 42, 7], [2, 'ball', null, 0, 1, 43, 8]]);
    raw2.prepare("INSERT INTO oak_draws(child_id, date_shanghai, prize, prize_key, xp_awarded, balls_awarded, created_epoch) VALUES(1,'2026-11-07','item','care:apple',0,0,102)").run();
    assert.equal(raw2.prepare("SELECT COUNT(*) n FROM oak_draws WHERE prize='item'").get().n, 1);
    assert.throws(() => raw2.prepare("INSERT INTO oak_draws(child_id, date_shanghai, prize, xp_awarded, balls_awarded, created_epoch) VALUES(1,'2026-11-08','bogus',0,0,103)").run());
  });
});

describe('Oak 新奖品授予（HTTP＋mock 讯飞）', () => {
  test('抽中 care:apple：背包 +1、流水 reason oak-draw、oak_draws 记 prize=item/prize_key', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const before = raw.prepare('SELECT total_xp, balls FROM children WHERE id=1').get();
    let last;
    await withRandom(0.32, async () => {
      for (let i = 0; i < 6; i++) last = await assess(cookie, 1, t.sentences[i].en, 90);
    });
    assert.equal(last.j.draw.prize, 'item');
    assert.equal(last.j.draw.prizeKey, 'care:apple');
    assert.equal(last.j.draw.prizeName, '红苹果');
    assert.equal(invQty(1, 'care:apple'), 1);
    const led = raw.prepare("SELECT * FROM item_ledger WHERE child_id=1 AND item_key='care:apple'").all();
    assert.equal(led.length, 1);
    assert.equal(led[0].delta, 1);
    assert.equal(led[0].reason, 'oak-draw');
    const ds = oakDraws();
    assert.equal(ds.length, 1);
    assert.equal(ds[0].prize, 'item');
    assert.equal(ds[0].prize_key, 'care:apple');
    assert.deepEqual(raw.prepare('SELECT total_xp, balls FROM children WHERE id=1').get(), before, 'care 奖品不加经验、不加球');
  });

  test('新抽与复读均带 wheel：18 扇区、权重和 100、winnerIndex 指回本次奖品', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    let last;
    await withRandom(0.32, async () => {
      for (let i = 0; i < 6; i++) last = await assess(cookie, 1, t.sentences[i].en, 90);
    });
    assert.equal(last.j.draw.prizeKey, 'care:apple');
    assert.equal(last.j.draw.justDrawn, true);
    const w = last.j.draw.wheel;
    assert.equal(w.sectors.length, 18);
    assert.equal(w.total, 100);
    assert.equal(w.sectors[w.winnerIndex].key, 'care:apple');
    // 复读（/api/oak/today 走 oakDrawView）也带同一 wheel，前端同一 draw 不会重复弹
    const again = await today(cookie, 1);
    assert.equal(again.draw.prizeKey, 'care:apple');
    assert.deepEqual(again.draw.wheel, w);
  });

  test('抽中活力碎片：走 addItem 进背包、奖品名/emoji 正确', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    let last;
    await withRandom(0.89, async () => {
      for (let i = 0; i < 6; i++) last = await assess(cookie, 1, t.sentences[i].en, 90);
    });
    assert.equal(last.j.draw.prize, 'item');
    assert.equal(last.j.draw.prizeKey, 'medicine:revive');
    assert.equal(last.j.draw.prizeName, '活力碎片');
    assert.equal(last.j.draw.prizeEmoji, '✨');
    assert.equal(invQty(1, 'medicine:revive'), 1);
    assert.equal(oakDraws()[0].prize_key, 'medicine:revive');
  });

  test('抽中高级球：走 addItem 进背包（ball:hyper 非普通球，不走发球记账）', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 2);
    const ballsBefore = raw.prepare('SELECT balls FROM children WHERE id=2').get().balls;
    let last;
    await withRandom(0.97, async () => {
      for (let i = 0; i < 6; i++) last = await assess(cookie, 2, t.sentences[i].en, 90);
    });
    assert.equal(last.j.draw.prize, 'item');
    assert.equal(last.j.draw.prizeKey, 'ball:hyper');
    assert.equal(last.j.draw.prizeName, '高级球');
    assert.equal(last.j.draw.prizeEmoji, '🟡');
    assert.equal(invQty(2, 'ball:hyper'), 1);
    assert.equal(oakDraws()[0].prize_key, 'ball:hyper');
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=2').get().balls, ballsBefore, '高级球不计入普通球数');
  });

  test('抽中好伤药：背包 +1', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    let last;
    await withRandom(0.80, async () => {
      for (let i = 0; i < 6; i++) last = await assess(cookie, 1, t.sentences[i].en, 90);
    });
    assert.equal(last.j.draw.prizeKey, 'medicine:super-potion');
    assert.equal(invQty(1, 'medicine:super-potion'), 1);
  });
});

describe('照顾消耗：care 奖品的使用路径', () => {
  async function enableCare() {
    const pc = await parentCookie();
    const r = await call('/api/parent/settings/update', { method: 'POST', cookie: pc, body: { careEnabled: true } });
    assert.equal(r.j.ok, true);
    return pc;
  }

  test('有道具时喂食扣 1、最爱食物仍 +5 XP；当日再喂仍拒绝（每日一次不变）', async () => {
    const pc = await enableCare();
    giveItem(1, 'care:berry', 2);
    const before = raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp;
    const r = await call('/api/care/feed', { method: 'POST', cookie: pc, body: { childId: 1, food: 'berry' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.equal(r.j.favorite, true, '皮卡丘最爱树果');
    assert.equal(r.j.xpAwarded, 5);
    assert.equal(r.j.friendshipAwarded, 10, '喂食 +10 友好度');
    assert.equal(r.j.friendship, 10);
    assert.equal(invQty(1, 'care:berry'), 1, '扣 1 件');
    assert.equal(raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp, before + 5);
    const again = await call('/api/care/feed', { method: 'POST', cookie: pc, body: { childId: 1, food: 'berry' } });
    assert.equal(again.j.code, 'ALREADY_DONE');
    assert.equal(invQty(1, 'care:berry'), 1, '第二次被拒不重复扣');
  });

  test('无道具时喂食返回 NO_ITEM，不写记录、不加友好度', async () => {
    const pc = await enableCare();
    assert.equal(invQty(2, 'care:apple'), 0);
    const r = await call('/api/care/feed', { method: 'POST', cookie: pc, body: { childId: 2, food: 'apple' } });
    assert.equal(r.status, 400, JSON.stringify(r.j));
    assert.equal(r.j.code, 'NO_ITEM');
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM care_logs WHERE child_id=2 AND kind='feed'").get().n, 0);
  });

  test('有道具时洗澡扣 1；无道具时洗澡返回 NO_ITEM', async () => {
    const pc = await enableCare();
    giveItem(1, 'care:bubble', 1);
    const r = await call('/api/care/bath', { method: 'POST', cookie: pc, body: { childId: 1, bath: 'bubble' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.equal(r.j.friendshipAwarded, 10, '洗澡 +10 友好度');
    assert.equal(invQty(1, 'care:bubble'), 0, '扣 1 件');
    const r2 = await call('/api/care/bath', { method: 'POST', cookie: pc, body: { childId: 2, bath: 'petal' } });
    assert.equal(r2.status, 400, JSON.stringify(r2.j));
    assert.equal(r2.j.code, 'NO_ITEM');
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM care_logs WHERE child_id=2 AND kind='bath'").get().n, 0);
  });
});

describe('共用扇区配置（纯函数）', () => {
  test('WHEEL_COLORS 定死 10 色；buildWheelSectors 按下标循环取色、权重 ≤0 的扇区不出现', () => {
    assert.equal(M.WHEEL_COLORS.length, 10);
    assert.equal(M.WHEEL_COLORS[0], '#FF9F43');
    assert.equal(M.WHEEL_COLORS[9], '#2ECC71');
    const entries = Array.from({ length: 11 }, (_, i) => ({ key: 'k' + i, label: '扇' + i, emoji: '⭐', weight: 1 }));
    const built = M.buildWheelSectors(entries);
    assert.equal(built.sectors.length, 11);
    assert.equal(built.total, 11);
    assert.equal(built.sectors[10].color, M.WHEEL_COLORS[0], '第 11 个扇区循环回第一色');
    const withZero = M.buildWheelSectors([
      { key: 'a', label: 'A', emoji: '', weight: 5 },
      { key: 'b', label: 'B', emoji: '', weight: 0 },
    ]);
    assert.deepEqual(withZero.sectors.map((s) => s.key), ['a']);
    assert.equal(withZero.total, 5);
  });

  test('wheelWinnerIndex：命中返下标、找不到返 -1（数组与 {sectors} 两种入参）', () => {
    const built = M.buildWheelSectors([
      { key: 'stone:sun', label: '日之石', emoji: '☀️', weight: 25 },
      { key: 'egg', label: '主宠蛋', emoji: '🥚', weight: 15 },
    ]);
    assert.equal(M.wheelWinnerIndex(built.sectors, 'egg'), 1);
    assert.equal(M.wheelWinnerIndex(built, 'stone:sun'), 0);
    assert.equal(M.wheelWinnerIndex(built.sectors, 'nope'), -1);
  });
});

describe('高级转盘扇区（奖池不动，只加 wheel 字段）', () => {
  test('WHEEL_POOL：新奖池 15 项、合计 147；扇区逐品类映射，蛋档权重归零时蛋扇区消失', () => {
    assert.deepEqual(M.WHEEL_POOL, [
      ['stone:sun', 25], ['stone:moon', 25], ['stone:fairy-skill', 25],
      ['ball:hyper', 10], ['egg', 15], ['medicine:revive', 10],
      ['stone:thunder', 5], ['stone:fire', 5], ['stone:water', 5], ['stone:leaf', 5], ['stone:ice', 5],
      ['item:metal-coat', 3], ['item:electirizer', 3], ['item:protector', 3], ['item:black-augurite', 3],
    ]);
    assert.equal(M.WHEEL_POOL.reduce((a, [, w]) => a + w, 0), 147);
    const full = M.buildWheelSectors([
      { key: 'stone:sun', label: '日之石', emoji: '☀️', weight: 25 },
      { key: 'stone:moon', label: '月之石', emoji: '🌙', weight: 25 },
      { key: 'stone:fairy-skill', label: '妖精技能石', emoji: '🧚', weight: 25 },
      { key: 'ball:hyper', label: '高级球', emoji: '🟡', weight: 10 },
      { key: 'egg', label: '主宠蛋', emoji: '🥚', weight: 15 },
      { key: 'medicine:revive', label: '活力碎片', emoji: '✨', weight: 10 },
      { key: 'stone:thunder', label: '雷之石', emoji: '⚡', weight: 5 },
      { key: 'stone:fire', label: '火之石', emoji: '🔥', weight: 5 },
      { key: 'stone:water', label: '水之石', emoji: '💧', weight: 5 },
      { key: 'stone:leaf', label: '叶之石', emoji: '🍃', weight: 5 },
      { key: 'stone:ice', label: '冰之石', emoji: '🧊', weight: 5 },
      { key: 'item:metal-coat', label: '金属膜', emoji: '🔩', weight: 3 },
      { key: 'item:electirizer', label: '电力增强器', emoji: '🔌', weight: 3 },
      { key: 'item:protector', label: '护具', emoji: '🛡️', weight: 3 },
      { key: 'item:black-augurite', label: '黑奇石', emoji: '🪨', weight: 3 },
    ]);
    assert.equal(full.sectors.length, 15);
    assert.equal(full.total, 147);
    assert.equal(M.wheelWinnerIndex(full.sectors, 'egg'), 4);
    assert.equal(M.wheelWinnerIndex(full.sectors, 'medicine:revive'), 5);
    assert.equal(M.wheelWinnerIndex(full.sectors, 'item:metal-coat'), 11);
    const noEgg = M.buildWheelSectors([
      { key: 'stone:sun', label: '日之石', emoji: '☀️', weight: 25 },
      { key: 'egg', label: '主宠蛋', emoji: '🥚', weight: 0 },
      { key: 'medicine:revive', label: '活力碎片', emoji: '✨', weight: 10 },
    ]);
    assert.deepEqual(noEgg.sectors.map((s) => s.key), ['stone:sun', 'medicine:revive']);
    assert.equal(M.wheelWinnerIndex(noEgg.sectors, 'egg'), -1);
  });

  test('转盘成功：返 wheel{sectors, winnerIndex}，winner 对应本次奖品，机会扣 1', async () => {
    await toProd();
    const cookie = await parentCookie();
    const recId = insertSchoolRecord(1, '期中考试', 90);
    raw.prepare('INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)')
      .run(1, recId, M.weekStartMon(todayStr()), 100, todayStr());
    // 新池合计 147，活力碎片段为 100~110/147，0.70 落段内
    const r = await withRandom(0.70, () => call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.kind, 'medicine');
    assert.equal(r.j.prize.key, 'medicine:revive');
    assert.equal(r.j.chancesLeft, 0);
    assert.equal(r.j.wheel.sectors.length, 15);
    assert.equal(r.j.wheel.total, 147);
    assert.equal(r.j.wheel.sectors[r.j.wheel.winnerIndex].key, 'medicine:revive');
  });

  test('蛋档其余 4 只全拥有：伊布可重复，蛋扇区仍在且可转中伊布蛋；无机会时 400', async () => {
    await toProd();
    const cookie = await parentCookie();
    // 注意：rollWheelPrize 明确“伊布可重复”，133 永远留在蛋档里，所以蛋档权重永不归零、
    // 蛋扇区永不消失（任务单“蛋档全拥有时蛋扇区消失”的前提在现有去重口径下不成立，见交付说明）。
    // 新池合计 147，蛋段为 85~100/147，0.6 落段内。
    for (const no of [1, 4, 7, 25]) ownSpecies(1, no);
    assert.deepEqual(M.rollWheelPrize(() => 0.6, new Set([1, 4, 7, 25]), new Set()), { kind: 'egg', key: 'egg:133', species: 133 });
    const recId = insertSchoolRecord(1, '期中考试', 90);
    raw.prepare('INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)')
      .run(1, recId, M.weekStartMon(todayStr()), 100, todayStr());
    const r = await withRandom(0.6, () => call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.kind, 'egg');
    assert.equal(r.j.prize.species, 133);
    assert.equal(r.j.wheel.sectors.length, 15, '伊布蛋仍在，蛋扇区不消失');
    assert.equal(r.j.wheel.sectors[r.j.wheel.winnerIndex].key, 'egg');
    const none = await call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(none.status, 400);
  });
});

describe('稀有转盘奖池（纯函数）', () => {
  test('终极池 58 种：去重（无传说/伊布/151），全在 DEX_DETAILS 内，含主宠终极与分支目标', () => {
    assert.equal(M.RARE_WHEEL_FINALS.length, 58);
    for (const n of [...M.RARE_WHEEL_LEGENDARIES, ...M.RARE_WHEEL_EEVEE, 151]) {
      assert.ok(!M.RARE_WHEEL_FINALS.includes(n), `${n} 不应进终极池`);
    }
    for (const n of M.RARE_WHEEL_FINALS) assert.ok(M.DEX_DETAILS[n], `${n} 应在 DEX_DETAILS 内`);
    for (const n of [3, 6, 9, 26, 212, 900, 464]) assert.ok(M.RARE_WHEEL_FINALS.includes(n));
    assert.deepEqual(M.RARE_WHEEL_LEGENDARIES, [144, 145, 146, 150]);
    assert.deepEqual(M.RARE_WHEEL_EEVEE, [134, 135, 136, 196, 197, 470, 471, 700]);
  });

  test('rollRareWheelPrize：组权重 8/12/80，组内均匀；已拥有排除；全空返 null', () => {
    assert.deepEqual(M.rollRareWheelPrize(seqRandom([0.0, 0.0]), new Set(), new Set()), { group: 'legendary', species: 144 });
    assert.deepEqual(M.rollRareWheelPrize(seqRandom([0.079, 0.0]), new Set(), new Set()), { group: 'legendary', species: 144 });
    assert.deepEqual(M.rollRareWheelPrize(seqRandom([0.1, 0.0]), new Set(), new Set()), { group: 'eevee', species: 134 });
    assert.deepEqual(M.rollRareWheelPrize(seqRandom([0.5, 0.0]), new Set(), new Set()), { group: 'final', species: 3 });
    assert.deepEqual(M.rollRareWheelPrize(seqRandom([0.0, 0.0]), new Set([144, 145, 146, 150]), new Set()), { group: 'eevee', species: 134 });
    assert.deepEqual(M.rollRareWheelPrize(seqRandom([0.0, 0.0]), new Set(), new Set([144])), { group: 'legendary', species: 145 });
    const all = new Set([...M.RARE_WHEEL_LEGENDARIES, ...M.RARE_WHEEL_EEVEE, ...M.RARE_WHEEL_FINALS]);
    assert.equal(M.rollRareWheelPrize(() => 0.5, all, new Set()), null);
    assert.equal(M.rollRareWheelPrize(() => 0.5, new Set(), all), null);
  });

  test('rareWheelSectors：4 传说＋伊布＋终极共 6 扇区、权重 2/2/2/2/12/80；空组不出现', () => {
    const full = M.rareWheelSectors();
    assert.equal(full.sectors.length, 6);
    assert.equal(full.total, 100);
    assert.deepEqual(full.sectors.map((s) => s.key), ['legendary:144', 'legendary:145', 'legendary:146', 'legendary:150', 'eevee', 'final']);
    assert.deepEqual(full.sectors.map((s) => s.weight), [2, 2, 2, 2, 12, 80]);
    assert.equal(full.sectors[0].label, '急冻鸟');
    assert.equal(full.sectors[0].emoji, '✨');
    assert.equal(full.sectors[4].label, '伊布进化');
    assert.equal(full.sectors[5].label, '终极形态');
    assert.equal(M.wheelWinnerIndex(full.sectors, 'legendary:150'), 3);
    assert.equal(M.wheelWinnerIndex(full.sectors, 'final'), 5);
    const partial = M.rareWheelSectors({ legendary: [144], eevee: [], final: [] });
    assert.deepEqual(partial.sectors.map((s) => s.key), ['legendary:144']);
    assert.equal(partial.total, 2);
    const empty = M.rareWheelSectors({ legendary: [], eevee: [], final: [] });
    assert.equal(empty.sectors.length, 0);
    assert.equal(empty.total, 0);
  });
});

describe('稀有转盘机会发放：仅期末考试成绩上传', () => {
  async function addQuestion(cookie, grade) {
    const body = {
      question: '1+1 等于几？', options: ['1', '2', '3', '4'], answer_idx: 1,
      explain: '等于 2', subject: '数学',
    };
    if (grade !== null && grade !== undefined) body.grade = grade;
    const r = await call('/api/parent/questions', { method: 'POST', cookie, body });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
  }

  test('加题不再发稀有机会（2026-11-14 用户令：稀有转盘只有期末考试成绩上传一个渠道）', async () => {
    const cookie = await parentCookie();
    await addQuestion(cookie, 1);
    await addQuestion(cookie, 3);
    await addQuestion(cookie, null);
    assert.equal(rareChances(1).length, 0, '三年级孩子不得机会');
    assert.equal(rareChances(2).length, 0, '一年级孩子不得机会');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM quiz_questions WHERE is_custom=1').get().n, 3, '题目本身照常入库');
  });

  test('期末直登：期末 95+ 发 1 次（不要求照片）；非期末或 <95 不发；高级转盘机会不受影响', async () => {
    await toProd();
    const cookie = await parentCookie();
    const r = await call('/api/parent/school-test/save', { method: 'POST', cookie, body: { childId: 1, subject: '数学', unit: '期末考试', score: 96, fullScore: 100, examDate: todayStr() } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.wheelChance, false, '无照片不发高级转盘机会（高级转盘口径不动）');
    const rows = rareChances(1);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].source, 'final-exam');
    assert.equal(rows[0].ref_id, r.j.record.id);
    const r2 = await call('/api/parent/school-test/save', { method: 'POST', cookie, body: { childId: 1, subject: '数学', unit: '期中考试', score: 96, fullScore: 100, examDate: todayStr() } });
    assert.equal(r2.status, 200);
    assert.equal(rareChances(1).length, 1, '非期末不发');
    const r3 = await call('/api/parent/school-test/save', { method: 'POST', cookie, body: { childId: 1, subject: '数学', unit: '期末考试', score: 90, fullScore: 100, examDate: todayStr() } });
    assert.equal(r3.status, 200);
    assert.equal(rareChances(1).length, 1, '期末 <95 不发');
  });

  test('期末审核通过：pending 记录审核后发 1 次；重复审核 400、不重复发', async () => {
    await toProd();
    const cookie = await parentCookie();
    const recId = insertSchoolRecord(1, '期末考试', 97, 'pending');
    const r = await call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: recId, decision: 'approve' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.approved, true);
    const rows = rareChances(1);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].source, 'final-exam');
    assert.equal(rows[0].ref_id, recId);
    const again = await call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: recId, decision: 'approve' } });
    assert.equal(again.status, 400);
    assert.equal(rareChances(1).length, 1, '重复审核不重复发');
  });
});

describe('稀有转盘接口', () => {
  test('转盘成功：发蛋（reward_eggs pending）、winnerIndex 对应终极扇区、背包 rareWheelChances 扣减', async () => {
    await toProd();
    const cookie = await parentCookie();
    insertRareChance(1, 'final-exam', 9001, 100);
    const bp0 = await backpack(cookie, 1);
    assert.equal(bp0.rareWheelChances, 1);
    assert.equal(bp0.wheelChances, 0);
    const r = await withRandom(0.5, () => call('/api/rare-wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.kind, 'egg');
    assert.equal(r.j.prize.species, 73);
    assert.ok(r.j.prize.img.includes('p73.'), r.j.prize.img);
    assert.equal(r.j.chancesLeft, 0);
    assert.equal(r.j.wheel.sectors.length, 6);
    assert.equal(r.j.wheel.sectors[r.j.wheel.winnerIndex].key, 'final');
    const egg = raw.prepare("SELECT * FROM reward_eggs WHERE child_id=1 AND species_no=73 AND status='pending'").get();
    assert.ok(egg, '发蛋落库');
    assert.equal(egg.source, 'rare-wheel');
    const ch = raw.prepare('SELECT used_epoch FROM rare_wheel_chances WHERE child_id=1').get();
    assert.ok(ch.used_epoch !== null, '机会已占位消耗');
    const bp1 = await backpack(cookie, 1);
    assert.equal(bp1.rareWheelChances, 0);
  });

  test('两次机会按最旧先转；转完无机会时 400', async () => {
    await toProd();
    const cookie = await parentCookie();
    const id1 = insertRareChance(1, 'final-exam', 9001, 100);
    const id2 = insertRareChance(1, 'final-exam', 9002, 200);
    await withRandom(0.5, () => call('/api/rare-wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.ok(raw.prepare('SELECT used_epoch FROM rare_wheel_chances WHERE id=?').get(id1).used_epoch !== null, '先转最旧');
    assert.equal(raw.prepare('SELECT used_epoch FROM rare_wheel_chances WHERE id=?').get(id2).used_epoch, null);
    const r2 = await withRandom(0.5, () => call('/api/rare-wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.equal(r2.j.chancesLeft, 0);
    const r3 = await call('/api/rare-wheel/spin', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(r3.status, 400);
  });

  test('空池禁转：不扣机会（used_epoch 仍 NULL），文案明确', async () => {
    await toProd();
    const cookie = await parentCookie();
    for (const n of [...M.RARE_WHEEL_LEGENDARIES, ...M.RARE_WHEEL_EEVEE, ...M.RARE_WHEEL_FINALS]) ownSpecies(1, n);
    const id = insertRareChance(1, 'final-exam', 9001, 100);
    const r = await call('/api/rare-wheel/spin', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(r.status, 400);
    assert.equal(r.j.error, '奖池里的都拥有啦，这次转不了');
    assert.equal(raw.prepare('SELECT used_epoch FROM rare_wheel_chances WHERE id=?').get(id).used_epoch, null, '空池不扣机会');
    const bp = await backpack(cookie, 1);
    assert.equal(bp.rareWheelChances, 1);
  });

  test('已占用的机会不可再转（CAS 选行只取 used_epoch IS NULL）', async () => {
    await toProd();
    const cookie = await parentCookie();
    const id = insertRareChance(1, 'final-exam', 9001, 100);
    raw.prepare('UPDATE rare_wheel_chances SET used_epoch=? WHERE id=?').run(nowEpoch(), id);
    const r = await call('/api/rare-wheel/spin', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(r.status, 400);
  });
});

describe('转盘奖池调整（2026-11-07）：进化石只进高级转盘', () => {
  test('OAK_WHEEL_POOL：18 项、合计 100，不含任何 stone:* 与 item:* 进化道具；新增活力碎片 6、高级球 6', () => {
    assert.equal(M.OAK_WHEEL_POOL.length, 18);
    assert.equal(M.OAK_WHEEL_POOL.reduce((a, [, w]) => a + w, 0), 100);
    for (const [key] of M.OAK_WHEEL_POOL) {
      assert.ok(!key.startsWith('stone:'), `${key} 不应在普通转盘`);
      assert.ok(!key.startsWith('item:'), `${key} 不应在普通转盘`);
    }
    assert.deepEqual(M.OAK_WHEEL_POOL.find(([k]) => k === 'medicine:revive'), ['medicine:revive', 6]);
    assert.deepEqual(M.OAK_WHEEL_POOL.find(([k]) => k === 'ball:hyper'), ['ball:hyper', 6]);
    assert.equal(M.OAK_WHEEL_POOL.find(([k]) => k === 'stone:thunder'), undefined);
    assert.equal(M.OAK_WHEEL_POOL.find(([k]) => k === 'stone:moon'), undefined);
    assert.equal(M.oakRollDraw(() => 0.89).prizeKey, 'medicine:revive', '0.89 落活力碎片段（88~94/100）');
    assert.equal(M.oakRollDraw(() => 0.97).prizeKey, 'ball:hyper', '0.97 落高级球段（94~100/100）');
    assert.deepEqual(M.oakPrizeDisplay('item', 'medicine:revive'), { prizeName: '活力碎片', prizeEmoji: '✨' });
    assert.deepEqual(M.oakPrizeDisplay('item', 'ball:hyper'), { prizeName: '高级球', prizeEmoji: '🟡' });
  });

  test('WHEEL_POOL：15 项、合计 147，含全部 8 种进化石与 4 个连接交换道具，权重与任务单一致', () => {
    assert.equal(M.WHEEL_POOL.length, 15);
    assert.equal(M.WHEEL_POOL.reduce((a, [, w]) => a + w, 0), 147);
    for (const s of ['stone:thunder', 'stone:fire', 'stone:water', 'stone:leaf', 'stone:ice', 'stone:sun', 'stone:moon', 'stone:fairy-skill']) {
      assert.ok(M.WHEEL_POOL.some(([k]) => k === s), `高级转盘应含 ${s}`);
    }
    for (const it of ['item:metal-coat', 'item:electirizer', 'item:protector', 'item:black-augurite']) {
      assert.ok(M.WHEEL_POOL.some(([k]) => k === it), `高级转盘应含 ${it}`);
    }
    assert.deepEqual(M.WHEEL_POOL.find(([k]) => k === 'stone:ice'), ['stone:ice', 5]);
    assert.deepEqual(M.WHEEL_POOL.find(([k]) => k === 'item:protector'), ['item:protector', 3]);
    // 逐项命中 9 个新增奖品（新池合计 147，段位按累积权重算）
    let cum = 0;
    const total = 147;
    for (const [key, w] of M.WHEEL_POOL) {
      const mid = (cum + w / 2) / total;
      const p = M.rollWheelPrize(() => mid, new Set(), new Set());
      if (key === 'egg') assert.equal(p.kind, 'egg');
      else assert.deepEqual([p.kind, p.key], [key === 'ball:hyper' ? 'ball' : key.startsWith('medicine:') ? 'medicine' : 'stone', key], `rng ${mid} 应命中 ${key}`);
      cum += w;
    }
    assert.equal(cum, 147);
  });

  test('考试转盘转中雷之石：kind stone、进背包、扇区 15 个含新石头', async () => {
    await toProd();
    const cookie = await parentCookie();
    const recId = insertSchoolRecord(1, '期中考试', 90);
    raw.prepare('INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)')
      .run(1, recId, M.weekStartMon(todayStr()), 100, todayStr());
    // 雷之石段为 110~115/147，0.76 落段内
    const r = await withRandom(0.76, () => call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.kind, 'stone');
    assert.equal(r.j.prize.key, 'stone:thunder');
    assert.equal(r.j.prize.name, '雷之石');
    assert.equal(invQty(1, 'stone:thunder'), 1);
    assert.equal(r.j.wheel.sectors.length, 15);
    assert.equal(r.j.wheel.total, 147);
    assert.equal(r.j.wheel.sectors[r.j.wheel.winnerIndex].key, 'stone:thunder');
  });

  test('考试转盘转中金属膜：kind stone（rollWheelPrize 兜底分支）、进背包、名/emoji 正确', async () => {
    await toProd();
    const cookie = await parentCookie();
    const recId = insertSchoolRecord(1, '期中考试', 90);
    raw.prepare('INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)')
      .run(1, recId, M.weekStartMon(todayStr()), 100, todayStr());
    // 金属膜段为 135~138/147，0.93 落段内
    const r = await withRandom(0.93, () => call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.kind, 'stone');
    assert.equal(r.j.prize.key, 'item:metal-coat');
    assert.equal(r.j.prize.name, '金属膜');
    assert.equal(r.j.prize.emoji, '🔩');
    assert.equal(invQty(1, 'item:metal-coat'), 1);
    assert.equal(r.j.wheel.sectors[r.j.wheel.winnerIndex].key, 'item:metal-coat');
  });

  test('连接交换进化已实现（纯函数）：金属膜/护具/电力增强器三条全通；飞天螳螂第一分支为巨钳螳螂', () => {
    const child = { total_xp: M.xpForLevel(42), fairy_moves: '[]' };
    const onix = M.evoOptionsFor(child, { line_key: 'species:95', form_idx: 0, species_no: 95, branch: null }, { 'item:metal-coat': 1 }, 10);
    assert.equal(onix.length, 1);
    assert.equal(onix[0].no, 208);
    assert.equal(onix[0].name, '大钢蛇');
    assert.equal(onix[0].item, 'item:metal-coat');
    assert.equal(onix[0].trade, true);
    assert.equal(onix[0].ready, true);
    const onixBare = M.evoOptionsFor(child, { line_key: 'species:95', form_idx: 0, species_no: 95, branch: null }, {}, 10);
    assert.equal(onixBare[0].ready, false);
    assert.ok(onixBare[0].missing.join('').includes('金属膜'));
    const rhydon = M.evoOptionsFor(child, { line_key: 'species:111', form_idx: 0, species_no: 112, branch: null }, { 'item:protector': 1 }, 42);
    assert.equal(rhydon[0].no, 464);
    assert.equal(rhydon[0].name, '钻角犀兽');
    assert.equal(rhydon[0].item, 'item:protector');
    assert.equal(rhydon[0].ready, true);
    const electabuzz = M.evoOptionsFor(child, { line_key: 'species:125', form_idx: 0, species_no: 125, branch: null }, { 'item:electirizer': 1 }, 10);
    assert.equal(electabuzz[0].no, 466);
    assert.equal(electabuzz[0].name, '电击魔兽');
    assert.equal(electabuzz[0].item, 'item:electirizer');
    assert.equal(electabuzz[0].ready, true);
    const scyther = M.evoOptionsFor(child, { line_key: 'species:123', form_idx: 0, species_no: 123, branch: null }, { 'item:metal-coat': 1 }, 10);
    assert.equal(scyther[0].no, 212);
    assert.equal(scyther[0].name, '巨钳螳螂');
    assert.equal(scyther[0].ready, true);
  });

  test('黑奇石→劈斧螳螂：分支选择已打通（2026-11-08），两条分支都出选项', () => {
    const branches = M.EVO_LINES[123].branches;
    assert.ok(Array.isArray(branches));
    const kleavor = branches.find((b) => b.to === 900);
    assert.ok(kleavor, '应有到 900 劈斧螳螂的分支');
    assert.deepEqual(kleavor.cond, { kind: 'stone', stone: 'item:black-augurite' });
    const child = { total_xp: M.xpForLevel(42), fairy_moves: '[]' };
    const inst = { line_key: 'species:123', form_idx: 0, species_no: 123, branch: null };
    // 只有黑奇石：巨钳分支未就绪、劈斧分支就绪
    const onlyAugurite = M.evoOptionsFor(child, inst, { 'item:black-augurite': 1 }, 10);
    assert.equal(onlyAugurite.length, 2);
    assert.equal(onlyAugurite.find((o) => o.no === 212).ready, false);
    assert.equal(onlyAugurite.find((o) => o.no === 900).ready, true);
    assert.equal(onlyAugurite.find((o) => o.no === 900).name, '劈斧螳螂');
    assert.equal(onlyAugurite.find((o) => o.no === 900).item, 'item:black-augurite');
    // 只有金属膜：巨钳就绪、劈斧未就绪
    const onlyCoat = M.evoOptionsFor(child, inst, { 'item:metal-coat': 1 }, 10);
    assert.equal(onlyCoat.length, 2);
    assert.equal(onlyCoat.find((o) => o.no === 212).ready, true);
    assert.equal(onlyCoat.find((o) => o.no === 900).ready, false);
    // 两件都有：两条都就绪；两件都没有：两条都出、都未就绪
    const both = M.evoOptionsFor(child, inst, { 'item:metal-coat': 1, 'item:black-augurite': 1 }, 10);
    assert.equal(both.length, 2);
    assert.ok(both.every((o) => o.ready));
    const none = M.evoOptionsFor(child, inst, {}, 10);
    assert.equal(none.length, 2);
    assert.ok(none.every((o) => !o.ready));
  });
});
