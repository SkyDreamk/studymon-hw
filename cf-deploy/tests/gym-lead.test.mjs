// tests/gym-lead.test.mjs
// 任务 126 道馆先发宠物 leadNo（2026-11-15）：leadNo 指定先发；
// 不传 leadNo 时主宠先发、行为与旧版一致；leadNo 须是随身宠物（主宠或携带列表），否则 LEAD_NOT_CARRIED。
// 道馆平衡（任务 3，2026-11-17 纠正）：不限制队伍人数——原版可带多只精灵，
// 孩子带全部随身宠物（主宠＋携带，最多 5 只）上场；平衡改从招式/克制/等级下手
// （馆主 bossTeam 提威力＋补覆盖招、馆主等级跟随 BOSS_FOLLOW=0.85；2026-11-17 8 关扩围：bossMoves 并入 bossTeam）。
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
  '0021_skill_levels.sql', '0022_warehouse.sql', '0043_pet_instances_ability.sql',
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
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '1111'), c2: await childCookie(2, '2222') };
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
  test('0. 前端接线：开局传 leadNo；卡片已撤“让它先发”/“带它备战”（任务 127）；换宠每个替补各一个按钮', () => {
    const src = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
    // 清仓库表 #127 尾巴：G.benchGym / G.leadGym 死状态（恒 null、无人赋值）已清；开局只带 childId＋stage（先发在战斗里扔球选，走 bsOnChooseLead 的 leadNo）。
    assert.ok(src.includes("api('/api/battle/gym/start', { childId: G.id, stage })"), 'gymStartDirect 只传 childId＋stage');
    assert.ok(src.includes("api('/api/battle/gym/start', { childId: B.childId, stage: B.stage, leadNo })"), 'bsOnChooseLead 应透传 leadNo');
    assert.ok(!src.includes('benchGym'), 'G.benchGym 死状态应已清');
    assert.ok(!src.includes('leadGym'), 'G.leadGym 死状态应已清');
    assert.ok(src.includes('benchPvp: keepBenchPvp'), 'benchPvp 是活的（PvP 用），不得误删');
    // 任务 127：卡片只看详情，不选先发/备战（先发与换宠都在战斗里扔球选）——两按钮与入口函数已撤。
    // 注：“只带主宠”仍在 PvP 文案里，故只断言卡片专属串消失，不全局断言它。
    assert.ok(!src.includes('pickGymLeadFromCard'), '卡片选先发入口应已移除');
    assert.ok(!src.includes('让它先发'), '卡片“让它先发”按钮应已移除');
    assert.ok(!src.includes('pickGymBenchFromCard'), '卡片选备战入口应已移除');
    assert.ok(!src.includes('带它备战'), '卡片“带它备战”按钮应已移除');
    assert.ok(!src.includes('_dexCardGym'), '卡片道馆上下文应已移除');
    assert.ok(!src.includes("tr('先发：', 'Lead: ')"), '道馆页先发行应已移除（任务 127）');
    assert.ok(src.includes('const benchIdxs = turnSide.pets.map'), '换宠按钮应按每个替补生成');
    assert.ok(!src.includes('const benchIdx = turnSide.pets.findIndex'), '单替补按钮写法应已换掉');
  });

  test('1. leadNo=37（携带六尾）→ 六尾先发，全队 3 只 [六尾，主宠，地鼠]', async () => {
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

  test('2. 不传 leadNo → 主宠先发，全队 3 只 [主宠，六尾，地鼠]（向后兼容）', async () => {
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

  test('3. leadNo=50 + benchNo=37 → 先发 50，全队 3 只 [地鼠，主宠，六尾]', async () => {
    const { c1 } = await setup();
    setXp(1, 1500);
    seedCarried();
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, leadNo: 50, benchNo: 37 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const b = r.j.battle;
    assert.equal(b.sides.A.pets[0].no, 50, '先发应为地鼠');
    assert.equal(b.sides.A.pets.length, 3);
    assert.equal(mainNoOf(b), 172);
  });

  test('4. benchNo=143 非携带调试路径保留：pets[1] 仍为 143，全队 4 只', async () => {
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

  test('6. 主宠也可指定为先发 leadNo=172 → 仍在队首，全队 3 只 [主宠，六尾，地鼠]', async () => {
    const { c1 } = await setup();
    setXp(1, 1500);
    seedCarried();
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, leadNo: 172 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.battle.sides.A.pets[0].no, 172);
    assert.equal(r.j.battle.sides.A.pets[0].key, 'main');
    assert.equal(r.j.battle.sides.A.pets.length, 3);
    assert.deepEqual([...teamNos(r.j.battle)].sort((x, y) => x - y), [37, 50, 172].sort((x, y) => x - y));
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

describe('道馆平衡：馆主等级跟随（任务 3 追加）', () => {
  test('8. effBossBattleLevel：门槛等级附近用配置等级，超等级时上浮到孩子有效等级的 85%', () => {
    const s1 = M.GYM_STAGES[0]; // S1 配置馆主有效等级 13
    assert.equal(M.BOSS_FOLLOW, 0.85);
    // Lv.5（S1 门槛）：孩子有效等级 11，11×0.85=9 < 13，用配置 13。
    assert.equal(M.effBossBattleLevel(s1, M.effPlayerLevel(5)), 13);
    // Lv.20：孩子有效等级 45，45×0.85=38 > 13，上浮到 38。
    assert.equal(M.effBossBattleLevel(s1, M.effPlayerLevel(20)), 38);
    // Lv.30：孩子有效等级 67，67×0.85=56，上浮到 56。
    assert.equal(M.effBossBattleLevel(s1, M.effPlayerLevel(30)), 56);
  });

  test('9. 超等级孩子开局：Lv.20 打 S1，馆主战斗等级应为 38（不是配置 13）', async () => {
    const { c1 } = await setup();
    setXp(1, M.xpForLevel(20));
    seedCarried();
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, leadNo: 37 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const b = r.j.battle;
    assert.equal(b.sides.B.battleLevel, 38, '馆主战斗等级应跟随到 38');
    // 宠的显示等级恒为 App 等级（appLevel=6），战斗体力才反映跟随后的有效等级：
    // 王牌大岩蛇 38 级基础 HP 74 × hpMult 1.0 = 74（2026-11-17 8 关扩围：馆主方多只，取队尾王牌；2026-11-17 设计定稿 8.md 热修 hpMult 3.0→1.0）。
    assert.equal(b.sides.B.pets.length, 2, 'S1 馆主队伍应为 2 只（小拳石＋大岩蛇）');
    assert.equal(b.sides.B.pets[b.sides.B.pets.length - 1].maxHp, 74, '馆主体力应按跟随后的等级算');
    // 队伍人数不限（原版全随身队）：主宠＋2 只携带 = 3 只。
    assert.equal(b.sides.A.pets.length, 3, '全队应为主宠＋2 只携带');
  });

  test('10. 门槛等级孩子开局：Lv.5 打 S1，馆主战斗等级仍为配置 13（定参口径不动）', async () => {
    const { c1 } = await setup();
    setXp(1, M.xpForLevel(5));
    seedCarried();
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const b = r.j.battle;
    assert.equal(b.sides.B.battleLevel, 13, '门槛等级附近馆主仍用配置等级');
    // 王牌大岩蛇 13 级基础 HP 32 × hpMult 1.0 = 32（2026-11-17 8 关扩围：馆主方多只，取队尾王牌；2026-11-17 设计定稿 8.md 热修 hpMult 3.0→1.0）。
    assert.equal(b.sides.B.pets[b.sides.B.pets.length - 1].maxHp, 32, '馆主体力应按配置等级算');
  });

  test('11. 馆主招式：全部为官方招式名＋官方威力，门槛有效等级可升级学会（2026-11-17 数据集校对；2026-11-17 8 关扩围：多只队伍，断言王牌=队尾的招式＋队伍成员）', () => {
    // 数据集 ~/workspace/pokemon-dataset-zh：learnable_moves；覆盖招凡升级学不到的一律去掉（见 gym-stages.js 头注）
    const ace = (s) => { const g = M.GYM_STAGES[s]; return g.bossTeam[g.bossTeam.length - 1].moves; };
    const team = (s) => M.GYM_STAGES[s].bossTeam.map((m) => m.no);
    assert.deepEqual(ace(0), [['落石', '岩石', 50], ['击落', '岩石', 50], ['撞击', '普通', 40]], 'S1 王牌大岩蛇官方招式（地面覆盖 28 级才学流沙深渊，已去掉）');
    assert.deepEqual(team(0), [74, 95], 'S1 队伍：小拳石＋大岩蛇');
    assert.deepEqual(ace(1), [['水枪', '水', 40], ['高速星星', '普通', 60], ['高速旋转', '普通', 50]], 'S2 王牌宝石海星官方招式（大地之力升级不学，已去掉；幻象光线超能力 STAB 致大宝 S2 7.95% 硬墙，改用高速旋转）');
    assert.deepEqual(team(1), [120, 121], 'S2 队伍：海星星＋宝石海星');
    assert.deepEqual(ace(2), [['十万伏特', '电', 90], ['电光', '电', 65], ['铁尾', '钢', 100]], 'S3 王牌雷丘官方招式（有效 22 级：电击波 16 级可学；地面覆盖升级从不学，已去掉）');
    assert.deepEqual(team(2), [100, 25, 26], 'S3 队伍：霹雳电球＋皮卡丘＋雷丘（旧电击兽退役）');
    assert.deepEqual(ace(3), [['终极吸取', '草', 75], ['超级吸取', '草', 40], ['溶解液', '毒', 40]], 'S4 王牌霸王花官方招式（水覆盖升级从不学，已去掉）');
    assert.deepEqual(team(3), [71, 114, 45], 'S4 队伍：大食花＋蔓藤怪＋霸王花');
    assert.deepEqual(ace(4), [['污泥炸弹', '毒', 90], ['热风', '火', 95], ['恶意追击', '恶', 60]], 'S5 王牌双弹瓦斯官方招式（新毒系道馆）');
    assert.deepEqual(team(4), [109, 89, 110], 'S5 队伍：瓦斯弹＋臭臭泥＋双弹瓦斯');
    assert.deepEqual(ace(5), [['精神强念', '超能力', 90], ['精神冲击', '超能力', 80], ['幻象光线', '超能力', 65]], 'S6 王牌胡地官方招式（新超能道馆）');
    assert.deepEqual(team(5), [64, 122, 49, 65], 'S6 队伍：勇基拉＋魔墙人偶＋末入蛾＋胡地');
    assert.deepEqual(ace(6), [['火焰牙', '火', 65], ['喷射火焰', '火', 90], ['咬住', '恶', 60]], 'S7 王牌风速狗官方招式（旧 S5 顺延；闪焰冲锋官方 120 过强，改用火焰牙/火焰轮；报仇 70 致小宝 S5 14.8% 硬墙，改用更弱的咬住 60；2026-11-17 道馆重调：火焰轮→喷射火焰 90，特殊火打大钢蛇特防，lv5 ≤ 有效 53）');
    assert.deepEqual(team(6), [58, 77, 78, 59], 'S7 队伍：卡蒂狗＋小火马＋烈焰马＋风速狗');
    assert.deepEqual(ace(7), [['直冲钻', '地面', 80], ['击落', '岩石', 50], ['踩踏', '普通', 65]], 'S8 王牌钻角犀兽官方招式（旧 S6 顺延；有效 49 级：直冲钻 35 级、踩踏 25 级均可学；地震 47 级在有效 49 级已可学，但 100 威力过强，仍用直冲钻 80；岩崩升级不学，已去掉）');
    assert.deepEqual(team(7), [111, 51, 31, 34, 112], 'S8 队伍：独角犀牛＋三地鼠＋尼多后＋尼多王＋钻角犀兽');
  });
});

// 换宠是否耗一回合（结论，第一期保持现有规则不变）：是。
// resolveGymRound：换宠先行，新宠承受本回合全部攻击，换宠方本回合不出招
// （gymStrike 对非 move 动作返回 dmg 0；馆主同回合照常出招，见 §300）。
// 故中途换宠仍占一整回合，只换“谁在场上挨打”，不白嫖一次出招。
