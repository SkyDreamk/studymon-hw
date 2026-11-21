/* 道馆每日随机天气（2026-11-17 用户定）：node --test tests/gym-daily-weather.test.mjs
 * 设计：每个道馆每天独立随机天气（晴/雨/沙暴/冰雹/无，均等；Batch 8 冰雹进默认池），种子 = 关卡 stage＋上海日期
 * （shDateStr，尊重时间模拟偏移），FNV-1a 哈希取模进池。同一天同一关在服务端、本地引擎、
 * 所有设备上完全一致；半夜（上海日期变更）换天气；对所有孩子相同（种子不含 childId）。
 * 覆盖：① 纯函数确定性（同 stage＋同日期 → 同天气；换 stage/日期会变化）；
 * ② 按关卡的池覆盖（S1/S2/S3/S5/S6 完整池 60 天五种全出；S4 收窄池只出晴/沙暴/无、
 * 绝不出雨天；S7 收窄池只出雨/沙暴/无、绝不出晴天；S8 收窄池只出晴/雨/无、绝不出沙暴
 * ——2026-11-17 设计定稿 8.md 热修 S8 新增剔沙暴）；③ 服务端与离线引擎逐字一致＋算值一致；
 * ④ /api/gym/status 每关带今日天气且与函数一致；⑤ 开局 battle.weather 与函数一致；
 * ⑥ 前端道馆卡片显示今日天气、本地开局走 gymDailyWeather（源码断言）。
 * API 部分 harness 同 battle.test（node:sqlite 内存库＋迁移 0001–0005 等）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { assetPath } from './asset-path.mjs';
import { readBackendSource } from './backend-src.mjs';

const M = await import(new URL('../src/index.js', import.meta.url));
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);
const dir = path.dirname(fileURLToPath(import.meta.url));
const serverSrc = readBackendSource();
const engines = readdirSync(path.join(dir, '../public/static')).filter((f) => /^engine-local\.[0-9a-f]+\.js$/.test(f));
assert.equal(engines.length, 1, `磁盘上 engine-local 应恰一个 hashed 文件，实际 ${engines.join(',')}`);
const engineSrc = readFileSync(path.join(dir, '../public/static', engines[0]), 'utf8');
const appSrc = readFileSync(path.join(dir, '../public/static/app.js.orig'), 'utf8');

const POOL = ['sun', 'rain', 'sand', 'hail', null];

describe('每日天气函数：确定性与池覆盖', () => {
  test('同 stage＋同日期 → 同天气；纯函数，无 wall-clock', () => {
    for (const stage of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const date of ['2026-11-17', '2026-11-18', '2026-12-31', '2027-01-01']) {
        const a = M.gymDailyWeather(stage, date);
        const b = M.gymDailyWeather(stage, date);
        assert.equal(a, b, `stage ${stage} ${date} 应确定`);
        assert.ok(POOL.includes(a), `stage ${stage} ${date} 天气 ${a} 不在池里`);
        assert.equal(L.gymDailyWeather(stage, date), a, `离线端 stage ${stage} ${date} 应与服务端一致`);
      }
    }
    // 函数体不读 wall-clock：源码里不含 new Date()/Date.now()
    const block = serverSrc.slice(serverSrc.indexOf('function gymDailyWeather'), serverSrc.indexOf('function diffDays'));
    assert.ok(!block.includes('new Date'), 'gymDailyWeather 不得读 wall-clock');
    assert.ok(!block.includes('Date.now'), 'gymDailyWeather 不得读 wall-clock');
  });

  test('换 stage 或换日期，天气会变化（不是写死一个值）', () => {
    const seen = new Set();
    for (let stage = 1; stage <= 8; stage++) {
      for (let d = 1; d <= 30; d++) {
        seen.add(M.gymDailyWeather(stage, `2026-11-${String(d).padStart(2, '0')}`));
      }
    }
    assert.ok(seen.size > 1, '30 天 × 8 关应出现不止一种天气');
  });

  test('S1/S2/S3/S5/S6 完整池：60 天里晴/雨/沙暴/冰雹/无五种全出（Batch 8 冰雹进默认池；2026-11-17 8 关扩围：新 S5 毒、S6 超能力用完整池；2026-11-17 设计定稿 8.md 热修：S8 改收窄池，不再完整）', () => {
    for (const stage of [1, 2, 3, 5, 6]) {
      const seen = new Set();
      for (let d = 0; d < 60; d++) {
        const date = new Date(Date.UTC(2026, 10, 17 + d)).toISOString().slice(0, 10);
        seen.add(M.gymDailyWeather(stage, date));
        seen.add(L.gymDailyWeather(stage, date));
      }
      assert.deepEqual([...seen].sort(), [null, 'hail', 'rain', 'sand', 'sun'].sort(), `第 ${stage} 关五种天气都应出现`);
    }
  });

  test('S4 收窄池：60 天里只出晴/沙暴/无，绝不出雨天（雨天火减半会堵死打草）', () => {
    const seen = new Set();
    for (let d = 0; d < 60; d++) {
      const date = new Date(Date.UTC(2026, 10, 17 + d)).toISOString().slice(0, 10);
      seen.add(M.gymDailyWeather(4, date));
      seen.add(L.gymDailyWeather(4, date));
    }
    assert.ok(!seen.has('rain'), 'S4 绝不能出雨天');
    assert.deepEqual([...seen].sort(), [null, 'sand', 'sun'].sort(), 'S4 应只出晴/沙暴/无');
  });

  test('S7 收窄池：60 天里只出雨/沙暴/无，绝不出晴天（晴天水减半会堵死打火；2026-11-17 8 关扩围：火系从 S5 移到 S7，收窄池同步移位）', () => {
    const seen = new Set();
    for (let d = 0; d < 60; d++) {
      const date = new Date(Date.UTC(2026, 10, 17 + d)).toISOString().slice(0, 10);
      seen.add(M.gymDailyWeather(7, date));
      seen.add(L.gymDailyWeather(7, date));
    }
    assert.ok(!seen.has('sun'), 'S7 绝不能出晴天');
    assert.deepEqual([...seen].sort(), [null, 'rain', 'sand'].sort(), 'S7 应只出雨/沙暴/无');
  });

  test('S8 收窄池：60 天里只出晴/雨/无，绝不出沙暴（沙暴岩石特防 1.5×＋扣血会堵死打地面；2026-11-17 设计定稿 8.md 热修新增）', () => {
    const seen = new Set();
    for (let d = 0; d < 60; d++) {
      const date = new Date(Date.UTC(2026, 10, 17 + d)).toISOString().slice(0, 10);
      seen.add(M.gymDailyWeather(8, date));
      seen.add(L.gymDailyWeather(8, date));
    }
    assert.ok(!seen.has('sand'), 'S8 绝不能出沙暴');
    assert.deepEqual([...seen].sort(), [null, 'rain', 'sun'].sort(), 'S8 应只出晴/雨/无');
  });

  test('种子不含 childId：同一关同一天，不同孩子天气相同', () => {
    // 函数签名只有 (stage, dateStr)，没有 childId 入参——源码级保证
    assert.equal(M.gymDailyWeather.length, 2, 'gymDailyWeather 应只取 (stage, dateStr) 两个参数');
    assert.equal(M.gymDailyWeather(3, '2026-11-17'), M.gymDailyWeather(3, '2026-11-17'));
  });
});

describe('服务端与离线引擎逐字一致', () => {
  // 模块化后端拆分后 fnv1aHash 位于 src/lib/shared.js（与天气池/天气函数不再相邻），故三段分别取、再拼接逐字比较
  const grabWeather = (src) => {
    const pool = src.match(/const GYM_WEATHER_POOL = \['sun', 'rain', 'sand', 'hail', null\];\n\/\* 收窄池[\s\S]*?\*\/\nconst GYM_WEATHER_POOLS = \{ 4: \['sun', 'sand', null\], 7: \['rain', 'sand', null\], 8: \['sun', 'rain', null\] \};/);
    const hash = src.match(/function fnv1aHash\(str\) \{[\s\S]*?\n\}/);
    const fn = src.match(/function gymDailyWeather\(stage, dateStr\) \{[\s\S]*?\n\}/);
    assert.ok(pool && hash && fn, '未找到每日天气函数块');
    return [pool[0], hash[0], fn[0]].join('\n');
  };
  test('GYM_WEATHER_POOL / fnv1aHash / gymDailyWeather 两边逐字一致', () => {
    assert.equal(grabWeather(engineSrc), grabWeather(serverSrc));
  });
  test('算值一致：8 关 × 90 天逐项对过', () => {
    for (let stage = 1; stage <= 8; stage++) {
      for (let d = 0; d < 90; d++) {
        const date = new Date(Date.UTC(2026, 10, 1 + d)).toISOString().slice(0, 10);
        assert.equal(L.gymDailyWeather(stage, date), M.gymDailyWeather(stage, date), `stage ${stage} ${date}`);
      }
    }
  });
  test('GYM_STAGES 两边都不再有 weather 字段', () => {
    assert.ok(M.GYM_STAGES.every((g) => !('weather' in g)));
    assert.ok(L.GYM_STAGES.every((g) => !('weather' in g)));
  });
});

/* ---------------- API：状态与开局 ---------------- */
const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0019_evo_items.sql', '0043_pet_instances_ability.sql'];
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
let env;
beforeEach(() => { ({ env } = makeEnv()); });
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
async function childCookie(id) {
  const pc0 = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(pc0.status, 200);
  const r = await call('/api/parent/settings/update', {
    method: 'POST', cookie: pc0.cookie,
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(r.j.ok, true);
  const c = await call('/api/child/login', { method: 'POST', body: { childId: id, password: id === 1 ? '1111' : '2222' } });
  assert.equal(c.status, 200);
  return c.cookie;
}

describe('道馆状态与开局：今日天气', () => {
  test('/api/gym/status 每关带今日天气，与 gymDailyWeather(stage, today) 一致', async () => {
    const c1 = await childCookie(1);
    const st = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(st.j.ok, true);
    assert.equal(st.j.stages.length, 8);
    for (const s of st.j.stages) {
      assert.ok('weather' in s, `第 ${s.stage} 关状态应带 weather 字段`);
      assert.equal(s.weather, M.gymDailyWeather(s.stage, st.j.today), `第 ${s.stage} 关天气应与函数一致`);
    }
    // 两孩同一天同一关天气相同
    const c2 = await childCookie(2);
    const st2 = await call('/api/gym/status', { method: 'POST', cookie: c2, body: { childId: 2 } });
    assert.equal(st2.j.today, st.j.today);
    for (let i = 0; i < 6; i++) {
      assert.equal(st2.j.stages[i].weather, st.j.stages[i].weather, `第 ${i + 1} 关两孩天气应相同`);
    }
  });

  test('/api/battle/gym/start 的 battle.weather 与今日函数一致（服务端开局）', async () => {
    const c1 = await childCookie(1);
    const st = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1 } });
    assert.equal(start.j.ok, true, `开局失败：${JSON.stringify(start.j)}`);
    assert.equal(start.j.battle.weather, M.gymDailyWeather(1, st.j.today), '开局天气应与今日函数一致');
    assert.equal(start.j.battle.weather, st.j.stages[0].weather, '开局天气应与列表显示一致');
  });
});

describe('前端：道馆卡片显示今日天气、本地开局走每日天气', () => {
  test('stageCard 有今日天气行，gymWeatherBadge 覆盖四种', () => {
    assert.ok(appSrc.includes('function gymWeatherBadge(w)'), '缺 gymWeatherBadge');
    assert.ok(appSrc.includes("tr('今日天气：', \"Today's weather: \")"), '卡片应有“今日天气：”行');
    assert.ok(appSrc.includes('${gymWeatherBadge(s.weather)}'), '卡片应用 s.weather 渲染角标');
    for (const [w, label] of [['sun', '大晴天'], ['rain', '下雨'], ['sand', '沙暴']]) {
      assert.ok(appSrc.includes(`if (w === '${w}')`), `gymWeatherBadge 缺 ${w}`);
      assert.ok(appSrc.includes(label), `gymWeatherBadge 缺 ${label}`);
    }
    assert.ok(appSrc.includes("tr('晴朗', 'Clear')"), '无天气应显示晴朗');
  });
  test('本地开局不再读 cfg.weather，改走 BattleLocal.gymDailyWeather', () => {
    assert.ok(!appSrc.includes('weather: cfg.weather'), '本地开局不应再读 cfg.weather');
    assert.ok(appSrc.includes('BattleLocal.gymDailyWeather(stage, gymDate)'), '本地开局应走 gymDailyWeather');
    assert.ok(appSrc.includes('G.status.today'), '本地开局日期应优先取道馆状态的 today（虚拟日期）');
  });
  test('服务端开局不再读 cfg.weather', () => {
    assert.ok(!serverSrc.includes('weather: cfg.weather'), '服务端开局不应再读 cfg.weather');
    assert.ok(serverSrc.includes('weather: gymDailyWeather(cfg.stage, today)'), '服务端开局应走 gymDailyWeather');
  });
});
