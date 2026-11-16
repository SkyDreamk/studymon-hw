/* 精灵蛋按物种区分（2026-10-27 §52，用户定：不要所有蛋都一个样）单测：
 *  node --test tests/egg-design.test.mjs
 * ① eggDesignFor：11 只可出蛋物种各有独立设计（底色＋花纹全不重样）；
 *    覆盖全部蛋来源（转盘／单元测试／道馆封印蛋／家长发蛋目录）；未知物种按属性兜底、无物种按神秘蛋兜底；
 * ② CSS：.eggshape 基底＋全部花纹 .pat-* 规则在位；
 * ③ 接口：/api/eggs、/api/evo/backpack、/api/pokedex、/api/child 下发的蛋一律带设计对象；
 * ④ 前端静态：全部蛋渲染点走 eggHtml，app.js 里无通用蛋 emoji。
 * 真实 Azure 调用 0 次。 */
import { assetPath } from './asset-path.mjs';
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const M = await import(new URL('../src/index.js', import.meta.url));
const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql',
  '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql',
  '0010_pvp_rematch.sql', '0019_evo_items.sql', '0024_evo_reward.sql',
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
beforeEach(() => { env = makeEnv(); });
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

/* ---------- ① 纯函数：eggDesignFor ---------- */
describe('eggDesignFor', () => {
  test('11 只可出蛋物种：底色＋花纹全部不重样', () => {
    const nos = [1, 4, 7, 25, 37, 58, 126, 131, 133, 143, 147, 151, 172, 208];
    const combos = nos.map((no) => {
      const d = M.eggDesignFor(no);
      assert.equal(d.no, no);
      assert.match(d.bg, /^#[0-9A-F]{6}$/);
      assert.match(d.pat, /^[a-z]+$/);
      assert.match(d.c1, /^#[0-9A-F]{6}$/);
      assert.match(d.c2, /^#[0-9A-F]{6}$/);
      return `${d.bg}|${d.pat}`;
    });
    assert.equal(new Set(combos).size, nos.length, '底色＋花纹组合必须 14 只全不相同');
    assert.equal(new Set(nos.map((no) => M.eggDesignFor(no).bg)).size, nos.length, '底色 14 只全不相同');
  });

  test('覆盖全部蛋来源：转盘／单元测试／道馆封印蛋／发蛋目录的物种都在表里', () => {
    const fromPools = new Set([
      ...M.WHEEL_EGG_POOL, ...M.UNIT_TEST_EGG_MAIN, ...M.UNIT_TEST_EGG_RARE,
      ...M.GYM_STAGES.map((g) => g.eggSpecies), 151,
      ...Object.keys(M.EGG_ITEM_BY_SPECIES).map(Number),
      172, 4, 7, 1, 133, // 五条线一阶（皮卡丘线一阶是皮丘 172，不是 25）
    ]);
    for (const no of fromPools) {
      assert.ok(M.EGG_DESIGNS[no], `物种 ${no} 缺蛋设计`);
      assert.equal(M.eggDesignFor(no).no, no);
    }
    assert.equal(fromPools.size, 14);
  });

  test('兜底：未知物种按属性花纹，无物种按神秘蛋，永不回通用蛋', () => {
    assert.equal(M.eggDesignFor(50).pat, 'stripes'); // 地鼠：地面
    assert.equal(M.eggDesignFor(16).pat, 'waves'); // 波波：飞行
    assert.equal(M.eggDesignFor(95).pat, 'spots'); // 大岩蛇：岩石
    assert.equal(M.eggDesignFor(999).pat, 'star'); // 查无此物种：神秘蛋
    assert.equal(M.eggDesignFor(null).pat, 'star');
    assert.equal(M.eggDesignFor(undefined).pat, 'star');
    assert.equal(M.eggDesignFor('abc').pat, 'star');
    assert.equal(M.eggDesignFor('25').no, 25); // 字符串归一化
    assert.equal(M.eggDesignFor('25').pat, 'bolt');
  });

  test('LINES 不再含 eggBg/eggPattern（旧 emoji 蛋纹已清）', () => {
    assert.doesNotMatch(src, /eggBg|eggPattern/);
  });
});

/* ---------- ② CSS：花纹规则 ---------- */
describe('egg CSS', () => {
  test('.eggshape 基底＋全部花纹规则在位', () => {
    const css = readFileSync(assetPath('style.css'), 'utf8');
    assert.match(css, /\.eggshape\{/);
    const pats = new Set([
      ...Object.values(M.EGG_DESIGNS).map((d) => d.pat),
      ...Object.values(M.EGG_TYPE_FALLBACK).map((d) => d.pat),
      M.EGG_MYSTERY.pat,
    ]);
    assert.ok(pats.size >= 12, `花纹种类 ${pats.size}`);
    for (const pat of pats) assert.match(css, new RegExp(`\\.pat-${pat}\\{`), `缺 .pat-${pat}`);
  });
});

/* ---------- ③ 接口下发蛋设计 ---------- */
describe('API egg payload', () => {
  test('/api/eggs：封印蛋＋奖励蛋行都带设计对象', async () => {
    const cookie = await parentCookie();
    raw.exec("INSERT INTO sealed_eggs(child_id, awarded_date, unlock_date, species, hatched) VALUES(1,'2026-10-27','2099-01-01',143,0),(1,'2026-10-27','2099-01-01',131,0),(1,'2026-10-27','2099-01-01',151,0)");
    raw.exec("INSERT INTO reward_eggs(child_id, species_no, source, status, unlock_date, created_epoch, date_shanghai) VALUES(1,37,'wheel','pending','2099-01-01',0,'2026-10-27'),(1,58,'unit_test','pending','2099-01-01',0,'2026-10-27')");
    const r = await call('/api/eggs', { method: 'POST', body: { childId: 1 }, cookie });
    assert.equal(r.status, 200);
    assert.equal(r.j.eggs.length, 3);
    for (const e of r.j.eggs) assert.deepEqual(e.egg, M.eggDesignFor(e.species));
    assert.equal(r.j.rewardEggs.length, 2);
    for (const e of r.j.rewardEggs) assert.deepEqual(e.egg, M.eggDesignFor(e.species));
    // 同屏三颗封印蛋一眼能区分：底色＋花纹组合不同
    const combos = r.j.eggs.map((e) => `${e.egg.bg}|${e.egg.pat}`);
    assert.equal(new Set(combos).size, 3);
  });

  test('/api/evo/backpack：蛋行＋蛋道具都带设计，非蛋道具不带', async () => {
    const cookie = await parentCookie();
    raw.exec("INSERT INTO sealed_eggs(child_id, awarded_date, unlock_date, species, hatched) VALUES(1,'2026-10-27','2099-01-01',147,0)");
    raw.exec("INSERT INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(1,'egg:vulpix',1,0),(1,'stone:fire',2,0)");
    const r = await call('/api/evo/backpack?childId=1', { cookie });
    assert.equal(r.status, 200);
    assert.equal(r.j.eggs.length, 1);
    assert.deepEqual(r.j.eggs[0].egg, M.eggDesignFor(147));
    const eggItem = r.j.inventory.find((it) => it.key === 'egg:vulpix');
    assert.deepEqual(eggItem.egg, M.eggDesignFor(37));
    const stone = r.j.inventory.find((it) => it.key === 'stone:fire');
    assert.equal(stone.egg, undefined);
  });

  test('/api/pokedex：五条线蛋格子按首形态物种带设计', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/pokedex', { method: 'POST', body: { childId: 1 }, cookie });
    assert.equal(r.status, 200);
    const firstForm = { pikachu: 172, charmander: 4, squirtle: 7, bulbasaur: 1, eevee: 133 };
    const eggs = r.j.lineEntries.filter((e) => e.formIdx === 0);
    assert.equal(eggs.length, 5);
    for (const e of eggs) assert.deepEqual(e.egg, M.eggDesignFor(firstForm[e.line]));
  });

  test('/api/child：蛋形态孩子的 form.egg 是本线首形态设计', async () => {
    const cookie = await parentCookie();
    const child = raw.prepare('SELECT line FROM children WHERE id=1').get();
    const firstForm = { pikachu: 172, charmander: 4, squirtle: 7, bulbasaur: 1, eevee: 133 };
    const r = await call('/api/child?id=1', { cookie });
    assert.equal(r.status, 200);
    assert.equal(r.j.child.form.formIdx, 0);
    assert.deepEqual(r.j.child.form.egg, M.eggDesignFor(firstForm[child.line]));
  });
});

/* ---------- ④ 前端静态：全部蛋渲染点走 eggHtml ---------- */
describe('frontend eggHtml', () => {
  test('app.js 里无通用蛋 emoji，全部蛋渲染点走 eggHtml', () => {
    const app = readFileSync(assetPath('app.js'), 'utf8');
    assert.doesNotMatch(app, /🥚/);
    assert.doesNotMatch(app, /egg\.pattern/);
    assert.match(app, /function eggHtml\(d, size\)/);
  });
});
