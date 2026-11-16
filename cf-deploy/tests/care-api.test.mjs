/* 借鉴包 v1 测试：node --test tests/borrow.test.mjs
 * 覆盖：暴击（引擎）、PvP 防守第四档「守护」与权重、图鉴扩充与稀有度、
 * 精灵球掉落（判定/每日上限）、答题触发遭遇（每日一场）、答题抓捕全流程、
 * 道馆备战克制 counters。harness 同 battle.test（node:sqlite 内存库＋迁移 0001–0006）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0023_care_qa_and_friendship.sql'];

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

/* 序列 rng：依次吐出给定值（耗尽后重复最后一个） */
const seq = (...vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };

const pet = (name, type, hp, moves, level = 5) => ({ key: name, name, type, no: null, img: null, level, maxHp: hp, hp, moves });
const side = (childId, childName, pets) => ({ childId, childName, battleLevel: 5, activeIdx: 0, pets });

/* 种一道「今天已通过」的打卡 + 题库（三年级语文 study 题 + 谜语），返回今日题单 */
async function seedQuizDay(c1) {
  const today = realTodayStr();
  raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
    VALUES(1,?,'["语文"]','语文','10:00',1,0,'approved',15,'10:05')`).run(today);
  raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('study',3,'语文','「春」天的春是哪个字？','[\"春\",\"冬\",\"夏\",\"秋\"]',0,'春天',1,0,0)").run();
  raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('riddle',NULL,NULL,'什么东西越洗越脏？','[\"水\",\"手\",\"衣服\",\"碗\"]',0,'水越洗越脏',1,0,0)").run();
  const t = await call('/api/quiz/today?child_id=1', { cookie: c1 });
  assert.equal(t.j.ok, true, JSON.stringify(t.j));
  return t.j;
}

/* 题库自带种子题（迁移 0002），答案位置不固定：一律从库里查 answer_idx 再作答 */
function correctIdx(qid) {
  return raw.prepare('SELECT answer_idx FROM quiz_questions WHERE id=?').get(qid).answer_idx;
}
function wrongIdx(q) {
  return (correctIdx(q.id) + 1) % q.options.length;
}

/* 种抓捕题库：5 道三年级数学题（正确答案一律 idx 0） */
function seedCatchBank() {
  for (let i = 1; i <= 5; i++) {
    raw.prepare("INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES('study',3,'数学',?,'[\"对的\",\"错的\",\"不知道\",\"跳过\"]',0,'解析',1,0,0)")
      .run(`抓捕题 ${i}：选「对的」`);
  }
}

function insertEncounter(childId, no, name) {
  raw.prepare('INSERT INTO encounters(child_id, date, pokemon_no, name) VALUES(?,?,?,?)')
    .run(childId, realTodayStr(), no, name);
  return Number(raw.prepare('SELECT last_insert_rowid() AS id').get().id);
}

/* ---------------- 暴击 ---------------- */

import { describe as careDescribe, test as careTest } from 'node:test';
import careAssert from 'node:assert/strict';
const careExports = await import(new URL('../src/index.js', import.meta.url));

async function careHarness() {
  const state = await setup();
  const h = state || {};
  const request = h.call || (typeof call === 'function' ? call : undefined);
  const database = h.raw || (typeof raw !== 'undefined' ? raw : undefined);
  const parent = h.parentCookie || (
    typeof parentCookie === 'function' ? parentCookie : undefined
  );
  const child = h.childCookie || (
    typeof childCookie === 'function' ? childCookie : undefined
  );
  careAssert.ok(request, 'borrow harness must expose call');
  careAssert.ok(database, 'borrow harness must expose raw');
  careAssert.ok(parent, 'borrow harness must expose parentCookie');
  careAssert.ok(child, 'borrow harness must expose childCookie');
  const cookie = await parent();

  async function api(path, options = {}) {
    const response = await request(path, { cookie, ...options });
    if (response instanceof Response) {
      return { status: response.status, body: await response.json() };
    }
    const body = response.j ?? response.body ?? response.data ?? response.json;
    return { status: response.status, body };
  }

  const passwords = await api('/api/parent/settings/update', {
    method: 'POST',
    body: {
      childPasswords: [
        { id: 1, password: '0000' },
        { id: 2, password: '0000' },
      ],
    },
  });
  careAssert.equal(passwords.status, 200);

  return {
    raw: database,
    api,
    childCookie: child,
    xp(id) {
      return Number(database.prepare(
        'SELECT total_xp FROM children WHERE id=?'
      ).get(id).total_xp);
    },
    logs() {
      return Number(database.prepare(
        'SELECT COUNT(*) AS n FROM care_logs'
      ).get().n);
    },
    give(id, key, qty = 1) {
      database.prepare(
        "INSERT INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(?,?,?,?) ON CONFLICT(child_id, item_key) DO UPDATE SET qty=qty+excluded.qty, updated_epoch=excluded.updated_epoch"
      ).run(id, key, qty, Math.floor(Date.now() / 1000));
    },
    itemQty(id, key) {
      const row = database.prepare(
        'SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?'
      ).get(id, key);
      return row ? Number(row.qty) : 0;
    },
    friendship(id) {
      const child = database.prepare('SELECT line FROM children WHERE id=?').get(id);
      if (!child) return 0;
      const row = database.prepare(
        'SELECT friendship FROM pet_instances WHERE child_id=? AND line_key=?'
      ).get(id, child.line);
      return row && row.friendship != null ? Number(row.friendship) : 0;
    },
    async enable(value = true) {
      const result = await api('/api/parent/settings/update', {
        method: 'POST', body: { careEnabled: value },
      });
      careAssert.equal(result.status, 200);
    },
    async status(id = 1) {
      return api(`/api/care/status?childId=${id}`);
    },
    async feed(id = 1, food = 'berry', extra = {}) {
      return api('/api/care/feed', {
        method: 'POST', body: { childId: id, food }, ...extra,
      });
    },
    async bath(id = 1, bath = 'bubble') {
      return api('/api/care/bath', {
        method: 'POST', body: { childId: id, bath },
      });
    },
  };
}

function careError(result, status, code) {
  careAssert.equal(result.status, status);
  if (code) {
    const body = result.body;
    careAssert.equal(
      body.code ?? body.error?.code ?? body.error,
      code
    );
  }
}

careDescribe('care pure functions', () => {
  careTest('Sunday and Monday scenes', () => {
    const sunday = careExports.careSceneForDate('2026-10-25');
    const monday = careExports.careSceneForDate('2026-10-26');
    careAssert.equal(sunday.name ?? sunday.title, '彩虹草原');
    careAssert.equal(monday.name ?? monday.title, '晨光小院');
  });

  careTest('seven consecutive dates have distinct scene keys', () => {
    const keys = Array.from({ length: 7 }, (_, index) =>
      careExports.careSceneForDate(`2026-10-${25 + index}`).key
    );
    careAssert.equal(new Set(keys).size, 7);
  });

  careTest('invalid date does not throw', () => {
    careAssert.doesNotThrow(() => careExports.careSceneForDate('not-a-date'));
  });

  careTest('favorite foods by evolutionary line', () => {
    for (const [line, food] of Object.entries({
      pikachu: 'berry',
      charmander: 'meat',
      squirtle: 'milk',
      bulbasaur: 'honey',
    })) {
      careAssert.equal(careExports.careFavoriteFood(line), food);
    }
    careAssert.equal(careExports.careFavoriteFood('unknown-line'), null);
  });

  careTest('food and bath lookup rejects unknown keys', () => {
    for (const key of ['apple', 'berry', 'cookie', 'meat', 'milk', 'honey']) {
      careAssert.equal(careExports.careFoodByKey(key).key, key);
    }
    for (const key of ['bubble', 'shower', 'petal', 'herb']) {
      careAssert.equal(careExports.careBathByKey(key).key, key);
    }
    careAssert.equal(careExports.careFoodByKey('pizza'), null);
    careAssert.equal(careExports.careBathByKey('mud'), null);
  });
});

careDescribe('care API', { concurrency: false }, () => {
  careTest('disabled by default and child detail contains null care', async () => {
    const h = await careHarness();
    careError(await h.status(), 403, 'CARE_DISABLED');
    careError(await h.feed(), 403, 'CARE_DISABLED');
    careError(await h.bath(), 403, 'CARE_DISABLED');
    const detail = await h.api('/api/child?id=1');
    careAssert.equal(detail.status, 200);
    careAssert.equal(detail.body.child.care, null);
  });

  careTest('parent enables care and initial status is empty', async () => {
    const h = await careHarness();
    await h.enable();
    const settings = await h.api('/api/parent/settings');
    careAssert.equal(settings.status, 200);
    careAssert.equal(
      (settings.body.settings ?? settings.body).careEnabled, true
    );
    const result = await h.status();
    careAssert.equal(result.status, 200);
    careAssert.equal(result.body.foods.length, 6);
    careAssert.equal(result.body.baths.length, 4);
    careAssert.ok(result.body.scene.key);
    careAssert.equal(result.body.fedToday, false);
    careAssert.equal(result.body.bathedToday, false);
    careAssert.deepEqual(result.body.recent, []);
  });

  careTest('favorite food adds five XP and reveals only that favorite', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:berry');
    careAssert.equal(h.xp(1), 0);
    const result = await h.feed();
    careAssert.equal(result.status, 200);
    careAssert.equal(result.body.favorite, true);
    careAssert.equal(result.body.xpAwarded, 5);
    careAssert.equal(result.body.friendshipAwarded, 10);
    careAssert.equal(result.body.friendship, 10);
    careAssert.equal(h.friendship(1), 10);
    careAssert.equal(h.itemQty(1, 'care:berry'), 0);
    careAssert.equal(h.xp(1), 5);
    const status = await h.status();
    careAssert.equal(status.status, 200);
    careAssert.equal(status.body.fedToday, true);
    for (const food of status.body.foods) {
      careAssert.equal(food.isFavoriteKnown, food.key === 'berry');
    }
  });

  careTest('non-favorite food grants no XP', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(2, 'care:apple');
    const before = h.xp(2);
    const result = await h.feed(2, 'apple');
    careAssert.equal(result.status, 200);
    careAssert.equal(result.body.favorite, false);
    careAssert.equal(result.body.xpAwarded, 0);
    careAssert.equal(result.body.friendshipAwarded, 10);
    careAssert.equal(h.friendship(2), 10);
    careAssert.equal(h.xp(2), before);
  });

  careTest('bath grants no XP and updates status', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:bubble');
    const before = h.xp(1);
    const result = await h.bath();
    careAssert.equal(result.status, 200);
    careAssert.equal(result.body.xpAwarded, 0);
    careAssert.equal(result.body.friendshipAwarded, 10);
    careAssert.equal(result.body.friendship, 10);
    careAssert.equal(h.friendship(1), 10);
    careAssert.equal(h.xp(1), before);
    careAssert.equal((await h.status()).body.bathedToday, true);
  });

  careTest('second feed is rejected without another log or XP', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:berry');
    careAssert.equal((await h.feed()).status, 200);
    careError(await h.feed(), 400, 'ALREADY_DONE');
    careAssert.equal(h.logs(), 1);
    careAssert.equal(h.xp(1), 5);
  });

  careTest('second bath is rejected without another log or XP', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:bubble');
    const before = h.xp(1);
    careAssert.equal((await h.bath()).status, 200);
    careError(await h.bath(), 400, 'ALREADY_DONE');
    careAssert.equal(h.logs(), 1);
    careAssert.equal(h.xp(1), before);
  });

  careTest('children have isolated daily state and session scope', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:berry');
    careAssert.equal((await h.feed()).status, 200);
    const other = await h.status(2);
    careAssert.equal(other.status, 200);
    careAssert.equal(other.body.fedToday, false);
    const cookie = await h.childCookie(1, '0000');
    careError(await h.feed(2, 'meat', { cookie }), 403);
    careAssert.equal(h.logs(), 1);
    careAssert.equal(h.xp(2), 0);
  });

  careTest('invalid food and bath do not create logs', async () => {
    const h = await careHarness();
    await h.enable();
    careError(await h.feed(1, 'pizza'), 400);
    careAssert.equal(h.logs(), 0);
    careError(await h.bath(1, 'mud'), 400);
    careAssert.equal(h.logs(), 0);
    careAssert.equal(h.xp(1), 0);
  });

  careTest('concurrent feeds award XP exactly once', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:berry', 2);
    const results = await Promise.all([h.feed(), h.feed()]);
    careAssert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
    careError(results.find(result => result.status === 400), 400, 'ALREADY_DONE');
    careAssert.equal(h.logs(), 1);
    careAssert.equal(h.xp(1), 5);
    careAssert.equal(h.itemQty(1, 'care:berry'), 1, '并发落败那次扣的道具应退回');
  });

  careTest('favorite feed reuses level-up logic at forty XP', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:berry');
    h.raw.prepare('UPDATE children SET total_xp=35 WHERE id=?').run(1);
    careAssert.equal(h.xp(1), 35);
    const result = await h.feed();
    careAssert.equal(result.status, 200);
    careAssert.equal(result.body.xpAwarded, 5);
    careAssert.equal(h.xp(1), 40);
    careAssert.equal(result.body.level.newLevel, 2);
  });

  careTest('test-mode reset clears care logs but preserves enabled setting', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:berry');
    careAssert.equal((await h.feed()).status, 200);
    careAssert.equal(h.logs(), 1);
    const reset = await h.api('/api/parent/debug-reset', {
      method: 'POST', body: { confirm: true },
    });
    careAssert.equal(reset.status, 200, 'TEST_MODE=1 debug reset must be reachable');
    careAssert.equal(h.logs(), 0);
    careAssert.equal(
      h.raw.prepare("SELECT value FROM settings WHERE key='care_enabled'").get().value,
      '1'
    );
  });

  careTest('disabling after a feed hides status including recent history', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:berry');
    careAssert.equal((await h.feed()).status, 200);
    const status = await h.status();
    careAssert.equal(status.status, 200);
    careAssert.ok(status.body.recent.length > 0);
    await h.enable(false);
    const disabled = await h.status();
    careError(disabled, 403, 'CARE_DISABLED');
    careAssert.equal(disabled.body.recent, undefined);
  });

  careTest('feed without the item returns NO_ITEM and creates no log or friendship', async () => {
    const h = await careHarness();
    await h.enable();
    const result = await h.feed();
    careError(result, 400, 'NO_ITEM');
    careAssert.match(result.body.error, /没有「树果」/);
    careAssert.equal(h.logs(), 0);
    careAssert.equal(h.friendship(1), 0);
    careAssert.equal(h.itemQty(1, 'care:berry'), 0);
  });

  careTest('bath without the item returns NO_ITEM and creates no log or friendship', async () => {
    const h = await careHarness();
    await h.enable();
    const result = await h.bath();
    careError(result, 400, 'NO_ITEM');
    careAssert.match(result.body.error, /没有「泡泡浴」/);
    careAssert.equal(h.logs(), 0);
    careAssert.equal(h.friendship(1), 0);
  });

  careTest('feed with the item deducts one and adds ten friendship', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:berry', 2);
    const result = await h.feed();
    careAssert.equal(result.status, 200);
    careAssert.equal(result.body.friendshipAwarded, 10);
    careAssert.equal(result.body.friendship, 10);
    careAssert.equal(result.body.hearts, 0);
    careAssert.equal(h.itemQty(1, 'care:berry'), 1);
    careAssert.equal(h.friendship(1), 10);
  });

  careTest('bath with the item deducts one and adds ten friendship', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:bubble', 2);
    const result = await h.bath();
    careAssert.equal(result.status, 200);
    careAssert.equal(result.body.friendshipAwarded, 10);
    careAssert.equal(result.body.friendship, 10);
    careAssert.equal(h.itemQty(1, 'care:bubble'), 1);
    careAssert.equal(h.friendship(1), 10);
  });

  careTest('friendship caps at 255 on feed', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:berry');
    h.raw.prepare(
      "INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, friendship, created_epoch, updated_epoch) VALUES(1, 'pikachu', 172, 0, 'main', 250, 1000, 1000)"
    ).run();
    const result = await h.feed();
    careAssert.equal(result.status, 200);
    careAssert.equal(result.body.friendship, 255);
    careAssert.equal(result.body.friendshipAwarded, 5);
    careAssert.equal(result.body.hearts, 5);
    careAssert.equal(h.friendship(1), 255);
  });

  careTest('status returns item quantities for greying out', async () => {
    const h = await careHarness();
    await h.enable();
    h.give(1, 'care:berry', 3);
    h.give(1, 'care:bubble', 1);
    const status = await h.status();
    careAssert.equal(status.status, 200);
    const berry = status.body.foods.find(f => f.key === 'berry');
    const apple = status.body.foods.find(f => f.key === 'apple');
    const bubble = status.body.baths.find(b => b.key === 'bubble');
    careAssert.equal(berry.qty, 3);
    careAssert.equal(apple.qty, 0);
    careAssert.equal(bubble.qty, 1);
  });
});
