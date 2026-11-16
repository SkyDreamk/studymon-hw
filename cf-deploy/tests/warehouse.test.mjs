// tests/warehouse.test.mjs
import { test, describe } from 'node:test';
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

function makeEnv(skip0022 = false) {
  const raw = new DatabaseSync(':memory:');
  const list = skip0022 ? MIGRATIONS.filter((f) => f !== '0022_warehouse.sql') : MIGRATIONS;
  for (const f of list) {
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

async function rawCall(env, path, { method = 'GET', body = null, cookie = '' } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers['Cookie'] = cookie;
  const req = new Request('http://localhost' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const res = await M.default.fetch(req, env);
  const setCookie = res.headers.get('set-cookie') || '';
  const cookiePair = setCookie ? setCookie.split(';')[0] : '';
  return { status: res.status, json: await res.json(), cookie: cookiePair };
}

async function loginBothChildren(env) {
  const pLogin = await rawCall(env, '/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  const parentCookie = pLogin.cookie;
  await rawCall(env, '/api/parent/settings/update', {
    method: 'POST',
    cookie: parentCookie,
    body: {
      childPasswords: [
        { id: 1, password: '0000' },
        { id: 2, password: '0000' },
      ],
    },
  });
  const c1 = await rawCall(env, '/api/child/login', {
    method: 'POST',
    body: { childId: 1, password: '0000' },
  });
  const c2 = await rawCall(env, '/api/child/login', {
    method: 'POST',
    body: { childId: 2, password: '0000' },
  });
  return { cookie1: c1.cookie, cookie2: c2.cookie };
}

async function loginChild(env, childId = 1) {
  const { cookie1, cookie2 } = await loginBothChildren(env);
  return childId === 2 ? cookie2 : cookie1;
}

async function callApi(env, path, { method = 'GET', body = null, cookie = '' } = {}) {
  return rawCall(env, path, { method, body, cookie });
}

describe('大木博士精灵仓库与随身携带 (0022_warehouse)', () => {
  test('1. 迁移 0022 回填：主宠形态不计，按 first_epoch 优先、缺失则 unlocked_at 排序，最早 4 只收藏种携带、其余进仓', async () => {
    const { raw, env } = makeEnv(true);
    raw.exec(`
      INSERT INTO pokedex(child_id, entry_key, unlocked_at) VALUES
        (1, 'form:pikachu:0', '2019-01-01'),
        (1, 'wild:98', '2020-01-01'),
        (1, 'wild:16', '2026-01-10'),
        (1, 'wild:54', '2026-01-10'),
        (1, 'wild:50', '2026-01-10'),
        (1, 'wild:37', '2026-01-10'),
        (1, 'wild:74', '2026-01-10');
      INSERT INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES
        (1, 16, 'catch', 1700000000),
        (1, 54, 'catch', 1700001000),
        (1, 50, 'catch', 1700002000),
        (1, 37, 'catch', 1700003000),
        (1, 74, 'catch', 1700004000);
    `);
    raw.exec(readFileSync(new URL('../migrations/0022_warehouse.sql', import.meta.url), 'utf8'));

    const cookie = await loginChild(env, 1);
    const { status, json } = await callApi(env, '/api/warehouse/status?child_id=1', { cookie });
    assert.equal(status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.max_carried, 4);
    assert.equal(json.care_enabled, 0);
    assert.deepEqual(json.carried.map((c) => c.no), [16, 50, 54, 98]);
    // 2026-11-14 全量 151 批：测试站仓库列全部 164 种（主宠 172 不在名册内，不扣减）：
    // 实有 2 只＋合成 158 只＝160 只；实有的 37/74 仍在列、不重复。
    assert.equal(json.stored.length, 160);
    assert.ok(json.stored.some((c) => c.no === 37));
    assert.ok(json.stored.some((c) => c.no === 74));
  });

  test('1b. 仓库状态主宠带物种编号（2026-11-05 随身队伍点开属性卡片）：Lv.5 皮丘 no=172，蛋态 no=null', async () => {
    const { raw, env } = makeEnv();
    const cookie = await loginChild(env, 1);
    // 蛋态（total_xp=0，Lv.1）无物种编号
    const egg = await callApi(env, '/api/warehouse/status?child_id=1', { cookie });
    assert.equal(egg.status, 200);
    assert.equal(egg.json.mainPet.no, null);
    // 升到 Lv.5（400 XP）进化为皮丘
    raw.exec(`UPDATE children SET total_xp=400 WHERE id=1;`);
    const { status, json } = await callApi(env, '/api/warehouse/status?child_id=1', { cookie });
    assert.equal(status, 200);
    assert.equal(json.mainPet.no, 172);
    assert.equal(json.mainPet.name, '皮丘');
  });

  test('2. 抓捕/孵化入账：未满 4 只进携带，满 4 只进仓库并返回 notice，非收藏种不占携带位且无 notice', async () => {
    const { raw, env } = makeEnv();
    raw.exec(`
      INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES
        (1, 'wild:16', '2026-01-01', 1),
        (1, 'wild:50', '2026-01-01', 1),
        (1, 'wild:54', '2026-01-01', 1);
    `);
    const r4 = await M.insertPokedexWithCarryRule(env.DB, 1, 37, '2026-01-02');
    assert.equal(r4.carried, 1);
    assert.equal(r4.notice, null);

    const r5 = await M.insertPokedexWithCarryRule(env.DB, 1, 74, '2026-01-03');
    assert.equal(r5.carried, 0);
    assert.ok(r5.notice && r5.notice.code === 'SENT_TO_WAREHOUSE');

    const rNonColl = await M.insertPokedexWithCarryRule(env.DB, 1, 172, '2026-01-04'); // 172 皮丘：有 SPECIES、无 COLLECTION_MOVES（45 霸王花自全量 151 批起已是收藏种，不再能当非收藏种例子）
    assert.equal(rNonColl.carried, 0);
    assert.equal(rNonColl.notice, null);
  });

  test('3. 主宠不可存：按孩子自己的主宠线判定（皮丘 172 -> 皮卡丘 25；孩子 2 小火龙 4）', async () => {
    const { raw, env } = makeEnv();
    const { cookie1, cookie2 } = await loginBothChildren(env);

    const res172 = await callApi(env, '/api/warehouse/store', {
      method: 'POST', cookie: cookie1, body: { child_id: 1, no: 172 },
    });
    assert.equal(res172.status, 400);
    assert.equal(res172.json.error, 'MAIN_PET_CANNOT_STORE');

    for (const invalidNo of [152, 153]) {
      const r = await callApi(env, '/api/warehouse/store', {
        method: 'POST', cookie: cookie1, body: { child_id: 1, no: invalidNo },
      });
      assert.equal(r.status, 400);
      assert.equal(r.json.error, 'INVALID_SPECIES');
    }
    // 2026-11-14 全量 151 批：25/1 已进名册，store 时无携带行 → NOT_CARRIED（不再是 INVALID_SPECIES）。
    // 注：172 不能当 INVALID_SPECIES 例子——它是孩子 1 的主宠（Lv.1 皮丘），store 报 MAIN_PET_CANNOT_STORE。
    for (const no of [25, 1]) {
      const r = await callApi(env, '/api/warehouse/store', {
        method: 'POST', cookie: cookie1, body: { child_id: 1, no },
      });
      assert.equal(r.status, 400);
      assert.equal(r.json.error, 'NOT_CARRIED');
    }

    raw.exec(`
      INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, created_epoch, updated_epoch)
      VALUES (1, 'pikachu', 25, 2, 'main', 1000, 1000);
    `);
    const res25 = await callApi(env, '/api/warehouse/store', {
      method: 'POST', cookie: cookie1, body: { child_id: 1, no: 25 },
    });
    assert.equal(res25.status, 400);
    assert.equal(res25.json.error, 'MAIN_PET_CANNOT_STORE');

    const res4 = await callApi(env, '/api/warehouse/store', {
      method: 'POST', cookie: cookie2, body: { child_id: 2, no: 4 },
    });
    assert.equal(res4.status, 400);
    assert.equal(res4.json.error, 'MAIN_PET_CANNOT_STORE');
  });

  test('4. 存入、取出与满员强制交换：携带满 4 只时直接取出返回 400，指定交换宠则原子互换成功', async () => {
    const { raw, env } = makeEnv();
    const cookie = await loginChild(env, 1);
    raw.exec(`
      INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES
        (1, 'wild:16', '2026-01-01', 1),
        (1, 'wild:50', '2026-01-01', 1),
        (1, 'wild:54', '2026-01-01', 1),
        (1, 'wild:37', '2026-01-01', 1),
        (1, 'wild:74', '2026-01-01', 0);
    `);

    const takeFail = await callApi(env, '/api/warehouse/take', {
      method: 'POST', cookie, body: { child_id: 1, no: 74 },
    });
    assert.equal(takeFail.status, 400);
    assert.equal(takeFail.json.error, 'PARTY_FULL_SWAP_REQUIRED');

    const swapOk = await callApi(env, '/api/warehouse/swap', {
      method: 'POST', cookie, body: { child_id: 1, take_no: 74, store_no: 50 },
    });
    assert.equal(swapOk.status, 200);
    assert.deepEqual(swapOk.json.carried.map((c) => c.no), [16, 37, 54, 74]);
    // 全量 151 批：实有 1 只（50）＋合成 159 只＝160 只。
    assert.equal(swapOk.json.stored.length, 160);
    assert.ok(swapOk.json.stored.some((c) => c.no === 50));

    const storeOk = await callApi(env, '/api/warehouse/store', {
      method: 'POST', cookie, body: { child_id: 1, no: 16 },
    });
    assert.equal(storeOk.status, 200);
    assert.equal(storeOk.json.carried.length, 3);

    const takeOk = await callApi(env, '/api/warehouse/take', {
      method: 'POST', cookie, body: { child_id: 1, no: 50 },
    });
    assert.equal(takeOk.status, 200);
    assert.equal(takeOk.json.carried.length, 4);
  });

  test('5. 并发存取不超限：携带 3 只时并发取出 2 只仓库宠，最终携带严格为 4 只', async () => {
    const { raw, env } = makeEnv();
    const cookie = await loginChild(env, 1);
    raw.exec(`
      INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES
        (1, 'wild:16', '2026-01-01', 1),
        (1, 'wild:50', '2026-01-01', 1),
        (1, 'wild:54', '2026-01-01', 1),
        (1, 'wild:37', '2026-01-01', 0),
        (1, 'wild:74', '2026-01-01', 0);
    `);

    const [resA, resB] = await Promise.all([
      callApi(env, '/api/warehouse/take', { method: 'POST', cookie, body: { child_id: 1, no: 37 } }),
      callApi(env, '/api/warehouse/take', { method: 'POST', cookie, body: { child_id: 1, no: 74 } }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    assert.deepEqual(statuses, [200, 400]);

    const st = await callApi(env, '/api/warehouse/status?child_id=1', { cookie });
    assert.equal(st.json.carried.length, 4);
    // 全量 151 批：实有 1 只＋合成 159 只＝160 只。
    assert.equal(st.json.stored.length, 160);
  });

  test('6. 备战过滤：carriedCollection 只返回随身携带的收藏宠', async () => {
    const { raw, env } = makeEnv();
    raw.exec(`
      INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES
        (1, 'wild:16', '2026-01-01', 1),
        (1, 'wild:54', '2026-01-01', 0);
    `);
    const carried = await M.carriedCollection(env.DB, 1);
    assert.deepEqual(carried.map((c) => c.no), [16]);
  });

  test('7. 探针 7：皮卡丘主宠的孩子 1 名下已携带 egg:133（伊布收藏种）调 store 133 返回 200', async () => {
    const { raw, env } = makeEnv();
    const cookie = await loginChild(env, 1);
    raw.exec(`INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES (1, 'egg:133', '2026-01-01', 1);`);
    const res = await callApi(env, '/api/warehouse/store', {
      method: 'POST', cookie, body: { child_id: 1, no: 133 },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    // 全量 151 批：携带 0 只、实有 1 只（133）＋合成 163 只＝164 只（主宠 172 不在名册内）。
    assert.equal(res.json.stored.length, 164);
    assert.ok(res.json.stored.some((c) => c.no === 133));
  });

  test('8. 探针 8：回填早期获得的 egg:133 应保留在携带队列中', async () => {
    const { raw, env } = makeEnv(true);
    raw.exec(`
      INSERT INTO pokedex(child_id, entry_key, unlocked_at) VALUES
        (1, 'egg:133', '2020-01-01'),
        (1, 'wild:16', '2026-01-02');
    `);
    raw.exec(readFileSync(new URL('../migrations/0022_warehouse.sql', import.meta.url), 'utf8'));
    const cookie = await loginChild(env, 1);
    const { status, json } = await callApi(env, '/api/warehouse/status?child_id=1', { cookie });
    assert.equal(status, 200);
    assert.deepEqual(json.carried.map((c) => c.no), [16, 133]);
  });

  test('9. 测试站全量：仓库列出全部 164 种收藏种（主宠扣减只对名册内主宠）', async () => {
    const { raw, env } = makeEnv();
    const cookie = await loginChild(env, 1);
    raw.exec(`
      INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES
        (1, 'wild:16', '2026-01-01', 1),
        (1, 'wild:50', '2026-01-01', 1),
        (1, 'wild:54', '2026-01-01', 1),
        (1, 'wild:37', '2026-01-01', 1),
        (1, 'wild:74', '2026-01-01', 0);
    `);
    // 主宠是 Lv.1 皮丘 172（不在名册内）：164－4 携带＝160 仓。
    const { status, json } = await callApi(env, '/api/warehouse/status?child_id=1', { cookie });
    assert.equal(status, 200);
    assert.equal(json.carried.length, 4);
    assert.equal(json.stored.length, 160);
    assert.ok(json.stored.some((c) => c.no === 150), '仓库应列出未拥有的超梦');
    assert.ok(json.stored.some((c) => c.no === 144), '仓库应列出未拥有的急冻鸟');
    const m150 = json.stored.find((c) => c.no === 150);
    assert.equal(m150.entry_key, 'egg:150');
    assert.equal(m150.name, '超梦');
    assert.equal(m150.carried, 0);
    assert.ok(!json.stored.some((c) => c.no === 172), '主宠种不进仓库合成列表');
    // 主宠进到名册内（升到 Lv.10 皮卡丘 25）：164－4 携带－1 主宠＝159 仓，且 25 不在仓内。
    // 注：首次 status 调用里的 attachEvoForm 已建了 (1,'pikachu') 实例行，须用 upsert 而非 INSERT。
    raw.exec(`UPDATE children SET total_xp=${M.xpForLevel(10)} WHERE id=1;`);
    raw.exec(`
      INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, source, created_epoch, updated_epoch)
      VALUES (1, 'pikachu', 25, 2, 'main', 1000, 1000)
      ON CONFLICT(child_id, line_key) DO UPDATE SET species_no=25, form_idx=2, source='main', updated_epoch=1000;
    `);
    const st2 = await callApi(env, '/api/warehouse/status?child_id=1', { cookie });
    assert.equal(st2.status, 200);
    assert.equal(st2.json.stored.length, 159);
    assert.ok(!st2.json.stored.some((c) => c.no === 25), '名册内主宠不进仓库合成列表');
    assert.ok(st2.json.stored.some((c) => c.no === 150));
  });

  test('10. 测试站全量：取出未拥有的超梦（150）直接发一只；满员时换入未拥有的种也成功', async () => {
    const { raw, env } = makeEnv();
    const cookie = await loginChild(env, 1);
    raw.exec(`
      INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES
        (1, 'wild:16', '2026-01-01', 1),
        (1, 'wild:50', '2026-01-01', 1),
        (1, 'wild:54', '2026-01-01', 1);
    `);
    // 有空位（3/4）：直接取出未拥有的 150
    const take = await callApi(env, '/api/warehouse/take', {
      method: 'POST', cookie, body: { child_id: 1, no: 150 },
    });
    assert.equal(take.status, 200, JSON.stringify(take.json));
    assert.ok(take.json.carried.some((c) => c.no === 150), '取出后 150 应在携带');
    assert.ok(!take.json.stored.some((c) => c.no === 150), '取出后 150 不应再在仓库');
    const row = raw.prepare("SELECT entry_key, carried FROM pokedex WHERE child_id=1 AND entry_key='egg:150'").get();
    assert.ok(row, '应补出 egg:150 行');
    assert.equal(row.carried, 1);

    // 满员（4/4）：换入未拥有的 144（取出 144、存回 16）
    const swap = await callApi(env, '/api/warehouse/swap', {
      method: 'POST', cookie, body: { child_id: 1, take_no: 144, store_no: 16 },
    });
    assert.equal(swap.status, 200, JSON.stringify(swap.json));
    assert.ok(swap.json.carried.some((c) => c.no === 144), '换入后 144 应在携带');
    assert.ok(swap.json.stored.some((c) => c.no === 16), '换出后 16 应回仓库');
    const row144 = raw.prepare("SELECT entry_key, carried FROM pokedex WHERE child_id=1 AND entry_key='egg:144'").get();
    assert.ok(row144, '应补出 egg:144 行');
    assert.equal(row144.carried, 1);
    const row16 = raw.prepare("SELECT entry_key, carried FROM pokedex WHERE child_id=1 AND entry_key='wild:16'").get();
    assert.equal(row16.carried, 0);
  });
});
