/* 共享辅助：被 2 个及以上路由模块（或模块与 src/index.js 剩余部分）共用的函数/常量。
 * 由 src/index.js 机械搬出（原样搬、不改逻辑）。模块一律从这里导入，绝不反向导入 src/index.js。 */
import { SPECIES } from '../data/species.js';
import { MOVES_OFFICIAL } from '../data/moves-official.js';
import { COLLECTION_LEARNSET } from '../data/collection-learnset.js';
import { GYM_STAGES } from '../data/gym-stages.js';


const TZ = 'Asia/Shanghai';

/* ---------------- 立绘与玩法数据（以 SPEC.md 为准） ---------------- */

const LINES = {
  pikachu: {
    key: 'pikachu', label: '皮卡丘线', color: '#F7C531',
    forms: [{ no: 172, name: '皮丘' }, { no: 25, name: '皮卡丘' }, { no: 26, name: '雷丘' }],
    moves: [
      [2, '电光一闪', '快得像一阵风，作业本都来不及合上'],
      [3, '撒娇', '眨眨大眼睛，瞌睡虫都心软了'],
      [4, '电击', '小电流噼啪响，把走神的小怪兽电醒'],
      [5, '蹭蹭脸颊', '用脸颊蹭一蹭，充满电再出发'],
      [6, '影子分身', '变出好几个影子，一起把作业包围'],
      [7, '铁尾', '尾巴变得硬邦邦，扫开挡路的难题'],
      [8, '十万伏特', '十万伏特大爆发，难题全被照亮'],
      [9, '电球', '搓出一颗电光球，越滚越有劲'],
      [10, '伏特攻击', '全身带电冲刺，今日份的努力全开'],
      [11, '打雷', '召唤一道闪电，给坚持的自己鼓掌'],
    ],
  },
  charmander: {
    key: 'charmander', label: '小火龙线', color: '#FF8C42',
    forms: [{ no: 4, name: '小火龙' }, { no: 5, name: '火恐龙' }, { no: 6, name: '喷火龙' }],
    moves: [
      [2, '抓', '小爪子挠一挠，瞌睡虫全跑光'],
      [3, '叫声', '奶声奶气吼一声，难题吓退三步'],
      [4, '火花', '喷出小火星，点燃学习的热情'],
      [5, '烟幕', '吐出一团烟雾，悄悄把分心藏起来'],
      [6, '火焰牙', '牙齿冒着火光，难题一口咬碎'],
      [7, '劈开', '爪子用力一劈，拦路虎快让开'],
      [8, '喷射火焰', '张大嘴喷出火焰，把昨天的拖延烧光'],
      [9, '龙爪', '长出龙的爪子，难题再大也不怕'],
      [10, '闪焰冲锋', '裹着火焰冲刺，谁也追不上认真的你'],
      [11, '大字爆炎', '喷出大字形的火焰，为今天画上完美句号'],
    ],
  },
  squirtle: {
    key: 'squirtle', label: '杰尼龟线', color: '#5DA9E9',
    forms: [{ no: 7, name: '杰尼龟' }, { no: 8, name: '卡咪龟' }, { no: 9, name: '水箭龟' }],
    moves: [
      [2, '撞击', '用圆脑袋一顶，瞌睡虫飞出去'],
      [3, '摇尾巴', '摇摇小尾巴，难题放松警惕'],
      [4, '水枪', '喷出一道水枪，浇灭想玩的心'],
      [5, '缩入壳中', '缩进壳里想一想，好办法自己冒出来'],
      [6, '泡沫', '吐出一串泡泡，把分心包起来'],
      [7, '水之波动', '掀起水的波纹，一圈圈赶走拖延'],
      [8, '高速旋转', '转成小陀螺，难题转着转着就解开了'],
      [9, '水炮', '轰出强力水炮，今日目标全部达成'],
      [10, '求雨', '下一场及时雨，干枯的干劲又发芽'],
      [11, '加农水炮', '终极水炮发射，为坚持的自己喝彩'],
    ],
  },
  bulbasaur: {
    key: 'bulbasaur', label: '妙蛙种子线', color: '#7BC96F',
    forms: [{ no: 1, name: '妙蛙种子' }, { no: 2, name: '妙蛙草' }, { no: 3, name: '妙蛙花' }],
    moves: [
      [2, '撞击', '用小身子一撞，瞌睡虫全撞飞'],
      [3, '叫声', '嫩嫩地叫一声，难题抖三抖'],
      [4, '藤鞭', '伸出绿藤蔓，把作业本卷过来'],
      [5, '生长', '晒晒太阳长大一点，难题变小一点'],
      [6, '寄生种子', '种下小种子，坚持每天都会发芽'],
      [7, '飞叶快刀', '叶子像飞刀一样，唰唰切开难题'],
      [8, '魔法叶', '洒出魔法叶子，每片都写着加油'],
      [9, '日光束', '聚集阳光发射光束，照亮所有难题'],
      [10, '飞叶风暴', '卷起叶子风暴，拖延无处可躲'],
      [11, '疯狂植物', '召唤植物总进攻，为今天画上完美句号'],
    ],
  },
  // v11 伊布线：单形态（无 Lv10 中段）；8 种分支不在 forms 数组里，见 EEVEE_BRANCHES（pet_instances.branch）。
  // 分支形态、招式、分支界面须齐备才可获得，未齐备前只展示、不画成可选。
  eevee: {
    key: 'eevee', label: '伊布线', color: '#C89B6A',
    forms: [{ no: 133, name: '伊布' }],
    moves: [
      [2, '摇尾巴', '摇摇毛茸茸的大尾巴，难题放松警惕'],
      [3, '叫声', '软软地叫一声，瞌睡虫都跑光了'],
      [4, '撞击', '用毛茸茸的小身子一撞，瞌睡虫全撞飞'],
      [5, '影子球', '搓出一颗影子球，越滚越有劲'],
      [6, '高速星星', '洒出一片小星星，照亮每一道难题'],
      [7, '铁尾', '尾巴变得硬邦邦，扫开挡路的难题'],
      [8, '咬住', '轻轻一口咬住分心，绝不松口'],
      [9, '珍藏', '把今天的努力好好珍藏起来'],
      [10, '最后手段', '拿出压箱底的本事，难题再大也不怕'],
      [11, '巨声', '发出响亮的声音，为坚持的自己喝彩'],
    ],
  },
};

/* 精灵蛋按物种区分（2026-10-27 §52，用户定：不要所有蛋都一个样）：
 * 方法取自用户发的异色精灵蛋收集表——每只蛋的底色取自精灵主色，花纹取自精灵自身特性
 * （斑点／火焰／水滴／闪电／环纹／卷纹／条纹／肚皮／甲壳／波纹／气泡），不照搬表里具体配色。
 * 花纹只用 CSS 画（.eggshape + .pat-*，见 style.css），不新增图片、不拼 emoji。
 * eggDesignFor(no)：未知物种按官方双属性兜底（双属性种优先非普通属性花纹），无物种按神秘蛋兜底——永不回到通用 🥚。 */
const EGG_DESIGNS = {
  1:   { bg: '#CDEDC9', pat: 'spots',   c1: '#2F7D3A', c2: '#7BC96F' }, // 妙蛙种子：青绿底＋背上深绿斑点
  4:   { bg: '#FFE3C2', pat: 'flame',   c1: '#FF9F43', c2: '#FFD93B' }, // 小火龙：橙底＋尾巴火焰
  7:   { bg: '#CFE8FF', pat: 'drops',   c1: '#5DA9E9', c2: '#FFFFFF' }, // 杰尼龟：浅蓝底＋水滴＋白浪
  25:  { bg: '#FFE45C', pat: 'bolt',    c1: '#8A6D3B', c2: '#E5484D' }, // 皮卡丘：黄底＋闪电尾＋红脸颊点
  37:  { bg: '#FFC98A', pat: 'curl',    c1: '#FFF6E0', c2: '#E8710A' }, // 六尾：暖橙底＋白尾巴卷纹
  58:  { bg: '#FFB066', pat: 'stripes', c1: '#4A3226', c2: '#7A4A21' }, // 卡蒂狗：橙底＋黑褐虎纹
  126: { bg: '#FF6B35', pat: 'flame',   c1: '#FFD93B', c2: '#E5484D' }, // 鸭嘴火兽：红橙底＋火焰纹
  131: { bg: '#A8D0F0', pat: 'shell',   c1: '#7A9BB5', c2: '#FFFFFF' }, // 拉普拉斯：蓝底＋甲壳凸点＋白浪
  133: { bg: '#E8C89A', pat: 'ring',    c1: '#FFF6E0', c2: '#B08D5F' }, // 伊布：棕底＋蓬松围脖环纹
  143: { bg: '#5A6B5D', pat: 'belly',   c1: '#F5E8C8', c2: '#3E4A40' }, // 卡比兽：深绿底＋奶油大肚皮
  147: { bg: '#CDE6F7', pat: 'waves',   c1: '#FFFFFF', c2: '#8FC3E8' }, // 迷你龙：淡蓝底＋蛇形白波纹
  151: { bg: '#FFC2D9', pat: 'bubbles', c1: '#FFF0F5', c2: '#F27BA7' }, // 梦幻：粉底＋淡粉气泡
  172: { bg: '#FFF3A0', pat: 'band',    c1: '#3D2C1E', c2: '#F27BA7' }, // 皮丘：淡黄底＋黑耳尖带＋粉脸颊点（皮卡丘线一阶）
  208: { bg: '#C9CDD3', pat: 'band',    c1: '#8A7D6B', c2: '#F5F5F5' }, // 大钢蛇：钢灰底＋钢环节纹
  94:  { bg: '#7E57C2', pat: 'spots',   c1: '#3A2A5C', c2: '#E5484D' }, // 耿鬼：深紫底＋暗影斑点＋红眼（2026-11-17 奖励蛋修正 S5 毒系道馆蛋）
  122: { bg: '#F3E8FF', pat: 'ring',    c1: '#F27BA7', c2: '#5DA9E9' }, // 魔墙人偶：淡紫白底＋表演环纹＋粉颊蓝手（2026-11-17 奖励蛋修正 S6 超能道馆蛋）
};
/* 属性兜底花纹（未知物种但有官方属性时）：花纹取属性，底色取属性浅色。
 * 2026-11-17 方案 A 补全 18 种（此前仅 9 种；新主属性种如虫/毒/超能力此前会掉进神秘蛋）。
 * 花纹只用 style.css 已有的 .pat-* 规则（见 egg-design.test.mjs 的 CSS 断言），不新增花纹。 */
const EGG_TYPE_FALLBACK = {
  '火': { bg: '#FFE3C2', pat: 'flame', c1: '#F25C54', c2: '#FFD93B' },
  '水': { bg: '#CFE8FF', pat: 'drops', c1: '#5DA9E9', c2: '#FFFFFF' },
  '草': { bg: '#E3F5DF', pat: 'leaf', c1: '#3E9B4F', c2: '#7BC96F' },
  '电': { bg: '#FFF6C9', pat: 'bolt', c1: '#8A6D3B', c2: '#E5484D' },
  '岩石': { bg: '#E8E2D5', pat: 'spots', c1: '#8A7D6B', c2: '#C9BFA9' },
  '地面': { bg: '#F0E2CC', pat: 'stripes', c1: '#B08D5F', c2: '#8A6D3B' },
  '普通': { bg: '#F5E8D3', pat: 'ring', c1: '#FFF6E0', c2: '#B08D5F' },
  '飞行': { bg: '#DDEFFF', pat: 'waves', c1: '#FFFFFF', c2: '#7AA5D2' },
  '龙': { bg: '#CDE6F7', pat: 'waves', c1: '#FFFFFF', c2: '#6B8DD6' },
  '冰': { bg: '#DCEFFA', pat: 'spots', c1: '#7FB3D5', c2: '#FFFFFF' }, // 雪花斑点
  '格斗': { bg: '#FADBD8', pat: 'stripes', c1: '#922B21', c2: '#F5CBA7' }, // 格斗条纹
  '毒': { bg: '#E3D0F0', pat: 'spots', c1: '#7D3C98', c2: '#C39BD3' }, // 毒液斑点
  '超能力': { bg: '#FAD7F0', pat: 'curl', c1: '#AF7AC5', c2: '#FFFFFF' }, // 念力旋纹
  '虫': { bg: '#D5F5D0', pat: 'leaf', c1: '#2E7D32', c2: '#A9DFBF' }, // 虫叶
  '幽灵': { bg: '#D5C6E8', pat: 'bubbles', c1: '#5D3A7A', c2: '#E8E0F5' }, // 幽灵气泡
  '恶': { bg: '#C9C9D1', pat: 'band', c1: '#2C3E50', c2: '#7F8C8D' }, // 暗黑环带
  '钢': { bg: '#EAEDED', pat: 'shell', c1: '#5D6D7E', c2: '#FFFFFF' }, // 金属甲壳
  '妖精': { bg: '#FDEBD7', pat: 'ring', c1: '#E75480', c2: '#FFFFFF' }, // 妖精环纹
};
/* 神秘蛋兜底（物种未知／未定种）：淡紫底＋金星 */
const EGG_MYSTERY = { bg: '#E8E0F0', pat: 'star', c1: '#C9A227', c2: '#8E7CC3' };
/* 站内蛋显示按属性换元素蛋图（2026-11-19 §13）：19 张（18 属性＋叶），public/static/img/eggs/<slug>.webp。
 * 主属性为准，双属性取非普通属性优先（与兜底花纹一致）；叶蛋给妙蛙种子线 1/2/3；无属性（神秘蛋）不带 img，走 CSS 蛋。 */
const EGG_TYPE_IMG = {
  '草': 'grass', '火': 'fire', '水': 'water', '电': 'electric', '幽灵': 'ghost', '冰': 'ice', '岩石': 'rock',
  '普通': 'normal', '格斗': 'fighting', '毒': 'poison', '地面': 'ground', '飞行': 'flying', '超能力': 'psychic',
  '虫': 'bug', '龙': 'dragon', '恶': 'dark', '钢': 'steel', '妖精': 'fairy',
};
const EGG_LEAF_SPECIES = [1, 2, 3];
function eggTypesFor(n) {
  return (Number.isFinite(n) && DEX_DETAILS[n] && DEX_DETAILS[n].types)
    || (Number.isFinite(n) && SPECIES[n] ? [SPECIES[n].type] : []);
}
function eggImgFor(n) {
  if (EGG_LEAF_SPECIES.includes(n)) return '/static/img/eggs/leaf.webp';
  const types = eggTypesFor(n);
  const t = types.find((x) => x !== '普通' && EGG_TYPE_IMG[x]) || types.find((x) => EGG_TYPE_IMG[x]);
  return t ? `/static/img/eggs/${EGG_TYPE_IMG[t]}.webp` : null;
}
function eggDesignFor(no) {
  const n = Number(no);
  const img = eggImgFor(n);
  const withImg = (d) => (img ? { ...d, img } : d);
  if (Number.isFinite(n) && EGG_DESIGNS[n]) return withImg({ no: n, ...EGG_DESIGNS[n] });
  // 兜底取官方双属性：双属性种优先用非普通属性的花纹（普通为通用底色，如波波普通/飞行取飞行波纹）；
  // 纯普通种或无官方属性时用主属性；都取不到时神秘蛋。
  const types = eggTypesFor(n);
  const t = types.find((x) => x !== '普通' && EGG_TYPE_FALLBACK[x]) || types.find((x) => EGG_TYPE_FALLBACK[x]);
  if (t) return withImg({ no: Number.isFinite(n) ? n : null, ...EGG_TYPE_FALLBACK[t] });
  return { no: Number.isFinite(n) ? n : null, ...EGG_MYSTERY };
}

/* 野外池（借鉴包 v1 扩充到 12 只；Phase 2 第一批 2026-11-06 扩到 32 只：20 种，三档 4/11/17；
 * Phase 2 第二批 2026-11-06 扩到 52 只：20 种，三档 4/23/25；
 * Phase 2 第三批 2026-11-06 扩到 72 只：20 种，三档 4/35/33。
 * Phase 2 第四批 2026-11-06 扩到 92 只：20 种，三档 4/45/43。
 * 不加的 14 种（第一批口径不变）：51 三地鼠（无备战招式表）、131 拉普拉斯与 143 卡比兽（道馆蛋奖励种）、151 梦幻（传说种，图鉴特殊 rare 位）、
 * 133 伊布与 147 迷你龙（蛋/野外双身份，仓库 dexKey 冲突）、134/135/136/196/197/470/471/700 八种伊布进化形（伊布线不进野外池，进化分支保密设计；用户 2026-11-06 定）。
 * 档位规则：一段进化/特殊线基础形态放少见，最终形态与特殊线进化放稀有。
 * common 常见（抓捕 1 题）/ uncommon 少见（2 题）/ rare 稀有（3 题）；
 * 遭遇抽选权重 60/30/10（pickWildSpecies）。优先抽未抓过的，全抓齐才回落全池（2026-10-30 用户定）。 */
const WILD = [
  { no: 16, name: '波波', tier: 'common' },
  { no: 43, name: '走路草', tier: 'common' },
  { no: 39, name: '胖丁', tier: 'common' },
  { no: 50, name: '地鼠', tier: 'common' },
  { no: 54, name: '可达鸭', tier: 'uncommon' },
  { no: 37, name: '六尾', tier: 'uncommon' },
  { no: 74, name: '小拳石', tier: 'uncommon' },
  { no: 98, name: '大钳蟹', tier: 'uncommon' },
  { no: 179, name: '咩利羊', tier: 'uncommon' },
  { no: 58, name: '卡蒂狗', tier: 'rare' },
  { no: 123, name: '飞天螳螂', tier: 'rare' },
  { no: 111, name: '独角犀牛', tier: 'rare' },
  // Phase 2 第一批（2026-11-06）：20 种，图鉴号顺序追加（伊布线不进池，用户定）
  { no: 17, name: '比比鸟', tier: 'uncommon' },
  { no: 18, name: '比雕', tier: 'rare' },
  { no: 38, name: '九尾', tier: 'rare' },
  { no: 40, name: '胖可丁', tier: 'uncommon' },
  { no: 44, name: '臭臭花', tier: 'uncommon' },
  { no: 55, name: '哥达鸭', tier: 'rare' },
  { no: 59, name: '风速狗', tier: 'rare' },
  { no: 75, name: '隆隆石', tier: 'uncommon' },
  { no: 76, name: '隆隆岩', tier: 'rare' },
  { no: 99, name: '巨钳蟹', tier: 'uncommon' },
  { no: 112, name: '铁甲暴龙', tier: 'rare' },
  { no: 148, name: '哈克龙', tier: 'rare' },
  { no: 149, name: '快龙', tier: 'rare' },
  { no: 180, name: '茸茸羊', tier: 'uncommon' },
  { no: 181, name: '电龙', tier: 'rare' },
  { no: 208, name: '大钢蛇', tier: 'rare' },
  { no: 212, name: '巨钳螳螂', tier: 'rare' },
  { no: 464, name: '钻角犀兽', tier: 'rare' },
  { no: 466, name: '电击魔兽', tier: 'rare' },
  { no: 900, name: '劈斧螳螂', tier: 'rare' },
  // Phase 2 第二批（2026-11-06）：20 种，图鉴号顺序追加
  { no: 10, name: '绿毛虫', tier: 'uncommon' },
  { no: 11, name: '铁甲蛹', tier: 'uncommon' },
  { no: 12, name: '巴大蝶', tier: 'rare' },
  { no: 13, name: '独角虫', tier: 'uncommon' },
  { no: 14, name: '铁壳蛹', tier: 'uncommon' },
  { no: 15, name: '大针蜂', tier: 'rare' },
  { no: 19, name: '小拉达', tier: 'uncommon' },
  { no: 20, name: '拉达', tier: 'rare' },
  { no: 21, name: '烈雀', tier: 'uncommon' },
  { no: 22, name: '大嘴雀', tier: 'rare' },
  { no: 23, name: '阿柏蛇', tier: 'uncommon' },
  { no: 24, name: '阿柏怪', tier: 'rare' },
  { no: 27, name: '穿山鼠', tier: 'uncommon' },
  { no: 28, name: '穿山王', tier: 'rare' },
  { no: 29, name: '尼多兰', tier: 'uncommon' },
  { no: 30, name: '尼多娜', tier: 'uncommon' },
  { no: 31, name: '尼多后', tier: 'rare' },
  { no: 32, name: '尼多朗', tier: 'uncommon' },
  { no: 33, name: '尼多力诺', tier: 'uncommon' },
  { no: 34, name: '尼多王', tier: 'rare' },
  // Phase 2 第三批（2026-11-06）：20 种，图鉴号顺序追加
  { no: 35, name: '皮皮', tier: 'uncommon' },
  { no: 36, name: '皮可西', tier: 'rare' },
  { no: 41, name: '超音蝠', tier: 'uncommon' },
  { no: 42, name: '大嘴蝠', tier: 'rare' },
  { no: 46, name: '派拉斯', tier: 'uncommon' },
  { no: 47, name: '派拉斯特', tier: 'rare' },
  { no: 48, name: '毛球', tier: 'uncommon' },
  { no: 49, name: '末入蛾', tier: 'rare' },
  { no: 52, name: '喵喵', tier: 'uncommon' },
  { no: 53, name: '猫老大', tier: 'rare' },
  { no: 56, name: '猴怪', tier: 'uncommon' },
  { no: 57, name: '火爆猴', tier: 'rare' },
  { no: 60, name: '蚊香蝌蚪', tier: 'uncommon' },
  { no: 61, name: '蚊香君', tier: 'uncommon' },
  { no: 62, name: '蚊香泳士', tier: 'rare' },
  { no: 63, name: '凯西', tier: 'uncommon' },
  { no: 64, name: '勇基拉', tier: 'uncommon' },
  { no: 65, name: '胡地', tier: 'rare' },
  { no: 66, name: '腕力', tier: 'uncommon' },
  { no: 67, name: '豪力', tier: 'uncommon' },
  // Phase 2 第四批（2026-11-06）：20 种，图鉴号顺序追加
  { no: 68, name: '怪力', tier: 'rare' },
  { no: 69, name: '喇叭芽', tier: 'uncommon' },
  { no: 70, name: '口呆花', tier: 'uncommon' },
  { no: 71, name: '大食花', tier: 'rare' },
  { no: 72, name: '玛瑙水母', tier: 'uncommon' },
  { no: 73, name: '毒刺水母', tier: 'rare' },
  { no: 77, name: '小火马', tier: 'uncommon' },
  { no: 78, name: '烈焰马', tier: 'rare' },
  { no: 79, name: '呆呆兽', tier: 'uncommon' },
  { no: 80, name: '呆壳兽', tier: 'rare' },
  { no: 81, name: '小磁怪', tier: 'uncommon' },
  { no: 82, name: '三合一磁怪', tier: 'rare' },
  { no: 83, name: '大葱鸭', tier: 'rare' },
  { no: 84, name: '嘟嘟', tier: 'uncommon' },
  { no: 85, name: '嘟嘟利', tier: 'rare' },
  { no: 86, name: '小海狮', tier: 'uncommon' },
  { no: 87, name: '白海狮', tier: 'rare' },
  { no: 88, name: '臭泥', tier: 'uncommon' },
  { no: 89, name: '臭臭泥', tier: 'rare' },
  { no: 90, name: '大舌贝', tier: 'uncommon' },
  // 第五批（2026-11-06）：20 只（图鉴号 91–115）
  { no: 92, name: '鬼斯', tier: 'uncommon' },
  { no: 93, name: '鬼斯通', tier: 'uncommon' },
  { no: 96, name: '催眠貘', tier: 'uncommon' },
  { no: 100, name: '霹雳电球', tier: 'uncommon' },
  { no: 102, name: '蛋蛋', tier: 'uncommon' },
  { no: 104, name: '卡拉卡拉', tier: 'uncommon' },
  { no: 109, name: '瓦斯弹', tier: 'uncommon' },
  { no: 91, name: '刺甲贝', tier: 'rare' },
  { no: 94, name: '耿鬼', tier: 'rare' },
  { no: 97, name: '引梦貘人', tier: 'rare' },
  { no: 101, name: '顽皮雷弹', tier: 'rare' },
  { no: 103, name: '椰蛋树', tier: 'rare' },
  { no: 105, name: '嘎啦嘎啦', tier: 'rare' },
  { no: 106, name: '飞腿郎', tier: 'rare' },
  { no: 107, name: '快拳郎', tier: 'rare' },
  { no: 108, name: '大舌头', tier: 'rare' },
  { no: 110, name: '双弹瓦斯', tier: 'rare' },
  { no: 113, name: '吉利蛋', tier: 'rare' },
  { no: 114, name: '蔓藤怪', tier: 'rare' },
  { no: 115, name: '袋兽', tier: 'rare' },
  // 第六批（2026-11-06）：19 只（图鉴号 116–142，144 急冻鸟按用户决定不进池）
  { no: 116, name: '墨海马', tier: 'uncommon' },
  { no: 118, name: '角金鱼', tier: 'uncommon' },
  { no: 120, name: '海星星', tier: 'uncommon' },
  { no: 129, name: '鲤鱼王', tier: 'uncommon' },
  { no: 138, name: '菊石兽', tier: 'uncommon' },
  { no: 140, name: '化石盔', tier: 'uncommon' },
  { no: 117, name: '海刺龙', tier: 'rare' },
  { no: 119, name: '金鱼王', tier: 'rare' },
  { no: 122, name: '魔墙人偶', tier: 'rare' },
  { no: 124, name: '迷唇姐', tier: 'rare' },
  { no: 126, name: '鸭嘴火兽', tier: 'rare' },
  { no: 127, name: '凯罗斯', tier: 'rare' },
  { no: 128, name: '肯泰罗', tier: 'rare' },
  { no: 130, name: '暴鲤龙', tier: 'rare' },
  { no: 132, name: '百变怪', tier: 'rare' },
  { no: 137, name: '多边兽', tier: 'rare' },
  { no: 139, name: '多刺菊石兽', tier: 'rare' },
  { no: 141, name: '镰刀盔', tier: 'rare' },
  { no: 142, name: '化石翼龙', tier: 'rare' },
  // 51 三地鼠补进（2026-11-06 用户令）：已有完整备战数据，只差 WILD；此前 dexKeyForSpecies(51) 解析到 egg:51（无蛋道具、无法获得）
  { no: 51, name: '三地鼠', tier: 'rare' },
];

const WILD_TIERS = {
  common: { label: '常见', questions: 1, weight: 60 },
  uncommon: { label: '少见', questions: 2, weight: 30 },
  rare: { label: '稀有', questions: 3, weight: 10 },
};
// 数组顺序为周一到周日；weekday 使用 UTC 日历星期（周日=0）。
const CARE_SCENES = [
  { key: 'morning-yard', name: '晨光小院', weekday: 1, text: '新的一周，阳光正好。' },
  { key: 'rain-garden', name: '雨后花园', weekday: 2, text: '雨后的花园，空气甜甜的。' },
  { key: 'book-nook', name: '安静图书角', weekday: 3, text: '嘘——伙伴在书堆里打盹。' },
  { key: 'star-terrace', name: '星空露台', weekday: 4, text: '星星出来了，伙伴也精神了。' },
  { key: 'beach', name: '海边沙滩', weekday: 5, text: '海风咸咸的，伙伴跑得飞快。' },
  { key: 'snow-cabin', name: '雪夜小屋', weekday: 6, text: '雪夜小屋里，暖暖的。' },
  { key: 'rainbow-meadow', name: '彩虹草原', weekday: 0, text: '彩虹草原上，今天也要加油。' },
];
function careSceneForDate(dateStr) {
  if (typeof dateStr !== 'string') return CARE_SCENES[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return CARE_SCENES[0];
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 ||
      date.getUTCDate() !== d) return CARE_SCENES[0];
  return CARE_SCENES.find(s => s.weekday === date.getUTCDay()) || CARE_SCENES[0];
}
async function isCareEnabled(db, S) {
  return ((S && S.has('care_enabled')) ? S.get('care_enabled') : await getSetting(db, 'care_enabled')) === '1';
}

/* 遭遇抽选：先按档位权重（60/30/10）抽档，再在档内等概率抽一只；优先抽未抓过的，全抓齐才回落全池（2026-10-30 用户定） */
function pickWildSpecies(rng = Math.random, excludedNos) {
  const excluded = new Set(excludedNos || []);
  let candidates = WILD.filter((w) => !excluded.has(w.no));
  if (candidates.length === 0) candidates = WILD;
  const tiers = Object.entries(WILD_TIERS).filter(([key]) =>
    candidates.some((w) => w.tier === key)
  );
  const total = tiers.reduce((a, [, t]) => a + t.weight, 0);
  let roll = rollRng(rng) * total;
  let tier = tiers[tiers.length - 1][0];
  for (const [key, t] of tiers) {
    roll -= t.weight;
    if (roll < 0) { tier = key; break; }
  }
  const pool = candidates.filter((w) => w.tier === tier);
  const w = pool[Math.floor(rollRng(rng) * pool.length) % pool.length];
  return { no: w.no, name: w.name, tier: w.tier };
}
/* 官方 18 属性克制表（2026-11-17 问题 3 补全）：18 攻击属性 × 18 防御属性，仅列非 1 项。
 * 来源：~/workspace/pokemon-dataset-zh 的 data/pokemon/*.json type_effectiveness，
 * 单属性宝可梦直接读、多数票定格（特性如引火/储水/漂浮/厚脂肪造成的免疫/减半是少数派），
 * 双属性交叉核对 13030/13212 通过（182 项不一致为特性/数据 quirks）。
 * 补全前只含 10 攻击属性（缺冰/格斗/毒/超能力/虫/幽灵/恶/钢整行），已有 10 行也缺项
 * （火缺×2冰/虫/钢、草缺×0.5毒/虫/钢、地面缺×2毒/钢与×0.5虫、岩石缺×2冰/虫与×0.5格斗/钢、
 * 飞行缺×2格斗/虫与×0.5钢、龙缺×0.5钢与×0妖精、普通缺×0.5钢与×0幽灵、妖精缺×2格斗/恶与
 * ×0.5毒/钢），缺的项都按×1中性算，克制根本没生效。补全后 EXTRA 两表退役。
 * 八关对应原版关都第 1–8 关（岩石/水/电/草/毒/超能力/火/地面）；2026-11-17 8 关扩围补齐毒（第 5 关）与超能力（第 6 关）。 */
const TYPES18 = ['普通', '火', '水', '电', '草', '冰', '格斗', '毒', '地面', '飞行', '超能力', '虫', '岩石', '幽灵', '龙', '恶', '钢', '妖精'];
const OFFICIAL_MULT = {
  '普通': { '岩石': 0.5, '幽灵': 0, '钢': 0.5 },
  '火': { '火': 0.5, '水': 0.5, '草': 2, '冰': 2, '虫': 2, '岩石': 0.5, '龙': 0.5, '钢': 2 },
  '水': { '火': 2, '水': 0.5, '草': 0.5, '地面': 2, '岩石': 2, '龙': 0.5 },
  '电': { '水': 2, '电': 0.5, '草': 0.5, '地面': 0, '飞行': 2, '龙': 0.5 },
  '草': { '火': 0.5, '水': 2, '草': 0.5, '毒': 0.5, '地面': 2, '飞行': 0.5, '虫': 0.5, '岩石': 2, '龙': 0.5, '钢': 0.5 },
  '冰': { '火': 0.5, '水': 0.5, '草': 2, '冰': 0.5, '地面': 2, '飞行': 2, '龙': 2, '钢': 0.5 },
  '格斗': { '普通': 2, '冰': 2, '毒': 0.5, '飞行': 0.5, '超能力': 0.5, '虫': 0.5, '岩石': 2, '幽灵': 0, '恶': 2, '钢': 2, '妖精': 0.5 },
  '毒': { '草': 2, '毒': 0.5, '地面': 0.5, '岩石': 0.5, '幽灵': 0.5, '钢': 0, '妖精': 2 },
  '地面': { '火': 2, '电': 2, '草': 0.5, '毒': 2, '飞行': 0, '虫': 0.5, '岩石': 2, '钢': 2 },
  '飞行': { '电': 0.5, '草': 2, '格斗': 2, '虫': 2, '岩石': 0.5, '钢': 0.5 },
  '超能力': { '格斗': 2, '毒': 2, '超能力': 0.5, '恶': 0, '钢': 0.5 },
  '虫': { '火': 0.5, '草': 2, '格斗': 0.5, '毒': 0.5, '飞行': 0.5, '超能力': 2, '幽灵': 0.5, '恶': 2, '钢': 0.5, '妖精': 0.5 },
  '岩石': { '火': 2, '冰': 2, '格斗': 0.5, '地面': 0.5, '飞行': 2, '虫': 2, '钢': 0.5 },
  '幽灵': { '普通': 0, '超能力': 2, '幽灵': 2, '恶': 0.5 },
  '龙': { '龙': 2, '钢': 0.5, '妖精': 0 },
  '恶': { '格斗': 0.5, '超能力': 2, '幽灵': 2, '恶': 0.5, '妖精': 0.5 },
  '钢': { '火': 0.5, '水': 0.5, '电': 0.5, '冰': 2, '岩石': 2, '钢': 0.5, '妖精': 2 },
  '妖精': { '火': 0.5, '格斗': 2, '毒': 0.5, '龙': 2, '恶': 2, '钢': 0.5 },
};
const LINE_TYPE = { pikachu: '电', charmander: '火', squirtle: '水', bulbasaur: '草', eevee: '普通' };

/* 图鉴详情数据（data/pokedex-details.json 的卡片子集，由 scripts/gen-dex-details.mjs 生成；不要手改）。
 * 只含 types / abilities / stats；名字、进化链、立绘由 SPECIES / EVO_LINES / LINES / petImg 覆盖。 */
/* DEX_DETAILS:BEGIN */
const DEX_DETAILS = {
  1: {"types":["草","毒"],"abilities":[{"name":"茂盛","hidden":false,"effect":"体力降到三分之一或以下时，草属性招式威力变为1.5倍。"},{"name":"叶绿素","hidden":true,"effect":"大晴天时速度变为2倍。"}],"stats":{"hp":45,"attack":49,"defense":49,"sp_attack":65,"sp_defense":65,"speed":45,"total":318}},
  2: {"types":["草","毒"],"abilities":[{"name":"茂盛","hidden":false,"effect":"体力降到三分之一或以下时，草属性招式威力变为1.5倍。"},{"name":"叶绿素","hidden":true,"effect":"大晴天时速度变为2倍。"}],"stats":{"hp":60,"attack":62,"defense":63,"sp_attack":80,"sp_defense":80,"speed":60,"total":405}},
  3: {"types":["草","毒"],"abilities":[{"name":"茂盛","hidden":false,"effect":"体力降到三分之一或以下时，草属性招式威力变为1.5倍。"},{"name":"叶绿素","hidden":true,"effect":"大晴天时速度变为2倍。"}],"stats":{"hp":80,"attack":82,"defense":83,"sp_attack":100,"sp_defense":100,"speed":80,"total":525}},
  4: {"types":["火"],"abilities":[{"name":"猛火","hidden":false,"effect":"体力降到三分之一或以下时，火属性招式威力变为1.5倍。"},{"name":"太阳之力","hidden":true,"effect":"大晴天时特攻变为1.5倍，但每回合结束损失最大体力的1/8。"}],"stats":{"hp":39,"attack":52,"defense":43,"sp_attack":60,"sp_defense":50,"speed":65,"total":309}},
  5: {"types":["火"],"abilities":[{"name":"猛火","hidden":false,"effect":"体力降到三分之一或以下时，火属性招式威力变为1.5倍。"},{"name":"太阳之力","hidden":true,"effect":"大晴天时特攻变为1.5倍，但每回合结束损失最大体力的1/8。"}],"stats":{"hp":58,"attack":64,"defense":58,"sp_attack":80,"sp_defense":65,"speed":80,"total":405}},
  6: {"types":["火","飞行"],"abilities":[{"name":"猛火","hidden":false,"effect":"体力降到三分之一或以下时，火属性招式威力变为1.5倍。"},{"name":"太阳之力","hidden":true,"effect":"大晴天时特攻变为1.5倍，但每回合结束损失最大体力的1/8。"}],"stats":{"hp":78,"attack":84,"defense":78,"sp_attack":109,"sp_defense":85,"speed":100,"total":534}},
  7: {"types":["水"],"abilities":[{"name":"激流","hidden":false,"effect":"体力降到三分之一或以下时，水属性招式威力变为1.5倍。"},{"name":"雨盘","hidden":true,"effect":"下雨时每回合结束回复最大体力的1/16。"}],"stats":{"hp":44,"attack":48,"defense":65,"sp_attack":50,"sp_defense":64,"speed":43,"total":314}},
  8: {"types":["水"],"abilities":[{"name":"激流","hidden":false,"effect":"体力降到三分之一或以下时，水属性招式威力变为1.5倍。"},{"name":"雨盘","hidden":true,"effect":"下雨时每回合结束回复最大体力的1/16。"}],"stats":{"hp":59,"attack":63,"defense":80,"sp_attack":65,"sp_defense":80,"speed":58,"total":405}},
  9: {"types":["水"],"abilities":[{"name":"激流","hidden":false,"effect":"体力降到三分之一或以下时，水属性招式威力变为1.5倍。"},{"name":"雨盘","hidden":true,"effect":"下雨时每回合结束回复最大体力的1/16。"}],"stats":{"hp":79,"attack":83,"defense":100,"sp_attack":85,"sp_defense":105,"speed":78,"total":530}},
  10: {"types":["虫"],"abilities":[{"name":"鳞粉","hidden":false,"effect":"不会受到招式的追加效果影响。"},{"name":"逃跑","hidden":true,"effect":"在野外战斗中一定能逃跑成功。"}],"stats":{"hp":45,"attack":30,"defense":35,"sp_attack":20,"sp_defense":20,"speed":45,"total":195}},
  11: {"types":["虫"],"abilities":[{"name":"蜕皮","hidden":false,"effect":"每回合结束有33%几率治愈所有异常状态。"}],"stats":{"hp":50,"attack":20,"defense":55,"sp_attack":25,"sp_defense":25,"speed":30,"total":205}},
  12: {"types":["虫","飞行"],"abilities":[{"name":"复眼","hidden":false,"effect":"招式的命中率变为1.3倍。"},{"name":"有色眼镜","hidden":true,"effect":"效果不好的招式威力变为2倍。"}],"stats":{"hp":60,"attack":45,"defense":50,"sp_attack":90,"sp_defense":80,"speed":70,"total":395}},
  13: {"types":["虫","毒"],"abilities":[{"name":"鳞粉","hidden":false,"effect":"不会受到招式的追加效果影响。"},{"name":"逃跑","hidden":true,"effect":"在野外战斗中一定能逃跑成功。"}],"stats":{"hp":40,"attack":35,"defense":30,"sp_attack":20,"sp_defense":20,"speed":50,"total":195}},
  14: {"types":["虫","毒"],"abilities":[{"name":"蜕皮","hidden":false,"effect":"每回合结束有33%几率治愈所有异常状态。"}],"stats":{"hp":45,"attack":25,"defense":50,"sp_attack":25,"sp_defense":25,"speed":35,"total":205}},
  15: {"types":["虫","毒"],"abilities":[{"name":"虫之预感","hidden":false,"effect":"体力降到三分之一或以下时，虫属性招式威力变为1.5倍。"},{"name":"狙击手","hidden":true,"effect":"击中要害时，伤害变为3倍。"}],"stats":{"hp":65,"attack":90,"defense":40,"sp_attack":45,"sp_defense":80,"speed":75,"total":395}},
  16: {"types":["普通","飞行"],"abilities":[{"name":"锐利目光","hidden":false,"effect":"命中率不会被对手降低。"},{"name":"蹒跚","hidden":false,"effect":"混乱时闪避率变为2倍。"},{"name":"健壮胸肌","hidden":true,"effect":"防御不会被对手降低。"}],"stats":{"hp":40,"attack":45,"defense":40,"sp_attack":35,"sp_defense":35,"speed":56,"total":251}},
  17: {"types":["普通","飞行"],"abilities":[{"name":"锐利目光","hidden":false,"effect":"命中率不会被对手降低。"},{"name":"蹒跚","hidden":false,"effect":"混乱时闪避率变为2倍。"},{"name":"健壮胸肌","hidden":true,"effect":"防御不会被对手降低。"}],"stats":{"hp":63,"attack":60,"defense":55,"sp_attack":50,"sp_defense":50,"speed":71,"total":349}},
  18: {"types":["普通","飞行"],"abilities":[{"name":"锐利目光","hidden":false,"effect":"命中率不会被对手降低。"},{"name":"蹒跚","hidden":false,"effect":"混乱时闪避率变为2倍。"},{"name":"健壮胸肌","hidden":true,"effect":"防御不会被对手降低。"}],"stats":{"hp":83,"attack":80,"defense":75,"sp_attack":70,"sp_defense":70,"speed":101,"total":479}},
  19: {"types":["普通"],"abilities":[{"name":"逃跑","hidden":false,"effect":"在野外战斗中一定能逃跑成功。"},{"name":"毅力","hidden":false,"effect":"陷入异常状态时，攻击变为1.5倍，且不受灼伤的攻击减半影响。"},{"name":"活力","hidden":true,"effect":"物理招式威力变为1.5倍，但命中率变为0.8倍。"}],"stats":{"hp":30,"attack":56,"defense":35,"sp_attack":25,"sp_defense":35,"speed":72,"total":253}},
  20: {"types":["普通"],"abilities":[{"name":"逃跑","hidden":false,"effect":"在野外战斗中一定能逃跑成功。"},{"name":"毅力","hidden":false,"effect":"陷入异常状态时，攻击变为1.5倍，且不受灼伤的攻击减半影响。"},{"name":"活力","hidden":true,"effect":"物理招式威力变为1.5倍，但命中率变为0.8倍。"}],"stats":{"hp":55,"attack":81,"defense":60,"sp_attack":50,"sp_defense":70,"speed":97,"total":413}},
  21: {"types":["普通","飞行"],"abilities":[{"name":"锐利目光","hidden":false,"effect":"命中率不会被对手降低。"},{"name":"狙击手","hidden":true,"effect":"击中要害时，伤害变为3倍。"}],"stats":{"hp":40,"attack":60,"defense":30,"sp_attack":31,"sp_defense":31,"speed":70,"total":262}},
  22: {"types":["普通","飞行"],"abilities":[{"name":"锐利目光","hidden":false,"effect":"命中率不会被对手降低。"},{"name":"狙击手","hidden":true,"effect":"击中要害时，伤害变为3倍。"}],"stats":{"hp":65,"attack":90,"defense":65,"sp_attack":61,"sp_defense":61,"speed":100,"total":442}},
  23: {"types":["毒"],"abilities":[{"name":"威吓","hidden":false,"effect":"出场时降低对手的攻击1级。"},{"name":"蜕皮","hidden":false,"effect":"每回合结束有33%几率治愈所有异常状态。"},{"name":"紧张感","hidden":true,"effect":"对手无法吃下携带的树果。"}],"stats":{"hp":35,"attack":60,"defense":44,"sp_attack":40,"sp_defense":54,"speed":55,"total":288}},
  24: {"types":["毒"],"abilities":[{"name":"威吓","hidden":false,"effect":"出场时降低对手的攻击1级。"},{"name":"蜕皮","hidden":false,"effect":"每回合结束有33%几率治愈所有异常状态。"},{"name":"紧张感","hidden":true,"effect":"对手无法吃下携带的树果。"}],"stats":{"hp":60,"attack":95,"defense":69,"sp_attack":65,"sp_defense":79,"speed":80,"total":448}},
  25: {"types":["电"],"abilities":[{"name":"静电","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方麻痹。"},{"name":"避雷针","hidden":true,"effect":"把单体电属性招式引到自己身上，吸收后特攻提升1级。"}],"stats":{"hp":35,"attack":55,"defense":40,"sp_attack":50,"sp_defense":50,"speed":90,"total":320}},
  26: {"types":["电"],"abilities":[{"name":"静电","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方麻痹。"},{"name":"避雷针","hidden":true,"effect":"把单体电属性招式引到自己身上，吸收后特攻提升1级。"}],"stats":{"hp":60,"attack":90,"defense":55,"sp_attack":90,"sp_defense":80,"speed":110,"total":485}},
  27: {"types":["地面"],"abilities":[{"name":"沙隐","hidden":false,"effect":"沙暴天气下闪避率提升到1.25倍，且不受沙暴伤害。"},{"name":"拨沙","hidden":true,"effect":"沙暴天气下速度变为2倍，且不受沙暴伤害。"}],"stats":{"hp":50,"attack":75,"defense":85,"sp_attack":20,"sp_defense":30,"speed":40,"total":300}},
  28: {"types":["地面"],"abilities":[{"name":"沙隐","hidden":false,"effect":"沙暴天气下闪避率提升到1.25倍，且不受沙暴伤害。"},{"name":"拨沙","hidden":true,"effect":"沙暴天气下速度变为2倍，且不受沙暴伤害。"}],"stats":{"hp":75,"attack":100,"defense":110,"sp_attack":45,"sp_defense":55,"speed":65,"total":450}},
  29: {"types":["毒"],"abilities":[{"name":"毒刺","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对手中毒。"},{"name":"斗争心","hidden":false,"effect":"对手与自己性别相同时，招式威力变为1.25倍；性别不同时，变为0.75倍。"},{"name":"活力","hidden":true,"effect":"物理招式威力变为1.5倍，但命中率变为0.8倍。"}],"stats":{"hp":55,"attack":47,"defense":52,"sp_attack":40,"sp_defense":40,"speed":41,"total":275}},
  30: {"types":["毒"],"abilities":[{"name":"毒刺","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对手中毒。"},{"name":"斗争心","hidden":false,"effect":"对手与自己性别相同时，招式威力变为1.25倍；性别不同时，变为0.75倍。"},{"name":"活力","hidden":true,"effect":"物理招式威力变为1.5倍，但命中率变为0.8倍。"}],"stats":{"hp":70,"attack":62,"defense":67,"sp_attack":55,"sp_defense":55,"speed":56,"total":365}},
  31: {"types":["毒","地面"],"abilities":[{"name":"毒刺","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对手中毒。"},{"name":"斗争心","hidden":false,"effect":"对手与自己性别相同时，招式威力变为1.25倍；性别不同时，变为0.75倍。"},{"name":"强行","hidden":true,"effect":"带追加效果的招式威力变为1.3倍，但追加效果不再触发。"}],"stats":{"hp":90,"attack":92,"defense":87,"sp_attack":75,"sp_defense":85,"speed":76,"total":505}},
  32: {"types":["毒"],"abilities":[{"name":"毒刺","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对手中毒。"},{"name":"斗争心","hidden":false,"effect":"对手与自己性别相同时，招式威力变为1.25倍；性别不同时，变为0.75倍。"},{"name":"活力","hidden":true,"effect":"物理招式威力变为1.5倍，但命中率变为0.8倍。"}],"stats":{"hp":46,"attack":57,"defense":40,"sp_attack":40,"sp_defense":40,"speed":50,"total":273}},
  33: {"types":["毒"],"abilities":[{"name":"毒刺","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对手中毒。"},{"name":"斗争心","hidden":false,"effect":"对手与自己性别相同时，招式威力变为1.25倍；性别不同时，变为0.75倍。"},{"name":"活力","hidden":true,"effect":"物理招式威力变为1.5倍，但命中率变为0.8倍。"}],"stats":{"hp":61,"attack":72,"defense":57,"sp_attack":55,"sp_defense":55,"speed":65,"total":365}},
  34: {"types":["毒","地面"],"abilities":[{"name":"毒刺","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对手中毒。"},{"name":"斗争心","hidden":false,"effect":"对手与自己性别相同时，招式威力变为1.25倍；性别不同时，变为0.75倍。"},{"name":"强行","hidden":true,"effect":"带追加效果的招式威力变为1.3倍，但追加效果不再触发。"}],"stats":{"hp":81,"attack":102,"defense":77,"sp_attack":85,"sp_defense":75,"speed":85,"total":505}},
  35: {"types":["妖精"],"abilities":[{"name":"迷人之躯","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方着迷。"},{"name":"魔法防守","hidden":false,"effect":"不会受到除招式以外的伤害。"},{"name":"友情防守","hidden":true,"effect":"同伴受到的直接伤害降为0.75倍。"}],"stats":{"hp":70,"attack":45,"defense":48,"sp_attack":60,"sp_defense":65,"speed":35,"total":323}},
  36: {"types":["妖精"],"abilities":[{"name":"迷人之躯","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方着迷。"},{"name":"魔法防守","hidden":false,"effect":"不会受到除招式以外的伤害。"},{"name":"纯朴","hidden":true,"effect":"不会受到对方的能力变化影响进行攻击，无视对方的防御能力变化。"}],"stats":{"hp":95,"attack":70,"defense":73,"sp_attack":95,"sp_defense":90,"speed":60,"total":483}},
  37: {"types":["火"],"abilities":[{"name":"引火","hidden":false,"effect":"不受火属性招式伤害，挡下一次后自己的火属性招式威力变为1.5倍，直到离场。"},{"name":"日照","hidden":true,"effect":"出场时召唤持续到战斗结束的大晴天。"}],"stats":{"hp":38,"attack":41,"defense":40,"sp_attack":50,"sp_defense":65,"speed":65,"total":299}},
  38: {"types":["火"],"abilities":[{"name":"引火","hidden":false,"effect":"不受火属性招式伤害，挡下一次后自己的火属性招式威力变为1.5倍，直到离场。"},{"name":"日照","hidden":true,"effect":"出场时召唤持续到战斗结束的大晴天。"}],"stats":{"hp":73,"attack":76,"defense":75,"sp_attack":81,"sp_defense":100,"speed":100,"total":505}},
  39: {"types":["普通","妖精"],"abilities":[{"name":"迷人之躯","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方着迷。"},{"name":"好胜","hidden":false,"effect":"任何能力被降低时，特攻大幅提升2级。"},{"name":"友情防守","hidden":true,"effect":"同伴受到的直接伤害降为0.75倍。"}],"stats":{"hp":115,"attack":45,"defense":20,"sp_attack":45,"sp_defense":25,"speed":20,"total":270}},
  40: {"types":["普通","妖精"],"abilities":[{"name":"迷人之躯","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方着迷。"},{"name":"好胜","hidden":false,"effect":"任何能力被降低时，特攻大幅提升2级。"},{"name":"察觉","hidden":true,"effect":"出场时可以看穿对手携带的道具。"}],"stats":{"hp":140,"attack":70,"defense":45,"sp_attack":85,"sp_defense":50,"speed":45,"total":435}},
  41: {"types":["毒","飞行"],"abilities":[{"name":"精神力","hidden":false,"effect":"不会畏缩。"},{"name":"穿透","hidden":true,"effect":"无视对方的光墙、反射壁和替身进行攻击。"}],"stats":{"hp":40,"attack":45,"defense":35,"sp_attack":30,"sp_defense":40,"speed":55,"total":245}},
  42: {"types":["毒","飞行"],"abilities":[{"name":"精神力","hidden":false,"effect":"不会畏缩。"},{"name":"穿透","hidden":true,"effect":"无视对方的光墙、反射壁和替身进行攻击。"}],"stats":{"hp":75,"attack":80,"defense":70,"sp_attack":65,"sp_defense":75,"speed":90,"total":455}},
  43: {"types":["草","毒"],"abilities":[{"name":"叶绿素","hidden":false,"effect":"大晴天时速度变为2倍。"},{"name":"逃跑","hidden":true,"effect":"在野外战斗中一定能逃跑成功。"}],"stats":{"hp":45,"attack":50,"defense":55,"sp_attack":75,"sp_defense":65,"speed":30,"total":320}},
  44: {"types":["草","毒"],"abilities":[{"name":"叶绿素","hidden":false,"effect":"大晴天时速度变为2倍。"},{"name":"恶臭","hidden":true,"effect":"自己的招式命中时，有10%几率让对方畏缩。"}],"stats":{"hp":60,"attack":65,"defense":70,"sp_attack":85,"sp_defense":75,"speed":40,"total":395}},
  45: {"types":["草","毒"],"abilities":[{"name":"叶绿素","hidden":false,"effect":"大晴天时速度变为2倍。"},{"name":"孢子","hidden":true,"effect":"受到接触类招式攻击时，有30%几率让对方陷入麻痹、中毒或睡眠。"}],"stats":{"hp":75,"attack":80,"defense":85,"sp_attack":110,"sp_defense":90,"speed":50,"total":490}},
  46: {"types":["虫","草"],"abilities":[{"name":"孢子","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方陷入麻痹、中毒或睡眠。"},{"name":"干燥皮肤","hidden":false,"effect":"受到水属性招式攻击时回复体力；受到火属性招式攻击时伤害变为1.25倍。"},{"name":"湿气","hidden":true,"effect":"在场时，自爆、大爆炸和引爆无法生效。"}],"stats":{"hp":35,"attack":70,"defense":55,"sp_attack":45,"sp_defense":55,"speed":25,"total":285}},
  47: {"types":["虫","草"],"abilities":[{"name":"孢子","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方陷入麻痹、中毒或睡眠。"},{"name":"干燥皮肤","hidden":false,"effect":"受到水属性招式攻击时回复体力；受到火属性招式攻击时伤害变为1.25倍。"},{"name":"湿气","hidden":true,"effect":"在场时，自爆、大爆炸和引爆无法生效。"}],"stats":{"hp":60,"attack":95,"defense":80,"sp_attack":60,"sp_defense":80,"speed":30,"total":405}},
  48: {"types":["虫","毒"],"abilities":[{"name":"复眼","hidden":false,"effect":"招式的命中率变为1.3倍。"},{"name":"有色眼镜","hidden":false,"effect":"效果不好的招式威力变为2倍。"},{"name":"逃跑","hidden":true,"effect":"在野外战斗中一定能逃跑成功。"}],"stats":{"hp":60,"attack":55,"defense":50,"sp_attack":40,"sp_defense":55,"speed":45,"total":305}},
  49: {"types":["虫","毒"],"abilities":[{"name":"鳞粉","hidden":false,"effect":"不会受到招式的追加效果影响。"},{"name":"有色眼镜","hidden":false,"effect":"效果不好的招式威力变为2倍。"},{"name":"奇迹皮肤","hidden":true,"effect":"受到变化招式攻击时，命中率变为50%。"}],"stats":{"hp":70,"attack":65,"defense":60,"sp_attack":90,"sp_defense":75,"speed":90,"total":450}},
  50: {"types":["地面"],"abilities":[{"name":"沙隐","hidden":false,"effect":"沙暴天气下闪避率提升到1.25倍，且不受沙暴伤害。"},{"name":"沙穴","hidden":false,"effect":"使对手无法逃跑或换下场，飞行属性和浮空的宝可梦不受影响。"},{"name":"沙之力","hidden":true,"effect":"沙暴天气下岩石、地面、钢属性招式威力变为1.3倍，且不受沙暴伤害。"}],"stats":{"hp":10,"attack":55,"defense":25,"sp_attack":35,"sp_defense":45,"speed":95,"total":265}},
  51: {"types":["地面"],"abilities":[{"name":"沙隐","hidden":false,"effect":"沙暴天气下闪避率提升到1.25倍，且不受沙暴伤害。"},{"name":"沙穴","hidden":false,"effect":"使对手无法逃跑或换下场，飞行属性和浮空的宝可梦不受影响。"},{"name":"沙之力","hidden":true,"effect":"沙暴天气下岩石、地面、钢属性招式威力变为1.3倍，且不受沙暴伤害。"}],"stats":{"hp":35,"attack":100,"defense":50,"sp_attack":50,"sp_defense":70,"speed":120,"total":425}},
  52: {"types":["普通"],"abilities":[{"name":"捡拾","hidden":false,"effect":"有几率拾取战斗中使用过的道具。"},{"name":"技术高手","hidden":false,"effect":"威力60及以下的招式威力变为1.5倍。"},{"name":"紧张感","hidden":true,"effect":"对手无法吃下携带的树果。"}],"stats":{"hp":40,"attack":45,"defense":35,"sp_attack":40,"sp_defense":40,"speed":90,"total":290}},
  53: {"types":["普通"],"abilities":[{"name":"柔软","hidden":false,"effect":"不会陷入麻痹状态。"},{"name":"技术高手","hidden":false,"effect":"威力60及以下的招式威力变为1.5倍。"},{"name":"紧张感","hidden":true,"effect":"对手无法吃下携带的树果。"}],"stats":{"hp":65,"attack":70,"defense":60,"sp_attack":65,"sp_defense":65,"speed":115,"total":440}},
  54: {"types":["水"],"abilities":[{"name":"湿气","hidden":false,"effect":"在场时，自爆、大爆炸和引爆无法生效。"},{"name":"无关天气","hidden":false,"effect":"消除所有天气带来的效果，但天气本身不会消失。"},{"name":"悠游自如","hidden":true,"effect":"下雨时速度变为2倍。"}],"stats":{"hp":50,"attack":52,"defense":48,"sp_attack":65,"sp_defense":50,"speed":55,"total":320}},
  55: {"types":["水"],"abilities":[{"name":"湿气","hidden":false,"effect":"在场时，自爆、大爆炸和引爆无法生效。"},{"name":"无关天气","hidden":false,"effect":"消除所有天气带来的效果，但天气本身不会消失。"},{"name":"悠游自如","hidden":true,"effect":"下雨时速度变为2倍。"}],"stats":{"hp":80,"attack":82,"defense":78,"sp_attack":95,"sp_defense":80,"speed":85,"total":500}},
  56: {"types":["格斗"],"abilities":[{"name":"干劲","hidden":false,"effect":"不会陷入睡眠状态。"},{"name":"愤怒穴位","hidden":false,"effect":"受到会心一击时，攻击提升到最大。"},{"name":"不服输","hidden":true,"effect":"能力被对方降低时，攻击提升2级。"}],"stats":{"hp":40,"attack":80,"defense":35,"sp_attack":35,"sp_defense":45,"speed":70,"total":305}},
  57: {"types":["格斗"],"abilities":[{"name":"干劲","hidden":false,"effect":"不会陷入睡眠状态。"},{"name":"愤怒穴位","hidden":false,"effect":"受到会心一击时，攻击提升到最大。"},{"name":"不服输","hidden":true,"effect":"能力被对方降低时，攻击提升2级。"}],"stats":{"hp":65,"attack":105,"defense":60,"sp_attack":60,"sp_defense":70,"speed":95,"total":455}},
  58: {"types":["火"],"abilities":[{"name":"威吓","hidden":false,"effect":"出场时降低对手的攻击1级。"},{"name":"引火","hidden":false,"effect":"不受火属性招式伤害，挡下一次后自己的火属性招式威力变为1.5倍，直到离场。"},{"name":"正义之心","hidden":true,"effect":"受到恶属性招式伤害时，攻击提升1级。"}],"stats":{"hp":55,"attack":70,"defense":45,"sp_attack":70,"sp_defense":50,"speed":60,"total":350}},
  59: {"types":["火"],"abilities":[{"name":"威吓","hidden":false,"effect":"出场时降低对手的攻击1级。"},{"name":"引火","hidden":false,"effect":"不受火属性招式伤害，挡下一次后自己的火属性招式威力变为1.5倍，直到离场。"},{"name":"正义之心","hidden":true,"effect":"受到恶属性招式伤害时，攻击提升1级。"}],"stats":{"hp":90,"attack":110,"defense":80,"sp_attack":100,"sp_defense":80,"speed":95,"total":555}},
  60: {"types":["水"],"abilities":[{"name":"储水","hidden":false,"effect":"受到水属性招式时不受伤害，并回复最大体力的1/4。"},{"name":"湿气","hidden":false,"effect":"在场时，自爆、大爆炸和引爆无法生效。"},{"name":"悠游自如","hidden":true,"effect":"下雨时速度变为2倍。"}],"stats":{"hp":40,"attack":50,"defense":40,"sp_attack":40,"sp_defense":40,"speed":90,"total":300}},
  61: {"types":["水"],"abilities":[{"name":"储水","hidden":false,"effect":"受到水属性招式时不受伤害，并回复最大体力的1/4。"},{"name":"湿气","hidden":false,"effect":"在场时，自爆、大爆炸和引爆无法生效。"},{"name":"悠游自如","hidden":true,"effect":"下雨时速度变为2倍。"}],"stats":{"hp":65,"attack":65,"defense":65,"sp_attack":50,"sp_defense":50,"speed":90,"total":385}},
  62: {"types":["水","格斗"],"abilities":[{"name":"储水","hidden":false,"effect":"受到水属性招式时不受伤害，并回复最大体力的1/4。"},{"name":"湿气","hidden":false,"effect":"在场时，自爆、大爆炸和引爆无法生效。"},{"name":"悠游自如","hidden":true,"effect":"下雨时速度变为2倍。"}],"stats":{"hp":90,"attack":95,"defense":95,"sp_attack":70,"sp_defense":90,"speed":70,"total":510}},
  63: {"types":["超能力"],"abilities":[{"name":"同步","hidden":false,"effect":"受到灼伤、麻痹或中毒时，把同样的状态传给对方。"},{"name":"精神力","hidden":false,"effect":"不会畏缩。"},{"name":"魔法防守","hidden":true,"effect":"不会受到除招式以外的伤害。"}],"stats":{"hp":25,"attack":20,"defense":15,"sp_attack":105,"sp_defense":55,"speed":90,"total":310}},
  64: {"types":["超能力"],"abilities":[{"name":"同步","hidden":false,"effect":"受到灼伤、麻痹或中毒时，把同样的状态传给对方。"},{"name":"精神力","hidden":false,"effect":"不会畏缩。"},{"name":"魔法防守","hidden":true,"effect":"不会受到除招式以外的伤害。"}],"stats":{"hp":40,"attack":35,"defense":30,"sp_attack":120,"sp_defense":70,"speed":105,"total":400}},
  65: {"types":["超能力"],"abilities":[{"name":"同步","hidden":false,"effect":"受到灼伤、麻痹或中毒时，把同样的状态传给对方。"},{"name":"精神力","hidden":false,"effect":"不会畏缩。"},{"name":"魔法防守","hidden":true,"effect":"不会受到除招式以外的伤害。"}],"stats":{"hp":55,"attack":50,"defense":45,"sp_attack":135,"sp_defense":95,"speed":120,"total":500}},
  66: {"types":["格斗"],"abilities":[{"name":"毅力","hidden":false,"effect":"陷入异常状态时，攻击变为1.5倍，且不受灼伤的攻击减半影响。"},{"name":"无防守","hidden":false,"effect":"双方的招式一定会命中。"},{"name":"不屈之心","hidden":true,"effect":"畏缩时速度提升1级。"}],"stats":{"hp":70,"attack":80,"defense":50,"sp_attack":35,"sp_defense":35,"speed":35,"total":305}},
  67: {"types":["格斗"],"abilities":[{"name":"毅力","hidden":false,"effect":"陷入异常状态时，攻击变为1.5倍，且不受灼伤的攻击减半影响。"},{"name":"无防守","hidden":false,"effect":"双方的招式一定会命中。"},{"name":"不屈之心","hidden":true,"effect":"畏缩时速度提升1级。"}],"stats":{"hp":80,"attack":100,"defense":70,"sp_attack":50,"sp_defense":60,"speed":45,"total":405}},
  68: {"types":["格斗"],"abilities":[{"name":"毅力","hidden":false,"effect":"陷入异常状态时，攻击变为1.5倍，且不受灼伤的攻击减半影响。"},{"name":"无防守","hidden":false,"effect":"双方的招式一定会命中。"},{"name":"不屈之心","hidden":true,"effect":"畏缩时速度提升1级。"}],"stats":{"hp":90,"attack":130,"defense":80,"sp_attack":65,"sp_defense":85,"speed":55,"total":505}},
  69: {"types":["草","毒"],"abilities":[{"name":"叶绿素","hidden":false,"effect":"大晴天时速度变为2倍。"},{"name":"贪吃鬼","hidden":true,"effect":"体力低于一半时就会吃掉平时要低体力才触发的树果。"}],"stats":{"hp":50,"attack":75,"defense":35,"sp_attack":70,"sp_defense":30,"speed":40,"total":300}},
  70: {"types":["草","毒"],"abilities":[{"name":"叶绿素","hidden":false,"effect":"大晴天时速度变为2倍。"},{"name":"贪吃鬼","hidden":true,"effect":"体力低于一半时就会吃掉平时要低体力才触发的树果。"}],"stats":{"hp":65,"attack":90,"defense":50,"sp_attack":85,"sp_defense":45,"speed":55,"total":390}},
  71: {"types":["草","毒"],"abilities":[{"name":"叶绿素","hidden":false,"effect":"大晴天时速度变为2倍。"},{"name":"贪吃鬼","hidden":true,"effect":"体力低于一半时就会吃掉平时要低体力才触发的树果。"}],"stats":{"hp":80,"attack":105,"defense":65,"sp_attack":100,"sp_defense":70,"speed":70,"total":490}},
  72: {"types":["水","毒"],"abilities":[{"name":"恒净之躯","hidden":false,"effect":"不会因为对手的招式或特性而被降低能力。"},{"name":"污泥浆","hidden":false,"effect":"对手用吸取类招式时，本该回复的体力反而变成对它的伤害。"},{"name":"雨盘","hidden":true,"effect":"下雨时每回合结束回复最大体力的1/16。"}],"stats":{"hp":40,"attack":40,"defense":35,"sp_attack":50,"sp_defense":100,"speed":70,"total":335}},
  73: {"types":["水","毒"],"abilities":[{"name":"恒净之躯","hidden":false,"effect":"不会因为对手的招式或特性而被降低能力。"},{"name":"污泥浆","hidden":false,"effect":"对手用吸取类招式时，本该回复的体力反而变成对它的伤害。"},{"name":"雨盘","hidden":true,"effect":"下雨时每回合结束回复最大体力的1/16。"}],"stats":{"hp":80,"attack":70,"defense":65,"sp_attack":80,"sp_defense":120,"speed":100,"total":515}},
  74: {"types":["岩石","地面"],"abilities":[{"name":"坚硬脑袋","hidden":false,"effect":"不受招式的反作用伤害。"},{"name":"结实","hidden":false,"effect":"满体力时受到致命伤害会保留1点体力；一击必杀招式无效。"},{"name":"沙隐","hidden":true,"effect":"沙暴天气下闪避率提升到1.25倍，且不受沙暴伤害。"}],"stats":{"hp":40,"attack":80,"defense":100,"sp_attack":30,"sp_defense":30,"speed":20,"total":300}},
  75: {"types":["岩石","地面"],"abilities":[{"name":"坚硬脑袋","hidden":false,"effect":"不受招式的反作用伤害。"},{"name":"结实","hidden":false,"effect":"满体力时受到致命伤害会保留1点体力；一击必杀招式无效。"},{"name":"沙隐","hidden":true,"effect":"沙暴天气下闪避率提升到1.25倍，且不受沙暴伤害。"}],"stats":{"hp":55,"attack":95,"defense":115,"sp_attack":45,"sp_defense":45,"speed":35,"total":390}},
  76: {"types":["岩石","地面"],"abilities":[{"name":"坚硬脑袋","hidden":false,"effect":"不受招式的反作用伤害。"},{"name":"结实","hidden":false,"effect":"满体力时受到致命伤害会保留1点体力；一击必杀招式无效。"},{"name":"沙隐","hidden":true,"effect":"沙暴天气下闪避率提升到1.25倍，且不受沙暴伤害。"}],"stats":{"hp":80,"attack":120,"defense":130,"sp_attack":55,"sp_defense":65,"speed":45,"total":495}},
  77: {"types":["火"],"abilities":[{"name":"逃跑","hidden":false,"effect":"在野外战斗中一定能逃跑成功。"},{"name":"引火","hidden":false,"effect":"不受火属性招式伤害，挡下一次后自己的火属性招式威力变为1.5倍，直到离场。"},{"name":"火焰之躯","hidden":true,"effect":"受到接触类招式攻击时，有30%几率让对手灼伤。"}],"stats":{"hp":50,"attack":85,"defense":55,"sp_attack":65,"sp_defense":65,"speed":90,"total":410}},
  78: {"types":["火"],"abilities":[{"name":"逃跑","hidden":false,"effect":"在野外战斗中一定能逃跑成功。"},{"name":"引火","hidden":false,"effect":"不受火属性招式伤害，挡下一次后自己的火属性招式威力变为1.5倍，直到离场。"},{"name":"火焰之躯","hidden":true,"effect":"受到接触类招式攻击时，有30%几率让对手灼伤。"}],"stats":{"hp":65,"attack":100,"defense":70,"sp_attack":80,"sp_defense":80,"speed":105,"total":500}},
  79: {"types":["水","超能力"],"abilities":[{"name":"迟钝","hidden":false,"effect":"不会着迷，也不受迷人招式影响。"},{"name":"我行我素","hidden":false,"effect":"不会变为混乱状态。"},{"name":"再生力","hidden":true,"effect":"换下场时回复最大体力的1/3。"}],"stats":{"hp":90,"attack":65,"defense":65,"sp_attack":40,"sp_defense":40,"speed":15,"total":315}},
  80: {"types":["水","超能力"],"abilities":[{"name":"迟钝","hidden":false,"effect":"不会着迷，也不受迷人招式影响。"},{"name":"我行我素","hidden":false,"effect":"不会变为混乱状态。"},{"name":"再生力","hidden":true,"effect":"换下场时回复最大体力的1/3。"}],"stats":{"hp":95,"attack":75,"defense":110,"sp_attack":100,"sp_defense":80,"speed":30,"total":490}},
  81: {"types":["电","钢"],"abilities":[{"name":"磁力","hidden":false,"effect":"钢属性的对手无法逃走或换下场。"},{"name":"结实","hidden":false,"effect":"满体力时受到致命伤害会保留1点体力；一击必杀招式无效。"},{"name":"分析","hidden":true,"effect":"后出手时，招式威力变为1.3倍。"}],"stats":{"hp":25,"attack":35,"defense":70,"sp_attack":95,"sp_defense":55,"speed":45,"total":325}},
  82: {"types":["电","钢"],"abilities":[{"name":"磁力","hidden":false,"effect":"钢属性的对手无法逃走或换下场。"},{"name":"结实","hidden":false,"effect":"满体力时受到致命伤害会保留1点体力；一击必杀招式无效。"},{"name":"分析","hidden":true,"effect":"后出手时，招式威力变为1.3倍。"}],"stats":{"hp":50,"attack":60,"defense":95,"sp_attack":120,"sp_defense":70,"speed":70,"total":465}},
  83: {"types":["普通","飞行"],"abilities":[{"name":"锐利目光","hidden":false,"effect":"命中率不会被对手降低。"},{"name":"精神力","hidden":false,"effect":"不会畏缩。"},{"name":"不服输","hidden":true,"effect":"能力被对方降低时，攻击提升2级。"}],"stats":{"hp":52,"attack":90,"defense":55,"sp_attack":58,"sp_defense":62,"speed":60,"total":377}},
  84: {"types":["普通","飞行"],"abilities":[{"name":"逃跑","hidden":false,"effect":"在野外战斗中一定能逃跑成功。"},{"name":"早起","hidden":false,"effect":"睡眠状态会以2倍速度提前醒来。"},{"name":"蹒跚","hidden":true,"effect":"混乱时闪避率变为2倍。"}],"stats":{"hp":35,"attack":85,"defense":45,"sp_attack":35,"sp_defense":35,"speed":75,"total":310}},
  85: {"types":["普通","飞行"],"abilities":[{"name":"逃跑","hidden":false,"effect":"在野外战斗中一定能逃跑成功。"},{"name":"早起","hidden":false,"effect":"睡眠状态会以2倍速度提前醒来。"},{"name":"蹒跚","hidden":true,"effect":"混乱时闪避率变为2倍。"}],"stats":{"hp":60,"attack":110,"defense":70,"sp_attack":60,"sp_defense":60,"speed":110,"total":470}},
  86: {"types":["水"],"abilities":[{"name":"厚脂肪","hidden":false,"effect":"受到的火属性和冰属性伤害减半。"},{"name":"湿润之躯","hidden":false,"effect":"下雨时每回合结束治愈所有异常状态。"},{"name":"冰冻之躯","hidden":true,"effect":"冰雹天气下每回合结束回复最大体力的1/16。"}],"stats":{"hp":65,"attack":45,"defense":55,"sp_attack":45,"sp_defense":70,"speed":45,"total":325}},
  87: {"types":["水","冰"],"abilities":[{"name":"厚脂肪","hidden":false,"effect":"受到的火属性和冰属性伤害减半。"},{"name":"湿润之躯","hidden":false,"effect":"下雨时每回合结束治愈所有异常状态。"},{"name":"冰冻之躯","hidden":true,"effect":"冰雹天气下每回合结束回复最大体力的1/16。"}],"stats":{"hp":90,"attack":70,"defense":80,"sp_attack":70,"sp_defense":95,"speed":70,"total":475}},
  88: {"types":["毒"],"abilities":[{"name":"恶臭","hidden":false,"effect":"自己的招式命中时，有10%几率让对方畏缩。"},{"name":"黏着","hidden":false,"effect":"携带的道具不会被对手夺走。"},{"name":"毒手","hidden":true,"effect":"用接触类招式攻击时，有30%几率让对手中毒。"}],"stats":{"hp":80,"attack":80,"defense":50,"sp_attack":40,"sp_defense":50,"speed":25,"total":325}},
  89: {"types":["毒"],"abilities":[{"name":"恶臭","hidden":false,"effect":"自己的招式命中时，有10%几率让对方畏缩。"},{"name":"黏着","hidden":false,"effect":"携带的道具不会被对手夺走。"},{"name":"毒手","hidden":true,"effect":"用接触类招式攻击时，有30%几率让对手中毒。"}],"stats":{"hp":105,"attack":105,"defense":75,"sp_attack":65,"sp_defense":100,"speed":50,"total":500}},
  90: {"types":["水"],"abilities":[{"name":"硬壳盔甲","hidden":false,"effect":"不会受到会心一击。"},{"name":"连续攻击","hidden":false,"effect":"连续攻击类招式每次都打出最高次数。"},{"name":"防尘","hidden":true,"effect":"不受天气造成的伤害。"}],"stats":{"hp":30,"attack":65,"defense":100,"sp_attack":45,"sp_defense":25,"speed":40,"total":305}},
  91: {"types":["水","冰"],"abilities":[{"name":"硬壳盔甲","hidden":false,"effect":"不会受到会心一击。"},{"name":"连续攻击","hidden":false,"effect":"连续攻击类招式每次都打出最高次数。"},{"name":"防尘","hidden":true,"effect":"不受天气造成的伤害。"}],"stats":{"hp":50,"attack":95,"defense":180,"sp_attack":85,"sp_defense":45,"speed":70,"total":525}},
  92: {"types":["幽灵","毒"],"abilities":[{"name":"飘浮","hidden":false,"effect":"浮在地面上，不受地面属性招式攻击。"}],"stats":{"hp":30,"attack":35,"defense":30,"sp_attack":100,"sp_defense":35,"speed":80,"total":310}},
  93: {"types":["幽灵","毒"],"abilities":[{"name":"飘浮","hidden":false,"effect":"浮在地面上，不受地面属性招式攻击。"}],"stats":{"hp":45,"attack":50,"defense":45,"sp_attack":115,"sp_defense":55,"speed":95,"total":405}},
  94: {"types":["幽灵","毒"],"abilities":[{"name":"诅咒之躯","hidden":false,"effect":"受到攻击时，有30%几率把对手的招式变为定身法状态。"}],"stats":{"hp":60,"attack":65,"defense":60,"sp_attack":130,"sp_defense":75,"speed":110,"total":500}},
  95: {"types":["岩石","地面"],"abilities":[{"name":"坚硬脑袋","hidden":false,"effect":"不受招式的反作用伤害。"},{"name":"结实","hidden":false,"effect":"满体力时受到致命伤害会保留1点体力；一击必杀招式无效。"},{"name":"碎裂铠甲","hidden":true,"effect":"受到物理招式攻击时，速度提升1级、防御降低1级。"}],"stats":{"hp":35,"attack":45,"defense":160,"sp_attack":30,"sp_defense":45,"speed":70,"total":385}},
  96: {"types":["超能力"],"abilities":[{"name":"不眠","hidden":false,"effect":"不会陷入睡眠状态。"},{"name":"预知梦","hidden":false,"effect":"出场时可以看出对手最强的招式。"},{"name":"精神力","hidden":true,"effect":"不会畏缩。"}],"stats":{"hp":60,"attack":48,"defense":45,"sp_attack":43,"sp_defense":90,"speed":42,"total":328}},
  97: {"types":["超能力"],"abilities":[{"name":"不眠","hidden":false,"effect":"不会陷入睡眠状态。"},{"name":"预知梦","hidden":false,"effect":"出场时可以看出对手最强的招式。"},{"name":"精神力","hidden":true,"effect":"不会畏缩。"}],"stats":{"hp":85,"attack":73,"defense":70,"sp_attack":73,"sp_defense":115,"speed":67,"total":483}},
  98: {"types":["水"],"abilities":[{"name":"怪力钳","hidden":false,"effect":"攻击不会被其他宝可梦降低。"},{"name":"硬壳盔甲","hidden":false,"effect":"不会受到会心一击。"},{"name":"强行","hidden":true,"effect":"带追加效果的招式威力变为1.3倍，但追加效果不再触发。"}],"stats":{"hp":30,"attack":105,"defense":90,"sp_attack":25,"sp_defense":25,"speed":50,"total":325}},
  99: {"types":["水"],"abilities":[{"name":"怪力钳","hidden":false,"effect":"攻击不会被其他宝可梦降低。"},{"name":"硬壳盔甲","hidden":false,"effect":"不会受到会心一击。"},{"name":"强行","hidden":true,"effect":"带追加效果的招式威力变为1.3倍，但追加效果不再触发。"}],"stats":{"hp":55,"attack":130,"defense":115,"sp_attack":50,"sp_defense":50,"speed":75,"total":475}},
  100: {"types":["电"],"abilities":[{"name":"隔音","hidden":false,"effect":"不受声音类招式的攻击。"},{"name":"静电","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方麻痹。"},{"name":"引爆","hidden":true,"effect":"被接触类招式打倒时，对对手造成最大体力1/4的伤害。"}],"stats":{"hp":40,"attack":30,"defense":50,"sp_attack":55,"sp_defense":55,"speed":100,"total":330}},
  101: {"types":["电"],"abilities":[{"name":"隔音","hidden":false,"effect":"不受声音类招式的攻击。"},{"name":"静电","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方麻痹。"},{"name":"引爆","hidden":true,"effect":"被接触类招式打倒时，对对手造成最大体力1/4的伤害。"}],"stats":{"hp":60,"attack":50,"defense":70,"sp_attack":80,"sp_defense":80,"speed":150,"total":490}},
  102: {"types":["草","超能力"],"abilities":[{"name":"叶绿素","hidden":false,"effect":"大晴天时速度变为2倍。"},{"name":"收获","hidden":true,"effect":"每回合结束有50%几率恢复一次用掉的树果。"}],"stats":{"hp":60,"attack":40,"defense":80,"sp_attack":60,"sp_defense":45,"speed":40,"total":325}},
  103: {"types":["草","超能力"],"abilities":[{"name":"叶绿素","hidden":false,"effect":"大晴天时速度变为2倍。"},{"name":"收获","hidden":true,"effect":"每回合结束有50%几率恢复一次用掉的树果。"}],"stats":{"hp":95,"attack":95,"defense":85,"sp_attack":125,"sp_defense":75,"speed":55,"total":530}},
  104: {"types":["地面"],"abilities":[{"name":"坚硬脑袋","hidden":false,"effect":"不受招式的反作用伤害。"},{"name":"避雷针","hidden":false,"effect":"把单体电属性招式引到自己身上，吸收后特攻提升1级。"},{"name":"战斗盔甲","hidden":true,"effect":"不会受到会心一击。"}],"stats":{"hp":50,"attack":50,"defense":95,"sp_attack":40,"sp_defense":50,"speed":35,"total":320}},
  105: {"types":["地面"],"abilities":[{"name":"坚硬脑袋","hidden":false,"effect":"不受招式的反作用伤害。"},{"name":"避雷针","hidden":false,"effect":"把单体电属性招式引到自己身上，吸收后特攻提升1级。"},{"name":"战斗盔甲","hidden":true,"effect":"不会受到会心一击。"}],"stats":{"hp":60,"attack":80,"defense":110,"sp_attack":50,"sp_defense":80,"speed":45,"total":425}},
  106: {"types":["格斗"],"abilities":[{"name":"柔软","hidden":false,"effect":"不会陷入麻痹状态。"},{"name":"舍身","hidden":false,"effect":"有反作用伤害的招式威力变为1.2倍。"},{"name":"轻装","hidden":true,"effect":"失去携带的道具时，速度变为2倍。"}],"stats":{"hp":50,"attack":120,"defense":53,"sp_attack":35,"sp_defense":110,"speed":87,"total":455}},
  107: {"types":["格斗"],"abilities":[{"name":"锐利目光","hidden":false,"effect":"命中率不会被对手降低。"},{"name":"铁拳","hidden":false,"effect":"拳类招式的威力变为1.2倍。"},{"name":"精神力","hidden":true,"effect":"不会畏缩。"}],"stats":{"hp":50,"attack":105,"defense":79,"sp_attack":35,"sp_defense":110,"speed":76,"total":455}},
  108: {"types":["普通"],"abilities":[{"name":"我行我素","hidden":false,"effect":"不会变为混乱状态。"},{"name":"迟钝","hidden":false,"effect":"不会着迷，也不受迷人招式影响。"},{"name":"无关天气","hidden":true,"effect":"消除所有天气带来的效果，但天气本身不会消失。"}],"stats":{"hp":90,"attack":55,"defense":75,"sp_attack":60,"sp_defense":75,"speed":30,"total":385}},
  109: {"types":["毒"],"abilities":[{"name":"飘浮","hidden":false,"effect":"浮在地面上，不受地面属性招式攻击。"},{"name":"化学变化气体","hidden":false,"effect":"在场时，场上所有宝可梦的特性效果都会消失。"},{"name":"恶臭","hidden":true,"effect":"自己的招式命中时，有10%几率让对方畏缩。"}],"stats":{"hp":40,"attack":65,"defense":95,"sp_attack":60,"sp_defense":45,"speed":35,"total":340}},
  110: {"types":["毒"],"abilities":[{"name":"飘浮","hidden":false,"effect":"浮在地面上，不受地面属性招式攻击。"},{"name":"化学变化气体","hidden":false,"effect":"在场时，场上所有宝可梦的特性效果都会消失。"},{"name":"恶臭","hidden":true,"effect":"自己的招式命中时，有10%几率让对方畏缩。"}],"stats":{"hp":65,"attack":90,"defense":120,"sp_attack":85,"sp_defense":70,"speed":60,"total":490}},
  111: {"types":["地面","岩石"],"abilities":[{"name":"避雷针","hidden":false,"effect":"把单体电属性招式引到自己身上，吸收后特攻提升1级。"},{"name":"坚硬脑袋","hidden":false,"effect":"不受招式的反作用伤害。"},{"name":"舍身","hidden":true,"effect":"有反作用伤害的招式威力变为1.2倍。"}],"stats":{"hp":80,"attack":85,"defense":95,"sp_attack":30,"sp_defense":30,"speed":25,"total":345}},
  112: {"types":["地面","岩石"],"abilities":[{"name":"避雷针","hidden":false,"effect":"把单体电属性招式引到自己身上，吸收后特攻提升1级。"},{"name":"坚硬脑袋","hidden":false,"effect":"不受招式的反作用伤害。"},{"name":"舍身","hidden":true,"effect":"有反作用伤害的招式威力变为1.2倍。"}],"stats":{"hp":105,"attack":130,"defense":120,"sp_attack":45,"sp_defense":45,"speed":40,"total":485}},
  113: {"types":["普通"],"abilities":[{"name":"自然回复","hidden":false,"effect":"换下场时治愈所有异常状态。"},{"name":"天恩","hidden":false,"effect":"招式的追加效果出现几率变为2倍。"},{"name":"治愈之心","hidden":true,"effect":"每回合结束有30%几率治愈身边同伴的异常状态。"}],"stats":{"hp":250,"attack":5,"defense":5,"sp_attack":35,"sp_defense":105,"speed":50,"total":450}},
  114: {"types":["草"],"abilities":[{"name":"叶绿素","hidden":false,"effect":"大晴天时速度变为2倍。"},{"name":"叶子防守","hidden":false,"effect":"大晴天时不会陷入异常状态。"},{"name":"再生力","hidden":true,"effect":"换下场时回复最大体力的1/3。"}],"stats":{"hp":65,"attack":55,"defense":115,"sp_attack":100,"sp_defense":40,"speed":60,"total":435}},
  115: {"types":["普通"],"abilities":[{"name":"早起","hidden":false,"effect":"睡眠状态会以2倍速度提前醒来。"},{"name":"胆量","hidden":false,"effect":"一般属性和格斗属性的招式可以击中幽灵属性的宝可梦。"},{"name":"精神力","hidden":true,"effect":"不会畏缩。"}],"stats":{"hp":105,"attack":95,"defense":80,"sp_attack":40,"sp_defense":80,"speed":90,"total":490}},
  116: {"types":["水"],"abilities":[{"name":"悠游自如","hidden":false,"effect":"下雨时速度变为2倍。"},{"name":"狙击手","hidden":false,"effect":"击中要害时，伤害变为3倍。"},{"name":"湿气","hidden":true,"effect":"在场时，自爆、大爆炸和引爆无法生效。"}],"stats":{"hp":30,"attack":40,"defense":70,"sp_attack":70,"sp_defense":25,"speed":60,"total":295}},
  117: {"types":["水"],"abilities":[{"name":"毒刺","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对手中毒。"},{"name":"狙击手","hidden":false,"effect":"击中要害时，伤害变为3倍。"},{"name":"湿气","hidden":true,"effect":"在场时，自爆、大爆炸和引爆无法生效。"}],"stats":{"hp":55,"attack":65,"defense":95,"sp_attack":95,"sp_defense":45,"speed":85,"total":440}},
  118: {"types":["水"],"abilities":[{"name":"悠游自如","hidden":false,"effect":"下雨时速度变为2倍。"},{"name":"水幕","hidden":false,"effect":"不会陷入灼伤状态。"},{"name":"避雷针","hidden":true,"effect":"把单体电属性招式引到自己身上，吸收后特攻提升1级。"}],"stats":{"hp":45,"attack":67,"defense":60,"sp_attack":35,"sp_defense":50,"speed":63,"total":320}},
  119: {"types":["水"],"abilities":[{"name":"悠游自如","hidden":false,"effect":"下雨时速度变为2倍。"},{"name":"水幕","hidden":false,"effect":"不会陷入灼伤状态。"},{"name":"避雷针","hidden":true,"effect":"把单体电属性招式引到自己身上，吸收后特攻提升1级。"}],"stats":{"hp":80,"attack":92,"defense":65,"sp_attack":65,"sp_defense":80,"speed":68,"total":450}},
  120: {"types":["水"],"abilities":[{"name":"发光","hidden":false,"effect":"遇到野生宝可梦的几率变为2倍。"},{"name":"自然回复","hidden":false,"effect":"换下场时治愈所有异常状态。"},{"name":"分析","hidden":true,"effect":"后出手时，招式威力变为1.3倍。"}],"stats":{"hp":30,"attack":45,"defense":55,"sp_attack":70,"sp_defense":55,"speed":85,"total":340}},
  121: {"types":["水","超能力"],"abilities":[{"name":"发光","hidden":false,"effect":"遇到野生宝可梦的几率变为2倍。"},{"name":"自然回复","hidden":false,"effect":"换下场时治愈所有异常状态。"},{"name":"分析","hidden":true,"effect":"后出手时，招式威力变为1.3倍。"}],"stats":{"hp":60,"attack":75,"defense":85,"sp_attack":100,"sp_defense":85,"speed":115,"total":520}},
  122: {"types":["超能力","妖精"],"abilities":[{"name":"隔音","hidden":false,"effect":"不受声音类招式的攻击。"},{"name":"过滤","hidden":false,"effect":"受到效果绝佳的招式攻击时，伤害减少1/4。"},{"name":"技术高手","hidden":true,"effect":"威力60及以下的招式威力变为1.5倍。"}],"stats":{"hp":40,"attack":45,"defense":65,"sp_attack":100,"sp_defense":120,"speed":90,"total":460}},
  123: {"types":["虫","飞行"],"abilities":[{"name":"虫之预感","hidden":false,"effect":"体力降到三分之一或以下时，虫属性招式威力变为1.5倍。"},{"name":"技术高手","hidden":false,"effect":"威力60及以下的招式威力变为1.5倍。"},{"name":"不屈之心","hidden":true,"effect":"畏缩时速度提升1级。"}],"stats":{"hp":70,"attack":110,"defense":80,"sp_attack":55,"sp_defense":80,"speed":105,"total":500}},
  124: {"types":["冰","超能力"],"abilities":[{"name":"迟钝","hidden":false,"effect":"不会着迷，也不受迷人招式影响。"},{"name":"预知梦","hidden":false,"effect":"出场时可以看出对手最强的招式。"},{"name":"干燥皮肤","hidden":true,"effect":"受到水属性招式攻击时回复体力；受到火属性招式攻击时伤害变为1.25倍。"}],"stats":{"hp":65,"attack":50,"defense":35,"sp_attack":115,"sp_defense":95,"speed":95,"total":455}},
  125: {"types":["电"],"abilities":[{"name":"静电","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方麻痹。"},{"name":"干劲","hidden":true,"effect":"不会陷入睡眠状态。"}],"stats":{"hp":65,"attack":83,"defense":57,"sp_attack":95,"sp_defense":85,"speed":105,"total":490}},
  126: {"types":["火"],"abilities":[{"name":"火焰之躯","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对手灼伤。"},{"name":"干劲","hidden":true,"effect":"不会陷入睡眠状态。"}],"stats":{"hp":65,"attack":95,"defense":57,"sp_attack":100,"sp_defense":85,"speed":93,"total":495}},
  127: {"types":["虫"],"abilities":[{"name":"怪力钳","hidden":false,"effect":"攻击不会被其他宝可梦降低。"},{"name":"破格","hidden":false,"effect":"招式可以无视对手的特性发动。"},{"name":"自信过度","hidden":true,"effect":"打倒对手的宝可梦时，攻击提升1级。"}],"stats":{"hp":65,"attack":125,"defense":100,"sp_attack":55,"sp_defense":70,"speed":85,"total":500}},
  128: {"types":["普通"],"abilities":[{"name":"威吓","hidden":false,"effect":"出场时降低对手的攻击1级。"},{"name":"愤怒穴位","hidden":false,"effect":"受到会心一击时，攻击提升到最大。"},{"name":"强行","hidden":true,"effect":"带追加效果的招式威力变为1.3倍，但追加效果不再触发。"}],"stats":{"hp":75,"attack":100,"defense":95,"sp_attack":40,"sp_defense":70,"speed":110,"total":490}},
  129: {"types":["水"],"abilities":[{"name":"悠游自如","hidden":false,"effect":"下雨时速度变为2倍。"},{"name":"胆怯","hidden":true,"effect":"受到恶、幽灵、虫属性招式攻击时，速度提升1级。"}],"stats":{"hp":20,"attack":10,"defense":55,"sp_attack":15,"sp_defense":20,"speed":80,"total":200}},
  130: {"types":["水","飞行"],"abilities":[{"name":"威吓","hidden":false,"effect":"出场时降低对手的攻击1级。"},{"name":"自信过度","hidden":true,"effect":"打倒对手的宝可梦时，攻击提升1级。"}],"stats":{"hp":95,"attack":125,"defense":79,"sp_attack":60,"sp_defense":100,"speed":81,"total":540}},
  131: {"types":["水","冰"],"abilities":[{"name":"储水","hidden":false,"effect":"受到水属性招式时不受伤害，并回复最大体力的1/4。"},{"name":"硬壳盔甲","hidden":false,"effect":"不会受到会心一击。"},{"name":"湿润之躯","hidden":true,"effect":"下雨时每回合结束治愈所有异常状态。"}],"stats":{"hp":130,"attack":85,"defense":80,"sp_attack":85,"sp_defense":95,"speed":60,"total":535}},
  132: {"types":["普通"],"abilities":[{"name":"柔软","hidden":false,"effect":"不会陷入麻痹状态。"},{"name":"变身者","hidden":true,"effect":"出场时变身成对手的样子。"}],"stats":{"hp":48,"attack":48,"defense":48,"sp_attack":48,"sp_defense":48,"speed":48,"total":288}},
  133: {"types":["普通"],"abilities":[{"name":"逃跑","hidden":false,"effect":"在野外战斗中一定能逃跑成功。"},{"name":"适应力","hidden":false,"effect":"本系招式的威力加成从1.5倍提升到2倍。"},{"name":"危险预知","hidden":true,"effect":"出场时，如果对手有克制自己的招式、自爆类招式或一击必杀招式，就会发出警示。"}],"stats":{"hp":55,"attack":55,"defense":50,"sp_attack":45,"sp_defense":65,"speed":55,"total":325}},
  134: {"types":["水"],"abilities":[{"name":"储水","hidden":false,"effect":"受到水属性招式时不受伤害，并回复最大体力的1/4。"},{"name":"湿润之躯","hidden":true,"effect":"下雨时每回合结束治愈所有异常状态。"}],"stats":{"hp":130,"attack":65,"defense":60,"sp_attack":110,"sp_defense":95,"speed":65,"total":525}},
  135: {"types":["电"],"abilities":[{"name":"蓄电","hidden":false,"effect":"受到电属性招式时不受伤害，并回复最大体力的1/4。"},{"name":"飞毛腿","hidden":true,"effect":"陷入异常状态时，速度变为1.5倍。"}],"stats":{"hp":65,"attack":65,"defense":60,"sp_attack":110,"sp_defense":95,"speed":130,"total":525}},
  136: {"types":["火"],"abilities":[{"name":"引火","hidden":false,"effect":"不受火属性招式伤害，挡下一次后自己的火属性招式威力变为1.5倍，直到离场。"},{"name":"毅力","hidden":true,"effect":"陷入异常状态时，攻击变为1.5倍，且不受灼伤的攻击减半影响。"}],"stats":{"hp":65,"attack":130,"defense":60,"sp_attack":95,"sp_defense":110,"speed":65,"total":525}},
  137: {"types":["普通"],"abilities":[{"name":"复制","hidden":false,"effect":"出场时复制对手的特性。"},{"name":"下载","hidden":false,"effect":"出场时根据对手防御较低的一项，提升对应的攻击1级。"},{"name":"分析","hidden":true,"effect":"后出手时，招式威力变为1.3倍。"}],"stats":{"hp":65,"attack":60,"defense":70,"sp_attack":85,"sp_defense":75,"speed":40,"total":395}},
  138: {"types":["岩石","水"],"abilities":[{"name":"悠游自如","hidden":false,"effect":"下雨时速度变为2倍。"},{"name":"硬壳盔甲","hidden":false,"effect":"不会受到会心一击。"},{"name":"碎裂铠甲","hidden":true,"effect":"受到物理招式攻击时，速度提升1级、防御降低1级。"}],"stats":{"hp":35,"attack":40,"defense":100,"sp_attack":90,"sp_defense":55,"speed":35,"total":355}},
  139: {"types":["岩石","水"],"abilities":[{"name":"悠游自如","hidden":false,"effect":"下雨时速度变为2倍。"},{"name":"硬壳盔甲","hidden":false,"effect":"不会受到会心一击。"},{"name":"碎裂铠甲","hidden":true,"effect":"受到物理招式攻击时，速度提升1级、防御降低1级。"}],"stats":{"hp":70,"attack":60,"defense":125,"sp_attack":115,"sp_defense":70,"speed":55,"total":495}},
  140: {"types":["岩石","水"],"abilities":[{"name":"悠游自如","hidden":false,"effect":"下雨时速度变为2倍。"},{"name":"战斗盔甲","hidden":false,"effect":"不会受到会心一击。"},{"name":"碎裂铠甲","hidden":true,"effect":"受到物理招式攻击时，速度提升1级、防御降低1级。"}],"stats":{"hp":30,"attack":80,"defense":90,"sp_attack":55,"sp_defense":45,"speed":55,"total":355}},
  141: {"types":["岩石","水"],"abilities":[{"name":"悠游自如","hidden":false,"effect":"下雨时速度变为2倍。"},{"name":"战斗盔甲","hidden":false,"effect":"不会受到会心一击。"},{"name":"碎裂铠甲","hidden":true,"effect":"受到物理招式攻击时，速度提升1级、防御降低1级。"}],"stats":{"hp":60,"attack":115,"defense":105,"sp_attack":65,"sp_defense":70,"speed":80,"total":495}},
  142: {"types":["岩石","飞行"],"abilities":[{"name":"坚硬脑袋","hidden":false,"effect":"不受招式的反作用伤害。"},{"name":"压迫感","hidden":false,"effect":"对手针对自己的招式，PP消耗增加1点。"},{"name":"紧张感","hidden":true,"effect":"对手无法吃下携带的树果。"}],"stats":{"hp":80,"attack":105,"defense":65,"sp_attack":60,"sp_defense":75,"speed":130,"total":515}},
  143: {"types":["普通"],"abilities":[{"name":"免疫","hidden":false,"effect":"不会陷入中毒状态。"},{"name":"厚脂肪","hidden":false,"effect":"受到的火属性和冰属性伤害减半。"},{"name":"贪吃鬼","hidden":true,"effect":"体力低于一半时就会吃掉平时要低体力才触发的树果。"}],"stats":{"hp":160,"attack":110,"defense":65,"sp_attack":65,"sp_defense":110,"speed":30,"total":540}},
  144: {"types":["冰","飞行"],"abilities":[{"name":"压迫感","hidden":false,"effect":"对手针对自己的招式，PP消耗增加1点。"},{"name":"雪隐","hidden":true,"effect":"冰雹天气下闪避率提升到1.25倍，且不受冰雹伤害。"}],"stats":{"hp":90,"attack":85,"defense":100,"sp_attack":95,"sp_defense":125,"speed":85,"total":580}},
  145: {"types":["电","飞行"],"abilities":[{"name":"压迫感","hidden":false,"effect":"对手针对自己的招式，PP消耗增加1点。"},{"name":"静电","hidden":true,"effect":"受到接触类招式攻击时，有30%几率让对方麻痹。"}],"stats":{"hp":90,"attack":90,"defense":85,"sp_attack":125,"sp_defense":90,"speed":100,"total":580}},
  146: {"types":["火","飞行"],"abilities":[{"name":"压迫感","hidden":false,"effect":"对手针对自己的招式，PP消耗增加1点。"},{"name":"火焰之躯","hidden":true,"effect":"受到接触类招式攻击时，有30%几率让对手灼伤。"}],"stats":{"hp":90,"attack":100,"defense":90,"sp_attack":125,"sp_defense":85,"speed":90,"total":580}},
  147: {"types":["龙"],"abilities":[{"name":"蜕皮","hidden":false,"effect":"每回合结束有33%几率治愈所有异常状态。"},{"name":"神奇鳞片","hidden":true,"effect":"陷入异常状态时，防御变为1.5倍。"}],"stats":{"hp":41,"attack":64,"defense":45,"sp_attack":50,"sp_defense":50,"speed":50,"total":300}},
  148: {"types":["龙"],"abilities":[{"name":"蜕皮","hidden":false,"effect":"每回合结束有33%几率治愈所有异常状态。"},{"name":"神奇鳞片","hidden":true,"effect":"陷入异常状态时，防御变为1.5倍。"}],"stats":{"hp":61,"attack":84,"defense":65,"sp_attack":70,"sp_defense":70,"speed":70,"total":420}},
  149: {"types":["龙","飞行"],"abilities":[{"name":"精神力","hidden":false,"effect":"不会畏缩。"},{"name":"多重鳞片","hidden":true,"effect":"满体力时受到的伤害减半。"}],"stats":{"hp":91,"attack":134,"defense":95,"sp_attack":100,"sp_defense":100,"speed":80,"total":600}},
  150: {"types":["超能力"],"abilities":[{"name":"压迫感","hidden":false,"effect":"对手针对自己的招式，PP消耗增加1点。"},{"name":"紧张感","hidden":true,"effect":"对手无法吃下携带的树果。"}],"stats":{"hp":106,"attack":110,"defense":90,"sp_attack":154,"sp_defense":90,"speed":130,"total":680}},
  151: {"types":["超能力"],"abilities":[{"name":"同步","hidden":false,"effect":"受到灼伤、麻痹或中毒时，把同样的状态传给对方。"}],"stats":{"hp":100,"attack":100,"defense":100,"sp_attack":100,"sp_defense":100,"speed":100,"total":600}},
  172: {"types":["电"],"abilities":[{"name":"静电","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方麻痹。"},{"name":"避雷针","hidden":true,"effect":"把单体电属性招式引到自己身上，吸收后特攻提升1级。"}],"stats":{"hp":20,"attack":40,"defense":15,"sp_attack":35,"sp_defense":35,"speed":60,"total":205}},
  179: {"types":["电"],"abilities":[{"name":"静电","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方麻痹。"},{"name":"正电","hidden":true,"effect":"同伴有正电或负电特性时，特攻变为1.5倍。"}],"stats":{"hp":55,"attack":40,"defense":40,"sp_attack":65,"sp_defense":45,"speed":35,"total":280}},
  180: {"types":["电"],"abilities":[{"name":"静电","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方麻痹。"},{"name":"正电","hidden":true,"effect":"同伴有正电或负电特性时，特攻变为1.5倍。"}],"stats":{"hp":70,"attack":55,"defense":55,"sp_attack":80,"sp_defense":60,"speed":45,"total":365}},
  181: {"types":["电"],"abilities":[{"name":"静电","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方麻痹。"},{"name":"正电","hidden":true,"effect":"同伴有正电或负电特性时，特攻变为1.5倍。"}],"stats":{"hp":90,"attack":75,"defense":85,"sp_attack":115,"sp_defense":90,"speed":55,"total":510}},
  196: {"types":["超能力"],"abilities":[{"name":"同步","hidden":false,"effect":"受到灼伤、麻痹或中毒时，把同样的状态传给对方。"},{"name":"魔法镜","hidden":true,"effect":"把对手使用的变化招式反弹回去。"}],"stats":{"hp":65,"attack":65,"defense":60,"sp_attack":130,"sp_defense":95,"speed":110,"total":525}},
  197: {"types":["恶"],"abilities":[{"name":"同步","hidden":false,"effect":"受到灼伤、麻痹或中毒时，把同样的状态传给对方。"},{"name":"精神力","hidden":true,"effect":"不会畏缩。"}],"stats":{"hp":95,"attack":65,"defense":110,"sp_attack":60,"sp_defense":130,"speed":65,"total":525}},
  208: {"types":["钢","地面"],"abilities":[{"name":"坚硬脑袋","hidden":false,"effect":"不受招式的反作用伤害。"},{"name":"结实","hidden":false,"effect":"满体力时受到致命伤害会保留1点体力；一击必杀招式无效。"},{"name":"强行","hidden":true,"effect":"带追加效果的招式威力变为1.3倍，但追加效果不再触发。"}],"stats":{"hp":75,"attack":85,"defense":200,"sp_attack":55,"sp_defense":65,"speed":30,"total":510}},
  212: {"types":["虫","钢"],"abilities":[{"name":"虫之预感","hidden":false,"effect":"体力降到三分之一或以下时，虫属性招式威力变为1.5倍。"},{"name":"技术高手","hidden":false,"effect":"威力60及以下的招式威力变为1.5倍。"},{"name":"轻金属","hidden":true,"effect":"体重变为原来的一半。"}],"stats":{"hp":70,"attack":130,"defense":100,"sp_attack":55,"sp_defense":80,"speed":65,"total":500}},
  464: {"types":["地面","岩石"],"abilities":[{"name":"避雷针","hidden":false,"effect":"把单体电属性招式引到自己身上，吸收后特攻提升1级。"},{"name":"坚硬岩石","hidden":false,"effect":"受到效果绝佳的招式时，伤害降为0.75倍。"},{"name":"舍身","hidden":true,"effect":"有反作用伤害的招式威力变为1.2倍。"}],"stats":{"hp":115,"attack":140,"defense":130,"sp_attack":55,"sp_defense":55,"speed":40,"total":535}},
  466: {"types":["电"],"abilities":[{"name":"电气引擎","hidden":false,"effect":"受到电属性招式时不受伤害，速度提升1级。"},{"name":"干劲","hidden":true,"effect":"不会陷入睡眠状态。"}],"stats":{"hp":75,"attack":123,"defense":67,"sp_attack":95,"sp_defense":85,"speed":95,"total":540}},
  470: {"types":["草"],"abilities":[{"name":"叶子防守","hidden":false,"effect":"大晴天时不会陷入异常状态。"},{"name":"叶绿素","hidden":true,"effect":"大晴天时速度变为2倍。"}],"stats":{"hp":65,"attack":110,"defense":130,"sp_attack":60,"sp_defense":65,"speed":95,"total":525}},
  471: {"types":["冰"],"abilities":[{"name":"雪隐","hidden":false,"effect":"冰雹天气下闪避率提升到1.25倍，且不受冰雹伤害。"},{"name":"冰冻之躯","hidden":true,"effect":"冰雹天气下每回合结束回复最大体力的1/16。"}],"stats":{"hp":65,"attack":60,"defense":110,"sp_attack":130,"sp_defense":95,"speed":65,"total":525}},
  700: {"types":["妖精"],"abilities":[{"name":"迷人之躯","hidden":false,"effect":"受到接触类招式攻击时，有30%几率让对方着迷。"},{"name":"妖精皮肤","hidden":true,"effect":"普通属性招式变为妖精属性，威力变为1.2倍。"}],"stats":{"hp":95,"attack":65,"defense":65,"sp_attack":110,"sp_defense":130,"speed":60,"total":525}},
  900: {"types":["虫","岩石"],"abilities":[{"name":"虫之预感","hidden":false,"effect":"体力降到三分之一或以下时，虫属性招式威力变为1.5倍。"},{"name":"强行","hidden":false,"effect":"带追加效果的招式威力变为1.3倍，但追加效果不再触发。"},{"name":"锋锐","hidden":true,"effect":"切割类招式的威力变为1.5倍。"}],"stats":{"hp":70,"attack":135,"defense":95,"sp_attack":45,"sp_defense":70,"speed":85,"total":500}},
};
/* DEX_DETAILS:END */

/* 官方招式查询（2026-11-06 移出 DEX_DETAILS 生成区：gen-dex-details --write 会重写
 * BEGIN/END 之间全部内容，函数放里面会被删——此前 officialMove/officialAccuracy 即因此丢失，
 * 导致模块无法导入；今后任何手工代码都不得放进 BEGIN/END 之间）。 */
function officialMove(name) {
  const m = MOVES_OFFICIAL[name];
  return m ? { type: m.type, damage_class: m.damage_class } : null;
}

/* 收藏宠（备战）招式：每种 2 个原创招式（名称 + 威力），属性同该宠属性 */
const COLLECTION_MOVES = {
  39: [['摇篮小曲', 40], ['连环小巴掌', 52]],
  54: [['头痛水花', 46], ['念力头槌', 60]],
  43: [['飞叶小刀', 48], ['花粉喷雾', 40]],
  16: [['旋风小翅', 44], ['俯冲啄击', 56]],
  50: [['挖洞突袭', 46], ['泥巴投掷', 40]],
  37: [['火焰小尾', 44], ['火花飞舞', 54]],
  74: [['滚动撞击', 46], ['落石小雨', 56]],
  98: [['水泡连弹', 46], ['蟹钳重击', 56]],
  179: [['静电绒毛', 42], ['小小雷光', 54]],
  58: [['小火轮', 46], ['火焰冲锋', 56]],
  123: [['旋风连斩', 52], ['镰刀疾风', 60]],
  111: [['独角猛撞', 58], ['大地践踏', 62]],
  143: [['呼噜冲击', 54], ['大肚子压顶', 66]],
  131: [['乘浪冲锋', 52], ['冰晶水炮', 62]],
  133: [['星星冲撞', 46], ['毛茸茸连打', 56]],
  147: [['小龙卷', 54], ['龙尾轻扫', 60]],
  151: [['梦幻泡泡', 54], ['心灵星光', 66]],
  // v11 进化补全（2026-10-26）：29 只，每种 2 个原创招式
  17: [['烈风小翅', 46], ['回旋啄击', 58]],
  18: [['疾风烈翅', 56], ['勇鸟俯冲', 66]],
  38: [['妖火小尾', 54], ['神通烈焰', 64]],
  40: [['催眠歌谣', 48], ['连环巴掌', 56]],
  44: [['臭臭花粉', 46], ['溶解液飞溅', 56]],
  51: [['三重挖洞', 52], ['地震小浪', 60]],
  55: [['水流利爪', 54], ['幻象头槌', 62]],
  59: [['神速冲锋', 58], ['烈焰旋涡', 64]],
  75: [['滚动巨石', 50], ['落石重雨', 58]],
  76: [['重磅滚动', 58], ['岩崩巨石', 66]],
  99: [['巨钳夹击', 54], ['蟹钳重锤', 62]],
  112: [['独角钻击', 58], ['岩石巨炮', 66]],
  134: [['水流环', 54], ['水炮冲击', 62]],
  135: [['电光针', 54], ['十万伏特', 64]],
  136: [['火焰旋涡', 54], ['喷射火焰', 64]],
  148: [['龙卷小浪', 54], ['龙之波动', 62]],
  149: [['龙爪重击', 60], ['龙星群', 66]],
  180: [['电绒毛', 44], ['充电光束', 54]],
  181: [['雷电拳', 56], ['打雷', 64]],
  196: [['晨光念力', 54], ['预知未来', 62]],
  197: [['月光守护', 50], ['暗影球', 60]],
  208: [['钢尾重击', 58], ['铁头冲撞', 64]],
  212: [['子弹拳', 56], ['十字剪', 64]],
  464: [['岩石重炮', 60], ['超级角击', 66]],
  466: [['电击魔掌', 56], ['等离子闪电拳', 64]],
  470: [['叶刃斩', 54], ['日光刃', 62]],
  471: [['冰砾飞溅', 54], ['暴风雪', 64]],
  700: [['妖精之风', 52], ['魔法闪耀', 62]],
  900: [['石斧劈砍', 58], ['岩石利刃', 64]],
  // 第二批（2026-11-06）：20 只，每种 2 个原创招式
  10: [['吐丝小网', 40], ['虫咬连珠', 50]],
  11: [['硬壳撞击', 42], ['铁壁滚动', 52]],
  12: [['蝶粉飞舞', 46], ['彩翼旋风', 58]],
  13: [['毒针突刺', 42], ['虫咬小钻', 52]],
  14: [['硬壳守护', 40], ['铁壁撞击', 50]],
  15: [['双针连刺', 48], ['毒蜂冲刺', 60]],
  19: [['门牙快咬', 44], ['电光鼠冲', 54]],
  20: [['必杀门牙', 52], ['疯狂乱咬', 62]],
  21: [['啄击连珠', 44], ['烈雀俯冲', 56]],
  22: [['长喙突刺', 50], ['神鸟俯冲', 62]],
  23: [['毒蛇缠绕', 46], ['毒液喷溅', 56]],
  24: [['眼镜蛇威吓', 52], ['毒雾旋涡', 62]],
  27: [['沙丘滚动', 46], ['利爪挖洞', 56]],
  28: [['沙暴利爪', 54], ['尖刺滚动', 64]],
  29: [['毒针轻刺', 44], ['小角顶撞', 54]],
  30: [['毒针飞刺', 48], ['双足连踢', 58]],
  31: [['钻锥冲撞', 56], ['大地重击', 66]],
  32: [['小角突刺', 44], ['毒针乱刺', 54]],
  33: [['尖角冲刺', 48], ['毒角猛撞', 58]],
  34: [['巨角钻击', 58], ['王者地震', 66]],
  // 第三批（2026-11-06）：20 只，每种 2 个原创招式
  35: [['月光小曲', 42], ['手指连弹', 52]],
  36: [['月光大曲', 52], ['妖精光环', 62]],
  41: [['超音波', 44], ['蝙蝠俯冲', 56]],
  42: [['超音巨波', 52], ['大嘴突袭', 62]],
  46: [['孢子飞舞', 44], ['蘑菇重击', 54]],
  47: [['孢子毒雾', 52], ['巨菇重锤', 62]],
  48: [['复眼凝视', 42], ['绒毛冲撞', 52]],
  49: [['鳞粉风暴', 50], ['毒粉旋风', 60]],
  52: [['招财金币', 46], ['利爪连击', 56]],
  53: [['金币飞镖', 54], ['猫王利爪', 64]],
  56: [['猴拳连打', 46], ['愤怒冲撞', 56]],
  57: [['火爆重拳', 54], ['怒火冲锋', 64]],
  60: [['漩涡水花', 44], ['蝌蚪冲刺', 54]],
  61: [['漩涡连拳', 52], ['水流鞭打', 62]],
  62: [['漩涡重拳', 56], ['水流爆破', 66]],
  63: [['汤匙弯曲', 44], ['念力瞬移', 54]],
  64: [['汤匙重击', 52], ['念力冲击', 62]],
  65: [['双匙念力', 58], ['超能风暴', 66]],
  66: [['四臂重拳', 48], ['肌肉冲撞', 58]],
  67: [['大力金刚拳', 56], ['四臂连击', 64]],
  // 第四批（2026-11-06）：20 只，每种 2 个原创招式
  68: [['四拳连打', 56], ['怪力金刚拳', 66]],
  69: [['藤蔓轻缠', 42], ['花苞冲撞', 52]],
  70: [['捕蝇大口', 50], ['酸液喷洒', 60]],
  71: [['甜香陷阱', 56], ['大食花巨口', 66]],
  72: [['触手轻刺', 42], ['水泡飘撞', 52]],
  73: [['毒刺连鞭', 56], ['毒海巨浪', 66]],
  77: [['火鬃冲刺', 44], ['烈焰小跑', 54]],
  78: [['烈焰冲锋', 56], ['火鬃旋风', 66]],
  79: [['呆呆一拍', 42], ['尾巴钓鱼', 52]],
  80: [['贝壳重压', 54], ['呆壳巨钳', 64]],
  81: [['磁力小吸', 42], ['铁球滚动', 52]],
  82: [['三磁合击', 56], ['磁暴冲击', 66]],
  83: [['大葱挥击', 52], ['黄嘴鸭冲刺', 62]],
  84: [['双头啄击', 44], ['飞毛腿冲刺', 54]],
  85: [['三头连啄', 56], ['草原疾风', 66]],
  86: [['海狮拍水', 42], ['冰凉冲撞', 52]],
  87: [['雪白冲浪', 56], ['寒冰巨浪', 66]],
  88: [['污泥泼洒', 44], ['臭气冲撞', 54]],
  89: [['臭泥巨浪', 56], ['剧毒泥沼', 66]],
  90: [['贝壳重撞', 44], ['双壳夹击', 54]],
  // 第五批（2026-11-06）：20 只，每种 2 个原创招式
  91: [['冰壳重压', 44], ['尖刺连射', 54]],
  92: [['幽影飘忽', 42], ['黑雾缠绕', 52]],
  93: [['鬼手抓挠', 44], ['影子偷袭', 54]],
  94: [['邪笑突袭', 46], ['暗影爆裂', 54]],
  96: [['催眠摆锤', 42], ['梦境低语', 52]],
  97: [['催眠圆舞', 44], ['梦魇重压', 54]],
  100: [['电光滚动', 44], ['霹雳爆弹', 54]],
  101: [['雷光疾走', 46], ['万伏爆鸣', 54]],
  102: [['蛋壳齐鸣', 42], ['六蛋连撞', 52]],
  103: [['椰子重炮', 46], ['巨树摇撼', 54]],
  104: [['骨棒挥击', 44], ['孤影重击', 54]],
  105: [['骨锤横扫', 46], ['亡骨怒击', 54]],
  106: [['飞膝重踢', 46], ['旋风连踢', 54]],
  107: [['疾风直拳', 46], ['子弹连拳', 54]],
  108: [['长舌横扫', 44], ['口水飞溅', 52]],
  109: [['毒烟弥漫', 42], ['瓦斯爆破', 52]],
  110: [['双弹齐爆', 46], ['毒雾喷发', 54]],
  113: [['蛋壳守护', 40], ['治愈轻拍', 50]],
  114: [['藤蔓缠绕', 44], ['青藤鞭打', 54]],
  115: [['巨角冲撞', 48], ['狂野践踏', 54]],
  // 第六批（2026-11-06）：19 只，每种 2 个原创招式
  116: [['墨汁喷射', 42], ['龙息吐珠', 52]],
  117: [['毒刺连射', 44], ['龙卷水柱', 54]],
  118: [['金角冲顶', 44], ['水花飞溅', 52]],
  119: [['金角重撞', 46], ['瀑布跃龙', 54]],
  120: [['星光闪耀', 42], ['五角飞旋', 52]],
  121: [['星光水环', 48], ['宝石星爆', 54]],
  122: [['无形墙壁', 44], ['默剧重击', 52]],
  124: [['迷唇飞吻', 44], ['冰晶之吻', 54]],
  126: [['烈焰鸭嘴', 46], ['熔岩喷火', 54]],
  127: [['巨角夹击', 46], ['锹形重剪', 54]],
  128: [['牛角冲锋', 46], ['怒蹄践踏', 54]],
  129: [['水花跃跳', 40], ['鱼跃龙门', 50]],
  130: [['怒涛龙卷', 46], ['暴怒龙息', 54]],
  132: [['百变模仿', 42], ['黏黏变形', 52]],
  137: [['数据重组', 44], ['虚拟冲击', 54]],
  138: [['漩涡缩壳', 42], ['化石重压', 52]],
  139: [['尖刺绞杀', 44], ['古海重炮', 54]],
  140: [['甲壳冲撞', 44], ['利爪连抓', 52]],
  141: [['镰刀横斩', 46], ['化石利刃', 54]],
  142: [['翼刃俯冲', 46], ['远古咆哮', 54]],
  // 全量 151 补齐（2026-11-14 用户令：测试站仓库列全部 151、传说技能表按官方做；
  // 招式名一律官方名，威力沿用名册刻度，传说取顶格；45/95/125 此前只在 SPECIES 里、无名册条目）。
  1: [['藤鞭', 44], ['飞叶快刀', 54]],
  2: [['飞叶快刀', 48], ['污泥炸弹', 58]],
  3: [['飞叶风暴', 54], ['疯狂植物', 64]],
  4: [['火花', 44], ['火焰牙', 54]],
  5: [['火焰牙', 48], ['龙爪', 58]],
  6: [['喷射火焰', 54], ['大字爆炎', 64]],
  7: [['水枪', 44], ['水之波动', 54]],
  8: [['水之波动', 48], ['冲浪', 58]],
  9: [['水炮', 54], ['加农水炮', 64]],
  25: [['电光一闪', 44], ['十万伏特', 54]],
  26: [['十万伏特', 54], ['打雷', 64]],
  45: [['溶解液', 46], ['飞叶快刀', 56]],
  95: [['落石', 48], ['地震', 58]],
  125: [['雷电拳', 52], ['十万伏特', 62]],
  144: [['冰冻光束', 58], ['暴风雪', 66]],
  145: [['十万伏特', 58], ['打雷', 66]],
  146: [['喷射火焰', 58], ['大字爆炎', 66]],
  150: [['精神强念', 60], ['影子球', 68]],
};

/* 备战宠随等级学会的招式：与主宠 learnedMoves 同口径（Lv.2–11）。 */
function learnedCollectionMoves(no, level) {
  return (COLLECTION_LEARNSET[no] || []).filter((m) => m[0] <= level && m[0] >= 2);
}

/* 备战宠有效招式：与主宠 allMovesFor 同口径——随等级学会，技能等级按招式名
 * 共享 move_levels（与主宠同名招共用等级；独有招暂时恒 1 级）；属性/物特走
 * 官方表（无则用物种属性）；威力 skillPower(学会等级, 技能等级)；变化招效果走 MOVE_EFFECTS。 */
function collectionMovesFor(child, no, level) {
  const sp = SPECIES[no];
  const type = sp ? sp.type : null;
  const moveLevels = safeJsonObj(child.move_levels);
  return learnedCollectionMoves(no, level).map(([lv, name, desc]) => {
    const off = officialMove(name);
    const kind = moveEffectOf(name);
    const skillLevel = skillLevelOf(moveLevels, name);
    const eff = kind ? skillEffectFor(kind, skillLevel) : null;
    return { level: lv, name, desc, skillLevel, type: off ? off.type : type, damage_class: off ? off.damage_class : undefined, power: skillPower(lv, skillLevel), effectKind: kind || null, ...(eff || {}) };
  }).sort((a, b) => a.level - b.level);
}

/* ---------------- 进化道具系统 v11（DESIGN-进化道具-方案-v11.md） ----------------
 * 终极形态统一双条件：等级 16＋对应属性进化石。等级只给可达上限，实际形态以
 * pet_instances 为准（unlockForms 同步）；Lv16 无石不得提前写终极图鉴。
 * 收藏宠等级 = 孩子等级（与道馆备战宠同口径，见 buildPlayerSide）；官方等级进化
 * 到达孩子等级即满足。连接交换在 App 内无对手：带道具的交换进化消耗对应道具
 * （金属膜/电力增强器/护具/黑奇石，家长可直接发放）；无道具的纯交换（隆隆石→
 * 隆隆岩）以 10 级为 App 门槛（设计稿未定，为补全路线填的口径，见 DEPLOY.md §38）。 */

/* 道具目录（与 migrations/0019_evo_items.sql 的种子同一事实源；改一处须同步另一处） */
const ITEM_CATALOG = {
  'stone:thunder': { name: '雷之石', emoji: '⚡', kind: 'stone', rarity: 'common', attr: '电', desc: '让电属性宝可梦进化的石头。' },
  'stone:fire': { name: '火之石', emoji: '🔥', kind: 'stone', rarity: 'common', attr: '火', desc: '让火属性宝可梦进化的石头。' },
  'stone:water': { name: '水之石', emoji: '💧', kind: 'stone', rarity: 'common', attr: '水', desc: '让水属性宝可梦进化的石头。' },
  'stone:leaf': { name: '叶之石', emoji: '🍃', kind: 'stone', rarity: 'common', attr: '草', desc: '让草属性宝可梦进化的石头。' },
  'stone:ice': { name: '冰之石', emoji: '🧊', kind: 'stone', rarity: 'common', attr: '冰', desc: '让冰属性宝可梦进化的石头。' },
  'stone:sun': { name: '日之石', emoji: '☀️', kind: 'stone', rarity: 'rare', attr: null, desc: '珍惜的进化石，能让特定的宝可梦进化。' },
  'stone:moon': { name: '月之石', emoji: '🌙', kind: 'stone', rarity: 'rare', attr: null, desc: '珍惜的进化石，能让特定的宝可梦进化。' },
  'stone:fairy-skill': { name: '妖精技能石', emoji: '🧚', kind: 'stone', rarity: 'rare', attr: null, desc: '教伊布学会一个妖精系招式的教学道具，仅伊布可用。' },
  'ball:hyper': { name: '高级球', emoji: '🟡', kind: 'ball', rarity: 'common', attr: null, desc: '比超级球更容易抓到宝可梦。' },
  'ball:master': { name: '大师球', emoji: '🟣', kind: 'ball', rarity: 'rare', attr: null, desc: '一定能抓到宝可梦的究极之球，仅兑换获得。' },
  'egg:bulbasaur': { name: '妙蛙种子蛋', emoji: '🥚', kind: 'egg', rarity: 'rare', attr: null, desc: '孵化出妙蛙种子。7 天孵化。' },
  'egg:charmander': { name: '小火龙蛋', emoji: '🥚', kind: 'egg', rarity: 'rare', attr: null, desc: '孵化出小火龙。7 天孵化。' },
  'egg:squirtle': { name: '杰尼龟蛋', emoji: '🥚', kind: 'egg', rarity: 'rare', attr: null, desc: '孵化出杰尼龟。7 天孵化。' },
  'egg:pikachu': { name: '皮卡丘蛋', emoji: '🥚', kind: 'egg', rarity: 'rare', attr: null, desc: '直接孵化出皮卡丘。7 天孵化。' },
  'egg:eevee': { name: '伊布蛋', emoji: '🥚', kind: 'egg', rarity: 'rare', attr: null, desc: '孵化出伊布。7 天孵化。' },
  'egg:vulpix': { name: '六尾蛋', emoji: '🥚', kind: 'egg', rarity: 'rare', attr: null, desc: '孵化出六尾。7 天孵化。' },
  'egg:growlithe': { name: '卡蒂狗蛋', emoji: '🥚', kind: 'egg', rarity: 'rare', attr: null, desc: '孵化出卡蒂狗。7 天孵化。' },
  'item:metal-coat': { name: '金属膜', emoji: '🔩', kind: 'stone', rarity: 'rare', attr: null, desc: '连接交换进化道具：大岩蛇→大钢蛇、飞天螳螂→巨钳螳螂。' },
  'item:electirizer': { name: '电力增强器', emoji: '🔌', kind: 'stone', rarity: 'rare', attr: null, desc: '连接交换进化道具：电击兽→电击魔兽。' },
  'item:protector': { name: '护具', emoji: '🛡️', kind: 'stone', rarity: 'rare', attr: null, desc: '连接交换进化道具：铁甲暴龙→钻角犀兽。' },
  'item:black-augurite': { name: '黑奇石', emoji: '🪨', kind: 'stone', rarity: 'rare', attr: null, desc: '进化道具：飞天螳螂→劈斧螳螂。' },
  'medicine:potion': { name: '伤药', emoji: '💊', kind: 'medicine', rarity: 'common', attr: null, desc: '道馆战斗中回复 25% 体力。' },
  'medicine:berry-juice': { name: '树果汁', emoji: '🧃', kind: 'medicine', rarity: 'common', attr: null, desc: '道馆战斗中回复 25% 体力。' },
  'medicine:super-potion': { name: '好伤药', emoji: '💊', kind: 'medicine', rarity: 'common', attr: null, desc: '道馆战斗中回复 50% 体力。' },
  'medicine:water': { name: '美味之水', emoji: '💧', kind: 'medicine', rarity: 'common', attr: null, desc: '道馆战斗中回复 50% 体力。' },
  'medicine:revive': { name: '活力碎片', emoji: '✨', kind: 'medicine', rarity: 'common', attr: null, desc: '道馆战斗中复活昏厥的宝可梦，回复 50% 体力。' },
  /* 照顾道具（2026-11-07 转盘升级：care 食物/洗澡进背包，照顾时消耗；kind 新值 'care'，
   * 现有逻辑无按 ITEM_CATALOG kind 匹配的分支，不会误伤进化/战斗/掉落口径）。 */
  'care:apple': { name: '红苹果', emoji: '🍎', kind: 'care', rarity: 'common', attr: null, desc: '照顾时喂给伙伴的食物。' },
  'care:berry': { name: '树果', emoji: '🍓', kind: 'care', rarity: 'common', attr: null, desc: '照顾时喂给伙伴的食物。' },
  'care:cookie': { name: '曲奇饼干', emoji: '🍪', kind: 'care', rarity: 'common', attr: null, desc: '照顾时喂给伙伴的食物。' },
  'care:meat': { name: '香烤肉干', emoji: '🍖', kind: 'care', rarity: 'common', attr: null, desc: '照顾时喂给伙伴的食物。' },
  'care:milk': { name: '鲜牛奶', emoji: '🥛', kind: 'care', rarity: 'common', attr: null, desc: '照顾时喂给伙伴的食物。' },
  'care:honey': { name: '野花蜂蜜', emoji: '🍯', kind: 'care', rarity: 'common', attr: null, desc: '照顾时喂给伙伴的食物。' },
  'care:bubble': { name: '泡泡浴', emoji: '🫧', kind: 'care', rarity: 'common', attr: null, desc: '照顾时给伙伴洗澡用的。' },
  'care:shower': { name: '温水淋浴', emoji: '🚿', kind: 'care', rarity: 'common', attr: null, desc: '照顾时给伙伴洗澡用的。' },
  'care:petal': { name: '花瓣浴', emoji: '🌸', kind: 'care', rarity: 'common', attr: null, desc: '照顾时给伙伴洗澡用的。' },
  'care:herb': { name: '草药浴', emoji: '🍃', kind: 'care', rarity: 'common', attr: null, desc: '照顾时给伙伴洗澡用的。' },
};
/* 伊布 8 分支：key → {no, name, stone, type（9 种集）}；仙子伊布走妖精技能石教学，不直接用石 */
const EEVEE_BRANCHES = {
  vaporeon: { no: 134, name: '水伊布', stone: 'stone:water', type: '水' },
  jolteon: { no: 135, name: '雷伊布', stone: 'stone:thunder', type: '电' },
  flareon: { no: 136, name: '火伊布', stone: 'stone:fire', type: '火' },
  espeon: { no: 196, name: '太阳伊布', stone: 'stone:sun', type: '普通' },
  umbreon: { no: 197, name: '月亮伊布', stone: 'stone:moon', type: '普通' },
  leafeon: { no: 470, name: '叶伊布', stone: 'stone:leaf', type: '草' },
  glaceon: { no: 471, name: '冰伊布', stone: 'stone:ice', type: '水' },
  sylveon: { no: 700, name: '仙子伊布', stone: 'stone:fairy-skill', type: '妖精' },
};
/* 收藏进化线：baseNo → {stages, conds}（conds[i] 为 stages[i]→stages[i+1] 的条件）；
 * branches 用于飞天螳螂（两条进化路，孩子自选其一）。条件 kind：
 * level（官方等级，孩子等级即收藏宠等级）、stone（消耗进化石）、trade-item（消耗连接交换道具）、trade（纯交换，App 门槛 10 级）。 */
const EVO_LINES = {
  16: { stages: [16, 17, 18], conds: [{ kind: 'level', level: 18 }, { kind: 'level', level: 36 }] },
  37: { stages: [37, 38], conds: [{ kind: 'stone', stone: 'stone:fire' }] },
  39: { stages: [39, 40], conds: [{ kind: 'stone', stone: 'stone:moon' }] },
  43: { stages: [43, 44, 45], conds: [{ kind: 'level', level: 21 }, { kind: 'stone', stone: 'stone:leaf' }] },
  50: { stages: [50, 51], conds: [{ kind: 'level', level: 26 }] },
  54: { stages: [54, 55], conds: [{ kind: 'level', level: 33 }] },
  58: { stages: [58, 59], conds: [{ kind: 'stone', stone: 'stone:fire' }] },
  74: { stages: [74, 75, 76], conds: [{ kind: 'level', level: 25 }, { kind: 'trade', minLevel: 10 }] },
  95: { stages: [95, 208], conds: [{ kind: 'trade-item', item: 'item:metal-coat' }] },
  98: { stages: [98, 99], conds: [{ kind: 'level', level: 28 }] },
  111: { stages: [111, 112, 464], conds: [{ kind: 'level', level: 42 }, { kind: 'trade-item', item: 'item:protector' }] },
  123: { branches: [{ to: 212, cond: { kind: 'trade-item', item: 'item:metal-coat' } }, { to: 900, cond: { kind: 'stone', stone: 'item:black-augurite' } }] },
  125: { stages: [125, 466], conds: [{ kind: 'trade-item', item: 'item:electirizer' }] },
  147: { stages: [147, 148, 149], conds: [{ kind: 'level', level: 30 }, { kind: 'level', level: 55 }] },
  179: { stages: [179, 180, 181], conds: [{ kind: 'level', level: 15 }, { kind: 'level', level: 30 }] },
  // 第二批（2026-11-06）：8 条进化线
  10: { stages: [10, 11, 12], conds: [{ kind: 'level', level: 7 }, { kind: 'level', level: 10 }] },
  13: { stages: [13, 14, 15], conds: [{ kind: 'level', level: 7 }, { kind: 'level', level: 10 }] },
  19: { stages: [19, 20], conds: [{ kind: 'level', level: 20 }] },
  21: { stages: [21, 22], conds: [{ kind: 'level', level: 20 }] },
  23: { stages: [23, 24], conds: [{ kind: 'level', level: 22 }] },
  27: { stages: [27, 28], conds: [{ kind: 'level', level: 22 }] },
  29: { stages: [29, 30, 31], conds: [{ kind: 'level', level: 16 }, { kind: 'stone', stone: 'stone:moon' }] },
  32: { stages: [32, 33, 34], conds: [{ kind: 'level', level: 16 }, { kind: 'stone', stone: 'stone:moon' }] },
  // 第三批（2026-11-06）：9 条进化线（66 线先只写到 67，68 怪力不在本批、SPECIES 里没有 68）
  35: { stages: [35, 36], conds: [{ kind: 'stone', stone: 'stone:moon' }] },
  41: { stages: [41, 42], conds: [{ kind: 'level', level: 22 }] },
  46: { stages: [46, 47], conds: [{ kind: 'level', level: 24 }] },
  48: { stages: [48, 49], conds: [{ kind: 'level', level: 31 }] },
  52: { stages: [52, 53], conds: [{ kind: 'level', level: 28 }] },
  56: { stages: [56, 57], conds: [{ kind: 'level', level: 28 }] },
  60: { stages: [60, 61, 62], conds: [{ kind: 'level', level: 25 }, { kind: 'stone', stone: 'stone:water' }] },
  63: { stages: [63, 64, 65], conds: [{ kind: 'level', level: 16 }, { kind: 'trade', minLevel: 10 }] },
  66: { stages: [66, 67, 68], conds: [{ kind: 'level', level: 28 }, { kind: 'trade', minLevel: 10 }] },
  // 第四批（2026-11-06）：8 条进化线（90 线等下一批 91 进来时再接）
  69: { stages: [69, 70, 71], conds: [{ kind: 'level', level: 21 }, { kind: 'stone', stone: 'stone:leaf' }] },
  72: { stages: [72, 73], conds: [{ kind: 'level', level: 30 }] },
  77: { stages: [77, 78], conds: [{ kind: 'level', level: 40 }] },
  79: { stages: [79, 80], conds: [{ kind: 'level', level: 37 }] },
  81: { stages: [81, 82], conds: [{ kind: 'level', level: 30 }] },
  84: { stages: [84, 85], conds: [{ kind: 'level', level: 31 }] },
  86: { stages: [86, 87], conds: [{ kind: 'level', level: 34 }] },
  88: { stages: [88, 89], conds: [{ kind: 'level', level: 38 }] },
  // 第五批（2026-11-06）：7 条进化线（90 线补上）
  90: { stages: [90, 91], conds: [{ kind: 'stone', stone: 'stone:water' }] },
  92: { stages: [92, 93, 94], conds: [{ kind: 'level', level: 25 }, { kind: 'trade', minLevel: 10 }] },
  96: { stages: [96, 97], conds: [{ kind: 'level', level: 26 }] },
  100: { stages: [100, 101], conds: [{ kind: 'level', level: 30 }] },
  102: { stages: [102, 103], conds: [{ kind: 'stone', stone: 'stone:leaf' }] },
  104: { stages: [104, 105], conds: [{ kind: 'level', level: 28 }] },
  109: { stages: [109, 110], conds: [{ kind: 'level', level: 35 }] },
  // 第六批（2026-11-06）：5 条进化线（120 海星星不接线，121 无招式表）
  116: { stages: [116, 117], conds: [{ kind: 'level', level: 32 }] },
  118: { stages: [118, 119], conds: [{ kind: 'level', level: 33 }] },
  120: { stages: [120, 121], conds: [{ kind: 'stone', stone: 'stone:water' }] },
  129: { stages: [129, 130], conds: [{ kind: 'level', level: 20 }] },
  138: { stages: [138, 139], conds: [{ kind: 'level', level: 40 }] },
  140: { stages: [140, 141], conds: [{ kind: 'level', level: 40 }] },
};
/* 日常答题随机掉落（§9.2）：与原掉球叠加、不替代；每次答对 P=12%，每日最多 3 件。
 * 掉落表为条件权重（石档内 5 种属性石均分；整档为空转无掉落）。 */
const DAILY_DROP_RATE = 0.12;
const DAILY_DROP_DAILY_LIMIT = 3;
const DAILY_DROP_TABLE = [
  ['medicine:potion', 35], ['medicine:berry-juice', 15], ['medicine:super-potion', 20],
  ['medicine:water', 15], ['medicine:revive', 10], ['ball:hyper', 3], ['stone', 2],
];
const DAILY_DROP_STONES = ['stone:thunder', 'stone:fire', 'stone:water', 'stone:leaf', 'stone:ice'];
/* 高级转盘奖池（§2.4，高级转盘：全部进化石都在这里出，普通转盘不再出进化石）：
 * 日 25 / 月 25 / 妖精技能石 25 / 高级球 10 / 主宠蛋 15 / 活力碎片 10；
 * 普通进化石雷/火/水/叶/冰各 5、连接交换道具金属膜/电力增强器/护具/黑奇石各 3；
 * 蛋档内 5 只均匀随机（去重后归一化，全池为空禁转不扣机会）；合计 147。 */
/* 高级转盘等概率（2026-11-19 用户定）：15 项权重全为 1，各 1/15 ≈ 6.7%。 */
const WHEEL_POOL = [
  ['stone:sun', 1], ['stone:moon', 1], ['stone:fairy-skill', 1], ['ball:hyper', 1], ['egg', 1], ['medicine:revive', 1],
  ['stone:thunder', 1], ['stone:fire', 1], ['stone:water', 1], ['stone:leaf', 1], ['stone:ice', 1],
  ['item:metal-coat', 1], ['item:electirizer', 1], ['item:protector', 1], ['item:black-augurite', 1],
];
const WHEEL_EGG_POOL = [1, 4, 7, 25, 133];
/* 球满 99 向上兑换：5 普通→1 超级、10 超级→1 高级、20 高级→1 大师 */
const BALL_EXCHANGE = [['balls', 'balls_super', 5], ['balls_super', 'balls_hyper', 10], ['balls_hyper', 'balls_master', 20]];
const BALL_MAX = 99;

/* 日常掉落掷骰（纯函数）：返回道具 key 或 null（未掉落）；stone 档内 5 石均分。
 * ownedStones：背包已有未用同种石集合——有则该石排除（用掉后可再掉）；石档全空转无掉落。 */
function rollDailyItemDrop(rng = Math.random, ownedStones = new Set()) {
  if (rollRng(rng) >= DAILY_DROP_RATE) return null;
  const hit = weightedPick(DAILY_DROP_TABLE, rng);
  if (hit) {
    const [key] = hit;
    if (key !== 'stone') return key;
    const avail = DAILY_DROP_STONES.filter((s) => !ownedStones.has(s));
    if (!avail.length) return null;
    return avail[Math.floor(rollRng(rng) * avail.length) % avail.length];
  }
  return null;
}
/* -------- 转盘升级（2026-11-07）：共用扇区配置＋稀有转盘奖池 --------
 * 服务端先掷骰、前端只做动画：扇区大小按权重成比例，指针停到的扇区必须与服务端奖品一致。 */
/* 转盘调色板（定死 10 色，按扇区下标循环取；与总任务单暖纸底/大宝蓝/小宝紫/橙主按钮同系）。 */
const WHEEL_COLORS = ['#FF9F43', '#4D6FC1', '#8B5BB6', '#58B368', '#E74C3C', '#F1C40F', '#1ABC9C', '#E67E22', '#9B59B6', '#2ECC71'];
/* 扇区配置（纯函数）：入参 [{key, label, emoji, weight}]，权重 ≤0 的扇区不出现；
 * 返回 {sectors: [{key, label, emoji, color, weight}], total}。 */
function buildWheelSectors(entries) {
  const list = (entries || []).filter((e) => e && Number(e.weight) > 0);
  const total = list.reduce((a, e) => a + Number(e.weight), 0);
  return {
    sectors: list.map((e, i) => ({
      key: e.key, label: e.label, emoji: e.emoji || '',
      color: WHEEL_COLORS[i % WHEEL_COLORS.length], weight: Number(e.weight),
    })),
    total,
  };
}
/* 高级转盘扇区条目（本次实际可用奖池）：蛋档去重后为空时蛋权重归零（扇区不出现），
 * 其余权重与 WHEEL_POOL 一致、归一化口径与 rollWheelPrize 相同。 */
function evoWheelEntries(ownedSpecies = new Set(), ownedEggSpecies = new Set()) {
  const availEggs = WHEEL_EGG_POOL.filter((no) => no === 133 || (!ownedSpecies.has(no) && !ownedEggSpecies.has(no)));
  const entries = WHEEL_POOL.map(([k, w]) => {
    if (k === 'egg') return { key: 'egg', label: '主宠蛋', emoji: '🥚', weight: availEggs.length ? w : 0 };
    const cat = ITEM_CATALOG[k] || {};
    return { key: k, label: cat.name || k, emoji: cat.emoji || '🎁', weight: w };
  });
  return { entries, availEggs };
}
/* 稀有转盘奖池（2026-11-07 新建）：传说 4 种＋伊布 8 种进化形态＋各精灵终极形态；
 * 151 梦幻不进池（仍走道馆八关全通）；权重：传说每只 2（组 8）、伊布组 12、终极组 80，组内均匀。 */
const RARE_WHEEL_LEGENDARIES = [144, 145, 146, 150];
const RARE_WHEEL_EEVEE = [134, 135, 136, 196, 197, 470, 471, 700];
/* 终极形态 = EVO_LINES 各条 stages 末位＋branches 目标＋主宠线终极 [3,6,9,26]，
 * 去掉传说 4、伊布 8、151，过滤到 DEX_DETAILS 有条目的种（58 种）。 */
function rareWheelFinals() {
  const s = new Set();
  for (const evo of Object.values(EVO_LINES)) {
    if (evo.stages && evo.stages.length) s.add(evo.stages[evo.stages.length - 1]);
    if (Array.isArray(evo.branches)) for (const b of evo.branches) s.add(b.to);
  }
  for (const n of [3, 6, 9, 26]) s.add(n);
  const excl = new Set([...RARE_WHEEL_LEGENDARIES, ...RARE_WHEEL_EEVEE, 151]);
  return [...s].filter((n) => !excl.has(n) && DEX_DETAILS[n]).sort((a, b) => a - b);
}
const RARE_WHEEL_FINALS = rareWheelFinals();
/* 稀有转盘扇区（纯函数）：available 为 {legendary:[...], eevee:[...], final:[...]} 可用物种数组，
 * 不传则用全池；4 个传说扇区各 label 为物种名、emoji ✨，伊布扇区 label「伊布进化」、
 * 终极扇区 label「终极形态」；可用为空的组不出现。返回 buildWheelSectors 的 {sectors, total}。 */
function rareWheelSectors(available) {
  const avail = available || { legendary: RARE_WHEEL_LEGENDARIES, eevee: RARE_WHEEL_EEVEE, final: RARE_WHEEL_FINALS };
  const entries = [];
  for (const no of (avail.legendary || [])) entries.push({ key: `legendary:${no}`, label: speciesName(no), emoji: '✨', weight: 2 });
  if ((avail.eevee || []).length) entries.push({ key: 'eevee', label: '伊布进化', emoji: '⭐', weight: 12 });
  if ((avail.final || []).length) entries.push({ key: 'final', label: '终极形态', emoji: '👑', weight: 80 });
  return buildWheelSectors(entries);
}
/* 等比换算（2026-10-27 用户定，分关实施）：玩家有效等级 = App 等级 × 2.25（App 16 级 = 官方 36 级），
 * 向下取整；馆主有效等级 = App 馆主等级 × 本关系数，向下取整。公式（statsFor / 伤害）本身不动。
 * 2026-10-28 收紧实施：馆主系数 S1 2.33（官方比对齐）、S2 1.7、S3 1.7、S4 1.85；S4 hpMult 2.7。2026-11-07 S4 收紧：hpMult 2.7→4.0（天气晴天后小宝 S4 81.75% 压回 38.05%，大宝 92.25%；唯一满足双断言的单旋钮值，两端余量均不足 0.5%，后续改动须重测）。
 * 形态与招式解锁仍按 App 等级（lineFormNo / effectiveMoves 不走有效等级）。 */
const PLAYER_SCALE = 2.25;
const BOSS_SCALE = { 1: 2.33, 2: 1.7, 3: 1.7, 4: 1.85, 5: 1.85, 6: 1.85, 7: 1.85, 8: 1.85 }; // 2026-10-28 收紧实施：S1 2.33 为官方比对齐，S2 1.7、S3 1.7、S4 1.85；2026-11-08 新增 S5/S6 1.85；2026-11-17 8 关扩围：S7/S8 均取 1.85
const effPlayerLevel = (appLevel) => Math.max(1, Math.floor((Number(appLevel) || 1) * PLAYER_SCALE));
const effBossLevel = (cfg) => Math.max(1, Math.floor((Number(cfg.bossLevel) || 1) * (BOSS_SCALE[cfg.stage] ?? 1)));

/* 图鉴 entry_key 与物种编号互转（收藏宠 = 图鉴已拥有的物种） */
function dexKeyForSpecies(no) {
  const n = Number(no); // 入参归一化（审查 S5）：字符串 '50' 也要得到 wild:50，不得错键成 egg:'50'
  if (n === 151) return 'rare:151';
  if (WILD.some((w) => w.no === n)) return `wild:${n}`;
  return `egg:${n}`;
}
function speciesOfDexKey(key) {
  const m = String(key || '').match(/^(?:wild|rare|egg):(\d+)$/);
  if (!m) return null;
  const no = Number(m[1]);
  // 只认有收藏招式的物种（审查 S6）：馆主键（如 gym:95）不是收藏宠，
  // 若被当备战宠选中会在 makePet 抛错致 500；此处返回 null 让调用方按未拥有处理。
  // （2026-11-14 全量 151 批：95 大岩蛇已进 COLLECTION_MOVES，不再是"无名册"例子。）
  return SPECIES[no] && COLLECTION_MOVES[no] ? no : null;
}
const petImg = (no) => `/static/img/p${no}.63ed668b.webp`;
const PIN_LOCK_MAX = 5;
const PIN_LOCK_SECS = 300;

/* 问答去重（迁移 0004）：答对过的题在窗口天数内不再出（settings quiz_repeat_days 可调，默认 30）；
 * 答错过的题间隔 QUIZ_WRONG_GAP_DAYS 天后（即第 4 天起）可重出复习；从未答过的优先；
 * 池子不足时按「最久未出现」放宽补齐，保证每天有题。 */
const QUIZ_CORRECT_WINDOW_DAYS = 30;
const QUIZ_WRONG_GAP_DAYS = 3;

/* 拍照上传：每科 ≤3 张，单张字节上限（前端压缩目标 ≈300KB，这里留足余量） */
const PHOTO_MAX_PER_CHECKIN = 3;
const PHOTO_MAX_BYTES = 900 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/* ---------------- 测试模式时间模拟（仅 TEST_MODE=1 的部署启用） ----------------
 * 正式环境没有 TEST_MODE 变量：DEBUG_NOW_MS 恒为 null，nowDate() 与 new Date() 等价，
 * 全部日期/时间判定行为与未引入本功能时完全一致。
 * 测试环境：fetch 入口每请求先读 settings 的 debug_day_offset / debug_hour 写入
 * DEBUG_NOW_MS；shDateStr/shTimeHM 一律经 nowDate() 取“现在”，所以快手截止、
 * 周末判定、连击、封印到期等所有判定共用同一个虚拟时钟来源。 */
let DEBUG_NOW_MS = null;
let DEBUG_GATES_OPEN = false;
/* 门槛放行总开关（任务 124）：仅测试站且 settings.debug_open_gates='1' 时打开。
 * 与 DEBUG_GATES_OPEN 分开——后者只表示“测试模式”，还管时间模拟的可用性；
 * GATES_OPEN 才是所有功能门槛（喂食/洗澡/道馆/PvP/进化/仓库/答题/打卡/转盘/测验…）的唯一口径。
 * 正式站 isTestMode 恒 false，GATES_OPEN 恒 false，门槛全部按正式规则走。 */
let GATES_OPEN = false;
/* 任务 124（双口径）：GATES_OPEN 管“旧门槛”（进化/仓库/道馆/PvP/测验冷却等）——
 * 测试站缺省即开（与旧 DEBUG_GATES_OPEN 行为一致，旧测试只设 TEST_MODE、不写该键时不受影响）；
 * GATES_OPEN_FULL 管“新门槛”（喂食/洗澡/答题/打卡/Oak/照顾问答/转盘自动补机会）——
 * 仅 settings.debug_open_gates 显式为 '1' 时开，缺省关闭（旧测试断言这些门槛在测试模式仍受限）。
 * 开关拨到 '0' 时两者都关，恢复正式站规则；拨到 '1' 时两者都开，全部门槛放行。 */
let GATES_OPEN_FULL = false;

function nowDate() {
  return DEBUG_NOW_MS == null ? new Date() : new Date(DEBUG_NOW_MS);
}

function isTestMode(env) {
  return !!env && (env.TEST_MODE === '1' || env.TEST_MODE === 1 || env.TEST_MODE === true);
}

async function applyDebugTime(db, env) {
  DEBUG_GATES_OPEN = isTestMode(env);
  /* 任务 124：读门槛放行开关。缺省（从未设置过）= 打开，与现行测试站行为一致，
   * 这样旧测试（只设 TEST_MODE、不写该键）不受影响；显式 '0' 才关。读错默认关。 */
  GATES_OPEN = false;
  GATES_OPEN_FULL = false;
  if (DEBUG_GATES_OPEN) {
    try { GATES_OPEN = (await getSetting(db, 'debug_open_gates')) !== '0'; } catch { GATES_OPEN = false; }
    try { GATES_OPEN_FULL = (await getSetting(db, 'debug_open_gates')) === '1'; } catch { GATES_OPEN_FULL = false; }
  }
  if (!DEBUG_GATES_OPEN) { DEBUG_NOW_MS = null; return; }
  try {
    const off = parseInt((await getSetting(db, 'debug_day_offset')) || '0', 10) || 0;
    const hourRaw = await getSetting(db, 'debug_hour');
    const hour = hourRaw === null || hourRaw === '' ? null
      : Math.min(23, Math.max(0, parseInt(hourRaw, 10) || 0));
    if (!off && hour == null) { DEBUG_NOW_MS = null; return; }
    const base = new Date(Date.now() + off * 86400000);
    if (hour == null) { DEBUG_NOW_MS = base.getTime(); return; }
    const p = shParts(base); // 显式传参，不依赖 DEBUG_NOW_MS
    DEBUG_NOW_MS = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour - 8, 0, 0); // 上海=UTC+8，无夏令时
  } catch { DEBUG_NOW_MS = null; }
}

/* ---------------- 上海时区工具（纯函数，可单测） ---------------- */

function shParts(date = nowDate()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return o; // {year, month, day, hour, minute}
}

function shDateStr(date = nowDate()) {
  const p = shParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
function fnv1aHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function diffDays(a, b) { // b - a 的天数
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

function isWeekendDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

function weekStartMon(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const shift = (dt.getUTCDay() + 6) % 7; // 周一=0
  dt.setUTCDate(dt.getUTCDate() - shift);
  return dt.toISOString().slice(0, 10);
}

/* ---------------- 等级 / 招式 / 进化（纯函数，可单测） ---------------- */

const xpForLevel = (L) => 20 * L * (L - 1); // 达到 L 级所需累计经验

function levelFromXp(xp) {
  let L = 1;
  while (xpForLevel(L + 1) <= xp) L++;
  return L;
}

function formIdxForLevel(level) {
  if (level >= 16) return 3; // v11：终极形态可达等级由 15 改为 16（须另用进化石才成真形态，见 unlockForms）
  if (level >= 10) return 2;
  if (level >= 5) return 1;
  return 0; // 蛋
}

function learnedMoves(lineKey, level) {
  return LINES[lineKey].moves.filter((m) => m[0] <= level && m[0] >= 2);
}

function newMovesBetween(lineKey, oldLevel, newLevel, unlockedNames = []) {
  const un = new Set(unlockedNames || []);
  return LINES[lineKey].moves.filter((m) => m[0] > oldLevel && m[0] <= newLevel && !un.has(m[1]));
}

/* __DIAG_GRAPH_BEGIN__ （由 work/gen-diag-graph.mjs 生成，勿手改） */
const MATH_PREREQ_G1G3 = {"meta":{"source":"cn-math-taxonomy data/dependencies.json + data/topics.json（AI 初稿、未经教师审核，仅决定查哪条链）","generated":"2026-10-26","counts":{"topicsTriggerable":77,"topicsTotal":137,"edges":163,"hard":150,"soft":13}},"topics":[{"id":"cnm_p001","name":"1到5各数的认识","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p002","name":"5以内数的大小","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p003","name":"几和第几","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p004","name":"5以内数的分与合","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p005","name":"0的认识","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p006","name":"5以内的加法","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p007","name":"5以内的减法","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p008","name":"6到10各数的认识","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p009","name":"10以内数的比较","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p010","name":"10以内的加法","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p011","name":"10以内的减法","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p012","name":"连加和连减","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p013","name":"10以内加减混合","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p014","name":"认识长方体、正方体、圆柱和球","chapter":"一年级上册 第3单元 认识立体图形","grade":1,"inScope":true},{"id":"cnm_p015","name":"上下前后左右","chapter":"一年级上册 综合与实践 我的教室","grade":1,"inScope":true},{"id":"cnm_p016","name":"11到20各数的认识","chapter":"一年级上册 第4单元 11到20的认识","grade":1,"inScope":true},{"id":"cnm_p017","name":"十位和个位","chapter":"一年级上册 第4单元 11到20的认识","grade":1,"inScope":true},{"id":"cnm_p018","name":"20以内不进位加法","chapter":"一年级上册 第4单元 11到20的认识","grade":1,"inScope":true},{"id":"cnm_p019","name":"凑十法","chapter":"一年级上册 第5单元 20以内的进位加法","grade":1,"inScope":true},{"id":"cnm_p020","name":"9加几","chapter":"一年级上册 第5单元 20以内的进位加法","grade":1,"inScope":true},{"id":"cnm_p021","name":"8、7、6加几","chapter":"一年级上册 第5单元 20以内的进位加法","grade":1,"inScope":true},{"id":"cnm_p022","name":"用数介绍和简单分类","chapter":"一年级上册 综合与实践 数学游戏分享","grade":1,"inScope":true},{"id":"cnm_p023","name":"认识长方形、正方形、三角形和圆","chapter":"一年级下册 第1单元 认识平面图形","grade":1,"inScope":true},{"id":"cnm_p024","name":"平面图形的拼组","chapter":"一年级下册 第1单元 认识平面图形","grade":1,"inScope":true},{"id":"cnm_p025","name":"十几减9","chapter":"一年级下册 第2单元 20以内的退位减法","grade":1,"inScope":true},{"id":"cnm_p026","name":"十几减8、7、6","chapter":"一年级下册 第2单元 20以内的退位减法","grade":1,"inScope":true},{"id":"cnm_p027","name":"十几减5、4、3、2","chapter":"一年级下册 第2单元 20以内的退位减法","grade":1,"inScope":true},{"id":"cnm_p028","name":"100以内数的认识","chapter":"一年级下册 第3单元 100以内数的认识","grade":1,"inScope":true},{"id":"cnm_p029","name":"100以内数的大小","chapter":"一年级下册 第3单元 100以内数的认识","grade":1,"inScope":true},{"id":"cnm_p030","name":"整十数的加减","chapter":"一年级下册 第3单元 100以内数的认识","grade":1,"inScope":true},{"id":"cnm_p031","name":"100以内口算加法","chapter":"一年级下册 第4单元 100以内的口算加、减法","grade":1,"inScope":true},{"id":"cnm_p032","name":"100以内口算减法","chapter":"一年级下册 第4单元 100以内的口算加、减法","grade":1,"inScope":true},{"id":"cnm_p033","name":"100以内笔算加法","chapter":"一年级下册 第5单元 100以内的笔算加、减法","grade":1,"inScope":true},{"id":"cnm_p034","name":"100以内笔算减法","chapter":"一年级下册 第5单元 100以内的笔算加、减法","grade":1,"inScope":true},{"id":"cnm_p035","name":"部分与总数","chapter":"一年级下册 第6单元 数量间的加减关系","grade":1,"inScope":true},{"id":"cnm_p217","name":"求两数相差几","chapter":"一年级下册 第6单元 数量间的加减关系","grade":1,"inScope":true},{"id":"cnm_p218","name":"求比一个数多（少）几的数","chapter":"一年级下册 第6单元 数量间的加减关系","grade":1,"inScope":true},{"id":"cnm_p036","name":"认识人民币","chapter":"一年级下册 综合与实践 欢乐购物街","grade":1,"inScope":true},{"id":"cnm_p037","name":"分类与整理","chapter":"二年级上册 第1单元 分类与整理","grade":2,"inScope":false},{"id":"cnm_p038","name":"乘法的意义","chapter":"二年级上册 第2单元 1到6的表内乘法","grade":2,"inScope":false},{"id":"cnm_p039","name":"2到6的乘法口诀","chapter":"二年级上册 第2单元 1到6的表内乘法","grade":2,"inScope":false},{"id":"cnm_p057","name":"乘加乘减的运算顺序","chapter":"二年级上册 第2单元 1到6的表内乘法","grade":2,"inScope":false},{"id":"cnm_p043","name":"除法的意义","chapter":"二年级上册 第3单元 1到6的表内除法","grade":2,"inScope":false},{"id":"cnm_p049","name":"东、南、西、北","chapter":"二年级上册 综合与实践 校园小导游","grade":2,"inScope":false},{"id":"cnm_p040","name":"认识厘米","chapter":"二年级上册 第4单元 厘米和米","grade":2,"inScope":false},{"id":"cnm_p041","name":"认识米","chapter":"二年级上册 第4单元 厘米和米","grade":2,"inScope":false},{"id":"cnm_p042","name":"7、8、9的乘法口诀","chapter":"二年级上册 第5单元 7到9的表内乘、除法","grade":2,"inScope":false},{"id":"cnm_p044","name":"用7、8、9的口诀求商","chapter":"二年级上册 第5单元 7到9的表内乘、除法","grade":2,"inScope":false},{"id":"cnm_p061","name":"秒的认识","chapter":"二年级下册 综合与实践 时间在哪里","grade":2,"inScope":false},{"id":"cnm_p062","name":"时、分、秒的进率","chapter":"二年级下册 综合与实践 时间在哪里","grade":2,"inScope":false},{"id":"cnm_p063","name":"经过时间","chapter":"二年级下册 综合与实践 时间在哪里","grade":2,"inScope":false},{"id":"cnm_p219","name":"数量间的乘除关系","chapter":"二年级下册 第2单元 数量间的乘除关系","grade":2,"inScope":false},{"id":"cnm_p053","name":"万以内数的认识","chapter":"二年级下册 第3单元 万以内数的认识","grade":2,"inScope":false},{"id":"cnm_p054","name":"万以内数的大小比较","chapter":"二年级下册 第3单元 万以内数的认识","grade":2,"inScope":false},{"id":"cnm_p064","name":"几百几十的口算加法","chapter":"二年级下册 第4单元 万以内的加法和减法","grade":2,"inScope":false},{"id":"cnm_p065","name":"几百几十的口算减法","chapter":"二年级下册 第4单元 万以内的加法和减法","grade":2,"inScope":false},{"id":"cnm_p071","name":"三位数加法笔算","chapter":"二年级下册 第4单元 万以内的加法和减法","grade":2,"inScope":false},{"id":"cnm_p220","name":"加减法各部分间的关系","chapter":"二年级下册 第4单元 万以内的加法和减法","grade":2,"inScope":false},{"id":"cnm_p060","name":"简单的变化规律","chapter":"二年级下册 第5单元 复习与关联","grade":2,"inScope":false},{"id":"cnm_p221","name":"观察简单的立体积木","chapter":"三年级上册 第1单元 观察物体","grade":3,"inScope":true},{"id":"cnm_p222","name":"长方体纸盒的展开图","chapter":"三年级上册 第1单元 观察物体","grade":3,"inScope":true},{"id":"cnm_p223","name":"同级运算与两级运算的运算顺序","chapter":"三年级上册 第2单元 混合运算","grade":3,"inScope":true},{"id":"cnm_p058","name":"带小括号的两步运算","chapter":"三年级上册 第2单元 混合运算","grade":3,"inScope":true},{"id":"cnm_p059","name":"两步加减应用","chapter":"三年级上册 第2单元 混合运算","grade":3,"inScope":true},{"id":"cnm_p067","name":"毫米","chapter":"三年级上册 第3单元 毫米、分米和千米","grade":3,"inScope":true},{"id":"cnm_p068","name":"分米","chapter":"三年级上册 第3单元 毫米、分米和千米","grade":3,"inScope":true},{"id":"cnm_p069","name":"千米","chapter":"三年级上册 第3单元 毫米、分米和千米","grade":3,"inScope":true},{"id":"cnm_p056","name":"克和千克","chapter":"三年级上册 综合与实践 曹冲称象的故事","grade":3,"inScope":true},{"id":"cnm_p070","name":"吨的认识","chapter":"三年级上册 综合与实践 曹冲称象的故事","grade":3,"inScope":true},{"id":"cnm_p224","name":"等量代换（曹冲称象）","chapter":"三年级上册 综合与实践 曹冲称象的故事","grade":3,"inScope":true},{"id":"cnm_p074","name":"多位数乘一位数","chapter":"三年级上册 第4单元 多位数乘一位数","grade":3,"inScope":true},{"id":"cnm_p075","name":"因数中间或末尾有 0 的乘法","chapter":"三年级上册 第4单元 多位数乘一位数","grade":3,"inScope":true},{"id":"cnm_p076","name":"数字编码","chapter":"三年级上册 综合与实践 数字编码","grade":3,"inScope":true},{"id":"cnm_p099","name":"线段、直线和射线","chapter":"三年级上册 第5单元 线和角","grade":3,"inScope":true},{"id":"cnm_p225","name":"角的认识","chapter":"三年级上册 第5单元 线和角","grade":3,"inScope":true},{"id":"cnm_p101","name":"锐角、直角和钝角","chapter":"三年级上册 第5单元 线和角","grade":3,"inScope":true},{"id":"cnm_p079","name":"几分之一","chapter":"三年级上册 第6单元 分数的初步认识","grade":3,"inScope":true},{"id":"cnm_p226","name":"几分之几","chapter":"三年级上册 第6单元 分数的初步认识","grade":3,"inScope":true},{"id":"cnm_p227","name":"简单的分数大小比较","chapter":"三年级上册 第6单元 分数的初步认识","grade":3,"inScope":true},{"id":"cnm_p080","name":"同分母分数的初步加减","chapter":"三年级上册 第6单元 分数的初步认识","grade":3,"inScope":true},{"id":"cnm_p073","name":"倍的认识","chapter":"三年级上册 第7单元 复习与关联","grade":3,"inScope":true},{"id":"cnm_p081","name":"集合图里的重叠","chapter":"三年级上册 第7单元 复习与关联","grade":3,"inScope":true},{"id":"cnm_p095","name":"简单的搭配","chapter":"三年级上册 第8单元 数学广角——搭配问题","grade":3,"inScope":true},{"id":"cnm_p228","name":"生活中的运动现象","chapter":"三年级下册 第1单元 生活中的运动现象","grade":3,"inScope":true},{"id":"cnm_p083","name":"除数是一位数的除法","chapter":"三年级下册 第2单元 除数是一位数的除法","grade":3,"inScope":true},{"id":"cnm_p084","name":"除法解决实际问题","chapter":"三年级下册 第2单元 除数是一位数的除法","grade":3,"inScope":true},{"id":"cnm_p229","name":"多边形的认识","chapter":"三年级下册 第3单元 长方形和正方形","grade":3,"inScope":true},{"id":"cnm_p077","name":"长方形和正方形的特征","chapter":"三年级下册 第3单元 长方形和正方形","grade":3,"inScope":true},{"id":"cnm_p078","name":"长方形和正方形的周长","chapter":"三年级下册 第3单元 长方形和正方形","grade":3,"inScope":true},{"id":"cnm_p088","name":"面积的意义","chapter":"三年级下册 第4单元 图形的面积","grade":3,"inScope":true},{"id":"cnm_p089","name":"长方形和正方形的面积","chapter":"三年级下册 第4单元 图形的面积","grade":3,"inScope":true},{"id":"cnm_p090","name":"面积单位的换算","chapter":"三年级下册 第4单元 图形的面积","grade":3,"inScope":true},{"id":"cnm_p085","name":"复式统计表","chapter":"三年级下册 第5单元 数据的收集与整理","grade":3,"inScope":true},{"id":"cnm_p091","name":"年、月、日","chapter":"三年级下册 综合与实践 年、月、日的秘密","grade":3,"inScope":true},{"id":"cnm_p092","name":"24时记时法","chapter":"三年级下册 综合与实践 年、月、日的秘密","grade":3,"inScope":true},{"id":"cnm_p093","name":"一位小数的初步认识","chapter":"三年级下册 第6单元 小数的初步认识","grade":3,"inScope":true},{"id":"cnm_p094","name":"一位小数的加减","chapter":"三年级下册 第6单元 小数的初步认识","grade":3,"inScope":true},{"id":"cnm_p082","name":"东北、东南、西北、西南","chapter":"三年级下册 第7单元 复习与关联","grade":3,"inScope":true},{"id":"cnm_p100","name":"角的度量","chapter":"四年级上册 第2单元 角的度量","grade":4,"inScope":false},{"id":"cnm_p232","name":"平角、周角和角的分类","chapter":"四年级上册 第2单元 角的度量","grade":4,"inScope":false},{"id":"cnm_p086","name":"两位数乘两位数","chapter":"四年级上册 第3单元 多位数乘两位数","grade":4,"inScope":false},{"id":"cnm_p111","name":"常见数量关系","chapter":"四年级上册 第4单元 加法模型和乘法模型","grade":4,"inScope":false},{"id":"cnm_p103","name":"垂直","chapter":"四年级上册 第5单元 平行四边形和梯形","grade":4,"inScope":false},{"id":"cnm_p108","name":"条形统计图","chapter":"四年级上册 第6单元 条形统计图","grade":4,"inScope":false},{"id":"cnm_p109","name":"简单的优化","chapter":"四年级上册 第7单元 复习与关联","grade":4,"inScope":false},{"id":"cnm_p110","name":"四则运算各部分间的关系","chapter":"四年级下册 第1单元 四则运算","grade":4,"inScope":false},{"id":"cnm_p113","name":"从不同方向观察物体","chapter":"四年级下册 第2单元 观察物体（二）","grade":4,"inScope":false},{"id":"cnm_p118","name":"小数的意义","chapter":"四年级下册 第4单元 小数的意义和性质","grade":4,"inScope":false},{"id":"cnm_p119","name":"比较小数的大小","chapter":"四年级下册 第4单元 小数的意义和性质","grade":4,"inScope":false},{"id":"cnm_p125","name":"小数加减法","chapter":"四年级下册 第6单元 小数的加法和减法","grade":4,"inScope":false},{"id":"cnm_p127","name":"轴对称","chapter":"四年级下册 第7单元 图形的运动（二）","grade":4,"inScope":false},{"id":"cnm_p106","name":"除数是两位数的除法","chapter":"四年级下册 第9单元 除数是两位数的除法","grade":4,"inScope":false},{"id":"cnm_p237","name":"观察简单组合体","chapter":"五年级上册 第1单元 观察简单组合体","grade":5,"inScope":false},{"id":"cnm_p132","name":"小数乘整数","chapter":"五年级上册 第2单元 小数乘法","grade":5,"inScope":false},{"id":"cnm_p098","name":"公顷和平方千米","chapter":"五年级上册 第6单元 多边形的面积","grade":5,"inScope":false},{"id":"cnm_p147","name":"平行四边形的面积","chapter":"五年级上册 第6单元 多边形的面积","grade":5,"inScope":false},{"id":"cnm_p151","name":"植树问题","chapter":"五年级上册 第8单元 复习与关联","grade":5,"inScope":false},{"id":"cnm_p160","name":"长方体和正方体的认识","chapter":"五年级下册 第3单元 长方体和正方体","grade":5,"inScope":false},{"id":"cnm_p161","name":"长方体的表面积","chapter":"五年级下册 第3单元 长方体和正方体","grade":5,"inScope":false},{"id":"cnm_p162","name":"体积单位","chapter":"五年级下册 第3单元 长方体和正方体","grade":5,"inScope":false},{"id":"cnm_p165","name":"分数的意义","chapter":"五年级下册 第4单元 分数的意义和性质","grade":5,"inScope":false},{"id":"cnm_p173","name":"异分母分数加减","chapter":"五年级下册 第6单元 分数的加法和减法","grade":5,"inScope":false},{"id":"cnm_p174","name":"分数加减混合","chapter":"五年级下册 第6单元 分数的加法和减法","grade":5,"inScope":false},{"id":"cnm_p136","name":"用数对确定位置","chapter":"六年级上册 第1单元 确定位置","grade":6,"inScope":false},{"id":"cnm_p180","name":"根据方向和距离确定位置","chapter":"六年级上册 第1单元 确定位置","grade":6,"inScope":false},{"id":"cnm_p188","name":"圆的认识","chapter":"六年级上册 第4单元 圆","grade":6,"inScope":false},{"id":"cnm_p192","name":"圆的面积","chapter":"六年级上册 第4单元 圆","grade":6,"inScope":false},{"id":"cnm_p193","name":"扇形的认识","chapter":"六年级上册 第4单元 圆","grade":6,"inScope":false},{"id":"cnm_p200","name":"数与形","chapter":"六年级下册 第6单元 整理和复习","grade":6,"inScope":false},{"id":"cnm_051","name":"从不同方向看与立体图形的展开图","chapter":"七上 第六章 几何图形初步 6.1.1","grade":7,"inScope":false},{"id":"cnm_053","name":"直线、射线、线段","chapter":"七上 第六章 几何图形初步 6.2.1","grade":7,"inScope":false},{"id":"cnm_056","name":"角的概念与表示","chapter":"七上 第六章 几何图形初步 6.3.1","grade":7,"inScope":false},{"id":"cnm_102","name":"全面调查与抽样调查","chapter":"七下 第十二章 数据的收集、整理与描述 12.1.1","grade":7,"inScope":false},{"id":"cnm_106","name":"频数分布表与数据分组","chapter":"七下 第十二章 数据的收集、整理与描述 12.2.2","grade":7,"inScope":false},{"id":"cnm_131","name":"轴对称图形与两个图形成轴对称","chapter":"八上 第十五章 轴对称 15.1","grade":8,"inScope":false},{"id":"cnm_148","name":"完全平方公式","chapter":"八上 第十六章 整式的乘法 16.3","grade":8,"inScope":false},{"id":"cnm_h230","name":"分类加法计数原理","chapter":"选必三 第六章 计数原理 6.1","grade":14,"inScope":false}],"edges":[{"topicId":"cnm_p002","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「5以内数的大小」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p003","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「几和第几」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p004","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「5以内数的分与合」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p005","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「0的认识」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p006","prerequisiteId":"cnm_p004","strength":"hard","reason":"学习「5以内的加法」需要先掌握「5以内数的分与合」。"},{"topicId":"cnm_p007","prerequisiteId":"cnm_p006","strength":"hard","reason":"学习「5以内的减法」需要先掌握「5以内的加法」。"},{"topicId":"cnm_p008","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「6到10各数的认识」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p009","prerequisiteId":"cnm_p008","strength":"hard","reason":"学习「10以内数的比较」需要先掌握「6到10各数的认识」。"},{"topicId":"cnm_p009","prerequisiteId":"cnm_p002","strength":"hard","reason":"学习「10以内数的比较」需要先掌握「5以内数的大小」。"},{"topicId":"cnm_p010","prerequisiteId":"cnm_p006","strength":"hard","reason":"学习「10以内的加法」需要先掌握「5以内的加法」。"},{"topicId":"cnm_p010","prerequisiteId":"cnm_p008","strength":"hard","reason":"学习「10以内的加法」需要先掌握「6到10各数的认识」。"},{"topicId":"cnm_p011","prerequisiteId":"cnm_p007","strength":"hard","reason":"学习「10以内的减法」需要先掌握「5以内的减法」。"},{"topicId":"cnm_p011","prerequisiteId":"cnm_p010","strength":"hard","reason":"学习「10以内的减法」需要先掌握「10以内的加法」。"},{"topicId":"cnm_p012","prerequisiteId":"cnm_p011","strength":"hard","reason":"学习「连加和连减」需要先掌握「10以内的减法」。"},{"topicId":"cnm_p013","prerequisiteId":"cnm_p012","strength":"hard","reason":"学习「10以内加减混合」需要先掌握「连加和连减」。"},{"topicId":"cnm_p014","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「认识长方体、正方体、圆柱和球」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p015","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「上下前后左右」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p016","prerequisiteId":"cnm_p008","strength":"hard","reason":"学习「11到20各数的认识」需要先掌握「6到10各数的认识」。"},{"topicId":"cnm_p017","prerequisiteId":"cnm_p016","strength":"hard","reason":"学习「十位和个位」需要先掌握「11到20各数的认识」。"},{"topicId":"cnm_p018","prerequisiteId":"cnm_p017","strength":"hard","reason":"学习「20以内不进位加法」需要先掌握「十位和个位」。"},{"topicId":"cnm_p018","prerequisiteId":"cnm_p010","strength":"hard","reason":"学习「20以内不进位加法」需要先掌握「10以内的加法」。"},{"topicId":"cnm_p019","prerequisiteId":"cnm_p010","strength":"hard","reason":"学习「凑十法」需要先掌握「10以内的加法」。"},{"topicId":"cnm_p020","prerequisiteId":"cnm_p019","strength":"hard","reason":"学习「9加几」需要先掌握「凑十法」。"},{"topicId":"cnm_p021","prerequisiteId":"cnm_p020","strength":"hard","reason":"学习「8、7、6加几」需要先掌握「9加几」。"},{"topicId":"cnm_p022","prerequisiteId":"cnm_p008","strength":"hard","reason":"学习「用数介绍和简单分类」需要先掌握「6到10各数的认识」。"},{"topicId":"cnm_p023","prerequisiteId":"cnm_p014","strength":"hard","reason":"学习「认识长方形、正方形、三角形和圆」需要先掌握「认识长方体、正方体、圆柱和球」。"},{"topicId":"cnm_p024","prerequisiteId":"cnm_p023","strength":"hard","reason":"学习「平面图形的拼组」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p025","prerequisiteId":"cnm_p020","strength":"hard","reason":"学习「十几减9」需要先掌握「9加几」。"},{"topicId":"cnm_p026","prerequisiteId":"cnm_p025","strength":"hard","reason":"学习「十几减8、7、6」需要先掌握「十几减9」。"},{"topicId":"cnm_p026","prerequisiteId":"cnm_p021","strength":"hard","reason":"学习「十几减8、7、6」需要先掌握「8、7、6加几」。"},{"topicId":"cnm_p027","prerequisiteId":"cnm_p026","strength":"hard","reason":"学习「十几减5、4、3、2」需要先掌握「十几减8、7、6」。"},{"topicId":"cnm_p028","prerequisiteId":"cnm_p016","strength":"hard","reason":"学习「100以内数的认识」需要先掌握「11到20各数的认识」。"},{"topicId":"cnm_p029","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「100以内数的大小」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p029","prerequisiteId":"cnm_p009","strength":"hard","reason":"学习「100以内数的大小」需要先掌握「10以内数的比较」。"},{"topicId":"cnm_p030","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「整十数的加减」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p030","prerequisiteId":"cnm_p010","strength":"hard","reason":"学习「整十数的加减」需要先掌握「10以内的加法」。"},{"topicId":"cnm_p031","prerequisiteId":"cnm_p030","strength":"hard","reason":"学习「100以内口算加法」需要先掌握「整十数的加减」。"},{"topicId":"cnm_p031","prerequisiteId":"cnm_p021","strength":"hard","reason":"学习「100以内口算加法」需要先掌握「8、7、6加几」。"},{"topicId":"cnm_p032","prerequisiteId":"cnm_p031","strength":"hard","reason":"学习「100以内口算减法」需要先掌握「100以内口算加法」。"},{"topicId":"cnm_p032","prerequisiteId":"cnm_p027","strength":"hard","reason":"学习「100以内口算减法」需要先掌握「十几减5、4、3、2」。"},{"topicId":"cnm_p033","prerequisiteId":"cnm_p031","strength":"hard","reason":"学习「100以内笔算加法」需要先掌握「100以内口算加法」。"},{"topicId":"cnm_p034","prerequisiteId":"cnm_p032","strength":"hard","reason":"学习「100以内笔算减法」需要先掌握「100以内口算减法」。"},{"topicId":"cnm_p034","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「100以内笔算减法」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p035","prerequisiteId":"cnm_p034","strength":"hard","reason":"学习「部分与总数」需要先掌握「100以内笔算减法」。"},{"topicId":"cnm_p036","prerequisiteId":"cnm_p030","strength":"hard","reason":"学习「认识人民币」需要先掌握「整十数的加减」。"},{"topicId":"cnm_p037","prerequisiteId":"cnm_p022","strength":"hard","reason":"学习「分类与整理」需要先掌握「用数介绍和简单分类」。"},{"topicId":"cnm_p037","prerequisiteId":"cnm_p029","strength":"hard","reason":"学习「分类与整理」需要先掌握「100以内数的大小」。"},{"topicId":"cnm_p038","prerequisiteId":"cnm_p012","strength":"hard","reason":"学习「乘法的意义」需要先掌握「连加和连减」。"},{"topicId":"cnm_p040","prerequisiteId":"cnm_p008","strength":"hard","reason":"学习「认识厘米」需要先掌握「6到10各数的认识」。"},{"topicId":"cnm_p049","prerequisiteId":"cnm_p015","strength":"hard","reason":"学习「东、南、西、北」需要先掌握「上下前后左右」。"},{"topicId":"cnm_p053","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「万以内数的认识」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p054","prerequisiteId":"cnm_p029","strength":"hard","reason":"学习「万以内数的大小比较」需要先掌握「100以内数的大小」。"},{"topicId":"cnm_p056","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「克和千克」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p056","prerequisiteId":"cnm_p041","strength":"hard","reason":"学习「克和千克」需要先掌握「认识米」。"},{"topicId":"cnm_p057","prerequisiteId":"cnm_p031","strength":"hard","reason":"学习「乘加乘减的运算顺序」需要先掌握「100以内口算加法」。"},{"topicId":"cnm_p058","prerequisiteId":"cnm_p057","strength":"hard","reason":"学习「带小括号的两步运算」需要先掌握「乘加乘减的运算顺序」。"},{"topicId":"cnm_p059","prerequisiteId":"cnm_p058","strength":"hard","reason":"学习「两步加减应用」需要先掌握「带小括号的两步运算」。"},{"topicId":"cnm_p059","prerequisiteId":"cnm_p035","strength":"hard","reason":"学习「两步加减应用」需要先掌握「部分与总数」。"},{"topicId":"cnm_p060","prerequisiteId":"cnm_p010","strength":"hard","reason":"学习「简单的变化规律」需要先掌握「10以内的加法」。"},{"topicId":"cnm_p060","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「简单的变化规律」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p061","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「秒的认识」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p063","prerequisiteId":"cnm_p032","strength":"hard","reason":"学习「经过时间」需要先掌握「100以内口算减法」。"},{"topicId":"cnm_p064","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「几百几十的口算加法」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p065","prerequisiteId":"cnm_p034","strength":"hard","reason":"学习「几百几十的口算减法」需要先掌握「100以内笔算减法」。"},{"topicId":"cnm_p067","prerequisiteId":"cnm_p040","strength":"hard","reason":"学习「毫米」需要先掌握「认识厘米」。"},{"topicId":"cnm_p068","prerequisiteId":"cnm_p067","strength":"hard","reason":"学习「分米」需要先掌握「毫米」。"},{"topicId":"cnm_p069","prerequisiteId":"cnm_p041","strength":"hard","reason":"学习「千米」需要先掌握「认识米」。"},{"topicId":"cnm_p070","prerequisiteId":"cnm_p056","strength":"hard","reason":"学习「吨的认识」需要先掌握「克和千克」。"},{"topicId":"cnm_p073","prerequisiteId":"cnm_p042","strength":"hard","reason":"学习「倍的认识」需要先掌握「7、8、9的乘法口诀」。"},{"topicId":"cnm_p074","prerequisiteId":"cnm_p042","strength":"hard","reason":"学习「多位数乘一位数」需要先掌握「7、8、9的乘法口诀」。"},{"topicId":"cnm_p074","prerequisiteId":"cnm_p071","strength":"hard","reason":"学习「多位数乘一位数」需要先掌握「三位数加法笔算」。"},{"topicId":"cnm_p075","prerequisiteId":"cnm_p074","strength":"hard","reason":"学习「因数中间或末尾有 0 的乘法」需要先掌握「多位数乘一位数」。"},{"topicId":"cnm_p076","prerequisiteId":"cnm_p053","strength":"hard","reason":"学习「数字编码」需要先掌握「万以内数的认识」。"},{"topicId":"cnm_p077","prerequisiteId":"cnm_p023","strength":"hard","reason":"学习「长方形和正方形的特征」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p078","prerequisiteId":"cnm_p077","strength":"hard","reason":"学习「长方形和正方形的周长」需要先掌握「长方形和正方形的特征」。"},{"topicId":"cnm_p078","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「长方形和正方形的周长」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p079","prerequisiteId":"cnm_p043","strength":"hard","reason":"学习「几分之一」需要先掌握「除法的意义」。"},{"topicId":"cnm_p080","prerequisiteId":"cnm_p079","strength":"hard","reason":"学习「同分母分数的初步加减」需要先掌握「几分之一」。"},{"topicId":"cnm_p081","prerequisiteId":"cnm_p034","strength":"hard","reason":"学习「集合图里的重叠」需要先掌握「100以内笔算减法」。"},{"topicId":"cnm_p082","prerequisiteId":"cnm_p049","strength":"hard","reason":"学习「东北、东南、西北、西南」需要先掌握「东、南、西、北」。"},{"topicId":"cnm_p083","prerequisiteId":"cnm_p044","strength":"hard","reason":"学习「除数是一位数的除法」需要先掌握「用7、8、9的口诀求商」。"},{"topicId":"cnm_p083","prerequisiteId":"cnm_p074","strength":"hard","reason":"学习「除数是一位数的除法」需要先掌握「多位数乘一位数」。"},{"topicId":"cnm_p084","prerequisiteId":"cnm_p083","strength":"hard","reason":"学习「除法解决实际问题」需要先掌握「除数是一位数的除法」。"},{"topicId":"cnm_p085","prerequisiteId":"cnm_p037","strength":"hard","reason":"学习「复式统计表」需要先掌握「分类与整理」。"},{"topicId":"cnm_p085","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「复式统计表」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p086","prerequisiteId":"cnm_p074","strength":"hard","reason":"学习「两位数乘两位数」需要先掌握「多位数乘一位数」。"},{"topicId":"cnm_p088","prerequisiteId":"cnm_p078","strength":"hard","reason":"学习「面积的意义」需要先掌握「长方形和正方形的周长」。"},{"topicId":"cnm_p089","prerequisiteId":"cnm_p088","strength":"hard","reason":"学习「长方形和正方形的面积」需要先掌握「面积的意义」。"},{"topicId":"cnm_p089","prerequisiteId":"cnm_p074","strength":"hard","reason":"学习「长方形和正方形的面积」需要先掌握「多位数乘一位数」。"},{"topicId":"cnm_p090","prerequisiteId":"cnm_p089","strength":"hard","reason":"学习「面积单位的换算」需要先掌握「长方形和正方形的面积」。"},{"topicId":"cnm_p090","prerequisiteId":"cnm_p068","strength":"hard","reason":"学习「面积单位的换算」需要先掌握「分米」。"},{"topicId":"cnm_p091","prerequisiteId":"cnm_p062","strength":"hard","reason":"学习「年、月、日」需要先掌握「时、分、秒的进率」。"},{"topicId":"cnm_p092","prerequisiteId":"cnm_p091","strength":"hard","reason":"学习「24时记时法」需要先掌握「年、月、日」。"},{"topicId":"cnm_p093","prerequisiteId":"cnm_p079","strength":"hard","reason":"学习「一位小数的初步认识」需要先掌握「几分之一」。"},{"topicId":"cnm_p093","prerequisiteId":"cnm_p036","strength":"hard","reason":"学习「一位小数的初步认识」需要先掌握「认识人民币」。"},{"topicId":"cnm_p094","prerequisiteId":"cnm_p093","strength":"hard","reason":"学习「一位小数的加减」需要先掌握「一位小数的初步认识」。"},{"topicId":"cnm_p095","prerequisiteId":"cnm_p039","strength":"hard","reason":"学习「简单的搭配」需要先掌握「2到6的乘法口诀」。"},{"topicId":"cnm_p098","prerequisiteId":"cnm_p090","strength":"hard","reason":"学习「公顷和平方千米」需要先掌握「面积单位的换算」。"},{"topicId":"cnm_p098","prerequisiteId":"cnm_p069","strength":"hard","reason":"学习「公顷和平方千米」需要先掌握「千米」。"},{"topicId":"cnm_p099","prerequisiteId":"cnm_p040","strength":"hard","reason":"学习「线段、直线和射线」需要先掌握「认识厘米」。"},{"topicId":"cnm_p100","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「角的度量」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p103","prerequisiteId":"cnm_p101","strength":"hard","reason":"学习「垂直」需要先掌握「锐角、直角和钝角」。"},{"topicId":"cnm_p106","prerequisiteId":"cnm_p083","strength":"hard","reason":"学习「除数是两位数的除法」需要先掌握「除数是一位数的除法」。"},{"topicId":"cnm_p108","prerequisiteId":"cnm_p085","strength":"hard","reason":"学习「条形统计图」需要先掌握「复式统计表」。"},{"topicId":"cnm_p109","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「简单的优化」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p110","prerequisiteId":"cnm_p059","strength":"hard","reason":"学习「四则运算各部分间的关系」需要先掌握「两步加减应用」。"},{"topicId":"cnm_p111","prerequisiteId":"cnm_p084","strength":"hard","reason":"学习「常见数量关系」需要先掌握「除法解决实际问题」。"},{"topicId":"cnm_p113","prerequisiteId":"cnm_p023","strength":"hard","reason":"学习「从不同方向观察物体」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p118","prerequisiteId":"cnm_p093","strength":"hard","reason":"学习「小数的意义」需要先掌握「一位小数的初步认识」。"},{"topicId":"cnm_p119","prerequisiteId":"cnm_p029","strength":"hard","reason":"学习「比较小数的大小」需要先掌握「100以内数的大小」。"},{"topicId":"cnm_p125","prerequisiteId":"cnm_p094","strength":"hard","reason":"学习「小数加减法」需要先掌握「一位小数的加减」。"},{"topicId":"cnm_p125","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「小数加减法」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p127","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「轴对称」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p132","prerequisiteId":"cnm_p074","strength":"hard","reason":"学习「小数乘整数」需要先掌握「多位数乘一位数」。"},{"topicId":"cnm_p136","prerequisiteId":"cnm_p082","strength":"hard","reason":"学习「用数对确定位置」需要先掌握「东北、东南、西北、西南」。"},{"topicId":"cnm_p147","prerequisiteId":"cnm_p089","strength":"hard","reason":"学习「平行四边形的面积」需要先掌握「长方形和正方形的面积」。"},{"topicId":"cnm_p151","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「植树问题」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p160","prerequisiteId":"cnm_p077","strength":"hard","reason":"学习「长方体和正方体的认识」需要先掌握「长方形和正方形的特征」。"},{"topicId":"cnm_p161","prerequisiteId":"cnm_p089","strength":"hard","reason":"学习「长方体的表面积」需要先掌握「长方形和正方形的面积」。"},{"topicId":"cnm_p162","prerequisiteId":"cnm_p090","strength":"hard","reason":"学习「体积单位」需要先掌握「面积单位的换算」。"},{"topicId":"cnm_p165","prerequisiteId":"cnm_p079","strength":"hard","reason":"学习「分数的意义」需要先掌握「几分之一」。"},{"topicId":"cnm_p173","prerequisiteId":"cnm_p080","strength":"hard","reason":"学习「异分母分数加减」需要先掌握「同分母分数的初步加减」。"},{"topicId":"cnm_p174","prerequisiteId":"cnm_p058","strength":"hard","reason":"学习「分数加减混合」需要先掌握「带小括号的两步运算」。"},{"topicId":"cnm_p180","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「根据方向和距离确定位置」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p188","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「圆的认识」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p192","prerequisiteId":"cnm_p089","strength":"hard","reason":"学习「圆的面积」需要先掌握「长方形和正方形的面积」。"},{"topicId":"cnm_p193","prerequisiteId":"cnm_p101","strength":"hard","reason":"学习「扇形的认识」需要先掌握「锐角、直角和钝角」。"},{"topicId":"cnm_p200","prerequisiteId":"cnm_p089","strength":"soft","reason":"「长方形和正方形的面积」对学习「数与形」有帮助，但不会前者也可以开始学后者。"},{"topicId":"cnm_102","prerequisiteId":"cnm_p085","strength":"hard","reason":"学习「全面调查与抽样调查」需要先会小学的「复式统计表」。小学已学数据收集与整理。"},{"topicId":"cnm_106","prerequisiteId":"cnm_p085","strength":"hard","reason":"学习「频数分布表与数据分组」需要先会小学的「复式统计表」。对数据分组整理要以小学学过的统计表和统计图知识为基础。"},{"topicId":"cnm_148","prerequisiteId":"cnm_p089","strength":"soft","reason":"学习「完全平方公式」需要先会小学的「长方形和正方形的面积」。完全平方公式可以用小学学过的正方形和长方形面积图形来直观解释。"},{"topicId":"cnm_h230","prerequisiteId":"cnm_p095","strength":"hard","reason":"分类加法是小学里简单搭配继续发展后的计数原理。"},{"topicId":"cnm_p217","prerequisiteId":"cnm_p034","strength":"hard","reason":"学习「求两数相差几」需要先掌握「100以内笔算减法」。"},{"topicId":"cnm_p217","prerequisiteId":"cnm_p009","strength":"soft","reason":"学习「求两数相差几」需要先掌握「10以内数的比较」。"},{"topicId":"cnm_p218","prerequisiteId":"cnm_p217","strength":"hard","reason":"学习「求比一个数多（少）几的数」需要先掌握「求两数相差几」。"},{"topicId":"cnm_p218","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「求比一个数多（少）几的数」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p221","prerequisiteId":"cnm_p014","strength":"hard","reason":"学习「观察简单的立体积木」需要先掌握「认识长方体、正方体、圆柱和球」。"},{"topicId":"cnm_p221","prerequisiteId":"cnm_p023","strength":"soft","reason":"学习「观察简单的立体积木」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p222","prerequisiteId":"cnm_p221","strength":"hard","reason":"学习「长方体纸盒的展开图」需要先掌握「观察简单的立体积木」。"},{"topicId":"cnm_p222","prerequisiteId":"cnm_p014","strength":"hard","reason":"学习「长方体纸盒的展开图」需要先掌握「认识长方体、正方体、圆柱和球」。"},{"topicId":"cnm_p223","prerequisiteId":"cnm_p057","strength":"hard","reason":"学习「同级运算与两级运算的运算顺序」需要先掌握「乘加乘减的运算顺序」。"},{"topicId":"cnm_p223","prerequisiteId":"cnm_p220","strength":"soft","reason":"学习「同级运算与两级运算的运算顺序」需要先掌握「加减法各部分间的关系」。"},{"topicId":"cnm_p224","prerequisiteId":"cnm_p219","strength":"hard","reason":"学习「等量代换（曹冲称象）」需要先掌握「数量间的乘除关系」。"},{"topicId":"cnm_p224","prerequisiteId":"cnm_p056","strength":"soft","reason":"学习「等量代换（曹冲称象）」需要先掌握「克和千克」。"},{"topicId":"cnm_p225","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「角的认识」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p225","prerequisiteId":"cnm_p023","strength":"soft","reason":"学习「角的认识」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p226","prerequisiteId":"cnm_p079","strength":"hard","reason":"学习「几分之几」需要先掌握「几分之一」。"},{"topicId":"cnm_p227","prerequisiteId":"cnm_p226","strength":"hard","reason":"学习「简单的分数大小比较」需要先掌握「几分之几」。"},{"topicId":"cnm_p227","prerequisiteId":"cnm_p079","strength":"hard","reason":"学习「简单的分数大小比较」需要先掌握「几分之一」。"},{"topicId":"cnm_p228","prerequisiteId":"cnm_p023","strength":"hard","reason":"学习「生活中的运动现象」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p228","prerequisiteId":"cnm_p024","strength":"soft","reason":"学习「生活中的运动现象」需要先掌握「平面图形的拼组」。"},{"topicId":"cnm_p229","prerequisiteId":"cnm_p023","strength":"hard","reason":"学习「多边形的认识」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p229","prerequisiteId":"cnm_p225","strength":"soft","reason":"学习「多边形的认识」需要先掌握「角的认识」。"},{"topicId":"cnm_p232","prerequisiteId":"cnm_p101","strength":"hard","reason":"学习「平角、周角和角的分类」需要先掌握「锐角、直角和钝角」。"},{"topicId":"cnm_p237","prerequisiteId":"cnm_p221","strength":"hard","reason":"学习「观察简单组合体」需要先掌握「观察简单的立体积木」。"},{"topicId":"cnm_p058","prerequisiteId":"cnm_p223","strength":"hard","reason":"学习「带小括号的两步运算」需要先掌握「同级运算与两级运算的运算顺序」。"},{"topicId":"cnm_p101","prerequisiteId":"cnm_p225","strength":"hard","reason":"学习「锐角、直角和钝角」需要先掌握「角的认识」。"},{"topicId":"cnm_p080","prerequisiteId":"cnm_p226","strength":"soft","reason":"学习「同分母分数的初步加减」需要先掌握「几分之几」。"},{"topicId":"cnm_p077","prerequisiteId":"cnm_p229","strength":"soft","reason":"学习「长方形和正方形的特征」需要先掌握「多边形的认识」。"},{"topicId":"cnm_056","prerequisiteId":"cnm_p225","strength":"hard","reason":"学习「角的概念与表示」需要先掌握「角的认识」。"},{"topicId":"cnm_053","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「直线、射线、线段」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_051","prerequisiteId":"cnm_p222","strength":"soft","reason":"学习「从不同方向看与立体图形的展开图」需要先掌握「长方体纸盒的展开图」。"},{"topicId":"cnm_131","prerequisiteId":"cnm_p228","strength":"soft","reason":"学习「轴对称图形与两个图形成轴对称」需要先掌握「生活中的运动现象」。"}]};
/* __DIAG_GRAPH_END__ */

/* ---------------- 每日问答（纯函数，可单测） ---------------- */

const QUIZ_SUBJECTS = ['语文', '数学', '英语', '阅读'];
const QUIZ_SLOTS_ALL = [...QUIZ_SUBJECTS, '其他'];

// 打卡勾选科目 → 问答题槽科目列表（去重、按固定顺序；“全部完成”展开为 5 科）
function expandQuizSubjects(subjects) {
  if (!Array.isArray(subjects)) return [];
  if (subjects.includes('全部完成')) return [...QUIZ_SLOTS_ALL];
  const seen = new Set();
  const out = [];
  for (const s of QUIZ_SLOTS_ALL) {
    if (subjects.includes(s) && !seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out;
}

// 每日题数：每科 1 题（2026-11-09 起不再含脑筋急转弯，谜语只出现在兄弟对战防守题）；没有科目则 0 题
function quizDailyTotal(subjects) {
  const slots = expandQuizSubjects(subjects);
  if (!slots.length) return 0;
  return Math.min(slots.length, 6);
}

// 孩子年级文本（家长可改）→ 题库年级号；识别不了返回 null
function gradeNumFromLabel(label) {
  const s = String(label || '');
  if (/[1１一]/.test(s)) return 1;
  if (/[3３三]/.test(s)) return 3;
  return null;
}

// 累计答对 N 题 → 应有碎片数（每 5 题 1 枚）
function fragmentsForCorrectTotal(total) {
  return Math.floor(Math.max(0, Number(total) || 0) / 5);
}

// 本次答对是否触发 1 枚新碎片
function fragmentAwardOnCorrect(oldTotal) {
  return fragmentsForCorrectTotal((Number(oldTotal) || 0) + 1) - fragmentsForCorrectTotal(oldTotal);
}
/* 普通转盘奖池（2026-11-07 调整）：进化石全部移出、只在高级转盘出；
 * 新增活力碎片 6、高级球 6；合计仍为 100。 */
const OAK_WHEEL_POOL = [
  ['xp', 20], ['ball', 10],
  ['care:apple', 5], ['care:berry', 5], ['care:cookie', 5], ['care:meat', 5], ['care:milk', 5], ['care:honey', 5],
  ['care:bubble', 3], ['care:shower', 3], ['care:petal', 3], ['care:herb', 3],
  ['medicine:potion', 6], ['medicine:super-potion', 4], ['medicine:berry-juice', 3], ['medicine:water', 3],
  ['medicine:revive', 6], ['ball:hyper', 6],
];
/* 养成转盘奖池（2026-11-08 新建，Daily English 奖励）：只出照顾道具，10 样；
 * 食物 6 种各权重 5、洗澡 4 种各权重 3，总权重 42；
 * 相对概率与普通转盘 OAK_WHEEL_POOL 里照顾道具部分一致。 */
const CARE_WHEEL_POOL = [
  ['care:apple', 5], ['care:berry', 5], ['care:cookie', 5], ['care:meat', 5], ['care:milk', 5], ['care:honey', 5],
  ['care:bubble', 3], ['care:shower', 3], ['care:petal', 3], ['care:herb', 3],
];

/* 抽奖奖品展示文案（纯函数）：xp/ball 走固定文案，item 走 ITEM_CATALOG。 */
function oakPrizeDisplay(prize, prizeKey) {
  if (prize === 'xp') return { prizeName: '经验+10', prizeEmoji: '⭐' };
  if (prize === 'ball') return { prizeName: '普通精灵球', prizeEmoji: '🔴' };
  const cat = ITEM_CATALOG[prizeKey] || {};
  return { prizeName: cat.name || prizeKey || '奖品', prizeEmoji: cat.emoji || '🎁' };
}

/* Oak 奖池扇区（纯函数）：OAK_WHEEL_POOL → buildWheelSectors 条目；label/emoji 复用 oakPrizeDisplay。 */
function oakWheelEntries() {
  return OAK_WHEEL_POOL.map(([key, weight]) => {
    const prize = key === 'xp' ? 'xp' : key === 'ball' ? 'ball' : 'item';
    const { prizeName, prizeEmoji } = oakPrizeDisplay(prize, key);
    return { key, label: prizeName, emoji: prizeEmoji, weight };
  });
}
/* 养成转盘扇区（纯函数）：CARE_WHEEL_POOL → buildWheelSectors 条目；label/emoji 复用 oakPrizeDisplay。 */
function careWheelEntries() {
  return CARE_WHEEL_POOL.map(([key, weight]) => {
    const { prizeName, prizeEmoji } = oakPrizeDisplay('item', key);
    return { key, label: prizeName, emoji: prizeEmoji, weight };
  });
}

// 有效招式 = 等级招式 ∪ 已解锁招式（按招式等级排序）
function effectiveMoves(lineKey, level, unlockedNames = [], moveLevels = {}) {
  const all = new Map();
  for (const m of learnedMoves(lineKey, level)) all.set(m[1], { level: m[0], name: m[1], desc: m[2], skillLevel: skillLevelOf(moveLevels, m[1]) });
  for (const m of LINES[lineKey].moves) {
    if ((unlockedNames || []).includes(m[1]) && !all.has(m[1])) {
      all.set(m[1], { level: m[0], name: m[1], desc: m[2], early: true, skillLevel: skillLevelOf(moveLevels, m[1]) });
    }
  }
  return [...all.values()].sort((a, b) => a.level - b.level);
}



/* ---------------- 数学学习进度门（DESIGN-学习进度门-v1） ----------------
 * 章节表为北师大版目录（见 ~/workspace/studymon-hw/DESIGN-数学北师大映射方案-草案.md；
 * 草案 v1，2026-10-24，1、3 年级为实施关键册，2、4、5、6 年级表待课本核对）；
 * 顺序即教学顺序；顺序值 = 年级*10000 + (下册?1000:0) + 单元（综合与实践=90），
 * 跨年级可直接比较：低年级章节恒小于本年级、高年级章节恒大于本年级进度，
 * 封存/已学由一次比较自然得到。综合与实践（数学好玩）统一列于各册末尾，
 * 按顺序值 90 保守处理：只有进度设到该条目或之后才进池。 */
const MATH_CHAPTERS = {
  1: ['一年级上册 第1单元 生活中的数', '一年级上册 第2单元 比较', '一年级上册 第3单元 加减法（一）', '一年级上册 第4单元 分类', '一年级上册 第5单元 位置与顺序', '一年级上册 第6单元 认识图形', '一年级上册 第7单元 加减法（二）', '一年级上册 第8单元 认识钟表', '一年级上册 综合与实践 数学好玩', '一年级下册 第1单元 加与减（一）', '一年级下册 第2单元 观察物体', '一年级下册 第3单元 生活中的数', '一年级下册 第4单元 有趣的图形', '一年级下册 第5单元 加与减（二）', '一年级下册 第6单元 加与减（三）', '一年级下册 综合与实践 数学好玩'],
  2: ['二年级上册 第1单元 加与减', '二年级上册 第2单元 购物', '二年级上册 第3单元 数一数与乘法', '二年级上册 第4单元 图形的变化', '二年级上册 第5单元 2～5的乘法口诀', '二年级上册 第6单元 测量', '二年级上册 第7单元 分一分与除法', '二年级上册 第8单元 6～9的乘法口诀', '二年级上册 第9单元 除法', '二年级上册 综合与实践 数学好玩', '二年级下册 第1单元 除法', '二年级下册 第2单元 方向与位置', '二年级下册 第3单元 生活中的大数', '二年级下册 第4单元 测量', '二年级下册 第5单元 加与减', '二年级下册 第6单元 认识图形', '二年级下册 第7单元 时、分、秒', '二年级下册 第8单元 调查与记录', '二年级下册 综合与实践 数学好玩'],
  3: ['三年级上册 第1单元 混合运算', '三年级上册 第2单元 观察物体', '三年级上册 第3单元 加与减', '三年级上册 第4单元 乘与除', '三年级上册 第5单元 周长', '三年级上册 第6单元 乘法', '三年级上册 第7单元 年、月、日', '三年级上册 第8单元 认识小数', '三年级上册 综合与实践 数学好玩', '三年级下册 第1单元 除法', '三年级下册 第2单元 图形的运动', '三年级下册 第3单元 乘法', '三年级下册 第4单元 千克、克、吨', '三年级下册 第5单元 面积', '三年级下册 第6单元 认识分数', '三年级下册 第7单元 数据的整理与表示', '三年级下册 综合与实践 数学好玩'],
  4: ['四年级上册 第1单元 认识更大的数', '四年级上册 第2单元 线与角', '四年级上册 第3单元 乘法', '四年级上册 第4单元 运算律', '四年级上册 第5单元 方向与位置', '四年级上册 第6单元 除法', '四年级上册 第7单元 生活中的负数', '四年级上册 第8单元 可能性', '四年级上册 综合与实践 数学好玩', '四年级下册 第1单元 小数的意义和加减法', '四年级下册 第2单元 认识三角形和四边形', '四年级下册 第3单元 小数乘法', '四年级下册 第4单元 观察物体', '四年级下册 第5单元 认识方程', '四年级下册 第6单元 数据的表示和分析', '四年级下册 综合与实践 数学好玩'],
  5: ['五年级上册 第1单元 小数除法', '五年级上册 第2单元 轴对称和平移', '五年级上册 第3单元 倍数与因数', '五年级上册 第4单元 多边形的面积', '五年级上册 第5单元 分数的意义', '五年级上册 第6单元 组合图形的面积', '五年级上册 第7单元 可能性', '五年级上册 综合与实践 数学好玩', '五年级下册 第1单元 分数加减法', '五年级下册 第2单元 长方体（一）', '五年级下册 第3单元 分数乘法', '五年级下册 第4单元 长方体（二）', '五年级下册 第5单元 分数除法', '五年级下册 第6单元 确定位置', '五年级下册 第7单元 用方程解决问题', '五年级下册 第8单元 数据的表示和分析', '五年级下册 综合与实践 数学好玩'],
  6: ['六年级上册 第1单元 圆', '六年级上册 第2单元 百分数的应用', '六年级上册 第3单元 图形的变换', '六年级上册 第4单元 比的认识', '六年级上册 第5单元 统计', '六年级上册 第6单元 生活中的数', '六年级上册 第7单元 观察物体', '六年级上册 综合与实践 数学好玩', '六年级下册 第1单元 圆柱与圆锥', '六年级下册 第2单元 比例', '六年级下册 第3单元 图形的运动', '六年级下册 第4单元 正比例与反比例', '六年级下册 综合与实践 数学好玩'],
};

/* 语文单元表（部编）：只列一、三年级，各上下册 8 单元；门文本不带主题名 */
const CHINESE_CHAPTERS = {
  1: ['一年级上册 第1单元', '一年级上册 第2单元', '一年级上册 第3单元', '一年级上册 第4单元', '一年级上册 第5单元', '一年级上册 第6单元', '一年级上册 第7单元', '一年级上册 第8单元', '一年级下册 第1单元', '一年级下册 第2单元', '一年级下册 第3单元', '一年级下册 第4单元', '一年级下册 第5单元', '一年级下册 第6单元', '一年级下册 第7单元', '一年级下册 第8单元'],
  3: ['三年级上册 第1单元', '三年级上册 第2单元', '三年级上册 第3单元', '三年级上册 第4单元', '三年级上册 第5单元', '三年级上册 第6单元', '三年级上册 第7单元', '三年级上册 第8单元', '三年级下册 第1单元', '三年级下册 第2单元', '三年级下册 第3单元', '三年级下册 第4单元', '三年级下册 第5单元', '三年级下册 第6单元', '三年级下册 第7单元', '三年级下册 第8单元'],
};

/* 英语单元表：三年级 PEP 2026 秋（上册 7 单元、下册 6 单元），一年级自产（上下册各 6 单元）；无综合与实践 */
const ENGLISH_UNITS = {
  1: ['一年级上册 Unit 1 Hello!（自产）', '一年级上册 Unit 2 My Body（自产）', '一年级上册 Unit 3 Colours（自产）', '一年级上册 Unit 4 Numbers（自产）', '一年级上册 Unit 5 School Things（自产）', '一年级上册 Unit 6 Animals（自产）', '一年级下册 Unit 1 In the Classroom（自产）', '一年级下册 Unit 2 My Family（自产）', '一年级下册 Unit 3 Fruit（自产）', '一年级下册 Unit 4 Toys（自产）', '一年级下册 Unit 5 Weather（自产）', '一年级下册 Unit 6 Farm Animals（自产）'],
  3: ['三年级上册 Unit 1 Making friends', '三年级上册 Unit 2 Different families', '三年级上册 Unit 3 Our animal friends', '三年级上册 Unit 4 Plants around us', '三年级上册 Unit 5 The colourful world', '三年级上册 Unit 6 Useful numbers', '三年级上册 Unit 7 Revision: Being a good guest', '三年级下册 Unit 1 Meeting new people', '三年级下册 Unit 2 My words and actions', '三年级下册 Unit 3 Tools and senses for learning', '三年级下册 Unit 4 Healthy food', '三年级下册 Unit 5 Old things', '三年级下册 Unit 6 Numbers in life'],
};

const MATH_GRADE_CHARS = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };

/* 章节文本 → 顺序值；无法解析返回 null */
function chapterOrder(chapter) { return chapterOrderFor(GATE_SUBJECTS.math, chapter); }
function englishOrder(chapter) { return chapterOrderFor(GATE_SUBJECTS.english, chapter); }

function showEnglishZh(gradeNum, englishMode, progressOrd, contentOrd) {
  return !(gradeNum === 3 && englishMode === true &&
    progressOrd != null && contentOrd != null &&
    contentOrd <= progressOrd);
}

const GATE_SUBJECTS = {
  math:    { chapters: MATH_CHAPTERS,    unitRe: /第(\d+)单元/, extraUnit: { text: '综合与实践', unit: 90 }, defaultMatch: (c) => c.includes('上册 第2单元'),     keyPrefix: 'math_progress_',    subject: '数学', emptyChapter: 'pass',  reviewChapter: null },
  chinese: { chapters: CHINESE_CHAPTERS, unitRe: /第(\d+)单元/, extraUnit: null,                         defaultMatch: (c) => c.includes('上册 第2单元'),     keyPrefix: 'chinese_progress_', subject: '语文', emptyChapter: 'block', reviewChapter: '通用复习' },
  english: { chapters: ENGLISH_UNITS,    unitRe: /Unit\s*(\d+)/, extraUnit: null,                        defaultMatch: (c) => /上册 Unit 2(?:\s|$)/.test(c), keyPrefix: 'english_progress_', subject: '英语', emptyChapter: 'block', reviewChapter: '通用复习' },
};

function chapterOrderFor(cfg, chapter) {
  if (typeof chapter !== 'string' || !chapter) return null;
  const grade = MATH_GRADE_CHARS[chapter.charAt(0)];
  if (!grade) return null;
  let term;
  if (chapter.includes('下册')) term = 1000;
  else if (chapter.includes('上册')) term = 0;
  else return null;
  let unit;
  if (cfg.extraUnit && chapter.includes(cfg.extraUnit.text)) {
    unit = cfg.extraUnit.unit;
  } else {
    const m = chapter.match(cfg.unitRe);
    if (!m) return null;
    unit = Number(m[1]);
  }
  return grade * 10000 + term + unit;
}
function gateFor(cfg, gradeNum, chapterText) {
  const list = cfg.chapters[gradeNum];
  if (!Array.isArray(list)) return null;
  const idx = list.indexOf(chapterText);
  if (idx < 0) return null;
  const ord = chapterOrderFor(cfg, chapterText);
  return { chapter: chapterText, ord, currentOrd: ord, prevOrd: idx > 0 ? chapterOrderFor(cfg, list[idx - 1]) : null, chapters: list };
}
function defaultChapterFor(cfg, gradeNum) {
  const list = cfg.chapters[gradeNum];
  if (!Array.isArray(list)) return null;
  const hit = list.find(cfg.defaultMatch);
  return hit === undefined ? null : hit;
}
async function loadGate(cfg, db, child, prefetchedRaw) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const list = gradeNum != null ? cfg.chapters[gradeNum] : null;
  if (!Array.isArray(list) || !list.length) return null;
  const savedRaw = prefetchedRaw !== undefined ? prefetchedRaw : await getSetting(db, `${cfg.keyPrefix}${child.id}`);
  const saved = savedRaw == null ? '' : String(savedRaw).trim();
  const chapter = saved && list.includes(saved) ? saved : defaultChapterFor(cfg, gradeNum);
  return chapter ? gateFor(cfg, gradeNum, chapter) : null;
}
function gatePass(cfg, q, gate) {
  if (!gate) return true;
  if (q.kind === 'riddle' || q.subject !== cfg.subject) return true;
  if (cfg.reviewChapter && q.chapter === cfg.reviewChapter) return true;
  if (q.chapter == null || q.chapter === '') return cfg.emptyChapter === 'pass';
  const o = chapterOrderFor(cfg, q.chapter);
  if (o === null) return false;
  return o <= gate.ord;
}

/* 数学进度门加载（每日问答／抓捕／防守共用同一套）：读家长为该孩子设的进度，
 * 存值合法才用，否则默认上册第2单元；年级无章节表返回 null（不设门）。 */
function loadMathGate(db, child, prefetchedRaw) { return loadGate(GATE_SUBJECTS.math, db, child, prefetchedRaw); }
function loadChineseGate(db, child, prefetchedRaw) { return loadGate(GATE_SUBJECTS.chinese, db, child, prefetchedRaw); }
function loadEnglishGate(db, child, prefetchedRaw) { return loadGate(GATE_SUBJECTS.english, db, child, prefetchedRaw); }

/* 进度门过滤（每日问答／抓捕／防守共用）：仅数学学习题受门约束；
 * chapter 为空放行（入库规矩保证新题必带标签，见 questionActivationError）；
 * 无法解析剔除（fail-closed）；顺序值超过进度剔除。 */
function mathGatePass(q, mathGate) { return gatePass(GATE_SUBJECTS.math, q, mathGate); }
function chineseGatePass(q, chineseGate) { return gatePass(GATE_SUBJECTS.chinese, q, chineseGate); }
function englishGatePass(q, englishGate) { return gatePass(GATE_SUBJECTS.english, q, englishGate); }

/* 当日选题（纯函数 v2 · 去重升级）：每科对口 1 题（按年级）+「其他」通用 1 题，
 * 上限 5（2026-11-09 起不再出脑筋急转弯，谜语只出现在兄弟对战防守题），槽位内不重复。选题优先级（每个槽位内）：
 *   tier 0 从未答过 ＞ tier 1 答错且已过间隔（错题复习）＞ tier 2 答对但已过窗口；
 *   tier 3（答对未过窗口 / 答错未过间隔）只在前面凑不满时放宽，按 lastDate 最早（最久未出现）补。
 * 仍不足时「其他」通用槽按最久未出现放宽补到 quota；若各科均无可用题则返回空单
 *（2026-11-09 起不再用谜语兜底，保证每天有题的前提是题库有对应科目的题）。
 * rows 需含 id/kind/grade/subject/active。history: Map(id → {lastDate, lastCorrect})，
 * 来自该孩子全部 quiz_attempts 的最近一次作答。不传 history 时行为与旧版一致（全按未答过处理）。 */
function selectDailyQuestions(rows, { gradeNum, subjects, excludeIds = [], history = null, today = null, correctWindowDays = QUIZ_CORRECT_WINDOW_DAYS, rng = Math.random, mathGate = null, chineseGate = null, englishGate = null } = {}) {
  const excl = new Set(excludeIds.map(Number));
  const pool = (rows || []).filter((q) => q.active !== 0 && q.active !== false && q.kind !== 'oak');
  const isMathStudy = (q) => q.kind !== 'riddle' && q.subject === '数学';
  /* 进度门过滤（三门全过）：数学门＋语文门＋英语门，任一对应门不通过即剔除；非对应科目直接放行；脑筋急转弯直接放行；新门（语文/英语）chapter 为空 fail-closed 剔除；无法解析剔除；顺序值超过进度剔除 */
  // Custom questions have chapter = NULL by design (parent-authored, grade/subject already chosen), so the chapter gates do not apply to them.
  const gatedPool = pool.filter((q) => q.kind === 'custom' || (mathGatePass(q, mathGate) && chineseGatePass(q, chineseGate) && englishGatePass(q, englishGate)));
  const gradeOk = (q) => q.kind === 'riddle' || q.grade === gradeNum || q.grade == null;
  const hist = history instanceof Map ? history : new Map();
  const lastDateOf = (q) => { const h = hist.get(Number(q.id)); return h && h.lastDate ? h.lastDate : null; };
  const tierOf = (q) => {
    const h = hist.get(Number(q.id));
    if (!h || !h.lastDate || !today) return 0; // 从未答过
    const gap = diffDays(h.lastDate, today);
    if (h.lastCorrect) return gap >= correctWindowDays ? 2 : 3;
    return gap > QUIZ_WRONG_GAP_DAYS ? 1 : 3;
  };
  /* 权重：进度门内当前单元/上一单元的数学题 ×2，其余 ×1；只作用于 tier 层内随机 */
  const weightOf = (q) => {
    if (!mathGate || !isMathStudy(q)) return 1;
    const o = chapterOrder(q.chapter);
    if (o === null) return 1;
    return (o === mathGate.currentOrd || o === mathGate.prevOrd) ? 2 : 1;
  };
  const picked = [];
  const total = quizDailyTotal(subjects);
  const pickFrom = (cands) => {
    if (!cands.length) return null;
    const minTier = Math.min(...cands.map(tierOf));
    if (minTier <= 2) {
      const tierCands = cands.filter((q) => tierOf(q) === minTier);
      const weights = tierCands.map(weightOf);
      let q;
      if (weights.every((w) => w === weights[0])) {
        // 等权：沿用原公式，保证无权重差异时行为与旧版逐位一致
        q = tierCands[Math.floor(rng() * tierCands.length) % tierCands.length];
      } else {
        // 加权：单次 rng()，累加取第一个累积值 > r 的元素
        const totalW = weights.reduce((s, w) => s + w, 0);
        const r = rng() * totalW;
        let acc = 0;
        q = tierCands[tierCands.length - 1];
        for (let i = 0; i < tierCands.length; i++) {
          acc += weights[i];
          if (acc > r) { q = tierCands[i]; break; }
        }
      }
      picked.push(q);
      return q;
    }
    // 放宽：全是 tier 3，按最久未出现（lastDate 最早）优先，同日按 id 小者
    const sorted = [...cands].sort((a, b) =>
      String(lastDateOf(a) || '').localeCompare(String(lastDateOf(b) || '')) || (a.id - b.id));
    picked.push(sorted[0]);
    return sorted[0];
  };
  const tryPick = (test) => {
    const cands = gatedPool.filter((q) => !excl.has(Number(q.id)) && !picked.some((p) => p.id === q.id) && test(q));
    return pickFrom(cands);
  };
  const tryPickCustom = (s) => {
    const cands = gatedPool.filter((q) => !excl.has(Number(q.id)) && !picked.some((p) => p.id === q.id) && q.kind === 'custom' && q.subject === s && gradeOk(q) && tierOf(q) === 0);
    if (!cands.length) return false;
    cands.sort((a, b) => a.id - b.id);
    picked.push(cands[0]);
    return true;
  };
  const slots = expandQuizSubjects(subjects);
  for (const s of slots) {
    if (picked.length >= total) break;
    if (s === '其他') continue; // 通用槽最后填
    if (tryPickCustom(s)) continue;
    tryPick((q) => q.kind !== 'riddle' && q.subject === s && gradeOk(q));
  }
  if (slots.includes('其他') && picked.length < total) {
    tryPick((q) => q.kind !== 'riddle' && gradeOk(q));
  }
  return picked;
}

/* ---------------- 先修回溯诊断（DESIGN-先修回溯诊断-方案-v1.md，纯函数，可单测） ----------------
 * 两层：①被动统计——30 天窗口重算知识点状态（掌握／不稳／薄弱／未测）；
 * ②按需回溯——薄弱点沿先修边找根因，再出复习题。
 * 口径（用户 2026-10-26 批建议默认值）：薄弱＝30 天内错 ≥2 次且占比 ≥50%，错 1 次＝不稳；
 * 复习题每天额外 2 道、不占每日 6 题额度、不发经验／碎片、不触发掉球与遭遇；
 * 回溯深度上限 6 层，hard 优先、soft 补位；家长端全开。
 * 一处与设计稿 §3.1 字面的取舍：出题池按根因知识点年级取题（题库中题目的 grade 与其 topic 年级一致），
 * 而不是按孩子年级——根因常为低年级基础点，按孩子年级过滤则低年级根因永远无题可出；
 * mathGatePass 仍兜底防超前（低年级题的章节顺序值恒小于孩子进度门）。
 * 先修图见文件头 MATH_PREREQ_G1G3（由 work/gen-diag-graph.mjs 生成：77 个可触发点、137 节点、163 边）。 */
const DIAG_WINDOW_DAYS = 30;
const DIAG_WEAK_MIN_WRONG = 2;
const DIAG_WEAK_MIN_RATIO = 0.5;
const DIAG_MAX_DEPTH = 6;
const DIAG_EXPIRE_DAYS = 7;
const DIAG_FAIL_CLOSED = new Set(['cnm_p076', 'cnm_p081', 'cnm_p095', 'cnm_p224']);
const DIAG_NO_QUESTION_TOPIC = 'cnm_p014';

/* 先修图索引：topics 数组即 topics.json 顺序，idx 即其顺序值（回溯时同强度内按此顺序） */
const DIAG_TOPIC_BY_ID = new Map(MATH_PREREQ_G1G3.topics.map((t, i) => [t.id, { ...t, idx: i }]));
const DIAG_EDGES_BY_TOPIC = new Map();

/* 窗口内知识点统计（纯函数）：attempts 为作答 [{question_id, date_shanghai, correct}]，
 * qTopic 为 Map(qid → topicId)，只统计数学学习题且 topic 在图内；
 * start/end 为窗口（含两端，YYYY-MM-DD）。
 * 返回 Map(topicId → {wrong, total, lastWrongDate, state})，state：weak | unstable | ok。 */
function diagTopicStates(attempts, qTopic, start, end) {
  const states = new Map();
  for (const a of attempts || []) {
    if (!a || a.date_shanghai < start || a.date_shanghai > end) continue;
    const topicId = qTopic.get(Number(a.question_id));
    if (!topicId || !DIAG_TOPIC_BY_ID.has(topicId)) continue;
    let s = states.get(topicId);
    if (!s) { s = { wrong: 0, total: 0, lastWrongDate: null }; states.set(topicId, s); }
    s.total++;
    if (!a.correct) {
      s.wrong++;
      if (!s.lastWrongDate || a.date_shanghai > s.lastWrongDate) s.lastWrongDate = a.date_shanghai;
    }
  }
  for (const s of states.values()) {
    s.state = (s.wrong >= DIAG_WEAK_MIN_WRONG && s.wrong / s.total >= DIAG_WEAK_MIN_RATIO)
      ? 'weak' : (s.wrong === 1 ? 'unstable' : 'ok');
  }
  return states;
}

/* 最弱的薄弱点：错次数最多；并列取最近一次错的日期最新者；再并列取 topicId 最小者（确定性） */
function diagWeakestTopic(states) {
  let best = null;
  for (const [topicId, s] of states) {
    if (s.state !== 'weak') continue;
    const cand = { topicId, wrong: s.wrong, lastWrongDate: s.lastWrongDate };
    if (!best) { best = cand; continue; }
    if (cand.wrong !== best.wrong) { if (cand.wrong > best.wrong) best = cand; continue; }
    const cd = String(cand.lastWrongDate || ''), bd = String(best.lastWrongDate || '');
    if (cd !== bd) { if (cd > bd) best = cand; continue; }
    if (cand.topicId < best.topicId) best = cand;
  }
  return best ? best.topicId : null;
}

/* 回溯找根因（纯函数）：从触发点沿先修边向上走；每步取未访问过的直接先修，
 * hard 在前、soft 在后，同强度内按 topics.json 顺序，逐个判断：fail-closed 点或 cnm_p014
 * 遇即停并记 note，第一个自身薄弱的祖先即根因，都不命中则下潜到第一个；
 * 走到链头或满 6 层先修边则最深点为根因；已访问点不再进（环路防护）。
 * isWeak(topicId) 由调用方按同一窗口口径提供。
 * 返回 {chain: [{topicId, name, chapter, strength, reason}], rootId, note}，
 * chain[0] 为触发点（strength/reason 为 null），note：null | 'fail-closed' | 'no-question'。 */
function diagFindRoot(triggerTopicId, isWeak) {
  const chain = [];
  const visited = new Set();
  let cur = triggerTopicId;
  let viaStrength = null, viaReason = null;
  let note = null;
  for (let depth = 0; depth <= DIAG_MAX_DEPTH; depth++) {
    if (visited.has(cur)) break;
    visited.add(cur);
    const node = DIAG_TOPIC_BY_ID.get(cur);
    if (!node) break;
    chain.push({ topicId: cur, name: node.name, chapter: node.chapter, strength: viaStrength, reason: viaReason });
    if (DIAG_FAIL_CLOSED.has(cur)) { note = 'fail-closed'; break; }
    if (cur === DIAG_NO_QUESTION_TOPIC) { note = 'no-question'; break; }
    if (depth > 0 && isWeak(cur)) break; // 第一个自身薄弱的祖先即根因
    if (depth >= DIAG_MAX_DEPTH) break;
    const cands = (DIAG_EDGES_BY_TOPIC.get(cur) || [])
      .filter((e) => !visited.has(e.prerequisiteId) && DIAG_TOPIC_BY_ID.has(e.prerequisiteId))
      .sort((a, b) => (a.strength === b.strength
        ? DIAG_TOPIC_BY_ID.get(a.prerequisiteId).idx - DIAG_TOPIC_BY_ID.get(b.prerequisiteId).idx
        : (a.strength === 'hard' ? -1 : 1)));
    if (!cands.length) break;
    let next = null;
    for (const e of cands) {
      if (DIAG_FAIL_CLOSED.has(e.prerequisiteId) || e.prerequisiteId === DIAG_NO_QUESTION_TOPIC || isWeak(e.prerequisiteId)) {
        next = e; break;
      }
    }
    if (!next) next = cands[0];
    viaStrength = next.strength;
    viaReason = next.reason || null;
    cur = next.prerequisiteId;
  }
  return { chain, rootId: chain.length ? chain[chain.length - 1].topicId : triggerTopicId, note };
}

/* ---------------- 战斗引擎（纯函数，可单测；rng 可注入保证测试确定性） ----------------
 * 队伍：sides = { A: sideObj, B: sideObj }，sideObj = { childId, childName, battleLevel, pets: [pet] }，
 * pet = { key, name, type, no, img, level, maxHp, hp, moves: [{name, type, power}] }。
 * 规则：回合交替；先攻方第一回合可直接出招（2026-11-16 用户定：取消热身，与道馆一致，
 *   不再需要跳过）；上场宠昏厥自动换备战宠；
 *   一方全部出战宠昏厥 → 对方获胜（state.winner = 'A'|'B'）。
 * 伤害：power × (0.5 + 0.05×出招宠等级) × 克制倍率 × 随机 0.9–1.1，取整、至少 1；
 * 另有 1/16 概率暴击 ×1.5（借鉴包 v1，calcDamage 内判定，事件带 critical）。
 * 量级：主宠/收藏宠约 3–5 招打倒一只同级宠，单场约 8–14 次出招分胜负。 */

// 无 stats 宠物继续使用此旧血量口径作为回落。
function battleMaxHp(level) {
  return 60 + 12 * Math.max(1, Number(level) || 1);
}

function typeMultOfficial(atkType, defType) {
  // 2026-11-17 补全 18 属性表后直接查表；未列组合一律 ×1。EXTRA 两表已退役。
  if (Object.prototype.hasOwnProperty.call(OFFICIAL_MULT, atkType)) {
    const row = OFFICIAL_MULT[atkType];
    return Object.prototype.hasOwnProperty.call(row, defType) ? row[defType] : 1;
  }
  return 1;
}

/* 双属性防御倍率：标准宝可梦乘法，逐属性相乘；任一免疫（×0）则总倍率为 0。
 * defTypes 为数组；传入单字符串时等价于 typeMultOfficial。 */
function typeMultOfficialMulti(atkType, defTypes) {
  const defs = Array.isArray(defTypes) ? defTypes : [defTypes];
  let m = 1;
  for (const d of defs) { const v = typeMultOfficial(atkType, d); if (v === 0) return 0; m *= v; }
  return m;
}

/* 馆主战斗防御属性（官方双属性）：取 DEX_DETAILS 官方 types，缺失时回落 SPECIES 单属性。 */
function bossDefTypes(no) {
  const det = DEX_DETAILS[Number(no)];
  if (det && Array.isArray(det.types) && det.types.length) return [...det.types];
  const t = SPECIES[Number(no)] && SPECIES[Number(no)].type;
  return t ? [t] : [];
}

/* 玩家宠防御属性：2026-11-17 随 18 属性表补全放开——取官方双属性全量（不再只留 9 种＋超能力/毒）。
 * 之前虫/幽灵/钢/格斗/妖精等副属性被滤掉，防御克制根本没生效（如飞天螳螂虫/飞行被当成纯飞行，
 * 火打它只算 ×1，实际应为 ×2）。与馆主同口径，2026-11-06 玩家宠双属性防御。
 * TYPES18 已含全部 18 种，过滤后为空只剩脏数据可能；返回 null 时由 makePet 默认 [type]；
 * 绝不能返回 []（makePet 会抛错）。 */
function playerDefTypes(no) {
  const filtered = bossDefTypes(no).filter((t) => TYPES18.includes(t));
  return filtered.length ? filtered : null;
}

/* 道馆克制判定（借鉴包 v1 §6）：与道馆实战同一事实源——calcDamage 经 chart: 'official' 使用 typeMultOfficial。
 * 实战组队（buildPlayerSide）中主宠招式一律按 LINE_TYPE 计、备战宠招式一律按物种属性计，
 * 馆主按官方双属性（bossDefTypes）算；经典 TYPE_CHART 只做弱点（×2），供 PvP 答题对战；PvE 官方口径见 OFFICIAL_MULT（含抗性 ×0.5、免疫 ×0），
 * 故某出招属性克的关 = 对馆主双属性总倍率 ≥2 的关。徽章/提示一律走本函数，不另算一套。 */
function countersForType(atkType) {
  return GYM_STAGES
    .filter((g) => SPECIES[g.bossNo] && typeMultOfficialMulti(atkType, bossDefTypes(g.bossNo)) >= 2)
    .map((g) => g.stage);
}

/* 备战宠克制关（道馆页/仓库列表用）：按官方双属性取并集——任一本系属性克制即算克制。
 * 2026-11-17 方案 A 起 SPECIES.type 为官方主属性，单属性计会漏掉副属性的克制（如波波普通/飞行：
 * countersForType('普通') 为空，但飞行克 S4 草/毒；并集后为 [4]）。单属性种与旧口径一致。 */
function countersForPet(no) {
  const defs = playerDefTypes(no) || (SPECIES[no] ? [SPECIES[no].type] : []);
  return [...new Set(defs.flatMap((t) => countersForType(t)))].sort((a, b) => a - b);
}

/* rng 注入校验：rng 不是函数、或返回值不是有限数时抛 TypeError，
 * 让坏的随机源在单测/调用处尽早暴露，绝不让 NaN 伤害污染对局状态。
 * 有限数但越出 [0,1) 时钳制回区间（审查 S4）：负数会让 pickWildSpecies 下标为负抛错、
 * 让暴击恒真；≥1 会让伤害波动超过 1.1 上限——钳制后语义与 Math.random 一致。 */
function rollRng(rng) {
  if (typeof rng !== 'function') throw new TypeError('rng must be a function');
  const v = rng();
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new TypeError('rng must return a finite number');
  if (v < 0) return 0;
  if (v >= 1) return 1 - Number.EPSILON;
  return v;
}
/* 加权抽取（纯函数）：total=Σw → r=rollRng(rng)*total → 逐项 r-=w，首个 r<0 即命中，返回该项；全落空返回 undefined。
 * 调用方保留各自的空池检查（须在本函数之前，保证 rollRng 调用次序不变）与落空兜底。weightOf 默认取 [key, w] 的 w。 */
function weightedPick(pool, rng, weightOf = (e) => e[1]) {
  const total = pool.reduce((a, e) => a + weightOf(e), 0);
  let r = rollRng(rng) * total;
  for (const e of pool) {
    r -= weightOf(e);
    if (r < 0) return e;
  }
  return undefined;
}

// 官方属性成长：个体值 0、努力值 0、中性性格；缺少种族值时不编造属性。
function statsFor(no, level) {
  const detail = typeof DEX_DETAILS !== 'undefined' && DEX_DETAILS && DEX_DETAILS[no];
  if (!detail || !detail.stats) return null;
  const base = detail.stats;
  const lv = Math.max(1, Number(level) || 1);
  return {
    hp: Math.floor(2 * base.hp * lv / 100) + lv + 10,
    attack: Math.floor(2 * base.attack * lv / 100) + 5,
    defense: Math.floor(2 * base.defense * lv / 100) + 5,
    sp_attack: Math.floor(2 * base.sp_attack * lv / 100) + 5,
    sp_defense: Math.floor(2 * base.sp_defense * lv / 100) + 5,
    speed: Math.floor(2 * base.speed * lv / 100) + 5
  };
}
function abilityOf(no) {
  const d = (no != null) ? DEX_DETAILS[no] : null;
  const a = d && Array.isArray(d.abilities) ? d.abilities[0] : null;
  return a && a.name ? a.name : null;
}
// 实例特性掷出（纯函数）：按获得来源分支。返回特性名；无可用特性时返回 null（调用方留 NULL）。
// - source='main' → 首特性（K1：主线宠固定首特性、不掷）。
// - source='egg' → K1 默认分布（45/45/10）：蛋孵化出来那一刻就是获得时刻，执行 K1（用户 2026-11-18 确认）。
// - source='gift' → 首特性（奖励宠保持首特性；目前无调用方传 'gift'，防御分支）。
// - source='catch' → 两条普通特性 50/50（#101-B）；只有一条普通特性时直接取它；隐藏特性永不进池。
// - 其他 source → 45% 首特性 / 45% 第二特性 / 10% 隐藏特性（K1）；缺第二特性时该档回落首特性，
//   缺隐藏特性时该档回落首特性。
function rollInstanceAbility(no, source, rng = Math.random) {
  const d = DEX_DETAILS[no];
  const abs = d && Array.isArray(d.abilities) ? d.abilities : [];
  if (!abs.length) return null;
  const first = abs[0] && abs[0].name ? abs[0].name : null; // abilities[0] 恒为非隐藏（1–151 已核实）
  if (!first) return null;
  const regular = abs.filter((a) => !a.hidden && a.name).map((a) => a.name);
  const hidden = abs.find((a) => a.hidden && a.name);
  if (source === 'main' || source === 'gift') return first;
  if (source === 'catch') {
    if (regular.length === 0) return first;
    if (regular.length === 1) return regular[0];
    return regular[Math.floor(rollRng(rng) * regular.length) % regular.length]; // 普通特性最多 2 条，即 50/50
  }
  const r = rollRng(rng);
  if (r < 0.45) return first;
  if (r < 0.90) return regular.length > 1 ? regular[1] : first;
  return hidden ? hidden.name : first;
}

function makePet({ key, name, type, no = null, img = null, level, moves, hpMult = 1, egg = null, defTypes = null, ability = null }) {
  if (!TYPES18.includes(type)) throw new TypeError(`PET_DATA_INVALID: unknown pet type ${type}`);
  if (defTypes != null) {
    if (!Array.isArray(defTypes) || defTypes.length === 0 || defTypes.some((t) => typeof t !== 'string' || !TYPES18.includes(t))) throw new TypeError('PET_DATA_INVALID: defTypes must be a non-empty array of official defense types');
  }
  if (!Array.isArray(moves) || moves.length === 0) throw new TypeError('PET_DATA_INVALID: moves must be a non-empty array');
  const normMoves = moves.map((m) => {
    if (!m || !m.name) throw new TypeError('PET_DATA_INVALID: every move needs a name');
    const p = Number(m.power);
    if (!Number.isFinite(p) || p <= 0) throw new TypeError(`PET_DATA_INVALID: move ${m.name} has invalid power`);
    return { ...m, power: p };
  });
  const stats = (no != null) ? statsFor(no, level) : null;
  const maxHp = stats ? Math.round(stats.hp * hpMult) : Math.round(battleMaxHp(level) * hpMult);
  return { key, name, type, no, img, level, stats, maxHp, hp: maxHp, moves: normMoves, egg, defTypes: defTypes ? [...defTypes] : [type], ability: ability || abilityOf(no), stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: null, flashFire: false };
}

/* ---------------- PvP 防守答题（出招两段式） ----------------
 * 攻击方出招先"预演"伤害并挂起（st.pending），防守方答对自己答过的一道题，
 * 随机触发闪避/格挡/防御减伤；答错或放弃则全额结算。道馆战不走本流程。 */
/* ---------------- 招式效果（变化类招式） ----------------
 * weak 弱化：对方下一次攻击倍率；charge 蓄力：自己下一次攻击倍率；
 * smoke 干扰：对方下一次攻击落空概率；shell 防御：自己受到的下一次攻击倍率。
 * 具体数值按出招招式的技能等级查 SKILL_WEAK_MULT / SKILL_CHARGE_MULT / SKILL_SMOKE_MISS / SKILL_SHELL_MULT
 * （技能 1 级即旧值 0.6 / 1.5 / 0.5 / 0.5）。都是一次性、不可叠加；变化招式本身不造成伤害。按招式名判定（四条线同位招式同类）。 */
const MOVE_EFFECTS = {
  '撒娇': 'weak', '叫声': 'weak', '摇尾巴': 'weak',
  '蹭蹭脸颊': 'charge', '生长': 'charge',
  '烟幕': 'smoke', '影子分身': 'smoke', '影子球': 'smoke',
  '缩入壳中': 'shell',
  '寄生种子': 'drain',
  '变身': 'transform',
  '求雨': 'charge',
};
function moveEffectOf(moveName) { return MOVE_EFFECTS[moveName] || null; }

/* ---------------- 加密与鉴权工具 ---------------- */

async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randToken() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

async function getSetting(db, key) {
  const r = await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();
  return r ? r.value : null;
}
/* 一次取多个设置（1 次往返）：返回 Map，缺失的键为 null（与 getSetting 同口径）。只读，不缓存。 */
async function getSettings(db, keys) {
  const { results } = await db.prepare(
    `SELECT key, value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`
  ).bind(...keys).all();
  const m = new Map(keys.map((k) => [k, null]));
  for (const r of results || []) m.set(r.key, r.value);
  return m;
}
/* 两级设置（用户系统 v2 多家庭）：5 项打卡设置先读本家庭覆盖（families.settings_json），没有就用全站默认（settings 表）。
 * familyId 为空（老库 / 旧 PIN 会话）= 只读全站默认。 */
const FAMILY_SETTING_KEYS = { base_xp: 'baseXp', subject_xp: 'subjectXp', cutoff_time: 'cutoffTime', quiz_xp: 'quizXp', quiz_repeat_days: 'quizRepeatDays' };
async function getFamilyOverrides(db, familyId) {
  if (!familyId) return {};
  try {
    const f = await db.prepare('SELECT settings_json FROM families WHERE id=?').bind(familyId).first();
    const o = f ? parseJsonSafe(f.settings_json, {}) : {};
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch { return {}; }
}

/* 热路径设置批量取（Fable 优化 #3）：一次 getSettings 取齐本请求所需的全部键；
 * 5 个家庭可覆盖的键（FAMILY_SETTING_KEYS）再取一次 families 行，按 getEffSetting
 * 同款口径覆盖（非空才赢）。缺失键为 null，与 getSetting 同口径；keys 为空时不发查询。
 * familyId 为空（老库 / 旧 PIN 会话）时不查 families，与 getEffSetting 一致。
 * 调用方把返回的 Map 传给下游 helper（S 参数）；helper 只在 S.has(key) 时用它，
 * 否则走原单查——S 不全时行为与改前完全一致。 */
async function loadHotSettings(db, familyId, keys) {
  const uniq = [...new Set(keys)];
  // 只有请求了家庭可覆盖的键时才查 families 行（纯全局键的批量不为此多 1 查）；两个读取互不依赖，并行
  const needFam = !!(familyId && uniq.some((k) => FAMILY_SETTING_KEYS[k]));
  const [m, o] = await Promise.all([
    uniq.length ? getSettings(db, uniq) : new Map(),
    needFam ? getFamilyOverrides(db, familyId) : null,
  ]);
  if (needFam) {
    for (const k of uniq) {
      if (FAMILY_SETTING_KEYS[k] && o[k] !== undefined && o[k] !== null && o[k] !== '') m.set(k, String(o[k]));
    }
  }
  return m;
}
async function getEffSetting(db, familyId, key) {
  const o = await getFamilyOverrides(db, familyId);
  if (o[key] !== undefined && o[key] !== null && o[key] !== '') return String(o[key]);
  return getSetting(db, key);
}
async function setSetting(db, key, value) {
  await db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key, value).run();
}

/* 同步表是否就位（迁移 0020 是否已应用）。复用 hasEvoTable 的 sqlite_master 查询口径。 */
async function hasSyncTables(db) {
  return hasEvoTable(db, 'sync_versions');
}

/* 推进某孩子的 sync_version 并返回新值；旧链（无 sync_versions 表）返回 0。 */
async function bumpChildVersion(db, childId) {
  try {
    await db.prepare(
      'INSERT INTO sync_versions(child_id, version) VALUES(?, 1) ON CONFLICT(child_id) DO UPDATE SET version = version + 1'
    ).bind(childId).run();
    const r = await db.prepare('SELECT version FROM sync_versions WHERE child_id=?').bind(childId).first();
    return r ? r.version : 1;
  } catch {
    return 0; // 旧链：无 sync_versions 表，同步未启用
  }
}

/* 置某行的 ver 与 updated_epoch。whereSql/whereArgs 由调用方给（如 'id=?', [id]）。
 * version 为 0（旧链）时直接跳过，不碰行。 */
async function touchRow(db, table, whereSql, whereArgs, version) {
  if (!version) return;
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(`UPDATE ${table} SET ver=?, updated_epoch=? WHERE ${whereSql}`)
    .bind(version, now, ...whereArgs).run();
}

/* 推进某孩子版本并置一行 ver，返回新版本号（旧链返回 0）。 */
async function syncTouch(db, childId, table, whereSql, whereArgs) {
  const v = await bumpChildVersion(db, childId);
  if (v) await touchRow(db, table, whereSql, whereArgs, v);
  return v;
}

/* 记一条删除 tombstone（DELETE 前调用，version 用 bump 后的值）。旧链直接跳过。 */
async function recordTombstone(db, childId, table, rowId, version) {
  if (!version) return;
  await db.prepare(
    'INSERT OR REPLACE INTO sync_tombstones(child_id, table_name, row_id, version) VALUES(?,?,?,?)'
  ).bind(childId, table, String(rowId), version).run();
}

/* 孩子数据隔离（服务端强制）：child 会话只能访问 session.child_id 本人；
 * 请求里带了别人的 id → 403。返回 {id} 或 {err}。parent 会话不限。 */
function scopeChildId(session, requested) {
  const req = Number(requested) || 0;
  if (session && session.kind === 'child') {
    if (req && req !== session.child_id) return { err: json({ ok: false, error: 'FORBIDDEN' }, 403) };
    return { id: session.child_id };
  }
  return { id: req };
}

function forbidIfOtherChild(session, ownerChildId) {
  if (session && session.kind === 'child' && ownerChildId !== session.child_id) {
    return json({ ok: false, error: 'FORBIDDEN' }, 403);
  }
  return null;
}

/* 请求体解析：空/非法 JSON 一律当 {}（原 74 处逐字相同的写法，B1 收口）。 */
function readJsonBody(req) {
  return req.json().catch(() => ({}));
}

/* 孩子会话标准开场白（B1）：解析 body → scopeChildId(body.childId) → getChild → NOT_FOUND 404；
 * handler 只收 (child, body, today)。仅用于开场白逐字等于这串序列的 handler；
 * childId 取自 URL / body.child_id、资源归属型（forbidIfOtherChild）、家长 PIN 型等变体保持原写法，不得硬套。 */
async function withChild(db, req, session, fn) {
  const body = await readJsonBody(req);
  const q = new URL(req.url).searchParams; // GET 查询串里的 childId 也要过会话校验（别人的 id → 403，不能被悄悄忽略）
  const sc = scopeChildId(session, body.childId ?? q.get('childId') ?? q.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  return fn(child, body, shDateStr());
}

/* ---------------- 数据装配 ---------------- */

/* v11 实际形态：child._evo（由 attachEvoForm 挂载）优先于纯等级推导；
 * 未挂载时按等级推导，但终极封顶 2 阶、伊布封顶 1 阶——没有实例记录证明用过石，
 * 不得提前显示终极形态。调用方（childSummary / buildPlayerSide）须先 attachEvoForm。 */
function formInfo(child) {
  if (child._evo) {
    const e = child._evo;
    return { formIdx: e.formIdx, formName: e.formName, img: e.img, egg: e.egg || null, branch: e.branch || null, branchNo: e.branchNo || null };
  }
  const line = LINES[child.line];
  const level = levelFromXp(child.total_xp);
  const idx = formIdxForLevel(level);
  if (idx === 0) {
    return { formIdx: 0, formName: '神秘的蛋', img: null, egg: eggDesignFor(line.forms[0].no) };
  }
  if (child.line === 'eevee') {
    return { formIdx: 1, formName: '伊布', img: petImg(133), egg: null };
  }
  const capped = Math.min(idx, 2);
  const f = line.forms[capped - 1];
  return { formIdx: capped, formName: f.name, img: petImg(f.no), egg: null };
}

function safeJsonArr(s) {
  try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}

/* ---- v11：宠物实例 / 背包 / 实际形态 ---- */

/* Fable 优化 #4：pet_instances / reward_eggs 由迁移 0019 引入（v11 进化道具，2026-10-26），
 * 测试站与正式站早已应用——本文件内这两表的 sqlite_master 存在守卫已移除，
 * getPetInstance / ensurePetInstance / hatchDueEggs 直接查表。旧迁移链（如 oak 测试的
 * 无 0014 链）上热路径会直接报缺表，相关测试夹具已补 0019（见 oak.test.mjs「无 0014」
 * 用例注释）。其余守卫（gym_fail_streaks、sync_versions、删孩子、重置）仍保留原样。 */
/* 已确认存在的表名（模块级，随 isolate 生命周期）。只缓存 true：表由迁移创建、运行期不会被删；
 * false 不缓存，迁移中途落地后下一次调用就能看到。测试里切换“新链/旧链”夹具时调 resetEvoTableCache() 清空。 */
const EVO_TABLE_OK = new Set();
async function hasEvoTable(db, name) {
  if (EVO_TABLE_OK.has(name)) return true;
  try {
    const r = await db.prepare("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name=?").bind(name).first();
    if (r) EVO_TABLE_OK.add(name);
    return !!r;
  } catch { return false; }
}

async function getPetInstance(db, childId, lineKey) {
  // Fable #4：pet_instances 由迁移 0019 保证存在，不再探 sqlite_master。
  return db.prepare('SELECT * FROM pet_instances WHERE child_id=? AND line_key=?').bind(childId, lineKey).first();
}

/* 取不到则建：主线 species 为 forms[0]、伊布 133、收藏为 baseNo；当前线 source='main' 时 has_been_main=1 */
async function ensurePetInstance(db, childId, lineKey, today, source = 'main', rng = Math.random) {
  let inst = await getPetInstance(db, childId, lineKey);
  if (inst) return inst;
  // Fable #4：同上，表由 0019 保证，直接建（旧链无表时此处抛错，不再静默返回 null）。
  let speciesNo;
  if (lineKey === 'eevee') speciesNo = 133;
  else if (lineKey.startsWith('species:')) speciesNo = Number(lineKey.slice(8));
  else speciesNo = LINES[lineKey].forms[0].no;
  const now = Math.floor(Date.now() / 1000);
  const ability = rollInstanceAbility(speciesNo, source, rng); // Batch 0：建实例时掷出，永久固定
  await db.prepare(
    `INSERT OR IGNORE INTO pet_instances(child_id, line_key, species_no, form_idx, branch, source, egg_id, evolved_via, has_been_main, ability, created_epoch, updated_epoch)
     VALUES(?,?,?,0,NULL,?,NULL,NULL,?,?,?,?)`
  ).bind(childId, lineKey, speciesNo, source, source === 'main' ? 1 : 0, ability, now, now).run();
  return getPetInstance(db, childId, lineKey);
}

/* 任务 110：前主宠（招式跟宠走）——某物种是不是这孩子当过主宠的线。
 * 按物种号反查所属线（LINES.forms 或伊布分支），再看该线实例的 has_been_main。
 * 一定排除当前线：当前主宠实例建线时就是 has_been_main=1，但它不是“前”主宠，
 * 否则备战会把主宠自己也算进去。找不到返回 null。 */
async function getExMainLine(db, childId, no) {
  no = Number(no);
  if (!no) return null;
  const child = await getChild(db, childId);
  if (!child) return null;
  const cur = child.line;
  for (const [key, line] of Object.entries(LINES)) {
    if (key === cur) continue;
    if (!((line.forms || []).some((x) => Number(x.no) === no))) continue;
    const inst = await getPetInstance(db, childId, key);
    if (inst && inst.has_been_main) return { lineKey: key, branch: inst.branch || null };
  }
  if (cur !== 'eevee') {
    for (const [b, br] of Object.entries(EEVEE_BRANCHES)) {
      if (Number(br.no) !== no) continue;
      const inst = await getPetInstance(db, childId, 'eevee');
      if (inst && inst.has_been_main) return { lineKey: 'eevee', branch: b };
    }
  }
  return null;
}

/* 任务 110：开局前给 child 挂前主宠信息（与 attachEvoForm 同模式）。
 * benchNo 为空或不是前主宠时 _exMain 为 null。 */
async function attachExMain(db, child, benchNo) {
  child._exMain = null;
  if (!benchNo) return null;
  const ex = await getExMainLine(db, child.id, benchNo);
  if (ex) child._exMain = { no: Number(benchNo), lineKey: ex.lineKey, branch: ex.branch || null };
  return child._exMain;
}
/* Batch 0：开局前给 child 挂实例特性（与 attachExMain 同模式）。
 * 一次查询该孩子全部 pet_instances；ability 为 NULL 的行不进映射（战斗回落首特性）。 */
async function attachInstanceAbilities(db, child) {
  const { results } = await db.prepare('SELECT line_key, species_no, ability FROM pet_instances WHERE child_id=?').bind(child.id).all();
  const byLine = {}, byNo = {};
  for (const r of results || []) {
    if (!r || !r.ability) continue;
    byLine[r.line_key] = r.ability;
    if (r.species_no) byNo[r.species_no] = r.ability;
  }
  child._instAbilityByLine = byLine;
  child._instAbilityByNo = byNo;
  return byLine;
}
/* Batch 0：战斗建造取实例特性。候选按 lineKeys 顺序再按物种号兜底；
 * 只认「确属该形态 no 的特性列表」里的名字——否则（如伊布线实例存的是 133 的逃跑、
 * 实际出战的是雷伊布）返回 null，让 makePet 回落该形态自己的首特性，保证“行为 0 变化”。 */
function instAbilityFor(child, lineKeys, no) {
  const byLine = child._instAbilityByLine, byNo = child._instAbilityByNo;
  const d = no != null ? DEX_DETAILS[no] : null;
  const names = d && Array.isArray(d.abilities) ? d.abilities.map((a) => a && a.name) : [];
  const cands = [];
  for (const k of lineKeys) if (k && byLine && byLine[k]) cands.push(byLine[k]);
  if (no != null && byNo && byNo[no]) cands.push(byNo[no]);
  return cands.find((ab) => names.includes(ab)) || null;
}

/* 任务 110：这孩子所有前主宠的“当前形态物种”（排除当前线），供备战全选/
 * 携带列表共用。物种号按 attachEvoForm 同款口径算（actualFormIdxFor），
 * 与 doSwitchLine 写的 carried 行物种一致。 */
async function exMainSpecies(db, childId) {
  const [child, { results }] = await Promise.all([
    getChild(db, childId),
    db.prepare('SELECT line_key, branch, form_idx FROM pet_instances WHERE child_id=? AND has_been_main=1').bind(childId).all(),
  ]);
  if (!child) return [];
  const level = levelFromXp(child.total_xp);
  const out = [];
  for (const r of results || []) {
    if (r.line_key === child.line) continue;
    const line = LINES[r.line_key];
    if (!line) continue;
    let no = null;
    if (r.line_key === 'eevee' && r.branch && EEVEE_BRANCHES[r.branch]) no = EEVEE_BRANCHES[r.branch].no;
    else {
      const idx = actualFormIdxFor(r.line_key, level, r);
      if (idx > 0) no = line.forms[Math.min(idx - 1, line.forms.length - 1)].no;
    }
    if (!no) continue;
    out.push({ no, lineKey: r.line_key, branch: r.branch || null });
  }
  return out;
}

/* 实际形态（纯计算）：reachable 为等级可达上限；终极（idx 3）须实例 form_idx==3（有用石记录）才成真。
 * 伊布无线性二/三阶，formIdx 恒为 0/1，分支见 instance.branch。 */
function actualFormIdxFor(lineKey, level, inst) {
  if (GATES_OPEN && inst) {
    if (lineKey === 'eevee' && inst.branch) return 1;
    if (lineKey !== 'eevee' && inst.form_idx >= 3) return 3;
  }
  const reachable = formIdxForLevel(level);
  if (lineKey === 'eevee') return reachable >= 1 ? 1 : 0;
  if (reachable >= 3) return inst && inst.form_idx >= 3 ? 3 : 2;
  return reachable;
}

/* 给 child 行挂载实际形态（child._evo），供 formInfo / childSummary / buildPlayerSide 共用 */
/* inst（可选）：调用方刚取到且未被改动的宠物实例，传入则不再重读 pet_instances；
 * 不传 / 为空（含旧链 null）一律走原来的 ensurePetInstance，行为与改前完全一致。 */
async function attachEvoForm(db, child, today, inst) {
  const level = levelFromXp(child.total_xp);
  const line = LINES[child.line];
  inst = inst || await ensurePetInstance(db, child.id, child.line, today);
  const idx = actualFormIdxFor(child.line, level, inst);
  if (idx === 0) {
    child._evo = { formIdx: 0, formName: '神秘的蛋', img: null, egg: eggDesignFor(line.forms[0].no), branch: null, branchNo: null, branchType: null, instance: inst };
    return child._evo;
  }
  if (child.line === 'eevee' && inst && inst.branch && EEVEE_BRANCHES[inst.branch]) {
    const b = EEVEE_BRANCHES[inst.branch];
    child._evo = { formIdx: 1, formName: b.name, img: petImg(b.no), egg: null, branch: inst.branch, branchNo: b.no, branchType: b.type, instance: inst };
    return child._evo;
  }
  if (child.line === 'eevee') {
    child._evo = { formIdx: 1, formName: '伊布', img: petImg(133), egg: null, branch: null, branchNo: null, branchType: null, instance: inst };
    return child._evo;
  }
  const f = line.forms[idx - 1];
  child._evo = { formIdx: idx, formName: f.name, img: petImg(f.no), egg: null, branch: null, branchNo: null, branchType: null, instance: inst };
  return child._evo;
}

/* 妖精技能石教会的招式（children.fairy_moves JSON [{name, level, type, desc}]） */
function fairyMovesOf(child) {
  try {
    const a = JSON.parse(child.fairy_moves || '[]');
    return Array.isArray(a) ? a.filter((m) => m && m.name) : [];
  } catch { return []; }
}

/* 技能升级与 PvP 口径：PvP、道馆、合作共用 allMovesFor 产出的招式对象（含 power / skillLevel / effectMult / effectMiss），
 * 同一威力公式与同一效果表自然作用于 PvP，不另建 PvP 招式表。妖精招式（fairy）v1 不纳入升级，恒为技能 1 级。 */
const SKILL_MAX_LEVEL = 5;
const SKILL_WEAK_MULT = [0.6, 0.55, 0.5, 0.45, 0.4];
const SKILL_CHARGE_MULT = [1.5, 1.6, 1.7, 1.8, 1.9];
const SKILL_SHELL_MULT = [0.5, 0.45, 0.4, 0.35, 0.3];
const SKILL_SMOKE_MISS = [0.5, 0.55, 0.6, 0.65, 0.7];
function safeJsonObj(s) {
  try { const o = JSON.parse(s || '{}'); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; } catch { return {}; }
}
function skillLevelOf(levelsObj, name) {
  const v = levelsObj ? levelsObj[name] : undefined;
  if (!Number.isInteger(v)) return 1;
  return Math.min(SKILL_MAX_LEVEL, Math.max(1, v));
}
function skillPower(learnLevel, skillLevel) {
  return 25 + 6 * learnLevel + 6 * (skillLevelOf({ x: skillLevel }, 'x') - 1);
}
function skillEffectFor(kind, skillLevel) {
  const lv = skillLevelOf({ x: skillLevel }, 'x');
  if (kind === 'weak') return { effectMult: SKILL_WEAK_MULT[lv - 1] };
  if (kind === 'charge') return { effectMult: SKILL_CHARGE_MULT[lv - 1] };
  if (kind === 'shell') return { effectMult: SKILL_SHELL_MULT[lv - 1] };
  if (kind === 'smoke') return { effectMiss: SKILL_SMOKE_MISS[lv - 1] };
  return null;
}
/* 全部招式：等级招式＋已解锁招式＋妖精招式（主宠线威力 25＋6×学会等级＋6×(技能等级-1)；妖精招式 type 为'妖精'，9 种集外按中性计） */
function allMovesFor(child, level, mainType) {
  const type = mainType || LINE_TYPE[child.line];
  const moveLevels = safeJsonObj(child.move_levels);
  const out = effectiveMoves(child.line, level, safeJsonArr(child.unlocked_moves), moveLevels)
    .map((m) => {
      const off = officialMove(m.name);
      const kind = moveEffectOf(m.name);
      const eff = kind ? skillEffectFor(kind, m.skillLevel) : null;
      return { ...m, type: off ? off.type : type, damage_class: off ? off.damage_class : undefined, power: skillPower(m.level, m.skillLevel), effectKind: kind || null, ...(eff || {}) };
    });
  for (const fm of fairyMovesOf(child)) {
    out.push({ level: fm.level, name: fm.name, desc: fm.desc || '', type: '妖精', power: 25 + 6 * fm.level, skillLevel: 1, fairy: true });
  }
  return out.sort((a, b) => a.level - b.level);
}

/* 任务 110：指定线的招式（备战前主宠用）——与 allMovesFor 同口径，只是不读
 * child.line。妖精招只在 eevee 线追加（教学限定伊布线；主宠路径的无条件
 * 追加是既有口径，这里不动它）。 */
function lineMovesFor(child, lineKey, level, mainType) {
  const type = mainType || LINE_TYPE[lineKey];
  const moveLevels = safeJsonObj(child.move_levels);
  const out = effectiveMoves(lineKey, level, safeJsonArr(child.unlocked_moves), moveLevels)
    .map((m) => {
      const off = officialMove(m.name);
      const kind = moveEffectOf(m.name);
      const eff = kind ? skillEffectFor(kind, m.skillLevel) : null;
      return { ...m, type: off ? off.type : type, damage_class: off ? off.damage_class : undefined, power: skillPower(m.level, m.skillLevel), effectKind: kind || null, ...(eff || {}) };
    });
  if (lineKey === 'eevee') {
    for (const fm of fairyMovesOf(child)) {
      out.push({ level: fm.level, name: fm.name, desc: fm.desc || '', type: '妖精', power: 25 + 6 * fm.level, skillLevel: 1, fairy: true });
    }
  }
  return out.sort((a, b) => a.level - b.level);
}

async function unlockForms(db, child, today) {
  // 按当前等级与实际形态把当前线的已解锁形态写入图鉴（保留历史）。
  // 终极（idx 3）只在实例 form_idx==3（有用石记录）时写；Lv16 无石只到 2 阶。
  const level = levelFromXp(child.total_xp);
  const inst = await ensurePetInstance(db, child.id, child.line, today);
  let instStale = false; // 本函数改过实例行（升级进阶／伊布 Lv5）→ 本地 inst 与库行可能不一致（如 updated_epoch），attachEvoForm 须重读
  const actual = actualFormIdxFor(child.line, level, inst);
  // 同步实例形态（升级自动进阶；降级时实例随之回落，终极石记录清掉；旧链 inst 为 null 时跳过）
  if (inst && child.line !== 'eevee' && inst.form_idx !== actual) {
    const speciesNo = actual === 0 ? LINES[child.line].forms[0].no : LINES[child.line].forms[actual - 1].no;
    await db.prepare('UPDATE pet_instances SET form_idx=?, species_no=?, evolved_via=CASE WHEN ?<3 THEN NULL ELSE evolved_via END, updated_epoch=? WHERE id=?')
      .bind(actual, speciesNo, actual, Math.floor(Date.now() / 1000), inst.id).run();
    instStale = true;
    inst.form_idx = actual; inst.species_no = speciesNo;
    if (actual < 3) inst.evolved_via = null;
  }
  if (inst && child.line === 'eevee' && level >= 5 && inst.form_idx !== 1) {
    await db.prepare('UPDATE pet_instances SET form_idx=1, updated_epoch=? WHERE id=?')
      .bind(Math.floor(Date.now() / 1000), inst.id).run();
    instStale = true;
    inst.form_idx = 1;
  }
  // 先一次 SELECT 查出已解锁的形态键，只对缺失的逐个 INSERT（常态全已解锁：0 次写）。
  // 仍保留 INSERT OR IGNORE 兜底并发；bump/touch 仍只对“真正插入”的行做（changes>0），顺序仍按 idx 升序。
  const formKeys = [];
  for (let idx = 0; idx <= actual; idx++) formKeys.push(`form:${child.line}:${idx}`);
  const { results: haveRows } = await db.prepare(
    `SELECT entry_key FROM pokedex WHERE child_id=? AND entry_key IN (${formKeys.map(() => '?').join(',')})`
  ).bind(child.id, ...formKeys).all();
  const haveKeys = new Set((haveRows || []).map((r) => r.entry_key));
  for (const key of formKeys) {
    if (haveKeys.has(key)) continue;
    const ins = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
      .bind(child.id, key, today).run();
    if (ins.meta && ins.meta.changes) {
      const v = await bumpChildVersion(db, child.id);
      await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [child.id, key], v);
    }
  }
  // 挂载实际形态，供同请求的 formInfo / childSummary 直接用（实例未被改动时复用已取到的 inst，省一次 SELECT）
  await attachEvoForm(db, child, today, instStale ? undefined : inst);
}

/* ---- v11：背包 ---- */
async function getInventoryQty(db, childId, itemKey) {
  const r = await db.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').bind(childId, itemKey).first();
  return r ? (r.qty || 0) : 0;
}
async function addItemLedger(db, childId, itemKey, delta, reason, refType, refId, today) {
  await db.prepare('INSERT INTO item_ledger(child_id, item_key, delta, reason, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?,?)')
    .bind(childId, itemKey, delta, reason, refType || null, refId == null ? null : refId, Math.floor(Date.now() / 1000), today).run();
}
/* 背包加道具（qty>0；写流水）。球类不走背包（见 addBalls）。 */
async function addItem(db, childId, itemKey, qty, reason, refType, refId, today) {
  if (!ITEM_CATALOG[itemKey]) throw new Error(`UNKNOWN_ITEM:${itemKey}`);
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('BAD_QTY');
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(`INSERT INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(?,?,?,?)
    ON CONFLICT(child_id, item_key) DO UPDATE SET qty=qty+excluded.qty, updated_epoch=excluded.updated_epoch`)
    .bind(childId, itemKey, qty, now).run();
  await addItemLedger(db, childId, itemKey, qty, reason, refType, refId, today);
}
/* 背包扣道具（条件扣减：qty 不足返回 false，不写流水）。 */
async function takeItem(db, childId, itemKey, qty, reason, refType, refId, today) {
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('BAD_QTY');
  const upd = await db.prepare('UPDATE item_inventory SET qty=qty-?, updated_epoch=? WHERE child_id=? AND item_key=? AND qty>=?')
    .bind(qty, Math.floor(Date.now() / 1000), childId, itemKey, qty).run();
  if (!upd.meta || !upd.meta.changes) return false;
  await addItemLedger(db, childId, itemKey, -qty, reason, refType, refId, today);
  return true;
}
/* 球类增减（读 children 列；kind: normal|super|hyper|master）。加球写 ball_grants 审计行，随后结算满 99 兑换。 */
const BALL_COLUMN = { normal: 'balls', super: 'balls_super', hyper: 'balls_hyper', master: 'balls_master' };
const BALL_KIND_BY_COLUMN = { balls: 'normal', balls_super: 'super', balls_hyper: 'hyper', balls_master: 'master' };
async function addBalls(db, childId, kind, qty, today, checkinId = null) {
  const col = BALL_COLUMN[kind];
  if (!col) throw new Error(`UNKNOWN_BALL:${kind}`);
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('BAD_QTY');
  await db.prepare(`UPDATE children SET ${col} = ${col} + ? WHERE id=?`).bind(qty, childId).run();
  const now = Math.floor(Date.now() / 1000);
  const ins = await db.prepare('INSERT INTO ball_grants(child_id, kind, qty, checkin_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?)')
    .bind(childId, kind, qty, checkinId, now, today).run();
  const v = await bumpChildVersion(db, childId);
  await touchRow(db, 'children', 'id=?', [childId], v);
  const grantId = ins.meta ? Number(ins.meta.last_row_id) : null;
  if (grantId) await touchRow(db, 'ball_grants', 'id=?', [grantId], v);
  await settleBallOverflow(db, childId, today);
}
/* 球满 99 向上兑换：5 普通→1 超级、10 超级→1 高级、20 高级→1 大师；目标满 99 时停兑。
 * 条件算术更新防并发丢数；兑换记 item_ledger 审计行（尽力而为，不阻塞）。 */
async function settleBallOverflow(db, childId, today) {
  const exchanged = [];
  for (const [from, to, rate] of BALL_EXCHANGE) {
    for (;;) {
      const upd = await db.prepare(`UPDATE children SET ${from} = ${from} - ?, ${to} = ${to} + 1 WHERE id=? AND ${from} >= ? AND ${to} < ?`)
        .bind(rate, childId, BALL_MAX, BALL_MAX).run();
      if (!upd.meta || !upd.meta.changes) break;
      exchanged.push({ from, to, rate });
    }
  }
  for (const e of exchanged) {
    try {
      await addItemLedger(db, childId, `ball:${BALL_KIND_BY_COLUMN[e.from]}`, -e.rate, 'exchange', null, null, today);
      await addItemLedger(db, childId, `ball:${BALL_KIND_BY_COLUMN[e.to]}`, 1, 'exchange', null, null, today);
    } catch { /* 审计失败不阻塞兑换本身 */ }
  }
  if (exchanged.length) {
    const v = await bumpChildVersion(db, childId);
    await touchRow(db, 'children', 'id=?', [childId], v);
  }
  return { exchanged };
}
/* 任一图鉴 entry_key 对应的物种号（含主宠线形态与伊布分支；认不出的返回 null）。
 * 注意 speciesOfDexKey 只认有收藏招式的种（如主宠首形态 1/4/7/25 无 COLLECTION_MOVES 会返回 null），
 * 这里直接按前缀解析，不经过它——蛋去重必须认主宠线形态（如皮卡丘线的孩子已拥有 25）。 */
function speciesNoOfDexKey(key) {
  const k = String(key || '');
  const m = /^(?:wild|rare|egg|gym):(\d+)$/.exec(k);
  if (m) return Number(m[1]);
  const f = /^form:([^:]+):(\d+)$/.exec(k);
  if (f) {
    const line = LINES[f[1]];
    const idx = Number(f[2]);
    if (line && idx >= 1 && line.forms[idx - 1]) return line.forms[idx - 1].no;
    return null;
  }
  if (k.startsWith('form:eevee:branch:')) {
    const b = EEVEE_BRANCHES[k.slice('form:eevee:branch:'.length)];
    return b ? b.no : null;
  }
  return null;
}
/* 蛋去重（§3.6）：拥有 = 图鉴已记该物种 或 背包已有同种未孵化蛋；伊布例外可重复。
 * 图鉴含主宠线形态（form:）与伊布分支（form:eevee:branch:），不只 egg:/wild: 行。 */
async function ownsSpeciesEver(db, childId, no) {
  const r = await db.prepare('SELECT 1 AS x FROM species_acquisitions WHERE child_id=? AND species_no=?').bind(childId, no).first();
  if (r) return true;
  const { results } = await db.prepare('SELECT entry_key FROM pokedex WHERE child_id=?').bind(childId).all();
  for (const row of results) {
    if (speciesNoOfDexKey(row.entry_key) === no) return true;
  }
  return false;
}
/* 孩子已拥有的全部物种号集合（高级转盘／单元测试奖池去重用，与 ownsSpeciesEver 同口径） */
async function ownedSpeciesSet(db, childId) {
  const s = new Set();
  const [{ results: a }, { results: p }] = await Promise.all([
    db.prepare('SELECT species_no FROM species_acquisitions WHERE child_id=?').bind(childId).all(),
    db.prepare('SELECT entry_key FROM pokedex WHERE child_id=?').bind(childId).all(),
  ]);
  for (const r of a) s.add(Number(r.species_no));
  for (const r of p) {
    const no = speciesNoOfDexKey(r.entry_key);
    if (no) s.add(no);
  }
  return s;
}
async function hasPendingEgg(db, childId, no) {
  const r = await db.prepare("SELECT 1 AS x FROM reward_eggs WHERE child_id=? AND species_no=? AND status='pending'").bind(childId, no).first();
  if (r) return true;
  const s = await db.prepare('SELECT 1 AS x FROM sealed_eggs WHERE child_id=? AND species=? AND hatched=0').bind(childId, no).first();
  return !!s;
}

/* 问答答对加经验：与审核共用同一套升级/进化/招式计算（不触发连击与野外遭遇） */
async function grantXp(db, child, amount, today) {
  // 原子累加再回读权威值：并发答题/审核同时加经验时，旧快照整值写回会互相覆盖丢经验
  await db.prepare('UPDATE children SET total_xp = total_xp + ? WHERE id=?').bind(amount, child.id).run();
  await syncTouch(db, child.id, 'children', 'id=?', [child.id]);
  const freshRow = await db.prepare('SELECT total_xp FROM children WHERE id=?').bind(child.id).first();
  const newTotalXp = freshRow ? freshRow.total_xp : child.total_xp + amount;
  const oldLevel = levelFromXp(newTotalXp - amount);
  const newLevel = levelFromXp(newTotalXp);
  const levelsGained = [];
  for (let L = oldLevel + 1; L <= newLevel; L++) levelsGained.push(L);
  const freshMoves = newMovesBetween(child.line, oldLevel, newLevel, safeJsonArr(child.unlocked_moves))
    .map((m) => ({ level: m[0], name: m[1], desc: m[2] }));
  // 实际形态新旧对比（终极须有石才成真；伊布分支不随等级变）
  const instBefore = await getPetInstance(db, child.id, child.line);
  const oldForm = actualFormIdxFor(child.line, oldLevel, instBefore);
  await unlockForms(db, { ...child, total_xp: newTotalXp }, today);
  const instAfter = await getPetInstance(db, child.id, child.line);
  const newFormIdx = actualFormIdxFor(child.line, newLevel, instAfter);
  const line = LINES[child.line];
  // 妖精技能石：已学会池内招式的伊布升到 16 级时，提示可进化仙子伊布（不自动进化）
  let pendingFairyEvolve = false;
  if (child.line === 'eevee' && newLevel >= 16 && instAfter && !instAfter.branch) {
    pendingFairyEvolve = fairyMovesOf(child).length > 0;
  }
  return {
    xpAwarded: amount, totalXp: newTotalXp, oldLevel, newLevel, levelsGained,
    newMoves: freshMoves,
    evolved: newFormIdx > oldForm ? {
      from: oldForm === 0 ? '神秘的蛋' : (child.line === 'eevee' ? '伊布' : line.forms[oldForm - 1].name),
      to: newFormIdx === 0 ? '神秘的蛋' : (child.line === 'eevee' ? '伊布' : line.forms[newFormIdx - 1].name),
      formIdx: newFormIdx,
      img: newFormIdx === 0 ? null : petImg(child.line === 'eevee' ? 133 : line.forms[newFormIdx - 1].no),
    } : null,
    pendingFairyEvolve,
  };
}

/* 进化通知：形态进化播 evolution；伊布已学妖精招式且刚到 16 级时另播 evo-ready（仙子进化提示） */
async function pushEvoNotices(db, childId, xpInfo) {
  if (!xpInfo) return;
  if (xpInfo.evolved) await pushNotice(db, childId, 'evolution', xpInfo.evolved);
  if (xpInfo.pendingFairyEvolve) await pushNotice(db, childId, 'evo-ready', { to: '仙子伊布', branch: 'sylveon', img: petImg(700) });
}

/* ---- v11：进化判定与用石 ---- */

/* 可进化项（纯计算，基于实例＋背包＋等级）：主宠终极（16 级＋石）、伊布 8 分支、收藏线
 * （等级进化／用石／连接交换道具／纯交换门槛）。每项带 ready 与 missing，便于前端展示。 */
/* 物种中文名：先查野生 SPECIES 表，主宠线（1/4/7/25/133 等）不在该表里，再查 LINES forms 与伊布分支。 */
/* 传说 4 种中文名：SPECIES 表只含野外池（144/145/146/150 不在表里），
 * 稀有转盘扇区 label 与发蛋文案须显示真名（2026-11-07 转盘升级补）。 */
const LEGENDARY_NAMES = { 144: '急冻鸟', 145: '闪电鸟', 146: '火焰鸟', 150: '超梦' };
function speciesName(no) {
  no = Number(no);
  if (SPECIES[no]) return SPECIES[no].name;
  if (LEGENDARY_NAMES[no]) return LEGENDARY_NAMES[no];
  for (const line of Object.values(LINES)) {
    const f = (line.forms || []).find((x) => Number(x.no) === no);
    if (f) return f.name;
  }
  for (const b of Object.values(EEVEE_BRANCHES)) if (Number(b.no) === no) return b.name;
  return `图鉴 #${no}`;
}
/* 高级转盘可用次数（两表并计）：学校 wheel_chances ＋ 进化 evo_wheel_grants；
 * 进化奖励不计入每周 3 次上限（学校发放只数 wheel_chances 的行）。 */
async function wheelChancesLeft(db, childId) {
  const [wc, eg] = await Promise.all([
    db.prepare('SELECT COUNT(*) n FROM wheel_chances WHERE child_id=? AND used_epoch IS NULL').bind(childId).first(),
    db.prepare('SELECT COUNT(*) n FROM evo_wheel_grants WHERE child_id=? AND used_epoch IS NULL').bind(childId).first(),
  ]);
  return (wc ? (wc.n || 0) : 0) + (eg ? (eg.n || 0) : 0);
}

function normalizeQuizRow(r) {
  return {
    id: r.id, kind: r.kind, grade: r.grade, subject: r.subject,
    question: r.question, options: safeJsonArr(r.options_json),
    answer_idx: r.answer_idx, explain: r.explain || '',
    chapter: r.chapter || null, topicId: r.topic_id || null,
    active: r.active !== 0, isCustom: !!r.is_custom, photoKey: r.photo_key || null,
    oakEpisode: r.oak_episode || null, oakTopic: r.oak_topic || null, oakAudio: r.oak_audio || null,
  };
}

/* 今天已通过的科目（按科打卡行）——问答按科解锁的依据 */
async function approvedSubjectsToday(db, childId, today) {
  const { results } = await db.prepare(
    "SELECT DISTINCT subject FROM checkins WHERE child_id=? AND date=? AND status='approved' AND subject IS NOT NULL"
  ).bind(childId, today).all();
  return results.map((r) => r.subject);
}

/* 该孩子每道题的最近一次作答（去重选题用）：Map(question_id → {lastDate, lastCorrect}) */
async function quizHistoryForChild(db, childId) {
  const { results } = await db.prepare(
    'SELECT question_id, date_shanghai, correct FROM quiz_attempts WHERE child_id=? ORDER BY date_shanghai DESC, id DESC'
  ).bind(childId).all();
  const history = new Map();
  for (const a of results) {
    if (!history.has(a.question_id)) {
      history.set(a.question_id, { lastDate: a.date_shanghai, lastCorrect: !!a.correct });
    }
  }
  return history;
}

/* 当日题单：按今日已通过科目组题（某科通过解锁该科 1 题；2026-11-09 起不再含脑筋急转弯，
 * 上限 5），落库缓存（同一天题单稳定；通过更多科目时补选新解锁的题）。 */
async function quizPoolForChild(db, child, today, S) {
  const [rawSubjects, row] = await Promise.all([
    approvedSubjectsToday(db, child.id, today),
    db.prepare('SELECT * FROM quiz_daily WHERE child_id=? AND date_shanghai=?')
      .bind(child.id, today).first(),
  ]);
  const subjects = expandQuizSubjects(rawSubjects);
  const quota = quizDailyTotal(rawSubjects);
  if (!quota) return { subjects: [], quota: 0, hasApproved: false, questions: [], attempts: new Map() };
  let ids = [];
  if (row) ids = safeJsonArr(row.question_ids).map(Number);
  if (ids.length < quota) {
    /* 三门进度一次取齐（性能优化#3）：1 次 getSettings 代替 3 次单条 getSetting；
     * 仍实时读库（改完即生效），只是合并往返。缺失的键为 null，与 getSetting 同口径。
     * 热路径入口已用 loadHotSettings 取齐时直接用 S（S 须含三门进度键，否则走原单查）。 */
    const progressMap = (S && S.has(`math_progress_${child.id}`) && S.has(`chinese_progress_${child.id}`) && S.has(`english_progress_${child.id}`))
      ? S : await getSettings(db, [
        `math_progress_${child.id}`,
        `chinese_progress_${child.id}`,
        `english_progress_${child.id}`,
      ]);
    const [{ results: all }, history, repeatDays, mathGate, chineseGate, englishGate] = await Promise.all([
      db.prepare('SELECT * FROM quiz_questions').all(),
      quizHistoryForChild(db, child.id),
      (S && S.has('quiz_repeat_days')) ? S.get('quiz_repeat_days') : getEffSetting(db, child.family_id, 'quiz_repeat_days'),
      /* 三门进度门：实时读取保证改完即生效（值由上面一次取齐后传入） */
      loadMathGate(db, child, progressMap.get(`math_progress_${child.id}`)),
      loadChineseGate(db, child, progressMap.get(`chinese_progress_${child.id}`)),
      loadEnglishGate(db, child, progressMap.get(`english_progress_${child.id}`)),
    ]);
    const allNorm = all.map(normalizeQuizRow);
    // 已缓存题单覆盖了哪些槽位：补选时优先补「缺槽」的题，避免 slice 截走错科的题
    const slotKey = (q) => (q.kind === 'riddle' ? 'riddle' : (subjects.includes(q.subject) ? q.subject : '其他'));
    const covered = new Set(ids.map((id) => allNorm.find((q) => q.id === id)).filter(Boolean).map(slotKey));
    const windowDays = Number(repeatDays || QUIZ_CORRECT_WINDOW_DAYS);
    const gradeNum = gradeNumFromLabel(child.grade_label);
    const fresh = selectDailyQuestions(allNorm, {
      gradeNum,
      subjects: rawSubjects,
      excludeIds: ids, // 已进今日题单的不重复选
      history, today, correctWindowDays: windowDays,
      mathGate,
      chineseGate, englishGate,
    });
    const freshSorted = [...fresh].sort((a, b) =>
      (covered.has(slotKey(a)) ? 1 : 0) - (covered.has(slotKey(b)) ? 1 : 0)); // 缺槽优先（稳定排序）
    ids = [...ids, ...freshSorted.slice(0, quota - ids.length).map((q) => q.id)];
    await db.prepare(
      `INSERT INTO quiz_daily(child_id,date_shanghai,question_ids) VALUES(?,?,?)
       ON CONFLICT(child_id,date_shanghai) DO UPDATE SET question_ids=excluded.question_ids`
    ).bind(child.id, today, JSON.stringify(ids)).run();
    await syncTouch(db, child.id, 'quiz_daily', 'child_id=? AND date_shanghai=?', [child.id, today]);
  }
  const qmap = new Map();
  const ph = ids.map(() => '?').join(',');
  const [{ results }, { results: atts }] = await Promise.all([
    ids.length
      ? db.prepare(`SELECT * FROM quiz_questions WHERE id IN (${ph})`).bind(...ids).all()
      : { results: [] },
    db.prepare(
      'SELECT * FROM quiz_attempts WHERE child_id=? AND date_shanghai=?'
    ).bind(child.id, today).all(),
  ]);
  if (ids.length) {
    for (const r of results) qmap.set(r.id, normalizeQuizRow(r));
  }
  const questions = ids.map((id) => qmap.get(id)).filter(Boolean);
  const attempts = new Map(atts.map((a) => [a.question_id, a]));
  return { subjects, quota, hasApproved: true, questions, attempts };
}

/* ---------------- 精灵球掉落 + 答题触发遭遇（借鉴包 v1 §4/§5） ----------------
 * 答对一题判定一次：先判高级球 1%，未中再判普通球 30%（同题至多掉 1 个）；
 * 每天掉落上限 3 个（ball_drops 按日记账，跨日天然重置）。判定函数 rng 可注入。 */
const BALL_DROP_SUPER_RATE = 0.01;
const BALL_DROP_NORMAL_RATE = 0.30;
const BALL_DROP_DAILY_LIMIT = 3;
const QUIZ_ENCOUNTER_RATE = 0.10;

function rollBallDrop(rng = Math.random) {
  if (rollRng(rng) < BALL_DROP_SUPER_RATE) return 'super';
  if (rollRng(rng) < BALL_DROP_NORMAL_RATE) return 'normal';
  return null;
}

/* 日常道具掉落总开关（v11 §9.2）：场景未接线时整个事件功能关闭；本批 §9.3 同批上线故默认开 */
async function isDailyItemDropEnabled(db, S) {
  const v = (S && S.has('daily_item_drops_enabled')) ? S.get('daily_item_drops_enabled') : await getSetting(db, 'daily_item_drops_enabled');
  return v === null || v === undefined || String(v) !== '0';
}

/* 答题触发野外遭遇的概率判定（当天无任何遭遇时才掷，见 apiQuizAnswer） */
function rollWildEncounter(rng = Math.random) {
  return rollRng(rng) < QUIZ_ENCOUNTER_RATE;
}

async function apiQuizAnswer(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const questionId = Number(body.question_id ?? body.questionId);
  const answerIdx = Number(body.answer_idx ?? body.answerIdx);
  if (!childId || !questionId || ![0, 1, 2, 3].includes(answerIdx)) {
    return json({ ok: false, error: '参数不对' }, 400);
  }
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  // Fable 优化 #3：本请求所需的设置一次取齐（三门进度、quiz_repeat_days、quiz_xp、
  //   daily_item_drops_enabled、english_mode）
  const S = await loadHotSettings(db, child.family_id, [
    `math_progress_${child.id}`, `chinese_progress_${child.id}`, `english_progress_${child.id}`,
    'quiz_repeat_days', 'quiz_xp', 'daily_item_drops_enabled', 'english_mode',
  ]);
  const pool = await quizPoolForChild(db, child, today, S);
  const q = pool.questions.find((x) => x.id === questionId);
  if (!q) return json({ ok: false, error: '这道题不在今天的题单里' }, 400); // 超额度/外来题
  if (!q.active) return json({ ok: false, error: '这道题被家长下架啦' }, 400);
  if (!GATES_OPEN_FULL && pool.attempts.has(questionId)) return json({ ok: false, error: '这道题今天已经答过啦' }, 400); // 重复答题

  const quizXp = Number(((S.has('quiz_xp')) ? S.get('quiz_xp') : await getEffSetting(db, child.family_id, 'quiz_xp')) || 10);
  const correct = answerIdx === q.answer_idx;
  const xpAwarded = correct ? quizXp : 0;
  const fragAwarded = correct ? fragmentAwardOnCorrect(child.quiz_correct_total || 0) : 0;
  /* 任务 124：放行时先删当日旧作答（唯一约束 ux_quiz_attempt），否则 INSERT OR IGNORE 插不进。 */
  if (GATES_OPEN_FULL) {
    await db.prepare('DELETE FROM quiz_attempts WHERE child_id=? AND question_id=? AND date_shanghai=?').bind(childId, questionId, today).run();
  }
  const ins = await db.prepare(
    `INSERT OR IGNORE INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch)
     VALUES(?,?,?,?,?,?,?)`
  ).bind(childId, questionId, today, correct ? 1 : 0, xpAwarded, fragAwarded, Math.floor(Date.now() / 1000)).run();
  if (!ins.meta || !ins.meta.changes) return json({ ok: false, error: '这道题今天已经答过啦' }, 400);
  await syncTouch(db, childId, 'quiz_attempts', 'id=?', [Number(ins.meta.last_row_id)]);

  let xpInfo = null;
  let drop = null;
  let itemDrop = null;
  let quizEncounter = null;
  const newCorrectTotal = (child.quiz_correct_total || 0) + (correct ? 1 : 0);
  const newFragments = (child.quiz_fragments || 0) + fragAwarded;
  if (correct) {
    xpInfo = await grantXp(db, child, xpAwarded, today);
    await pushEvoNotices(db, child.id, xpInfo); // 进化过场：孩子下次打开首页播
    await db.prepare('UPDATE children SET quiz_correct_total=?, quiz_fragments=? WHERE id=?')
      .bind(newCorrectTotal, newFragments, child.id).run();
    await syncTouch(db, childId, 'children', 'id=?', [childId]);
    // 精灵球掉落（借鉴包 v1 §4）：每日上限 3 个，先判高级 1%、再判普通 30%。
    // 原子口径（审查 M4）：先记账后给球——记账用单条条件 INSERT（当日未满上限才落行），
    // 并发答对时两条语句在库内串行，只有一条能落行；记账没落行就不给球，上限不可绕过。
    const kind = rollBallDrop();
    if (kind) {
      const rec = await db.prepare(
        `INSERT INTO ball_drops(child_id, date_shanghai, kind, created_epoch)
         SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM ball_drops WHERE child_id=? AND date_shanghai=?) < ?`
      ).bind(childId, today, kind, Math.floor(Date.now() / 1000), childId, today, BALL_DROP_DAILY_LIMIT).run();
      if (rec.meta && rec.meta.changes) {
        const col = kind === 'super' ? 'balls_super' : 'balls';
        await db.prepare(`UPDATE children SET ${col} = ${col} + 1 WHERE id=?`).bind(childId).run();
        const v = await bumpChildVersion(db, childId);
        await touchRow(db, 'ball_drops', 'id=?', [Number(rec.meta.last_row_id)], v);
        await touchRow(db, 'children', 'id=?', [childId], v);
        drop = { kind };
        await settleBallOverflow(db, childId, today); // v11：球满 99 自动向上兑换
      }
    }
    // 日常道具掉落（v11 §9）：与掉球叠加、不替代——答对后第二次独立 RNG 判定；
    // 同球掉落口径：先记账（当日未满 3 件才落行）后给物，上限不可绕过；失败不影响答题返回。
    itemDrop = null;
    try {
      if (await isDailyItemDropEnabled(db, S)) {
        // rollDailyItemDrop 返回字符串 key（'medicine:potion' / 'ball:hyper' / 'stone:leaf'）或 null；
        // 石档去重用 Set（背包里已有未用的石不再掉）。
        const ownedStoneSet = new Set();
        for (const k of DAILY_DROP_STONES) if (await getInventoryQty(db, childId, k)) ownedStoneSet.add(k);
        const rolledKey = rollDailyItemDrop(Math.random, ownedStoneSet);
        if (rolledKey) {
          const rec2 = await db.prepare(
            `INSERT INTO daily_item_drops(child_id, item_key, date_shanghai, created_epoch)
             SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM daily_item_drops WHERE child_id=? AND date_shanghai=?) < ?`
          ).bind(childId, rolledKey, today, Math.floor(Date.now() / 1000), childId, today, DAILY_DROP_DAILY_LIMIT).run();
          if (rec2.meta && rec2.meta.changes) {
            if (rolledKey === 'ball:hyper') {
              await addBalls(db, childId, 'hyper', 1, today);
              itemDrop = { key: rolledKey, kind: 'ball', name: '高级球', emoji: '🟡' };
            } else {
              await addItem(db, childId, rolledKey, 1, 'daily-drop', 'quiz', questionId, today);
              const cat = ITEM_CATALOG[rolledKey];
              itemDrop = { key: rolledKey, kind: cat ? cat.kind : 'item', name: cat ? cat.name : rolledKey, emoji: cat ? cat.emoji : '🎁' };
            }
          }
        }
      }
    } catch (e) { console.error('daily item drop failed', e); }
    // 野外遭遇新触发（借鉴包 v1 §5，与审核触发叠加）：当天还没有任何遭遇时 10% 生成一场。
    // 条件 INSERT 兜底（审查 M5）：与审核触发并发同日命中时，库内串行只落一行。
    const anyEnc = await db.prepare('SELECT id FROM encounters WHERE child_id=? AND date=? LIMIT 1')
      .bind(childId, today).first();
    if (!anyEnc && rollWildEncounter()) {
      const caught = new Set(
        (await db.prepare("SELECT entry_key FROM pokedex WHERE child_id=? AND entry_key LIKE 'wild:%'")
          .bind(childId).all()).results.map((r) => Number(r.entry_key.split(':')[1]))
      );
      const mon = pickWildSpecies(Math.random, caught);
      const r = await db.prepare(
        `INSERT INTO encounters(child_id,date,pokemon_no,name)
         SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM encounters WHERE child_id=? AND date=?)`
      ).bind(childId, today, mon.no, mon.name, childId, today).run();
      if (r.meta && r.meta.changes) {
        quizEncounter = { id: r.meta.last_row_id, no: mon.no, name: mon.name };
        await syncTouch(db, childId, 'encounters', 'id=?', [Number(r.meta.last_row_id)]);
      }
    }
  }
  // 诊断重算：数学学习题作答落库后刷新知识点状态（薄弱→建诊断行；根因修复→done）；
  // 诊断不阻塞答题主链路，失败只记日志（下次重算时补上）
  if (q.kind === 'study' && q.subject === '数学') {
    try { await diagRecompute(db, child, today); } catch (e) { console.error('diagRecompute after answer failed', e); }
  }
  let showExplain = true;
  const gradeNum = gradeNumFromLabel(child.grade_label);
  if (gradeNum === 3 && q.subject === '英语' &&
      ((S && S.has('english_mode')) ? S.get('english_mode') : await getSetting(db, 'english_mode')) === '1') {
    const gate = await loadEnglishGate(db, child, (S && S.has(`english_progress_${child.id}`)) ? S.get(`english_progress_${child.id}`) : undefined);
    showExplain = showEnglishZh(
      gradeNum, true, gate ? gate.ord : null, englishOrder(q.chapter));
  }
  return json({
    ok: true, correct, explain: q.explain,
    showExplain,
    correctIdx: q.answer_idx, // 题目已答完，前端可高亮正确答案
    xpAwarded, fragmentsAwarded: fragAwarded,
    drop, itemDrop, encounter: quizEncounter,
    quizFragments: newFragments, quizCorrectTotal: newCorrectTotal,
    nextFragmentIn: 5 - (newCorrectTotal % 5),
    answeredCount: pool.attempts.size + 1,
    remaining: Math.max(0, pool.questions.length - (pool.attempts.size + 1)),
    level: xpInfo ? {
      oldLevel: xpInfo.oldLevel, newLevel: xpInfo.newLevel,
      levelsGained: xpInfo.levelsGained, newMoves: xpInfo.newMoves, evolved: xpInfo.evolved,
      pendingFairyEvolve: xpInfo.pendingFairyEvolve || false,
    } : null,
  });
}
const FRIENDSHIP_MAX = 255;

async function ensureMainPetInstanceForCare(db, child, today) {
  let inst = await getPetInstance(db, child.id, child.line);
  if (!inst) {
    await ensurePetInstance(db, child.id, child.line, today, 'main');
    inst = await getPetInstance(db, child.id, child.line);
  }
  return inst;
}

async function getChildMainFriendship(db, child, today) {
  const inst = await ensureMainPetInstanceForCare(db, child, today);
  const val = inst && inst.friendship != null ? Number(inst.friendship) : 0;
  return Math.max(0, Math.min(FRIENDSHIP_MAX, val));
}



/* ---------------- 先修回溯诊断（DB 层与接口） ----------------
 * 诊断行是派生快照：作答事实只在 quiz_attempts；重算只读 attempts＋静态图，不写 attempts。
 * 复习题单当日有效：行内 review_question_ids 存当日题单；次日重算后重新选（排除已出过的）。
 * 复习作答只记历史（xp/fragments 记 0），不计 quiz_correct_total，不触发掉球与遭遇。 */
async function diagRecompute(db, child, today) {
  const start = addDays(today, -(DIAG_WINDOW_DAYS - 1));
  const [{ results: attempts }, { results: qrows }] = await Promise.all([
    db.prepare(
      'SELECT question_id, date_shanghai, correct FROM quiz_attempts WHERE child_id=? AND date_shanghai>=? AND date_shanghai<=?'
    ).bind(child.id, start, today).all(),
    db.prepare(
      "SELECT id, topic_id FROM quiz_questions WHERE kind='study' AND subject='数学' AND active=1 AND topic_id IS NOT NULL"
    ).bind().all(),
  ]);
  const qTopic = new Map();
  for (const r of qrows || []) if (r.topic_id) qTopic.set(Number(r.id), r.topic_id);
  const states = diagTopicStates(attempts || [], qTopic, start, today);
  const isWeak = (tid) => { const s = states.get(tid); return !!s && s.state === 'weak'; };
  // 流转现有 pending 行：触发点不再薄弱→done；建行超 7 天仍 pending→expired
  // 注意：判的是触发点（trigger_topic_id）不是根因——根因常为链头（如 p001），本身从未薄弱，
  // 按根因判会在复习答对一道后立刻把行置 done 并当天另建一行（2026-10-26 线上验证复现）。
  const { results: pendings } = await db.prepare(
    "SELECT * FROM quiz_diagnoses WHERE child_id=? AND status='pending' ORDER BY created_date"
  ).bind(child.id).all();
  for (const row of pendings || []) {
    if (!isWeak(row.trigger_topic_id)) {
      await db.prepare("UPDATE quiz_diagnoses SET status='done', resolved_date=? WHERE id=?").bind(today, row.id).run();
      await syncTouch(db, child.id, 'quiz_diagnoses', 'id=?', [row.id]);
    } else if (diffDays(row.created_date, today) >= DIAG_EXPIRE_DAYS) {
      await db.prepare("UPDATE quiz_diagnoses SET status='expired', resolved_date=? WHERE id=?").bind(today, row.id).run();
      await syncTouch(db, child.id, 'quiz_diagnoses', 'id=?', [row.id]);
    }
  }
  // 触发：当天最多新建 1 个 pending；最弱点存在且同根因无 pending 行时建一行
  const weakest = diagWeakestTopic(states);
  let created = null;
  if (weakest) {
    const stillPending = await db.prepare(
      "SELECT id FROM quiz_diagnoses WHERE child_id=? AND status='pending' AND created_date=? LIMIT 1"
    ).bind(child.id, today).first();
    if (!stillPending) {
      const found = diagFindRoot(weakest, isWeak);
      const rootId = found.rootId;
      // 2026-11-17：同一根因当天已练完（resolved_date=today）的不再新建，避免整批答完当天又重复出同一批。
      const ins = await db.prepare(
        `INSERT INTO quiz_diagnoses(child_id,trigger_topic_id,root_topic_id,chain_json,status,review_question_ids,review_correct,created_date,created_epoch)
         SELECT ?,?,?,?, 'pending','[]',0,?,? WHERE NOT EXISTS (SELECT 1 FROM quiz_diagnoses WHERE child_id=? AND root_topic_id=? AND status='pending')
         AND NOT EXISTS (SELECT 1 FROM quiz_diagnoses WHERE child_id=? AND root_topic_id=? AND resolved_date=?)`
      ).bind(child.id, weakest, rootId, JSON.stringify(found.chain), today, Math.floor(Date.now() / 1000), child.id, rootId, child.id, rootId, today).run();
      if (ins.meta && ins.meta.changes) {
        created = await db.prepare('SELECT * FROM quiz_diagnoses WHERE id=?').bind(ins.meta.last_row_id).first();
        await syncTouch(db, child.id, 'quiz_diagnoses', 'id=?', [Number(ins.meta.last_row_id)]);
      } else {
        created = await db.prepare(
          "SELECT * FROM quiz_diagnoses WHERE child_id=? AND root_topic_id=? AND status='pending' ORDER BY id DESC LIMIT 1"
        ).bind(child.id, rootId).first();
      }
    }
  }
  return { states, weakest, created };
}

async function getChild(db, id) {
  return db.prepare('SELECT * FROM children WHERE id=?').bind(id).first();
}

/* 给孩子挂一条待展示通知（连击里程碑 streak_box / 进化过场 evolution） */
async function pushNotice(db, childId, kind, payload) {
  const r = await db.prepare('INSERT INTO child_notices(child_id, kind, payload, created_epoch) VALUES(?,?,?,?)')
    .bind(childId, kind, JSON.stringify(payload || {}), Math.floor(Date.now() / 1000)).run();
  const v = await bumpChildVersion(db, childId);
  if (r.meta) await touchRow(db, 'child_notices', 'id=?', [Number(r.meta.last_row_id)], v);
}

/* familyId 为空 = 不过滤（老库 / 旧 PIN 会话）；有值 = 只返回本家庭的孩子（family_id 只来自服务端会话） */
async function getChildren(db, familyId) {
  const st = familyId
    ? db.prepare('SELECT * FROM children WHERE family_id=? ORDER BY id').bind(familyId)
    : db.prepare('SELECT * FROM children ORDER BY id');
  const { results } = await st.all();
  return results;
}
/* 孩子必须属于调用者的家庭，否则当作不存在（调用方回 404，不暴露别家孩子是否存在）；familyId 为空时不限。 */
async function getFamilyChild(db, familyId, id) {
  const c = await getChild(db, Number(id) || 0);
  if (!c) return null;
  if (familyId && c.family_id !== familyId) return null;
  return c;
}
const notFound404 = () => json({ ok: false, error: 'NOT_FOUND' }, 404);

/* ---------------- 照片（R2 存本体，库里只存索引；经鉴权路由读取） ---------------- */

function photoExt(contentType) {
  return contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
}

/* 前端照片条目解析：{id} = 保留已有照片；{data(base64), contentType} = 新照片。
 * 返回 {list:[{keepId}|{bytes,contentType}]} 或 {err}（不合法/超量/超限）。 */
function parsePhotosArg(raw) {
  if (raw === undefined) return { list: undefined };
  if (!Array.isArray(raw)) return { err: '照片格式不对' };
  if (raw.length > PHOTO_MAX_PER_CHECKIN) return { err: `每科最多 ${PHOTO_MAX_PER_CHECKIN} 张照片` };
  const list = [];
  for (const p of raw) {
    if (p && Number.isInteger(p.id) && p.id > 0 && p.data === undefined) { list.push({ keepId: p.id }); continue; }
    if (!p || typeof p.data !== 'string') return { err: '照片格式不对' };
    let b64 = p.data;
    const comma = b64.indexOf(',');
    if (b64.startsWith('data:') && comma > 0) b64 = b64.slice(comma + 1);
    let bytes;
    try { bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)); } catch { return { err: '照片解码失败' }; }
    if (!bytes.length) return { err: '照片是空的' };
    if (bytes.length > PHOTO_MAX_BYTES) return { err: '照片太大了，压缩后再试' };
    const ct = PHOTO_TYPES.includes(p.contentType) ? p.contentType : 'image/jpeg';
    list.push({ bytes, contentType: ct });
  }
  return { list };
}

async function photoPut(env, key, bytes, contentType) {
  if (!env.PHOTOS) throw new Error('PHOTOS_UNAVAILABLE');
  await env.PHOTOS.put(key, bytes, { httpMetadata: { contentType } });
}
async function photoDelete(env, key) {
  if (!env.PHOTOS) return; // 桶未开通时没有对象可删
  try { await env.PHOTOS.delete(key); } catch { /* 孤儿对象不阻塞主流程 */ }
}

async function weekApprovedCount(db, childId, ws) {
  // 按天计：本周内有通过科目的天数（当天多科通过也算 1 天）
  const r = await db.prepare(
    "SELECT COUNT(DISTINCT date) n FROM checkins WHERE child_id=? AND status='approved' AND date>=? AND date<?"
  ).bind(childId, ws, addDays(ws, 7)).first();
  return r ? r.n : 0;
}

async function clearedStages(db, childId) {
  const { results } = await db.prepare('SELECT stage FROM gym_progress WHERE child_id=? ORDER BY stage')
    .bind(childId).all();
  return new Set(results.map((r) => r.stage));
}

/* 孩子已拥有的收藏宠（图鉴物种，可作备战）：[{no, name, type}] */
const MAX_CARRIED_COLLECTION = 4;

async function hasCarriedColumn(db) {
  try {
    const { results } = await db.prepare("PRAGMA table_info('pokedex')").all();
    return (results || []).some((c) => c.name === 'carried');
  } catch {
    return false;
  }
}

async function ownedCollection(db, childId) {
  // 图鉴行与前主宠物种表互不依赖：并行取
  const [{ results }, exList] = await Promise.all([
    db.prepare(
      `SELECT p.*, sa.first_epoch
     FROM pokedex p
     LEFT JOIN species_acquisitions sa
       ON sa.child_id = p.child_id
      AND sa.species_no = CAST(SUBSTR(p.entry_key, INSTR(p.entry_key, ':') + 1) AS INTEGER)
     WHERE p.child_id = ?`
    ).bind(childId).all(),
    exMainSpecies(db, childId),
  ]);

  const hasCol = results.length > 0 ? ('carried' in results[0]) : await hasCarriedColumn(db);
  // 任务 110：前主宠物种表（一次查询，供下面两分支共用）——判别只靠 has_been_main。
  const exMap = new Map(exList.map((ex) => [ex.no, ex]));
  const rawList = [];
  for (const r of results) {
    const no = speciesOfDexKey(r.entry_key);
    const sp = no ? SPECIES[no] : null;
    if (no && COLLECTION_MOVES[no] && sp) {
      const ex = exMap.get(no);
      rawList.push({
        no,
        entry_key: r.entry_key,
        name: sp.name,
        type: sp.type,
        img: petImg(no),
        counters: countersForPet(no),
        carried: hasCol ? Number(r.carried) === 1 : null,
        first_epoch: r.first_epoch ?? null,
        unlocked_at: r.unlocked_at ?? null,
        // 任务 110：该物种若是前主宠（如伊布 133），带上标记——备战/离线按线招式算它
        ...(ex ? { exMain: true, lineKey: ex.lineKey, branch: ex.branch || null } : {}),
      });
    } else {
      // 任务 110：前主宠特判——旧主宠进携带后按物种进携带列表（名册门之外）。
      // speciesOfDexKey 对 egg:5 这类主宠线物种返回 null（无 COLLECTION_MOVES），
      // 所以这里直接从 egg:<种> 读号；判别只靠 has_been_main，同物种的蛋孵个体不进此分支。
      const m = /^egg:(\d+)$/.exec(String(r.entry_key || ''));
      const eggNo = m ? Number(m[1]) : null;
      if (eggNo && !COLLECTION_MOVES[eggNo]) {
        const ex = exMap.get(eggNo);
        if (ex) {
          const exType = ex.branch ? EEVEE_BRANCHES[ex.branch].type : LINE_TYPE[ex.lineKey];
          rawList.push({
            no: eggNo,
            entry_key: r.entry_key,
            name: speciesName(eggNo),
            type: exType,
            img: petImg(eggNo),
            counters: countersForType(exType),
            carried: hasCol ? Number(r.carried) === 1 : null,
            first_epoch: r.first_epoch ?? null,
            unlocked_at: r.unlocked_at ?? null,
            exMain: true,
            lineKey: ex.lineKey,
            branch: ex.branch || null,
          });
        }
      }
    }
  }

  if (!hasCol) {
    const byOrder = [...rawList].sort((a, b) => {
      const ea = a.first_epoch ?? (a.unlocked_at ? Date.parse(a.unlocked_at) / 1000 : 9999999999);
      const eb = b.first_epoch ?? (b.unlocked_at ? Date.parse(b.unlocked_at) / 1000 : 9999999999);
      return (ea - eb) || (a.no - b.no);
    });
    const carriedSet = new Set(byOrder.slice(0, MAX_CARRIED_COLLECTION).map((x) => x.no));
    for (const item of rawList) item.carried = carriedSet.has(item.no);
  }

  return rawList
    .map(({ first_epoch, unlocked_at, ...rest }) => rest)
    .sort((a, b) => a.no - b.no);
}

async function carriedCollection(db, childId) {
  const all = await ownedCollection(db, childId);
  return all.filter((c) => c.carried);
}

/* -------- 战斗系统（迁移 0005）：统一 battles 表 + 共用引擎 --------
 * 铁律：本节任何路径都不得改 children.total_xp（战斗不发经验）。 */

/* 任务 126：单只随身/备战宠的战斗对象（抽自 buildPlayerSide 的备战分支，供道馆全队复用）。
 * no 为图鉴编号；ex 为前主宠信息（{ lineKey, branch }）或 null；realLevel 为孩子真实等级。
 * 前主宠走自己线的招式表，否则走收藏招式表；名/属性兜底与旧分支同口径（SPECIES 里没有
 * 主宠线物种时 speciesName 扫 LINES.forms；妖精回落到本线普通属性）。 */
function buildCarriedPet(child, realLevel, battleLevel, no, ex) {
  const sp = SPECIES[no];
  const benchType = ex ? (ex.branch ? EEVEE_BRANCHES[ex.branch].type : LINE_TYPE[ex.lineKey]) : (sp ? sp.type : null);
  // 2026-11-17 方案 A：makePet 校验已扩到 TYPES18（18 种），仙子伊布的妖精不再撞校验；
  // 此回落分支已成死代码、仅留作脏数据兜底（太阳/月亮伊布在分支表里本就是“普通”）。
  // 收藏 sylveon（700）备战同病是既有问题，不在这里顺手改，见报告。
  const petType = ex && benchType && !TYPES18.includes(benchType) ? LINE_TYPE[ex.lineKey] : benchType;
  return makePet({
    key: `dex:${no}`, name: sp ? sp.name : speciesName(no), type: petType, no,
    img: petImg(no), level: battleLevel, defTypes: playerDefTypes(no),
    ability: instAbilityFor(child, [ex && ex.lineKey, `species:${no}`], no),
    moves: (() => { const eff = ex ? lineMovesFor(child, ex.lineKey, realLevel, benchType) : collectionMovesFor(child, no, realLevel); return eff.length ? eff.map((m) => ({ name: m.name, type: m.type, damage_class: m.damage_class, power: m.power })) : [{ name: '撞击', type: '普通', power: 35 }]; })(),
  });
}

function buildPlayerSide(child, battleLevel, benchNo, opts = {}) {
  const line = LINES[child.line];
  const realLevel = levelFromXp(child.total_xp);
  const form = formInfo(child); // 调用方须先 attachEvoForm，否则按等级推导（终极封顶 2 阶）
  const mainType = form.branch ? EEVEE_BRANCHES[form.branch].type : LINE_TYPE[child.line];
  const eff = allMovesFor(child, realLevel, mainType);
  const moves = eff.length
    ? eff.map((m) => ({ name: m.name, type: m.type, damage_class: m.damage_class, power: m.power }))
    : [{ name: '撞击', type: '普通', power: 35 }]; // 还没学招式时的基础招
  const mainNo = form.branchNo || (form.img ? line.forms[form.formIdx - 1].no : null);
  const pets = [makePet({
    key: 'main', name: form.formName, type: mainType,
    no: mainNo, img: form.img, level: battleLevel, moves,
    defTypes: playerDefTypes(mainNo),
    ability: instAbilityFor(child, [child.line], mainNo),
    egg: form.img ? null : eggDesignFor(line.forms[0].no), // 蛋形态主宠进战斗时按物种画蛋（§52）
  })];
  // 任务 126：道馆全队——benchNo 固定放 pets[1]（旧口径，备战即第一替补；非随身的旧调试路径也保留）；
  // opts.carried 为随身列表（{ no, exMain, lineKey, branch }），其余随身宠依次追加（主宠、备战不重复）。
  // leadNo 指定时把该宠移到队首（不传则主宠先发，与旧行为一致）；PvP 不传 opts，行为不变。
  if (benchNo) {
    // 任务 110：招式跟宠走——前主宠（child._exMain，开局前由 attachExMain 挂上）
    // 走自己线的招式表；不是前主宠才走收藏招式表。
    const ex = child._exMain && Number(child._exMain.no) === benchNo ? child._exMain : null;
    pets.push(buildCarriedPet(child, realLevel, battleLevel, benchNo, ex));
  }
  if (opts.carried) {
    for (const c of opts.carried) {
      if (c.no === mainNo || c.no === benchNo) continue;
      const ex = c.exMain ? { lineKey: c.lineKey, branch: c.branch || null } : null;
      pets.push(buildCarriedPet(child, realLevel, battleLevel, c.no, ex));
    }
  }
  if (opts.leadNo) {
    const li = pets.findIndex((pp) => pp.no === opts.leadNo);
    if (li > 0) { const [lead] = pets.splice(li, 1); pets.unshift(lead); }
    // 备战固定在 pets[1]（先发换位后，备战仍为第一替补——昏厥自动顶上时先上备战；
    // 先发即备战时不重复占位）。
    if (benchNo && benchNo !== opts.leadNo) {
      const bi = pets.findIndex((pp) => pp.no === benchNo);
      if (bi > 1) { const [bench] = pets.splice(bi, 1); pets.splice(1, 0, bench); }
    }
  }
  return { childId: child.id, childName: child.name, battleLevel, activeIdx: 0, pets, line: child.line || null };
}

/* 测试模式备战全选：146 种收藏种＋这孩子的前主宠（任务 110）。
 * 前主宠物种由 exMainSpecies 给（与 doSwitchLine 的 carried 行同口径）；
 * 已在 146 种里的物种（如伊布 133）不重复追加。 */
async function debugBenchOptions(db, childId) {
  const base = Object.keys(COLLECTION_MOVES).map(Number).sort((a, b) => a - b)
    .map((no) => ({ no, name: SPECIES[no]?.name || speciesName(no), img: petImg(no), type: SPECIES[no]?.type || null }));
  if (db && childId) {
    for (const ex of await exMainSpecies(db, childId)) {
      if (base.some((b) => b.no === ex.no)) continue;
      base.push({ no: ex.no, name: speciesName(ex.no), img: petImg(ex.no), type: ex.branch ? EEVEE_BRANCHES[ex.branch].type : LINE_TYPE[ex.lineKey] });
    }
    base.sort((a, b) => a.no - b.no);
  }
  return base;
}

async function ownsSpecies(db, childId, no) {
  if (!COLLECTION_MOVES[no]) {
    // 任务 110：前主宠例外——旧主宠进携带后，参战门按 has_been_main 认它。
    // 图鉴行仍须存在（doSwitchLine 写 egg:<种> 行），下面 pokedex 校验照常。
    if (!(await getExMainLine(db, childId, no))) return false;
  }
  if (GATES_OPEN) return true;
  const r = await db.prepare('SELECT 1 AS x FROM pokedex WHERE child_id=? AND entry_key=?')
    .bind(childId, dexKeyForSpecies(no)).first();
  return !!r;
}

/* 闯关首通奖励：点亮徽章（gym_progress）+ 馆主入图鉴 + 该关 species 封印蛋；
 * 八关全通再发梦幻终奖蛋（每孩仅一次）。重复通关不重发。绝不发经验。 */
async function awardGymClear(db, childId, stage, today) {
  const cfg = GYM_STAGES.find((g) => g.stage === stage);
  const dexIns = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
    .bind(childId, `gym:${cfg.bossNo}`, today).run();
  if (dexIns.meta && dexIns.meta.changes) {
    const v = await bumpChildVersion(db, childId);
    await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, `gym:${cfg.bossNo}`], v);
  }
  const ins = await db.prepare('INSERT OR IGNORE INTO gym_progress(child_id, stage, cleared_at) VALUES(?,?,?)')
    .bind(childId, stage, today).run();
  const firstClear = !!(ins.meta && ins.meta.changes);
  const out = { firstClear, stage, badge: cfg.badge, eggSpecies: null, eggName: null, finalEgg: false };
  if (!firstClear) return out;
  const unlock = addDays(today, 7);
  const eggIns = await db.prepare('INSERT INTO sealed_eggs(child_id, awarded_date, unlock_date, species) VALUES(?,?,?,?)')
    .bind(childId, today, unlock, cfg.eggSpecies).run();
  if (eggIns.meta) {
    const v = await bumpChildVersion(db, childId);
    await touchRow(db, 'sealed_eggs', 'id=?', [Number(eggIns.meta.last_row_id)], v);
  }
  out.eggSpecies = cfg.eggSpecies;
  out.eggName = SPECIES[cfg.eggSpecies].name;
  const cleared = await clearedStages(db, childId);
  if (cleared.size >= GYM_STAGES.length && (await getSetting(db, `gym_final_egg_${childId}`)) !== '1') {
    const finalIns = await db.prepare('INSERT INTO sealed_eggs(child_id, awarded_date, unlock_date, species) VALUES(?,?,?,?)')
      .bind(childId, today, unlock, 151).run();
    if (finalIns.meta) {
      const v = await bumpChildVersion(db, childId);
      await touchRow(db, 'sealed_eggs', 'id=?', [Number(finalIns.meta.last_row_id)], v);
    }
    await setSetting(db, `gym_final_egg_${childId}`, '1');
    out.finalEgg = true;
  }
  return out;
}

/* 道馆二期 Tier 1（2026-11-17）：连败计数（服务端记，按孩子＋关卡）。
 * 道馆战赢了置 0、输了 +1；只记道馆战（PvP、野外、合作不碰）。
 * 调用方：finalizeBattle（在线对战收尾，赢/输都走这里）与 settleGymCore
 *（离线 outbox 同步＋直接路由）。弃赛不走 finalizeBattle、不计连败。
 * 写失败只吞掉（旧库无 gym_fail_streaks 表时连败这次不记，道馆本身不受影响；
 * 口径同 bumpChildVersion 对无 sync_versions 表的旧链）。 */
async function gymFailStreakRecord(db, childId, stage, won, nowEpoch) {
  try {
    if (won) {
      await db.prepare(`INSERT INTO gym_fail_streaks(child_id, stage, streak, updated_epoch) VALUES(?,?,0,?)
        ON CONFLICT(child_id, stage) DO UPDATE SET streak=0, updated_epoch=excluded.updated_epoch`)
        .bind(childId, stage, nowEpoch).run();
    } else {
      await db.prepare(`INSERT INTO gym_fail_streaks(child_id, stage, streak, updated_epoch) VALUES(?,?,1,?)
        ON CONFLICT(child_id, stage) DO UPDATE SET streak=streak+1, updated_epoch=excluded.updated_epoch`)
        .bind(childId, stage, nowEpoch).run();
    }
  } catch {
    // 旧库无表：连败不记，不影响对战结算本身
  }
}

async function pvpCountedThisWeek(db, childId, ws) {
  const r = await db.prepare(
    "SELECT id FROM battles WHERE mode='pvp' AND week_start=? AND counted=1 AND (child_a=? OR child_b=?) LIMIT 1"
  ).bind(ws, childId, childId).first();
  return !!r;
}

/* ---------------- PvP 再来一局（用户 2026-10-24）：孩子申请 → 家长审核 → 批准解锁一场额外对战 ----------------
 * 口径：申请/批准都按周（week_start）隔离，跨周自动失效；同一周至多一张待审核或待用批准，
 * 不叠加囤积；批准只解除「每周 1 场」的计次限制，周末与双方本周打卡 ≥4 天等入场条件不变。
 * 再来一局的胜负口径未定案，v1 保守实现：不计次、不发冠军球、不改已决出的周冠军（见 finalizeBattle）。 */
async function latestRematchRequest(db, ws, familyId) {
  if (familyId) { // 只看本家庭孩子发起的申请
    return db.prepare('SELECT r.* FROM pvp_rematch_requests r JOIN children c ON c.id=r.requester_child_id WHERE r.week_start=? AND c.family_id=? ORDER BY r.id DESC LIMIT 1').bind(ws, familyId).first();
  }
  return db.prepare('SELECT * FROM pvp_rematch_requests WHERE week_start=? ORDER BY id DESC LIMIT 1').bind(ws).first();
}

function rematchView(r, nameOf) {
  if (!r) return { status: 'none', requesterChildId: null, requesterName: null };
  return {
    status: r.status,
    requesterChildId: r.requester_child_id,
    requesterName: nameOf ? nameOf(r.requester_child_id) : null,
  };
}

/* -------- 转盘机会共用实现（B2）：稀有 / 养成两盘的 grant / 查剩余 / 取最旧机会 / CAS 占位 --------
 * 表名只来自内部常量（rare_wheel_chances / care_wheel_chances / wheel_chances / evo_wheel_grants），不接收外部输入。
 * 表未建（如旧迁移链）：grant 当未发放、查剩余当 0、取机会当无机会，一律不抛错。 */
async function grantWheelChance(db, table, label, childId, source, refId, today, now) {
  try {
    const ins = await db.prepare(
      `INSERT OR IGNORE INTO ${table}(child_id, source, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?)`
    ).bind(childId, source, refId, now, today).run();
    return !!(ins.meta && ins.meta.changes);
  } catch (e) { console.error(`grant ${label} wheel chance failed`, e); return false; }
}
async function wheelChancesLeftFor(db, table, childId) {
  try {
    const r = await db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE child_id=? AND used_epoch IS NULL`).bind(childId).first();
    return r ? (r.n || 0) : 0;
  } catch { return 0; }
}
/* -------- 普通转盘（2026-11-17 新建，Oak 英语交流奖励）：机会发放 --------
 * 机会表 oak_wheel_chances（迁移 0040）：不进 sync 注册表——转盘须联网，离线端不用。
 * 发放一律 INSERT OR IGNORE（UNIQUE(child_id, source, ref_id) 防重），返回是否新发。
 * 不占高级转盘周上限：不走 wheel_chances、不触 WHEEL_WEEK_LIMIT（周上限仅限高级转盘）。
 * 与其他普通转盘机会分开记：本表只记 Oak 机会，互不挤占。 */
async function grantOakWheelChance(db, childId, source, refId, today, now) {
  return grantWheelChance(db, 'oak_wheel_chances', 'oak', childId, source, refId, today, now);
}

// 合作地图配置；hpMult 已由 sim 定参回填（sim-coop.mjs n=5000 固定种子：配合线胜率 n1 41.14/n2 48.60/n3 43.36/n4 48.42/n5 44.32%）
const COOP_MAPS = {
  'coop-m1.v1': {
    version: 'coop-m1.v1',
    nodes: [
      {
        node_id: 'n1', kind: 'normal', name: '波波草原',
        bossNo: 16, bossType: '飞行', levelOffset: 0, hpMult: 17,
        sweep: false, sweepMove: null, shield: null, timeBudgetSec: 720,
        bossMoves: [['旋风小翅', '飞行', 44], ['俯冲啄击', '飞行', 56]],
        rewards: [{ type: 'node_sticker' }],
        next: 'n2'
      },
      {
        node_id: 'n2', kind: 'normal', name: '走路草林地',
        bossNo: 43, bossType: '草', levelOffset: 0, hpMult: 24,
        sweep: false, sweepMove: null, shield: null, timeBudgetSec: 720,
        bossMoves: [['飞叶小刀', '草', 48], ['花粉喷雾', '草', 40]],
        rewards: [{ type: 'node_sticker' }],
        next: 'n3'
      },
      {
        node_id: 'n3', kind: 'normal', name: '地鼠洞窟',
        bossNo: 50, bossType: '地面', levelOffset: 0, hpMult: 17,
        sweep: false, sweepMove: null, shield: null, timeBudgetSec: 720,
        bossMoves: [['挖洞突袭', '地面', 46], ['泥巴投掷', '地面', 40]],
        rewards: [{ type: 'node_sticker' }],
        next: 'n4'
      },
      {
        // shield 为批 2 预留，本批不启用
        node_id: 'n4', kind: 'elite', name: '霸王花庭院',
        bossNo: 45, bossType: '草', levelOffset: 1, hpMult: 18.5,
        sweep: true, sweepMove: '花瓣狂舞', shield: 3, timeBudgetSec: 1080,
        bossMoves: [['花瓣狂舞', '草', 56], ['巨叶拍打', '草', 48]],
        rewards: [{ type: 'node_badge' }],
        next: 'n5'
      },
      {
        // shield 为批 2 预留，本批不启用
        node_id: 'n5', kind: 'final', name: '螳螂高塔',
        bossNo: 123, bossType: '飞行', levelOffset: 2, hpMult: 12.75,
        sweep: true, sweepMove: '镰刀疾风', shield: 4, timeBudgetSec: 1320,
        bossMoves: [['旋风连斩', '飞行', 52], ['镰刀疾风', '飞行', 60]],
        rewards: [{ type: 'story_card' }, { type: 'expedition_badge' }],
        next: null
      }
    ]
  }
};

// 取指定版本的节点数组，找不到返回 []
function coopMapNodes(mapVersion) {
  const map = COOP_MAPS[mapVersion];
  return map && Array.isArray(map.nodes) ? map.nodes : [];
}

// 取指定版本的单个节点，找不到返回 null
function coopNode(mapVersion, nodeId) {
  return coopMapNodes(mapVersion).find(n => n.node_id === nodeId) || null;
}

// 奖励展示名
function coopRewardLabel(node, rewardType) {
  const sp = SPECIES[node.bossNo];
  const bossName = sp ? sp.name : String(node.bossNo);
  switch (rewardType) {
    case 'node_badge': return `合作徽记·${bossName}`;
    case 'node_sticker': return `合作贴纸·${bossName}`;
    case 'expedition_badge': return '远征徽章';
    case 'story_card': return `剧情卡·${bossName}`;
    default: return null;
  }
}

function nowEpoch() {
  return Math.floor(nowDate().getTime() / 1000);
}

function parseJsonSafe(s, fallback) {
  if (s === null || s === undefined || s === '') return fallback;
  try {
    const v = JSON.parse(s);
    return v === null || v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

async function getMasterEnabled(db) {
  return (await getSetting(db, 'coop_master_enabled')) === '1';
}

// 读取全部假期配置（解析失败的跳过）
async function listHolidays(db) {
  const ids = safeJsonArr(await getSetting(db, 'holiday_index'));
  const out = [];
  const raws = await Promise.all(ids.map((id) => getSetting(db, `holiday:${id}`))); // 每个假期一读，互不依赖
  for (const raw of raws) {
    const h = parseJsonSafe(raw, null);
    if (h && typeof h === 'object' && h.gather_window && h.start_date && h.end_date) out.push(h);
  }
  return out;
}

// 当前假期：today 落在 [集结窗口开始, 假期结束]；否则取最近的未来假期
async function currentHoliday(db) {
  const today = shDateStr(nowDate());
  const list = await listHolidays(db);
  let cur = null;
  for (const h of list) {
    if (today >= h.gather_window.start && today <= h.end_date) {
      if (!cur || h.gather_window.start > cur.gather_window.start) cur = h;
    }
  }
  if (cur) return cur;
  let next = null;
  for (const h of list) {
    if (h.gather_window.start > today) {
      if (!next || h.gather_window.start < next.gather_window.start) next = h;
    }
  }
  return next;
}

function holidayPhase(holiday) {
  const today = shDateStr(nowDate());
  const gw = holiday.gather_window || {};
  const inWindow = !!gw.start && today >= gw.start && today <= gw.end;
  const inHoliday = today >= holiday.start_date && today <= holiday.end_date;
  let week = null;
  for (const w of holiday.coop_weeks || []) {
    if (today >= w.start && today <= w.end) { week = w; break; }
  }
  return { inWindow, inHoliday, week, today };
}

// 确保两名孩子之间存在合作事件（跨假期复用同一行）
async function ensureCoopEvent(db, holiday, familyId) {
  // 只在同一家庭内配对：familyId 缺省时不限（旧的单家庭口径）
  const kids = (await getChildren(db, familyId)).slice().sort((x, y) => Number(x.id) - Number(y.id)).slice(0, 2);
  if (kids.length < 2) return null;
  const pa = kids[0].id;
  const pb = kids[1].id;
  const sel = db.prepare('SELECT * FROM coop_events WHERE participant_a=? AND participant_b=?').bind(pa, pb);
  const row = await sel.first();
  const now = nowEpoch();
  if (row) {
    if (row.holiday_id !== holiday.holiday_id) {
      const newStatus = (row.status === 'completed' || row.status === 'closed') ? 'gathering' : row.status;
      await db.prepare(
        'UPDATE coop_events SET holiday_id=?, status=?, version=version+1, updated_at=? WHERE event_id=? AND version=?'
      ).bind(holiday.holiday_id, newStatus, now, row.event_id, row.version).run();
      return await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(row.event_id).first();
    }
    return row;
  }
  const eventId = crypto.randomUUID();
  const stmts = [
    db.prepare(
      'INSERT INTO coop_events (event_id, holiday_id, map_version, participant_a, participant_b, status, version, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
    ).bind(eventId, holiday.holiday_id, holiday.map_version, pa, pb, 'gathering', 0, now, now)
  ];
  for (const n of coopMapNodes(holiday.map_version) || []) {
    const nodeId = n.node_id !== undefined ? n.node_id : n.id;
    stmts.push(db.prepare(
      'INSERT OR IGNORE INTO coop_node_progress (event_id, node_id, state, version) VALUES (?,?,?,0)'
    ).bind(eventId, nodeId, 'locked'));
  }
  await db.batch(stmts);
  return await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(eventId).first();
}

// 法定休假日集合；缺年度时返回 {missing: 年}
async function statutoryOffSet(db, yearA, yearB) {
  const obj = parseJsonSafe(await getSetting(db, 'cn_statutory_holidays'), {});
  const years = Array.from(new Set([String(yearA), String(yearB)]));
  const set = new Set();
  for (const y of years) {
    const entry = obj && obj[y];
    if (!entry || !Array.isArray(entry.off)) return { missing: y };
    for (const d of entry.off) set.add(d);
  }
  return set;
}

// 集结窗口内的上学日（周一至周五且非法定休假日）
function gatherSchoolDays(holiday, offSet) {
  const out = [];
  const gw = holiday.gather_window;
  let d = gw.start;
  for (let i = 0; i < 400 && d <= gw.end; i++) {
    const wd = new Date(d + 'T12:00:00+08:00').getDay();
    if (wd !== 0 && wd !== 6 && !(offSet && offSet.has(d))) out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

async function computeGatherCounts(db, childId, holiday, subjectsLocked, schoolDays) {
  let aCount = 0;
  const subs = Array.isArray(subjectsLocked) ? subjectsLocked : [];
  const days = Array.isArray(schoolDays) ? schoolDays : [];
  const gw = holiday.gather_window;
  const [r, rb] = await Promise.all([
    (subs.length && days.length)
      ? db.prepare(`SELECT COUNT(*) AS c FROM checkins WHERE child_id=? AND status='approved' AND subject IN (${subs.map(() => '?').join(',')}) AND date IN (${days.map(() => '?').join(',')})`).bind(childId, ...subs, ...days).first()
      : null,
    db.prepare(
      "SELECT COUNT(DISTINCT date) AS c FROM checkins WHERE child_id=? AND status='approved' AND subject='阅读' AND date BETWEEN ? AND ?"
    ).bind(childId, gw.start, gw.end).first(),
  ]);
  if (subs.length && days.length) aCount = Number((r && r.c) || 0);
  return { aCount, bDays: Number((rb && rb.c) || 0) };
}

// 合作日门槛：当天已通过 ≥2 科且含阅读
async function coopDayGateMet(db, childId, dateStr) {
  const r = await db.prepare(
    "SELECT DISTINCT subject FROM checkins WHERE child_id=? AND date=? AND status='approved'"
  ).bind(childId, dateStr).all();
  const subjects = ((r && r.results) || []).map(x => x.subject);
  const hasReading = subjects.includes('阅读');
  return { met: subjects.length >= 2 && hasReading, subjects, hasReading };
}

const COOP_ALL_SUBJECTS = ['语文', '数学', '英语', '阅读'];

// 计算集结窗口上学日（缺年度时不扣假，并返回 missing 标记）
async function coopSchoolDaysFor(db, holiday) {
  const gw = holiday.gather_window;
  const off = await statutoryOffSet(db, gw.start.slice(0, 4), gw.end.slice(0, 4));
  const missing = !(off instanceof Set);
  return { schoolDays: gatherSchoolDays(holiday, missing ? new Set() : off), missing };
}

// 集结行惰性刷新
async function refreshGathering(db, event, holiday, childId) {
  const today = shDateStr(nowDate());
  const gw = holiday.gather_window;
  if (today < gw.start) return null;
  const selRow = () => db.prepare(
    'SELECT * FROM coop_gatherings WHERE event_id=? AND holiday_id=? AND user_id=?'
  ).bind(event.event_id, holiday.holiday_id, childId).first();
  let row = await selRow();
  if (!row) {
    const snap0 = {
      subjectsLocked: null, unconfigured: false, schoolDays: null, expectedTotal: 0,
      threshold: 0, aCount: 0, bDays: 0, phase: 'pre', computed_at: nowEpoch()
    };
    await db.prepare(
      'INSERT INTO coop_gatherings (gathering_id, event_id, holiday_id, user_id, window_start, window_end, stats_snapshot, gate_a_pass, gate_b_pass, result, makeup_deadline, makeup_gap, makeup_progress, version) VALUES (?,?,?,?,?,?,?,0,0,?,NULL,NULL,NULL,0)'
    ).bind(crypto.randomUUID(), event.event_id, holiday.holiday_id, childId, gw.start, gw.end, JSON.stringify(snap0), 'pending').run();
    row = await selRow();
    if (!row) return null;
  }

  const snap = parseJsonSafe(row.stats_snapshot, {});
  let gateA = Number(row.gate_a_pass) ? 1 : 0;
  let gateB = Number(row.gate_b_pass) ? 1 : 0;
  let result = row.result || 'pending';
  let makeupDeadline = row.makeup_deadline || null;
  let makeupGap = parseJsonSafe(row.makeup_gap, null);
  let makeupProgress = parseJsonSafe(row.makeup_progress, null);

  // 单次统计与 gate 判定
  async function computeOnce() {
    let overwriteA = false;
    const locked = Array.isArray(snap.subjectsLocked) && snap.subjectsLocked.length > 0;
    if (!locked) {
      const cfg = parseJsonSafe(await getSetting(db, `daily_subjects:${childId}`), {});
      const subs = (Array.isArray(cfg.subjects) ? cfg.subjects : []).filter(s => COOP_ALL_SUBJECTS.includes(s));
      if (subs.length) {
        const sd = await coopSchoolDaysFor(db, holiday);
        snap.subjectsLocked = Array.from(new Set(subs));
        snap.unconfigured = false;
        snap.holidaysMissing = sd.missing;
        snap.schoolDays = sd.schoolDays;
        snap.expectedTotal = sd.schoolDays.length * snap.subjectsLocked.length;
        snap.threshold = Math.floor((4 * snap.expectedTotal + 4) / 5);
        overwriteA = true; // 锁定后改为锁定口径
      } else {
        snap.unconfigured = true;
      }
    } else if (snap.holidaysMissing) {
      // 之前缺法定假日数据，重试补齐
      const sd = await coopSchoolDaysFor(db, holiday);
      if (!sd.missing) {
        snap.holidaysMissing = false;
        snap.schoolDays = sd.schoolDays;
        snap.expectedTotal = sd.schoolDays.length * snap.subjectsLocked.length;
        snap.threshold = Math.floor((4 * snap.expectedTotal + 4) / 5);
        overwriteA = true;
      }
    }
    const nowLocked = Array.isArray(snap.subjectsLocked) && snap.subjectsLocked.length > 0;
    let counts;
    if (nowLocked) {
      counts = await computeGatherCounts(db, childId, holiday, snap.subjectsLocked, snap.schoolDays);
    } else {
      const sd = await coopSchoolDaysFor(db, holiday);
      counts = await computeGatherCounts(db, childId, holiday, COOP_ALL_SUBJECTS, sd.schoolDays);
    }
    snap.aCount = overwriteA ? counts.aCount : Math.max(Number(snap.aCount) || 0, counts.aCount);
    snap.bDays = Math.max(Number(snap.bDays) || 0, counts.bDays);
    snap.computed_at = nowEpoch();
    if (nowLocked && !snap.holidaysMissing && snap.aCount >= (Number(snap.threshold) || 0)) gateA = 1;
    if (snap.bDays >= 12) gateB = 1;
    if (nowLocked && gateA && gateB && result === 'pending') result = 'pass';
  }

  await computeOnce();

  // 终结算：假期第 2 天起
  if (today >= addDays(holiday.start_date, 1) && snap.phase !== 'final') {
    snap.phase = 'final';
    if (result === 'pending') {
      const R = Math.max(0, 12 - (Number(snap.bDays) || 0));
      const H = Math.max(0, (Number(snap.threshold) || 0) - (Number(snap.aCount) || 0));
      const D = Math.max(3, R, Math.ceil(H / 2));
      const L = diffDays(holiday.start_date, holiday.end_date) + 1;
      const halfL = Math.floor(L / 2);
      const eligible = D <= halfL;
      makeupGap = { R, H, D, L, halfL, eligible, fixed_at: nowEpoch() };
      if (eligible) {
        let dl = holiday.makeup_deadline;
        if (!dl) {
          const weeks = holiday.coop_weeks || [];
          dl = weeks.length ? addDays(weeks[weeks.length - 1].start, -1) : holiday.end_date;
        }
        result = 'makeup';
        makeupDeadline = dl;
        makeupProgress = { days: [], count: 0, completed_at: null };
      } else {
        result = 'not_open';
      }
    }
  } else if (snap.phase !== 'final') {
    snap.phase = today <= gw.end ? 'window' : 'post';
  }

  // 补集结扫描
  if (result === 'makeup' && makeupDeadline && makeupGap) {
    const progress = makeupProgress && Array.isArray(makeupProgress.days)
      ? makeupProgress : { days: [], count: 0, completed_at: null };
    const endD = today < makeupDeadline ? today : makeupDeadline;
    const seen = new Set(progress.days.map(x => x.date));
    let d = holiday.start_date;
    for (let i = 0; i < 62 && d <= endD; i++) {
      if (!seen.has(d)) {
        const g = await coopDayGateMet(db, childId, d);
        if (g.met) { progress.days.push({ date: d, subjects: g.subjects }); seen.add(d); }
      }
      d = addDays(d, 1);
    }
    progress.count = progress.days.length;
    if (progress.count >= makeupGap.D && today <= makeupDeadline) {
      result = 'makeup_pass';
      progress.completed_at = nowEpoch();
    }
    makeupProgress = progress;
  }

  // 乐观锁写回
  const upd = await db.prepare(
    'UPDATE coop_gatherings SET stats_snapshot=?, gate_a_pass=?, gate_b_pass=?, result=?, makeup_deadline=?, makeup_gap=?, makeup_progress=?, version=version+1 WHERE gathering_id=? AND version=?'
  ).bind(
    JSON.stringify(snap), gateA, gateB, result, makeupDeadline,
    makeupGap ? JSON.stringify(makeupGap) : null,
    makeupProgress ? JSON.stringify(makeupProgress) : null,
    row.gathering_id, row.version
  ).run();
  const changed = upd && upd.meta && upd.meta.changes > 0;
  const latest = await selRow();
  if (!changed) return latest;

  // 事件激活：双方均已集结
  if (event.status === 'gathering') {
    const r = await db.prepare(
      'SELECT user_id, result FROM coop_gatherings WHERE holiday_id=? AND user_id IN (?,?)'
    ).bind(holiday.holiday_id, event.participant_a, event.participant_b).all();
    const rows = (r && r.results) || [];
    const ok = (uid) => rows.some(x => String(x.user_id) === String(uid) && (x.result === 'pass' || x.result === 'makeup_pass'));
    if (ok(event.participant_a) && ok(event.participant_b)) {
      const nodes = coopMapNodes(event.map_version || holiday.map_version) || [];
      const first = nodes[0];
      const firstId = first ? (first.node_id !== undefined ? first.node_id : first.id) : null;
      const stmts = [
        db.prepare(
          "UPDATE coop_events SET status='active', version=version+1, updated_at=? WHERE event_id=? AND version=?"
        ).bind(nowEpoch(), event.event_id, event.version)
      ];
      if (firstId !== null) {
        stmts.push(db.prepare(
          "UPDATE coop_node_progress SET state='open', version=version+1 WHERE event_id=? AND node_id=? AND state='locked' AND EXISTS (SELECT 1 FROM coop_events WHERE event_id=? AND status='active')"
        ).bind(event.event_id, firstId, event.event_id));
      }
      const res = await db.batch(stmts);
      if (res && res[0] && res[0].meta && res[0].meta.changes > 0) {
        event.status = 'active';
        event.version = Number(event.version) + 1;
      }
    }
  }
  return latest;
}

/* 命令幂等执行器（供 /api/commands 与 /api/gym/settle、/api/pvp/settle 共用）：
* 先 INSERT OR IGNORE 占位 cmd_log；已有 cmd_id 且 result 非空时直接返回存的结果
*（含原状态码，不重复执行）；占位成功后执行 fn，fn 返回 Response，把 {status, body}
* 存入 cmd_log.result；fn 抛错时删占位行（允许客户端重试）并原样抛出。 */
async function runIdempotentCommand(db, cmdId, childId, type, fn) {
const now = Math.floor(Date.now() / 1000);
const ins = await db.prepare(
'INSERT OR IGNORE INTO cmd_log(cmd_id, child_id, type, result, created_at) VALUES(?,?,?,?,?)'
).bind(cmdId, childId, type, null, now).run();
if (!ins.meta ||!ins.meta.changes) {
const row = await db.prepare('SELECT result FROM cmd_log WHERE cmd_id=?').bind(cmdId).first();
if (row && row.result) {
const saved = JSON.parse(row.result);
return new Response(saved.body, { status: saved.status, headers: { 'Content-Type': 'application/json'}});
}
return json({ ok: false, error: 'CMD_IN_PROGRESS'}, 409);
}
let res;
try {
res = await fn();
} catch (e) {
await db.prepare('DELETE FROM cmd_log WHERE cmd_id=?').bind(cmdId).run();
throw e;
}
const text = await res.text();
await db.prepare('UPDATE cmd_log SET result=? WHERE cmd_id=?')
.bind(JSON.stringify({ status: res.status, body: text}), cmdId).run();
return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json'}});
}

/* 道馆通关结算核心（供 /api/gym/settle 直接路由与 /api/commands gym_settle 共用）。
* payload：{stage, won, date, team}。校验顺序：
* ① stage 存在；② won 为 false 时不结算，返回 {ok:true, settled:false, reason:'LOST'}；
* ③ date 的上海周（weekStartMon）须等于当前周，否则 {ok:false, error:'WEEK_PASSED'} 400
*（§5.2：周次已过结算失败，客户端回滚预演）；④ 该周已有 gym_battles won 行或该关已在
* clearedStages 中 → {ok:false, error:'ALREADY_CLEARED'} 400；⑤ 孩子等级须 ≥ cfg.needLevel，
* 否则 LEVEL_TOO_LOW 400；⑥ stage>1 时前一关须已通关，否则 STAGE_LOCKED 400。
* 通过后：记一条 gym_battles(status='won', rounds=3, hearts=3) 并走现有道馆获胜奖励路径
* awardGymClear（徽章＋封印蛋＋八关全通终奖蛋，不发经验）；syncTouch gym_battles 行。
* 不改任何难度常量，不直接发经验。 */
async function settleGymCore(db, childId, payload) {
const stage = Number(payload.stage);
const cfg = GYM_STAGES.find((g) => g.stage === stage);
if (!cfg) return json({ ok: false, error: 'STAGE_NOT_FOUND'}, 400);
if (payload.won === false) {
  // 道馆二期 Tier 1：离线输了经 outbox 同步到这里（或直接路由），连败 +1。
  // 走 runIdempotentCommand 幂等路径：同一 cmd_id 重试直接回缓存结果，不重复记。
  await gymFailStreakRecord(db, childId, stage, false, Math.floor(Date.now() / 1000));
  return json({ ok: true, settled: false, reason: 'LOST'});
}
const date = String(payload.date || shDateStr());
const ws = weekStartMon(date);
const curWs = weekStartMon(shDateStr());
if (ws!== curWs) return json({ ok: false, error: 'WEEK_PASSED'}, 400);
/* 与 apiBattleGymStart 同口径的开放条件，但按“战斗发生日”(payload.date) 而非今天校验：
* 周六离线打赢、周日才同步仍应结算成功。测试站 GATES_OPEN 时跳过（正式站恒 false，不绕过）。 */
if (!GATES_OPEN) {
if (date > shDateStr()) return json({ ok: false, error: 'DATE_IN_FUTURE'}, 400);
if (!isWeekendDate(date)) return json({ ok: false, error: 'NOT_WEEKEND'}, 400);
const cnt = await weekApprovedCount(db, childId, ws);
if (cnt < 4) return json({ ok: false, error: 'CHECKINS_TOO_FEW', count: cnt, need: 4}, 400);
}
const [wonRow, cleared, child] = await Promise.all([
db.prepare(
"SELECT id FROM gym_battles WHERE child_id=? AND week_start=? AND status='won' LIMIT 1"
).bind(childId, ws).first(),
clearedStages(db, childId),
getChild(db, childId),
]);
if (wonRow || cleared.has(stage)) return json({ ok: false, error: 'ALREADY_CLEARED'}, 400);
if (!child) return json({ ok: false, error: 'NOT_FOUND'}, 404);
if (levelFromXp(child.total_xp) < cfg.needLevel) return json({ ok: false, error: 'LEVEL_TOO_LOW'}, 400);
if (stage > 1 &&!cleared.has(stage - 1)) return json({ ok: false, error: 'STAGE_LOCKED'}, 400);
const now = Math.floor(Date.now() / 1000);
const r = await db.prepare(
"INSERT INTO gym_battles(child_id, week_start, created_at, rounds, hearts, status) VALUES(?,?,?,?,?, 'won')"
).bind(childId, ws, now, 3, 3).run();
const battleId = r.meta? Number(r.meta.last_row_id): null;
const rewards = await awardGymClear(db, childId, stage, shDateStr());
// 道馆二期 Tier 1：结算成功的胜场把该关连败清零（只在这里清，校验失败不碰）。
await gymFailStreakRecord(db, childId, stage, true, now);
const version = await syncTouch(db, childId, 'gym_battles', 'id=?', [battleId]);
return json({ ok: true, settled: true, battleId, rewards, version});
}

export { TZ, LINES, EGG_DESIGNS, EGG_TYPE_FALLBACK, EGG_MYSTERY, EGG_TYPE_IMG, EGG_LEAF_SPECIES, eggTypesFor, eggImgFor, eggDesignFor, WILD, WILD_TIERS, CARE_SCENES, careSceneForDate, isCareEnabled, pickWildSpecies, TYPES18, OFFICIAL_MULT, LINE_TYPE, DEX_DETAILS, officialMove, COLLECTION_MOVES, learnedCollectionMoves, collectionMovesFor, ITEM_CATALOG, EEVEE_BRANCHES, EVO_LINES, DAILY_DROP_RATE, DAILY_DROP_DAILY_LIMIT, DAILY_DROP_TABLE, DAILY_DROP_STONES, WHEEL_POOL, WHEEL_EGG_POOL, BALL_EXCHANGE, BALL_MAX, rollDailyItemDrop, WHEEL_COLORS, buildWheelSectors, evoWheelEntries, RARE_WHEEL_LEGENDARIES, RARE_WHEEL_EEVEE, rareWheelFinals, RARE_WHEEL_FINALS, rareWheelSectors, PLAYER_SCALE, BOSS_SCALE, effPlayerLevel, effBossLevel, dexKeyForSpecies, speciesOfDexKey, petImg, PIN_LOCK_MAX, PIN_LOCK_SECS, QUIZ_CORRECT_WINDOW_DAYS, QUIZ_WRONG_GAP_DAYS, PHOTO_MAX_PER_CHECKIN, PHOTO_MAX_BYTES, PHOTO_TYPES, DEBUG_NOW_MS, DEBUG_GATES_OPEN, GATES_OPEN, GATES_OPEN_FULL, nowDate, isTestMode, applyDebugTime, shParts, shDateStr, addDays, fnv1aHash, diffDays, isWeekendDate, weekStartMon, xpForLevel, levelFromXp, formIdxForLevel, learnedMoves, newMovesBetween, MATH_PREREQ_G1G3, QUIZ_SUBJECTS, QUIZ_SLOTS_ALL, expandQuizSubjects, quizDailyTotal, gradeNumFromLabel, fragmentsForCorrectTotal, fragmentAwardOnCorrect, OAK_WHEEL_POOL, CARE_WHEEL_POOL, oakPrizeDisplay, oakWheelEntries, careWheelEntries, effectiveMoves, MATH_CHAPTERS, CHINESE_CHAPTERS, ENGLISH_UNITS, MATH_GRADE_CHARS, chapterOrder, englishOrder, showEnglishZh, GATE_SUBJECTS, chapterOrderFor, gateFor, defaultChapterFor, loadGate, gatePass, loadMathGate, loadChineseGate, loadEnglishGate, mathGatePass, chineseGatePass, englishGatePass, selectDailyQuestions, DIAG_WINDOW_DAYS, DIAG_WEAK_MIN_WRONG, DIAG_WEAK_MIN_RATIO, DIAG_MAX_DEPTH, DIAG_EXPIRE_DAYS, DIAG_FAIL_CLOSED, DIAG_NO_QUESTION_TOPIC, DIAG_TOPIC_BY_ID, DIAG_EDGES_BY_TOPIC, diagTopicStates, diagWeakestTopic, diagFindRoot, battleMaxHp, typeMultOfficial, typeMultOfficialMulti, bossDefTypes, playerDefTypes, countersForType, countersForPet, rollRng, weightedPick, statsFor, abilityOf, rollInstanceAbility, makePet, MOVE_EFFECTS, moveEffectOf, sha256hex, randToken, json, getSetting, getSettings, FAMILY_SETTING_KEYS, getFamilyOverrides, loadHotSettings, getEffSetting, setSetting, hasSyncTables, bumpChildVersion, touchRow, syncTouch, recordTombstone, scopeChildId, forbidIfOtherChild, readJsonBody, withChild, formInfo, safeJsonArr, EVO_TABLE_OK, hasEvoTable, getPetInstance, ensurePetInstance, getExMainLine, attachExMain, attachInstanceAbilities, instAbilityFor, exMainSpecies, actualFormIdxFor, attachEvoForm, fairyMovesOf, SKILL_MAX_LEVEL, SKILL_WEAK_MULT, SKILL_CHARGE_MULT, SKILL_SHELL_MULT, SKILL_SMOKE_MISS, safeJsonObj, skillLevelOf, skillPower, skillEffectFor, allMovesFor, lineMovesFor, unlockForms, getInventoryQty, addItemLedger, addItem, takeItem, BALL_COLUMN, BALL_KIND_BY_COLUMN, addBalls, settleBallOverflow, speciesNoOfDexKey, ownsSpeciesEver, ownedSpeciesSet, hasPendingEgg, grantXp, pushEvoNotices, LEGENDARY_NAMES, speciesName, wheelChancesLeft, normalizeQuizRow, approvedSubjectsToday, quizHistoryForChild, quizPoolForChild, BALL_DROP_SUPER_RATE, BALL_DROP_NORMAL_RATE, BALL_DROP_DAILY_LIMIT, QUIZ_ENCOUNTER_RATE, rollBallDrop, isDailyItemDropEnabled, rollWildEncounter, apiQuizAnswer, FRIENDSHIP_MAX, ensureMainPetInstanceForCare, getChildMainFriendship, diagRecompute, getChild, pushNotice, getChildren, getFamilyChild, notFound404, photoExt, parsePhotosArg, photoPut, photoDelete, weekApprovedCount, clearedStages, MAX_CARRIED_COLLECTION, hasCarriedColumn, ownedCollection, carriedCollection, buildCarriedPet, buildPlayerSide, debugBenchOptions, ownsSpecies, awardGymClear, gymFailStreakRecord, pvpCountedThisWeek, latestRematchRequest, rematchView, grantWheelChance, wheelChancesLeftFor, grantOakWheelChance, COOP_MAPS, coopMapNodes, coopNode, coopRewardLabel, nowEpoch, parseJsonSafe, getMasterEnabled, listHolidays, currentHoliday, holidayPhase, ensureCoopEvent, statutoryOffSet, gatherSchoolDays, computeGatherCounts, coopDayGateMet, COOP_ALL_SUBJECTS, coopSchoolDaysFor, refreshGathering, runIdempotentCommand, settleGymCore };
