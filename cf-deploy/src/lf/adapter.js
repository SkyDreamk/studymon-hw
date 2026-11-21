/* 学习功能包 v2.1（口语复述／复习牌组／家长语音回放／护盾日／周报／养成／仓库）的站子适配器。
 * 包的业务逻辑在 ./logic、./worker（原样拷入，不改）；这里只把站子现有函数接成包要的参数。
 * 站子函数一律由 index.js 经 deps 传入（不复制站子逻辑）：getSession / requirePin / hasRole / takeItem / addItem /
 * grantCareWheelChance / gradeNumFromLabel / levelFromXp / getSetting / shDateStr。
 * 决定见 work/lf-integration/plan.md D1–D13。 */
import { createLearningRoutes } from './worker/index.ts';
import { GYMS } from './logic/index.ts';

// D4：站子 6 关（src/data/gym-stages.js），包默认 8 关（多 poison/psychic）。
const SITE_GYM_TYPES = ['rock', 'water', 'electric', 'grass', 'fire', 'ground'];
// 养成转盘机会来源。plan.md §7 写的是 'lf-care'，但 care_wheel_chances.source 有 CHECK（仅 daily-english/daily-chinese/daily-math，
// 迁移 0028/0030），放开须重建该现有表，任务单禁止。暂借 'daily-english'，靠 ref_id 前缀 'lf-care-' 区分、UNIQUE 照常防重；
// 待用户决定是否出 0046 重建表（加 'lf-care'）后，只改这一个常量。
const WHEEL_CHANCE_SOURCE = 'daily-english';
const COMPANION_TYPE = { pikachu: 'electric', charmander: 'fire', squirtle: 'water', bulbasaur: 'grass', eevee: 'normal' };

// D1：站子背包键 care:apple ↔ 包的 care-apple（包要求 ^[a-z0-9_-]{1,32}$，不含冒号）。
export const lfItemToSite = (id) => String(id).replace(/^care-/, 'care:');
export const siteItemToLf = (key) => String(key).replace(/^care:/, 'care-');

export function createLfAdapter(deps) {
  const { requirePin, hasRole, takeItem, addItem, grantCareWheelChance, gradeNumFromLabel, levelFromXp, getSetting, shDateStr } = deps;
  const sessions = new WeakMap(); // 本次请求已解析（含家长凭证抬升）的会话，按 Request 对象取

  async function childInfo(db, row) {
    const xp = Number(row.total_xp) || 0;
    const lang = (await getSetting(db, 'english_mode')) === '1' ? 'en' : 'zh';
    return {
      id: String(row.id), name: row.name, grade: gradeNumFromLabel(row.grade_label) ?? undefined, lang,
      companion: row.line, companion_type: COMPANION_TYPE[row.line],
      xp, level_base: levelFromXp(xp) - Math.floor(xp / 1000), // D5：包线性等级对齐站子二次方等级
    };
  }

  const children = {
    async list(familyId, env) {
      const { results } = await env.DB.prepare('SELECT id, name, grade_label, line, total_xp FROM children WHERE family_id=? ORDER BY id').bind(Number(familyId)).all();
      return Promise.all((results || []).map((r) => childInfo(env.DB, r)));
    },
    async get(familyId, childId, env) {
      const id = Number(childId);
      if (!Number.isInteger(id)) return null;
      const r = await env.DB.prepare('SELECT id, name, grade_label, line, total_xp FROM children WHERE id=? AND family_id=?').bind(id, Number(familyId)).first();
      return r ? childInfo(env.DB, r) : null;
    },
  };

  const hooks = {
    // D7：包只写自己的 lf_xp_log；站子等级/经验读 children.total_xp，须镜像。
    async onApproved({ familyId, child, xp, env }) {
      if (!(xp > 0)) return;
      await env.DB.prepare('UPDATE children SET total_xp = total_xp + ? WHERE id=? AND family_id=?').bind(xp, Number(child.id), Number(familyId)).run();
    },
    // 站子现有养成转盘机会（INSERT OR IGNORE，UNIQUE(child_id, source, ref_id) 防重）。
    async grantWheelChance({ child, idempotencyKey, env }) {
      return grantCareWheelChance(env.DB, Number(child.id), WHEEL_CHANCE_SOURCE, idempotencyKey, shDateStr(), Math.floor(Date.now() / 1000));
    },
  };

  // D1：养成道具桥接站子 item_inventory（takeItem 条件扣减、addItem 补发；都写站子流水）。
  const careInventory = {
    async list(_familyId, childId, env) {
      const { results } = await env.DB.prepare("SELECT item_key, qty FROM item_inventory WHERE child_id=? AND item_key LIKE 'care:%' AND qty>0 ORDER BY item_key").bind(Number(childId)).all();
      return (results || []).map((r) => ({ item_id: siteItemToLf(r.item_key), qty: r.qty }));
    },
    consume: (_f, childId, itemId, env) => takeItem(env.DB, Number(childId), lfItemToSite(itemId), 1, 'lf-care', 'lf_care', null, shDateStr()),
    async refund(_f, childId, itemId, env) {
      await addItem(env.DB, Number(childId), lfItemToSite(itemId), 1, 'lf-care-refund', 'lf_care', null, shDateStr());
    },
  };

  // D10：站子旧打卡日（checkins.date 为上海 YYYY-MM-DD）。
  async function legacyCheckinDays(_familyId, childId, sinceDay, env) {
    const { results } = await env.DB.prepare("SELECT DISTINCT date FROM checkins WHERE child_id=? AND date>=? AND status='approved'").bind(Number(childId), sinceDay).all();
    return (results || []).map((r) => r.date);
  }

  // 首次打开养成/仓库时一次性导入（包按 source 'legacy' + id 幂等）。当前主宠（line_key = children.line）排最前，成为 lf 主宠。
  async function existingPets(_familyId, childId, env) {
    const { results } = await env.DB.prepare(
      `SELECT p.id, p.species_no, p.friendship FROM pet_instances p JOIN children c ON c.id=p.child_id
       WHERE p.child_id=? ORDER BY (p.line_key = c.line) DESC, p.has_been_main DESC, p.id`
    ).bind(Number(childId)).all();
    return (results || []).map((r) => ({ id: String(r.id), species: String(r.species_no), friendship: Number(r.friendship) || 0 }));
  }

  const learning = createLearningRoutes({
    // 会话：站子 getSession（cookie famsess）＋家长凭证抬升；家长区＝站子 PIN 新鲜度口径（requirePin 放行）且角色含 parent。
    async getSession(req) {
      const s = sessions.get(req);
      if (!s) return null;
      return { familyId: String(s.familyId || 1), parentUnlocked: !requirePin(s) && hasRole(s, 'parent') };
    },
    children,
    bucket: (env) => env.PHOTOS, // D11：站子唯一桶
    hooks,
    careInventory,
    existingPets,
    legacyCheckinDays,
    gyms: GYMS.filter((g) => SITE_GYM_TYPES.includes(g.type)),
  });

  return {
    learning,
    prefix: learning.prefix,
    /** index.js 在会话解析后调用；非 /api/lf 路径返回 null。 */
    async handle(req, env, ctx, session) {
      const url = new URL(req.url);
      if (url.pathname !== learning.prefix && !url.pathname.startsWith(learning.prefix + '/')) return null;
      // 孩子会话只能访问本人（站子 scopeChildId 同口径）：包本身不认孩子身份，这里在入口拦。
      const m = url.pathname.match(/^\/api\/lf\/children\/([^/]+)/);
      if (m && session && session.kind === 'child' && Number(m[1]) !== Number(session.child_id)) {
        return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
      }
      sessions.set(req, session);
      return learning.handle(req, env, ctx);
    },
  };
}
