/* 151 图鉴仅改变展示口径；172、179 保留在分册，不计入关都进度。 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { assetHash } from './asset-path.mjs';

const H = assetHash();
assert.match(H || '', /^[0-9a-f]{8}$/, '先跑 node scripts/hash-assets.mjs');

const M = await import(new URL('../src/index.js', import.meta.url));
const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql',
  '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql',
  '0010_pvp_rematch.sql', '0019_evo_items.sql', '0043_pet_instances_ability.sql',
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
    async first() { return raw.prepare(sql).get(...this._args) ?? null; },
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
    env: {
      DB: db, TEST_MODE: '1',
      ASSETS: {
        fetch: async () => new Response('<html>app</html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
      },
    },
    raw,
  };
}

let env, raw;

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie, res };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

async function pokedex(childId, cookie) {
  const r = await call('/api/pokedex', {
    method: 'POST', body: { childId }, cookie,
  });
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, true);
  return r.j;
}

// 从接口补写的本孩 form 行复制迁移定义的日期等字段，只替换测试 entry_key。
function insertEntry(childId, key) {
  const columns = raw.prepare('PRAGMA table_info(pokedex)').all()
    .filter((c) => c.name !== 'id');
  const names = columns.map((c) => `"${c.name}"`).join(', ');
  const values = columns.map((c) => c.name === 'entry_key' ? '?' : `"${c.name}"`).join(', ');
  const r = raw.prepare(`
    INSERT INTO pokedex (${names})
    SELECT ${values} FROM pokedex
    WHERE child_id=? AND entry_key LIKE 'form:%' LIMIT 1
  `).run(key, childId);
  assert.equal(r.changes, 1);
}

function fullKeys(line) {
  return [
    ...[1, 2, 3].map((idx) => `form:${line}:${idx}`),
    ...[16, 43, 39, 50, 54, 37, 74, 98, 179, 58, 123, 111].map((no) => `wild:${no}`),
    ...[143, 131, 133, 147].map((no) => `egg:${no}`),
    'rare:151',
    ...[95, 121, 125, 45].map((no) => `gym:${no}`),
  ];
}

describe('151 图鉴纯函数', () => {
  test('空图鉴为 0/151', () => {
    assert.equal(M.POKEDEX_TOTAL, 151);
    assert.deepEqual(M.ownedDexNos([], 'pikachu'), []);
    assert.deepEqual(M.dex151Progress([], 'pikachu'), { owned: 0, total: 151, pct: 0 });
  });

  test('野外、蛋、稀有与馆主按编号计数', () => {
    const keys = ['wild:16', 'wild:54', 'egg:143', 'rare:151', 'gym:95'];
    assert.deepEqual(M.ownedDexNos(keys, 'pikachu'), [16, 54, 95, 143, 151]);
    assert.deepEqual(M.dex151Progress(keys, 'pikachu'), { owned: 5, total: 151, pct: 3 });
  });

  test('皮丘与蛋不计入，皮卡丘计入', () => {
    assert.deepEqual(M.ownedDexNos(['form:pikachu:0', 'form:pikachu:1'], 'pikachu'), []);
    const keys = ['form:pikachu:0', 'form:pikachu:1', 'form:pikachu:2'];
    assert.deepEqual(M.ownedDexNos(keys, 'pikachu'), [25]);
    assert.equal(M.dex151Progress(keys, 'pikachu').owned, 1);
  });

  test('小火龙三形态计入，其他线 form 不计入', () => {
    const keys = ['form:charmander:1', 'form:charmander:2', 'form:charmander:3'];
    assert.deepEqual(M.ownedDexNos(keys, 'charmander'), [4, 5, 6]);
    assert.equal(M.dex151Progress(keys, 'charmander').owned, 3);
    assert.deepEqual(M.ownedDexNos(keys, 'pikachu'), []);
    assert.deepEqual(M.ownedDexNos(['form:pikachu:2'], 'charmander'), []);
  });

  test('排除 179、越界与无关 key，编号升序去重', () => {
    const keys = [
      'wild:179', 'wild:0', 'egg:152', 'unrelated:54',
      'form:pikachu:0', 'form:pikachu:4', 'form:unknown:1',
      'wild:54', 'egg:54', 'wild:54', 'gym:95', 'form:pikachu:2',
    ];
    const nos = M.ownedDexNos(keys, 'pikachu');
    assert.deepEqual(nos, [25, 54, 95]);
    assert.equal(M.dex151Progress(keys, 'pikachu').owned, new Set(nos).size);
  });

  test('大宝当前全量上限 22 只、15%', () => {
    const keys = fullKeys('pikachu');
    assert.equal(M.ownedDexNos(keys, 'pikachu').length, 22);
    assert.deepEqual(M.dex151Progress(keys, 'pikachu'), { owned: 22, total: 151, pct: 15 });
  });

  test('小宝当前全量上限 23 只、15%', () => {
    const keys = fullKeys('charmander');
    assert.equal(M.ownedDexNos(keys, 'charmander').length, 23);
    assert.deepEqual(M.dex151Progress(keys, 'charmander'), { owned: 23, total: 151, pct: 15 });
  });
});

/* 全面解锁（2026-10-28）：DEBUG_GATES_OPEN 改为 = isTestMode(env) 后，以下旧断言须在正式模式（无 TEST_MODE）下跑才仍成立；测试站放行行为改由 tests/test-mode-unlock.test.mjs 覆盖。 */
async function toProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(env.DB, env);
}

describe('151 图鉴接口', () => {
  beforeEach(() => { ({ env, raw } = makeEnv()); });
  afterEach(() => { raw.close(); });

  test('返回按编号排列的 151 项，锁定项不泄露名字（图片仅供剪影渲染）', async () => {
    await toProd();
    const cookie = await parentCookie();
    const j = await pokedex(1, cookie);
    assert.deepEqual(j.progress, { owned: 0, total: 151, pct: 0 });
    assert.deepEqual(j.dex151Owned, []);
    // 151 行的骨架（编号/名字/图片/属性）随静态骨架下发；是否获得只看动态 dex151Owned
    const skel = M.pokedexStaticSkeleton().data;
    assert.equal(skel.dex151.length, 151);
    assert.deepEqual(skel.dex151.map((e) => e.no), Array.from({ length: 151 }, (_, i) => i + 1));
    for (const e of skel.dex151) {
      assert.equal(e.name, M.speciesName(e.no));
      assert.equal(e.img, `/static/img/p${e.no}.${H}.webp`);
    }
    // 锁定项的卡片端拒绝（名字不泄露；合并后锁定行形如 {no, unlocked:false, name:null, img} 的精确断言见 pokedex-split.test.mjs）
    const r = await call('/api/pokedex/card', { method: 'POST', body: { childId: 1, key: 'dex151:1' }, cookie });
    assert.equal(r.status, 403);
    assert.equal(r.j.error, 'LOCKED');
    assert.equal(j.currentLine, 'pikachu');
  });

  test('已收录项使用真实名字，未知名字不编造', async () => {
    await toProd();
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    insertEntry(1, 'wild:54');
    insertEntry(1, 'form:pikachu:2');
    insertEntry(1, 'egg:150');
    const j = await pokedex(1, cookie);
    assert.deepEqual(j.progress, { owned: 3, total: 151, pct: 2 });
    // 卡片弹窗扩展（2026-10-25）：已收录项追加 type / moves / obtainedAt，
    // obtainedAt 取自复制行的 unlocked_at（与 wild:54 行一致）。
    const obtainedAt = raw.prepare(
      "SELECT unlocked_at FROM pokedex WHERE child_id=1 AND entry_key='wild:54'",
    ).get().unlocked_at;
    const skel = M.pokedexStaticSkeleton().data;
    const card = async (key) => {
      const r = await call('/api/pokedex/card', { method: 'POST', body: { childId: 1, key }, cookie });
      assert.equal(r.status, 200, key);
      return r.j.details;
    };
    // 151 行的骨架字段（名字/图片/属性）随静态骨架下发；详情（招式/特性/种族值/进化/克制/获得时间）走卡片端（Fable 优化 #2）
    assert.deepEqual(skel.dex151[53], {
      no: 54, name: '可达鸭', img: `/static/img/p54.${H}.webp`,
      type: '水', types: ['水'],
    });
    assert.deepEqual(await card('dex151:54'), {
      type: '水',
      types: ['水'],
      // 2026-11-05 招式系统升级：备战卡片展示物种完整招式表（带学会等级），取代旧 2 招固定招式。
      // 2026-11-07 备战独有招升级入口：招式对象追加 learned/skillLevel（已学会的带真实等级与威力，未学会的恒 1 级）。
      moves: [
        { level: 2, name: '水枪', desc: '喷出一道小水枪，浇得瞌睡虫直打喷嚏', type: '水', damage_class: '特殊', power: 37, learned: false, skillLevel: 1 },
        { level: 3, name: '精神强念', desc: '头一疼强念力冲出来，拦路的难题全被震飞', type: '超能力', damage_class: '特殊', power: 43, learned: false, skillLevel: 1 }, // 2026-11-17 设计定稿 8.md 热修：抓→精神强念（破 S5 飘浮毒系）
        { level: 4, name: '水流尾', desc: '甩起水花四溅的尾巴，作业本开心地笑起来', type: '水', damage_class: '物理', power: 49, learned: false, skillLevel: 1 },
        { level: 5, name: '念力', desc: '头一疼念力就冒出来，铅笔自己飘了起来', type: '超能力', damage_class: '特殊', power: 55, learned: false, skillLevel: 1 },
        { level: 6, name: '水之波动', desc: '掀起一圈圈水波纹，把分心推得远远的', type: '水', damage_class: '特殊', power: 61, learned: false, skillLevel: 1 },
        { level: 7, name: '摇尾巴', desc: '尾巴摇得像小扇子，难题看得直发晕', type: '普通', damage_class: '变化', power: 67, learned: false, skillLevel: 1 },
        { level: 8, name: '冲浪', desc: '踩着浪花冲过去，作业写得比浪还快', type: '水', damage_class: '特殊', power: 73, learned: false, skillLevel: 1 },
        { level: 9, name: '水炮', desc: '轰出一发大水炮，错题被冲得干干净净', type: '水', damage_class: '特殊', power: 79, learned: false, skillLevel: 1 },
        { level: 10, name: '求雨', desc: '下一场凉凉的及时雨，瞌睡虫全被浇醒了', type: '水', damage_class: '变化', power: 85, learned: false, skillLevel: 1 },
        { level: 11, name: '快速折返', desc: '踩着水花冲过去打一下，转身又冲回作业本前', type: '水', damage_class: '物理', power: 91, learned: false, skillLevel: 1 },
      ],
      abilities: [
        { name: '湿气', hidden: false, effect: '在场时，自爆、大爆炸和引爆无法生效。' },
        { name: '无关天气', hidden: false, effect: '消除所有天气带来的效果，但天气本身不会消失。' },
        { name: '悠游自如', hidden: true, effect: '下雨时速度变为2倍。' },
      ],
      stats: { hp: 50, attack: 52, defense: 48, sp_attack: 65, sp_defense: 50, speed: 55, total: 320 },
      actualStats: { hp: 14, attack: 7, defense: 6, sp_attack: 7, sp_defense: 7, speed: 7 },
      actualLevel: 1,
      scaledLevel: 2, // App Lv.1 × 2.25 → 有效 2；statsFor(54, 2) 实测值
      evo: {
        chain: [
          { no: 54, name: '可达鸭', cond: null },
          { no: 55, name: '哥达鸭', cond: '33级以上' },
        ],
        branches: null,
      },
      matchups: { strong: ['火', '地面', '岩石'], weak: ['电', '草'], resist: ['火', '水', '冰', '钢'], immune: [] }, // 2026-11-17 方案 A：水系 resist 补冰/钢，顺序按 TYPES18
      obtainedAt,
    });
    assert.deepEqual(skel.dex151[24], {
      no: 25, name: '皮卡丘', img: `/static/img/p25.${H}.webp`,
      type: '电', types: ['电'],
    });
    assert.deepEqual(await card('dex151:25'), {
      type: '电', level: 1, moves: [], obtainedAt,
      types: ['电'],
      abilities: [
        { name: '静电', hidden: false, effect: '受到接触类招式攻击时，有30%几率让对方麻痹。' },
        { name: '避雷针', hidden: true, effect: '把单体电属性招式引到自己身上，吸收后特攻提升1级。' },
      ],
      stats: { hp: 35, attack: 55, defense: 40, sp_attack: 50, sp_defense: 50, speed: 90, total: 320 },
      evo: {
        chain: [
          { no: 172, name: '皮丘', cond: null },
          { no: 25, name: '皮卡丘', cond: '10级以上' },
          { no: 26, name: '雷丘', cond: '16级＋雷之石' },
        ],
        branches: null,
      },
      matchups: { strong: ['水', '飞行'], weak: ['地面'], resist: ['电', '飞行', '钢'], immune: [] }, // 2026-11-17 方案 A：电系 resist 补钢
      friendship: 0, // 任务 93：主宠线 detail 带友好度（本例无 pet_instances 行，默认 0）
    });
    // 2026-11-14 全量 151 批：150 已进名册（SPECIES＋COLLECTION_LEARNSET＋DEX_DETAILS 均有条目），
    // 图鉴详情完整展示真实名字与招式表，不再是"未知名字"。
    assert.deepEqual(skel.dex151[149], {
      no: 150, name: '超梦', img: `/static/img/p150.${H}.webp`,
      type: '超能力', types: ['超能力'],
    });
    assert.deepEqual(await card('dex151:150'), {
      type: '超能力', // 2026-11-17 方案 A：SPECIES[150] 改回官方主属性超能力（此前为普通）
      types: ['超能力'],
      moves: [
        { level: 2, name: '太晶爆发', desc: '化作一道晶光冲出去，拦路的难题全被撞开', type: '普通', damage_class: '特殊', power: 37, learned: false, skillLevel: 1 },
        { level: 3, name: '求雨', desc: '抬起头喊来一片雨云，瞌睡虫乖乖缩成一团', type: '水', damage_class: '变化', power: 43, learned: false, skillLevel: 1 },
        { level: 4, name: '气象球', desc: '扔出一颗天气球，难题被砸得晕头转向', type: '普通', damage_class: '特殊', power: 49, learned: false, skillLevel: 1 },
        { level: 5, name: '高速星星', desc: '紫色星星纷纷落下，藏起来的错题全现形', type: '普通', damage_class: '特殊', power: 55, learned: false, skillLevel: 1 },
        { level: 7, name: '泰山压顶', desc: '像大山一样压下来，生字排着队坐端正', type: '普通', damage_class: '物理', power: 67, learned: false, skillLevel: 1 },
        { level: 8, name: '硬撑', desc: '鼓起劲一口气撑住，拖延被顶得远远的', type: '普通', damage_class: '物理', power: 73, learned: false, skillLevel: 1 },
        { level: 9, name: '舍身冲撞', desc: '不顾一切地撞上去，错字吓得躲进橡皮里', type: '普通', damage_class: '物理', power: 79, learned: false, skillLevel: 1 },
        { level: 10, name: '预知未来', desc: '闭上眼睛预见未来，错题还没写就输了', type: '超能力', damage_class: '特殊', power: 85, learned: false, skillLevel: 1 },
        { level: 11, name: '精神强念', desc: '意念轰然爆发，整页作业在精神力下臣服', type: '超能力', damage_class: '特殊', power: 91, learned: false, skillLevel: 1 },
      ],
      abilities: [
        { name: '压迫感', hidden: false, effect: '对手针对自己的招式，PP消耗增加1点。' },
        { name: '紧张感', hidden: true, effect: '对手无法吃下携带的树果。' },
      ],
      stats: { hp: 106, attack: 110, defense: 90, sp_attack: 154, sp_defense: 90, speed: 130, total: 680 },
      actualStats: { hp: 16, attack: 9, defense: 8, sp_attack: 11, sp_defense: 8, speed: 10 },
      actualLevel: 1,
      scaledLevel: 2,
      evo: {
        chain: [
          { no: 150, name: '超梦', cond: null },
        ],
        branches: null,
      },
      matchups: { strong: ['格斗', '毒'], weak: ['虫', '幽灵', '恶'], resist: ['格斗', '超能力'], immune: [] }, // 2026-11-17 方案 A：超能力现返回真实克制（此前 9 种集内无超能力，四字段全空）
      obtainedAt,
    });
  });

  test('两孩进度隔离，读取接口不改变非 form 获得行', async () => {
    await toProd();
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    insertEntry(1, 'wild:54');
    const count = () => raw.prepare(
      "SELECT COUNT(*) n FROM pokedex WHERE entry_key NOT LIKE 'form:%'",
    ).get().n;
    // 原有 unlockForms 可按等级补写 form 行，因此回归只断言非 form 行数不变。
    const before = count();
    const first = await pokedex(1, cookie);
    const second = await pokedex(2, cookie);
    assert.equal(first.progress.owned, 1);
    assert.deepEqual(second.progress, { owned: 0, total: 151, pct: 0 });
    assert.equal(second.dex151Owned.includes(54), false);
    const r = await call('/api/pokedex/card', { method: 'POST', body: { childId: 2, key: 'dex151:54' }, cookie });
    assert.equal(r.status, 403);
    assert.equal(r.j.error, 'LOCKED');
    assert.equal(count(), before);
  });

  test('门关闭形态：dex151 未收集项返回剪影用图、名字仍 null（Option A）', async () => {
    await toProd();
    const cookie = await parentCookie();
    const j = await pokedex(1, cookie);
    const skel = M.pokedexStaticSkeleton().data;
    for (const no of [1, 42, 151]) {
      assert.equal(j.dex151Owned.includes(no), false);
      // 骨架带真实名字与图片；合并后锁定行名字置 null（精确断言见 pokedex-split.test.mjs），卡片端拒绝
      assert.equal(skel.dex151[no - 1].name, M.speciesName(no));
      assert.equal(skel.dex151[no - 1].img, `/static/img/p${no}.${H}.webp`);
      const r = await call('/api/pokedex/card', { method: 'POST', body: { childId: 1, key: 'dex151:' + no }, cookie });
      assert.equal(r.status, 403, `dex151:${no} 应 LOCKED`);
    }
  });
});
