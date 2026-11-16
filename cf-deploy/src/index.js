/* 作业打卡怪兽激励 — Cloudflare Worker + D1（家庭自用版）
 * 所有日期判断按 Asia/Shanghai 在服务端计算。
 * 登录模型（入口改造后）：入口页角色选择 —— 孩子用各自 4 位密码登录
 *   （会话 kind='child' 绑定 child_id，服务端只下发本人数据）；
 *   家长用 PIN 登录或由孩子会话输 PIN 升级（会话 kind='parent'，全量管理）。
 *   原全家共用家庭密码已退役（/api/login 下线，settings.family_password 已删）。
 * 经验来源：打卡审核通过（按科独立计，subject_xp/科）、每日问答答对（quiz_xp，可调）、照顾喂食最爱食物（+5/日，需总开关 `care_enabled` 开启）。
 *   审核入口见 apiReview；问答入口见 apiQuizAnswer（内部经 grantXp 走同一套
 *   升级/进化/招式计算）。除上述三条外不得添加任何其他加经验入口；战斗绝不发经验。
 * 打卡（迁移 0004 后）：固定五科，每科一天一行、独立提交/审核；
 *   连击与道馆计数按「天」（当天至少 1 科通过即算）。照片存 R2（PHOTOS 绑定，
 *   未开通时 env.PHOTOS 为空，照片接口返回明确错误），库里只存 checkin_photos 索引。
 */

import { SPECIES } from './data/species.js';
import { MOVES_OFFICIAL } from './data/moves-official.js';
import { COLLECTION_LEARNSET } from './data/collection-learnset.js';
import { GYM_STAGES } from './data/gym-stages.js';
import { DAILY_ENGLISH_POOL, DAILY_ENGLISH_EPISODES } from './data/daily-english.js';
import { DAILY_CHINESE_POOL } from './data/daily-chinese.js';

// 正式站 host（2026-11-10 用户定：服务端按 host 下发 noindex）——其余 host（测试子域、workers.dev 等）一律视为测试/预演，不被搜索引擎收录
const PROD_HOSTS = new Set(['example.com', 'www.example.com', 'exempt.example.com', 'www.exempt.example.com']);
const isProdHost = (hostname) => PROD_HOSTS.has(hostname);

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
 * eggDesignFor(no)：未知物种按 SPECIES.type 兜底（属性花纹），无物种按神秘蛋兜底——永不回到通用 🥚。 */
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
};
/* 属性兜底花纹（未知物种但有官方属性时）：花纹取属性，底色取属性浅色 */
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
};
/* 神秘蛋兜底（物种未知／未定种）：淡紫底＋金星 */
const EGG_MYSTERY = { bg: '#E8E0F0', pat: 'star', c1: '#C9A227', c2: '#8E7CC3' };
function eggDesignFor(no) {
  const n = Number(no);
  if (Number.isFinite(n) && EGG_DESIGNS[n]) return { no: n, ...EGG_DESIGNS[n] };
  const sp = Number.isFinite(n) ? SPECIES[n] : null;
  const t = sp && sp.type;
  if (t && EGG_TYPE_FALLBACK[t]) return { no: Number.isFinite(n) ? n : null, ...EGG_TYPE_FALLBACK[t] };
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


// 照顾玩法：独立总开关、每日一次；只有喂最爱食物发经验，战斗绝不发经验。
const CARE_XP_FAVORITE = 5;
const CARE_FOODS = [
  { key: 'apple', name: '红苹果', emoji: '🍎', flavor: '清甜' },
  { key: 'berry', name: '树果', emoji: '🍓', flavor: '酸甜' },
  { key: 'cookie', name: '曲奇饼干', emoji: '🍪', flavor: '酥脆' },
  { key: 'meat', name: '香烤肉干', emoji: '🍖', flavor: '咸香' },
  { key: 'milk', name: '鲜牛奶', emoji: '🥛', flavor: '奶香' },
  { key: 'honey', name: '野花蜂蜜', emoji: '🍯', flavor: '花香甜' },
];
const CARE_BATHS = [
  { key: 'bubble', name: '泡泡浴', emoji: '🫧' },
  { key: 'shower', name: '温水淋浴', emoji: '🚿' },
  { key: 'petal', name: '花瓣浴', emoji: '🌸' },
  { key: 'herb', name: '草药浴', emoji: '🍃' },
];
const CARE_FAVORITE_BY_LINE = {
  pikachu: 'berry', charmander: 'meat', squirtle: 'milk', bulbasaur: 'honey', eevee: 'berry',
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
function careFavoriteFood(lineKey) {
  return Object.prototype.hasOwnProperty.call(CARE_FAVORITE_BY_LINE, lineKey)
    ? CARE_FAVORITE_BY_LINE[lineKey] : null;
}
function careFoodByKey(key) {
  return CARE_FOODS.find(f => f.key === key) || null;
}
function careBathByKey(key) {
  return CARE_BATHS.find(b => b.key === key) || null;
}
async function isCareEnabled(db) {
  return (await getSetting(db, 'care_enabled')) === '1';
}

function wildTierOf(no) {
  const w = WILD.find((x) => x.no === Number(no));
  return w ? w.tier : null;
}

/* 抓捕一只该物种需要答对的题数（按稀有度档位 1/2/3） */
function catchQuestionsFor(no) {
  const t = wildTierOf(no);
  return t ? WILD_TIERS[t].questions : 1;
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

const STREAK_TITLES = ['早起小勇士', '作业小达人', '坚持之星', '专注小能手', '闪电打卡王'];
const STREAK_STICKERS = ['⭐', '🌈', '🔥', '🎖️', '🍀'];

const GYM_BOSS = { no: 95, name: '大岩蛇' };
const RARE = { no: 151, name: '梦幻' };

/* ---------------- 战斗系统数据（迁移 0005：道馆闯关 + 兄弟对战，共用引擎） ----------------
 * 铁律：战斗（引擎/闯关/PvP）绝不发经验——本节与战斗接口都不得调用 grantXp 或改 total_xp。
 * 属性集固定 9 种；经典克制表只做弱点（×2），供 PvP 答题对战；PvE 官方口径见 OFFICIAL_MULT（含抗性 ×0.5、免疫 ×0）。 */
const TYPE_CHART = {
  '电': ['水'],
  '水': ['火', '岩石', '地面'],
  '火': ['草'],
  '草': ['水', '岩石'],
  '地面': ['电', '火', '岩石'],
  '岩石': ['火', '飞行'],
  '飞行': ['草'],
  '龙': ['龙'],
  '普通': [],
};
const TYPES = Object.keys(TYPE_CHART);
const OFFICIAL_MULT = {
  '电': { '水': 2, '飞行': 2, '电': 0.5, '草': 0.5, '龙': 0.5, '地面': 0 },
  '水': { '火': 2, '地面': 2, '岩石': 2, '水': 0.5, '草': 0.5, '龙': 0.5 },
  '火': { '草': 2, '水': 0.5, '火': 0.5, '岩石': 0.5, '龙': 0.5 },
  '草': { '水': 2, '地面': 2, '岩石': 2, '火': 0.5, '草': 0.5, '飞行': 0.5, '龙': 0.5 },
  '地面': { '电': 2, '火': 2, '岩石': 2, '草': 0.5, '飞行': 0 },
  '岩石': { '火': 2, '飞行': 2, '地面': 0.5 },
  '飞行': { '草': 2, '电': 0.5, '岩石': 0.5 },
  '龙': { '龙': 2 },
  '普通': { '岩石': 0.5 },
  '妖精': { '龙': 2, '火': 0.5 },
};
/* 官方 18 种属性中不在 App 9 种集内的防御/攻击属性，只补与四关馆主有关的两种。
 * 防御侧：毒弱地面（×2）、抗草/妖精（×0.5）；超能力对 App 9 种＋妖精攻击一律 ×1（官方：弱虫/幽灵/恶、抗格斗/超能力，均不在 App 攻击集内，故全部为 1）。
 * 攻击侧：毒克草/妖精（×2）、抗地面/岩石（×0.5）。
 * 其余未列组合一律 ×1。 */
const OFFICIAL_EXTRA_DEF = { '毒': { '地面': 2, '草': 0.5, '妖精': 0.5 } };
const OFFICIAL_EXTRA_ATK = {
  // 官方 18×18 矩阵 data/type-chart.json 的 matrix.钢行；App 防御侧其余属性均为 1。
  '毒': { '草': 2, '妖精': 2, '地面': 0.5, '岩石': 0.5 },
  '钢': { '火': 0.5, '水': 0.5, '电': 0.5, '岩石': 2, '妖精': 2 },
};
const LINE_TYPE = { pikachu: '电', charmander: '火', squirtle: '水', bulbasaur: '草', eevee: '普通' };

/* 只有这两条线有专属头像文件（avatar-*.webp）；其余线用当前形态立绘兜底（同类问题三线一起修） */
const AVATAR_LINES = new Set(['charmander', 'pikachu']);

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

// 单独读取官方命中率，保持 officialMove 的返回形状不变。
function officialAccuracy(name) {
  const accuracy = MOVES_OFFICIAL[name]?.accuracy;
  return Number.isFinite(accuracy) ? accuracy : null;
}

// 单独读取官方威力，供珍稀卡牌馆卡面显示（任务 116）；战斗结算不吃它，返回形状与 officialAccuracy 同款。
function officialPower(name) {
  const power = MOVES_OFFICIAL[name]?.power;
  return Number.isFinite(power) ? power : null;
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
/* 蛋 key ↔ 物种号 */
const EGG_ITEM_BY_SPECIES = { 1: 'egg:bulbasaur', 4: 'egg:charmander', 7: 'egg:squirtle', 25: 'egg:pikachu', 133: 'egg:eevee', 37: 'egg:vulpix', 58: 'egg:growlithe' };
const EGG_SPECIES_BY_ITEM = Object.fromEntries(Object.entries(EGG_ITEM_BY_SPECIES).map(([no, k]) => [k, Number(no)]));
const EGG_HATCH_DAYS = 7;
/* 主宠终极进化用石（按主宠属性；伊布走 EEVEE_BRANCHES） */
const MAIN_EVO_STONE = { pikachu: 'stone:thunder', charmander: 'stone:fire', squirtle: 'stone:water', bulbasaur: 'stone:leaf' };
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
/* 妖精技能石教学池（官方可习得 5 招；App 威力按 25＋6×学会等级，副效待战斗引擎接线㉑） */
const FAIRY_TEACH_POOL = [
  { name: '魅惑之声', power: 40, acc: '必中', effect: '必定命中', type: '妖精' },
  { name: '吸取之吻', power: 50, acc: 100, effect: '回复造成伤害一半的体力', type: '妖精' },
  { name: '魔法闪耀', power: 80, acc: 100, effect: '', type: '妖精' },
  { name: '嬉闹', power: 90, acc: 90, effect: '降低对手攻击', type: '妖精' },
  { name: '月亮之力', power: 95, acc: 100, effect: '降低对手特攻', type: '妖精' },
];
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
/* 图鉴卡片进化链（App 实际规则；官方对照见 DESIGN-进化道具-方案-v11.md 与数据表，官方有、App 没有的分支不展示）。
 * 收藏线走 EVO_LINES；主宠线走 LINES＋FORM_LEVELS（5/10 阶、16＋石终极）＋MAIN_EVO_STONE；
 * 伊布走 EEVEE_BRANCHES。返回 { chain: [{no, name, cond}], branches: [...] | null }，
 * cond 为进化到该节点的 App 条件文本（首节点 null）。 */
function evoCondText(cond) {
  if (!cond) return null;
  if (cond.kind === 'level') return `${cond.level}级以上`;
  if (cond.kind === 'stone') return `使用${(ITEM_CATALOG[cond.stone] || {}).name || '进化石'}`;
  if (cond.kind === 'trade-item') return `使用${(ITEM_CATALOG[cond.item] || {}).name || '道具'}连接交换`;
  if (cond.kind === 'trade') return `连接交换（${cond.minLevel || 10}级以上）`;
  return null;
}
function dexEvoChain(no) {
  no = Number(no);
  const node = (n, cond) => ({ no: n, name: speciesName(n), cond: cond || null });
  const eeveeCond = (bkey, stone) => (bkey === 'sylveon' ? `${FORM_LEVELS[3]}级＋妖精技能石（学会妖精招式）` : `${FORM_LEVELS[3]}级＋${(ITEM_CATALOG[stone] || {}).name || '进化石'}`);
  for (const [base, evo] of Object.entries(EVO_LINES)) {
    if (evo.stages && evo.stages.includes(no)) {
      return { chain: evo.stages.map((n, i) => node(n, i === 0 ? null : evoCondText(evo.conds[i - 1]))), branches: null };
    }
    if (evo.branches) {
      if (Number(base) === no) {
        return { chain: [node(no, null)], branches: evo.branches.map((b) => node(b.to, evoCondText(b.cond))) };
      }
      const hit = evo.branches.find((b) => b.to === no);
      if (hit) return { chain: [node(Number(base), null), node(no, evoCondText(hit.cond))], branches: null };
    }
  }
  for (const [key, line] of Object.entries(LINES)) {
    const idx = line.forms.findIndex((f) => f.no === no);
    if (idx === -1) continue;
    if (key === 'eevee') {
      return { chain: [node(no, null)], branches: Object.entries(EEVEE_BRANCHES).map(([bkey, b]) => node(b.no, eeveeCond(bkey, b.stone))) };
    }
    const stoneName = (ITEM_CATALOG[MAIN_EVO_STONE[key]] || {}).name || '进化石';
    const chain = line.forms.map((f, i) => node(f.no, i === 0 ? null : i === 1 ? `${FORM_LEVELS[2]}级以上` : `${FORM_LEVELS[3]}级＋${stoneName}`));
    return { chain, branches: null };
  }
  for (const [bkey, b] of Object.entries(EEVEE_BRANCHES)) {
    if (b.no === no) {
      return { chain: [node(133, null), node(no, eeveeCond(bkey, b.stone))], branches: null };
    }
  }
  return { chain: [node(no, null)], branches: null };
}
/* 换主宠门槛（§5.3）：目标线蛋（须已孵化）＋任一对应石（不消耗）；切回曾作过主宠的线无需蛋石。
 * 日之石另配火/电蛋、月之石另配水蛋；冰蛋暂无（主宠蛋池无冰系线）。 */
const SWITCH_REQ = {
  bulbasaur: { egg: 1, stones: ['stone:leaf'] },
  charmander: { egg: 4, stones: ['stone:fire', 'stone:sun'] },
  squirtle: { egg: 7, stones: ['stone:water', 'stone:moon'] },
  pikachu: { egg: 25, stones: ['stone:thunder', 'stone:sun'] },
  eevee: { egg: 133, stones: ['stone:water', 'stone:thunder', 'stone:fire', 'stone:leaf', 'stone:ice', 'stone:sun', 'stone:moon', 'stone:fairy-skill'] },
};
/* 道馆用药（§9.3）：回血药每场 ≤2 次、复活 ≤1 次、强化 ≤1 次（强化道具首期未入池，计数位先留）。
 * 使用消耗一次出招机会；昏厥宠复活当回合不能出招；满血禁止浪费性使用；PvP 不可用。 */
const GYM_ITEM_EFFECTS = {
  'medicine:potion': { kind: 'heal', pct: 25 },
  'medicine:berry-juice': { kind: 'heal', pct: 25 },
  'medicine:super-potion': { kind: 'heal', pct: 50 },
  'medicine:water': { kind: 'heal', pct: 50 },
  'medicine:revive': { kind: 'revive', pct: 50 },
};
const GYM_ITEM_CAPS = { heal: 2, revive: 1, boost: 1 };
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
const WHEEL_POOL = [
  ['stone:sun', 25], ['stone:moon', 25], ['stone:fairy-skill', 25], ['ball:hyper', 10], ['egg', 15], ['medicine:revive', 10],
  ['stone:thunder', 5], ['stone:fire', 5], ['stone:water', 5], ['stone:leaf', 5], ['stone:ice', 5],
  ['item:metal-coat', 3], ['item:electirizer', 3], ['item:protector', 3], ['item:black-augurite', 3],
];
/* 学校成绩普通奖励：经验 20；回血药权重合计 85，归一化（顺序：伤药、好伤药、树果汁、美味之水）。 */
const SCHOOL_ORDINARY_XP = 20;
const SCHOOL_HEAL_MEDICINES = [
  ['medicine:potion', 35], ['medicine:super-potion', 20],
  ['medicine:berry-juice', 15], ['medicine:water', 15],
];
const WHEEL_EGG_POOL = [1, 4, 7, 25, 133];
/* 单元测试抽奖（§2.5）：85–89 中奖 40%、90–94 中奖 50%、95–100 中奖 60%；
 * 中奖内权重：进化石（普通）32%（5 石均分）、进化石（稀有）3%（日/月/妖精各 1%）、
 * 高阶球 20%（超级 12.5%、高级 7.5%）、蛋 45%（主宠 18%、普通稀有 27%）。
 * 去重后同细分档归一化，整档为空时其权重转未中奖；伊布始终符合，主宠蛋档永不为空。 */
const UNIT_TEST_WIN_CHANCE = [[85, 0.40], [90, 0.50], [95, 0.60]];
const UNIT_TEST_PRIZE = {
  stoneCommon: 0.32, stoneRare: 0.03, ball: 0.20, egg: 0.45,
  ballSuperShare: 0.625, eggMainShare: 0.40,
};
const UNIT_TEST_STONES_COMMON = ['stone:thunder', 'stone:fire', 'stone:water', 'stone:leaf', 'stone:ice'];
const UNIT_TEST_STONES_RARE = ['stone:sun', 'stone:moon', 'stone:fairy-skill'];
const UNIT_TEST_EGG_MAIN = [1, 4, 7, 25, 133];
const UNIT_TEST_EGG_RARE = [37, 58];
/* 单元测试：首期 20 道等权题，每题 5 分；同孩子/科目/单元重开冷却 24 小时；每孩每周 ≤3 次 */
const UNIT_TEST_QUESTION_COUNT = 20;
const UNIT_TEST_COOLDOWN_SECS = 24 * 3600;
const UNIT_TEST_WEEK_LIMIT = 3;
/* 高级转盘：每孩每周 ≤3 次、同一科目每周 ≤1 次；试卷照片留存 15 天 */
const WHEEL_WEEK_LIMIT = 3;
const SCHOOL_PHOTO_KEEP_DAYS = 15;
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
/* 学校成绩普通奖励掷骰（纯函数）：三类等权各 1/3：普通球 / 经验+20 / 回血药（按 SCHOOL_HEAL_MEDICINES 权重）。 */
function rollSchoolOrdinary(rng = Math.random) {
  const category = rollRng(rng);
  if (category < 1 / 3) return { kind: 'ball', key: 'ball:normal', name: '普通球', emoji: '🔴' };
  if (category < 2 / 3) return { kind: 'xp', key: 'xp:20', xp: SCHOOL_ORDINARY_XP, name: '经验+20', emoji: '⭐' };
  const hit = weightedPick(SCHOOL_HEAL_MEDICINES, rng);
  const [key] = hit || SCHOOL_HEAL_MEDICINES[SCHOOL_HEAL_MEDICINES.length - 1];
  return { kind: 'medicine', key, name: ITEM_CATALOG[key].name, emoji: ITEM_CATALOG[key].emoji };
}
/* 高级转盘掷骰（纯函数）：返回 {kind:'stone'|'ball'|'egg'|'medicine', key|species} 或 null（全池为空禁转）。
 * ownedSpecies：已永久获得的物种集合（蛋去重：图鉴已有或背包已有同种未孵化蛋即排除，伊布可重复）。 */
function rollWheelPrize(rng = Math.random, ownedSpecies = new Set(), ownedEggSpecies = new Set()) {
  const availEggs = WHEEL_EGG_POOL.filter((no) => no === 133 || (!ownedSpecies.has(no) && !ownedEggSpecies.has(no)));
  const entries = WHEEL_POOL.map(([k, w]) => [k, k === 'egg' && !availEggs.length ? 0 : w]);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  if (total <= 0) return null;
  const hit = weightedPick(entries, rng);
  if (hit) {
    const [k] = hit;
    if (k === 'egg') {
      const no = availEggs[Math.floor(rollRng(rng) * availEggs.length) % availEggs.length];
      return { kind: 'egg', key: `egg:${no}`, species: no };
    }
    if (k === 'ball:hyper') return { kind: 'ball', key: 'ball:hyper' };
    if (k.startsWith('medicine:')) return { kind: 'medicine', key: k };
    return { kind: 'stone', key: k };
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
/* 奖品所在扇区下标（纯函数）：找不到返 -1，调用方须处理 -1 为错误，不许静默转错扇区。
 * sectors 可传数组或 buildWheelSectors 的返回值。 */
function wheelWinnerIndex(sectors, winnerKey) {
  const arr = Array.isArray(sectors) ? sectors : (sectors && Array.isArray(sectors.sectors) ? sectors.sectors : []);
  return arr.findIndex((s) => s.key === winnerKey);
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
 * 151 梦幻不进池（仍走道馆四关全通）；权重：传说每只 2（组 8）、伊布组 12、终极组 80，组内均匀。 */
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
export function rareCardHallPool() {
  return [
    { no: 151, group: 'mew' },
    ...[...RARE_WHEEL_LEGENDARIES].sort((a, b) => a - b).map((no) => ({ no, group: 'legendary' })),
    ...[...RARE_WHEEL_EEVEE].sort((a, b) => a - b).map((no) => ({ no, group: 'eevee' })),
    ...[...RARE_WHEEL_FINALS].sort((a, b) => a - b).map((no) => ({ no, group: 'final' })),
  ];
}

/* 卡面招式（任务 104 v2）：每卡最多 2 条 {name, power, type}，供珍稀卡牌馆卡面展示。
 * 口径：COLLECTION_MOVES（2 条原创招式带威力）→ COLLECTION_LEARNSET（取等级最高的 2 条，
 * 威力 25 + 6*学会等级，与图鉴详情同款公式）→ 主宠线 LINES（取等级最高的 2 条，同公式）→ 无则 []。
 * 威力口径（任务 116）：名册招式优先取官方威力 officialPower（原版数值），原创招式名无官方
 * 威力时保留名册值（fallback）；其余两路仍用公式威力。战斗结算不吃这组威力。
 * 招式属性：officialMove 有则取其 type，否则取主属性。三张表都没有的种返回 []，与图鉴详情招式为空
 * 一致，不编招式。（2026-11-14 全量 151 批：传说 144/145/146/150、45 霸王花、125 电击兽
 * 已进收藏名册，COLLECTION_MOVES＋COLLECTION_LEARNSET 均有招式，不再返回 []。） */
export function cardFaceMoves(no) {
  const id = Number(no);
  const mainType = ((DEX_DETAILS[id] || {}).types || [])[0] || '';
  const withType = (name, power) => {
    const type = officialMove(name)?.type || mainType;
    return type ? { name, power, type } : { name, power };
  };
  const cm = COLLECTION_MOVES[id];
  if (Array.isArray(cm) && cm.length) {
    return cm.slice(0, 2).map(([name, appPower]) => withType(name, officialPower(name) ?? appPower));
  }
  const cl = COLLECTION_LEARNSET[id];
  if (Array.isArray(cl) && cl.length) {
    return [...cl]
      .sort((a, b) => a[0] - b[0])
      .slice(-2)
      .map(([lv, name]) => withType(name, 25 + 6 * lv));
  }
  for (const line of Object.values(LINES || {})) {
    const forms = line?.forms;
    if (!Array.isArray(forms)) continue;
    const hit = forms.some((f) => (typeof f === 'object' ? f?.no : f) === id);
    if (hit && Array.isArray(line.moves) && line.moves.length) {
      return [...line.moves]
        .sort((a, b) => a[0] - b[0])
        .slice(-2)
        .map(([lv, name]) => withType(name, 25 + 6 * lv));
    }
  }
  return [];
}
/* 稀有转盘掷骰（纯函数）：返回 {group: 'legendary'|'eevee'|'final', species} 或 null（全池为空禁转）。
 * ownedSpecies/ownedEggSpecies：已拥有（图鉴＋未孵化蛋）的物种集合，去重后组内均匀；
 * 组内可用为空时该组权重归零、其余组归一化；三组全空返回 null。 */
function rollRareWheelPrize(rng = Math.random, ownedSpecies = new Set(), ownedEggSpecies = new Set()) {
  const owned = new Set([...(ownedSpecies || []), ...(ownedEggSpecies || [])]);
  const groups = [
    { group: 'legendary', pool: RARE_WHEEL_LEGENDARIES.filter((n) => !owned.has(n)), weight: 8 },
    { group: 'eevee', pool: RARE_WHEEL_EEVEE.filter((n) => !owned.has(n)), weight: 12 },
    { group: 'final', pool: RARE_WHEEL_FINALS.filter((n) => !owned.has(n)), weight: 80 },
  ].filter((g) => g.pool.length > 0);
  const total = groups.reduce((a, g) => a + g.weight, 0);
  if (total <= 0) return null;
  const g = weightedPick(groups, rng, (x) => x.weight);
  if (g) {
    const species = g.pool[Math.floor(rollRng(rng) * g.pool.length) % g.pool.length];
    return { group: g.group, species };
  }
  return null;
}
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
/* 稀有奖品对应的扇区 key：传说按物种、伊布组/终极组按组。 */
function rareSectorKeyFor(prize) {
  if (!prize) return null;
  if (prize.group === 'legendary') return `legendary:${prize.species}`;
  return prize.group;
}
/* 单元测试中奖率（纯函数）：分数段 → 中奖概率；低于 85 为 0 */
function unitTestWinChance(score) {
  if (score >= 95) return 0.60;
  if (score >= 90) return 0.50;
  if (score >= 85) return 0.40;
  return 0;
}
/* 单元测试奖品掷骰（纯函数）：返回 {kind:'stone'|'ball'|'egg'|'none', key|species}。
 * 权重按设计稿 §2.5；去重后同细分档归一化，整档为空时其权重转未中奖（'none'）；
 * 伊布始终符合，主宠蛋档永不为空。ownedEggs：主宠/稀有蛋的已获得集合（伊布除外，永符合）。 */
function rollUnitTestPrize(rng = Math.random, ownedMainEggs = new Set(), ownedRareEggs = new Set(), ownedStones = new Set()) {
  const availCommon = UNIT_TEST_STONES_COMMON.filter((s) => !ownedStones.has(s));
  const availRare = UNIT_TEST_STONES_RARE.filter((s) => !ownedStones.has(s));
  const availMain = UNIT_TEST_EGG_MAIN.filter((no) => no === 133 || !ownedMainEggs.has(no));
  const availRareEggs = UNIT_TEST_EGG_RARE.filter((no) => !ownedRareEggs.has(no));
  const wStoneCommon = availCommon.length ? UNIT_TEST_PRIZE.stoneCommon : 0;
  const wStoneRare = availRare.length ? UNIT_TEST_PRIZE.stoneRare : 0;
  const wBall = UNIT_TEST_PRIZE.ball;
  const wEggMain = availMain.length ? UNIT_TEST_PRIZE.egg * UNIT_TEST_PRIZE.eggMainShare : 0;
  const wEggRare = availRareEggs.length ? UNIT_TEST_PRIZE.egg * (1 - UNIT_TEST_PRIZE.eggMainShare) : 0;
  const total = wStoneCommon + wStoneRare + wBall + wEggMain + wEggRare;
  if (total <= 0) return { kind: 'none' };
  let r = rollRng(rng) * total;
  const pick = (arr) => arr[Math.floor(rollRng(rng) * arr.length) % arr.length];
  if ((r -= wStoneCommon) < 0) return { kind: 'stone', key: pick(availCommon) };
  if ((r -= wStoneRare) < 0) return { kind: 'stone', key: pick(availRare) };
  if ((r -= wBall) < 0) {
    return rollRng(rng) < UNIT_TEST_PRIZE.ballSuperShare
      ? { kind: 'ball', key: 'ball:super' } : { kind: 'ball', key: 'ball:hyper' };
  }
  if ((r -= wEggMain) < 0) { const no = pick(availMain); return { kind: 'egg', key: `egg:${no}`, species: no }; }
  if ((r -= wEggRare) < 0) { const no = pick(availRareEggs); return { kind: 'egg', key: `egg:${no}`, species: no }; }
  return { kind: 'none' };
}

/* 道馆闯关梯子：4 关逐个解锁；首通发该关 species 封印蛋 + 点亮徽章；
 * 四关全通另发梦幻(151)封印蛋作终奖。馆主 HP 按各关 hpMult 加成（玩家可带 2 只）。
 * 馆主招式按招式名定属性（[名称, 属性, 威力]），不再一律用馆主物种属性——
 * 否则如大岩蛇的「大地重压」本应是地面系（克电 ×2）却按岩石计，克制永不触发。
 * 难度参数（bossLevel/hpMult/招式威力）由蒙特卡洛模拟定参（scripts/battle-balance-sim.mjs，
 * 每组 5000 场、玩家用最高威力招式），结论见 DEPLOY.md 第 11 节「2026-10-20 验收调参」。 */
const BOSS_HP_MULT = 1.4; // 兜底默认，各关以 GYM_STAGES.hpMult 为准
/* 等比换算（2026-10-27 用户定，分关实施）：玩家有效等级 = App 等级 × 2.25（App 16 级 = 官方 36 级），
 * 向下取整；馆主有效等级 = App 馆主等级 × 本关系数，向下取整。公式（statsFor / 伤害）本身不动。
 * 2026-10-28 收紧实施：馆主系数 S1 2.33（官方比对齐）、S2 1.7、S3 1.7、S4 1.85；S4 hpMult 2.7。2026-11-07 S4 收紧：hpMult 2.7→4.0（天气晴天后小宝 S4 81.75% 压回 38.05%，大宝 92.25%；唯一满足双断言的单旋钮值，两端余量均不足 0.5%，后续改动须重测）。
 * 形态与招式解锁仍按 App 等级（lineFormNo / effectiveMoves 不走有效等级）。 */
const PLAYER_SCALE = 2.25;
const BOSS_SCALE = { 1: 2.33, 2: 1.7, 3: 1.7, 4: 1.85, 5: 1.85, 6: 1.85 }; // 2026-10-28 收紧实施：S1 2.33 为官方比对齐，S2 1.7、S3 1.7、S4 1.85；2026-11-08 新增 S5/S6 1.85
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

// 关都图鉴展示口径：皮丘 172、咩利羊 179 仍在原分册展示，但不计入进度。
const POKEDEX_TOTAL = 151;
const petImg = (no) => `/static/img/p${no}.b45abbc0.webp`;

function ownedDexNos(entryKeys, currentLine) {
  const owned = new Set();
  for (const key of entryKeys) {
    let no;
    const form = /^form:([^:]+):([1-3])$/.exec(key);
    if (form) {
      if (form[1] !== currentLine) continue;
      no = LINES[currentLine]?.forms?.[Number(form[2]) - 1]?.no;
    } else {
      const species = /^(?:wild|egg|rare|gym):(\d+)$/.exec(key);
      if (!species) continue;
      no = Number(species[1]);
    }
    if (Number.isInteger(no) && no >= 1 && no <= POKEDEX_TOTAL) owned.add(no);
  }
  return [...owned].sort((a, b) => a - b);
}

function dex151Progress(entryKeys, currentLine) {
  const owned = ownedDexNos(entryKeys, currentLine).length;
  return { owned, total: POKEDEX_TOTAL, pct: Math.round(owned / POKEDEX_TOTAL * 100) };
}

const FORM_LEVELS = [1, 5, 10, 16]; // 形态解锁等级：蛋 / 一阶 / 二阶 / 最终（v11：最终由 15 改为 16）
const PIN_LOCK_MAX = 5;
const PIN_LOCK_SECS = 300;
const PIN_SESSION_SECS = 7200; // PIN 验证有效期 2 小时

/* 问答去重（迁移 0004）：答对过的题在窗口天数内不再出（settings quiz_repeat_days 可调，默认 30）；
 * 答错过的题间隔 QUIZ_WRONG_GAP_DAYS 天后（即第 4 天起）可重出复习；从未答过的优先；
 * 池子不足时按「最久未出现」放宽补齐，保证每天有题。 */
const QUIZ_CORRECT_WINDOW_DAYS = 30;
const QUIZ_WRONG_GAP_DAYS = 3;

/* 拍照上传：每科 ≤3 张，单张字节上限（前端压缩目标 ≈300KB，这里留足余量） */
const PHOTO_MAX_PER_CHECKIN = 3;
const PHOTO_MAX_BYTES = 900 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const COPYRIGHT = '宝可梦立绘来源于 PokeAPI 公开镜像，仅供本家庭内部使用，不得分发、不得公开发布。';

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

function shTimeHM(date = nowDate()) {
  const p = shParts(date);
  const h = p.hour === '24' ? '00' : p.hour;
  return `${h}:${p.minute}`;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
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

const DEBUG_LEVEL_MIN = 1, DEBUG_LEVEL_MAX = 30;
const DEBUG_XP_MAX = 17400;
const DEBUG_BALLS_MAX = 99;
const DEBUG_FRAGMENTS_MAX = 999;
const DEBUG_STREAK_MAX = 365;

/* 调试用：某线在某等级下的全部招式，附学会状态（learned=随等级学会，early=已解锁但未到等级）。
 * learned 与 early 不会同时为真（已解锁只记录尚未随等级学会的招）。 */
function debugMovesFor(lineKey, level, unlockedNames = []) {
  const learned = new Set(learnedMoves(lineKey, level).map((m) => m[1]));
  const un = new Set(unlockedNames || []);
  return LINES[lineKey].moves.map(([lv, name, desc]) => ({
    level: lv, name, desc,
    learned: learned.has(name),
    early: !learned.has(name) && un.has(name),
  }));
}

function earlyBefore(cutoffHM, nowHM) {
  return nowHM < cutoffHM; // 字符串比较，HH:MM 零填充可直接比
}

/* __DIAG_GRAPH_BEGIN__ （由 work/gen-diag-graph.mjs 生成，勿手改） */
const MATH_PREREQ_G1G3 = {"meta":{"source":"cn-math-taxonomy data/dependencies.json + data/topics.json（AI 初稿、未经教师审核，仅决定查哪条链）","generated":"2026-10-26","counts":{"topicsTriggerable":77,"topicsTotal":137,"edges":163,"hard":150,"soft":13}},"topics":[{"id":"cnm_p001","name":"1到5各数的认识","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p002","name":"5以内数的大小","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p003","name":"几和第几","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p004","name":"5以内数的分与合","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p005","name":"0的认识","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p006","name":"5以内的加法","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p007","name":"5以内的减法","chapter":"一年级上册 第1单元 5以内数的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p008","name":"6到10各数的认识","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p009","name":"10以内数的比较","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p010","name":"10以内的加法","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p011","name":"10以内的减法","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p012","name":"连加和连减","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p013","name":"10以内加减混合","chapter":"一年级上册 第2单元 6到10的认识和加、减法","grade":1,"inScope":true},{"id":"cnm_p014","name":"认识长方体、正方体、圆柱和球","chapter":"一年级上册 第3单元 认识立体图形","grade":1,"inScope":true},{"id":"cnm_p015","name":"上下前后左右","chapter":"一年级上册 综合与实践 我的教室","grade":1,"inScope":true},{"id":"cnm_p016","name":"11到20各数的认识","chapter":"一年级上册 第4单元 11到20的认识","grade":1,"inScope":true},{"id":"cnm_p017","name":"十位和个位","chapter":"一年级上册 第4单元 11到20的认识","grade":1,"inScope":true},{"id":"cnm_p018","name":"20以内不进位加法","chapter":"一年级上册 第4单元 11到20的认识","grade":1,"inScope":true},{"id":"cnm_p019","name":"凑十法","chapter":"一年级上册 第5单元 20以内的进位加法","grade":1,"inScope":true},{"id":"cnm_p020","name":"9加几","chapter":"一年级上册 第5单元 20以内的进位加法","grade":1,"inScope":true},{"id":"cnm_p021","name":"8、7、6加几","chapter":"一年级上册 第5单元 20以内的进位加法","grade":1,"inScope":true},{"id":"cnm_p022","name":"用数介绍和简单分类","chapter":"一年级上册 综合与实践 数学游戏分享","grade":1,"inScope":true},{"id":"cnm_p023","name":"认识长方形、正方形、三角形和圆","chapter":"一年级下册 第1单元 认识平面图形","grade":1,"inScope":true},{"id":"cnm_p024","name":"平面图形的拼组","chapter":"一年级下册 第1单元 认识平面图形","grade":1,"inScope":true},{"id":"cnm_p025","name":"十几减9","chapter":"一年级下册 第2单元 20以内的退位减法","grade":1,"inScope":true},{"id":"cnm_p026","name":"十几减8、7、6","chapter":"一年级下册 第2单元 20以内的退位减法","grade":1,"inScope":true},{"id":"cnm_p027","name":"十几减5、4、3、2","chapter":"一年级下册 第2单元 20以内的退位减法","grade":1,"inScope":true},{"id":"cnm_p028","name":"100以内数的认识","chapter":"一年级下册 第3单元 100以内数的认识","grade":1,"inScope":true},{"id":"cnm_p029","name":"100以内数的大小","chapter":"一年级下册 第3单元 100以内数的认识","grade":1,"inScope":true},{"id":"cnm_p030","name":"整十数的加减","chapter":"一年级下册 第3单元 100以内数的认识","grade":1,"inScope":true},{"id":"cnm_p031","name":"100以内口算加法","chapter":"一年级下册 第4单元 100以内的口算加、减法","grade":1,"inScope":true},{"id":"cnm_p032","name":"100以内口算减法","chapter":"一年级下册 第4单元 100以内的口算加、减法","grade":1,"inScope":true},{"id":"cnm_p033","name":"100以内笔算加法","chapter":"一年级下册 第5单元 100以内的笔算加、减法","grade":1,"inScope":true},{"id":"cnm_p034","name":"100以内笔算减法","chapter":"一年级下册 第5单元 100以内的笔算加、减法","grade":1,"inScope":true},{"id":"cnm_p035","name":"部分与总数","chapter":"一年级下册 第6单元 数量间的加减关系","grade":1,"inScope":true},{"id":"cnm_p217","name":"求两数相差几","chapter":"一年级下册 第6单元 数量间的加减关系","grade":1,"inScope":true},{"id":"cnm_p218","name":"求比一个数多（少）几的数","chapter":"一年级下册 第6单元 数量间的加减关系","grade":1,"inScope":true},{"id":"cnm_p036","name":"认识人民币","chapter":"一年级下册 综合与实践 欢乐购物街","grade":1,"inScope":true},{"id":"cnm_p037","name":"分类与整理","chapter":"二年级上册 第1单元 分类与整理","grade":2,"inScope":false},{"id":"cnm_p038","name":"乘法的意义","chapter":"二年级上册 第2单元 1到6的表内乘法","grade":2,"inScope":false},{"id":"cnm_p039","name":"2到6的乘法口诀","chapter":"二年级上册 第2单元 1到6的表内乘法","grade":2,"inScope":false},{"id":"cnm_p057","name":"乘加乘减的运算顺序","chapter":"二年级上册 第2单元 1到6的表内乘法","grade":2,"inScope":false},{"id":"cnm_p043","name":"除法的意义","chapter":"二年级上册 第3单元 1到6的表内除法","grade":2,"inScope":false},{"id":"cnm_p049","name":"东、南、西、北","chapter":"二年级上册 综合与实践 校园小导游","grade":2,"inScope":false},{"id":"cnm_p040","name":"认识厘米","chapter":"二年级上册 第4单元 厘米和米","grade":2,"inScope":false},{"id":"cnm_p041","name":"认识米","chapter":"二年级上册 第4单元 厘米和米","grade":2,"inScope":false},{"id":"cnm_p042","name":"7、8、9的乘法口诀","chapter":"二年级上册 第5单元 7到9的表内乘、除法","grade":2,"inScope":false},{"id":"cnm_p044","name":"用7、8、9的口诀求商","chapter":"二年级上册 第5单元 7到9的表内乘、除法","grade":2,"inScope":false},{"id":"cnm_p061","name":"秒的认识","chapter":"二年级下册 综合与实践 时间在哪里","grade":2,"inScope":false},{"id":"cnm_p062","name":"时、分、秒的进率","chapter":"二年级下册 综合与实践 时间在哪里","grade":2,"inScope":false},{"id":"cnm_p063","name":"经过时间","chapter":"二年级下册 综合与实践 时间在哪里","grade":2,"inScope":false},{"id":"cnm_p219","name":"数量间的乘除关系","chapter":"二年级下册 第2单元 数量间的乘除关系","grade":2,"inScope":false},{"id":"cnm_p053","name":"万以内数的认识","chapter":"二年级下册 第3单元 万以内数的认识","grade":2,"inScope":false},{"id":"cnm_p054","name":"万以内数的大小比较","chapter":"二年级下册 第3单元 万以内数的认识","grade":2,"inScope":false},{"id":"cnm_p064","name":"几百几十的口算加法","chapter":"二年级下册 第4单元 万以内的加法和减法","grade":2,"inScope":false},{"id":"cnm_p065","name":"几百几十的口算减法","chapter":"二年级下册 第4单元 万以内的加法和减法","grade":2,"inScope":false},{"id":"cnm_p071","name":"三位数加法笔算","chapter":"二年级下册 第4单元 万以内的加法和减法","grade":2,"inScope":false},{"id":"cnm_p220","name":"加减法各部分间的关系","chapter":"二年级下册 第4单元 万以内的加法和减法","grade":2,"inScope":false},{"id":"cnm_p060","name":"简单的变化规律","chapter":"二年级下册 第5单元 复习与关联","grade":2,"inScope":false},{"id":"cnm_p221","name":"观察简单的立体积木","chapter":"三年级上册 第1单元 观察物体","grade":3,"inScope":true},{"id":"cnm_p222","name":"长方体纸盒的展开图","chapter":"三年级上册 第1单元 观察物体","grade":3,"inScope":true},{"id":"cnm_p223","name":"同级运算与两级运算的运算顺序","chapter":"三年级上册 第2单元 混合运算","grade":3,"inScope":true},{"id":"cnm_p058","name":"带小括号的两步运算","chapter":"三年级上册 第2单元 混合运算","grade":3,"inScope":true},{"id":"cnm_p059","name":"两步加减应用","chapter":"三年级上册 第2单元 混合运算","grade":3,"inScope":true},{"id":"cnm_p067","name":"毫米","chapter":"三年级上册 第3单元 毫米、分米和千米","grade":3,"inScope":true},{"id":"cnm_p068","name":"分米","chapter":"三年级上册 第3单元 毫米、分米和千米","grade":3,"inScope":true},{"id":"cnm_p069","name":"千米","chapter":"三年级上册 第3单元 毫米、分米和千米","grade":3,"inScope":true},{"id":"cnm_p056","name":"克和千克","chapter":"三年级上册 综合与实践 曹冲称象的故事","grade":3,"inScope":true},{"id":"cnm_p070","name":"吨的认识","chapter":"三年级上册 综合与实践 曹冲称象的故事","grade":3,"inScope":true},{"id":"cnm_p224","name":"等量代换（曹冲称象）","chapter":"三年级上册 综合与实践 曹冲称象的故事","grade":3,"inScope":true},{"id":"cnm_p074","name":"多位数乘一位数","chapter":"三年级上册 第4单元 多位数乘一位数","grade":3,"inScope":true},{"id":"cnm_p075","name":"因数中间或末尾有 0 的乘法","chapter":"三年级上册 第4单元 多位数乘一位数","grade":3,"inScope":true},{"id":"cnm_p076","name":"数字编码","chapter":"三年级上册 综合与实践 数字编码","grade":3,"inScope":true},{"id":"cnm_p099","name":"线段、直线和射线","chapter":"三年级上册 第5单元 线和角","grade":3,"inScope":true},{"id":"cnm_p225","name":"角的认识","chapter":"三年级上册 第5单元 线和角","grade":3,"inScope":true},{"id":"cnm_p101","name":"锐角、直角和钝角","chapter":"三年级上册 第5单元 线和角","grade":3,"inScope":true},{"id":"cnm_p079","name":"几分之一","chapter":"三年级上册 第6单元 分数的初步认识","grade":3,"inScope":true},{"id":"cnm_p226","name":"几分之几","chapter":"三年级上册 第6单元 分数的初步认识","grade":3,"inScope":true},{"id":"cnm_p227","name":"简单的分数大小比较","chapter":"三年级上册 第6单元 分数的初步认识","grade":3,"inScope":true},{"id":"cnm_p080","name":"同分母分数的初步加减","chapter":"三年级上册 第6单元 分数的初步认识","grade":3,"inScope":true},{"id":"cnm_p073","name":"倍的认识","chapter":"三年级上册 第7单元 复习与关联","grade":3,"inScope":true},{"id":"cnm_p081","name":"集合图里的重叠","chapter":"三年级上册 第7单元 复习与关联","grade":3,"inScope":true},{"id":"cnm_p095","name":"简单的搭配","chapter":"三年级上册 第8单元 数学广角——搭配问题","grade":3,"inScope":true},{"id":"cnm_p228","name":"生活中的运动现象","chapter":"三年级下册 第1单元 生活中的运动现象","grade":3,"inScope":true},{"id":"cnm_p083","name":"除数是一位数的除法","chapter":"三年级下册 第2单元 除数是一位数的除法","grade":3,"inScope":true},{"id":"cnm_p084","name":"除法解决实际问题","chapter":"三年级下册 第2单元 除数是一位数的除法","grade":3,"inScope":true},{"id":"cnm_p229","name":"多边形的认识","chapter":"三年级下册 第3单元 长方形和正方形","grade":3,"inScope":true},{"id":"cnm_p077","name":"长方形和正方形的特征","chapter":"三年级下册 第3单元 长方形和正方形","grade":3,"inScope":true},{"id":"cnm_p078","name":"长方形和正方形的周长","chapter":"三年级下册 第3单元 长方形和正方形","grade":3,"inScope":true},{"id":"cnm_p088","name":"面积的意义","chapter":"三年级下册 第4单元 图形的面积","grade":3,"inScope":true},{"id":"cnm_p089","name":"长方形和正方形的面积","chapter":"三年级下册 第4单元 图形的面积","grade":3,"inScope":true},{"id":"cnm_p090","name":"面积单位的换算","chapter":"三年级下册 第4单元 图形的面积","grade":3,"inScope":true},{"id":"cnm_p085","name":"复式统计表","chapter":"三年级下册 第5单元 数据的收集与整理","grade":3,"inScope":true},{"id":"cnm_p091","name":"年、月、日","chapter":"三年级下册 综合与实践 年、月、日的秘密","grade":3,"inScope":true},{"id":"cnm_p092","name":"24时记时法","chapter":"三年级下册 综合与实践 年、月、日的秘密","grade":3,"inScope":true},{"id":"cnm_p093","name":"一位小数的初步认识","chapter":"三年级下册 第6单元 小数的初步认识","grade":3,"inScope":true},{"id":"cnm_p094","name":"一位小数的加减","chapter":"三年级下册 第6单元 小数的初步认识","grade":3,"inScope":true},{"id":"cnm_p082","name":"东北、东南、西北、西南","chapter":"三年级下册 第7单元 复习与关联","grade":3,"inScope":true},{"id":"cnm_p100","name":"角的度量","chapter":"四年级上册 第2单元 角的度量","grade":4,"inScope":false},{"id":"cnm_p232","name":"平角、周角和角的分类","chapter":"四年级上册 第2单元 角的度量","grade":4,"inScope":false},{"id":"cnm_p086","name":"两位数乘两位数","chapter":"四年级上册 第3单元 多位数乘两位数","grade":4,"inScope":false},{"id":"cnm_p111","name":"常见数量关系","chapter":"四年级上册 第4单元 加法模型和乘法模型","grade":4,"inScope":false},{"id":"cnm_p103","name":"垂直","chapter":"四年级上册 第5单元 平行四边形和梯形","grade":4,"inScope":false},{"id":"cnm_p108","name":"条形统计图","chapter":"四年级上册 第6单元 条形统计图","grade":4,"inScope":false},{"id":"cnm_p109","name":"简单的优化","chapter":"四年级上册 第7单元 复习与关联","grade":4,"inScope":false},{"id":"cnm_p110","name":"四则运算各部分间的关系","chapter":"四年级下册 第1单元 四则运算","grade":4,"inScope":false},{"id":"cnm_p113","name":"从不同方向观察物体","chapter":"四年级下册 第2单元 观察物体（二）","grade":4,"inScope":false},{"id":"cnm_p118","name":"小数的意义","chapter":"四年级下册 第4单元 小数的意义和性质","grade":4,"inScope":false},{"id":"cnm_p119","name":"比较小数的大小","chapter":"四年级下册 第4单元 小数的意义和性质","grade":4,"inScope":false},{"id":"cnm_p125","name":"小数加减法","chapter":"四年级下册 第6单元 小数的加法和减法","grade":4,"inScope":false},{"id":"cnm_p127","name":"轴对称","chapter":"四年级下册 第7单元 图形的运动（二）","grade":4,"inScope":false},{"id":"cnm_p106","name":"除数是两位数的除法","chapter":"四年级下册 第9单元 除数是两位数的除法","grade":4,"inScope":false},{"id":"cnm_p237","name":"观察简单组合体","chapter":"五年级上册 第1单元 观察简单组合体","grade":5,"inScope":false},{"id":"cnm_p132","name":"小数乘整数","chapter":"五年级上册 第2单元 小数乘法","grade":5,"inScope":false},{"id":"cnm_p098","name":"公顷和平方千米","chapter":"五年级上册 第6单元 多边形的面积","grade":5,"inScope":false},{"id":"cnm_p147","name":"平行四边形的面积","chapter":"五年级上册 第6单元 多边形的面积","grade":5,"inScope":false},{"id":"cnm_p151","name":"植树问题","chapter":"五年级上册 第8单元 复习与关联","grade":5,"inScope":false},{"id":"cnm_p160","name":"长方体和正方体的认识","chapter":"五年级下册 第3单元 长方体和正方体","grade":5,"inScope":false},{"id":"cnm_p161","name":"长方体的表面积","chapter":"五年级下册 第3单元 长方体和正方体","grade":5,"inScope":false},{"id":"cnm_p162","name":"体积单位","chapter":"五年级下册 第3单元 长方体和正方体","grade":5,"inScope":false},{"id":"cnm_p165","name":"分数的意义","chapter":"五年级下册 第4单元 分数的意义和性质","grade":5,"inScope":false},{"id":"cnm_p173","name":"异分母分数加减","chapter":"五年级下册 第6单元 分数的加法和减法","grade":5,"inScope":false},{"id":"cnm_p174","name":"分数加减混合","chapter":"五年级下册 第6单元 分数的加法和减法","grade":5,"inScope":false},{"id":"cnm_p136","name":"用数对确定位置","chapter":"六年级上册 第1单元 确定位置","grade":6,"inScope":false},{"id":"cnm_p180","name":"根据方向和距离确定位置","chapter":"六年级上册 第1单元 确定位置","grade":6,"inScope":false},{"id":"cnm_p188","name":"圆的认识","chapter":"六年级上册 第4单元 圆","grade":6,"inScope":false},{"id":"cnm_p192","name":"圆的面积","chapter":"六年级上册 第4单元 圆","grade":6,"inScope":false},{"id":"cnm_p193","name":"扇形的认识","chapter":"六年级上册 第4单元 圆","grade":6,"inScope":false},{"id":"cnm_p200","name":"数与形","chapter":"六年级下册 第6单元 整理和复习","grade":6,"inScope":false},{"id":"cnm_051","name":"从不同方向看与立体图形的展开图","chapter":"七上 第六章 几何图形初步 6.1.1","grade":7,"inScope":false},{"id":"cnm_053","name":"直线、射线、线段","chapter":"七上 第六章 几何图形初步 6.2.1","grade":7,"inScope":false},{"id":"cnm_056","name":"角的概念与表示","chapter":"七上 第六章 几何图形初步 6.3.1","grade":7,"inScope":false},{"id":"cnm_102","name":"全面调查与抽样调查","chapter":"七下 第十二章 数据的收集、整理与描述 12.1.1","grade":7,"inScope":false},{"id":"cnm_106","name":"频数分布表与数据分组","chapter":"七下 第十二章 数据的收集、整理与描述 12.2.2","grade":7,"inScope":false},{"id":"cnm_131","name":"轴对称图形与两个图形成轴对称","chapter":"八上 第十五章 轴对称 15.1","grade":8,"inScope":false},{"id":"cnm_148","name":"完全平方公式","chapter":"八上 第十六章 整式的乘法 16.3","grade":8,"inScope":false},{"id":"cnm_h230","name":"分类加法计数原理","chapter":"选必三 第六章 计数原理 6.1","grade":14,"inScope":false}],"edges":[{"topicId":"cnm_p002","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「5以内数的大小」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p003","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「几和第几」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p004","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「5以内数的分与合」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p005","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「0的认识」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p006","prerequisiteId":"cnm_p004","strength":"hard","reason":"学习「5以内的加法」需要先掌握「5以内数的分与合」。"},{"topicId":"cnm_p007","prerequisiteId":"cnm_p006","strength":"hard","reason":"学习「5以内的减法」需要先掌握「5以内的加法」。"},{"topicId":"cnm_p008","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「6到10各数的认识」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p009","prerequisiteId":"cnm_p008","strength":"hard","reason":"学习「10以内数的比较」需要先掌握「6到10各数的认识」。"},{"topicId":"cnm_p009","prerequisiteId":"cnm_p002","strength":"hard","reason":"学习「10以内数的比较」需要先掌握「5以内数的大小」。"},{"topicId":"cnm_p010","prerequisiteId":"cnm_p006","strength":"hard","reason":"学习「10以内的加法」需要先掌握「5以内的加法」。"},{"topicId":"cnm_p010","prerequisiteId":"cnm_p008","strength":"hard","reason":"学习「10以内的加法」需要先掌握「6到10各数的认识」。"},{"topicId":"cnm_p011","prerequisiteId":"cnm_p007","strength":"hard","reason":"学习「10以内的减法」需要先掌握「5以内的减法」。"},{"topicId":"cnm_p011","prerequisiteId":"cnm_p010","strength":"hard","reason":"学习「10以内的减法」需要先掌握「10以内的加法」。"},{"topicId":"cnm_p012","prerequisiteId":"cnm_p011","strength":"hard","reason":"学习「连加和连减」需要先掌握「10以内的减法」。"},{"topicId":"cnm_p013","prerequisiteId":"cnm_p012","strength":"hard","reason":"学习「10以内加减混合」需要先掌握「连加和连减」。"},{"topicId":"cnm_p014","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「认识长方体、正方体、圆柱和球」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p015","prerequisiteId":"cnm_p001","strength":"hard","reason":"学习「上下前后左右」需要先掌握「1到5各数的认识」。"},{"topicId":"cnm_p016","prerequisiteId":"cnm_p008","strength":"hard","reason":"学习「11到20各数的认识」需要先掌握「6到10各数的认识」。"},{"topicId":"cnm_p017","prerequisiteId":"cnm_p016","strength":"hard","reason":"学习「十位和个位」需要先掌握「11到20各数的认识」。"},{"topicId":"cnm_p018","prerequisiteId":"cnm_p017","strength":"hard","reason":"学习「20以内不进位加法」需要先掌握「十位和个位」。"},{"topicId":"cnm_p018","prerequisiteId":"cnm_p010","strength":"hard","reason":"学习「20以内不进位加法」需要先掌握「10以内的加法」。"},{"topicId":"cnm_p019","prerequisiteId":"cnm_p010","strength":"hard","reason":"学习「凑十法」需要先掌握「10以内的加法」。"},{"topicId":"cnm_p020","prerequisiteId":"cnm_p019","strength":"hard","reason":"学习「9加几」需要先掌握「凑十法」。"},{"topicId":"cnm_p021","prerequisiteId":"cnm_p020","strength":"hard","reason":"学习「8、7、6加几」需要先掌握「9加几」。"},{"topicId":"cnm_p022","prerequisiteId":"cnm_p008","strength":"hard","reason":"学习「用数介绍和简单分类」需要先掌握「6到10各数的认识」。"},{"topicId":"cnm_p023","prerequisiteId":"cnm_p014","strength":"hard","reason":"学习「认识长方形、正方形、三角形和圆」需要先掌握「认识长方体、正方体、圆柱和球」。"},{"topicId":"cnm_p024","prerequisiteId":"cnm_p023","strength":"hard","reason":"学习「平面图形的拼组」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p025","prerequisiteId":"cnm_p020","strength":"hard","reason":"学习「十几减9」需要先掌握「9加几」。"},{"topicId":"cnm_p026","prerequisiteId":"cnm_p025","strength":"hard","reason":"学习「十几减8、7、6」需要先掌握「十几减9」。"},{"topicId":"cnm_p026","prerequisiteId":"cnm_p021","strength":"hard","reason":"学习「十几减8、7、6」需要先掌握「8、7、6加几」。"},{"topicId":"cnm_p027","prerequisiteId":"cnm_p026","strength":"hard","reason":"学习「十几减5、4、3、2」需要先掌握「十几减8、7、6」。"},{"topicId":"cnm_p028","prerequisiteId":"cnm_p016","strength":"hard","reason":"学习「100以内数的认识」需要先掌握「11到20各数的认识」。"},{"topicId":"cnm_p029","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「100以内数的大小」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p029","prerequisiteId":"cnm_p009","strength":"hard","reason":"学习「100以内数的大小」需要先掌握「10以内数的比较」。"},{"topicId":"cnm_p030","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「整十数的加减」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p030","prerequisiteId":"cnm_p010","strength":"hard","reason":"学习「整十数的加减」需要先掌握「10以内的加法」。"},{"topicId":"cnm_p031","prerequisiteId":"cnm_p030","strength":"hard","reason":"学习「100以内口算加法」需要先掌握「整十数的加减」。"},{"topicId":"cnm_p031","prerequisiteId":"cnm_p021","strength":"hard","reason":"学习「100以内口算加法」需要先掌握「8、7、6加几」。"},{"topicId":"cnm_p032","prerequisiteId":"cnm_p031","strength":"hard","reason":"学习「100以内口算减法」需要先掌握「100以内口算加法」。"},{"topicId":"cnm_p032","prerequisiteId":"cnm_p027","strength":"hard","reason":"学习「100以内口算减法」需要先掌握「十几减5、4、3、2」。"},{"topicId":"cnm_p033","prerequisiteId":"cnm_p031","strength":"hard","reason":"学习「100以内笔算加法」需要先掌握「100以内口算加法」。"},{"topicId":"cnm_p034","prerequisiteId":"cnm_p032","strength":"hard","reason":"学习「100以内笔算减法」需要先掌握「100以内口算减法」。"},{"topicId":"cnm_p034","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「100以内笔算减法」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p035","prerequisiteId":"cnm_p034","strength":"hard","reason":"学习「部分与总数」需要先掌握「100以内笔算减法」。"},{"topicId":"cnm_p036","prerequisiteId":"cnm_p030","strength":"hard","reason":"学习「认识人民币」需要先掌握「整十数的加减」。"},{"topicId":"cnm_p037","prerequisiteId":"cnm_p022","strength":"hard","reason":"学习「分类与整理」需要先掌握「用数介绍和简单分类」。"},{"topicId":"cnm_p037","prerequisiteId":"cnm_p029","strength":"hard","reason":"学习「分类与整理」需要先掌握「100以内数的大小」。"},{"topicId":"cnm_p038","prerequisiteId":"cnm_p012","strength":"hard","reason":"学习「乘法的意义」需要先掌握「连加和连减」。"},{"topicId":"cnm_p040","prerequisiteId":"cnm_p008","strength":"hard","reason":"学习「认识厘米」需要先掌握「6到10各数的认识」。"},{"topicId":"cnm_p049","prerequisiteId":"cnm_p015","strength":"hard","reason":"学习「东、南、西、北」需要先掌握「上下前后左右」。"},{"topicId":"cnm_p053","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「万以内数的认识」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p054","prerequisiteId":"cnm_p029","strength":"hard","reason":"学习「万以内数的大小比较」需要先掌握「100以内数的大小」。"},{"topicId":"cnm_p056","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「克和千克」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p056","prerequisiteId":"cnm_p041","strength":"hard","reason":"学习「克和千克」需要先掌握「认识米」。"},{"topicId":"cnm_p057","prerequisiteId":"cnm_p031","strength":"hard","reason":"学习「乘加乘减的运算顺序」需要先掌握「100以内口算加法」。"},{"topicId":"cnm_p058","prerequisiteId":"cnm_p057","strength":"hard","reason":"学习「带小括号的两步运算」需要先掌握「乘加乘减的运算顺序」。"},{"topicId":"cnm_p059","prerequisiteId":"cnm_p058","strength":"hard","reason":"学习「两步加减应用」需要先掌握「带小括号的两步运算」。"},{"topicId":"cnm_p059","prerequisiteId":"cnm_p035","strength":"hard","reason":"学习「两步加减应用」需要先掌握「部分与总数」。"},{"topicId":"cnm_p060","prerequisiteId":"cnm_p010","strength":"hard","reason":"学习「简单的变化规律」需要先掌握「10以内的加法」。"},{"topicId":"cnm_p060","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「简单的变化规律」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p061","prerequisiteId":"cnm_p028","strength":"hard","reason":"学习「秒的认识」需要先掌握「100以内数的认识」。"},{"topicId":"cnm_p063","prerequisiteId":"cnm_p032","strength":"hard","reason":"学习「经过时间」需要先掌握「100以内口算减法」。"},{"topicId":"cnm_p064","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「几百几十的口算加法」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p065","prerequisiteId":"cnm_p034","strength":"hard","reason":"学习「几百几十的口算减法」需要先掌握「100以内笔算减法」。"},{"topicId":"cnm_p067","prerequisiteId":"cnm_p040","strength":"hard","reason":"学习「毫米」需要先掌握「认识厘米」。"},{"topicId":"cnm_p068","prerequisiteId":"cnm_p067","strength":"hard","reason":"学习「分米」需要先掌握「毫米」。"},{"topicId":"cnm_p069","prerequisiteId":"cnm_p041","strength":"hard","reason":"学习「千米」需要先掌握「认识米」。"},{"topicId":"cnm_p070","prerequisiteId":"cnm_p056","strength":"hard","reason":"学习「吨的认识」需要先掌握「克和千克」。"},{"topicId":"cnm_p073","prerequisiteId":"cnm_p042","strength":"hard","reason":"学习「倍的认识」需要先掌握「7、8、9的乘法口诀」。"},{"topicId":"cnm_p074","prerequisiteId":"cnm_p042","strength":"hard","reason":"学习「多位数乘一位数」需要先掌握「7、8、9的乘法口诀」。"},{"topicId":"cnm_p074","prerequisiteId":"cnm_p071","strength":"hard","reason":"学习「多位数乘一位数」需要先掌握「三位数加法笔算」。"},{"topicId":"cnm_p075","prerequisiteId":"cnm_p074","strength":"hard","reason":"学习「因数中间或末尾有 0 的乘法」需要先掌握「多位数乘一位数」。"},{"topicId":"cnm_p076","prerequisiteId":"cnm_p053","strength":"hard","reason":"学习「数字编码」需要先掌握「万以内数的认识」。"},{"topicId":"cnm_p077","prerequisiteId":"cnm_p023","strength":"hard","reason":"学习「长方形和正方形的特征」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p078","prerequisiteId":"cnm_p077","strength":"hard","reason":"学习「长方形和正方形的周长」需要先掌握「长方形和正方形的特征」。"},{"topicId":"cnm_p078","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「长方形和正方形的周长」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p079","prerequisiteId":"cnm_p043","strength":"hard","reason":"学习「几分之一」需要先掌握「除法的意义」。"},{"topicId":"cnm_p080","prerequisiteId":"cnm_p079","strength":"hard","reason":"学习「同分母分数的初步加减」需要先掌握「几分之一」。"},{"topicId":"cnm_p081","prerequisiteId":"cnm_p034","strength":"hard","reason":"学习「集合图里的重叠」需要先掌握「100以内笔算减法」。"},{"topicId":"cnm_p082","prerequisiteId":"cnm_p049","strength":"hard","reason":"学习「东北、东南、西北、西南」需要先掌握「东、南、西、北」。"},{"topicId":"cnm_p083","prerequisiteId":"cnm_p044","strength":"hard","reason":"学习「除数是一位数的除法」需要先掌握「用7、8、9的口诀求商」。"},{"topicId":"cnm_p083","prerequisiteId":"cnm_p074","strength":"hard","reason":"学习「除数是一位数的除法」需要先掌握「多位数乘一位数」。"},{"topicId":"cnm_p084","prerequisiteId":"cnm_p083","strength":"hard","reason":"学习「除法解决实际问题」需要先掌握「除数是一位数的除法」。"},{"topicId":"cnm_p085","prerequisiteId":"cnm_p037","strength":"hard","reason":"学习「复式统计表」需要先掌握「分类与整理」。"},{"topicId":"cnm_p085","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「复式统计表」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p086","prerequisiteId":"cnm_p074","strength":"hard","reason":"学习「两位数乘两位数」需要先掌握「多位数乘一位数」。"},{"topicId":"cnm_p088","prerequisiteId":"cnm_p078","strength":"hard","reason":"学习「面积的意义」需要先掌握「长方形和正方形的周长」。"},{"topicId":"cnm_p089","prerequisiteId":"cnm_p088","strength":"hard","reason":"学习「长方形和正方形的面积」需要先掌握「面积的意义」。"},{"topicId":"cnm_p089","prerequisiteId":"cnm_p074","strength":"hard","reason":"学习「长方形和正方形的面积」需要先掌握「多位数乘一位数」。"},{"topicId":"cnm_p090","prerequisiteId":"cnm_p089","strength":"hard","reason":"学习「面积单位的换算」需要先掌握「长方形和正方形的面积」。"},{"topicId":"cnm_p090","prerequisiteId":"cnm_p068","strength":"hard","reason":"学习「面积单位的换算」需要先掌握「分米」。"},{"topicId":"cnm_p091","prerequisiteId":"cnm_p062","strength":"hard","reason":"学习「年、月、日」需要先掌握「时、分、秒的进率」。"},{"topicId":"cnm_p092","prerequisiteId":"cnm_p091","strength":"hard","reason":"学习「24时记时法」需要先掌握「年、月、日」。"},{"topicId":"cnm_p093","prerequisiteId":"cnm_p079","strength":"hard","reason":"学习「一位小数的初步认识」需要先掌握「几分之一」。"},{"topicId":"cnm_p093","prerequisiteId":"cnm_p036","strength":"hard","reason":"学习「一位小数的初步认识」需要先掌握「认识人民币」。"},{"topicId":"cnm_p094","prerequisiteId":"cnm_p093","strength":"hard","reason":"学习「一位小数的加减」需要先掌握「一位小数的初步认识」。"},{"topicId":"cnm_p095","prerequisiteId":"cnm_p039","strength":"hard","reason":"学习「简单的搭配」需要先掌握「2到6的乘法口诀」。"},{"topicId":"cnm_p098","prerequisiteId":"cnm_p090","strength":"hard","reason":"学习「公顷和平方千米」需要先掌握「面积单位的换算」。"},{"topicId":"cnm_p098","prerequisiteId":"cnm_p069","strength":"hard","reason":"学习「公顷和平方千米」需要先掌握「千米」。"},{"topicId":"cnm_p099","prerequisiteId":"cnm_p040","strength":"hard","reason":"学习「线段、直线和射线」需要先掌握「认识厘米」。"},{"topicId":"cnm_p100","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「角的度量」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p103","prerequisiteId":"cnm_p101","strength":"hard","reason":"学习「垂直」需要先掌握「锐角、直角和钝角」。"},{"topicId":"cnm_p106","prerequisiteId":"cnm_p083","strength":"hard","reason":"学习「除数是两位数的除法」需要先掌握「除数是一位数的除法」。"},{"topicId":"cnm_p108","prerequisiteId":"cnm_p085","strength":"hard","reason":"学习「条形统计图」需要先掌握「复式统计表」。"},{"topicId":"cnm_p109","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「简单的优化」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p110","prerequisiteId":"cnm_p059","strength":"hard","reason":"学习「四则运算各部分间的关系」需要先掌握「两步加减应用」。"},{"topicId":"cnm_p111","prerequisiteId":"cnm_p084","strength":"hard","reason":"学习「常见数量关系」需要先掌握「除法解决实际问题」。"},{"topicId":"cnm_p113","prerequisiteId":"cnm_p023","strength":"hard","reason":"学习「从不同方向观察物体」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p118","prerequisiteId":"cnm_p093","strength":"hard","reason":"学习「小数的意义」需要先掌握「一位小数的初步认识」。"},{"topicId":"cnm_p119","prerequisiteId":"cnm_p029","strength":"hard","reason":"学习「比较小数的大小」需要先掌握「100以内数的大小」。"},{"topicId":"cnm_p125","prerequisiteId":"cnm_p094","strength":"hard","reason":"学习「小数加减法」需要先掌握「一位小数的加减」。"},{"topicId":"cnm_p125","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「小数加减法」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p127","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「轴对称」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p132","prerequisiteId":"cnm_p074","strength":"hard","reason":"学习「小数乘整数」需要先掌握「多位数乘一位数」。"},{"topicId":"cnm_p136","prerequisiteId":"cnm_p082","strength":"hard","reason":"学习「用数对确定位置」需要先掌握「东北、东南、西北、西南」。"},{"topicId":"cnm_p147","prerequisiteId":"cnm_p089","strength":"hard","reason":"学习「平行四边形的面积」需要先掌握「长方形和正方形的面积」。"},{"topicId":"cnm_p151","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「植树问题」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p160","prerequisiteId":"cnm_p077","strength":"hard","reason":"学习「长方体和正方体的认识」需要先掌握「长方形和正方形的特征」。"},{"topicId":"cnm_p161","prerequisiteId":"cnm_p089","strength":"hard","reason":"学习「长方体的表面积」需要先掌握「长方形和正方形的面积」。"},{"topicId":"cnm_p162","prerequisiteId":"cnm_p090","strength":"hard","reason":"学习「体积单位」需要先掌握「面积单位的换算」。"},{"topicId":"cnm_p165","prerequisiteId":"cnm_p079","strength":"hard","reason":"学习「分数的意义」需要先掌握「几分之一」。"},{"topicId":"cnm_p173","prerequisiteId":"cnm_p080","strength":"hard","reason":"学习「异分母分数加减」需要先掌握「同分母分数的初步加减」。"},{"topicId":"cnm_p174","prerequisiteId":"cnm_p058","strength":"hard","reason":"学习「分数加减混合」需要先掌握「带小括号的两步运算」。"},{"topicId":"cnm_p180","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「根据方向和距离确定位置」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p188","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「圆的认识」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p192","prerequisiteId":"cnm_p089","strength":"hard","reason":"学习「圆的面积」需要先掌握「长方形和正方形的面积」。"},{"topicId":"cnm_p193","prerequisiteId":"cnm_p101","strength":"hard","reason":"学习「扇形的认识」需要先掌握「锐角、直角和钝角」。"},{"topicId":"cnm_p200","prerequisiteId":"cnm_p089","strength":"soft","reason":"「长方形和正方形的面积」对学习「数与形」有帮助，但不会前者也可以开始学后者。"},{"topicId":"cnm_102","prerequisiteId":"cnm_p085","strength":"hard","reason":"学习「全面调查与抽样调查」需要先会小学的「复式统计表」。小学已学数据收集与整理。"},{"topicId":"cnm_106","prerequisiteId":"cnm_p085","strength":"hard","reason":"学习「频数分布表与数据分组」需要先会小学的「复式统计表」。对数据分组整理要以小学学过的统计表和统计图知识为基础。"},{"topicId":"cnm_148","prerequisiteId":"cnm_p089","strength":"soft","reason":"学习「完全平方公式」需要先会小学的「长方形和正方形的面积」。完全平方公式可以用小学学过的正方形和长方形面积图形来直观解释。"},{"topicId":"cnm_h230","prerequisiteId":"cnm_p095","strength":"hard","reason":"分类加法是小学里简单搭配继续发展后的计数原理。"},{"topicId":"cnm_p217","prerequisiteId":"cnm_p034","strength":"hard","reason":"学习「求两数相差几」需要先掌握「100以内笔算减法」。"},{"topicId":"cnm_p217","prerequisiteId":"cnm_p009","strength":"soft","reason":"学习「求两数相差几」需要先掌握「10以内数的比较」。"},{"topicId":"cnm_p218","prerequisiteId":"cnm_p217","strength":"hard","reason":"学习「求比一个数多（少）几的数」需要先掌握「求两数相差几」。"},{"topicId":"cnm_p218","prerequisiteId":"cnm_p033","strength":"hard","reason":"学习「求比一个数多（少）几的数」需要先掌握「100以内笔算加法」。"},{"topicId":"cnm_p221","prerequisiteId":"cnm_p014","strength":"hard","reason":"学习「观察简单的立体积木」需要先掌握「认识长方体、正方体、圆柱和球」。"},{"topicId":"cnm_p221","prerequisiteId":"cnm_p023","strength":"soft","reason":"学习「观察简单的立体积木」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p222","prerequisiteId":"cnm_p221","strength":"hard","reason":"学习「长方体纸盒的展开图」需要先掌握「观察简单的立体积木」。"},{"topicId":"cnm_p222","prerequisiteId":"cnm_p014","strength":"hard","reason":"学习「长方体纸盒的展开图」需要先掌握「认识长方体、正方体、圆柱和球」。"},{"topicId":"cnm_p223","prerequisiteId":"cnm_p057","strength":"hard","reason":"学习「同级运算与两级运算的运算顺序」需要先掌握「乘加乘减的运算顺序」。"},{"topicId":"cnm_p223","prerequisiteId":"cnm_p220","strength":"soft","reason":"学习「同级运算与两级运算的运算顺序」需要先掌握「加减法各部分间的关系」。"},{"topicId":"cnm_p224","prerequisiteId":"cnm_p219","strength":"hard","reason":"学习「等量代换（曹冲称象）」需要先掌握「数量间的乘除关系」。"},{"topicId":"cnm_p224","prerequisiteId":"cnm_p056","strength":"soft","reason":"学习「等量代换（曹冲称象）」需要先掌握「克和千克」。"},{"topicId":"cnm_p225","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「角的认识」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_p225","prerequisiteId":"cnm_p023","strength":"soft","reason":"学习「角的认识」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p226","prerequisiteId":"cnm_p079","strength":"hard","reason":"学习「几分之几」需要先掌握「几分之一」。"},{"topicId":"cnm_p227","prerequisiteId":"cnm_p226","strength":"hard","reason":"学习「简单的分数大小比较」需要先掌握「几分之几」。"},{"topicId":"cnm_p227","prerequisiteId":"cnm_p079","strength":"hard","reason":"学习「简单的分数大小比较」需要先掌握「几分之一」。"},{"topicId":"cnm_p228","prerequisiteId":"cnm_p023","strength":"hard","reason":"学习「生活中的运动现象」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p228","prerequisiteId":"cnm_p024","strength":"soft","reason":"学习「生活中的运动现象」需要先掌握「平面图形的拼组」。"},{"topicId":"cnm_p229","prerequisiteId":"cnm_p023","strength":"hard","reason":"学习「多边形的认识」需要先掌握「认识长方形、正方形、三角形和圆」。"},{"topicId":"cnm_p229","prerequisiteId":"cnm_p225","strength":"soft","reason":"学习「多边形的认识」需要先掌握「角的认识」。"},{"topicId":"cnm_p232","prerequisiteId":"cnm_p101","strength":"hard","reason":"学习「平角、周角和角的分类」需要先掌握「锐角、直角和钝角」。"},{"topicId":"cnm_p237","prerequisiteId":"cnm_p221","strength":"hard","reason":"学习「观察简单组合体」需要先掌握「观察简单的立体积木」。"},{"topicId":"cnm_p058","prerequisiteId":"cnm_p223","strength":"hard","reason":"学习「带小括号的两步运算」需要先掌握「同级运算与两级运算的运算顺序」。"},{"topicId":"cnm_p101","prerequisiteId":"cnm_p225","strength":"hard","reason":"学习「锐角、直角和钝角」需要先掌握「角的认识」。"},{"topicId":"cnm_p080","prerequisiteId":"cnm_p226","strength":"soft","reason":"学习「同分母分数的初步加减」需要先掌握「几分之几」。"},{"topicId":"cnm_p077","prerequisiteId":"cnm_p229","strength":"soft","reason":"学习「长方形和正方形的特征」需要先掌握「多边形的认识」。"},{"topicId":"cnm_056","prerequisiteId":"cnm_p225","strength":"hard","reason":"学习「角的概念与表示」需要先掌握「角的认识」。"},{"topicId":"cnm_053","prerequisiteId":"cnm_p099","strength":"hard","reason":"学习「直线、射线、线段」需要先掌握「线段、直线和射线」。"},{"topicId":"cnm_051","prerequisiteId":"cnm_p222","strength":"soft","reason":"学习「从不同方向看与立体图形的展开图」需要先掌握「长方体纸盒的展开图」。"},{"topicId":"cnm_131","prerequisiteId":"cnm_p228","strength":"soft","reason":"学习「轴对称图形与两个图形成轴对称」需要先掌握「生活中的运动现象」。"}]};
/* __DIAG_GRAPH_END__ */

/* ---------------- 每日问答（纯函数，可单测） ---------------- */

const QUIZ_SUBJECTS = ['语文', '数学', '英语', '阅读'];
const QUIZ_SLOTS_ALL = [...QUIZ_SUBJECTS, '其他'];
const CHECKIN_SUBJECTS = QUIZ_SLOTS_ALL; // 打卡固定五科（与问答槽位同一集合）

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

/* Oak 标准组长 6 句（2026-11-13 用户定：每日交流固定 6 句；5 句的对话集由 oakGroupForChild
 * 按日哈希从同年级其他对话集里随机补足到 6 句，见该函数内“补句”一段；完成判定仍以当日
 * 实际集长为准，见 apiOakListen——补句取完仍不足 6 时不硬凑，本常量仅作目标值与测试锚点）。 */
const OAK_GROUP_SIZE = 6;
/* 大木博士跟读奖励（2026-10-26 用户定，两档；2026-10-28 用户改门槛为 4 句 5 星；
 * 2026-11-09 用户纠正：门槛仍是 4 句 5 星（够格），但转盘须全部句子都读完才发放——
 * 第 4 句 5 星时只记够格不发奖，读完最后一句（全部句子都有成绩）才抽）：
 * 没到 4 句 5 星：只有听完全部句子的 quizXp；全部句子里至少 4 句 5 星（每句 pron ≥85，按当日最好成绩）
 * 且全部句子都已读完时，在 10 XP 之外再抽一次，每天一次。
 * 奖池（2026-11-07 转盘升级扩池，权重和为 100 即百分比）：经验仍是单项最大概率 20%、
 * 球第二 10%；养成道具合计 42%（6 食物各 5＋4 洗澡各 3）；伤药＋常见进化石 28% 是实用消耗品。 */
const OAK_FIVE_STAR_PRON = 85;
const OAK_DRAW_MIN_FIVE_STAR = 4;
const OAK_DRAW_XP = 10;
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

function pickOakEpisode(pool, childId, dateStr) {
  if (!pool.length) return null;
  /* 2026-11-13：改用 FNV-1a（dailyEnglishHash32，与每日英语同款）。旧 oakHash（djb2）在池子
   * 变大后有残留缺口——27 集对话池里 6 集（losteverything×2、makingfriends×2、
   * strikinggold×2）对孩子 1 全年都轮不到；FNV 在 365 天内覆盖全部 16/27 集（已验算）。 */
  return pool[dailyEnglishHash32(childId + ':' + dateStr) % pool.length];
}

/* Oak 示范音 URL：0014 旧行是本地 bundle 文件名（拼 /static/audio/oak/ 前缀）；
 * 0032 起新对话集的 oak_audio 存跟读站绝对地址（https://english.example.com/audio/…），原样直通。 */
function oakAudioUrl(oakAudio) {
  if (!oakAudio) return null;
  return oakAudio.startsWith('http://') || oakAudio.startsWith('https://')
    ? oakAudio : '/static/audio/oak/' + oakAudio;
}

async function oakGroupForChild(db, child, today) {
  const gradeNum = gradeNumFromLabel(child.grade_label) || 1;
  /* 降级守卫：oak_* 三列由迁移 0014 引入；旧迁移链（如 access/subjects 测试库）没有这些列，
   * 此时 kind='oak' 行必然为 0，直接返回空组，不碰 oak_* 列，避免总览/孩子详情 500。
   * 线上按“先迁移后部署”顺序，0014 应用后本分支恒不触发。 */
  const seedRow = await db.prepare(
    "SELECT COUNT(*) n FROM quiz_questions WHERE kind='oak'"
  ).first();
  if (!seedRow || !seedRow.n) {
    return {
      episodeId: null, topic: null, sentences: [],
      listenedCount: 0, completed: false, xpAwardedToday: 0,
    };
  }
  // 三年级：english_mode 与 english_progress_<id> 一次取回（原 2 次串行往返 → 1 次）
  let englishMode = false;
  let gate = null;
  if (gradeNum === 3) {
    const st = await getSettings(db, ['english_mode', `english_progress_${child.id}`]);
    englishMode = st.get('english_mode') === '1';
    gate = await loadEnglishGate(db, child, st.get(`english_progress_${child.id}`));
  }
  const progressOrd = gate ? gate.ord : null;
  const [{ results: episodes }, { results: attempts }] = await Promise.all([
    db.prepare(
      "SELECT DISTINCT oak_episode FROM quiz_questions WHERE kind='oak' AND grade=? ORDER BY oak_episode"
    ).bind(gradeNum).all(),
    db.prepare(
      'SELECT * FROM quiz_attempts WHERE child_id=? AND date_shanghai=?'
    ).bind(child.id, today).all(),
  ]);
  /* 内容分工（2026-11-13，用户定：Oak 只取口语对话集 card/video，课本集归每日英语）：
   * 集类型以 src/data/daily-english.js 的 DAILY_ENGLISH_EPISODES 为准；库里旧课本集仍保留、
   * 只在取数时过滤（不删行，历史尝试记录不受影响）。集类型未知的行（库里有、快照里暂无，
   * 如自插测试集或后加内容）放行，不静默丢弃。 */
  const pool = (episodes || []).map((r) => r.oak_episode).filter((ep) => {
    const k = (DAILY_ENGLISH_EPISODES[ep] || {}).k;
    return k === undefined || k === 'card' || k === 'video';
  });
  if (!pool.length) {
    return {
      episodeId: null, topic: null, sentences: [],
      listenedCount: 0, completed: false, xpAwardedToday: 0,
    };
  }
  const episodeId = pickOakEpisode(pool, child.id, today);
  const { results: rows } = await db.prepare(
    "SELECT * FROM quiz_questions WHERE kind='oak' AND grade=? AND oak_episode=? ORDER BY id"
  ).bind(gradeNum, episodeId).all();
  let questions = (rows || []).map(normalizeQuizRow);
  /* 补句（2026-11-13，用户定：每日交流固定 6 句）：新卡集每集只有 5 句（g1 的 15 个新卡集），
   * 集长不足 6 时从同年级其他对话集里按日哈希随机补足到 6 句。补句取自其他集、不与本集句子
   * 文本重复；哈希种子含 child＋日期，同一天内同一孩子恒为同一补句；听完/评分记录按
   * question_id 挂，与补句来自哪集无关。 */
  if (questions.length < OAK_GROUP_SIZE) {
    const { results: extraRows } = await db.prepare(
      "SELECT * FROM quiz_questions WHERE kind='oak' AND grade=? AND oak_episode != ? ORDER BY oak_episode, id"
    ).bind(gradeNum, episodeId).all();
    const inGroup = new Set(questions.map((q) => q.question));
    const cands = (extraRows || []).map(normalizeQuizRow).filter((q) => {
      const k = (DAILY_ENGLISH_EPISODES[q.oakEpisode] || {}).k;
      return (k === undefined || k === 'card' || k === 'video') && !inGroup.has(q.question);
    });
    const start = cands.length ? dailyEnglishHash32(child.id + ':' + today + ':oak-extra') % cands.length : 0;
    while (questions.length < OAK_GROUP_SIZE && cands.length) {
      const pick = cands.splice(start % cands.length, 1)[0];
      questions.push(pick);
      inGroup.add(pick.question);
    }
  }
  const ids = new Set(questions.map((q) => q.id));
  const groupAttempts = (attempts || []).filter((a) => ids.has(a.question_id));
  const listenedIds = new Set(groupAttempts.map((a) => a.question_id));
  const sentences = questions.map((q) => ({
    id: q.id, en: q.question, zh: q.explain, audio: oakAudioUrl(q.oakAudio),
    showZh: showEnglishZh(gradeNum, englishMode, progressOrd, oakEnglishOrder(episodeId)),
    listened: listenedIds.has(q.id),
  }));
  const listenedCount = sentences.filter((s) => s.listened).length;
  return {
    episodeId, topic: questions.length ? questions[0].oakTopic : null,
    sentences, listenedCount,
    completed: listenedCount >= sentences.length && sentences.length > 0,
    xpAwardedToday: groupAttempts.reduce((sum, a) => sum + (Number(a.xp_awarded) || 0), 0),
  };
}

async function oakSummaryForChild(db, child, today) {
  const group = await oakGroupForChild(db, child, today);
  return { listenedCount: group.listenedCount, completed: group.completed, total: group.sentences.length };
}

/* 点评 pron → 星级（与前端 oakAssess 同口径：≥85 为 5 星、≥70 为 4 星、≥55 为 3 星、≥40 为 2 星、否则 1 星） */
function oakStarsFromPron(pron) {
  if (typeof pron !== 'number' || !Number.isFinite(pron)) return 1;
  return pron >= 85 ? 5 : pron >= 75 ? 4 : pron >= 60 ? 3 : pron >= 40 ? 2 : 1;
}

/* 每日英语 pron → 星级（用户 2026-11-09 定：80 分＝4 星，全 5 句达标才打卡；与 Oak 的 ≥70 为 4 星区分开，4 星起点与打卡线 80 对齐，70–79 显示 3 星） */
function dailyEnglishStarsFromPron(pron) {
  if (typeof pron !== 'number' || !Number.isFinite(pron)) return 1;
  return pron >= 85 ? 5 : pron >= 75 ? 4 : pron >= 60 ? 3 : pron >= 40 ? 2 : 1;
}

/* 跟读抽奖掷骰（纯函数）：按 OAK_WHEEL_POOL 加权，返回奖品描述
 * {prize: 'xp'|'ball'|'item', prizeKey, xpAwarded, ballsAwarded}；
 * prizeKey 为 'xp'/'ball' 或道具 key（'care:*'/'medicine:*'/'stone:*'）。 */
function oakRollDraw(rng = Math.random) {
  const hit = weightedPick(OAK_WHEEL_POOL, rng);
  if (hit) {
    const [key] = hit;
    if (key === 'xp') return { prize: 'xp', prizeKey: 'xp', xpAwarded: OAK_DRAW_XP, ballsAwarded: 0 };
    if (key === 'ball') return { prize: 'ball', prizeKey: 'ball', xpAwarded: 0, ballsAwarded: 1 };
    return { prize: 'item', prizeKey: key, xpAwarded: 0, ballsAwarded: 0 };
  }
  return { prize: 'xp', prizeKey: 'xp', xpAwarded: OAK_DRAW_XP, ballsAwarded: 0 };
}

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
/* 某次普通转盘抽奖的转盘配置：扇区固定 18 个（权重和 100），winnerIndex 指向本次奖品的扇区。 */
function wheelFor(entriesFn, prizeKey) {
  const built = buildWheelSectors(entriesFn());
  return { ...built, winnerIndex: wheelWinnerIndex(built.sectors, prizeKey) };
}
function oakWheelFor(prizeKey) {
  return wheelFor(oakWheelEntries, prizeKey);
}

/* 养成转盘掷骰（纯函数）：按 CARE_WHEEL_POOL 加权，返回照顾道具 key（'care:*'）。 */
function rollCareWheelPrize(rng = Math.random) {
  const hit = weightedPick(CARE_WHEEL_POOL, rng);
  return hit ? hit[0] : CARE_WHEEL_POOL[0][0];
}
/* 养成转盘扇区（纯函数）：CARE_WHEEL_POOL → buildWheelSectors 条目；label/emoji 复用 oakPrizeDisplay。 */
function careWheelEntries() {
  return CARE_WHEEL_POOL.map(([key, weight]) => {
    const { prizeName, prizeEmoji } = oakPrizeDisplay('item', key);
    return { key, label: prizeName, emoji: prizeEmoji, weight };
  });
}
/* 某次养成转盘抽奖的转盘配置：扇区固定 10 个（权重和 42），winnerIndex 指向本次奖品的扇区。 */
function careWheelFor(prizeKey) {
  return wheelFor(careWheelEntries, prizeKey);
}

function oakDrawView(row) {
  if (!row) return null;
  const prizeKey = row.prize_key ?? (row.prize === 'xp' ? 'xp' : row.prize === 'ball' ? 'ball' : null);
  const { prizeName, prizeEmoji } = oakPrizeDisplay(row.prize, prizeKey);
  return { prize: row.prize, prizeKey, prizeName, prizeEmoji, xpAwarded: Number(row.xp_awarded) || 0, ballsAwarded: Number(row.balls_awarded) || 0, wheel: oakWheelFor(prizeKey) };
}

/* 当日 5 星进度与抽奖态（读路径；表未建如旧迁移链时当 0／无抽奖，不抛错）。
 * assessedCount：当日已读完（有成绩）的句数；转盘须全部句子都读完才发（2026-11-09 用户纠正）。 */
async function oakDrawStatus(db, child, today, group) {
  const total = group.sentences.length;
  if (!total) return { fiveStarCount: 0, fiveStarTotal: 0, assessedCount: 0, draw: null };
  let fiveStarCount = 0;
  let assessedCount = 0;
  try {
    const { results } = await db.prepare(
      'SELECT question_id, best_pron FROM oak_assessments WHERE child_id=? AND date_shanghai=?'
    ).bind(child.id, today).all();
    const best = new Map((results || []).map((r) => [r.question_id, Number(r.best_pron)]));
    fiveStarCount = group.sentences.filter((s) => (best.get(s.id) ?? -1) >= OAK_FIVE_STAR_PRON).length;
    assessedCount = group.sentences.filter((s) => best.has(s.id)).length;
  } catch (e) { /* oak_assessments 未建：当 0 */ }
  let draw = null;
  try {
    draw = oakDrawView(await db.prepare(
      'SELECT * FROM oak_draws WHERE child_id=? AND date_shanghai=?'
    ).bind(child.id, today).first());
  } catch (e) { /* oak_draws 未建：当无 */ }
  return { fiveStarCount, fiveStarTotal: total, assessedCount, draw };
}

/* 记一次点评成绩（每句取当日最好 pron）并在全部句子都读完且至少 4 句 5 星时抽一次奖。
 * 够格（4 句 5 星）只记数不发奖；须全部句子都有成绩（assessedCount === fiveStarTotal）才发放
 *（2026-11-09 用户纠正：第 4 句 5 星就抽是早了，要全部读完才发）。
 * 抽奖服务端做、每天一次：先 INSERT OR IGNORE 占位抢名额，抢到才发放；抢不到说明当日已抽过，复读已落库那一行，不重复发。
 * 返回 { stars, fiveStarCount, fiveStarTotal, assessedCount, draw, justDrawn }（draw 为 null 表示当日未抽）。 */
async function oakRecordAssessAndMaybeDraw(db, child, today, group, questionId, pron, rng = Math.random) {
  const stars = oakStarsFromPron(pron);
  if (typeof pron === 'number' && Number.isFinite(pron)) {
    try {
      await db.prepare(
        `INSERT INTO oak_assessments(child_id, question_id, date_shanghai, best_pron, attempts, updated_epoch)
         VALUES(?,?,?,?,1,?)
         ON CONFLICT(child_id, question_id, date_shanghai) DO UPDATE SET
           best_pron = MAX(best_pron, excluded.best_pron),
           attempts = attempts + 1,
           updated_epoch = excluded.updated_epoch`
      ).bind(child.id, questionId, today, pron, Math.floor(Date.now() / 1000)).run();
      await touchRow(db, 'oak_assessments', 'child_id=? AND question_id=? AND date_shanghai=?', [child.id, questionId, today], await bumpChildVersion(db, child.id));
    } catch (e) { console.error('oak record assess failed', e); }
  }
  const status = await oakDrawStatus(db, child, today, group);
  if (status.fiveStarCount < Math.min(OAK_DRAW_MIN_FIVE_STAR, status.fiveStarTotal) || status.fiveStarTotal === 0 || status.draw || status.assessedCount < status.fiveStarTotal) {
    return { stars, ...status, justDrawn: false };
  }
  const drawn = oakRollDraw(rng);
  const prize = drawn.prize;
  const prizeKey = drawn.prizeKey;
  const xpAwarded = drawn.xpAwarded || 0;
  const ballsAwarded = drawn.ballsAwarded || 0;
  const nowEpoch = Math.floor(Date.now() / 1000);
  let claimed = false;
  try {
    const ins = await db.prepare(
      `INSERT OR IGNORE INTO oak_draws(child_id, date_shanghai, prize, prize_key, xp_awarded, balls_awarded, created_epoch)
       VALUES(?,?,?,?,?,?,?)`
    ).bind(child.id, today, prize, prize === 'item' ? prizeKey : null, xpAwarded, ballsAwarded, nowEpoch).run();
    claimed = !!(ins.meta && ins.meta.changes);
  } catch (e) {
    console.error('oak draw claim failed', e);
    return { stars, ...status, justDrawn: false };
  }
  if (!claimed) {
    // 并发下另一请求已抽：复读已落库那一行，不重复发
    const again = await oakDrawStatus(db, child, today, group);
    return { stars, ...again, justDrawn: false };
  }
  {
    const v = await bumpChildVersion(db, child.id);
    await touchRow(db, 'oak_draws', 'child_id=? AND date_shanghai=?', [child.id, today], v);
  }
  if (prize === 'xp') {
    const xpInfo = await grantXp(db, child, xpAwarded, today);
    await pushEvoNotices(db, child.id, xpInfo);
  } else if (prize === 'ball') {
    // 普通精灵球走发球记账：children.balls +1 ＋ ball_grants 审计行（checkin_id 为空，属系统发放，历史页已兼容空值）
    await db.batch([
      db.prepare('UPDATE children SET balls = balls + 1 WHERE id=?').bind(child.id),
      db.prepare(
        `INSERT INTO ball_grants(child_id, kind, qty, checkin_id, created_epoch, date_shanghai)
         VALUES(?,?,?,?,?,?)`
      ).bind(child.id, 'normal', 1, null, nowEpoch, today),
    ]);
    {
      const v = await bumpChildVersion(db, child.id);
      await touchRow(db, 'children', 'id=?', [child.id], v);
      const g = await db.prepare('SELECT id FROM ball_grants WHERE child_id=? AND created_epoch=? ORDER BY id DESC LIMIT 1').bind(child.id, nowEpoch).first();
      if (g) await touchRow(db, 'ball_grants', 'id=?', [g.id], v);
    }
    await settleBallOverflow(db, child.id, today); // v11：球满 99 自动向上兑换
  } else {
    // 道具奖品（care 食物/洗澡、伤药、进化石）走背包：addItem＋item_ledger 审计行，reason 'oak-draw'
    await addItem(db, child.id, prizeKey, 1, 'oak-draw', 'oak_draw', null, today);
    const v = await bumpChildVersion(db, child.id);
    await touchRow(db, 'children', 'id=?', [child.id], v);
  }
  const { prizeName, prizeEmoji } = oakPrizeDisplay(prize, prizeKey);
  return { stars, fiveStarCount: status.fiveStarCount, fiveStarTotal: status.fiveStarTotal, draw: { prize, prizeKey, prizeName, prizeEmoji, xpAwarded, ballsAwarded, wheel: oakWheelFor(prizeKey) }, justDrawn: true };
}

function questionLabel(q) {
  return q.kind === 'riddle' ? '脑筋急转弯' : `${q.subject || '综合'}题`;
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
function chapterOrder(chapter) {
  if (typeof chapter !== 'string' || !chapter) return null;
  const grade = MATH_GRADE_CHARS[chapter.charAt(0)];
  if (!grade) return null;
  let term;
  if (chapter.includes('下册')) term = 1000;
  else if (chapter.includes('上册')) term = 0;
  else return null;
  let unit;
  if (chapter.includes('综合与实践')) {
    unit = 90;
  } else {
    const m = chapter.match(/第(\d+)单元/);
    if (!m) return null;
    unit = Number(m[1]);
  }
  return grade * 10000 + term + unit;
}

function chineseOrder(chapter) {
  if (typeof chapter !== 'string' || !chapter) return null;
  const grade = MATH_GRADE_CHARS[chapter.charAt(0)];
  if (!grade) return null;
  let term;
  if (chapter.includes('下册')) term = 1000;
  else if (chapter.includes('上册')) term = 0;
  else return null;
  const m = chapter.match(/第(\d+)单元/);
  if (!m) return null;
  const unit = Number(m[1]);
  return grade * 10000 + term + unit;
}

function englishOrder(chapter) {
  if (typeof chapter !== 'string' || !chapter) return null;
  const grade = MATH_GRADE_CHARS[chapter.charAt(0)];
  if (!grade) return null;
  let term;
  if (chapter.includes('下册')) term = 1000;
  else if (chapter.includes('上册')) term = 0;
  else return null;
  const m = chapter.match(/Unit\s*(\d+)/);
  if (!m) return null;
  const unit = Number(m[1]);
  return grade * 10000 + term + unit;
}

function oakEnglishOrder(episodeId) {
  const chapters = {
    'ep-pep3-u1': ENGLISH_UNITS[3][0],
    'ep-pep3-u2': ENGLISH_UNITS[3][1],
    'ep-pep3-u3': ENGLISH_UNITS[3][2],
    'ep-pep3-u4': ENGLISH_UNITS[3][3],
    'ep-pep3-u5': ENGLISH_UNITS[3][4],
    'ep-pep3-u6': ENGLISH_UNITS[3][5],
    'ep-pep3a-u3': ENGLISH_UNITS[3][2],
    'ep-pep3b-u1': ENGLISH_UNITS[3][7],
    'ep-pep3b-u2': ENGLISH_UNITS[3][8],
    'ep-pep3b-u3': ENGLISH_UNITS[3][9],
    'ep-pep3b-u4': ENGLISH_UNITS[3][10],
    'ep-pep3b-u5': ENGLISH_UNITS[3][11],
    'ep-pep3b-u6': ENGLISH_UNITS[3][12],
  };
  return Object.prototype.hasOwnProperty.call(chapters, episodeId)
    ? englishOrder(chapters[episodeId]) : null;
}

function showEnglishZh(gradeNum, englishMode, progressOrd, contentOrd) {
  return !(gradeNum === 3 && englishMode === true &&
    progressOrd != null && contentOrd != null &&
    contentOrd <= progressOrd);
}

/* 由年级与进度章节生成进度门；年级无章节表或章节不在表中返回 null（不设门） */
function mathGateFor(gradeNum, chapterText) {
  const list = MATH_CHAPTERS[gradeNum];
  if (!Array.isArray(list)) return null;
  const idx = list.indexOf(chapterText);
  if (idx < 0) return null;
  const ord = chapterOrder(chapterText);
  return {
    chapter: chapterText,
    ord,
    currentOrd: ord,
    prevOrd: idx > 0 ? chapterOrder(list[idx - 1]) : null,
    chapters: list,
  };
}

function chineseGateFor(gradeNum, chapterText) {
  const list = CHINESE_CHAPTERS[gradeNum];
  if (!Array.isArray(list)) return null;
  const idx = list.indexOf(chapterText);
  if (idx < 0) return null;
  const ord = chineseOrder(chapterText);
  return {
    chapter: chapterText,
    ord,
    currentOrd: ord,
    prevOrd: idx > 0 ? chineseOrder(list[idx - 1]) : null,
    chapters: list,
  };
}

function englishGateFor(gradeNum, chapterText) {
  const list = ENGLISH_UNITS[gradeNum];
  if (!Array.isArray(list)) return null;
  const idx = list.indexOf(chapterText);
  if (idx < 0) return null;
  const ord = englishOrder(chapterText);
  return {
    chapter: chapterText,
    ord,
    currentOrd: ord,
    prevOrd: idx > 0 ? englishOrder(list[idx - 1]) : null,
    chapters: list,
  };
}

/* 未设进度时的默认：该年级「上册 第2单元」（秋季学期中段保守值） */
function defaultMathChapter(gradeNum) {
  const list = MATH_CHAPTERS[gradeNum];
  if (!Array.isArray(list)) return null;
  const hit = list.find((c) => c.includes('上册 第2单元'));
  return hit === undefined ? null : hit;
}

function defaultChineseChapter(gradeNum) {
  const list = CHINESE_CHAPTERS[gradeNum];
  if (!Array.isArray(list)) return null;
  const hit = list.find((c) => c.includes('上册 第2单元'));
  return hit === undefined ? null : hit;
}

function defaultEnglishChapter(gradeNum) {
  const list = ENGLISH_UNITS[gradeNum];
  if (!Array.isArray(list)) return null;
  const hit = list.find((c) => /上册 Unit 2(?:\s|$)/.test(c));
  return hit === undefined ? null : hit;
}

/* 数学进度门加载（每日问答／抓捕／防守共用同一套）：读家长为该孩子设的进度，
 * 存值合法才用，否则默认上册第2单元；年级无章节表返回 null（不设门）。 */
async function loadMathGate(db, child) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const list = gradeNum != null ? MATH_CHAPTERS[gradeNum] : null;
  if (!Array.isArray(list) || !list.length) return null;
  const savedRaw = await getSetting(db, `math_progress_${child.id}`);
  const saved = savedRaw == null ? '' : String(savedRaw).trim();
  const chapter = saved && list.includes(saved) ? saved : defaultMathChapter(gradeNum);
  return chapter ? mathGateFor(gradeNum, chapter) : null;
}

async function loadChineseGate(db, child) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const list = gradeNum != null ? CHINESE_CHAPTERS[gradeNum] : null;
  if (!Array.isArray(list) || !list.length) return null;
  const savedRaw = await getSetting(db, `chinese_progress_${child.id}`);
  const saved = savedRaw == null ? '' : String(savedRaw).trim();
  const chapter = saved && list.includes(saved) ? saved : defaultChineseChapter(gradeNum);
  return chapter ? chineseGateFor(gradeNum, chapter) : null;
}

async function loadEnglishGate(db, child, prefetchedRaw) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const list = gradeNum != null ? ENGLISH_UNITS[gradeNum] : null;
  if (!Array.isArray(list) || !list.length) return null;
  // prefetchedRaw（可选）：调用方已用 getSettings 取到的 english_progress_<id>（缺失为 null）；不传则自己查
  const savedRaw = prefetchedRaw !== undefined ? prefetchedRaw : await getSetting(db, `english_progress_${child.id}`);
  const saved = savedRaw == null ? '' : String(savedRaw).trim();
  const chapter = saved && list.includes(saved) ? saved : defaultEnglishChapter(gradeNum);
  return chapter ? englishGateFor(gradeNum, chapter) : null;
}

/* 进度门过滤（每日问答／抓捕／防守共用）：仅数学学习题受门约束；
 * chapter 为空放行（入库规矩保证新题必带标签，见 questionActivationError）；
 * 无法解析剔除（fail-closed）；顺序值超过进度剔除。 */
function mathGatePass(q, mathGate) {
  if (!mathGate) return true;
  if (q.kind === 'riddle' || q.subject !== '数学') return true;
  if (q.chapter == null || q.chapter === '') return true;
  const o = chapterOrder(q.chapter);
  if (o === null) return false;
  return o <= mathGate.ord;
}

function chineseGatePass(q, chineseGate) {
  if (!chineseGate) return true;
  if (q.kind === 'riddle' || q.subject !== '语文') return true;
  if (q.chapter === '通用复习') return true;
  if (q.chapter == null || q.chapter === '') return false;
  const o = chineseOrder(q.chapter);
  if (o === null) return false;
  return o <= chineseGate.ord;
}

function englishGatePass(q, englishGate) {
  if (!englishGate) return true;
  if (q.kind === 'riddle' || q.subject !== '英语') return true;
  if (q.chapter === '通用复习') return true;
  if (q.chapter == null || q.chapter === '') return false;
  const o = englishOrder(q.chapter);
  if (o === null) return false;
  return o <= englishGate.ord;
}

/* 激活检查（入库标签规矩）：数学学习题（study）无 chapter 标签或标签无法解析时不得激活；
 * 家长自定义题（custom）由家长自选内容，不在此限；非数学题无章节体系，不在此限。
 * 返回 null 表示可激活，否则返回错误文案。 */
function questionActivationError(q) {
  if (!q || q.kind !== 'study' || q.subject !== '数学') return null;
  if (q.chapter == null || q.chapter === '') return '数学题必须带章节标签才能激活';
  if (chapterOrder(q.chapter) === null) return '数学题章节标签无法解析，不能激活';
  return null;
}

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
  const gatedPool = pool.filter((q) => mathGatePass(q, mathGate) && chineseGatePass(q, chineseGate) && englishGatePass(q, englishGate));
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
  const slots = expandQuizSubjects(subjects);
  for (const s of slots) {
    if (picked.length >= total) break;
    if (s === '其他') continue; // 通用槽最后填
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
const DIAG_REVIEW_COUNT = 2;
const DIAG_MAX_DEPTH = 6;
const DIAG_EXPIRE_DAYS = 7;
const DIAG_FAIL_CLOSED = new Set(['cnm_p076', 'cnm_p081', 'cnm_p095', 'cnm_p224']);
const DIAG_NO_QUESTION_TOPIC = 'cnm_p014';

/* 先修图索引：topics 数组即 topics.json 顺序，idx 即其顺序值（回溯时同强度内按此顺序） */
const DIAG_TOPIC_BY_ID = new Map(MATH_PREREQ_G1G3.topics.map((t, i) => [t.id, { ...t, idx: i }]));
const DIAG_EDGES_BY_TOPIC = new Map();
for (const e of MATH_PREREQ_G1G3.edges) {
  if (!DIAG_EDGES_BY_TOPIC.has(e.topicId)) DIAG_EDGES_BY_TOPIC.set(e.topicId, []);
  DIAG_EDGES_BY_TOPIC.get(e.topicId).push(e);
}

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

/* 复习题选题（纯函数）：根因知识点内、active 数学学习题，题目的 grade 与根因年级一致；
 * 优先从未答过，其次按最近一次作答日期最久远；排除当日已答、当日题单、当日已出复习题；
 * 出题前以 mathGatePass 复核（门外不出）。pool 为 normalize 后的全部题；
 * history 为 Map(qid → {lastDate, lastCorrect})。返回最多 DIAG_REVIEW_COUNT 道（不足不凑）。 */
function diagPickReview(pool, { rootTopicId, excludeIds = new Set(), answeredIds = new Set(), issuedIds = new Set(), mathGate = null, history = null } = {}) {
  const root = DIAG_TOPIC_BY_ID.get(rootTopicId);
  if (!root) return [];
  const hist = history instanceof Map ? history : new Map();
  const cands = (pool || []).filter((q) => q.active !== 0 && q.active !== false
    && q.kind === 'study' && q.subject === '数学' && q.topicId === rootTopicId
    && (q.grade === root.grade || q.grade == null)
    && !excludeIds.has(Number(q.id)) && !answeredIds.has(Number(q.id)) && !issuedIds.has(Number(q.id))
    && mathGatePass(q, mathGate));
  const lastDateOf = (q) => { const h = hist.get(Number(q.id)); return h && h.lastDate ? h.lastDate : null; };
  const sorted = [...cands].sort((a, b) => {
    const ha = hist.has(Number(a.id)), hb = hist.has(Number(b.id));
    if (ha !== hb) return ha ? 1 : -1;
    const d = String(lastDateOf(a) || '').localeCompare(String(lastDateOf(b) || ''));
    return d || (a.id - b.id);
  });
  return sorted.slice(0, DIAG_REVIEW_COUNT);
}

/* ---------------- 战斗引擎（纯函数，可单测；rng 可注入保证测试确定性） ----------------
 * 队伍：sides = { A: sideObj, B: sideObj }，sideObj = { childId, childName, battleLevel, pets: [pet] }，
 * pet = { key, name, type, no, img, level, maxHp, hp, moves: [{name, type, power}] }。
 * 规则：回合交替；先攻方（firstSide）自己的第一个回合不能出招（canSideAttack=false，
 *   提交任何动作都按「跳过」处理，不造成伤害）；上场宠昏厥自动换备战宠；
 *   一方全部出战宠昏厥 → 对方获胜（state.winner = 'A'|'B'）。
 * 伤害：power × (0.5 + 0.05×出招宠等级) × 克制倍率 × 随机 0.9–1.1，取整、至少 1；
 * 另有 1/16 概率暴击 ×1.5（借鉴包 v1，calcDamage 内判定，事件带 critical）。
 * 量级：主宠/收藏宠约 3–5 招打倒一只同级宠，单场约 8–14 次出招分胜负。 */

// 无 stats 宠物继续使用此旧血量口径作为回落。
function battleMaxHp(level) {
  return 60 + 12 * Math.max(1, Number(level) || 1);
}

/* PvP 专用 HP 倍率（2026-10-24 平衡调整，sim-pvp-balance 定参）：
 * battleMaxHp 被道馆（Boss hpMult 定参）与合作（节点 hpMult 定参）共用，全局公式不动；
 * PvP 双方 maxHp = round(battleMaxHp(压平等级) × PVP_HP_MULT)，只在 PvP 压平/join 路径生效，
 * 使同级对局从约 4–5 招分胜负拉长到约 6–7 招（Lv.5 口径），让防守答题收益累积显形。 */
const PVP_HP_MULT = 1.4;
function pvpMaxHp(level) {
  return Math.round(battleMaxHp(level) * PVP_HP_MULT);
}

function typeMult(atkType, defType) {
  return (TYPE_CHART[atkType] || []).includes(defType) ? 2 : 1;
}

function typeMultOfficial(atkType, defType) {
  if (Object.prototype.hasOwnProperty.call(OFFICIAL_MULT, atkType) && TYPES.includes(defType)) {
    const row = OFFICIAL_MULT[atkType];
    return Object.prototype.hasOwnProperty.call(row, defType) ? row[defType] : 1;
  }
  if (Object.prototype.hasOwnProperty.call(OFFICIAL_EXTRA_ATK, atkType) && Object.prototype.hasOwnProperty.call(OFFICIAL_EXTRA_ATK[atkType], defType)) return OFFICIAL_EXTRA_ATK[atkType][defType];
  if (Object.prototype.hasOwnProperty.call(OFFICIAL_EXTRA_DEF, defType) && Object.prototype.hasOwnProperty.call(OFFICIAL_EXTRA_DEF[defType], atkType)) return OFFICIAL_EXTRA_DEF[defType][atkType];
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

/* 玩家宠防御属性：bossDefTypes 再按 makePet 白名单过滤（TYPES 9 属性 ∪ {超能力，毒}）。
 * 过滤后为空（如 35 皮皮 [妖精]、10 绿毛虫 [虫]、56 猴怪 [格斗]）返回 null，由 makePet 默认 [type]；
 * 绝不能返回 []（makePet 会抛错）。与馆主同口径，2026-11-06 玩家宠双属性防御。 */
function playerDefTypes(no) {
  const filtered = bossDefTypes(no).filter((t) => TYPES.includes(t) || t === '超能力' || t === '毒');
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

/* 实战克制关系（图鉴卡片／道馆精灵球共用；经典 TYPE_CHART 只做弱点（×2），供 PvP 答题对战；PvE 官方口径见 OFFICIAL_MULT（含抗性 ×0.5、免疫 ×0））。
 * 入参为战斗单属性（9 种集：SPECIES/LINE_TYPE 的映射值；冰→水、超能力/恶/妖精→普通）。
 * 返回 { strong, weak, resist, immune }；列表均按 TYPES 顺序排列。
 * 注意：卡片上的属性徽章是官方双属性（DEX_DETAILS），克制列表是 App 实战口径，两者口径不同、各自标注。馆主条目用 matchupsForTypes（官方双属性），见 details()。 */
function matchupsForType(t) {
  if (!t || !TYPES.includes(t)) return { strong: [], weak: [], resist: [], immune: [] };
  return {
    strong: TYPES.filter((v) => typeMultOfficial(t, v) === 2),
    weak: TYPES.filter((v) => typeMultOfficial(v, t) === 2),
    resist: TYPES.filter((v) => typeMultOfficial(v, t) === 0.5),
    immune: TYPES.filter((v) => typeMultOfficial(v, t) === 0),
  };
}

function matchupsForTypes(defTypes) {
  const defs = Array.isArray(defTypes) ? defTypes.filter(Boolean) : [];
  if (!defs.length) return { strong: [], weak: [], resist: [], immune: [] };
  const strongSet = new Set();
  for (const t of defs) for (const v of TYPES) if (typeMultOfficial(t, v) === 2) strongSet.add(v);
  return {
    strong: TYPES.filter((v) => strongSet.has(v)),
    weak: TYPES.filter((a) => typeMultOfficialMulti(a, defs) >= 2),
    resist: TYPES.filter((a) => { const m = typeMultOfficialMulti(a, defs); return m > 0 && m < 1; }),
    immune: TYPES.filter((a) => typeMultOfficialMulti(a, defs) === 0),
  };
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

/* 暴击（借鉴包 v1 §1）：每次出招 1/16 概率，伤害 ×1.5，道馆与 PvP 共用本函数 */
const CRIT_RATE = 1 / 16;
const CRIT_MULT = 1.5;

/* PvP 专用暴击（2026-10-24 平衡调整，scripts/sim-pvp-balance.mjs 定参）：
 * 兄弟对战里旧暴击单次增伤 ≈ 一次成功防守的减伤（106%），运气盖过答题；
 * PvP 降为 1/24 概率 ×1.3（单次增伤 ≈ 防守减伤的 60%），保留「会心一击」惊喜。
 * 仅 stagePvpAttack 与 PvP 即时结算兜底经 opts 传入；道馆/合作不传 opts、口径不变。 */
const PVP_CRIT_RATE = 1 / 24;
const PVP_CRIT_MULT = 1.3;

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

// 优先采用招式官方分类；缺失分类时按三代属性分表，妖精也归特殊。
function moveCategory(move) {
  const category = move.damage_class;
  if (category === '物理' || category === 'physical') return 'physical';
  if (category === '特殊' || category === 'special') return 'special';
  if (category === '变化' || category === 'status') return 'status';
  return ['普通', '格斗', '飞行', '毒', '地面', '岩石', '虫', '幽灵', '钢'].includes(move.type)
    ? 'physical' : 'special';
}

// 主宠线按现有等级阶段取物种号：蛋期无物种，超出形态表时封顶。
function lineFormNo(line, level) {
  const idx = formIdxForLevel(level);
  if (idx === 0) return null;
  const forms = LINES[line] && LINES[line].forms;
  if (!forms || forms.length === 0) return null;
  return forms[Math.min(idx - 1, forms.length - 1)].no;
}

/* ---------------- 战斗特性第一期（2026-11-07，用户 D1–D10 按推荐拍板） ----------------
 * D1 默认首特性（abilities[0]；165 种首特性恒为非隐藏）；D2 范围野外 132＋主宠线 12。
 * 本期 9 个特性、5 个改动点：低血量同系强化（茂盛/猛火/激流/虫之预感）、厚脂肪、
 * 飘浮、硬壳盔甲、储水/蓄电。天气/阶段/状态系统不在本期。
 * 乘算顺序（方案 §5.1）：威力修正 → 基础伤害 → STAB → 属性克制 → 防守方特性修正 → 随机 → 暴击；
 * 免疫类（飘浮/储水/蓄电）在克制计算之前短路（mult=0 路径，不消耗随机数）。
 * 叠加口径备查（D10）：友好度闪避与沙隐/雪隐闪避取高不叠加（沙隐/雪隐未实装，届时在命中行取 max）；
 * 硬撑留 1 血与结实/多重鳞片只触发一个，先结实后硬撑（两者未实装，届时硬撑在其后判定）。 */
const LOW_HP_ABILITY_TYPE = { '茂盛': '草', '猛火': '火', '激流': '水', '虫之预感': '虫' };
function abilityOf(no) {
  const d = (no != null) ? DEX_DETAILS[no] : null;
  const a = d && Array.isArray(d.abilities) ? d.abilities[0] : null;
  return a && a.name ? a.name : null;
}
// 扩到 155：零实效特性（已核查、无战斗实效），按特性名注册。本游戏无反作用伤害招式，
// 坚硬脑袋不产生任何战斗效果；首特性为该特性的种（74/75/76/95/104/105/142/208）均视为已覆盖。
// 扩到 159：压迫感同为零实效——官方效果是对手招式 PP＋1，本站无 PP 系统，不产生任何战斗效果；
// 首特性为该特性的种（144/145/146/150）均视为已覆盖。
// 新增零实效特性时往这里加名字；行为类特性不得进此表。
const ABILITY_NO_EFFECT = new Set(['坚硬脑袋', '压迫感']);
// 特性免疫判定：飘浮免地面、储水免水（吸水回复）、蓄电免电（吸电回复）；其余返 null。
function abilityImmunity(ability, moveType) {
  if (ability === '飘浮' && moveType === '地面') return { heal: false };
  if (ability === '储水' && moveType === '水') return { heal: true };
  if (ability === '蓄电' && moveType === '电') return { heal: true };
  // 2a：避雷针/电气引擎免疫电系并升档（特攻/速度 +1）。calcDamage 命中时返回 stage，
  // 调用方用 applyAbilityStages 应用；abilityOf 优先级不变（避雷针/电气引擎是首特性时才生效）。
  if (ability === '避雷针' && moveType === '电') return { heal: false, stage: { key: 'spa', delta: 1 } };
  if (ability === '电气引擎' && moveType === '电') return { heal: false, stage: { key: 'spe', delta: 1 } };
  // 扩到 141：引火免疫火系并挂标记（自身火招 ×1.5 直到离场；标记由调用方 applyAbilityFlashFire 挂）。
  if (ability === '引火' && moveType === '火') return { heal: false, flashFire: true };
  return null;
}
// 特性触发文案（战斗日志逐行渲染；调用方在攻击事件之前推入）。healed 为实际回复量（上限后）。
function abilityEventText(e, healed) {
  if (e.kind === 'immune') {
    if (e.name === '飘浮') return `「飘浮」发动！${e.pet} 飘在空中，地面属性招式没有效果！`;
    if (e.name === '储水') return `「储水」发动！${e.pet} 吸收了水属性招式${healed > 0 ? `，回复了 ${healed} 点体力` : '，但体力已满'}！`;
    if (e.name === '蓄电') return `「蓄电」发动！${e.pet} 吸收了电属性招式${healed > 0 ? `，回复了 ${healed} 点体力` : '，但体力已满'}！`;
    // 2a：避雷针/电气引擎免疫电系并升档（stage 已由调用方 applyAbilityStages 应用）。
    if (e.name === '避雷针') return `「避雷针」发动！${e.pet} 吸收了电属性招式，特攻提升了！`;
    if (e.name === '电气引擎') return `「电气引擎」发动！${e.pet} 吸收了电属性招式，速度提升了！`;
    // 扩到 141：引火免疫火系并挂标记（标记已由调用方 applyAbilityFlashFire 挂）。
    if (e.name === '引火') return `「引火」发动！${e.pet} 吸收了火属性招式，火属性招式威力提升了！`;
  }
  if (e.kind === 'lowhp') return `「${e.name}」发动！${e.pet} 的${e.moveType}属性招式威力提升了！`;
  if (e.kind === 'flashfire') return `「引火」发动！${e.pet} 的火属性招式威力提升了！`;
  // 沙暴特防（第二步）：name 为 '沙暴' 时返回特防文案，不落入通用“威力减弱”分支。
  if (e.kind === 'weather' && e.name === '沙暴') {
    return `沙暴！${e.pet} 借助沙暴提升了特防！`;
  }
  // 天气（第三期简化版）：按招式属性分提升/减弱两支。
  if (e.kind === 'weather') {
    const boosted = (e.name === '大晴天' && e.moveType === '火') || (e.name === '下雨' && e.moveType === '水');
    return `${e.name}！${e.pet} 的${e.moveType}属性招式威力${boosted ? '提升' : '减弱'}了！`;
  }
  if (e.kind === 'thickfat') return `「${e.name}」发动！${e.pet} 受到的${e.moveType}属性伤害减半！`;
  if (e.kind === 'guts') return `「毅力」发动！${e.pet} 带伤作战，物理攻击提升了！`;
  if (e.kind === 'burn') return `${e.pet} 处于灼伤状态，物理攻击减半！`;
  return `「${e.name}」发动！`;
}
function abilityEvents(abilityEntries, atkSide, defSide, healed = 0) {
  return (abilityEntries || []).map((e) => ({
    type: 'ability', side: e.side === 'atk' ? atkSide : defSide, pet: e.pet, ability: e.name,
    text: abilityEventText(e, healed),
  }));
}
// 回复（上限 maxHp）：吸取与特性吸取共用；drainHeal 改走这里，行为不变。
function healPet(pet, amount) {
  if (!pet) return 0;
  const cur = (typeof pet.hp === 'number' && Number.isFinite(pet.hp)) ? pet.hp : 0;
  const cap = (typeof pet.maxHp === 'number' && Number.isFinite(pet.maxHp)) ? pet.maxHp : cur;
  const amt = Math.max(0, Math.floor(Number(amount) || 0));
  const next = Math.min(cap, cur + amt);
  const healed = Math.max(0, next - cur);
  pet.hp = cur + healed;
  return healed;
}
// 对一次攻击结算应用特性吸取回复（防守方）：储水/蓄电免疫时回复最大体力 1/4。返回实际回复量。
function applyAbilityHeal(defPet, abilityEntries) {
  let healed = 0;
  for (const e of (abilityEntries || [])) {
    if (e && e.kind === 'immune' && e.heal > 0) healed += healPet(defPet, e.heal);
  }
  return healed;
}
// 友好度硬撑（D10，本次并进第一期）：主宠致命伤按档概率留 1 HP，每场限 1 次。
// 档位：≥153（3 心）10%、≥204（4 心）15%、255（5 心）20%。只进道馆、只作用于主宠。
function endureRate(friendship) {
  const f = Number(friendship) || 0;
  if (f >= 255) return 0.20;
  if (f >= 204) return 0.15;
  if (f >= 153) return 0.10;
  return 0;
}
function tryEndure(st, side, pet, rng) {
  if (!st || !st.gym || side !== 'A') return false;
  if (!pet || pet.key !== 'main') return false; // 只保主宠；备战宠（key dex:{no}）一律不吃加成
  if (st.gym.endureUsed) return false;
  const rate = endureRate(st.gym.friendship);
  if (rate <= 0) return false;
  if (rollRng(rng) >= rate) return false;
  pet.hp = 1;
  st.gym.endureUsed = true;
  return true;
}

// ---------------- 战斗特性第二期：阶段系统（2a）与状态系统（2b） ----------------
// 2a：能力阶段（atk/def/spa/spd/spe，-6..+6），威吓出场降对方攻击；避雷针/电气引擎免疫
//     电系并升档；恒净之躯/怪力钳挡降档。
// 2b：状态（中毒/麻痹/灼伤/睡眠），接触类特性（静电/毒刺/孢子/火焰之躯）30% 触发，
//     回合末结算（中毒/灼伤扣血、蜕皮治愈、睡眠计数）。睡眠 1–3 回合随机，早起减半。
//     状态下场保留、昏厥时清除；阶段下场清零、昏厥时清零。自然回复下场时清除状态。
const STAGE_KEYS = ['atk', 'def', 'spa', 'spd', 'spe'];
const STAGE_LABEL = { atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度' };
const STATUS_KINDS = ['poison', 'paralysis', 'burn', 'sleep'];
const STATUS_LABEL = { poison: '中毒', paralysis: '麻痹', burn: '灼伤', sleep: '睡眠' };
// 接触判定（D4）：物理招默认接触，白名单只收含义明确的远程/波动/声音/粉末/气体/炮/
// 吐息/超能力/投掷/地震类招式。名含翅/翼/啄/喙的按接触（翼击类）；含义模糊的一律默认接触。
// 官方物理招（53 条）均为接触（地震/尖石攻击等 7 条在白名单内）；主宠/馆主招式名均为接触。
const NON_CONTACT_MOVES = new Set([
  // 官方招式（7 条）：地震与岩石系远程
  '地震', '尖石攻击', '岩崩', '岩石封锁', '落石', '重踏', '飞叶快刀',
  // 原创招式（56 条）：粉末/气体/炮/吐息/超能力/投掷/波动/声音/地震类
  '蝶粉飞舞', '鳞粉风暴', '毒粉旋风', '毒雾旋涡', '毒烟弥漫', '毒雾喷发', '污泥泼洒',
  '泥巴投掷', '金币飞镖', '招财金币', '落石小雨', '落石重雨', '岩石巨炮', '岩石重炮',
  '古海重炮', '王者地震', '地震小浪', '怒涛龙卷', '暴怒龙息', '远古咆哮', '草原疾风',
  '超音波', '超音巨波', '催眠歌谣', '月光小曲', '月光大曲', '摇篮小曲', '梦境低语',
  '口水飞溅', '毒液喷溅', '幽影飘忽', '黑雾缠绕', '暗影爆裂', '梦幻泡泡', '心灵星光',
  '晨光念力', '预知未来', '月光守护', '暗影球', '数据重组', '虚拟冲击', '百变模仿',
  '汤匙弯曲', '念力瞬移', '汤匙重击', '念力冲击', '双匙念力', '超能风暴', '复眼凝视',
  '迷唇飞吻', '眼镜蛇威吓', '臭泥巨浪', '剧毒泥沼', '瓦斯爆破', '双弹齐爆', '岩石利刃',
]);
function isContactMove(move) {
  if (!move || typeof move !== 'object') return false;
  const name = move.name || '';
  if (NON_CONTACT_MOVES.has(name)) return false;
  // damage_class 缺失时按 moveCategory 回落（与 moveCategory 同口径）：原创招式在生产里
  // damage_class 为 undefined（只官方招带），不回落则 292 原创招永远不触发接触。
  const cat = move.damage_class || moveCategory(move);
  return cat === 'physical';
}
// 阶段倍率：>=0 时 (2+s)/2，<0 时 2/(2-s)。s 取整钳制在 -6..+6。
function stageMult(s) {
  const v = Math.max(-6, Math.min(6, Math.round(s || 0)));
  return v >= 0 ? (2 + v) / 2 : 2 / (2 - v);
}
// 防御性补全：旧存量对局/旧存档的宠可能没有 stages/status 字段。
function stagesOf(pet) {
  if (!pet) return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  if (!pet.stages || typeof pet.stages !== 'object') pet.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  for (const k of STAGE_KEYS) if (typeof pet.stages[k] !== 'number') pet.stages[k] = 0;
  return pet.stages;
}
function resetStages(pet) {
  if (!pet) return;
  pet.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
}
// 昏厥时清除状态与阶段（不推事件）；下场换宠时只清阶段（onPetLeavesField 处理状态）。
function clearPetBattleState(pet) {
  if (!pet) return;
  pet.status = null;
  pet.flashFire = false; // 引火标记随昏厥清除。
  resetStages(pet);
}
// 改档：返回 {applied, blocked, guard, from, to}。守卫挡下时不改档。
function changeStage(pet, key, delta) {
  const st = stagesOf(pet);
  const from = st[key];
  let blocked = false, guard = null;
  if (delta < 0) {
    const ab = abilityOf(pet.no);
    if (ab === '恒净之躯') { blocked = true; guard = '恒净之躯'; }
    else if (ab === '怪力钳' && key === 'atk') { blocked = true; guard = '怪力钳'; }
  }
  if (blocked) return { applied: false, blocked: true, guard, from, to: from };
  const to = Math.max(-6, Math.min(6, from + delta));
  st[key] = to;
  return { applied: to !== from, blocked: false, guard: null, from, to };
}
// 天气（第三期简化版，D7/D8）：晴/雨两态，关卡设定、整场持续。沙暴/冰雹、天气招式、特性触发均不做。
const WEATHER_LABEL = { sun: '大晴天', rain: '下雨', sand: '沙暴' };
function weatherPowerMod(kind, moveType) {
  if (kind === 'sun') return moveType === '火' ? 1.5 : moveType === '水' ? 0.5 : 1;
  if (kind === 'rain') return moveType === '水' ? 1.5 : moveType === '火' ? 0.5 : 1;
  return 1;
}
// 速度（D6）：只用于道馆出招顺序；PvP 不看速度（先后手按行动顺序）。
// 天气速度加成（叶绿素晴天×2、悠游自如雨天×2）只影响道馆，由调用方传天气。
function effectiveSpeed(pet, weatherKind) {
  if (!pet || !pet.stats) return 0;
  let v = pet.stats.speed * stageMult(stagesOf(pet).spe);
  if (pet.status && pet.status.kind === 'paralysis') v *= 0.5;
  const ab = abilityOf(pet.no);
  if (weatherKind === 'sun' && ab === '叶绿素') v *= 2;
  else if (weatherKind === 'rain' && ab === '悠游自如') v *= 2;
  return v;
}
// 对手的各席（道馆/PvP：另一方；合作：BOSS 的对手是 A、B；A/B 的对手是 BOSS）。
function foeSidesOf(st, side) {
  if (side === 'BOSS') return ['A', 'B'];
  if (st && st.sides && st.sides.BOSS) return ['BOSS'];
  return [side === 'A' ? 'B' : 'A'];
}
// 威吓出场钩子：side 的上场宠若带威吓，降对方上场宠 1 档攻击。对方无宠/已昏厥/被守卫挡下时
// 按规则推事件（挡下推守卫事件；对方无宠时不推）。在 createBattleState、换宠顶上、PvP 加入时调用。
function triggerSwitchIn(st, side, events) {
  const pet = activePetOf(st, side);
  if (!pet || !(pet.hp > 0) || abilityOf(pet.no) !== '威吓') return;
  for (const foeSide of foeSidesOf(st, side)) {
    const foePet = activePetOf(st, foeSide);
    if (!foePet || !(foePet.hp > 0)) continue;
    const r = changeStage(foePet, 'atk', -1);
    if (r.blocked) {
      events.push({ type: 'ability', side: foeSide, pet: foePet.name, ability: r.guard, text: `「${r.guard}」发动！${foePet.name} 的攻击不会降低！` });
    } else if (r.applied) {
      events.push({ type: 'ability', side, pet: pet.name, ability: '威吓', text: `「威吓」发动！${pet.name} 出场，${foePet.name} 的攻击降低了！` });
    }
  }
}
// 下场钩子（主动换宠时调用）：清阶段；自然回复下场时清除状态并推事件。昏厥不走这里。
function onPetLeavesField(st, side, pet, events) {
  if (!pet) return;
  resetStages(pet);
  pet.flashFire = false; // 引火（扩到 141）：标记只在场上有效，离场清除。
  if (pet.status && abilityOf(pet.no) === '自然回复') {
    const kind = pet.status.kind;
    pet.status = null;
    events.push({ type: 'ability', side, pet: pet.name, ability: '自然回复', text: `「自然回复」发动！${pet.name} 下场后恢复了健康，${STATUS_LABEL[kind]}治愈了！` });
  }
}
// 状态免疫：返回 null=可挂；'type'=属性免疫（毒/钢免中毒、电免麻痹、火免灼伤）；
// 'ability'=特性守卫（免疫挡中毒、柔软挡麻痹、干劲/不眠挡睡眠、叶子防守晴天挡四种）。
// weatherKind：叶子防守只在大晴天（'sun'）挡；无天气/雨天不挡（天气简化版只有晴/雨两态）。
function statusImmunityReason(pet, kind, weatherKind) {
  if (!pet) return null;
  const types = pet.defTypes && pet.defTypes.length ? pet.defTypes : [pet.type];
  if (kind === 'poison' && (types.includes('毒') || types.includes('钢'))) return 'type';
  if (kind === 'paralysis' && types.includes('电')) return 'type';
  if (kind === 'burn' && types.includes('火')) return 'type';
  const ab = abilityOf(pet.no);
  if (kind === 'poison' && ab === '免疫') return 'ability';
  if (kind === 'paralysis' && ab === '柔软') return 'ability';
  if (kind === 'sleep' && (ab === '干劲' || ab === '不眠')) return 'ability';
  // 扩到 165：叶子防守——大晴天时不陷入任何异常状态（中毒/麻痹/灼伤/睡眠四种全挡）。
  if (ab === '叶子防守' && weatherKind === 'sun') return 'ability';
  return null;
}
// 低层挂状态：返回 null=无事发生（已有状态/昏厥）；{blocked, event} 被免疫挡下；
// {inflicted, event} 挂上。睡眠 1–3 回合随机，早起减半（ceil，最少 1）。不同步。
// weatherKind 透传 statusImmunityReason（叶子防守只在晴天挡；不传则按无天气处理）。
function tryInflictStatus(targetPet, kind, rng, targetSide, weatherKind) {
  if (!targetPet || !(targetPet.hp > 0) || targetPet.status) return null;
  const blocked = statusImmunityReason(targetPet, kind, weatherKind);
  if (blocked) {
    if (blocked === 'ability') {
      const guard = abilityOf(targetPet.no);
      return { blocked: true, event: { type: 'ability', side: targetSide, pet: targetPet.name, ability: guard, text: `「${guard}」发动！${targetPet.name} 不会${STATUS_LABEL[kind]}！` } };
    }
    return { blocked: true, event: { type: 'status', side: targetSide, pet: targetPet.name, kind: 'immune', text: `${targetPet.name} 不会${STATUS_LABEL[kind]}！` } };
  }
  let sleepTurns = 0;
  if (kind === 'sleep') {
    sleepTurns = 1 + Math.floor(rollRng(rng) * 3);
    if (abilityOf(targetPet.no) === '早起') sleepTurns = Math.max(1, Math.ceil(sleepTurns / 2));
  }
  targetPet.status = sleepTurns ? { kind, sleepTurns } : { kind };
  return { inflicted: true, event: { type: 'status', side: targetSide, pet: targetPet.name, kind, text: `${targetPet.name} ${STATUS_LABEL[kind]}了！` } };
}
// 挂状态＋特性文案＋同步回传（只传一次，不连锁）。causeAbility 为触发特性名（静电/毒刺/孢子/火焰之躯）。
// weatherKind 透传 tryInflictStatus（叶子防守只在晴天挡；同步回传的第二次挂状态同样受挡）。
function applyStatusInflict(targetPet, sourcePet, kind, causeAbility, rng, events, targetSide, sourceSide, weatherKind) {
  const r = tryInflictStatus(targetPet, kind, rng, targetSide, weatherKind);
  if (!r) return false;
  if (r.blocked) { events.push(r.event); return false; }
  events.push({ type: 'ability', side: sourceSide, pet: sourcePet.name, ability: causeAbility, text: `「${causeAbility}」发动！${sourcePet.name} 让 ${targetPet.name} ${STATUS_LABEL[kind]}了！` });
  events.push(r.event);
  // 同步：受状态方有同步时，把状态传给对方（只传一次，不连锁）。
  if (abilityOf(targetPet.no) === '同步' && sourcePet && sourcePet !== targetPet) {
    const r2 = tryInflictStatus(sourcePet, kind, rng, sourceSide, weatherKind);
    if (r2) {
      if (r2.inflicted) {
        events.push({ type: 'ability', side: targetSide, pet: targetPet.name, ability: '同步', text: `「同步」发动！${targetPet.name} 把${STATUS_LABEL[kind]}传给了 ${sourcePet.name}！` });
        events.push(r2.event);
      } else if (r2.blocked) events.push(r2.event);
    }
  }
  return true;
}
// 接触触发：伤害结算后、昏厥判定后调用。仅防守方存活（hp>0）且招式为接触时掷 30%。
// 静电→麻痹、毒刺→中毒、火焰之躯→灼伤；孢子 30% 触发后三态随机（各 1/3）。
// 按宠引用传参（不从 st 取上场宠）：昏厥顶上后上场宠已变，触发对象应是被打中的那只。
// weatherKind 透传 applyStatusInflict（叶子防守只在晴天挡；调用方从 st.weather 取）。
function applyContactTrigger(atkPet, defPet, move, rng, events, atkSide, defSide, weatherKind) {
  if (!atkPet || !defPet || !(defPet.hp > 0) || !(atkPet.hp > 0)) return;
  if (!isContactMove(move)) return;
  const ab = abilityOf(defPet.no);
  let kind = null;
  if (ab === '静电') kind = 'paralysis';
  else if (ab === '毒刺') kind = 'poison';
  else if (ab === '火焰之躯') kind = 'burn';
  else if (ab === '孢子') {
    if (rollRng(rng) >= 0.3) return;
    const pick = rollRng(rng);
    kind = pick < 1 / 3 ? 'paralysis' : pick < 2 / 3 ? 'poison' : 'sleep';
    applyStatusInflict(atkPet, defPet, kind, ab, rng, events, atkSide, defSide, weatherKind);
    return;
  } else return;
  if (rollRng(rng) >= 0.3) return;
  applyStatusInflict(atkPet, defPet, kind, ab, rng, events, atkSide, defSide, weatherKind);
}
// 行动阻断：睡眠直接跳过（不消耗回合计数外的 rng）；麻痹 25% 无法行动。
// 返回 null=可行动；'sleep'/'paralysis'=被阻断。
function statusBlocksAction(pet, rng) {
  if (!pet || !pet.status) return null;
  if (pet.status.kind === 'sleep') return 'sleep';
  if (pet.status.kind === 'paralysis' && rollRng(rng) < 0.25) return 'paralysis';
  return null;
}
// 回合末结算（单宠）：中毒/灼伤扣 max(1, floor(maxHp/8))；蜕皮回合末 33% 治愈
// （扣血之后判、昏厥不治愈）；睡眠计数减 1、到 0 醒来。返回 {dmg, cured, woke}。
function settleStatusTick(pet, rng, events, side) {
  if (!pet || !(pet.hp > 0) || !pet.status) return { dmg: 0, cured: false, woke: false };
  const kind = pet.status.kind;
  let dmg = 0, cured = false, woke = false;
  if (kind === 'poison' || kind === 'burn') {
    dmg = Math.max(1, Math.floor(pet.maxHp / 8));
    pet.hp = Math.max(0, pet.hp - dmg);
    events.push({ type: 'status', side, pet: pet.name, kind, text: kind === 'poison' ? `${pet.name} 受到了毒的伤害！（-${dmg}）` : `${pet.name} 受到了灼伤的伤害！（-${dmg}）` });
  }
  if (pet.hp <= 0) return { dmg, cured: false, woke: false };
  if (abilityOf(pet.no) === '蜕皮' && pet.status && rollRng(rng) < 1 / 3) {
    const k2 = pet.status.kind;
    pet.status = null;
    cured = true;
    events.push({ type: 'ability', side, pet: pet.name, ability: '蜕皮', text: `「蜕皮」发动！${pet.name} 的${STATUS_LABEL[k2]}治愈了！` });
  }
  if (pet.status && pet.status.kind === 'sleep') {
    pet.status.sleepTurns -= 1;
    if (pet.status.sleepTurns <= 0) {
      pet.status = null;
      woke = true;
      events.push({ type: 'status', side, pet: pet.name, kind: 'wake', text: `${pet.name} 醒来了！` });
    }
  }
  return { dmg, cured, woke };
}
// 回合末结算（全场）：按 sides 顺序结算各方上场宠的状态。返回昏厥的 [{side, pet}]（不推 faint 事件，调用方处理）。
function tickActiveStatuses(st, rng, events) {
  const fainted = [];
  if (!st || !st.sides) return fainted;
  const weatherKind = st.weather && st.weather.kind;
  for (const side of Object.keys(st.sides)) {
    const pet = activePetOf(st, side);
    if (!pet) continue;
    const before = pet.hp;
    settleStatusTick(pet, rng, events, side);
    if (weatherKind === 'sand' && pet.hp > 0) {
      const types = pet.defTypes || [pet.type];
      const immune = types.some((t) => t === '岩石' || t === '地面' || t === '钢');
      if (!immune) {
        const dmg = Math.max(1, Math.floor(pet.maxHp / 16));
        pet.hp = Math.max(0, pet.hp - dmg);
        events.push({ type: 'weather', kind: 'sand', side, pet: pet.name, text: `沙暴！${pet.name} 受到了沙暴的伤害！（-${dmg}）` });
      }
    }
    if (before > 0 && pet.hp <= 0) fainted.push({ side, pet });
  }
  return fainted;
}
// 避雷针/电气引擎升档：calcDamage 的免疫条目带 stage 时，调用方统一应用（仿 applyAbilityHeal）。
function applyAbilityStages(defPet, abilityEntries) {
  for (const e of abilityEntries || []) {
    if (e && e.stage && e.stage.key) {
      const r = changeStage(defPet, e.stage.key, e.stage.delta);
      if (r.applied) e.stageApplied = true;
    }
  }
}
// 引火（扩到 141）：calcDamage 的免疫条目带 flashFire 时，调用方统一给防守方挂标记（仿 applyAbilityStages）。
function applyAbilityFlashFire(defPet, abilityEntries) {
  for (const e of abilityEntries || []) {
    if (e && e.flashFire) defPet.flashFire = true;
  }
}

function calcDamage(move, atkPet, defPet, rng = Math.random, opts = null) {
  const power = Number(move && move.power);
  if (!Number.isFinite(power) || power <= 0) return { error: 'INVALID_MOVE_POWER' };
  // 官方分支优先采用表内属性，经典分支仍采用招式自身属性。
  const official = opts && opts.chart === 'official';
  const effectiveType = official ? (officialMove(move.name)?.type ?? move.type) : move.type;
  const cat = moveCategory(move);
  // 特性免疫（飘浮/储水/蓄电）：在克制计算之前短路（mult=0 路径，不消耗随机数）。
  // 变化招式（无伤害、无 effect）不吃免疫——比如寄生种子仍按旧逻辑走。
  const atkAbility = abilityOf(atkPet && atkPet.no);
  const defAbility = abilityOf(defPet && defPet.no);
  const immunity = (cat !== 'status' || moveEffectOf(move.name))
    ? abilityImmunity(defAbility, effectiveType) : null;
  if (immunity) {
    const heal = immunity.heal ? Math.floor(defPet.maxHp / 4) : 0;
    // 2a：避雷针/电气引擎的升档信息随条目返回（仅升档时带 stage 字段），调用方用 applyAbilityStages 应用。
    const entry = { name: defAbility, kind: 'immune', side: 'def', pet: defPet.name, moveType: effectiveType, heal };
    if (immunity.stage) entry.stage = immunity.stage;
    // 扩到 141：引火的标记随条目返回，调用方用 applyAbilityFlashFire 挂到防守方身上。
    if (immunity.flashFire) entry.flashFire = true;
    return {
      dmg: 0, mult: 0, critical: false,
      ability: [entry],
    };
  }
  const defs = defPet.defTypes || [defPet.type];
  const mult = official ? typeMultOfficialMulti(effectiveType, defs) : typeMult(move.type, defs[0]);
  if (mult === 0) return { dmg: 0, mult: 0, critical: false, ability: [] };
  if (cat === 'status' && !moveEffectOf(move.name)) return { dmg: 0, mult, critical: false, ability: [] };
  const ability = [];
  // 仅官方伤害招检定命中；免疫与变化招早返回不消耗随机数。
  const accuracy = official && cat !== 'status' ? officialAccuracy(move.name) : null;
  if (Number.isFinite(accuracy)) {
    // 友好度闪避（≥204 时 +5%）只动官方分支这一行；经典分支不做命中检定、不吃闪避加成。
    const dodge = (opts && opts.dodgePct) || 0;
    if (!(rollRng(rng) * 100 < accuracy - dodge)) {
      return { dmg: 0, mult, critical: false, missed: true, ability };
    }
  }
  // 低血量同系强化（茂盛/猛火/激流/虫之预感）：HP≤1/3 且特性类型＝招式类型时威力×1.5。
  const lowHpType = LOW_HP_ABILITY_TYPE[atkAbility];
  let effPower = power;
  if (lowHpType && lowHpType === effectiveType && atkPet.hp * 3 <= atkPet.maxHp) {
    effPower = power * 1.5;
    ability.push({ name: atkAbility, kind: 'lowhp', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  // 引火（扩到 141）：已吸收过火招的宠，自身火属性招式威力×1.5，直到离场。
  if (atkAbility === '引火' && atkPet.flashFire && effectiveType === '火') {
    effPower = effPower * 1.5;
    ability.push({ name: atkAbility, kind: 'flashfire', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  // 天气（第三期简化版，plan §5.1 威力修正段，与低血量组同段）：晴天火×1.5/水×0.5，雨天水×1.5/火×0.5。
  const weatherMod = weatherPowerMod((opts && opts.weather) || null, effectiveType);
  if (weatherMod !== 1) {
    effPower = effPower * weatherMod;
    ability.push({ name: (opts.weather === 'sun' ? '大晴天' : '下雨'), kind: 'weather', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  let base;
  if (atkPet.stats && defPet.stats) {
    // 2a：能力阶段进 A/D 比值（攻击方 atk/spa、防守方 def/spd）。
    const atkStageKey = cat === 'physical' ? 'atk' : 'spa';
    const defStageKey = cat === 'physical' ? 'def' : 'spd';
    let A = (cat === 'physical' ? atkPet.stats.attack : atkPet.stats.sp_attack) * stageMult(stagesOf(atkPet)[atkStageKey]);
    let D = (cat === 'physical' ? defPet.stats.defense : defPet.stats.sp_defense) * stageMult(stagesOf(defPet)[defStageKey]);
    // 沙暴天气（第二步）：特殊攻击时，若防守方含岩石属性，特防 D × 1.5
    const weatherKind = (opts && opts.weather) || null;
    const defTypes = defPet.defTypes || [defPet.type];
    if (weatherKind === 'sand' && cat === 'special' && defTypes.includes('岩石')) {
      D *= 1.5;
      ability.push({ name: '沙暴', kind: 'weather', side: 'def', pet: defPet.name, moveType: effectiveType });
    }
    // 2b：灼伤物理攻击减半；毅力异常时物理攻击 ×1.5 且无视灼伤减半（都折进 A，攻击属性修正口径）。
    if (cat === 'physical') {
      if (atkAbility === '毅力' && atkPet.status) {
        A *= 1.5;
        ability.push({ name: atkAbility, kind: 'guts', side: 'atk', pet: atkPet.name, moveType: effectiveType });
      } else if (atkPet.status && atkPet.status.kind === 'burn') {
        A *= 0.5;
        ability.push({ name: '灼伤', kind: 'burn', side: 'atk', pet: atkPet.name, moveType: effectiveType });
      }
    }
    base = Math.floor(Math.floor(Math.floor(2 * atkPet.level / 5 + 2) * effPower * A / D) / 50) + 2;
  } else {
    // 缺少属性时保留旧线性基础伤害，官方 STAB 在后续统一应用。
    base = effPower * (0.5 + 0.05 * Math.max(1, Number(atkPet.level) || 1));
  }
  // 厚脂肪（防守方）：火/冰伤害×0.5，乘在克制之后、单次取整（只影响伤害，不改 mult）。
  let abilityDefMod = 1;
  if (defAbility === '厚脂肪' && (effectiveType === '火' || effectiveType === '冰')) {
    abilityDefMod = 0.5;
    ability.push({ name: defAbility, kind: 'thickfat', side: 'def', pet: defPet.name, moveType: effectiveType });
  }
  // 官方两条基础伤害路径统一乘 STAB，并使用整数百分比 85–100。
  let rolled;
  if (official) {
    const stab = (atkPet.defTypes || [atkPet.type]).includes(effectiveType) ? 1.5 : 1;
    const randomFactor = (85 + Math.floor(rollRng(rng) * 16)) / 100;
    rolled = Math.max(1, Math.round(base * stab * mult * abilityDefMod * randomFactor));
  } else {
    // 经典分支保留 opts.range、默认区间及原有取整口径。
    const range = (opts && Array.isArray(opts.range) && opts.range.length === 2) ? opts.range : [0.9, 1.1];
    rolled = Math.max(1, Math.round(base * mult * (range[0] + rollRng(rng) * (range[1] - range[0])) * abilityDefMod));
  }
  // 暴击参数：默认全局口径（道馆/合作）；PvP 经 opts.critRate/critMult 覆盖
  const critRate = (opts && Number.isFinite(opts.critRate)) ? opts.critRate : CRIT_RATE;
  const critMult = (opts && Number.isFinite(opts.critMult)) ? opts.critMult : CRIT_MULT;
  // 硬壳盔甲（防守方）：仍掷一次随机数、强制不暴击（随机数消耗不变）。
  const critical = defAbility === '硬壳盔甲' ? (rollRng(rng), false) : rollRng(rng) < critRate;
  const dmg = critical ? Math.max(1, Math.round(rolled * critMult)) : rolled;
  return { dmg, mult, critical, ability };
}

function makePet({ key, name, type, no = null, img = null, level, moves, hpMult = 1, egg = null, defTypes = null }) {
  if (!TYPES.includes(type)) throw new TypeError(`PET_DATA_INVALID: unknown pet type ${type}`);
  if (defTypes != null) {
    if (!Array.isArray(defTypes) || defTypes.length === 0 || defTypes.some((t) => typeof t !== 'string' || (!TYPES.includes(t) && t !== '超能力' && t !== '毒'))) throw new TypeError('PET_DATA_INVALID: defTypes must be a non-empty array of official defense types');
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
  return { key, name, type, no, img, level, stats, maxHp, hp: maxHp, moves: normMoves, egg, defTypes: defTypes ? [...defTypes] : [type], ability: abilityOf(no), stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: null, flashFire: false };
}

function createBattleState({ mode, firstSide, sides, weather }) {
  if (firstSide !== 'A' && firstSide !== 'B') throw new TypeError(`INVALID_FIRST_SIDE: ${firstSide}`);
  const st = {
    v: 1, mode, firstSide, turn: firstSide, turnNo: 1,
    acted: { A: 0, B: 0 }, winner: null, sides, log: [],
    // 天气（第三期简化版）：关卡设定、整场持续不计回合；PvP/合作/野外传 null。旧存量对局无此字段，resolveGymRound 里默认 null。
    weather: { kind: weather || null },
    // 道馆改版专用：记录玩家上一回合的行动类别（馆主 AI 惩罚龟壳要读）；PvP 不带此字段
    ...(mode === 'gym' ? { gym: { lastPlayerKind: null } } : {}),
  };
  // 2a：开局触发威吓（双方上场宠各触发一次；对方无宠时不推事件）。
  const openEvents = [];
  // 天气开局文案（有天气时先于威吓写进日志）。
  if (st.weather.kind === 'sun') openEvents.push({ type: 'weather', kind: 'sun', text: '大晴天！阳光照耀着对战场，火属性招式威力提升、水属性招式威力减弱！' });
  else if (st.weather.kind === 'rain') openEvents.push({ type: 'weather', kind: 'rain', text: '下起雨了！水属性招式威力提升、火属性招式威力减弱！' });
  else if (st.weather.kind === 'sand') openEvents.push({ type: 'weather', kind: 'sand', text: '沙暴天气扬起了满天风沙！岩石属性宝可梦的特防提升，非岩/地/钢属性宝可梦会受到沙暴伤害！' });
  triggerSwitchIn(st, 'A', openEvents);
  triggerSwitchIn(st, 'B', openEvents);
  pushLog(st, openEvents);
  return st;
}

function activePetOf(st, side) {
  const s = st && st.sides ? st.sides[side] : null;
  if (!s || !Array.isArray(s.pets) || s.pets.length === 0) return undefined;
  return s.pets[s.activeIdx || 0];
}

function canSideAttack(st, side) {
  return !(side === st.firstSide && (st.acted[side] || 0) === 0);
}

function pushLog(st, events) {
  st.log.push(...events);
  if (st.log.length > 40) st.log = st.log.slice(-40);
}

/* 一次行动收尾：记行动数、无赢家时换回合、写战况日志 */
function finishAction(st, side, events) {
  const foeSide = side === 'A' ? 'B' : 'A';
  st.acted[side] = (st.acted[side] || 0) + 1;
  if (!st.winner) { st.turn = foeSide; st.turnNo += 1; }
  pushLog(st, events);
  return { events };
}

/* 伤害扣减之后：昏厥换宠/分出胜负，再收尾（即时结算与防守结算共用） */
function settleAfterDamage(st, side, events, rng = Math.random) {
  const foeSide = side === 'A' ? 'B' : 'A';
  const foe = st.sides ? st.sides[foeSide] : null;
  const target = activePetOf(st, foeSide);
  if (foe && target && target.hp <= 0) {
    events.push({ type: 'faint', side: foeSide, pet: target.name, text: `${target.name} 倒下了！` });
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(target);
    const nextIdx = foe.pets.findIndex((pet2) => pet2.hp > 0);
    if (nextIdx >= 0) {
      foe.activeIdx = nextIdx;
      events.push({ type: 'swap', side: foeSide, pet: foe.pets[nextIdx].name, text: `${foe.pets[nextIdx].name} 上场啦！` });
      // 2a：顶上的宠若带威吓，降对方攻击。
      triggerSwitchIn(st, foeSide, events);
    } else {
      st.winner = side;
      events.push({ type: 'win', side, text: `${st.sides[side].childName} 赢啦！🎉` });
    }
  }
  // 2b：PvP 回合末结算（双方上场宠的状态扣血/治愈/睡眠计数）。PvP 每行动一次结算一次与道馆
  // 每回合一次不同——为与道馆对齐，每回合只在后手方行动后结算一次（side !== firstSide）。
  // 非伤害行动（变化招/落空/被状态阻断）不触发，状态结算最多顺延一回合。扣血致昏厥时
  // 换宠或分胜负（不吃硬撑）。
  if (!st.winner && side !== st.firstSide) {
    const fainted = tickActiveStatuses(st, rng, events);
    for (const { side: fSide, pet: fPet } of fainted) {
      events.push({ type: 'faint', side: fSide, pet: fPet.name, text: `${fPet.name} 倒下了！` });
      clearPetBattleState(fPet);
      const sd = st.sides[fSide];
      const nextIdx = sd.pets.findIndex((p) => p.hp > 0);
      if (nextIdx >= 0) {
        sd.activeIdx = nextIdx;
        events.push({ type: 'swap', side: fSide, pet: sd.pets[nextIdx].name, text: `${sd.pets[nextIdx].name} 上场啦！` });
        triggerSwitchIn(st, fSide, events);
      } else {
        st.winner = fSide === 'A' ? 'B' : 'A';
        events.push({ type: 'win', side: st.winner, text: `${st.sides[st.winner].childName} 赢啦！🎉` });
      }
    }
  }
  return finishAction(st, side, events);
}

/* 执行一方的动作。moveName 为 null = 明确跳过（仅先攻首回合允许）。
 * 返回 {events} 或 {error}；state 原地推进。opts 透传 calcDamage（PvP 兜底结算传 PvP 暴击）。 */
function applyBattleAction(st, side, moveName, rng = Math.random, opts = null) {
  if (st.winner) return { error: 'BATTLE_OVER' };
  if (st.turn !== side) return { error: 'NOT_YOUR_TURN' };
  const me = st.sides ? st.sides[side] : null;
  const foeSide = side === 'A' ? 'B' : 'A';
  const foe = st.sides ? st.sides[foeSide] : null;
  if (!me || !foe) return { error: 'NO_ACTIVE_PET' }; // 状态损坏（缺一方队伍）时明确报错，不抛异常
  const events = [];
  // 先攻方第一个回合不能出招：任何提交都按跳过处理（PTCG 规则）
  if (!canSideAttack(st, side)) {
    events.push({ type: 'skip_first', side, text: `${me.childName} 是先攻方，第一个回合先热身，不能出招！` });
    return finishAction(st, side, events);
  }
  if (!moveName) return { error: 'MUST_CHOOSE_MOVE' };
  const pet = activePetOf(st, side);
  if (!pet || !(pet.hp > 0)) return { error: 'NO_ACTIVE_PET' }; // hp 非有限数（NaN）同样按无可用宠处理
  const move = Array.isArray(pet.moves) ? pet.moves.find((m) => m.name === moveName) : null;
  if (!move) return { error: 'MOVE_NOT_LEARNED' };
  const target = activePetOf(st, foeSide);
  if (!target) return { error: 'NO_ACTIVE_PET' };
  // 2b：行动阻断——睡眠直接跳过、麻痹 25% 无法行动（本回合已消耗）。
  const blocked = statusBlocksAction(pet, rng);
  if (blocked) {
    events.push({ type: 'status', side, pet: pet.name, kind: blocked, text: blocked === 'sleep' ? `${pet.name} 睡着了，不能行动！` : `${pet.name} 麻痹了，动不了！` });
    return finishAction(st, side, events);
  }
  // 变化类招式：不造成伤害，挂一次性效果后结束本回合
  const eff = moveEffectOf(move.name);
  if (eff && eff !== 'drain') {
    applyEffectFlag(st, side, eff, move.skillLevel || 1);
    events.push({ type: 'effect', side, kind: eff, move: move.name, text: effectEventText(eff, pet.name, move.name) });
    return finishAction(st, side, events);
  }
  // 干扰落空：攻击方带着 smoke 标记时按该标记的技能等级查表打空（标记无论结果都消耗）
  if (fxOf(st, side).smoke) {
    const smokeLv = (typeof fxLvOf(st, side).smoke === 'number' ? skillLevelOf({ x: fxLvOf(st, side).smoke }, 'x') : 1);
    delete fxOf(st, side).smoke; delete fxLvOf(st, side).smoke;
    if (rollRng(rng) < SKILL_SMOKE_MISS[smokeLv - 1]) {
      events.push({ type: 'miss', side, move: move.name, text: `${pet.name} 用了「${move.name}」，却打中了烟幕和分身——落空啦！` });
      return finishAction(st, side, events);
    }
  }
  const dmgRes = calcDamage(move, pet, target, rng, opts);
  if (dmgRes.error) return { error: dmgRes.error }; // state 尚未改动，直接返回
  const modded = consumeAttackMods(st, side, dmgRes.dmg);
  const dmg = modded.dmg;
  const mult = dmgRes.mult;
  // 已污染的 target.hp（非有限数）按 0 处理：本击结算后走正常昏厥/换宠/胜负流程，让卡死对局能结束
  if (typeof target.hp !== 'number' || !Number.isFinite(target.hp)) target.hp = 0;
  target.hp = Math.max(0, target.hp - dmg);
  const mods = Array.isArray(modded.mods) ? modded.mods.slice() : [];
  if (eff === 'drain' && dmg > 0) {
    const healed = drainHeal(pet, dmg);
    if (healed > 0) mods.push(`吸取回复 ${healed}`);
  }
  // 特性吸取回复（储水/蓄电免疫时）在昏厥判定之前结算；特性触发事件在攻击事件之前。
  const abilityHeal = applyAbilityHeal(target, dmgRes.ability);
  // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
  applyAbilityStages(target, dmgRes.ability);
  // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
  applyAbilityFlashFire(target, dmgRes.ability);
  events.push(...abilityEvents(dmgRes.ability || [], side, foeSide, abilityHeal));
  events.push({
    type: 'attack', side, pet: pet.name, move: move.name, moveType: move.type,
    dmg, mult, superEffective: mult > 1, resisted: mult > 0 && mult < 1, immune: mult === 0, critical: dmgRes.critical === true, target: target.name, targetHp: target.hp,
    text: mult === 0 ? `${pet.name} 用了「${move.name}」！没有效果！` : `${pet.name} 用了「${move.name}」！${dmgRes.critical ? '会心一击！' : ''}${mult > 1 ? '效果拔群！（×2）' : mult > 0 && mult < 1 ? '效果不好…（×0.5）' : ''}对 ${target.name} 造成 ${dmg} 点伤害。${mods.length ? `（${mods.join('、')}）` : ''}`,
    mods,
  });
  // 2b：接触触发（伤害结算后、昏厥判定后；仅造成伤害、防守方存活且招式为接触时掷 30%）。
  if (dmg > 0) applyContactTrigger(pet, target, move, rng, events, side, foeSide, (st.weather && st.weather.kind) || null);
  return settleAfterDamage(st, side, events, rng);
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
  '求雨': 'charge',
};

// 吸取：攻击方出战宠回复「实际造成伤害的一半（向下取整）」，不超过 maxHp；返回实际回复量
function drainHeal(pet, dmg) {
  // 吸取回复＝造成伤害的一半（上限 maxHp）；与特性吸取共用 healPet。
  return healPet(pet, Math.floor((Number(dmg) || 0) / 2));
}
function moveEffectOf(moveName) { return MOVE_EFFECTS[moveName] || null; }
function fxOf(st, side) {
  if (!st.fx) st.fx = { A: {}, B: {} };
  if (!st.fx[side]) st.fx[side] = {};
  return st.fx[side];
}
function effectEventText(kind, petName, moveName) {
  if (kind === 'weak') return `${petName} 用了「${moveName}」！对方心软啦，下一次攻击伤害降低。`;
  if (kind === 'charge') return `${petName} 用了「${moveName}」！全身蓄满了力，下一次攻击更强。`;
  if (kind === 'smoke') return `${petName} 用了「${moveName}」！烟幕与分身笼罩，对方下一次攻击可能落空。`;
  return `${petName} 用了「${moveName}」！缩起来防御，下一次受到的伤害减半。`;
}
/* 把效果标记挂到对应一方（weak/smoke 挂给对手，charge/shell 挂给自己） */
function fxLvOf(st, side) {
  if (!st.fxLv) st.fxLv = { A: {}, B: {} };
  if (!st.fxLv[side]) st.fxLv[side] = {};
  return st.fxLv[side];
}
/* 标记本身保持布尔值（旧断言 fx.A.shell === true 不变），技能等级另存 fxLv，不进 battleView 的 fx 字段 */
function applyEffectFlag(st, side, kind, skillLevel = 1) {
  const lv = skillLevelOf({ x: skillLevel }, 'x');
  const foeSide = side === 'A' ? 'B' : 'A';
  const target = (kind === 'weak' || kind === 'smoke') ? foeSide : side;
  fxOf(st, target)[kind] = true;
  fxLvOf(st, target)[kind] = lv;
}
/* 攻击命中结算前消费攻击方/防守方的一次性标记，返回修正后伤害与说明 */
function consumeAttackMods(st, side, dmg) {
  if (dmg <= 0) return { dmg: 0, mods: [] };
  const foeSide = side === 'A' ? 'B' : 'A';
  const myFx = fxOf(st, side);
  const foeFx = fxOf(st, foeSide);
  const mods = [];
  let out = dmg;
  const lvOf = (sd, kind) => { const v = fxLvOf(st, sd)[kind]; return (typeof v === 'number' ? skillLevelOf({ x: v }, 'x') : 1); };
  if (myFx.charge) { const lv = lvOf(side, 'charge'); delete myFx.charge; delete fxLvOf(st, side).charge; out = Math.max(1, Math.round(out * SKILL_CHARGE_MULT[lv - 1])); mods.push('蓄力爆发'); }
  if (myFx.weak) { const lv = lvOf(side, 'weak'); delete myFx.weak; delete fxLvOf(st, side).weak; out = Math.max(1, Math.round(out * SKILL_WEAK_MULT[lv - 1])); mods.push('被弱化'); }
  if (foeFx.shell) { const lv = lvOf(foeSide, 'shell'); delete foeFx.shell; delete fxLvOf(st, foeSide).shell; out = Math.max(1, Math.round(out * SKILL_SHELL_MULT[lv - 1])); mods.push('对方防御中'); }
  return { dmg: out, mods };
}

/* 防守四档（借鉴包 v1 §2 新增「守护」；2026-10-24 平衡调整：守护 ×0.9→×0.75，
 * 旧值只比答错少吃 10%、体感无差别；现四档减伤梯度 = 闪避 100%/格挡 50%/防御 33%/守护 25%，
 * 答对时期望保留比例 0.53→0.50）：权重 闪避20/格挡30/防御30/守护20 */
const DEFENSE_KINDS = [
  { kind: 'dodge', label: '闪避', ratio: 0, weight: 20 },
  { kind: 'block', label: '格挡', ratio: 0.5, weight: 30 },
  { kind: 'guard', label: '防御', ratio: 2 / 3, weight: 30 },
  { kind: 'ward', label: '守护', ratio: 0.75, weight: 20 },
];

/* 按权重抽一档防御（rng 可注入，确定性测试用） */
function pickDefenseKind(rng = Math.random) {
  const total = DEFENSE_KINDS.reduce((a, d) => a + d.weight, 0);
  let roll = rollRng(rng) * total;
  for (const d of DEFENSE_KINDS) {
    roll -= d.weight;
    if (roll < 0) return d;
  }
  return DEFENSE_KINDS[DEFENSE_KINDS.length - 1];
}

/* 只算不打：校验回合/招式并预演伤害（不改 state） */
function stagePvpAttack(st, side, moveName, rng = Math.random) {
  if (st.winner) return { error: 'BATTLE_OVER' };
  if (st.turn !== side) return { error: 'NOT_YOUR_TURN' };
  const me = st.sides ? st.sides[side] : null;
  const foeSide = side === 'A' ? 'B' : 'A';
  const foe = st.sides ? st.sides[foeSide] : null;
  if (!me || !foe) return { error: 'NO_ACTIVE_PET' };
  if (!moveName) return { error: 'MUST_CHOOSE_MOVE' };
  const pet = activePetOf(st, side);
  if (!pet || !(pet.hp > 0)) return { error: 'NO_ACTIVE_PET' };
  const move = Array.isArray(pet.moves) ? pet.moves.find((m) => m.name === moveName) : null;
  if (!move) return { error: 'MOVE_NOT_LEARNED' };
  const target = activePetOf(st, foeSide);
  if (!target) return { error: 'NO_ACTIVE_PET' };
  // 2b：行动阻断——睡眠直接跳过、麻痹 25% 无法行动（预演时检定，调用方走即时结算分支）。
  const blocked = statusBlocksAction(pet, rng);
  if (blocked) return { blocked, moveName: move.name, moveType: move.type, petName: pet.name, targetName: target.name };
  // 变化类招式：不预演伤害，交由调用方即时挂效果
  const eff = moveEffectOf(move.name);
  if (eff && eff !== 'drain') return { effectKind: eff, skillLevel: move.skillLevel || 1, moveName: move.name, moveType: move.type, petName: pet.name, targetName: target.name };
  // 干扰落空在预演时判定（标记消耗）；命中才继续算伤害修正
  let smokeMiss = false;
  if (fxOf(st, side).smoke) {
    const smokeLv = (typeof fxLvOf(st, side).smoke === 'number' ? skillLevelOf({ x: fxLvOf(st, side).smoke }, 'x') : 1);
    delete fxOf(st, side).smoke; delete fxLvOf(st, side).smoke;
    if (rollRng(rng) < SKILL_SMOKE_MISS[smokeLv - 1]) smokeMiss = true;
  }
  if (smokeMiss) return { smokeMiss: true, moveName: move.name, moveType: move.type, petName: pet.name, targetName: target.name };
  const dmgRes = calcDamage(move, pet, target, rng, { critRate: PVP_CRIT_RATE, critMult: PVP_CRIT_MULT });
  if (dmgRes.error) return { error: dmgRes.error };
  const modded = consumeAttackMods(st, side, dmgRes.dmg);
  return { moveName: move.name, moveType: move.type, petName: pet.name, targetName: target.name, dmg: modded.dmg, mult: dmgRes.mult, resisted: dmgRes.mult > 0 && dmgRes.mult < 1, immune: dmgRes.mult === 0, critical: dmgRes.critical === true, mods: modded.mods, drain: eff === 'drain', ability: dmgRes.ability || [] };
}

/* 挂起前的即时分支：变化招式挂效果 / 烟幕落空（都不进防守答题） */
function applyStagedEffect(st, staged) {
  applyEffectFlag(st, staged.attacker, staged.effectKind, staged.skillLevel || 1);
  const events = [{ type: 'effect', side: staged.attacker, kind: staged.effectKind, move: staged.moveName, text: effectEventText(staged.effectKind, staged.petName, staged.moveName) }];
  return finishAction(st, staged.attacker, events);
}
function applyStagedMiss(st, staged) {
  const events = [{ type: 'miss', side: staged.attacker, move: staged.moveName, text: `${staged.petName} 用了「${staged.moveName}」，却打中了烟幕和分身——落空啦！` }];
  return finishAction(st, staged.attacker, events);
}

/* 挂起前的即时分支：睡眠/麻痹导致无法行动（不进防守答题） */
function applyStagedBlocked(st, staged) {
  const events = [{ type: 'status', side: staged.attacker, pet: staged.petName, kind: staged.blocked, text: staged.blocked === 'sleep' ? `${staged.petName} 睡着了，不能行动！` : `${staged.petName} 麻痹了，动不了！` }];
  return finishAction(st, staged.attacker, events);
}
// 从 staged 对象（只有招式名/属性）重建接触判定用的最小招式对象。
function stagedMoveForContact(staged) {
  const name = staged.moveName;
  const cat = moveCategory({ name, type: staged.moveType });
  return { name, damage_class: cat };
}

/* 防守结算：按防守结果修正预演伤害，真正扣血并走昏厥/胜负收尾。
 * defense: {kind:'dodge'|'block'|'guard'} 答对触发；{skipped:true} 放弃；{correct:false} 答错。 */
function resolveStagedAttack(st, staged, defense, rng = Math.random) {
  const side = staged.attacker;
  const foeSide = side === 'A' ? 'B' : 'A';
  const foe = st.sides[foeSide];
  const target = activePetOf(st, foeSide);
  const events = [];
  let finalDmg = staged.dmg;
  if (defense && defense.kind) {
    const dk = DEFENSE_KINDS.find((d) => d.kind === defense.kind);
    if (dk) finalDmg = Math.floor(staged.dmg * dk.ratio);
  }
  if (defense) {
    if (defense.kind === 'dodge') events.push({ type: 'defense', side: foeSide, kind: 'dodge', text: `${foe.childName} 答对了问题——${target.name} 一个闪身躲开了！（闪避，本次 0 伤害）` });
    else if (defense.kind === 'block') events.push({ type: 'defense', side: foeSide, kind: 'block', text: `${foe.childName} 答对了问题——${target.name} 格挡成功，伤害减半！（${staged.dmg} → ${finalDmg}）` });
    else if (defense.kind === 'guard') events.push({ type: 'defense', side: foeSide, kind: 'guard', text: `${foe.childName} 答对了问题——${target.name} 摆好防御姿势，伤害减少三分之一！（${staged.dmg} → ${finalDmg}）` });
    else if (defense.kind === 'ward') events.push({ type: 'defense', side: foeSide, kind: 'ward', text: `${foe.childName} 答对了问题——守护之光笼罩 ${target.name}，伤害减少四分之一！（${staged.dmg} → ${finalDmg}）` });
    else if (defense.timedOut) events.push({ type: 'defense', side: foeSide, kind: 'timeout', text: `${foe.childName} 120 秒没有答题，防守超时啦！这一招按放弃防守结算。` });
    else if (defense.skipped) events.push({ type: 'defense', side: foeSide, kind: 'skipped', text: `${foe.childName} 放弃了防守，硬扛下这一招！` });
    else events.push({ type: 'defense', side: foeSide, kind: 'failed', text: `${foe.childName} 答错啦，没能防住这一招！` });
  }
  if (typeof target.hp !== 'number' || !Number.isFinite(target.hp)) target.hp = 0;
  target.hp = Math.max(0, target.hp - finalDmg);
  const mods = [...(staged.mods || [])];
  if (staged.drain === true) {
    const healed = drainHeal(activePetOf(st, side), finalDmg);
    if (healed > 0) mods.push(`吸取回复 ${healed}`);
  }
  // 特性吸取回复（储水/蓄电免疫时）在昏厥判定之前结算；特性触发事件在攻击事件之前。
  const abilityHeal = applyAbilityHeal(target, staged.ability);
  // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
  applyAbilityStages(target, staged.ability);
  // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
  applyAbilityFlashFire(target, staged.ability);
  events.push(...abilityEvents(staged.ability || [], side, foeSide, abilityHeal));
  // 文案（审查 S2）：最终伤害为 0（闪避/被完全防住）时不拼「会心一击！…造成 0 点伤害」的矛盾句
  const attackText = finalDmg > 0
    ? `${staged.petName} 用了「${staged.moveName}」！${staged.critical ? '会心一击！' : ''}${staged.mult > 1 ? '效果拔群！（×2）' : ''}对 ${target.name} 造成 ${finalDmg} 点伤害。${mods.length ? `（${mods.join('、')}）` : ''}`
    : `${staged.petName} 用了「${staged.moveName}」，被 ${target.name} 完全挡下啦，没有造成伤害！`;
  events.push({
    type: 'attack', side, pet: staged.petName, move: staged.moveName, moveType: staged.moveType,
    dmg: finalDmg, mult: staged.mult, superEffective: staged.mult > 1, critical: staged.critical === true, target: target.name, targetHp: target.hp,
    text: attackText,
    mods,
  });
  // 2b：接触触发（伤害结算后、昏厥判定后；仅造成伤害、防守方存活且招式为接触时掷 30%）。
  if (finalDmg > 0) applyContactTrigger(activePetOf(st, side), target, stagedMoveForContact(staged), rng, events, side, foeSide, (st.weather && st.weather.kind) || null);
  return settleAfterDamage(st, side, events, rng);
}

/* PvP 等级压平：双方按较低一方等级作战（招式不变，仅等级/HP 按压平等级重算；
 * HP 走 PvP 专用 pvpMaxHp（含 PVP_HP_MULT），不影响道馆/合作的 battleMaxHp 口径） */
// 有 stats 按实际 HP 乘 PvP 倍率，无 stats 回落旧口径。
function pvpPetHp(pet, flatLevel) {
  return pet.stats ? Math.round(pet.stats.hp * PVP_HP_MULT) : pvpMaxHp(flatLevel);
}

/* 任务 73：备战展示宠的体力（满血）——与 pvpPetHp 同口径（实际六围 × PvP 倍率，
 * 无六围回落 pvpMaxHp）；只作棋盘展示，不进战斗结算。 */
function pvpBenchHp(no, level) {
  const st = (no != null) ? statsFor(no, level) : null;
  if (st) return Math.round(st.hp * PVP_HP_MULT);
  return pvpMaxHp(level);
}

function flattenSideLevel(side, flatLevel) {
  side.battleLevel = flatLevel;
  for (const p of side.pets) {
    p.level = flatLevel;
    p.stats = (p.no != null) ? statsFor(p.no, flatLevel) : null;
    p.maxHp = pvpPetHp(p, flatLevel);
    p.hp = p.maxHp;
  }
  return side;
}

/* ---------------- 加密与鉴权工具 ---------------- */

async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randToken() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseCookies(req) {
  const o = {};
  const h = req.headers.get('Cookie') || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) {
      try { o[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
      catch { /* 畸形 Cookie 值解码失败就跳过该项，不能让一个坏 Cookie 打挂全部请求 */ }
    }
  }
  return o;
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
async function setSetting(db, key, value) {
  await db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key, value).run();
}

/* ---- 本地缓存完整版 · 同步版本（迁移 0020）----
 * 每孩子一个单调递增 sync_version 计数器（sync_versions 表）；每次写操作推进对应孩子的
 * 计数值，并把推进后的值写入受影响行的 ver 字段；增量查询用 ver > since。
 * updated_epoch 只作展示与冲突参考，不作同步游标。
 * 旧迁移链（未加载 0020）没有 sync_versions 表：bump 时捕获“no such table”并返回 0，
 * 调用方见版本为 0 即跳过置 ver——旧链测试不受影响，新链行为完整。 */

/* 22 张业务表的同步归属（供 GET /api/sync 用；child 列为 NULL 表示全局表）。
 * 特殊表：battles 用 child_a/child_b；pokedex 主键 (child_id, entry_key)；
 * oak_assessments 主键 (child_id, question_id, date_shanghai)；
 * oak_draws 主键 (child_id, date_shanghai)；quiz_daily 主键 (child_id, date_shanghai)；
 * checkin_photos 无 child_id 列，归属经 checkin_id → checkins.child_id；
 * unit_test_draws 无 child_id 列，归属经 unit_test_id → unit_tests.child_id。 */
const SYNC_TABLES = [
  { name: 'children', child: 'id' },
  { name: 'checkins', child: 'child_id' },
  { name: 'quiz_attempts', child: 'child_id' },
  { name: 'quiz_questions', child: null },
  { name: 'encounters', child: 'child_id' },
  { name: 'wheel_chances', child: 'child_id' },
  { name: 'quiz_daily', child: 'child_id' },
  { name: 'ball_drops', child: 'child_id' },
  { name: 'ball_grants', child: 'child_id' },
  { name: 'settings', child: null },
  { name: 'battles', child: null },
  { name: 'gym_battles', child: 'child_id' },
  { name: 'pokedex', child: 'child_id' },
  { name: 'sealed_eggs', child: 'child_id' },
  { name: 'child_notices', child: 'child_id' },
  { name: 'checkin_photos', child: null },
  { name: 'quiz_diagnoses', child: 'child_id' },
  { name: 'oak_assessments', child: 'child_id' },
  { name: 'oak_draws', child: 'child_id' },
  { name: 'school_test_records', child: 'child_id' },
  { name: 'unit_tests', child: 'child_id' },
  { name: 'unit_test_draws', child: null },
];

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

/* ①B：公共变更（quiz_questions / settings）推进每个孩子的版本。返回 {childId: 新版本}。 */
async function bumpAllChildrenVersions(db) {
  const out = {};
  const { results } = await db.prepare('SELECT id FROM children').all();
  for (const c of (results || [])) out[c.id] = await bumpChildVersion(db, c.id);
  return out;
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

async function getSession(db, req) {
  const c = parseCookies(req);
  const token = c.famsess;
  if (!token) return null;
  const s = await db.prepare('SELECT * FROM sessions WHERE token=?').bind(token).first();
  if (!s) return null;
  // 迁移 0003 之前的旧会话 kind 为 NULL，一律作废，强制按新入口重新登录
  if (s.kind !== 'child' && s.kind !== 'parent') return null;
  return s;
}

function requireFamily(session) {
  if (!session) return json({ ok: false, error: 'NEED_LOGIN' }, 401);
  return null;
}

/* PIN 新鲜度纯函数：parent 会话且 pin_verified_at 在 PIN_SESSION_SECS 内（requirePin 与 overview 下发共用同一口径） */
function pinFresh(session, nowSecs) {
  return !!(
    session &&
    session.kind === 'parent' &&
    session.pin_verified_at &&
    nowSecs - session.pin_verified_at <= PIN_SESSION_SECS
  );
}

/* 家长权限：必须是 parent 会话且 PIN 验证未过期（孩子会话输 PIN 后会升级为 parent） */
function requirePin(session) {
  if (!session) return json({ ok: false, error: 'NEED_LOGIN' }, 401);
  if (!pinFresh(session, Math.floor(Date.now() / 1000))) {
    return json({ ok: false, error: 'NEED_PIN' }, 403);
  }
  return null;
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
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  return fn(child, body, shDateStr());
}

/* 家长 PIN 守卫（B1）：requirePin 不过则原样返回其响应，否则执行 fn。 */
async function withPin(session, fn) {
  const g = requirePin(session);
  if (g) return g;
  return fn();
}

function sessionCookie(token) {
  return `famsess=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
}

async function createSession(db, kind, childId) {
  const token = randToken();
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO sessions(token, created_at, pin_verified_at, kind, child_id) VALUES(?,?,?,?,?)')
    .bind(token, now, kind === 'parent' ? now : null, kind, childId || null).run();
  return token;
}

/* ---------------- 入口页（角色选择，内联，免静态资源） ----------------
 * 三个入口：两个孩子（头像＝当前形态立绘/蛋图）+ 家长。
 * 孩子输自己的 4 位密码 → POST /api/child/login；家长输 PIN → POST /api/parent/login。 */

async function rolePage(db, hostname) {
  const kids = await getChildren(db);
  // 选人页是唯一未登录页面：只下发年级、宠物等级与虚拟形象，绝不下发真实姓名
  const roles = kids.map((c) => ({
    id: c.id, grade: c.grade_label, level: levelFromXp(c.total_xp),
    avatar: AVATAR_LINES.has(c.line)
      ? `/static/img/avatar-${c.line}.b45abbc0.webp`
      : (formInfo(c).img || petImg(LINES[c.line].forms[0].no)),
  }));
  const rolesJson = JSON.stringify(roles).replace(/</g, '\\u003c');
  return new Response(`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="两个孩子的作业打卡怪兽激励小天地（家庭自用）">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<title>打卡大冒险 · 选一选你是谁</title>
<link rel="apple-touch-icon" sizes="180x180" href="/static/icon-180.b45abbc0.png">
<link rel="icon" type="image/png" sizes="192x192" href="/static/icon-192.b45abbc0.png">
<meta name="apple-mobile-web-app-title" content="打卡大冒险">
<meta name="theme-color" content="#FF9F43">
<link rel="manifest" href="/static/manifest.json">
<script>if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}</script>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;
background:linear-gradient(160deg,#FFF7E8,#FFE7CC);font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:20px 0}
.card{background:#fff;border-radius:24px;padding:32px 26px;width:min(94vw,380px);text-align:center;
box-shadow:0 12px 40px rgba(255,159,67,.25)}
.egg{animation:bob 2.4s ease-in-out infinite}.egg svg{width:58px;height:58px;display:block;margin:0 auto}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
h1{font-size:22px;margin:10px 0 4px}p{color:#7A6552;font-size:16px;margin:0 0 16px}
.role{display:flex;align-items:center;gap:14px;width:100%;background:#FFFDF8;border:2px solid #F0E2CC;border-radius:16px;
padding:12px 16px;margin:10px 0;cursor:pointer;text-align:left;font-family:inherit}
.role:active{transform:scale(.98)}
.role .avatar{width:84px;height:84px;background:#FFE7CC;object-fit:contain;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:34px;flex:none}
.role .rname{font-size:21px;font-weight:700;color:#3D2C1E}
.rate{color:#7A6552;font-size:14px}
.dots{display:flex;justify-content:center;gap:16px;min-height:34px}
.dots .dot{width:16px;height:16px;border-radius:50%;border:2px solid #7A6552;background:transparent}
.dots .dot.on{background:#FF9F43;border-color:#FF9F43}
.dots.err .dot{background:#F25C54;border-color:#B3261E}
.err{color:#B3261E;min-height:22px;font-size:15px;margin:6px 0}
.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:280px;margin:6px auto}
.pad button{font-size:26px;font-weight:700;height:64px;padding:12px 0;border-radius:12px;border:2px solid #F0E2CC;background:#FFFDF8;color:#3D2C1E;cursor:pointer;font-family:inherit}
#padwrap.parent-pad .pad button{height:56px}
.pad button:active{background:#FF9F43;color:#3D2C1E}
.linkbtn{background:none;border:0;color:#7A6552;font-size:16px;margin-top:12px;padding:12px 20px;cursor:pointer;font-family:inherit}
.parentbtn{margin-top:22px;width:100%;font-size:16px;font-weight:700;color:#7A6552;background:#fff;border:2px solid #F0E2CC;
border-radius:16px;padding:12px;cursor:pointer;font-family:inherit}
.parentbtn .ic{width:18px;height:18px;vertical-align:-3px;margin-right:6px}
</style></head><body>
<div class="card"><div class="egg"><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 5C46 5 57 21 57 37c0 14-11 22-25 22S7 51 7 37C7 21 18 5 32 5Z" fill="#FFF3D6" stroke="#F08A24" stroke-width="3"/><ellipse cx="24" cy="26" rx="6" ry="9" fill="#fff" opacity=".7" transform="rotate(-18 24 26)"/></svg></div><h1>打卡大冒险</h1>
<div id="pick"><p>点一点你的头像<br>输入你的 4 位小密码</p><div id="roles"></div>
<button class="parentbtn" id="parent-entry"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>家长入口</button></div>
<div id="padwrap" style="display:none">
<p id="padtitle" style="font-size:17px;color:#3D2C1E;font-weight:700"></p>
<div class="dots" id="dots"><i class="dot"></i><i class="dot"></i><i class="dot"></i><i class="dot"></i></div><div class="err" id="err"></div>
<div class="pad" id="pad"></div>
<button class="linkbtn" id="back">‹ 换个人</button></div>
</div>
<script>
const ROLES=${rolesJson};
let mode=null,cid=null,buf='';
const rolesEl=document.getElementById('roles');
for(const r of ROLES){
  const b=document.createElement('button');b.className='role';
  b.innerHTML='<img class="avatar" src="'+r.avatar+'" alt="">'+'<span><span class="rname"></span><br><span class="rate"></span></span>';
  b.querySelector('.rname').textContent=r.grade;
  b.querySelector('.rate').textContent='宠物 Lv.'+r.level;
  b.onclick=()=>startPad('child',r.id,r.grade+'，输入你的小密码');
  rolesEl.appendChild(b);
}
const padEl=document.getElementById('pad');
['1','2','3','4','5','6','7','8','9','C','0','⌫'].forEach(k=>{
  const b=document.createElement('button');b.textContent=k;b.onclick=()=>key(k);padEl.appendChild(b);
});
function startPad(m,id,title){mode=m;cid=id;buf='';draw();
  document.getElementById('pick').style.display='none';
  document.getElementById('padwrap').style.display='block';
  document.getElementById('padwrap').className=m==='parent'?'parent-pad':'';
  document.getElementById('padtitle').textContent=title;
  document.getElementById('err').textContent='';}
function draw(errFlag){const d=document.getElementById('dots');if(!d)return;d.innerHTML=[0,1,2,3].map(i=>'<i class="dot'+(!errFlag&&i<buf.length?' on':'')+'"></i>').join('');d.className=errFlag?'dots err':'dots';}
function key(k){
  const e=document.getElementById('err');if(e)e.textContent='';
  if(k==='C')buf='';else if(k==='⌫')buf=buf.slice(0,-1);else if(buf.length<4)buf+=k;
  draw(false);if(buf.length===4)submit();
}
async function submit(){
  const url=mode==='child'?'/api/child/login':'/api/parent/login';
  const body=mode==='child'?{childId:cid,password:buf}:{pin:buf};
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({ok:false}));
  if(j.ok){location.href='/';return;}
  buf='';draw(true);setTimeout(()=>{if(buf==='')draw(false);},750);
  const e=document.getElementById('err');
  if(j.error==='PWD_NOT_SET')e.textContent='请爸爸妈妈先在设置里给你设置密码哦';
  else if(j.error==='CHILD_LOCKED'||j.error==='PIN_LOCKED')e.textContent='试太多次啦，'+Math.ceil((j.retryAfter||300)/60)+' 分钟后再试';
  else e.textContent='密码不对，再试一次';
}
document.getElementById('parent-entry').onclick=()=>startPad('parent',null,'家长，请输入家长密码');
document.getElementById('back').onclick=()=>{
  document.getElementById('padwrap').style.display='none';
  document.getElementById('pick').style.display='block';};
</script></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...(isProdHost(hostname) ? {} : { 'X-Robots-Tag': 'noindex' }) },
  });
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

function childSummary(child) {
  const line = LINES[child.line];
  const level = levelFromXp(child.total_xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    id: child.id, name: child.name, grade: child.grade_label, line: child.line, lineLabel: line.label,
    avatar: AVATAR_LINES.has(child.line)
      ? `/static/img/avatar-${child.line}.b45abbc0.webp`
      : (formInfo(child).img || petImg(LINES[child.line].forms[0].no)),
    totalXp: child.total_xp, level, balls: child.balls ?? 3, ballsSuper: child.balls_super ?? 0,
    ballsHyper: child.balls_hyper ?? 0, ballsMaster: child.balls_master ?? 0,
    xpIntoLevel: child.total_xp - base, xpForLevelSpan: next - base, xpToNext: next - child.total_xp,
    streak: child.streak, form: formInfo(child),
    moves: allMovesFor(child, level, (child._evo && child._evo.branchType) || LINE_TYPE[child.line]),
    move_levels: child.move_levels || '{}', // 本地战斗按招式名算备战宠技能等级（旧快照无此字段时按 1 级）
    quiz: {
      fragments: child.quiz_fragments || 0,
      correctTotal: child.quiz_correct_total || 0,
      nextFragmentIn: 5 - ((child.quiz_correct_total || 0) % 5),
    },
    titles: safeJsonArr(child.titles),
    stickers: safeJsonArr(child.stickers),
    badgeCount: safeJsonArr(child.titles).length,
    pokedexCount: 0, // 由装配层按图鉴表实际计数填充
  };
}

function safeJsonArr(s) {
  try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}

/* 封印蛋到期自动孵化（任意状态读取触发）；按 egg.species 入图鉴
 * （迁移 0005 泛化：旧蛋 species 默认 151、行为与旧版一致；新蛋 143/131/133/147 用 egg:{no}）。
 * v11：奖励蛋（reward_eggs）同批孵化；两种蛋都走 recordHatch 记账。 */
async function hatchDueEggs(db, childId, today) {
  const { results } = await db.prepare(
    'SELECT * FROM sealed_eggs WHERE child_id=? AND hatched=0 AND unlock_date<=?'
  ).bind(childId, today).all();
  const hatched = [];
  let lastNotice = null;
  for (const egg of results) {
    await db.prepare('UPDATE sealed_eggs SET hatched=1, hatched_at=? WHERE id=?').bind(today, egg.id).run();
    await syncTouch(db, childId, 'sealed_eggs', 'id=?', [egg.id]);
    const no = Number(egg.species) || 151;
    const sp = SPECIES[no] || RARE;
    const dexRes = await recordHatch(db, childId, no, today);
    if (dexRes && dexRes.notice) lastNotice = dexRes.notice;
    hatched.push({ eggId: egg.id, pokemon: { no, name: sp.name } });
  }
  // 奖励蛋（v11 0019）：旧链无 reward_eggs 表时跳过，不 500
  if (await hasEvoTable(db, 'reward_eggs')) {
    const { results: rew } = await db.prepare(
      "SELECT * FROM reward_eggs WHERE child_id=? AND status='pending' AND unlock_date<=?"
    ).bind(childId, today).all();
    for (const egg of rew) {
      await db.prepare("UPDATE reward_eggs SET status='hatched', hatched_at=? WHERE id=?").bind(today, egg.id).run();
      const no = Number(egg.species_no);
      const dexRes2 = await recordHatch(db, childId, no, today);
      if (dexRes2 && dexRes2.notice) lastNotice = dexRes2.notice;
      hatched.push({ eggId: egg.id, pokemon: { no, name: (SPECIES[no] || {}).name || `图鉴 #${no}` }, reward: true });
    }
  }
  return { hatched, notice: lastNotice };
}

/* 孵化记账：图鉴行＋永久获得标记＋宠物实例（主线按线、伊布按 eevee、其余按 species:{no}） */
async function recordHatch(db, childId, no, today) {
  const now = Math.floor(Date.now() / 1000);
  const dexRes = await insertPokedexWithCarryRule(db, childId, no, today);
  await db.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)')
    .bind(childId, no, 'hatch', now).run();
  const MAIN_FIRST_FORM = { 1: 'bulbasaur', 4: 'charmander', 7: 'squirtle', 25: 'pikachu' };
  const lineKey = MAIN_FIRST_FORM[no] || (no === 133 ? 'eevee' : `species:${no}`);
  await ensurePetInstance(db, childId, lineKey, today, 'egg');
  return dexRes;
}

/* ---- v11：宠物实例 / 背包 / 实际形态 ---- */

/* 旧链降级守卫：pet_instances / reward_eggs 由迁移 0019 引入；旧迁移链（如 oak 测试的无 0014 链）
 * 没有这些表时直接跳过、不碰表，避免总览/孩子详情 500——与 oakGroupForChild 的 kind='oak' 守卫同口径。
 * 线上按“先迁移后部署”顺序，0019 应用后本分支恒不触发。 */
/* 已确认存在的表名（模块级，随 isolate 生命周期）。只缓存 true：表由迁移创建、运行期不会被删；
 * false 不缓存，迁移中途落地后下一次调用就能看到。测试里切换“新链/旧链”夹具时调 resetEvoTableCache() 清空。 */
const EVO_TABLE_OK = new Set();
function resetEvoTableCache() { EVO_TABLE_OK.clear(); }
export { resetEvoTableCache };
async function hasEvoTable(db, name) {
  if (EVO_TABLE_OK.has(name)) return true;
  try {
    const r = await db.prepare("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name=?").bind(name).first();
    if (r) EVO_TABLE_OK.add(name);
    return !!r;
  } catch { return false; }
}

async function getPetInstance(db, childId, lineKey) {
  if (!(await hasEvoTable(db, 'pet_instances'))) return null;
  return db.prepare('SELECT * FROM pet_instances WHERE child_id=? AND line_key=?').bind(childId, lineKey).first();
}

/* 取不到则建：主线 species 为 forms[0]、伊布 133、收藏为 baseNo；当前线 source='main' 时 has_been_main=1 */
async function ensurePetInstance(db, childId, lineKey, today, source = 'main') {
  let inst = await getPetInstance(db, childId, lineKey);
  if (inst) return inst;
  if (!(await hasEvoTable(db, 'pet_instances'))) return null; // 旧链：无表可建，直接返回 null
  let speciesNo;
  if (lineKey === 'eevee') speciesNo = 133;
  else if (lineKey.startsWith('species:')) speciesNo = Number(lineKey.slice(8));
  else speciesNo = LINES[lineKey].forms[0].no;
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    `INSERT OR IGNORE INTO pet_instances(child_id, line_key, species_no, form_idx, branch, source, egg_id, evolved_via, has_been_main, created_epoch, updated_epoch)
     VALUES(?,?,?,0,NULL,?,NULL,NULL,?,?,?)`
  ).bind(childId, lineKey, speciesNo, source, source === 'main' ? 1 : 0, now, now).run();
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

/* 任务 110：这孩子所有前主宠的“当前形态物种”（排除当前线），供备战全选/
 * 携带列表共用。物种号按 attachEvoForm 同款口径算（actualFormIdxFor），
 * 与 doSwitchLine 写的 carried 行物种一致。 */
async function exMainSpecies(db, childId) {
  const child = await getChild(db, childId);
  if (!child) return [];
  const { results } = await db.prepare('SELECT line_key, branch, form_idx FROM pet_instances WHERE child_id=? AND has_been_main=1').bind(childId).all();
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

/* 调试改等级后同步图鉴形态：先删当前线已写入的形态行，再按新等级重写。
 * 只动当前线的 form: 行，其他线/野外/蛋/稀有行不动；降级时高于新形态的行随之消失，
 * 与“等级即形态”的展示口径一致（unlockForms 本身只增不减，故调试改级不能只调它）。 */
async function syncChildForms(db, child, today) {
  const { results: doomed } = await db.prepare("SELECT entry_key FROM pokedex WHERE child_id=? AND entry_key LIKE ?")
    .bind(child.id, `form:${child.line}:%`).all();
  if (doomed.length) {
    const v = await bumpChildVersion(db, child.id);
    for (const d of doomed) await recordTombstone(db, child.id, 'pokedex', d.entry_key, v);
  }
  await db.prepare("DELETE FROM pokedex WHERE child_id=? AND entry_key LIKE ?")
    .bind(child.id, `form:${child.line}:%`).run();
  // 调试降级：伊布掉到 16 级以下时分支进化失效，实例上的分支一并清掉（图鉴分支行已随 LIKE 删掉；旧链无表跳过）
  if (child.line === 'eevee' && levelFromXp(child.total_xp) < 16 && (await hasEvoTable(db, 'pet_instances'))) {
    await db.prepare("UPDATE pet_instances SET branch=NULL, species_no=133, evolved_via=NULL, updated_epoch=? WHERE child_id=? AND line_key='eevee'")
      .bind(Math.floor(Date.now() / 1000), child.id).run();
  }
  await unlockForms(db, child, today);
}

/* ---- v11：背包 ---- */
async function getInventoryQty(db, childId, itemKey) {
  const r = await db.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').bind(childId, itemKey).first();
  return r ? (r.qty || 0) : 0;
}
async function getInventory(db, childId) {
  const { results } = await db.prepare('SELECT item_key, qty FROM item_inventory WHERE child_id=? AND qty>0 ORDER BY item_key').bind(childId).all();
  return results.map((r) => ({ key: r.item_key, qty: r.qty, ...(ITEM_CATALOG[r.item_key] || { name: r.item_key, emoji: '🎁', kind: 'unknown', rarity: 'common', attr: null, desc: '' }) }));
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
  const { results: a } = await db.prepare('SELECT species_no FROM species_acquisitions WHERE child_id=?').bind(childId).all();
  for (const r of a) s.add(Number(r.species_no));
  const { results: p } = await db.prepare('SELECT entry_key FROM pokedex WHERE child_id=?').bind(childId).all();
  for (const r of p) {
    const no = speciesNoOfDexKey(r.entry_key);
    if (no) s.add(no);
  }
  return s;
}
/* 背包里未孵化的蛋的物种号集合（高级转盘／单元测试奖池去重用） */
async function pendingEggSpeciesSet(db, childId) {
  const s = new Set();
  const { results: a } = await db.prepare("SELECT species_no FROM reward_eggs WHERE child_id=? AND status='pending'").bind(childId).all();
  for (const r of a) s.add(Number(r.species_no));
  const { results: b } = await db.prepare('SELECT species FROM sealed_eggs WHERE child_id=? AND hatched=0').bind(childId).all();
  for (const r of b) s.add(Number(r.species) || 151);
  return s;
}
async function hasPendingEgg(db, childId, no) {
  const r = await db.prepare("SELECT 1 AS x FROM reward_eggs WHERE child_id=? AND species_no=? AND status='pending'").bind(childId, no).first();
  if (r) return true;
  const s = await db.prepare('SELECT 1 AS x FROM sealed_eggs WHERE child_id=? AND species=? AND hatched=0').bind(childId, no).first();
  return !!s;
}
/* 发奖励蛋（7 天孵化）：去重不通过返回 {granted:false}，不落库 */
async function grantEgg(db, childId, speciesNo, source, refId, today) {
  if (!GATES_OPEN && speciesNo !== 133 && (await ownsSpeciesEver(db, childId, speciesNo) || await hasPendingEgg(db, childId, speciesNo))) {
    return { granted: false, reason: 'ALREADY_OWNED' };
  }
  const unlock = addDays(today, EGG_HATCH_DAYS);
  const now = Math.floor(Date.now() / 1000);
  const ins = await db.prepare("INSERT INTO reward_eggs(child_id, species_no, source, ref_id, status, unlock_date, created_epoch, date_shanghai) VALUES(?,?,?,?,'pending',?,?,?)")
    .bind(childId, speciesNo, source, refId == null ? null : refId, unlock, now, today).run();
  const eggId = ins.meta ? Number(ins.meta.last_row_id) : null;
  return { granted: true, eggId, species: speciesNo, unlockDate: unlock };
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

/* EVO_LINES 的真实形状是 { stages, conds } / { branches }，不是 { base, next }。
 * evoStepsFor 把它归一成 [{ from, to, cond }]；cond 种类：level / stone / trade / trade-item。 */
function evoStepsFor(baseNo, evo) {
  if (!evo) return [];
  if (Array.isArray(evo.branches)) return evo.branches.map((b) => ({ from: baseNo, to: b.to, cond: b.cond || {} }));
  const stages = evo.stages || [];
  const conds = evo.conds || [];
  const steps = [];
  for (let i = 0; i < stages.length - 1; i++) steps.push({ from: stages[i], to: stages[i + 1], cond: conds[i] || { kind: 'level', level: 0 } });
  return steps;
}
/* 找某物种号所在线的下一步：先按 line_key 的 baseNo，找不到再按物种号在各线里搜（中段形态直获）。 */
/* 重复进化奖励（2026-11-06）：step_key 形如 species:50->51，按步骤记；
 * evo_wheel_grants 行存在 = 该步骤已领过奖（UNIQUE 兜底防并发重复领）。 */
function evoRewardStepKey(fromNo, toNo) { return `species:${fromNo}->${toNo}`; }
async function evoRewardClaimedSteps(db, childId) {
  const { results } = await db.prepare('SELECT step_key FROM evo_wheel_grants WHERE child_id=?').bind(childId).all();
  return new Set((results || []).map((r) => r.step_key));
}
/* 高级转盘可用次数（两表并计）：学校 wheel_chances ＋ 进化 evo_wheel_grants；
 * 进化奖励不计入每周 3 次上限（学校发放只数 wheel_chances 的行）。 */
async function wheelChancesLeft(db, childId) {
  const wc = await db.prepare('SELECT COUNT(*) n FROM wheel_chances WHERE child_id=? AND used_epoch IS NULL').bind(childId).first();
  const eg = await db.prepare('SELECT COUNT(*) n FROM evo_wheel_grants WHERE child_id=? AND used_epoch IS NULL').bind(childId).first();
  return (wc ? (wc.n || 0) : 0) + (eg ? (eg.n || 0) : 0);
}
/* 找某物种号所在线的全部下一步（分支线返回多条，如飞天螳螂 123→212/900）。 */
function evoStepsForSpecies(inst) {
  const baseNo = Number(inst.line_key.slice(8));
  let evo = EVO_LINES[baseNo];
  let steps = evoStepsFor(baseNo, evo);
  if (!steps.some((s) => s.from === inst.species_no)) {
    for (const [k, e] of Object.entries(EVO_LINES)) {
      const cand = evoStepsFor(Number(k), e);
      if (cand.some((s) => s.from === inst.species_no)) { evo = e; steps = cand; break; }
    }
  }
  return { evo, steps: steps.filter((s) => s.from === inst.species_no) };
}
function evoStepForSpecies(inst) {
  const { evo, steps } = evoStepsForSpecies(inst);
  return { evo, step: steps[0] || null };
}
/* 校验一条进化条件：返回缺失文案、门槛等级、需耗道具 key、是否交换类、是否就绪。 */
function evoCondCheck(cond, level, has) {
  const missing = [];
  let needLevel = 0;
  let itemKey = null;
  let trade = false;
  if (cond.kind === 'level') {
    needLevel = cond.level || 0;
    if (level < needLevel) missing.push(`等级 ${needLevel}`);
  } else if (cond.kind === 'stone') {
    itemKey = cond.stone;
    if (!has(itemKey)) missing.push(ITEM_CATALOG[itemKey].name);
  } else if (cond.kind === 'trade') {
    needLevel = cond.minLevel || 10;
    trade = true;
    if (level < needLevel) missing.push(`等级 ${needLevel}`);
  } else if (cond.kind === 'trade-item') {
    itemKey = cond.item;
    trade = true;
    if (!has(itemKey)) missing.push(ITEM_CATALOG[itemKey].name);
  }
  return { missing, needLevel, itemKey, trade, ready: missing.length === 0 };
}

/* 进化选项：child/inst/invQty/level；evoCtx 可选 { owned:Set(已拥有物种号), claimedSteps:Set(已领奖 step_key) }。
 * 未传 evoCtx 时按未拥有、未领奖处理（纯函数单测与旧调用保持原行为）。
 * 收藏线分三支：已拥有且已领奖 → 不返回选项（按钮永久消失）；已拥有未领奖 →
 * 返回 collection-evo-reward（条件未满足时同样带 missing，满足后才可领）；未拥有 → 正常进化。 */
function evoOptionsFor(child, inst, invQty, level, evoCtx = {}) {
  const opts = [];
  if (!inst) return opts;
  const has = (k) => (invQty[k] || 0) > 0;
  const missingFor = (needLevel, stoneKey) => {
    if (GATES_OPEN) return [];
    const m = [];
    if (level < needLevel) m.push(`等级 ${needLevel}`);
    if (stoneKey && !has(stoneKey)) m.push(ITEM_CATALOG[stoneKey].name);
    return m;
  };
  if (inst.line_key === 'eevee') {
    if (inst.branch) return opts; // 已进化分支的实例不再列分支（多只伊布各自独立实例）
    for (const [key, b] of Object.entries(EEVEE_BRANCHES)) {
      if (key === 'sylveon') {
        const taught = fairyMovesOf(child).length > 0;
        opts.push({ kind: 'eevee-branch', branch: 'sylveon', name: b.name, no: b.no, type: b.type, stone: 'stone:fairy-skill', needsLevel: 16, hasStone: taught, ready: GATES_OPEN || (level >= 16 && taught), missing: GATES_OPEN ? [] : level < 16 ? ['等级 16'] : (taught ? [] : ['妖精技能石教学']), note: '学会妖精招式后可直接进化，不再消耗石头' });
      } else {
        opts.push({ kind: 'eevee-branch', branch: key, name: b.name, no: b.no, type: b.type, stone: b.stone, needsLevel: 16, hasStone: has(b.stone), ready: GATES_OPEN || (level >= 16 && has(b.stone)), missing: missingFor(16, b.stone) });
      }
    }
    return opts;
  }
  if (inst.line_key.startsWith('species:')) {
    const { evo, steps } = evoStepsForSpecies(inst);
    if (!steps.length) return opts;
    const stages = (evo && evo.stages) || [];
    for (const step of steps) {
      const ck = evoCondCheck(step.cond, level, has);
      const stepKey = evoRewardStepKey(inst.species_no, step.to);
      const ownedTarget = evoCtx.owned ? evoCtx.owned.has(step.to) : false;
      const claimedReward = evoCtx.claimedSteps ? evoCtx.claimedSteps.has(stepKey) : false;
      if (ownedTarget && claimedReward) continue; // 这条分支已领过奖：按钮消失
      if (ownedTarget) {
        opts.push({
          kind: 'collection-evo-reward', baseNo: Number(inst.line_key.slice(8)), fromNo: inst.species_no, target: step.to,
          name: speciesName(step.to), no: step.to,
          level: ck.needLevel, item: ck.itemKey, trade: ck.trade,
          ready: GATES_OPEN || ck.ready, missing: GATES_OPEN ? [] : ck.missing,
          note: `已经有${speciesName(step.to)}啦，这次进化变成高级转盘奖励`,
          formIdx: stages.length ? stages.indexOf(step.to) : 1,
        });
        continue;
      }
      opts.push({
        kind: 'collection-evo', baseNo: Number(inst.line_key.slice(8)), fromNo: inst.species_no, target: step.to,
        name: speciesName(step.to), no: step.to,
        level: ck.needLevel, item: ck.itemKey, trade: ck.trade,
        ready: GATES_OPEN || ck.ready, missing: GATES_OPEN ? [] : ck.missing,
        note: ck.trade ? (ck.itemKey ? '连接交换进化：消耗对应道具' : '交换进化：App 内以等级 10 为门槛') : undefined,
        formIdx: stages.length ? stages.indexOf(step.to) : 1,
      });
    }
    return opts;
  }
  // 主宠线：终极须 16 级＋对应石；一/二阶随等级自动进阶，不列
  const stone = MAIN_EVO_STONE[inst.line_key];
  if (stone && inst.form_idx < 3) {
    opts.push({ kind: 'main-final', line: inst.line_key, name: LINES[inst.line_key].forms[2].name, no: LINES[inst.line_key].forms[2].no, stone, needsLevel: 16, hasStone: has(stone), ready: GATES_OPEN || (level >= 16 && has(stone)), missing: missingFor(16, stone) });
  }
  return opts;
}

/* 主宠终极进化：16 级＋对应石。成功时扣石、实例 form_idx=3、写图鉴与获得标记、推进化通知。 */
async function applyMainFinalEvo(db, child, inst, today) {
  const level = levelFromXp(child.total_xp);
  const stone = MAIN_EVO_STONE[child.line];
  if (!stone) return { ok: false, error: 'NO_FINAL_FORM' };
  if (!GATES_OPEN && level < 16) return { ok: false, error: 'LEVEL_TOO_LOW', need: 16 };
  if (inst.form_idx >= 3) return { ok: false, error: 'ALREADY_EVOLVED' };
  const took = GATES_OPEN || await takeItem(db, child.id, stone, 1, 'evolve', 'stone', child.line, today);
  if (!took) return { ok: false, error: 'NO_STONE', stone };
  const finalForm = LINES[child.line].forms[2];
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('UPDATE pet_instances SET form_idx=3, species_no=?, evolved_via=?, updated_epoch=? WHERE id=?')
    .bind(finalForm.no, stone, now, inst.id).run();
  const dexIns = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
    .bind(child.id, `form:${child.line}:3`, today).run();
  if (dexIns.meta && dexIns.meta.changes) {
    await syncTouch(db, child.id, 'pokedex', 'child_id=? AND entry_key=?', [child.id, `form:${child.line}:3`]);
  }
  await db.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)')
    .bind(child.id, finalForm.no, 'evolve', now).run();
  if (!GATES_OPEN) {
    await db.prepare('INSERT INTO item_uses(child_id, item_key, use_kind, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
      .bind(child.id, stone, 'evolve', 'line', child.line, now, today).run();
  }
  await pushNotice(db, child.id, 'evolution', { from: LINES[child.line].forms[1].name, to: finalForm.name, formIdx: 3, img: petImg(finalForm.no), stone });
  return { ok: true, line: child.line, name: finalForm.name, no: finalForm.no, img: petImg(finalForm.no), stone };
}

/* 伊布分支进化：16 级＋对应石；仙子分支不耗石（须已学会池内妖精招式）。 */
async function applyEeveeBranchEvo(db, child, inst, branchKey, today) {
  const b = EEVEE_BRANCHES[branchKey];
  if (!b) return { ok: false, error: 'BAD_BRANCH' };
  if (inst.branch) return { ok: false, error: 'ALREADY_EVOLVED', branch: inst.branch };
  const level = levelFromXp(child.total_xp);
  if (!GATES_OPEN && level < 16) return { ok: false, error: 'LEVEL_TOO_LOW', need: 16 };
  if (branchKey === 'sylveon') {
    if (!GATES_OPEN && fairyMovesOf(child).length === 0) return { ok: false, error: 'NO_FAIRY_MOVE' };
  } else if (!GATES_OPEN) {
    const took = await takeItem(db, child.id, b.stone, 1, 'evolve', 'stone', `eevee:${branchKey}`, today);
    if (!took) return { ok: false, error: 'NO_STONE', stone: b.stone };
  }
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('UPDATE pet_instances SET branch=?, species_no=?, form_idx=1, evolved_via=?, updated_epoch=? WHERE id=?')
    .bind(branchKey, b.no, branchKey === 'sylveon' ? null : b.stone, now, inst.id).run();
  const dexIns1 = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
    .bind(child.id, `form:eevee:branch:${branchKey}`, today).run();
  if (dexIns1.meta && dexIns1.meta.changes) {
    await syncTouch(db, child.id, 'pokedex', 'child_id=? AND entry_key=?', [child.id, `form:eevee:branch:${branchKey}`]);
  }
  const dexIns2 = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
    .bind(child.id, dexKeyForSpecies(b.no), today).run();
  if (dexIns2.meta && dexIns2.meta.changes) {
    await syncTouch(db, child.id, 'pokedex', 'child_id=? AND entry_key=?', [child.id, dexKeyForSpecies(b.no)]);
  }
  await db.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)')
    .bind(child.id, b.no, 'evolve', now).run();
  if (!GATES_OPEN && branchKey !== 'sylveon') {
    await db.prepare('INSERT INTO item_uses(child_id, item_key, use_kind, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
      .bind(child.id, b.stone, 'evolve', 'eevee-branch', branchKey, now, today).run();
  }
  await pushNotice(db, child.id, 'evolution', { from: '伊布', to: b.name, formIdx: 1, img: petImg(b.no), stone: branchKey === 'sylveon' ? null : b.stone, branch: branchKey });
  return { ok: true, branch: branchKey, name: b.name, no: b.no, img: petImg(b.no), type: b.type, stone: branchKey === 'sylveon' ? null : b.stone };
}

/* 收藏线进化：按 EVO_LINES 链的下一步。需道具时扣道具；纯等级／纯交换门槛不扣。
 * targetNo（目标物种号）指定分支时按该分支执行（不存在的分支 → BAD_BRANCH）；
 * 未传时保持旧行为（第一条分支）。重复奖励按所选分支的目标形态判定。 */
async function applyCollectionEvo(db, child, inst, today, targetNo = null) {
  const { evo, steps } = evoStepsForSpecies(inst);
  let step = null;
  if (targetNo != null && targetNo !== '') {
    step = steps.find((s) => s.to === Number(targetNo)) || null;
    if (!step) return { ok: false, error: 'BAD_BRANCH' };
  } else {
    step = steps[0] || null;
  }
  if (!step) return { ok: false, error: inst.species_no && evo ? 'ALREADY_EVOLVED' : 'NO_EVO_LINE' };
  const level = levelFromXp(child.total_xp);
  // 道具是否在背包：先从条件里取出道具 key，再查库存做同步校验
  const itemKey = step.cond.kind === 'stone' ? step.cond.stone : step.cond.kind === 'trade-item' ? step.cond.item : null;
  const invQty = {};
  if (itemKey) {
    const row = await db.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').bind(child.id, itemKey).first();
    invQty[itemKey] = row ? Number(row.qty) : 0;
  }
  const ck2 = evoCondCheck(step.cond, level, (k) => (invQty[k] || 0) > 0);
  if (!GATES_OPEN && !ck2.ready) {
    if (ck2.needLevel && level < ck2.needLevel) return { ok: false, error: 'LEVEL_TOO_LOW', need: ck2.needLevel };
    return { ok: false, error: 'NO_STONE', stone: ck2.itemKey };
  }
  // 重复进化奖励（2026-11-06）：目标已拥有 → 不进化、不耗石，转领 1 次高级转盘（每步骤一生一次）；
  // INSERT OR IGNORE ＋ UNIQUE 兜底防并发重复领，抢不到即已领过。
  if (await ownsSpeciesEver(db, child.id, step.to)) {
    const stepKey = evoRewardStepKey(inst.species_no, step.to);
    const nowEpoch = Math.floor(Date.now() / 1000);
    const ins = await db.prepare(
      'INSERT OR IGNORE INTO evo_wheel_grants(child_id, step_key, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)'
    ).bind(child.id, stepKey, weekStartMon(today), nowEpoch, today).run();
    if (!ins.meta || !ins.meta.changes) return { ok: false, error: 'EVO_REWARD_CLAIMED' };
    const chances = await wheelChancesLeft(db, child.id);
    return { ok: true, reward: 'wheel', stepKey, fromNo: inst.species_no, name: speciesName(step.to), no: step.to, img: petImg(step.to), wheelChances: chances };
  }
  if (!GATES_OPEN && ck2.itemKey) {
    const took = await takeItem(db, child.id, ck2.itemKey, 1, 'evolve', 'stone', `species:${inst.species_no}`, today);
    if (!took) return { ok: false, error: 'NO_STONE', stone: ck2.itemKey };
  }
  const stages = (evo && evo.stages) || [];
  const formIdx = stages.length ? stages.indexOf(step.to) : 1;
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('UPDATE pet_instances SET species_no=?, form_idx=?, updated_epoch=? WHERE id=?')
    .bind(step.to, formIdx, now, inst.id).run();
  const dexIns = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
    .bind(child.id, dexKeyForSpecies(step.to), today).run();
  if (dexIns.meta && dexIns.meta.changes) {
    await syncTouch(db, child.id, 'pokedex', 'child_id=? AND entry_key=?', [child.id, dexKeyForSpecies(step.to)]);
  }
  await db.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)')
    .bind(child.id, step.to, 'evolve', now).run();
  if (!GATES_OPEN && ck2.itemKey) {
    await db.prepare('INSERT INTO item_uses(child_id, item_key, use_kind, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
      .bind(child.id, ck2.itemKey, 'evolve', 'species', String(step.to), now, today).run();
  }
  await pushNotice(db, child.id, 'evolution', { from: speciesName(inst.species_no), to: speciesName(step.to), formIdx, img: petImg(step.to), stone: ck2.itemKey || null });
  return { ok: true, fromNo: inst.species_no, name: speciesName(step.to), no: step.to, img: petImg(step.to), stone: ck2.itemKey || null };
}

/* 妖精技能石教学：从该只伊布尚未学会的池内招式中均匀随机抽取；池满时石头不可用、不消耗。 */
async function applyFairyTeach(db, child, inst, today, rng = Math.random) {
  const learned = fairyMovesOf(child).map((m) => m.name);
  const pool = FAIRY_TEACH_POOL.filter((m) => !learned.includes(m.name));
  if (!pool.length) return { ok: false, error: 'FAIRY_POOL_FULL' };
  const took = await takeItem(db, child.id, 'stone:fairy-skill', 1, 'teach', 'stone', 'eevee', today);
  if (!took) return { ok: false, error: 'NO_STONE', stone: 'stone:fairy-skill' };
  const pick = pool[Math.floor(rollRng(rng) * pool.length) % pool.length];
  const level = levelFromXp(child.total_xp);
  const updated = [...fairyMovesOf(child), { name: pick.name, level, type: '妖精', desc: pick.desc, power: pick.power, accuracy: pick.accuracy, effect: pick.effect }];
  await db.prepare('UPDATE children SET fairy_moves=? WHERE id=?').bind(JSON.stringify(updated), child.id).run();
  await syncTouch(db, child.id, 'children', 'id=?', [child.id]);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO item_uses(child_id, item_key, use_kind, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
    .bind(child.id, 'stone:fairy-skill', 'teach', 'move', pick.name, now, today).run();
  // 已满 16 级且刚学会：提示可进化仙子伊布（不自动进化）
  const pendingFairyEvolve = level >= 16 && !inst.branch;
  if (pendingFairyEvolve) {
    await pushNotice(db, child.id, 'evo-ready', { to: '仙子伊布', branch: 'sylveon', img: petImg(700) });
  }
  return { ok: true, move: pick, pendingFairyEvolve };
}

function normalizeQuizRow(r) {
  return {
    id: r.id, kind: r.kind, grade: r.grade, subject: r.subject,
    question: r.question, options: safeJsonArr(r.options_json),
    answer_idx: r.answer_idx, explain: r.explain || '',
    chapter: r.chapter || null, topicId: r.topic_id || null,
    active: r.active !== 0, isCustom: !!r.is_custom,
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
async function quizPoolForChild(db, child, today) {
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
    const [{ results: all }, history, repeatDays, mathGate, chineseGate, englishGate] = await Promise.all([
      db.prepare('SELECT * FROM quiz_questions').all(),
      quizHistoryForChild(db, child.id),
      getSetting(db, 'quiz_repeat_days'),
      /* 三门进度门：实时读取保证改完即生效 */
      loadMathGate(db, child),
      loadChineseGate(db, child),
      loadEnglishGate(db, child),
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

async function quizSummaryForChild(db, child, today) {
  const pool = await quizPoolForChild(db, child, today);
  const answered = pool.questions.filter((q) => pool.attempts.has(q.id)).length;
  return { quota: pool.quota, answeredCount: answered, remaining: Math.max(0, pool.questions.length - answered) };
}

async function apiQuizToday(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id') || url.searchParams.get('id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const pool = await quizPoolForChild(db, child, today);
  const quizXp = Number((await getSetting(db, 'quiz_xp')) || 10);
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const list = pool.questions.map((q) => ({
    id: q.id, kind: q.kind, subject: q.subject, label: questionLabel(q),
    question: q.question, options: q.options,
    answered: pool.attempts.has(q.id),
    correct: pool.attempts.has(q.id) ? !!pool.attempts.get(q.id).correct : null,
  }));
  return json({
    ok: true, childId: child.id, childName: child.name, childGrade: child.grade_label,
    readAloudHint: gradeNum === 1,
    date: today, subjects: pool.subjects, quota: pool.quota,
    answeredCount: list.filter((x) => x.answered).length,
    remaining: Math.max(0, pool.questions.length - list.filter((x) => x.answered).length),
    quizXp,
    quiz: {
      fragments: child.quiz_fragments || 0,
      correctTotal: child.quiz_correct_total || 0,
      nextFragmentIn: 5 - ((child.quiz_correct_total || 0) % 5),
    },
    questions: list,
  });
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
async function isDailyItemDropEnabled(db) {
  const v = await getSetting(db, 'daily_item_drops_enabled');
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
  const pool = await quizPoolForChild(db, child, today);
  const q = pool.questions.find((x) => x.id === questionId);
  if (!q) return json({ ok: false, error: '这道题不在今天的题单里' }, 400); // 超额度/外来题
  if (!q.active) return json({ ok: false, error: '这道题被家长下架啦' }, 400);
  if (!GATES_OPEN_FULL && pool.attempts.has(questionId)) return json({ ok: false, error: '这道题今天已经答过啦' }, 400); // 重复答题

  const quizXp = Number((await getSetting(db, 'quiz_xp')) || 10);
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
      if (await isDailyItemDropEnabled(db)) {
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
      (await getSetting(db, 'english_mode')) === '1') {
    const gate = await loadEnglishGate(db, child);
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

async function apiQuizUpgradeMove(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const moveName = body.moveName ? String(body.moveName) : '';
  if (!moveName) return json({ ok: false, error: '请先选一个招式' }, 400);
  const level = levelFromXp(child.total_xp);
  const moves = allMovesFor(child, level, LINE_TYPE[child.line]);
  let mv = moves.find((m) => m.name === moveName && !m.fairy);
  let benchNo = null;
  let benchExLine = null, benchExBranch = null; // 任务 110：备战前主宠的线/分支（重算 after 用）
  if (!mv) {
    // 备战宠独有招：只认随请求传入的 benchNo 对应物种已学会的招式（须拥有该种；
    // 测试模式 ownsSpecies 全放行，与备战选择口径一致）。不传 benchNo 时独有招仍拒绝，
    // 避免同名招在多个备战种的学会等级不同、响应里的 level/power 失去所指。
    const bn = body.benchNo != null ? Number(body.benchNo) : NaN;
    if (Number.isInteger(bn) && await ownsSpecies(db, childId, bn)) {
      // 任务 110：前主宠的招查自己线的表，不查收藏表（ownsSpecies 已含前主宠例外）
      const benchEx = await getExMainLine(db, childId, bn);
      const benchMoves = benchEx
        ? lineMovesFor(child, benchEx.lineKey, level, benchEx.branch ? EEVEE_BRANCHES[benchEx.branch].type : LINE_TYPE[benchEx.lineKey])
        : collectionMovesFor(child, bn, level);
      const bm = benchMoves.find((m) => m.name === moveName);
      if (bm) { mv = bm; benchNo = bn; benchExLine = benchEx ? benchEx.lineKey : null; benchExBranch = benchEx ? benchEx.branch : null; }
    }
  }
  if (!mv) return json({ ok: false, error: '这个招式还没学会，不能升级' }, 400);
  const curLevel = mv.skillLevel || 1;
  if (curLevel >= SKILL_MAX_LEVEL) return json({ ok: false, error: '这个招式已经满级啦' }, 400);
  const frags = child.quiz_fragments || 0;
  if (frags < 3) return json({ ok: false, error: `技能碎片还不够，再攒 ${3 - frags} 枚吧` }, 400);
  const newLevel = curLevel + 1;
  const levels = safeJsonObj(child.move_levels);
  levels[moveName] = newLevel;
  // 条件扣减：并发/连点时只有一个请求能扣成功，其余回 409；只扣 quiz_fragments，不改 quiz_correct_total
  const upd = await db.prepare('UPDATE children SET quiz_fragments = quiz_fragments - 3, move_levels=? WHERE id=? AND quiz_fragments>=3')
    .bind(JSON.stringify(levels), childId).run();
  if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  await syncTouch(db, childId, 'children', 'id=?', [childId]);
  const after = benchNo != null
    ? (benchExLine
      ? lineMovesFor({ ...child, move_levels: JSON.stringify(levels) }, benchExLine, level, benchExBranch ? EEVEE_BRANCHES[benchExBranch].type : LINE_TYPE[benchExLine])
      : collectionMovesFor({ ...child, move_levels: JSON.stringify(levels) }, benchNo, level))
    : allMovesFor({ ...child, move_levels: JSON.stringify(levels) }, level, LINE_TYPE[child.line]);
  const nm = after.find((m) => m.name === moveName);
  return json({ ok: true, move: { name: moveName, level: mv.level, skillLevel: newLevel, power: nm ? nm.power : skillPower(mv.level, newLevel), effectKind: nm ? (nm.effectKind || null) : (moveEffectOf(moveName) || null), effectMult: nm ? (nm.effectMult ?? null) : null, effectMiss: nm ? (nm.effectMiss ?? null) : null }, quizFragments: frags - 3 });
}

async function apiCareStatus(db, req, session) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const body = { childId: new URL(req.url).searchParams.get('childId') };
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const today = shDateStr();
  let todayRows = { results: [] };
  try {
    todayRows = await db.prepare(
      'SELECT kind FROM care_logs WHERE child_id=? AND date_shanghai=?'
    ).bind(child.id, today).all();
  } catch (e) { /* care_logs 未建：当未喂/未洗 */ }
  // 背包里照顾道具数量（2026-11-08）：前端把没有的选项置灰
  let inv = { results: [] };
  try {
    inv = await db.prepare(
      "SELECT item_key, qty FROM item_inventory WHERE child_id=? AND item_key LIKE 'care:%'"
    ).bind(child.id).all();
  } catch (e) { /* item_inventory 未建：当没有 */ }
  const qtyByKey = new Map((inv.results || []).map(r => [r.item_key, Number(r.qty) || 0]));
  const foods = [];
  for (const food of CARE_FOODS) {
    let known = null;
    try {
      known = await db.prepare(
        "SELECT 1 FROM care_logs WHERE child_id=? AND kind='feed' AND favorite=1 AND item_key=? LIMIT 1"
      ).bind(child.id, food.key).first();
    } catch (e) { /* care_logs 未建：当未知 */ }
    foods.push({ ...food, isFavoriteKnown: !!known, qty: qtyByKey.get('care:' + food.key) || 0 });
  }
  const start = new Date(today + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - 6);
  const since = start.toISOString().slice(0, 10);
  let rows = { results: [] };
  try {
    rows = await db.prepare(
      'SELECT * FROM care_logs WHERE child_id=? AND date_shanghai>=? AND date_shanghai<=? ORDER BY date_shanghai DESC, id DESC'
    ).bind(child.id, since, today).all();
  } catch (e) { /* care_logs 未建：当无记录 */ }
  const recent = (rows.results || []).map(row => ({
    date: row.date_shanghai, kind: row.kind, itemKey: row.item_key,
    itemName: (row.kind === 'feed' ? careFoodByKey(row.item_key) : careBathByKey(row.item_key))?.name || row.item_key,
    sceneKey: row.scene_key,
    sceneName: CARE_SCENES.find(s => s.key === row.scene_key)?.name || row.scene_key,
    sceneText: CARE_SCENES.find(s => s.key === row.scene_key)?.text || '',
    favorite: !!row.favorite, xpAwarded: row.xp_awarded,
  }));
  return json({
    ok: true, enabled: true, today, scene: careSceneForDate(today),
    fedToday: (todayRows.results || []).some(r => r.kind === 'feed'),
    bathedToday: (todayRows.results || []).some(r => r.kind === 'bath'),
    gatesOpen: GATES_OPEN_FULL, /* 任务 124：前端据此决定喂食/洗澡按钮是否置灰 */
    foods, baths: CARE_BATHS.map(b => ({ ...b, qty: qtyByKey.get('care:' + b.key) || 0 })), recent,
  });
}
async function apiCareFeed(db, req, session) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const food = careFoodByKey(body.food);
  if (!food) return json({ ok: false, error: '没有这种食物' }, 400);
  const today = shDateStr(), scene = careSceneForDate(today);
  const alreadyDone = () => json({
    ok: false, code: 'ALREADY_DONE', error: '今天已经喂过啦，明天再来吧',
  }, 400);
  /* 任务 124：门槛放行时跳过“今天已喂”检查，并删掉今天已有的喂食记录（care_logs 对
   * (child_id, date_shanghai, kind) 有唯一约束，不删就插不进第二条）；放行时也不扣道具。 */
  if (!GATES_OPEN_FULL && await db.prepare(
    "SELECT 1 FROM care_logs WHERE child_id=? AND date_shanghai=? AND kind='feed'"
  ).bind(child.id, today).first()) return alreadyDone();
  if (GATES_OPEN_FULL) {
    await db.prepare(
      "DELETE FROM care_logs WHERE child_id=? AND date_shanghai=? AND kind='feed'"
    ).bind(child.id, today).run();
  }
  const favorite = body.food === careFavoriteFood(child.line);
  const xpAwarded = favorite ? CARE_XP_FAVORITE : 0;
  // 照顾必扣道具（2026-11-08）：先扣道具再写 care_logs；没有道具直接失败，不写记录、不给经验、不加友好度。
  // 任务 124：放行时不扣道具（短路，takeItem 不执行）。
  const took = GATES_OPEN_FULL || await takeItem(db, child.id, 'care:' + food.key, 1, 'care-feed', 'care_log', null, today);
  if (!took) return json({ ok: false, code: 'NO_ITEM', error: `没有「${food.name}」，先去养成转盘抽一个吧` }, 400);
  let result;
  try {
    result = await db.prepare(
      "INSERT INTO care_logs(child_id,date_shanghai,kind,item_key,favorite,xp_awarded,scene_key,created_epoch) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM care_logs WHERE child_id=? AND date_shanghai=? AND kind='feed')"
    ).bind(child.id, today, 'feed', food.key, favorite ? 1 : 0, xpAwarded,
      scene.key, Math.floor(Date.now() / 1000), child.id, today).run();
  } catch (error) {
    if (!/UNIQUE constraint failed/i.test(String(error))) throw error;
    // 并发已喂：道具退回（放行时没扣过，不退）
    if (!GATES_OPEN_FULL) {
      try { await addItem(db, child.id, 'care:' + food.key, 1, 'care-feed-refund', 'care_log', null, today); } catch { /* 退款失败不阻塞 */ }
    }
    return alreadyDone();
  }
  if (result.meta?.changes === 0) {
    if (!GATES_OPEN_FULL) {
      try { await addItem(db, child.id, 'care:' + food.key, 1, 'care-feed-refund', 'care_log', null, today); } catch { /* 退款失败不阻塞 */ }
    }
    return alreadyDone();
  }
  let xpInfo = null;
  if (xpAwarded > 0) {
    xpInfo = await grantXp(db, child, CARE_XP_FAVORITE, today);
    // 静态契约（tests/care.test.mjs）：进化通知须保留字面 pushNotice 调用，勿改走 helper
    if (xpInfo.evolved) await pushNotice(db, child.id, 'evolution', xpInfo.evolved);
    if (xpInfo.pendingFairyEvolve) await pushNotice(db, child.id, 'evo-ready', { to: '仙子伊布', branch: 'sylveon', img: petImg(700) });
  }
  // 友好度改到照顾系统（2026-11-08）：每次成功喂食 +10，上限 255。
  const fr = await awardCareActionFriendship(db, child, today);
  return json({
    ok: true, favorite, xpAwarded, scene,
    friendshipAwarded: fr.awarded, friendship: fr.friendship, hearts: fr.hearts,
    level: xpInfo ? {
      oldLevel: xpInfo.oldLevel, newLevel: xpInfo.newLevel,
      levelsGained: xpInfo.levelsGained, newMoves: xpInfo.newMoves,
      evolved: xpInfo.evolved,
    } : null,
  });
}
async function apiCareBath(db, req, session) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const bath = careBathByKey(body.bath);
  if (!bath) return json({ ok: false, error: '没有这种洗澡方式' }, 400);
  const today = shDateStr(), scene = careSceneForDate(today);
  const alreadyDone = () => json({
    ok: false, code: 'ALREADY_DONE', error: '今天已经洗过啦',
  }, 400);
  /* 任务 124：放行时跳过“今天已洗”检查，并删掉今天已有的洗澡记录（唯一约束同喂食）；放行时也不扣道具。 */
  if (!GATES_OPEN_FULL && await db.prepare(
    "SELECT 1 FROM care_logs WHERE child_id=? AND date_shanghai=? AND kind='bath'"
  ).bind(child.id, today).first()) return alreadyDone();
  if (GATES_OPEN_FULL) {
    await db.prepare(
      "DELETE FROM care_logs WHERE child_id=? AND date_shanghai=? AND kind='bath'"
    ).bind(child.id, today).run();
  }
  // 照顾必扣道具（2026-11-08）：先扣道具再写 care_logs；没有道具直接失败，不写记录、不加友好度。
  // 任务 124：放行时不扣道具（短路，takeItem 不执行）。
  const took = GATES_OPEN_FULL || await takeItem(db, child.id, 'care:' + bath.key, 1, 'care-bath', 'care_log', null, today);
  if (!took) return json({ ok: false, code: 'NO_ITEM', error: `没有「${bath.name}」，先去养成转盘抽一个吧` }, 400);
  let result;
  try {
    result = await db.prepare(
      "INSERT INTO care_logs(child_id,date_shanghai,kind,item_key,favorite,xp_awarded,scene_key,created_epoch) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM care_logs WHERE child_id=? AND date_shanghai=? AND kind='bath')"
    ).bind(child.id, today, 'bath', bath.key, 0, 0, scene.key,
      Math.floor(Date.now() / 1000), child.id, today).run();
  } catch (error) {
    if (!/UNIQUE constraint failed/i.test(String(error))) throw error;
    // 并发已洗：道具退回（放行时没扣过，不退）
    if (!GATES_OPEN_FULL) {
      try { await addItem(db, child.id, 'care:' + bath.key, 1, 'care-bath-refund', 'care_log', null, today); } catch { /* 退款失败不阻塞 */ }
    }
    return alreadyDone();
  }
  if (result.meta?.changes === 0) {
    if (!GATES_OPEN_FULL) {
      try { await addItem(db, child.id, 'care:' + bath.key, 1, 'care-bath-refund', 'care_log', null, today); } catch { /* 退款失败不阻塞 */ }
    }
    return alreadyDone();
  }
  // 友好度改到照顾系统（2026-11-08）：每次成功洗澡 +10，上限 255。
  const fr = await awardCareActionFriendship(db, child, today);
  return json({ ok: true, xpAwarded: 0, scene, friendshipAwarded: fr.awarded, friendship: fr.friendship, hearts: fr.hearts });
}

/* ====== C：伙伴问答与友好度（/api/care/qa/*） ====== */
const CARE_QA_DAILY_LIMIT = 3;
// 友好度改到照顾系统（2026-11-08）：喂食/洗澡每次 +10，问答不再加友好度；照顾必扣道具。
const CARE_ACTION_FRIENDSHIP_GAIN = 10;
const CARE_QA_XP_GAIN = 5;
const FRIENDSHIP_MAX = 255;

function friendshipHeartsOf(friendship) {
  const f = Math.max(0, Math.min(FRIENDSHIP_MAX, Number(friendship) || 0));
  return Math.floor(f / 51);
}

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

/* 照顾动作加友好度（2026-11-08）：每次成功喂食/洗澡 +10，上限 255；与问答原更新语句同款，绝不调 syncTouch / touchRow。 */
async function awardCareActionFriendship(db, child, today) {
  const prev = await getChildMainFriendship(db, child, today);
  const next = Math.min(FRIENDSHIP_MAX, prev + CARE_ACTION_FRIENDSHIP_GAIN);
  const awarded = next - prev;
  if (awarded > 0) {
    await db.prepare(
      `UPDATE pet_instances SET friendship = ?, updated_epoch = ? WHERE child_id = ? AND line_key = ?`
    ).bind(next, Math.floor(Date.now() / 1000), child.id, child.line).run();
  }
  return { awarded, friendship: next, hearts: friendshipHeartsOf(next) };
}

// 构建孩子的养成问答候选池：仅 kind='study'、active=1、grade 匹配孩子 gradeNumFromLabel(child.grade_label) 或 NULL 通用；
// 排除今日已在 care_qa_logs 答过的题；优先排 quiz_attempts 中曾答过的复习题。
async function pickCareQaQuestion(db, child, today) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const { results: rawQuestions } = await db.prepare(
    `SELECT * FROM quiz_questions
     WHERE kind = 'study'
       AND active = 1
       AND is_custom = 0
       AND (grade IS NULL OR grade = ?)
     ORDER BY id ASC`
  ).bind(gradeNum).all();

  if (!rawQuestions || !rawQuestions.length) return null;

  const { results: todayLogs } = await db.prepare(
    `SELECT question_id FROM care_qa_logs WHERE child_id = ? AND date_shanghai = ?`
  ).bind(child.id, today).all();
  const answeredTodaySet = new Set((todayLogs || []).map((r) => Number(r.question_id)));

  const candidates = rawQuestions.filter((r) => !answeredTodaySet.has(Number(r.id)));
  if (!candidates.length) return null;

  const { results: historyRows } = await db.prepare(
    `SELECT DISTINCT question_id FROM quiz_attempts WHERE child_id = ?`
  ).bind(child.id).all();
  const reviewedSet = new Set((historyRows || []).map((r) => Number(r.question_id)));

  const reviewPool = candidates.filter((r) => reviewedSet.has(Number(r.id)));
  const chosenRaw = reviewPool.length > 0 ? reviewPool[0] : candidates[0];
  return normalizeQuizRow(chosenRaw);
}

async function apiCareQaStatus(db, req, session) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const url = new URL(req.url);
  const rawChildId = url.searchParams.get('childId') ?? url.searchParams.get('child_id');
  const scoped = scopeChildId(session, rawChildId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const today = shDateStr();
  const { results: logs } = await db.prepare(
    `SELECT question_id, correct, friendship_awarded, xp_awarded
     FROM care_qa_logs
     WHERE child_id = ? AND date_shanghai = ?
     ORDER BY id ASC`
  ).bind(childId, today).all();

  const answeredCount = (logs || []).length;
  const remaining = Math.max(0, CARE_QA_DAILY_LIMIT - answeredCount);
  const friendship = await getChildMainFriendship(db, child, today);
  const hearts = friendshipHeartsOf(friendship);

  return json({
    ok: true,
    childId,
    today,
    dailyLimit: CARE_QA_DAILY_LIMIT,
    answeredToday: answeredCount,
    remainingToday: remaining,
    friendship,
    hearts,
  });
}

async function apiCareQaQuestion(db, req, session) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const url = new URL(req.url);
  const rawChildId = url.searchParams.get('childId') ?? url.searchParams.get('child_id');
  const scoped = scopeChildId(session, rawChildId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const today = shDateStr();
  const cntRow = await db.prepare(
    `SELECT COUNT(*) AS cnt FROM care_qa_logs WHERE child_id = ? AND date_shanghai = ?`
  ).bind(childId, today).first();
  const answeredCount = Number(cntRow?.cnt || 0);
  if (!GATES_OPEN_FULL && answeredCount >= CARE_QA_DAILY_LIMIT) {
    return json({ ok: false, error: 'DAILY_LIMIT_REACHED' }, 400);
  }

  const q = await pickCareQaQuestion(db, child, today);
  if (!q) {
    return json({ ok: false, error: 'NO_QUESTION_AVAILABLE' }, 404);
  }

  const friendship = await getChildMainFriendship(db, child, today);
  // 下发题目绝不携带 answer_idx
  return json({
    ok: true,
    childId,
    answeredToday: answeredCount,
    remainingToday: Math.max(0, CARE_QA_DAILY_LIMIT - answeredCount),
    friendship,
    hearts: friendshipHeartsOf(friendship),
    question: {
      id: q.id,
      kind: q.kind,
      grade: q.grade,
      subject: q.subject,
      question: q.question,
      options: q.options,
    },
  });
}

async function apiCareQaAnswer(db, req, session) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const body = await readJsonBody(req);
  const rawChildId = body.childId ?? body.child_id;
  const scoped = scopeChildId(session, rawChildId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const questionId = Number(body.questionId ?? body.question_id);
  const answerIdx = Number(body.answerIdx ?? body.answer_idx);
  if (!Number.isInteger(questionId) || questionId <= 0 || !Number.isInteger(answerIdx) || answerIdx < 0) {
    return json({ ok: false, error: 'INVALID_PARAMS' }, 400);
  }

  const today = shDateStr();

  // 1. 校验该题是否属于该孩子的养成问答合法池（kind='study', active=1, is_custom=0, 年级匹配 gradeNumFromLabel(child.grade_label) 或 NULL）
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const rawQ = await db.prepare(
    `SELECT * FROM quiz_questions
     WHERE id = ?
       AND kind = 'study'
       AND active = 1
       AND is_custom = 0
       AND (grade IS NULL OR grade = ?)`
  ).bind(questionId, gradeNum).first();

  if (!rawQ) {
    return json({ ok: false, error: 'QUESTION_NOT_IN_CARE_POOL' }, 400);
  }
  const q = normalizeQuizRow(rawQ);

  // 2. 校验今日是否已答过此题
  const dupRow = await db.prepare(
    `SELECT id FROM care_qa_logs WHERE child_id = ? AND date_shanghai = ? AND question_id = ?`
  ).bind(childId, today, questionId).first();
  if (dupRow) {
    return json({ ok: false, error: 'ALREADY_ANSWERED_TODAY' }, 400);
  }

  // 3. 校验今日是否已满 3 道
  const cntRow = await db.prepare(
    `SELECT COUNT(*) AS cnt FROM care_qa_logs WHERE child_id = ? AND date_shanghai = ?`
  ).bind(childId, today).first();
  const answeredBefore = Number(cntRow?.cnt || 0);
  if (!GATES_OPEN_FULL && answeredBefore >= CARE_QA_DAILY_LIMIT) {
    return json({ ok: false, error: 'DAILY_LIMIT_REACHED' }, 400);
  }

  const correct = answerIdx === Number(q.answer_idx);
  await ensureMainPetInstanceForCare(db, child, today);
  const prevFriendship = await getChildMainFriendship(db, child, today);
  // 问答不再加友好度（2026-11-08）：友好度改到照顾系统（喂食/洗澡每次 +10）。
  const newFriendship = prevFriendship;
  const friendshipAwarded = 0;
  const xpAwarded = correct ? CARE_QA_XP_GAIN : 0;
  const now = Math.floor(Date.now() / 1000);

  // 4. 原子插入 care_qa_logs（含每日 < 3 条件防并发超限）
  const ins = await db.prepare(
    `INSERT OR IGNORE INTO care_qa_logs(
       child_id, question_id, date_shanghai, correct, friendship_awarded, xp_awarded, created_epoch
     )
     SELECT ?, ?, ?, ?, ?, ?, ?
     WHERE (
       SELECT COUNT(*) FROM care_qa_logs WHERE child_id = ? AND date_shanghai = ?
     ) < ${CARE_QA_DAILY_LIMIT}`
  ).bind(
    childId, questionId, today, correct ? 1 : 0, friendshipAwarded, xpAwarded, now,
    childId, today
  ).run();

  if (!ins.meta || !ins.meta.changes) {
    return json({ ok: false, error: 'ALREADY_ANSWERED_OR_LIMIT_REACHED' }, 400);
  }

  // 5. 答对：只发 +5 经验（友好度已改到照顾系统，问答不再更新 pet_instances.friendship）
  let levelInfo = null;
  if (correct) {
    const xpRes = await grantXp(db, child, CARE_QA_XP_GAIN, today);
    levelInfo = {
      oldLevel: xpRes.oldLevel,
      newLevel: xpRes.newLevel,
      levelsGained: xpRes.levelsGained,
      newMoves: xpRes.newMoves,
      evolved: xpRes.evolved,
    };
  }

  const answeredToday = answeredBefore + 1;
  return json({
    ok: true,
    correct,
    answerIdx: q.answer_idx,
    explain: q.explain || '',
    friendshipAwarded,
    friendship: newFriendship,
    hearts: friendshipHeartsOf(newFriendship),
    xpAwarded,
    level: levelInfo,
    answeredToday,
    remainingToday: Math.max(0, CARE_QA_DAILY_LIMIT - answeredToday),
  });
}



/* ---------------- 先修回溯诊断（DB 层与接口） ----------------
 * 诊断行是派生快照：作答事实只在 quiz_attempts；重算只读 attempts＋静态图，不写 attempts。
 * 复习题单当日有效：行内 review_question_ids 存当日题单；次日重算后重新选（排除已出过的）。
 * 复习作答只记历史（xp/fragments 记 0），不计 quiz_correct_total，不触发掉球与遭遇。 */
async function diagRecompute(db, child, today) {
  const start = addDays(today, -(DIAG_WINDOW_DAYS - 1));
  const { results: attempts } = await db.prepare(
    'SELECT question_id, date_shanghai, correct FROM quiz_attempts WHERE child_id=? AND date_shanghai>=? AND date_shanghai<=?'
  ).bind(child.id, start, today).all();
  const { results: qrows } = await db.prepare(
    "SELECT id, topic_id FROM quiz_questions WHERE kind='study' AND subject='数学' AND active=1 AND topic_id IS NOT NULL"
  ).bind().all();
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
      const ins = await db.prepare(
        `INSERT INTO quiz_diagnoses(child_id,trigger_topic_id,root_topic_id,chain_json,status,review_question_ids,review_correct,created_date,created_epoch)
         SELECT ?,?,?,?, 'pending','[]',0,?,? WHERE NOT EXISTS (SELECT 1 FROM quiz_diagnoses WHERE child_id=? AND root_topic_id=? AND status='pending')`
      ).bind(child.id, weakest, rootId, JSON.stringify(found.chain), today, Math.floor(Date.now() / 1000), child.id, rootId).run();
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

async function diagBuildView(db, child, today) {
  const { states } = await diagRecompute(db, child, today);
  const gradeNum = gradeNumFromLabel(child.grade_label);
  // 北师大章节（题库 chapter）：家长端显示用；图里的 chapter 是人教版，仅展示备用，不参与门判定
  const { results: chRows } = await db.prepare(
    "SELECT topic_id, chapter FROM quiz_questions WHERE kind='study' AND subject='数学' AND topic_id IS NOT NULL AND chapter IS NOT NULL GROUP BY topic_id"
  ).bind().all();
  const chBsn = new Map((chRows || []).map((r) => [r.topic_id, r.chapter]));
  const topicView = (tid) => {
    const n = DIAG_TOPIC_BY_ID.get(tid);
    const s = states.get(tid);
    return {
      topicId: tid, name: n ? n.name : tid, chapter: chBsn.get(tid) || (n ? n.chapter : ''),
      wrong: s ? s.wrong : 0, total: s ? s.total : 0, lastWrongDate: s ? s.lastWrongDate : null,
    };
  };
  const weak = [...states.entries()].filter(([, s]) => s.state === 'weak')
    .map(([tid]) => topicView(tid))
    .sort((a, b) => b.wrong - a.wrong || String(b.lastWrongDate || '').localeCompare(String(a.lastWrongDate || '')));
  const unstable = [...states.entries()].filter(([, s]) => s.state === 'unstable')
    .map(([tid]) => topicView(tid))
    .sort((a, b) => String(b.lastWrongDate || '').localeCompare(String(a.lastWrongDate || '')));
  const { results: pendRows } = await db.prepare(
    "SELECT * FROM quiz_diagnoses WHERE child_id=? AND status='pending' ORDER BY created_date DESC, id DESC"
  ).bind(child.id).all();
  const { results: histRows } = await db.prepare(
    "SELECT * FROM quiz_diagnoses WHERE child_id=? AND status IN ('done','expired') ORDER BY created_date DESC, id DESC LIMIT 20"
  ).bind(child.id).all();
  // 当日每日问答完成情况（只读 quiz_daily＋attempts，不触发补选）
  const rawSubjects = await approvedSubjectsToday(db, child.id, today);
  const quota = quizDailyTotal(rawSubjects);
  const dailyRow = await db.prepare('SELECT question_ids FROM quiz_daily WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first();
  const dailyIds = dailyRow ? safeJsonArr(dailyRow.question_ids).map(Number) : [];
  const { results: todayAtts } = await db.prepare(
    'SELECT question_id, correct FROM quiz_attempts WHERE child_id=? AND date_shanghai=?'
  ).bind(child.id, today).all();
  const answeredToday = new Set((todayAtts || []).map((a) => Number(a.question_id)));
  const dailyDone = dailyIds.length > 0 && dailyIds.every((id) => answeredToday.has(id));
  // 活跃诊断行：最新的一行 pending；复习题单只在每日问答答完后出现
  const row = (pendRows || [])[0] || null;
  let pending = null;
  if (row) {
    const chain = safeJsonArr(row.chain_json);
    const rootId = row.root_topic_id;
    const rootNode = DIAG_TOPIC_BY_ID.get(rootId);
    let note = null;
    if (DIAG_FAIL_CLOSED.has(rootId)) note = 'fail-closed';
    else if (rootId === DIAG_NO_QUESTION_TOPIC) note = 'no-question';
    let reviewIds = safeJsonArr(row.review_question_ids).map(Number);
    let reviewQuestions = [];
    let reviewAnsweredToday = 0, reviewCorrectToday = 0;
    if (dailyDone && !note) {
      // 题单当日有效：行是今天建的且题单非空→沿用；否则（次日或首次）重新选并落库
      if (!(row.created_date === today && reviewIds.length > 0)) {
        const { results: allQ } = await db.prepare('SELECT * FROM quiz_questions').all();
        const history = await quizHistoryForChild(db, child.id);
        const mathGate = await loadMathGate(db, child);
        const picked = diagPickReview((allQ || []).map(normalizeQuizRow), {
          rootTopicId: rootId,
          excludeIds: new Set(dailyIds),
          answeredIds: answeredToday,
          issuedIds: new Set(reviewIds),
          mathGate, history,
        });
        reviewIds = picked.map((q) => q.id);
        await db.prepare('UPDATE quiz_diagnoses SET review_question_ids=? WHERE id=?')
          .bind(JSON.stringify(reviewIds), row.id).run();
      }
      if (!reviewIds.length) {
        note = 'no-review-questions';
      } else {
        const ph = reviewIds.map(() => '?').join(',');
        const { results: qs } = await db.prepare(`SELECT * FROM quiz_questions WHERE id IN (${ph})`).bind(...reviewIds).all();
        const qmap = new Map((qs || []).map((r) => [Number(r.id), normalizeQuizRow(r)]));
        reviewQuestions = reviewIds.map((id) => qmap.get(id)).filter(Boolean)
          .filter((q) => !answeredToday.has(q.id))
          .map((q) => ({ id: q.id, question: q.question, options: q.options, label: questionLabel(q) }));
        reviewAnsweredToday = reviewIds.filter((id) => answeredToday.has(id)).length;
        reviewCorrectToday = (todayAtts || []).filter((a) => reviewIds.includes(Number(a.question_id)) && a.correct).length;
      }
    }
    pending = {
      id: row.id, status: row.status, createdDate: row.created_date,
      triggerTopicId: row.trigger_topic_id, trigger: topicView(row.trigger_topic_id),
      rootTopicId: rootId,
      root: { topicId: rootId, name: rootNode ? rootNode.name : rootId, chapter: rootNode ? rootNode.chapter : '' },
      chain, note, dailyDone,
      reviewTotal: reviewIds.length, reviewAnswered: reviewAnsweredToday, reviewCorrect: reviewCorrectToday,
      reviewCorrectAll: row.review_correct || 0,
      reviewQuestions,
    };
  }
  return {
    childId: child.id, date: today,
    hasDaily: quota > 0, dailyDone,
    weak, unstable, pending,
    history: (histRows || []).map((r) => {
      const tn = DIAG_TOPIC_BY_ID.get(r.trigger_topic_id);
      const rn = DIAG_TOPIC_BY_ID.get(r.root_topic_id);
      return {
        id: r.id, status: r.status, createdDate: r.created_date, resolvedDate: r.resolved_date,
        triggerTopicId: r.trigger_topic_id, triggerName: tn ? tn.name : r.trigger_topic_id,
        rootTopicId: r.root_topic_id, rootName: rn ? rn.name : r.root_topic_id,
        reviewCorrect: r.review_correct || 0,
      };
    }),
  };
}

async function apiQuizDiagnosis(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id') || url.searchParams.get('id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const view = await diagBuildView(db, child, today);
  return json({ ok: true, ...view });
}

async function apiQuizReview(db, req, session) {
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
  // 复习只在当日每日问答全部答完后开放
  const dailyRow = await db.prepare('SELECT question_ids FROM quiz_daily WHERE child_id=? AND date_shanghai=?').bind(childId, today).first();
  const dailyIds = dailyRow ? safeJsonArr(dailyRow.question_ids).map(Number) : [];
  const { results: todayAtts } = await db.prepare(
    'SELECT question_id, correct FROM quiz_attempts WHERE child_id=? AND date_shanghai=?'
  ).bind(childId, today).all();
  const answeredToday = new Set((todayAtts || []).map((a) => Number(a.question_id)));
  const dailyDone = dailyIds.length > 0 && dailyIds.every((id) => answeredToday.has(id));
  if (!dailyDone) return json({ ok: false, error: '先把今天的问答答完再来练一练' }, 400);
  const row = await db.prepare(
    "SELECT * FROM quiz_diagnoses WHERE child_id=? AND status='pending' ORDER BY created_date DESC, id DESC LIMIT 1"
  ).bind(childId).first();
  if (!row) return json({ ok: false, error: '今天没有要练的题' }, 400);
  const reviewIds = safeJsonArr(row.review_question_ids).map(Number);
  if (!reviewIds.includes(questionId)) return json({ ok: false, error: '这道题不在今天的练一练里' }, 400);
  const qrow = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(questionId).first();
  if (!qrow) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const q = normalizeQuizRow(qrow);
  if (!q.active) return json({ ok: false, error: '这道题被家长下架啦' }, 400);
  const correct = answerIdx === q.answer_idx;
  // 复习作答只记历史：经验／碎片记 0，不计 quiz_correct_total，不触发掉球与遭遇（沿用抓捕作答先例）
  /* 任务 124：放行时先删当日旧作答（唯一约束 ux_quiz_attempt）。 */
  if (GATES_OPEN_FULL) {
    await db.prepare('DELETE FROM quiz_attempts WHERE child_id=? AND question_id=? AND date_shanghai=?').bind(childId, questionId, today).run();
  }
  const ins = await db.prepare(
    `INSERT OR IGNORE INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch)
     VALUES(?,?,?,?,0,0,?)`
  ).bind(childId, questionId, today, correct ? 1 : 0, Math.floor(Date.now() / 1000)).run();
  if (!ins.meta || !ins.meta.changes) return json({ ok: false, error: '这道题今天已经答过啦' }, 400);
  await syncTouch(db, childId, 'quiz_attempts', 'id=?', [Number(ins.meta.last_row_id)]);
  if (correct) {
    await db.prepare('UPDATE quiz_diagnoses SET review_correct=review_correct+1 WHERE id=?').bind(row.id).run();
  }
  if (correct) await syncTouch(db, childId, 'quiz_diagnoses', 'id=?', [row.id]);
  // 答后重算：根因不再薄弱时该行即 done（诊断不阻塞答题主链路，失败只记日志）
  try { await diagRecompute(db, child, today); } catch (e) { console.error('diagRecompute after review failed', e); }
  const fresh = await db.prepare('SELECT review_correct FROM quiz_diagnoses WHERE id=?').bind(row.id).first();
  const answeredCount = await db.prepare(
    'SELECT COUNT(*) n FROM quiz_attempts WHERE child_id=? AND date_shanghai=? AND question_id IN (' + reviewIds.map(() => '?').join(',') + ')'
  ).bind(childId, today, ...reviewIds).first();
  return json({
    ok: true, correct, explain: q.explain, correctIdx: q.answer_idx,
    xpAwarded: 0, fragmentsAwarded: 0,
    reviewCorrect: fresh ? (fresh.review_correct || 0) : (row.review_correct || 0),
    reviewTotal: reviewIds.length,
    reviewAnswered: answeredCount ? answeredCount.n : 0,
  });
}


async function apiOakToday(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const group = await oakGroupForChild(db, child, today);
  const quizXp = Number((await getSetting(db, 'quiz_xp')) || 10);
  const drawStatus = await oakDrawStatus(db, child, today, group);
  return json({
    ok: true, childId: child.id, childGrade: child.grade_label, date: today,
    episodeId: group.episodeId, topic: group.topic, quizXp,
    listenedCount: group.listenedCount, completed: group.completed,
    xpAwardedToday: group.xpAwardedToday, sentences: group.sentences,
    fiveStarCount: drawStatus.fiveStarCount, fiveStarTotal: drawStatus.fiveStarTotal, draw: drawStatus.draw,
    assessEnabled: (await getSetting(db, 'oak_assess')) !== '0',
  });
}

/* -------- 每日英语打卡（2026-11-07，用户定：两孩每日 5 句、只跟读打卡先跑） --------
 * 内容池：src/data/daily-english.js（跟读站素材只读 API v1 快照 2026-11-13，小宝 g1＋starter 236 句、
 * 大宝 g3 1100 句；刷新跑 work/extract-daily-english-pool.py ＋ scripts/gen-daily-english.mjs --write）。
 * 内容分工（2026-11-13，用户定：每日英语走课本内容，口语对话归 Oak）：每天 5 句只取课本
 * （textbook）；口语（card/video，游戏口语与视频生存英语，带说话人）只进 Oak，不再进每日英语。
 * 选题在服务端做：种子取 child_id＋当天日期（FNV-1a 哈希 → mulberry32），同一天同一孩子恒为
 * 同一 5 句，5 句互不重复；跨日去重 v1 不做（池子大、重复概率低，以后再加）。
 * v1 不加经验、不答题；打卡只记 daily_english_logs（迁移 0027），接口幂等（INSERT OR IGNORE）。
 * v2（2026-11-09）：每句跟读评分（POST /api/daily-english/assess，走共用讯飞主/Azure 备管线，成绩记
 * daily_english_assessments，迁移 0029）；打卡须当日 5 句 best 全 ≥80 分（4 星线，用户定，跟读站 85 分线区分）。
 * 离线：选题与打卡均须联网（不进 sync 注册表、不进离线端）；前端把当日 5 句缓存在
 * localStorage（sm.dailyEnglish.<childId>），离线时文字照常、音频置灰。
 */
const DAILY_ENGLISH_COUNT = 5;
const DAILY_ENGLISH_SPOKEN_COUNT = 0; // 2026-11-13 用户定：每日英语只取课本，口语归 Oak（旧 3+2 已废）
/* 每日英语打卡线（2026-11-10，用户定，任务 82）：75 分＝4 星，全 5 句 best ≥75 才打卡；打卡线与 4 星线对齐。 */
const DAILY_ENGLISH_PASS_PRON = 75;
function dailyEnglishHash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function dailyEnglishPoolFor(gradeNum) {
  if (gradeNum === 1) return DAILY_ENGLISH_POOL.xiaobao;
  if (gradeNum === 3) return DAILY_ENGLISH_POOL.dabao;
  return null;
}
function pickDailyEnglish(pool, count, rng) {
  const n = Math.min(count, pool.length);
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rollRng(rng) * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => pool[i]);
}
function isDailyEnglishSpoken(s) {
  return s.k === 'card' || s.k === 'video';
}
function pickDailyEnglishMixed(pool, count, spokenCount, rng) {
  const spoken = pool.filter(isDailyEnglishSpoken);
  const textbook = pool.filter((s) => !isDailyEnglishSpoken(s));
  const nSpoken = Math.min(spokenCount, spoken.length, count);
  const nText = Math.min(count - nSpoken, textbook.length);
  const picked = [
    ...pickDailyEnglish(spoken, nSpoken, rng),
    ...pickDailyEnglish(textbook, nText, rng),
  ];
  // 任一子池不足时用另一子池补满（兜底；现池口语均 ≥2，不触发）
  if (picked.length < count) {
    const rest = pool.filter((s) => !picked.includes(s));
    picked.push(...pickDailyEnglish(rest, count - picked.length, rng));
  }
  // 最后再洗一次，口语句不固定排在前/后
  return pickDailyEnglish(picked, picked.length, rng);
}
function dailyEnglishTodayFor(child, dateStr) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const pool = dailyEnglishPoolFor(gradeNum);
  if (!pool) return { error: 'NO_POOL' };
  const rng = mulberry32(dailyEnglishHash32(`${child.id}:${dateStr}`));
  const picked = pickDailyEnglishMixed(pool, DAILY_ENGLISH_COUNT, DAILY_ENGLISH_SPOKEN_COUNT, rng);
  return {
    date: dateStr,
    sentences: picked.map((s) => {
      const ep = DAILY_ENGLISH_EPISODES[s.e] || {};
      return { sid: s.s, episodeId: s.e, titleEn: ep.t || '', titleZh: ep.z || '', type: ep.k || s.k || '', speaker: s.sp || null, en: s.en, zh: s.zh, audioNormal: s.an, audioSlow: s.as };
    }),
  };
}
async function apiDailyEnglish(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const picked = dailyEnglishTodayFor(child, today);
  if (picked.error) return json({ ok: false, error: picked.error }, 400);
  let done = null;
  try {
    done = await db.prepare('SELECT completed_epoch FROM daily_english_logs WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first();
  } catch (e) { /* 表未建（如旧迁移链）：当未完成，不抛错 */ }
  const careWheelChances = await careWheelChancesLeft(db, child.id);
  const scores = await dailyEnglishAssessScores(db, child.id, today);
  return json({ ok: true, childId: child.id, date: today, sentences: picked.sentences, completed: !!done, completedEpoch: done ? done.completed_epoch : null, careWheelChances, scores });
}
async function apiDailyEnglishCheckin(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const picked = dailyEnglishTodayFor(child, today);
    if (picked.error) return json({ ok: false, error: picked.error }, 400);
    // 打卡门禁（2026-11-09）：当日 5 句 best 全 ≥80（4 星）才记完成；未全过返回还差哪几句，不记日志、不发转盘机会。
    const scores = await dailyEnglishAssessScores(db, child.id, today);
    const missing = picked.sentences.map((s, i) => {
      const sc2 = scores[dailyEnglishSidKey(s)];
      const best = sc2 ? sc2.best : null;
      return { index: i + 1, sid: dailyEnglishSidKey(s), best, passed: (best ?? -1) >= DAILY_ENGLISH_PASS_PRON };
    }).filter((m) => !m.passed);
    if (missing.length) return json({ ok: false, error: 'NOT_PASSED', missing });
    const now = Math.floor(Date.now() / 1000);
    const sids = JSON.stringify(picked.sentences.map((s) => `${s.episodeId}:${s.sid}`));
    await db.prepare('INSERT OR IGNORE INTO daily_english_logs(child_id, date_shanghai, sids, completed_epoch) VALUES(?,?,?,?)').bind(child.id, today, sids, now).run();
    // 完成当日 5 句 → 发 1 次养成转盘机会（每孩每天 1 次，INSERT OR IGNORE 幂等；
    // source 'daily-english'、ref_id=当日日期；表未建时内部吞错，不阻塞打卡主流程）。
    const careWheelGranted = await grantCareWheelChance(db, child.id, 'daily-english', today, today, now);
    const careWheelChances = await careWheelChancesLeft(db, child.id);
    return json({ ok: true, childId: child.id, date: today, completed: true, careWheelGranted, careWheelChances });
  });
}

/* 每日英语句子的 sid 键：与 daily_english_logs.sids 同一格式 episodeId:sid */
function dailyEnglishSidKey(s) { return `${s.episodeId}:${s.sid}`; }

/* 当日每句最好分（读路径；表未建如旧迁移链时当无成绩，不抛错） */
async function dailyEnglishAssessScores(db, childId, today) {
  try {
    const { results } = await db.prepare(
      'SELECT sid, best_pron, attempts FROM daily_english_assessments WHERE child_id=? AND date_shanghai=?'
    ).bind(childId, today).all();
    const map = {};
    for (const r of results || []) map[r.sid] = { best: Number(r.best_pron), attempts: Number(r.attempts) || 0, passed: Number(r.best_pron) >= DAILY_ENGLISH_PASS_PRON };
    return map;
  } catch (e) { return {}; }
}

/* 记一次每日英语点评成绩（每句取当日最好 pron）；返回最新 { best, attempts }。 */
async function dailyEnglishRecordAssess(db, child, today, sidKey, pron) {
  try {
    await db.prepare(
      `INSERT INTO daily_english_assessments(child_id, sid, date_shanghai, best_pron, attempts, updated_epoch)
       VALUES(?,?,?,?,1,?)
       ON CONFLICT(child_id, sid, date_shanghai) DO UPDATE SET
         best_pron = MAX(best_pron, excluded.best_pron),
         attempts = attempts + 1,
         updated_epoch = excluded.updated_epoch`
    ).bind(child.id, sidKey, today, pron, Math.floor(Date.now() / 1000)).run();
  } catch (e) { console.error('daily english record assess failed', e); }
  try {
    const row = await db.prepare(
      'SELECT best_pron, attempts FROM daily_english_assessments WHERE child_id=? AND sid=? AND date_shanghai=?'
    ).bind(child.id, sidKey, today).first();
    if (row) return { best: Number(row.best_pron), attempts: Number(row.attempts) || 0 };
  } catch (e) {}
  return { best: pron, attempts: 1 };
}

/* 每日英语跟读评分（2026-11-09）：按当日 5 句的句文本评分，走共用评测管线（讯飞主、Azure 备）。
 * 与 /api/oak/assess 同一入参形状（audio/wav＋x-ref-text），同一错误口径；只评当日 5 句，不评 Oak 的题。 */
async function apiDailyEnglishAssess(db, req, session, env) {
  if (req.method !== 'POST') return json({ ok: false, error: 'METHOD' }, 405, { Allow: 'POST' });
  const sc = scopeChildId(session, new URL(req.url).searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  // 未配 key 用 200 + ok:false（与 /api/oak/assess 同一口径，前端友好提示走得到）。
  const hasIflytek = !!(env.IFLYTEK_APPID && env.IFLYTEK_API_KEY && env.IFLYTEK_API_SECRET);
  const hasAzure = !!env.AZURE_SPEECH_KEY;
  if (!hasIflytek && !hasAzure) return json({ ok: false, error: 'not_configured' });
  const ctype = (req.headers.get('Content-Type') || '').toLowerCase().trim();
  if (!ctype.startsWith('audio/wav')) return json({ ok: false, error: 'bad_type' }, 415);
  let refText;
  try {
    refText = decodeURIComponent(req.headers.get('x-ref-text') ?? '');
  } catch (_) {
    return json({ ok: false, error: 'bad_ref' }, 400);
  }
  if (refText.length < 1 || refText.length > 200) return json({ ok: false, error: 'bad_ref' }, 400);
  const today = shDateStr();
  const picked = dailyEnglishTodayFor(child, today);
  if (picked.error) return json({ ok: false, error: picked.error }, 400);
  const sentence = picked.sentences.find((s) => s.en === refText);
  if (!sentence) return json({ ok: false, error: 'bad_ref' }, 400);
  let audio;
  try {
    audio = await req.arrayBuffer();
  } catch (_) {
    return json({ ok: false, error: 'bad_size' }, 413);
  }
  if (audio.byteLength < 1000 || audio.byteLength > 3145728) return json({ ok: false, error: 'bad_size' }, 413);
  const pcm = iflytekWavToPcm(audio);
  if (!pcm || pcm.length < 100) return json({ ok: false, error: 'bad_size' }, 413);
  const assessed = await assessPronWithFailover(audio, pcm, refText, env);
  if (!assessed.ok) {
    if (assessed.error === 'timeout') return json({ ok: false, error: 'timeout' }, 504);
    if (assessed.error === 'iflytek') return json({ ok: false, error: 'iflytek', status: assessed.status ?? null }, 502);
    if (assessed.error === 'azure') return json({ ok: false, error: 'azure', status: assessed.status ?? null }, 502);
    if (assessed.error === 'bad_json') return json({ ok: false, error: 'bad_json' }, 502);
    if (assessed.error === 'not_recognized') return json({ ok: false, error: 'not_recognized' });
    if (assessed.error === 'not_configured') return json({ ok: false, error: 'not_configured' });
    return json({ ok: false, error: 'network' }, 502);
  }
  const res = assessed.res, provider = assessed.provider;
  const pron = res.pron;
  const rec = await dailyEnglishRecordAssess(db, child, today, dailyEnglishSidKey(sentence), pron);
  return json({ ok: true, pron, acc: res.acc,
    flu: res.flu, comp: res.comp, pros: res.pros, words: res.words, provider,
    stars: dailyEnglishStarsFromPron(pron), best: rec.best, attempts: rec.attempts,
    passed: rec.best >= DAILY_ENGLISH_PASS_PRON });
}

/* -------- 每日语文朗读（2026-11-09，任务表 77②，用户定：每天读一段课文/古诗、跟读评分） --------
 * 内容池：src/data/daily-chinese.js（部编版已学范围，逐首核对课本原文；小宝 g1 6 篇、大宝 g3 10 首）。
 * 每天 1 篇，同孩同日恒定（种子取 child_id＋当天日期，与每日英语同口径）。
 * 录音评分复用共用管线 assessPronWithFailover，传 { lang: 'zh' }（讯飞 cn_vip、Azure zh-CN）；
 * 过线 80 分＝4 星（DAILY_CHINESE_PASS_PRON，与每日英语一致；另用自己的星级函数
 * dailyChineseStarsFromPron，不复用每日英语的）。达标后记日志并发 1 次养成转盘机会
 * （source 'daily-chinese'、ref_id 当日日期、INSERT OR IGNORE 幂等）。
 * 示范音：v1 无示范音（站里无现成中文示范音源，不另搭服务）；只出文本＋录音评分。
 * 打卡与选题均须联网（不进 sync 注册表、不进离线端）；前端把当日篇目缓存在
 * localStorage（sm.dailyChinese.<childId>）。
 */
const DAILY_CHINESE_PASS_PRON = 75;
function dailyChineseStarsFromPron(pron) {
  if (typeof pron !== 'number' || !Number.isFinite(pron)) return 1;
  return pron >= 85 ? 5 : pron >= 75 ? 4 : pron >= 60 ? 3 : pron >= 40 ? 2 : 1;
}
function dailyChinesePoolFor(gradeNum) {
  if (gradeNum === 1) return DAILY_CHINESE_POOL.xiaobao;
  if (gradeNum === 3) return DAILY_CHINESE_POOL.dabao;
  return null;
}
function dailyChineseTodayFor(child, dateStr) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const pool = dailyChinesePoolFor(gradeNum);
  if (!pool) return { error: 'NO_POOL' };
  const rng = mulberry32(dailyEnglishHash32(`${child.id}:chinese:${dateStr}`));
  const item = pool[Math.floor(rollRng(rng) * pool.length)];
  return { date: dateStr, item: { id: item.id, title: item.title, author: item.author, kind: item.kind, unit: item.unit, text: item.text } };
}
async function apiDailyChinese(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const picked = dailyChineseTodayFor(child, today);
  if (picked.error) return json({ ok: false, error: picked.error }, 400);
  let done = null;
  try {
    done = await db.prepare('SELECT completed_epoch FROM daily_chinese_logs WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first();
  } catch (e) { /* 表未建：当未完成，不抛错 */ }
  const careWheelChances = await careWheelChancesLeft(db, child.id);
  const score = await dailyChineseAssessScore(db, child.id, today, picked.item.id);
  return json({ ok: true, childId: child.id, date: today, item: picked.item, completed: !!done, completedEpoch: done ? done.completed_epoch : null, careWheelChances, score });
}
async function apiDailyChineseCheckin(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const picked = dailyChineseTodayFor(child, today);
    if (picked.error) return json({ ok: false, error: picked.error }, 400);
    const score = await dailyChineseAssessScore(db, child.id, today, picked.item.id);
    const passed = score && typeof score.best === 'number' && score.best >= DAILY_CHINESE_PASS_PRON;
    if (!passed) return json({ ok: false, error: 'NOT_PASSED', best: score ? score.best : null, needed: DAILY_CHINESE_PASS_PRON });
    const now = Math.floor(Date.now() / 1000);
    await db.prepare('INSERT OR IGNORE INTO daily_chinese_logs(child_id, date_shanghai, item_id, completed_epoch) VALUES(?,?,?,?)').bind(child.id, today, picked.item.id, now).run();
    const careWheelGranted = await grantCareWheelChance(db, child.id, 'daily-chinese', today, today, now);
    const careWheelChances = await careWheelChancesLeft(db, child.id);
    return json({ ok: true, childId: child.id, date: today, completed: true, careWheelGranted, careWheelChances });
  });
}
async function dailyChineseAssessScore(db, childId, today, itemId) {
  try {
    const row = await db.prepare(
      'SELECT best_pron, attempts FROM daily_chinese_assessments WHERE child_id=? AND item_id=? AND date_shanghai=?'
    ).bind(childId, itemId, today).first();
    if (!row) return null;
    const best = Number(row.best_pron);
    return { best, attempts: Number(row.attempts) || 0, passed: best >= DAILY_CHINESE_PASS_PRON };
  } catch (e) { return null; }
}
async function dailyChineseRecordAssess(db, child, today, itemId, pron) {
  try {
    await db.prepare(
      `INSERT INTO daily_chinese_assessments(child_id, item_id, date_shanghai, best_pron, attempts, updated_epoch)
       VALUES(?,?,?,?,1,?)
       ON CONFLICT(child_id, item_id, date_shanghai) DO UPDATE SET
         best_pron = MAX(best_pron, excluded.best_pron),
         attempts = attempts + 1,
         updated_epoch = excluded.updated_epoch`
    ).bind(child.id, itemId, today, pron, Math.floor(Date.now() / 1000)).run();
  } catch (e) { console.error('daily chinese record assess failed', e); }
  try {
    const row = await db.prepare(
      'SELECT best_pron, attempts FROM daily_chinese_assessments WHERE child_id=? AND item_id=? AND date_shanghai=?'
    ).bind(child.id, itemId, today).first();
    if (row) return { best: Number(row.best_pron), attempts: Number(row.attempts) || 0 };
  } catch (e) {}
  return { best: pron, attempts: 1 };
}
async function apiDailyChineseAssess(db, req, session, env) {
  if (req.method !== 'POST') return json({ ok: false, error: 'METHOD' }, 405, { Allow: 'POST' });
  const sc = scopeChildId(session, new URL(req.url).searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const hasIflytek = !!(env.IFLYTEK_APPID && env.IFLYTEK_API_KEY && env.IFLYTEK_API_SECRET);
  const hasAzure = !!env.AZURE_SPEECH_KEY;
  if (!hasIflytek && !hasAzure) return json({ ok: false, error: 'not_configured' });
  const ctype = (req.headers.get('Content-Type') || '').toLowerCase().trim();
  if (!ctype.startsWith('audio/wav')) return json({ ok: false, error: 'bad_type' }, 415);
  let refText;
  try {
    refText = decodeURIComponent(req.headers.get('x-ref-text') ?? '');
  } catch (_) {
    return json({ ok: false, error: 'bad_ref' }, 400);
  }
  if (refText.length < 1 || refText.length > 200) return json({ ok: false, error: 'bad_ref' }, 400);
  const today = shDateStr();
  const picked = dailyChineseTodayFor(child, today);
  if (picked.error) return json({ ok: false, error: picked.error }, 400);
  if (picked.item.text !== refText) return json({ ok: false, error: 'bad_ref' }, 400);
  let audio;
  try {
    audio = await req.arrayBuffer();
  } catch (_) {
    return json({ ok: false, error: 'bad_size' }, 413);
  }
  if (audio.byteLength < 1000 || audio.byteLength > 3145728) return json({ ok: false, error: 'bad_size' }, 413);
  const pcm = iflytekWavToPcm(audio);
  if (!pcm || pcm.length < 100) return json({ ok: false, error: 'bad_size' }, 413);
  // 中文评测：传 { lang: 'zh' }（讯飞 cn_vip、Azure zh-CN）；只对供应商错误切换。
  const assessed = await assessPronWithFailover(audio, pcm, refText, env, { lang: 'zh' });
  if (!assessed.ok) {
    if (assessed.error === 'timeout') return json({ ok: false, error: 'timeout' }, 504);
    if (assessed.error === 'iflytek') return json({ ok: false, error: 'iflytek', status: assessed.status ?? null }, 502);
    if (assessed.error === 'azure') return json({ ok: false, error: 'azure', status: assessed.status ?? null }, 502);
    if (assessed.error === 'bad_json') return json({ ok: false, error: 'bad_json' }, 502);
    if (assessed.error === 'not_recognized') return json({ ok: false, error: 'not_recognized' });
    if (assessed.error === 'not_configured') return json({ ok: false, error: 'not_configured' });
    return json({ ok: false, error: 'network' }, 502);
  }
  const res = assessed.res, provider = assessed.provider;
  const pron = res.pron;
  const rec = await dailyChineseRecordAssess(db, child, today, picked.item.id, pron);
  return json({ ok: true, pron, acc: res.acc,
    flu: res.flu, comp: res.comp, pros: res.pros, words: res.words, provider,
    stars: dailyChineseStarsFromPron(pron), best: rec.best, attempts: rec.attempts,
    passed: rec.best >= DAILY_CHINESE_PASS_PRON });
}

/* -------- 每日数学口算（2026-11-09，任务表 77②，用户定：每天 5 道口算，5 道答对 4 道算完成） --------
 * 出题器：纯函数，种子取 child_id＋当天日期（mulberry32），同孩同日恒定；答案由种子重算，
 * 不下发给前端（前端只拿到题面），答题时服务端重算核对。
 * 范围（数学北师大版，当前进度上册第 2 单元；贴合年级当前水平，不出超纲题）：
 * - 一年级：20 以内加减法为主，少量 100 以内两位数加减一位数。
 * - 三年级：乘法口诀表内乘法、表内除法、多位数加减法。
 * 每题一次作答（提交后锁定，不可改）；答对数 ≥4 算完成；未完成当天不再重出新题（明日换新题）。
 * 完成（≥4 道）后记日志并发 1 次养成转盘机会（source 'daily-math'、ref_id 当日日期、INSERT OR IGNORE 幂等）。
 */
const DAILY_MATH_COUNT = 5;
const DAILY_MATH_PASS_COUNT = 4;
function genMathProblem(gradeNum, rng) {
  const ri = (n) => Math.floor(rollRng(rng) * n);
  if (gradeNum === 3) {
    const kind = rollRng(rng);
    if (kind < 0.4) {
      // 表内乘法 2–9 × 2–9
      const a = 2 + ri(8), b = 2 + ri(8);
      return { op: '×', q: `${a} × ${b} = ?`, a: a * b };
    }
    if (kind < 0.6) {
      // 表内除法：被除数＝除数×商，保证整除
      const d = 2 + ri(8), q = 2 + ri(8);
      return { op: '÷', q: `${d * q} ÷ ${d} = ?`, a: q };
    }
    if (kind < 0.8) {
      // 两位数加两位数
      const a = 10 + ri(90), b = 10 + ri(90);
      return { op: '+', q: `${a} + ${b} = ?`, a: a + b };
    }
    // 三位数减两位数
    const a = 100 + ri(900), b = 10 + ri(90);
    return { op: '−', q: `${a} − ${b} = ?`, a: a - b };
  }
  // 一年级：加减法
  if (rollRng(rng) < 0.7) {
    if (rollRng(rng) < 0.5) {
      // 20 以内加法
      const a = 1 + ri(19);
      const b = 1 + ri(20 - a);
      return { op: '+', q: `${a} + ${b} = ?`, a: a + b };
    }
    // 20 以内减法
    const a = 2 + ri(19);
    const b = 1 + ri(a - 1);
    return { op: '−', q: `${a} − ${b} = ?`, a: a - b };
  }
  if (rollRng(rng) < 0.5) {
    // 100 以内两位数加一位数
    const a = 10 + ri(80);
    const b = 1 + ri(9);
    return { op: '+', q: `${a} + ${b} = ?`, a: a + b };
  }
  // 100 以内两位数减一位数
  const a = 11 + ri(89);
  const b = 1 + ri(9);
  return { op: '−', q: `${a} − ${b} = ?`, a: a - b };
}
// 括号填数（2026-11-09，任务表 78）：() 里填一个数，答案是数字，走数字输入框。
// 题面为算式本身（中英文无差别），答案 a 为括号里的数；不加比大小（要填符号、不走数字框）。
function genMathBracket(gradeNum, rng) {
  const ri = (n) => Math.floor(rollRng(rng) * n);
  if (gradeNum === 3) {
    const kind = rollRng(rng);
    if (kind < 0.2) {
      // () × b = c（表内乘法）
      const a = 2 + ri(8), b = 2 + ri(8);
      return { kind: 'bracket', op: '×', q: `() × ${b} = ${a * b}`, a };
    }
    if (kind < 0.4) {
      // a × () = c（表内乘法）
      const a = 2 + ri(8), b = 2 + ri(8);
      return { kind: 'bracket', op: '×', q: `${a} × () = ${a * b}`, a: b };
    }
    if (kind < 0.6) {
      // c ÷ () = a（表内除法，保证整除）
      const a = 2 + ri(8), b = 2 + ri(8);
      return { kind: 'bracket', op: '÷', q: `${a * b} ÷ () = ${a}`, a: b };
    }
    if (kind < 0.8) {
      // () ÷ b = a（表内除法）
      const a = 2 + ri(8), b = 2 + ri(8);
      return { kind: 'bracket', op: '÷', q: `() ÷ ${b} = ${a}`, a: a * b };
    }
    if (kind < 0.9) {
      // () + b = c（两位数加两位数，和 ≤ 99）
      const a = 10 + ri(80);
      const b = 10 + ri(90 - a);
      return { kind: 'bracket', op: '+', q: `() + ${b} = ${a + b}`, a };
    }
    // a − () = c（三位数减两位数，a ≥ 100 > c，恒为正）
    const a = 100 + ri(900), c = 10 + ri(90);
    return { kind: 'bracket', op: '−', q: `${a} − () = ${c}`, a: a - c };
  }
  // 一年级：20 以内加减
  const kind = rollRng(rng);
  if (kind < 0.2) {
    // () + b = c（和 ≤ 20）
    const c = 2 + ri(19);
    const b = 1 + ri(c - 1);
    return { kind: 'bracket', op: '+', q: `() + ${b} = ${c}`, a: c - b };
  }
  if (kind < 0.4) {
    // a + () = c（和 ≤ 20）
    const a = 1 + ri(19);
    const c = a + 1 + ri(20 - a);
    return { kind: 'bracket', op: '+', q: `${a} + () = ${c}`, a: c - a };
  }
  if (kind < 0.6) {
    // a − () = c（a ≤ 20，c 可为 0）
    const a = 2 + ri(19);
    const c = ri(a);
    return { kind: 'bracket', op: '−', q: `${a} − () = ${c}`, a: a - c };
  }
  if (kind < 0.8) {
    // () − b = c（差＋减数 ≤ 20）
    const b = 1 + ri(10);
    const c = ri(21 - b);
    return { kind: 'bracket', op: '−', q: `() − ${b} = ${c}`, a: c + b };
  }
  // c = a + ()（数的分与合，c ≤ 10）
  const c = 2 + ri(9);
  const a = 1 + ri(c - 1);
  return { kind: 'bracket', op: '+', q: `${c} = ${a} + ()`, a: c - a };
}
// 应用题模板池（2026-11-09，任务表 78）：只参考小红书每日一练的题型结构（计算/括号/应用），
// 模板措辞均为原创（换场景、换数字），不照抄笔记原题；看图列算式不加（要配图，程序化出不了）。
// 每条：gen(ri) -> { zh, en, a, nums }，nums 为代入数字（按题意顺序）；solve(nums) 供测试重算答案。
// 年级口径：一年级只用 20 以内加减；三年级用表内乘除与两位数加减，不超纲。
const DAILY_MATH_WORD_G1 = [
  { id: 'g1-candy', op: '−',
    gen: (ri) => {
      const total = 6 + ri(10);
      const eaten = 1 + ri(total - 1);
      return { zh: `小红有 ${total} 颗糖，吃了 ${eaten} 颗，还剩几颗？`, en: `Xiaohong has ${total} candies. She eats ${eaten}. How many are left?`, a: total - eaten, nums: [total, eaten] };
    },
    solve: (n) => n[0] - n[1] },
  { id: 'g1-pencil', op: '+',
    gen: (ri) => {
      const first = 2 + ri(9);
      const more = 2 + ri(19 - first);
      return { zh: `盒子里有 ${first} 支铅笔，又放进 ${more} 支，一共有几支？`, en: `There are ${first} pencils in the box. ${more} more are put in. How many are there now?`, a: first + more, nums: [first, more] };
    },
    solve: (n) => n[0] + n[1] },
  { id: 'g1-fish', op: '+',
    gen: (ri) => {
      const left = 2 + ri(9);
      const eaten = 1 + ri(19 - left);
      return { zh: `小猫钓了一些鱼，吃了 ${eaten} 条，还剩 ${left} 条，原来钓了几条？`, en: `A cat caught some fish. It ate ${eaten} and ${left} are left. How many did it catch?`, a: left + eaten, nums: [left, eaten] };
    },
    solve: (n) => n[0] + n[1] },
  { id: 'g1-car', op: '+',
    gen: (ri) => {
      const front = 2 + ri(9);
      const back = 2 + ri(19 - front);
      return { zh: `停车场前面停了 ${front} 辆车，后面停了 ${back} 辆，一共有几辆？`, en: `There are ${front} cars in the front row and ${back} cars in the back row. How many cars are there in all?`, a: front + back, nums: [front, back] };
    },
    solve: (n) => n[0] + n[1] },
  { id: 'g1-apple', op: '−',
    gen: (ri) => {
      const total = 5 + ri(11);
      const red = 1 + ri(total - 1);
      return { zh: `一共有 ${total} 个苹果，红苹果有 ${red} 个，绿苹果有几个？`, en: `There are ${total} apples. ${red} are red. How many are green?`, a: total - red, nums: [total, red] };
    },
    solve: (n) => n[0] - n[1] },
];
const DAILY_MATH_WORD_G3 = [
  { id: 'g3-pen', op: '×',
    gen: (ri) => {
      const per = 2 + ri(8), boxes = 2 + ri(8);
      return { zh: `每盒有 ${per} 支笔，买了 ${boxes} 盒，一共有几支？`, en: `Each box has ${per} pens. There are ${boxes} boxes. How many pens are there in all?`, a: per * boxes, nums: [per, boxes] };
    },
    solve: (n) => n[0] * n[1] },
  { id: 'g3-apple', op: '÷',
    gen: (ri) => {
      const kids = 2 + ri(8), each = 2 + ri(8);
      return { zh: `${kids * each} 个苹果平均分给 ${kids} 个小朋友，每人分几个？`, en: `${kids * each} apples are shared equally among ${kids} children. How many does each child get?`, a: each, nums: [kids * each, kids] };
    },
    solve: (n) => n[0] / n[1] },
  { id: 'g3-car', op: '×',
    gen: (ri) => {
      const per = 2 + ri(8), cars = 2 + ri(8);
      return { zh: `一辆车坐 ${per} 人，${cars} 辆车一共坐几人？`, en: `One car seats ${per} people. How many people can ${cars} cars seat?`, a: per * cars, nums: [per, cars] };
    },
    solve: (n) => n[0] * n[1] },
  { id: 'g3-book', op: '+',
    gen: (ri) => {
      const morning = 10 + ri(51), afternoon = 10 + ri(51);
      return { zh: `上午卖了 ${morning} 本书，下午卖了 ${afternoon} 本，全天一共卖了几本？`, en: `${morning} books were sold in the morning and ${afternoon} in the afternoon. How many were sold in all?`, a: morning + afternoon, nums: [morning, afternoon] };
    },
    solve: (n) => n[0] + n[1] },
  { id: 'g3-shelf', op: '−',
    gen: (ri) => {
      const total = 100 + ri(201), borrowed = 10 + ri(90);
      return { zh: `书架上有 ${total} 本书，借走了 ${borrowed} 本，还剩几本？`, en: `There are ${total} books on the shelf. ${borrowed} are borrowed. How many are left?`, a: total - borrowed, nums: [total, borrowed] };
    },
    solve: (n) => n[0] - n[1] },
];
// 应用题：从年级模板池随机抽一条，数字由种子填入；q 为中文题干，qEn 为英文题干。
function genMathWord(gradeNum, rng) {
  const ri = (n) => Math.floor(rollRng(rng) * n);
  const pool = gradeNum === 3 ? DAILY_MATH_WORD_G3 : DAILY_MATH_WORD_G1;
  const tpl = pool[Math.floor(rollRng(rng) * pool.length)];
  const r = tpl.gen(ri);
  return { kind: 'word', op: tpl.op, q: r.zh, qEn: r.en, a: r.a, tpl: tpl.id, nums: r.nums };
}
function dailyMathTodayFor(child, dateStr) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  if (gradeNum !== 1 && gradeNum !== 3) return { error: 'NO_POOL' };
  const rng = mulberry32(dailyEnglishHash32(`${child.id}:math:${dateStr}`));
  // 构成固定：3 道口算＋1 道括号填数＋1 道应用题，位置由种子打乱（同孩同日恒定）
  const kinds = ['calc', 'calc', 'calc', 'bracket', 'word'];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rollRng(rng) * (i + 1));
    const t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t;
  }
  const problems = kinds.map((kind, i) => {
    if (kind === 'bracket') return { index: i, ...genMathBracket(gradeNum, rng) };
    if (kind === 'word') return { index: i, ...genMathWord(gradeNum, rng) };
    return { index: i, ...genMathProblem(gradeNum, rng), kind: 'calc' };
  });
  return { date: dateStr, problems };
}
async function dailyMathAnswers(db, childId, today) {
  try {
    const { results } = await db.prepare(
      'SELECT qindex, answer, correct FROM daily_math_answers WHERE child_id=? AND date_shanghai=?'
    ).bind(childId, today).all();
    const map = {};
    for (const r of results || []) map[Number(r.qindex)] = { answer: Number(r.answer), correct: Number(r.correct) === 1 };
    return map;
  } catch (e) { return {}; }
}
async function apiDailyMath(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const picked = dailyMathTodayFor(child, today);
  if (picked.error) return json({ ok: false, error: picked.error }, 400);
  let done = null;
  try {
    done = await db.prepare('SELECT completed_epoch FROM daily_math_logs WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first();
  } catch (e) { /* 表未建：当未完成 */ }
  const careWheelChances = await careWheelChancesLeft(db, child.id);
  const answers = await dailyMathAnswers(db, child.id, today);
  // 刷新后答错反馈仍能显示正确答案：只给已答错的题附 correctAnswer（题面本身仍不带答案）
  for (const [k, v] of Object.entries(answers)) {
    const prob = picked.problems[Number(k)];
    if (v && !v.correct && prob) v.correctAnswer = prob.a;
  }
  const correctCount = Object.values(answers).filter((x) => x && x.correct).length;
  // 题面下发不带答案（答案由种子重算核对）；应用题附英文题干 qEn，模板 id 与代入数字不下发
  const problems = picked.problems.map((p) => {
    const out = { index: p.index, q: p.q, op: p.op, kind: p.kind };
    if (p.qEn) out.qEn = p.qEn;
    return out;
  });
  return json({ ok: true, childId: child.id, date: today, problems, answers, correctCount, passed: correctCount >= DAILY_MATH_PASS_COUNT, completed: !!done, completedEpoch: done ? done.completed_epoch : null, careWheelChances });
}
async function apiDailyMathAnswer(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const picked = dailyMathTodayFor(child, today);
    if (picked.error) return json({ ok: false, error: picked.error }, 400);
    const idx = Number(body.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= picked.problems.length) return json({ ok: false, error: 'bad_index' }, 400);
    const ans = Number(body.answer);
    if (!Number.isFinite(ans)) return json({ ok: false, error: 'bad_answer' }, 400);
    // 已完成打卡：锁定，不再接受作答
    let done = null;
    try {
      done = await db.prepare('SELECT completed_epoch FROM daily_math_logs WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first();
    } catch (e) {}
    if (done) return json({ ok: false, error: 'completed' }, 400);
    const answers = await dailyMathAnswers(db, child.id, today);
    if (Object.hasOwn(answers, idx)) {
      const cur = answers[idx];
      const correctCount = Object.values(answers).filter((x) => x && x.correct).length;
      return json({ ok: true, index: idx, answer: cur.answer, correct: cur.correct, correctCount, passed: correctCount >= DAILY_MATH_PASS_COUNT, already: true });
    }
    const prob = picked.problems[idx];
    const correct = ans === prob.a;
    const now = Math.floor(Date.now() / 1000);
    try {
      await db.prepare(
        'INSERT INTO daily_math_answers(child_id, date_shanghai, qindex, answer, correct, answered_epoch) VALUES(?,?,?,?,?,?)'
      ).bind(child.id, today, idx, ans, correct ? 1 : 0, now).run();
    } catch (e) { console.error('daily math record answer failed', e); }
    const answers2 = await dailyMathAnswers(db, child.id, today);
    const correctCount = Object.values(answers2).filter((x) => x && x.correct).length;
    return json({ ok: true, index: idx, answer: ans, correct, correctAnswer: correct ? undefined : prob.a, correctCount, passed: correctCount >= DAILY_MATH_PASS_COUNT });
  });
}
async function apiDailyMathCheckin(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const answers = await dailyMathAnswers(db, child.id, today);
    const correctCount = Object.values(answers).filter((x) => x && x.correct).length;
    if (correctCount < DAILY_MATH_PASS_COUNT) return json({ ok: false, error: 'NOT_PASSED', correctCount, needed: DAILY_MATH_PASS_COUNT });
    const now = Math.floor(Date.now() / 1000);
    await db.prepare('INSERT OR IGNORE INTO daily_math_logs(child_id, date_shanghai, completed_epoch) VALUES(?,?,?)').bind(child.id, today, now).run();
    const careWheelGranted = await grantCareWheelChance(db, child.id, 'daily-math', today, today, now);
    const careWheelChances = await careWheelChancesLeft(db, child.id);
    return json({ ok: true, childId: child.id, date: today, completed: true, careWheelGranted, careWheelChances });
  });
}


/* -------- Oak 讯飞评测（流式版，2026-11-03 Azure 取消后替代 Azure 发音评估） --------
 * 浏览器本来就传 16k 单声道 PCM16 WAV（前端 oakEncodeWav16），与讯飞要求一致，
 * Worker 只需剥掉 WAV 头、经 WebSocket 中转到 ise-api.xfyun.cn。
 * 评分映射（先按现行口径，孩子实测后再看要不要重调）：
 *   pron = 讯飞 read_sentence.total_score；acc/flu/comp/pros 依次对应
 *   accuracy/fluency/integrity/standard（讯飞无独立韵律分，标准度作近似）；
 *   星级沿用 oakStarsFromPron（85 分线不动）；词级 dp_message 按文档映射回
 *   前端认识的 err（Omission/Insertion 等）。
 * 音频帧字段名按文档数据表取 data（响应侧 data.data 同名佐证），首个实测若报
 * 参数错误再改 audio。 */

/* WAV → 裸 PCM：扫描 chunk 找 data 段（前端写标准 44 字节头，但容忍附加 chunk）。 */
function iflytekWavToPcm(buf) {
  const b = new Uint8Array(buf);
  if (b.length < 44) return null;
  const tag = (o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let off = 12;
  while (off + 8 <= b.length) {
    const size = (b[off + 4] | (b[off + 5] << 8) | (b[off + 6] << 16) | (b[off + 7] << 24)) >>> 0;
    if (tag(off) === 'data') return b.slice(off + 8, Math.min(b.length, off + 8 + size));
    off += 8 + size + (size % 2);
  }
  return null;
}

function iflytekB64encode(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

function iflytekB64decodeUtf8(b64) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  } catch (_) { return ''; }
}

/* HMAC-SHA256 签名：signature_origin = "host: <host>\ndate: <RFC1123>\nGET <path> HTTP/1.1"。
 * 默认评测地址（ise-api.xfyun.cn/v2/open-ise）；合成传 tts-api.xfyun.cn/v2/tts。 */
async function iflytekSignature(apiSecret, dateStr, host = 'ise-api.xfyun.cn', path = '/v2/open-ise') {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const origin = `host: ${host}\ndate: ${dateStr}\nGET ${path} HTTP/1.1`;
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(origin));
  return iflytekB64encode(new Uint8Array(sig));
}

async function iflytekAuthUrl(appId, apiKey, apiSecret, host = 'ise-api.xfyun.cn', path = '/v2/open-ise') {
  const dateStr = new Date().toUTCString();
  const signature = await iflytekSignature(apiSecret, dateStr, host, path);
  const authorization = btoa(`api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`);
  return `wss://${host}${path}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(dateStr)}&host=${host}`;
}

function iflytekDpToErr(dp) {
  switch (Number(dp)) {
    case 16: return 'Omission';
    case 32: return 'Insertion';
    case 64: return 'Repetition';
    case 128: return 'Mispronunciation';
    default: return 'None';
  }
}

/* 解析讯飞最终结果 XML（read_sentence 节点＋ word 节点），无有效总分返回 null。 */
function iflytekParseResultXml(xml) {
  if (!xml || typeof xml !== 'string') return null;
  // 真实引擎结构（2026-11-04 实测）：<xml_result><read_sentence><rec_paper><read_chapter …>，
  // 分数在内层 read_chapter 上（0–5 分制），不在外层 read_sentence 上；旧手写测试 XML
  // 的分数在 read_sentence 上，兼容两者。乱说拒识（is_rejected=true）时分数不可信，返回 null。
  const node = xml.match(/<read_chapter\b([^>]*)>/) || xml.match(/<read_sentence\b([^>]*)>/);
  if (!node) return null;
  if (/is_rejected="true"/.test(xml)) return null;
  const attrs = {};
  for (const [, k, v] of node[1].matchAll(/([a-z_]+)="([^"]*)"/g)) attrs[k] = v;
  const raw = parseFloat(attrs.total_score);
  if (!Number.isFinite(raw)) return null;
  const scale = raw <= 5 ? 20 : 1;
  const r1 = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * scale * 10) / 10 : null; };
  const words = [];
  for (const wm of xml.matchAll(/<word\b([^>]*)\/?>/g)) {
    const wa = {};
    for (const [, k, v] of wm[1].matchAll(/([a-z_]+)="([^"]*)"/g)) wa[k] = v;
    if (!wa.content) continue;
    words.push({ w: wa.content, score: r1(wa.total_score), err: iflytekDpToErr(wa.dp_message) });
  }
  return { pron: r1(attrs.total_score), acc: r1(attrs.accuracy_score), flu: r1(attrs.fluency_score),
    comp: r1(attrs.integrity_score), pros: r1(attrs.standard_score), words };
}

async function iflytekAssess(pcm, refText, env, opts) {
  const appId = env.IFLYTEK_APPID, apiKey = env.IFLYTEK_API_KEY, apiSecret = env.IFLYTEK_API_SECRET;
  if (!appId || !apiKey || !apiSecret) return { ok: false, error: 'not_configured' };
  let url;
  try { url = await iflytekAuthUrl(appId, apiKey, apiSecret); }
  catch (_) { return { ok: false, error: 'network' }; }
  // 语言：默认英文（en_vip）；中文每日语文传 { lang: 'zh' } → cn_vip。
  const ent = opts && opts.lang === 'zh' ? 'cn_vip' : 'en_vip';
  return new Promise((resolve) => {
    let ws = null, done = false, timer = null;
    const finish = (r) => {
      if (done) return;
      done = true;
      if (timer !== null) clearTimeout(timer);
      try { ws && ws.close(1000); } catch (_) {}
      resolve(r);
    };
    timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), 25000);
    try { ws = new WebSocket(url); }
    catch (_) { return finish({ ok: false, error: 'network' }); }
    ws.addEventListener('open', () => {
      try {
        ws.send(JSON.stringify({ common: { app_id: appId },
          business: { sub: 'ise', ent, category: 'read_sentence', cmd: 'ssb',
            text: '\uFEFF' + refText, tte: 'utf-8', ttp_skip: true, aue: 'raw',
            auf: 'audio/L16;rate=16000', rst: 'entirety', rstcd: 'utf8' },
          data: { status: 0 } }));
        const CH = 1280;
        for (let off = 0; off < pcm.length; off += CH) {
          const chunk = pcm.slice(off, off + CH);
          const isLast = off + CH >= pcm.length;
          ws.send(JSON.stringify({ business: { cmd: 'auw', aus: isLast ? 4 : (off === 0 ? 1 : 2) },
            data: { status: isLast ? 2 : 1, data: iflytekB64encode(chunk) } }));
        }
      } catch (_) { finish({ ok: false, error: 'network' }); }
    });
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ''); } catch (_) { return; }
      if (!msg || typeof msg !== 'object') return;
      if (msg.code !== 0) return finish({ ok: false, error: 'iflytek', status: msg.code ?? null });
      if (msg.data && msg.data.status === 2) {
        const parsed = iflytekParseResultXml(iflytekB64decodeUtf8(msg.data.data || ''));
        if (!parsed) return finish({ ok: false, error: 'not_recognized' });
        return finish({ ok: true, ...parsed });
      }
    });
    ws.addEventListener('error', () => finish({ ok: false, error: 'network' }));
    ws.addEventListener('close', () => finish({ ok: false, error: 'network' }));
  });
}

/* Azure 语音评测（REST，备线）：与讯飞同一返回形状，便于主备切换。
 * 区域 env.AZURE_SPEECH_REGION，默认 southeastasia（新资源 YOUR_AZURE_SPEECH_RESOURCE 所在区）；
 * 密钥 env.AZURE_SPEECH_KEY（Worker 机密，用户在控制台粘贴；与已失效的 SPEECH_KEY
 * 区分命名，避免旧密钥残留混淆）。音频直接传浏览器原 WAV（Azure 接受整段 WAV，
 * 与讯飞需剥头 PCM 不同）。 */
async function azureAssess(audio, refText, env, opts) {
  const key = env.AZURE_SPEECH_KEY;
  if (!key) return { ok: false, error: 'not_configured' };
  const region = env.AZURE_SPEECH_REGION || 'southeastasia';
  // 语言：默认 en-US；中文每日语文传 { lang: 'zh' } → zh-CN。
  const lang = opts && opts.lang === 'zh' ? 'zh-CN' : 'en-US';
  const config = {
    ReferenceText: refText, GradingSystem: 'HundredMark', Granularity: 'Word',
    Dimension: 'Comprehensive', EnableMiscue: true, EnableProsodyAssessment: true,
  };
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(config))));
  const controller = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? null : new AbortController();
  const signal = controller ? controller.signal : AbortSignal.timeout(25000);
  const timer = controller ? setTimeout(() => controller.abort(), 25000) : null;
  let azRes, data;
  try {
    azRes = await fetch(`https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${lang}&format=detailed`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': encoded, Accept: 'application/json',
      },
      body: audio, signal,
    });
    if (signal.aborted) return { ok: false, error: 'timeout' };
    if (azRes.status !== 200) return { ok: false, error: 'azure', status: azRes.status };
    try { data = await azRes.json(); } catch (_) { return { ok: false, error: 'bad_json' }; }
  } catch (e) {
    if (signal.aborted || e.name === 'AbortError' || e.name === 'TimeoutError') return { ok: false, error: 'timeout' };
    return { ok: false, error: 'network' };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'bad_json' };
  if (data.RecognitionStatus !== 'Success') return { ok: false, error: 'not_recognized', status: data.RecognitionStatus ?? null };
  const best = Array.isArray(data.NBest) ? data.NBest[0] : null;
  if (!best) return { ok: false, error: 'not_recognized', status: 'NoResult' };
  const r1 = (v) => typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
  const paN = best.PronunciationAssessment || {};
  const score = (k) => r1(paN[k] ?? best[k]);
  const words = (Array.isArray(best.Words) ? best.Words : []).map((w) => {
    const wpa = (w && w.PronunciationAssessment) || {};
    return { w: String(w?.Word ?? ''), score: r1(wpa.AccuracyScore ?? w?.AccuracyScore), err: (wpa.ErrorType ?? w?.ErrorType) || 'None' };
  });
  return { ok: true, pron: score('PronScore'), acc: score('AccuracyScore'),
    flu: score('FluencyScore'), comp: score('CompletenessScore'), pros: score('ProsodyScore'), words };
}

/* 发音评测主备（讯飞主、Azure 备；Oak 与每日英语共用）：只对供应商错误切换，not_recognized 是评测结论、不切换。
 * 返回 { ok:true, res, provider } 或 { ok:false, error, status }。
 * error: 'not_configured' | 'timeout' | 'iflytek' | 'azure' | 'bad_json' | 'network' | 'not_recognized' */
async function assessPronWithFailover(audio, pcm, refText, env, opts) {
  const hasIflytek = !!(env.IFLYTEK_APPID && env.IFLYTEK_API_KEY && env.IFLYTEK_API_SECRET);
  const hasAzure = !!env.AZURE_SPEECH_KEY;
  if (!hasIflytek && !hasAzure) return { ok: false, error: 'not_configured' };
  const attempts = [];
  if (hasIflytek) attempts.push(['iflytek', () => iflytekAssess(pcm, refText, env, opts)]);
  if (hasAzure) attempts.push(['azure', () => azureAssess(audio, refText, env, opts)]);
  let res = null, provider = null, firstErr = null;
  // 中文（2026-11-09）：讯飞 cn_vip 对中文识别不稳（同一音频可 84 分也可 not_recognized），
  // not_recognized 也继续试 Azure 备线；英文保持原策略（not_recognized 不切换）。
  const chineseRetry = opts && opts.lang === 'zh';
  for (let i = 0; i < attempts.length; i++) {
    const [name, run] = attempts[i];
    const r = await run();
    if (r.ok) { res = r; provider = name; break; }
    if (r.error === 'not_recognized') {
      if (chineseRetry && i < attempts.length - 1) { if (!firstErr) firstErr = r; continue; }
      res = r; break;
    }
    if (!firstErr) firstErr = r;
  }
  if (!res) {
    const e = firstErr || { error: 'network' };
    return { ok: false, error: e.error, status: e.status ?? null };
  }
  if (!res.ok) return { ok: false, error: 'not_recognized' };
  if (provider === 'azure' && hasIflytek) console.warn('pron failover iflytek->azure', firstErr?.error ?? null);
  return { ok: true, res, provider };
}

async function apiOakAssess(db, req, session, env) {
  if (req.method !== 'POST') return json({ ok: false, error: 'METHOD' }, 405, { Allow: 'POST' });
  const sc = scopeChildId(session, new URL(req.url).searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  // 未配 key 用 200 + ok:false（不用 503）：前端在 !response.ok 时直接抛通用报错、读不到 body，
  // 友好提示“AI 点评还没开通”永远走不到；与 not_recognized 的 200 惯例一致。
  // 主备：讯飞主、Azure 备；任一未配都跳过该线，两线全无才 not_configured。
  const hasIflytek = !!(env.IFLYTEK_APPID && env.IFLYTEK_API_KEY && env.IFLYTEK_API_SECRET);
  const hasAzure = !!env.AZURE_SPEECH_KEY;
  if (!hasIflytek && !hasAzure) return json({ ok: false, error: 'not_configured' });
  const ctype = (req.headers.get('Content-Type') || '').toLowerCase().trim();
  if (!ctype.startsWith('audio/wav')) return json({ ok: false, error: 'bad_type' }, 415);
  let refText;
  try {
    refText = decodeURIComponent(req.headers.get('x-ref-text') ?? '');
  } catch (_) {
    return json({ ok: false, error: 'bad_ref' }, 400);
  }
  if (refText.length < 1 || refText.length > 200) return json({ ok: false, error: 'bad_ref' }, 400);
  const group = await oakGroupForChild(db, child, shDateStr());
  if (!group.sentences.some((s) => s.en === refText)) return json({ ok: false, error: 'bad_ref' }, 400);
  let audio;
  try {
    audio = await req.arrayBuffer();
  } catch (_) {
    return json({ ok: false, error: 'bad_size' }, 413);
  }
  if (audio.byteLength < 1000 || audio.byteLength > 3145728) return json({ ok: false, error: 'bad_size' }, 413);
  const pcm = iflytekWavToPcm(audio);
  if (!pcm || pcm.length < 100) return json({ ok: false, error: 'bad_size' }, 413);
  // 主备切换走共用 helper（讯飞主、Azure 备；只对供应商错误切换，not_recognized 是评测结论、不切换、不重复计分）。
  const assessed = await assessPronWithFailover(audio, pcm, refText, env);
  if (!assessed.ok) {
    if (assessed.error === 'not_configured') return json({ ok: false, error: 'not_configured' });
    if (assessed.error === 'timeout') return json({ ok: false, error: 'timeout' }, 504);
    if (assessed.error === 'iflytek') return json({ ok: false, error: 'iflytek', status: assessed.status ?? null }, 502);
    if (assessed.error === 'azure') return json({ ok: false, error: 'azure', status: assessed.status ?? null }, 502);
    if (assessed.error === 'bad_json') return json({ ok: false, error: 'bad_json' }, 502);
    if (assessed.error === 'not_recognized') return json({ ok: false, error: 'not_recognized' });
    return json({ ok: false, error: 'network' }, 502);
  }
  const res = assessed.res, provider = assessed.provider;
  const pron = res.pron;
  // 记成绩＋全 5 星抽奖（抽奖失败不影响点评本身返回）
  const q = group.sentences.find((s) => s.en === refText);
  let rec = { stars: oakStarsFromPron(pron), fiveStarCount: 0, fiveStarTotal: group.sentences.length, draw: null, justDrawn: false };
  try {
    rec = await oakRecordAssessAndMaybeDraw(db, child, shDateStr(), group, q.id, pron);
  } catch (e) { console.error('oak draw failed', e); }
  return json({ ok: true, pron, acc: res.acc,
    flu: res.flu, comp: res.comp, pros: res.pros, words: res.words, provider,
    stars: rec.stars, fiveStarCount: rec.fiveStarCount, fiveStarTotal: rec.fiveStarTotal,
    draw: rec.draw ? { ...rec.draw, justDrawn: rec.justDrawn } : null });
}

async function apiOakListen(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const questionId = Number(body.question_id ?? body.questionId);
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const group = await oakGroupForChild(db, child, today);
  const q = group.sentences.find((s) => s.id === questionId);
  if (!q) return json({ ok: false, error: '这句不在今天的大木博士英语里' }, 400);
  const idx = group.sentences.indexOf(q);
  if (!GATES_OPEN_FULL && idx !== group.listenedCount) {
    return json({ ok: false, error: '要按顺序听哦，先听第 ' + (group.listenedCount + 1) + ' 句' }, 400);
  }
  const quizXp = Number((await getSetting(db, 'quiz_xp')) || 10);
  /* 完成判定以当日实际集长为准（2026-11-13：补句前 5 句集的最后一句 idx=4 即完成；
   * 旧写法用 OAK_GROUP_SIZE-1，5 句集永远走不到完成、也不发 10 XP；现行补句逻辑已把
   * 集长补到 6，此处仍按实际长度算，作候选取完时的兜底）。 */
  const lastIdx = group.sentences.length - 1;
  /* 任务 124：放行时先删当日旧作答（唯一约束 ux_quiz_attempt）。 */
  if (GATES_OPEN_FULL) {
    await db.prepare('DELETE FROM quiz_attempts WHERE child_id=? AND question_id=? AND date_shanghai=?').bind(childId, questionId, today).run();
  }
  const ins = await db.prepare(
    'INSERT OR IGNORE INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch) VALUES(?,?,?,?,?,?,?)'
  ).bind(
    childId, questionId, today, 1, idx === lastIdx ? quizXp : 0, 0, Math.floor(Date.now()/1000)
  ).run();
  if (!ins.meta || !ins.meta.changes) return json({ ok: false, error: '这句今天已经听过啦' }, 400);
  let xpInfo = null;
  if (idx === lastIdx) {
    xpInfo = await grantXp(db, child, quizXp, today);
    await pushEvoNotices(db, child.id, xpInfo);
  }
  return json({
    ok: true, listened: true, sentenceIdx: idx + 1, completed: idx === lastIdx,
    xpAwarded: idx === lastIdx ? quizXp : 0, listenedCount: idx + 1,
    level: xpInfo ? {
      oldLevel: xpInfo.oldLevel, newLevel: xpInfo.newLevel,
      levelsGained: xpInfo.levelsGained, newMoves: xpInfo.newMoves,
      evolved: xpInfo.evolved,
    } : null,
  });
}

/* -------- 家长 · 题目管理 -------- */

function quizRowForParent(r) {
  return {
    id: r.id, kind: r.kind, grade: r.grade,
    gradeLabel: r.grade === 1 ? '一年级' : r.grade === 3 ? '三年级' : '通用',
    subject: r.subject, question: r.question, options: safeJsonArr(r.options_json),
    answer_idx: r.answer_idx, explain: r.explain || '', active: r.active !== 0,
    isCustom: !!r.is_custom,
  };
}

async function apiParentQuestions(db) {
  const { results } = await db.prepare('SELECT * FROM quiz_questions ORDER BY id').all();
  const n = (f) => results.filter(f).length;
  return json({
    ok: true,
    stats: {
      riddle: n((r) => r.kind === 'riddle' && r.active !== 0),
      grade1: n((r) => r.kind === 'study' && r.grade === 1 && r.active !== 0),
      grade3: n((r) => r.kind === 'study' && r.grade === 3 && r.active !== 0),
      custom: n((r) => r.kind === 'custom' && r.active !== 0),
      total: n((r) => r.active !== 0),
    },
    questions: results.filter((r) => r.is_custom).map(quizRowForParent),
  });
}

async function apiParentQuestionAdd(db, req) {
  const body = await readJsonBody(req);
  const question = String(body.question || '').trim().slice(0, 300);
  const options = Array.isArray(body.options) ? body.options.map((o) => String(o || '').trim().slice(0, 100)) : [];
  const answerIdx = Number(body.answer_idx ?? body.answerIndex);
  const explain = String(body.explain || '').trim().slice(0, 300);
  const subject = String(body.subject || '');
  const grade = (body.grade === null || body.grade === undefined || body.grade === '') ? null : Number(body.grade);
  if (!question) return json({ ok: false, error: '题目不能为空' }, 400);
  if (options.length !== 4 || options.some((o) => !o)) return json({ ok: false, error: '需要 4 个非空选项' }, 400);
  if (![0, 1, 2, 3].includes(answerIdx)) return json({ ok: false, error: '正确答案不对' }, 400);
  if (!QUIZ_SUBJECTS.includes(subject)) return json({ ok: false, error: '科目只能选 语文/数学/英语/阅读' }, 400);
  if (grade !== null && ![1, 3].includes(grade)) return json({ ok: false, error: '年级只能是 通用/一年级/三年级' }, 400);
  const ins = await db.prepare(
    `INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at)
     VALUES('custom',?,?,?,?,?,?,1,1,?)`
  ).bind(grade, subject, question, JSON.stringify(options), answerIdx, explain, Math.floor(Date.now() / 1000)).run();
  if (ins.meta) {
    // quiz_questions 是全局题库：行 ver 写 0（touchRow 在 version 为 0 时跳过不写），只推全员版本
    await bumpAllChildrenVersions(db);
  }
  return json({ ok: true });
}

async function apiParentQuestionToggle(db, qid) {
  const r = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(qid).first();
  if (!r) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const next = r.active !== 0 ? 0 : 1;
  /* 入库标签规矩：重新激活时，数学学习题无章节标签或标签无法解析一律拒绝（fail-closed） */
  if (next === 1) {
    const err = questionActivationError(normalizeQuizRow(r));
    if (err) return json({ ok: false, error: err }, 400);
  }
  await db.prepare('UPDATE quiz_questions SET active=? WHERE id=?').bind(next, qid).run();
  await bumpAllChildrenVersions(db);
  return json({ ok: true, active: !!next });
}

async function apiParentQuestionDelete(db, qid) {
  const r = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(qid).first();
  if (!r) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (!r.is_custom) return json({ ok: false, error: '内置题不能删除，只能禁用' }, 400);
  await db.prepare('DELETE FROM quiz_questions WHERE id=?').bind(qid).run();
  await bumpAllChildrenVersions(db);
  return json({ ok: true });
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

/* 待展示通知（未 shown 的，按写入顺序） */
async function pendingNotices(db, childId) {  const { results } = await db.prepare(
    'SELECT * FROM child_notices WHERE child_id=? AND shown=0 ORDER BY id'
  ).bind(childId).all();
  return results.map((r) => {
    let payload = {};
    try { payload = JSON.parse(r.payload || '{}'); } catch { /* 损坏 payload 按空处理 */ }
    return { id: r.id, kind: r.kind, payload };
  });
}

/* 通知展示确认：child 会话只能确认自己的通知 */
async function apiNoticesAck(db, req, session) {
  const body = await readJsonBody(req);
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  if (!ids.length) return json({ ok: true, acked: 0 });
  const ph = ids.map(() => '?').join(',');
  if (session.kind === 'child') {
    await db.prepare(`UPDATE child_notices SET shown=1 WHERE child_id=? AND id IN (${ph})`)
      .bind(session.child_id, ...ids).run();
  } else {
    await db.prepare(`UPDATE child_notices SET shown=1 WHERE id IN (${ph})`).bind(...ids).run();
  }
  {
    const rows = (await db.prepare(`SELECT id, child_id FROM child_notices WHERE id IN (${ph})`).bind(...ids).all()).results || [];
    const verByChild = new Map();
    for (const r of rows) {
      if (!verByChild.has(r.child_id)) verByChild.set(r.child_id, await bumpChildVersion(db, r.child_id));
      await touchRow(db, 'child_notices', 'id=?', [r.id], verByChild.get(r.child_id));
    }
  }
  return json({ ok: true });
}

async function getChildren(db) {
  const { results } = await db.prepare('SELECT * FROM children ORDER BY id').all();
  return results;
}

async function pendingEncounter(db, childId, today) {
  return db.prepare(
    "SELECT * FROM encounters WHERE child_id=? AND date=? AND status='pending' ORDER BY id DESC LIMIT 1"
  ).bind(childId, today).first();
}

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

/* 把某个打卡行的照片集合整体设为 list（保留 keepId 对应的旧行，删其余旧行，写入新照片）。
 * 调用前需保证 env.PHOTOS 可用（接口层先校验带照片时桶存在）。 */
async function setCheckinPhotos(db, env, checkinId, childId, date, list) {
  const { results: old } = await db.prepare('SELECT * FROM checkin_photos WHERE checkin_id=?').bind(checkinId).all();
  const keepIds = new Set(list.filter((p) => p.keepId).map((p) => p.keepId));
  // 先校验全部 keepId 归属再删旧图：校验不过时一张都不能删，避免失败请求吞掉已有照片
  for (const id of keepIds) {
    if (!old.some((o) => o.id === id)) throw new Error('PHOTO_NOT_OWNED');
  }
  const doomed = old.filter((o) => !keepIds.has(o.id));
  if (doomed.length) {
    const v = await bumpChildVersion(db, childId);
    for (const o of doomed) {
      await recordTombstone(db, childId, 'checkin_photos', o.id, v);
      await photoDelete(env, o.object_key);
      await db.prepare('DELETE FROM checkin_photos WHERE id=?').bind(o.id).run();
    }
  }
  const now = Math.floor(Date.now() / 1000);
  for (const p of list) {
    if (p.keepId) {
      if (!old.some((o) => o.id === p.keepId)) throw new Error('PHOTO_NOT_OWNED');
      continue;
    }
    const rand = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const key = `checkins/${childId}/${date}/${checkinId}-${now}-${rand}.${photoExt(p.contentType)}`;
    await photoPut(env, key, p.bytes, p.contentType);
    const ins = await db.prepare('INSERT INTO checkin_photos(checkin_id, object_key, content_type, size, created_epoch) VALUES(?,?,?,?,?)')
      .bind(checkinId, key, p.contentType, p.bytes.length, now).run();
    if (ins.meta) {
      const v = await bumpChildVersion(db, childId);
      await touchRow(db, 'checkin_photos', 'id=?', [Number(ins.meta.last_row_id)], v);
    }
  }
}

async function photosOfCheckin(db, checkinId) {
  const { results } = await db.prepare(
    'SELECT id, content_type, size FROM checkin_photos WHERE checkin_id=? ORDER BY id'
  ).bind(checkinId).all();
  return results.map((r) => ({ id: r.id, contentType: r.content_type, size: r.size }));
}

/* 批量取照片索引（家长队列/今日状态用）：Map(checkinId → [{id,...}])
 * D1 单条语句最多 100 个绑定参数（2026-11-06 同类审计：apiPendingReviews 的待审核
 * 列表无 LIMIT，两孩每天约 10 条、约 10 天不审就超 100 参数致家长审核页 500；
 * 与同日仓库 take 报 500 同一类问题；本地 node:sqlite 上限 999 故回归测不出来）。
 * 故按 id 分批查（每批 ≤50，留足余量），逐批合并。语义与原来一致：去重后每个
 * checkin_id 只出现在一批里，每只打卡的照片仍按 id 升序；调用方只用 map.get()，
 * map 的键插入顺序不影响结果。修 helper 一处，三个调用方（今日/历史/待审核）全受益。 */
async function photosByCheckin(db, checkinIds) {
  const map = new Map();
  if (!checkinIds.length) return map;
  const ids = [...new Set(checkinIds)];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const ph = batch.map(() => '?').join(',');
    const { results } = await db.prepare(
      `SELECT id, checkin_id, content_type, size FROM checkin_photos WHERE checkin_id IN (${ph}) ORDER BY id`
    ).bind(...batch).all();
    for (const r of results) {
      if (!map.has(r.checkin_id)) map.set(r.checkin_id, []);
      map.get(r.checkin_id).push({ id: r.id, contentType: r.content_type, size: r.size });
    }
  }
  return map;
}

/* 今日五科状态（孩子「今日」汇总与打卡页的数据源）：每科至多一行（唯一索引保证） */
async function todaySubjectsFor(db, childId, today) {
  const { results } = await db.prepare(
    'SELECT * FROM checkins WHERE child_id=? AND date=? AND subject IS NOT NULL'
  ).bind(childId, today).all();
  const bySubject = new Map(results.map((r) => [r.subject, r]));
  const pmap = await photosByCheckin(db, results.map((r) => r.id));
  return CHECKIN_SUBJECTS.map((subject) => {
    const r = bySubject.get(subject);
    if (!r) return { subject, checkin: null };
    return {
      subject,
      checkin: {
        id: r.id, status: r.status, note: r.note || '', isEarly: !!r.is_early,
        xpAwarded: r.xp_awarded, reason: r.reason || '', submittedAt: r.submitted_at,
        photos: pmap.get(r.id) || [],
      },
    };
  });
}

/* 图鉴已解锁种数（问候头卡四格之一） */
async function pokedexCountFor(db, childId) {
  const r = await db.prepare('SELECT COUNT(*) n FROM pokedex WHERE child_id=?').bind(childId).first();
  return r ? r.n : 0;
}

/* ---------------- API 处理 ---------------- */

/* ---------------- 登录接口（入口页用，公开） ---------------- */

/* PIN 校验（含失败计数与锁定），家长入口登录与应用内升级共用。
 * 返回 {ok:true} 或 {ok:false, error, status, retryAfter?, attemptsLeft?} */
async function checkPin(db, pin) {
  const now = Math.floor(Date.now() / 1000);
  const lockedUntil = Number((await getSetting(db, 'pin_locked_until')) || 0);
  if (lockedUntil > now) {
    return { ok: false, error: 'PIN_LOCKED', retryAfter: lockedUntil - now, status: 429 };
  }
  const stored = await getSetting(db, 'pin');
  const h = await sha256hex(String(pin || ''));
  if (stored && h === stored) {
    await setSetting(db, 'pin_fail_count', '0');
    return { ok: true };
  }
  const fails = Number((await getSetting(db, 'pin_fail_count')) || 0) + 1;
  await setSetting(db, 'pin_fail_count', String(fails));
  if (fails >= PIN_LOCK_MAX) {
    await setSetting(db, 'pin_locked_until', String(now + PIN_LOCK_SECS));
    await setSetting(db, 'pin_fail_count', '0');
    return { ok: false, error: 'PIN_LOCKED', retryAfter: PIN_LOCK_SECS, status: 429 };
  }
  return { ok: false, error: 'PIN_WRONG', attemptsLeft: PIN_LOCK_MAX - fails, status: 401 };
}

async function apiParentLogin(db, req) {
  const body = await readJsonBody(req);
  const r = await checkPin(db, body.pin);
  if (!r.ok) return json({ ok: false, error: r.error, retryAfter: r.retryAfter, attemptsLeft: r.attemptsLeft }, r.status);
  const token = await createSession(db, 'parent', null);
  return json({ ok: true, role: 'parent' }, 200, { 'Set-Cookie': sessionCookie(token) });
}

/* 孩子登录：密码未设置 → PWD_NOT_SET（前端提示找家长设置）；
 * 按孩子分别计数，错 5 次锁 5 分钟（防兄弟互猜）。 */
async function apiChildLogin(db, req) {
  const body = await readJsonBody(req);
  const childId = Number(body.childId ?? body.child_id);
  const child = childId ? await getChild(db, childId) : null;
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (!child.pwd_hash) return json({ ok: false, error: 'PWD_NOT_SET' }, 403);
  const now = Math.floor(Date.now() / 1000);
  if ((child.pwd_locked_until || 0) > now) {
    return json({ ok: false, error: 'CHILD_LOCKED', retryAfter: child.pwd_locked_until - now }, 429);
  }
  const h = await sha256hex(String(body.password || ''));
  if (h !== child.pwd_hash) {
    // 原子自增再回读：旧快照回写在并发连点时计数不涨，失败锁定形同虚设
    await db.prepare('UPDATE children SET pwd_fail_count = pwd_fail_count + 1 WHERE id=?').bind(child.id).run();
    const fresh = await db.prepare('SELECT pwd_fail_count FROM children WHERE id=?').bind(child.id).first();
    const fails = fresh ? (fresh.pwd_fail_count || 0) : (child.pwd_fail_count || 0) + 1;
    if (fails >= PIN_LOCK_MAX) {
      await db.prepare('UPDATE children SET pwd_fail_count=0, pwd_locked_until=? WHERE id=?')
        .bind(now + PIN_LOCK_SECS, child.id).run();
      return json({ ok: false, error: 'CHILD_LOCKED', retryAfter: PIN_LOCK_SECS }, 429);
    }
    return json({ ok: false, error: 'PWD_WRONG', attemptsLeft: PIN_LOCK_MAX - fails }, 401);
  }
  await db.prepare('UPDATE children SET pwd_fail_count=0, pwd_locked_until=0 WHERE id=?').bind(child.id).run();
  const token = await createSession(db, 'child', child.id);
  return json({ ok: true, role: 'child', childId: child.id }, 200, { 'Set-Cookie': sessionCookie(token) });
}

async function apiLogout(db, req, session) {
  if (session) await db.prepare('DELETE FROM sessions WHERE token=?').bind(session.token).run();
  return json({ ok: true }, 200, {
    'Set-Cookie': 'famsess=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  });
}

async function apiOverview(db, session) {
  const today = shDateStr();
  const all = await getChildren(db);
  // child 会话只下发本人；parent 会话下发全部孩子
  const list = session && session.kind === 'child' ? all.filter((c) => c.id === session.child_id) : all;
  // 孩子们 / 英语模式开关 / 待审数互不依赖，一起并行（原为孩子之后再串行取 2 次）
  const [kids, englishModeRaw, pc] = await Promise.all([
    Promise.all(list.map(async (c) => {
      // 先写后读：hatchDueEggs / unlockForms 会写库（孵蛋、图鉴、实例），childSummary 要读 unlockForms 挂上的 child._evo，顺序不变
      const { hatched } = await hatchDueEggs(db, c.id, today);
      await unlockForms(db, c, today);
      const s = childSummary(c);
      s.hatchedEggs = hatched;
      // 写完之后的只读查询并行（各查各的表；quizSummaryForChild 内部可能幂等写 quiz_daily，不与其余读互相依赖）
      const [notices, todaySubjects, pokedexCount, quizToday, oakToday, enc, eggRow] = await Promise.all([
        pendingNotices(db, c.id),
        todaySubjectsFor(db, c.id, today),
        pokedexCountFor(db, c.id),
        quizSummaryForChild(db, c, today),
        oakSummaryForChild(db, c, today),
        pendingEncounter(db, c.id, today),
        db.prepare('SELECT COUNT(*) n FROM sealed_eggs WHERE child_id=? AND hatched=0').bind(c.id).first(),
      ]);
      s.notices = notices;
      s.todaySubjects = todaySubjects;
      s.todaySubmittedCount = s.todaySubjects.filter((t) => t.checkin && t.checkin.status !== 'rejected').length;
      s.todayApprovedCount = s.todaySubjects.filter((t) => t.checkin && t.checkin.status === 'approved').length;
      s.pokedexCount = pokedexCount;
      s.quizToday = quizToday;
      s.oakToday = oakToday;
      s.pendingEncounter = enc ? { id: enc.id, no: enc.pokemon_no, name: enc.name } : null;
      s.sealedEggCount = eggRow ? eggRow.n : 0;
      return s;
    })),
    getSetting(db, 'english_mode'),
    session && session.kind === 'parent'
      ? db.prepare("SELECT COUNT(*) n FROM checkins WHERE status='pending'").first()
      : { n: 0 },
  ]);
  return json({
    ok: true, today, isWeekend: isWeekendDate(today), weekStart: weekStartMon(today),
    pendingReviewCount: pc ? pc.n : 0,
    englishMode: englishModeRaw === '1',
    session: session ? { kind: session.kind, childId: session.child_id || null, pinOk: pinFresh(session, Math.floor(Date.now() / 1000)) } : null,
    children: kids,
  });
}

// 读阶段内 quizPoolForChild 可能写入 quiz_daily（题单落库缓存）；并行后即使同批另一查询失败，该写入仍可能已发生。该写入是幂等的题单缓存，下次成功调用结果一致。
async function apiChildDetail(db, id, session) {
  const sc = scopeChildId(session, id);
  if (sc.err) return sc.err;
  const today = shDateStr();
  const c = await getChild(db, sc.id);
  if (!c) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { hatched } = await hatchDueEggs(db, c.id, today);
  await unlockForms(db, c, today);
  const s = childSummary(c);
  s.hatchedEggs = hatched;
  const ws = weekStartMon(today);
  const [notices, todaySubjects, pokedexCount, quizToday, oakToday, enc, sealedEggs, wc, care, friendship] = await Promise.all([
    pendingNotices(db, c.id),
    todaySubjectsFor(db, c.id, today),
    pokedexCountFor(db, c.id),
    quizSummaryForChild(db, c, today),
    oakSummaryForChild(db, c, today),
    pendingEncounter(db, c.id, today),
    db.prepare(
      'SELECT * FROM sealed_eggs WHERE child_id=? AND hatched=0 ORDER BY unlock_date'
    ).bind(c.id).all(),
    db.prepare(
      "SELECT COUNT(DISTINCT date) n FROM checkins WHERE child_id=? AND status='approved' AND date>=? AND date<?"
    ).bind(c.id, ws, addDays(ws, 7)).first(),
    (async () => {
      if (await isCareEnabled(db)) {
        const careToday = shDateStr();
        let fedToday = false;
        let bathedToday = false;
        try {
          const careRows = await db.prepare(
            'SELECT kind FROM care_logs WHERE child_id=? AND date_shanghai=?'
          ).bind(s.id, careToday).all();
          fedToday = (careRows.results || []).some(r => r.kind === 'feed');
          bathedToday = (careRows.results || []).some(r => r.kind === 'bath');
        } catch (e) { /* care_logs 未建：当未喂/未洗（2026-11-07 正式站事故：缺表曾炸 /api/child） */ }
        return { fedToday, bathedToday, sceneKey: careSceneForDate(careToday).key };
      }
      return null;
    })(),
    getChildMainFriendship(db, c, today),
  ]);
  s.friendship = friendship;
  s.notices = notices;
  s.todaySubjects = todaySubjects;
  s.todaySubmittedCount = s.todaySubjects.filter((t) => t.checkin && t.checkin.status !== 'rejected').length;
  s.todayApprovedCount = s.todaySubjects.filter((t) => t.checkin && t.checkin.status === 'approved').length;
  s.pokedexCount = pokedexCount;
  s.quizToday = quizToday;
  s.oakToday = oakToday;
  // hits 列是内部口径（是否命中过 0/1，新旧混列无版本标识），视图层不透传原值，
  // 只给派生字段 caught（审查 S16）；pending 遭遇恒未抓中，caught 恒 false。
  s.pendingEncounter = enc
    ? { id: enc.id, no: enc.pokemon_no, name: enc.name, ballsUsed: enc.balls_used, caught: enc.status === 'caught', hasQuiz: !!parseQuizState(enc) }
    : null;
  const { results: eggs } = sealedEggs;
  s.sealedEggs = eggs.map((e) => {
    const no = Number(e.species) || 151;
    return {
      id: e.id, awardedDate: e.awarded_date, unlockDate: e.unlock_date,
      daysLeft: Math.max(0, diffDays(today, e.unlock_date)),
      species: no, speciesName: (SPECIES[no] || RARE).name,
    };
  });
  // 本周打卡天数（按天计：当天至少 1 科通过算 1 天；道馆资格预览）
  s.weekApproved = wc ? wc.n : 0;
  s.care = care;
  return json({ ok: true, today, isWeekend: isWeekendDate(today), child: s });
}

/* 按科提交（迁移 0004）：一科一行。
 * 新格式 body：{childId, subject, note?, photos?}；photos 见 parsePhotosArg（{id} 保留 / {data} 新增）。
 * 兼容旧格式：{childId, subjects:[...]} 逐科提交（「全部完成」展开五科），返回第一科的 checkinId。
 * 状态机：无行 → 新建 pending；已有 rejected 行 → 重交（同行回 pending、刷新提交时间/快手、清理由）；
 * 已有 pending/approved 行 → 拒绝（approved 锁定，pending 请走编辑接口）。 */
async function apiSubmitCheckin(db, env, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const c = await getChild(db, childId);
  if (!c) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  let subjectList = [];
  if (body.subject !== undefined && body.subject !== null && body.subject !== '') {
    subjectList = [String(body.subject)];
  } else if (Array.isArray(body.subjects)) {
    let ss = body.subjects.map(String).filter(Boolean);
    if (ss.includes('全部完成')) ss = [...CHECKIN_SUBJECTS];
    subjectList = [...new Set(ss)];
  }
  if (!subjectList.length) return json({ ok: false, error: '请选择完成的作业科目' }, 400);
  for (const s of subjectList) {
    if (!CHECKIN_SUBJECTS.includes(s)) return json({ ok: false, error: `没有「${s}」这一科` }, 400);
  }
  const note = String(body.note || '').trim().slice(0, 200);
  const parsed = parsePhotosArg(body.photos);
  if (parsed.err) return json({ ok: false, error: parsed.err }, 400);
  const wantPhotos = parsed.list !== undefined && (parsed.list.length > 0 || Array.isArray(body.photos));
  if (wantPhotos && parsed.list.some((p) => p.bytes) && !env.PHOTOS) {
    return json({ ok: false, error: '照片功能还没开通，先不带照片提交吧' }, 503);
  }

  const today = shDateStr();
  const nowHM = shTimeHM();
  const cutoff = (await getSetting(db, 'cutoff_time')) || '21:30';
  const isEarly = earlyBefore(cutoff, nowHM) ? 1 : 0;
  const nowEpoch = Math.floor(Date.now() / 1000);

  // 先整体校验，避免多科提交做一半失败
  const existing = new Map();
  for (const subject of subjectList) {
    const row = await db.prepare('SELECT * FROM checkins WHERE child_id=? AND date=? AND subject=?')
      .bind(childId, today, subject).first();
    if (row && row.status !== 'rejected') {
      /* 任务 124：放行时允许重复提交——走到下面会把旧记录 UPDATE 回 pending（与驳回后重交同路），
       * 不违反唯一约束 ux_checkins_child_date_subject。 */
      if (!GATES_OPEN_FULL) return json({ ok: false, error: `「${subject}」今天已经提交过啦` }, 400);
    }
    existing.set(subject, row || null);
  }

  const results = [];
  for (const subject of subjectList) {
    const row = existing.get(subject);
    let checkinId;
    if (row) { // 驳回后重交：回到 pending（新一轮），快手按本次提交时间重算
      await db.prepare(
        `UPDATE checkins SET status='pending', note=?, submitted_at=?, submitted_epoch=?, is_early=?,
         xp_awarded=NULL, reason=NULL, reviewed_at=NULL WHERE id=?`
      ).bind(note, nowHM, nowEpoch, isEarly, row.id).run();
      checkinId = row.id;
    } else {
      const r = await db.prepare(
        'INSERT INTO checkins(child_id,date,subjects,subject,note,submitted_at,submitted_epoch,is_early) VALUES(?,?,?,?,?,?,?,?)'
      ).bind(childId, today, JSON.stringify([subject]), subject, note, nowHM, nowEpoch, isEarly).run();
      checkinId = r.meta.last_row_id;
    }
    await syncTouch(db, childId, 'checkins', 'id=?', [checkinId]);
    if (parsed.list !== undefined) {
      try {
        await setCheckinPhotos(db, env, checkinId, childId, today, parsed.list);
      } catch (e) {
        if (String(e && e.message) === 'PHOTO_NOT_OWNED') return json({ ok: false, error: '照片不属于这条打卡' }, 400);
        throw e;
      }
    }
    results.push({ subject, checkinId });
  }
  return json({ ok: true, checkinId: results[0].checkinId, results, isEarly: !!isEarly, cutoff });
}

/* 编辑待审核的提交（备注/照片）：通过后锁定不可改；驳回的请走提交接口「重新提交」。 */
async function apiEditCheckin(db, env, req, session) {
  const body = await readJsonBody(req);
  const checkinId = Number(body.checkinId ?? body.id);
  const row = checkinId ? await db.prepare('SELECT * FROM checkins WHERE id=?').bind(checkinId).first() : null;
  if (!row) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const fb = forbidIfOtherChild(session, row.child_id);
  if (fb) return fb;
  if (row.status === 'approved') return json({ ok: false, error: '这一科已经通过审核啦，不能再改咯' }, 400);
  if (row.status !== 'pending') return json({ ok: false, error: '这一科被驳回了，改好后请重新提交' }, 400);
  if (body.note !== undefined) {
    const note = String(body.note || '').trim().slice(0, 200);
    await db.prepare('UPDATE checkins SET note=? WHERE id=?').bind(note, row.id).run();
    await syncTouch(db, row.child_id, 'checkins', 'id=?', [row.id]);
  }
  const parsed = parsePhotosArg(body.photos);
  if (parsed.err) return json({ ok: false, error: parsed.err }, 400);
  if (parsed.list !== undefined) {
    if (parsed.list.some((p) => p.bytes) && !env.PHOTOS) {
      return json({ ok: false, error: '照片功能还没开通' }, 503);
    }
    try {
      await setCheckinPhotos(db, env, row.id, row.child_id, row.date, parsed.list);
    } catch (e) {
      if (String(e && e.message) === 'PHOTO_NOT_OWNED') return json({ ok: false, error: '照片不属于这条打卡' }, 400);
      throw e;
    }
  }
  return json({ ok: true, checkinId: row.id, photos: await photosOfCheckin(db, row.id) });
}

/* 照片读取（鉴权）：孩子只能读自己打卡的照片，家长可读全部。不公开直链。 */
async function apiGetPhoto(db, env, photoId, session) {
  const row = await db.prepare(
    `SELECT p.*, ck.child_id FROM checkin_photos p JOIN checkins ck ON ck.id=p.checkin_id WHERE p.id=?`
  ).bind(photoId).first();
  if (!row) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const fb = forbidIfOtherChild(session, row.child_id);
  if (fb) return fb;
  if (!env.PHOTOS) return json({ ok: false, error: '照片功能还没开通' }, 503);
  const obj = await env.PHOTOS.get(row.object_key);
  if (!obj) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  return new Response(obj.body, {
    headers: {
      'Content-Type': row.content_type || 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

/* -------- 家长 PIN -------- */

/* 应用内 PIN 验证：孩子会话输对 PIN 后升级为家长会话；家长会话则刷新验证时刻 */
async function apiVerifyPin(db, req, session) {
  const body = await readJsonBody(req);
  const r = await checkPin(db, body.pin);
  if (!r.ok) return json({ ok: false, error: r.error, retryAfter: r.retryAfter, attemptsLeft: r.attemptsLeft }, r.status);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("UPDATE sessions SET kind='parent', child_id=NULL, pin_verified_at=? WHERE token=?")
    .bind(now, session.token).run();
  return json({ ok: true });
}

async function apiPendingReviews(db) {
  const { results } = await db.prepare(
    `SELECT ck.*, ch.name AS child_name FROM checkins ck JOIN children ch ON ch.id=ck.child_id
     WHERE ck.status='pending' ORDER BY ck.submitted_epoch ASC`
  ).all();
  const pmap = await photosByCheckin(db, results.map((r) => r.id));
  // 孩子上报待审核的学校成绩（2026-10-27：入口移到孩子端，审批仍在家长审核 tab）
  const { results: stResults } = await db.prepare(
    `SELECT st.*, ch.name AS child_name FROM school_test_records st JOIN children ch ON ch.id=st.child_id
     WHERE st.status='pending' ORDER BY st.created_epoch ASC`
  ).all();
  return json({
    ok: true,
    reviews: results.map((r) => ({
      id: r.id, childId: r.child_id, childName: r.child_name, date: r.date,
      subject: r.subject || (safeJsonArr(r.subjects)[0] || ''), note: r.note || '',
      subjects: safeJsonArr(r.subjects), submittedAt: r.submitted_at, isEarly: !!r.is_early,
      photos: pmap.get(r.id) || [],
    })),
    schoolTests: stResults.map((r) => ({
      id: r.id, childId: r.child_id, childName: r.child_name,
      subject: r.subject, unit: r.unit, score: r.score, fullScore: r.full_score, pct: r.pct,
      examDate: r.exam_date, hasPhoto: !!r.photo_key, createdAt: r.created_epoch,
    })),
  });
}

/* -------- 审核（经验唯一入口） -------- */

async function apiReview(db, req) {
  const body = await readJsonBody(req);
  const checkinId = Number(body.checkinId);
  const decision = body.decision;
  const ck = await db.prepare('SELECT * FROM checkins WHERE id=?').bind(checkinId).first();
  if (!ck) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (ck.status !== 'pending') return json({ ok: false, error: '已经审核过了' }, 400);
  const today = shDateStr();
  const reviewedAt = shTimeHM();

  if (decision === 'reject') {
    const reason = String(body.reason || '作业还没完成').slice(0, 100);
    const updRej = await db.prepare("UPDATE checkins SET status='rejected', reason=?, reviewed_at=? WHERE id=? AND status='pending'")
      .bind(reason, reviewedAt, checkinId).run();
    if (!updRej.meta || !updRej.meta.changes) return json({ ok: false, error: '已经审核过了' }, 400);
    await syncTouch(db, ck.child_id, 'checkins', 'id=?', [checkinId]);
    return json({ ok: true, rejected: true, reason });
  }
  if (decision !== 'approve' && decision !== 'adjust') {
    return json({ ok: false, error: 'BAD_DECISION' }, 400);
  }

  const child = await getChild(db, ck.child_id);
  const subjectXp = Number((await getSetting(db, 'subject_xp')) || 15);
  let xp;
  if (decision === 'adjust') {
    xp = Number(body.adjustedXp);
    if (!Number.isInteger(xp) || xp < 0 || xp > 2000) {
      return json({ ok: false, error: '调整经验需为 0–2000 的整数' }, 400);
    }
  } else {
    // 每科独立计：该科通过得 subject_xp，快手按该科自己的提交时间 ×1.2（取整口径与旧版一致）
    xp = Math.round(subjectXp * (ck.is_early ? 1.2 : 1));
  }

  const oldLevel = levelFromXp(child.total_xp);

  /* 连击按「天」：只有当天第一条通过的科目才推进连击/里程碑；
   * 当天后续科目只加本科经验，连击保持不变。 */
  const prior = await db.prepare(
    "SELECT COUNT(*) n FROM checkins WHERE child_id=? AND date=? AND status='approved' AND id<>?"
  ).bind(child.id, ck.date, ck.id).first();
  const isFirstOfDay = !(prior && prior.n > 0);

  let streak = child.streak || 0;
  // 补审旧日期：只补本科经验，不推进连击、不发里程碑，更不能把 last_checkin_date 往回写
  const backfill = !!(child.last_checkin_date && ck.date < child.last_checkin_date);
  if (isFirstOfDay && !backfill) {
    if (child.last_checkin_date === addDays(ck.date, -1)) streak = streak + 1;
    else if (child.last_checkin_date === ck.date) streak = streak; // 保险（首条逻辑下不应出现）
    else streak = 1;
  }
  const newLastDate = backfill ? child.last_checkin_date : ck.date;

  let bonusXp = 0;
  let streakBox = null;
  const titles = safeJsonArr(child.titles);
  const stickers = safeJsonArr(child.stickers);
  if (!backfill && isFirstOfDay && streak > 0 && streak % 30 === 0) {
    bonusXp = 500;
    const t = '月度坚持大师';
    if (!titles.includes(t)) titles.push(t);
    if (!stickers.includes('🏆')) stickers.push('🏆');
    streakBox = { type: 'monthly30', streak, xp: bonusXp, title: t, sticker: '🏆' };
  } else if (!backfill && isFirstOfDay && streak > 0 && streak % 7 === 0) {
    bonusXp = 120;
    const t = STREAK_TITLES[Math.floor(Math.random() * STREAK_TITLES.length)];
    const s = STREAK_STICKERS[Math.floor(Math.random() * STREAK_STICKERS.length)];
    if (!titles.includes(t)) titles.push(t);
    if (!stickers.includes(s)) stickers.push(s);
    streakBox = { type: 'weekly7', streak, xp: bonusXp, title: t, sticker: s };
  }

  const newTotalXp = child.total_xp + xp + bonusXp;
  const newLevel = levelFromXp(newTotalXp);
  const levelsGained = [];
  for (let L = oldLevel + 1; L <= newLevel; L++) levelsGained.push(L);
  const freshMoves = newMovesBetween(child.line, oldLevel, newLevel, safeJsonArr(child.unlocked_moves))
    .map((m) => ({ level: m[0], name: m[1], desc: m[2] }));
  const oldForm = formIdxForLevel(oldLevel);
  const newFormIdx = formIdxForLevel(newLevel);

  // 状态 CAS：只有仍为 pending 的记录能被审核，并发/重复提交时后到者直接被拒，杜绝重复发经验
  const updCk = await db.prepare("UPDATE checkins SET status='approved', xp_awarded=?, reviewed_at=? WHERE id=? AND status='pending'")
    .bind(xp, reviewedAt, checkinId).run();
  if (!updCk.meta || !updCk.meta.changes) return json({ ok: false, error: '已经审核过了' }, 400);
  await syncTouch(db, child.id, 'checkins', 'id=?', [checkinId]);
  await db.prepare('UPDATE children SET total_xp = total_xp + ?, streak=?, last_checkin_date=?, titles=?, stickers=? WHERE id=?')
    .bind(xp + bonusXp, streak, newLastDate, JSON.stringify(titles), JSON.stringify(stickers), child.id).run();
  await syncTouch(db, child.id, 'children', 'id=?', [child.id]);
  await unlockForms(db, { ...child, total_xp: newTotalXp }, today);

  // 连击里程碑：给孩子挂一条待展示通知，孩子端首页下次打开弹庆祝（展示后确认清除）
  if (streakBox) await pushNotice(db, child.id, 'streak_box', streakBox);

  const line = LINES[child.line];
  const evolved = newFormIdx > oldForm ? {
    from: oldForm === 0 ? '神秘的蛋' : line.forms[oldForm - 1].name,
    to: newFormIdx === 0 ? '神秘的蛋' : line.forms[newFormIdx - 1].name,
    formIdx: newFormIdx,
    img: newFormIdx === 0 ? null : petImg(line.forms[newFormIdx - 1].no),
  } : null;
  if (evolved) await pushNotice(db, child.id, 'evolution', evolved); // 进化过场：孩子下次打开首页播

  // 野外遭遇：当天第一条通过的科目触发判定——周末必触发；其余 25%
  // 日期口径（2026-11-15 用户纠正）：按审批当天（today），不用打卡提交日（ck.date）。
  // 补审旧打卡时 ck.date 是过去的日期，遭遇一出生就过期、孩子永远打不开（测试站蚊香君 id 86）。
  let encounter = null;
  const existing = await db.prepare('SELECT id FROM encounters WHERE child_id=? AND date=? LIMIT 1')
    .bind(child.id, today).first();
  if (isFirstOfDay && !existing) {
    const guaranteed = isWeekendDate(today);
    if (guaranteed || Math.random() < 0.25) {
      const caught = new Set(
        (await db.prepare("SELECT entry_key FROM pokedex WHERE child_id=? AND entry_key LIKE 'wild:%'")
          .bind(child.id).all()).results.map((r) => Number(r.entry_key.split(':')[1]))
      );
      const pool = WILD.filter((w) => !caught.has(w.no));
      const mon = (pool.length ? pool : WILD)[Math.floor(Math.random() * (pool.length ? pool.length : WILD.length))];
      // 条件 INSERT 兜底（审查 M5）：与答题触发同日并发时只落一行，changes=0 说明已被另一路抢先
      const r = await db.prepare(
        `INSERT INTO encounters(child_id,date,pokemon_no,name)
         SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM encounters WHERE child_id=? AND date=?)`
      ).bind(child.id, today, mon.no, mon.name, child.id, today).run();
      if (r.meta && r.meta.changes) {
        encounter = { id: r.meta.last_row_id, no: mon.no, name: mon.name };
        await syncTouch(db, child.id, 'encounters', 'id=?', [Number(r.meta.last_row_id)]);
      }
    }
  }

  return json({
    ok: true, approved: true,
    subject: ck.subject || null,
    xpAwarded: xp, isEarly: !!ck.is_early, subjectXp,
    bonusXp, streakBox, streak, isFirstOfDay,
    oldLevel, newLevel, levelsGained, newMoves: freshMoves,
    evolved,
    encounter,
  });
}

/* -------- 野外捕捉（借鉴包 v1 §5：答题抓捕，替换旧投球命中制） --------
 * 节奏不变：每次遭遇最多投 3 次球。投球 = 选球种（普通/超级，扣库存 1 个）→
 * 按物种稀有度出题（普通球 1/2/3 道；超级球多 1 道）→ 按球种判定命中（见 judgeCatch）。
 * 任意一次命中即抓捕成功；3 次未命中逃跑。encounters.hits 口径改为「是否命中过 0/1」，
 * balls_used 继续记投球次数；未答完的一组题存 encounters.quiz_state（题号、球种与已选答案草稿 sel）。 */

/* 一次投球的命中判定（纯函数；规格修订 2026-10-22，用户定案 A 方案）：
 * 普通球——该档题数全对才命中；超级球——出题数 = 该档题数 + 1，答对数达到
 * 该档原题数（need）即命中（常见 2 对 1、少见 3 对 2、稀有 4 对 3）。
 * 高级球——出题数 = 该档题数 + 2，答对数达到该档原题数即命中（§1.5）；
 * 大师球——0 题直接捕获（不走本题组，见 apiThrowBall；传说宝可梦除外）。
 * 本口径吸收并取代原「超级球容错 1 题」与 eno「至少答对 1 题」裁定：
 * 新口径下超级球每档都有真实价值，且命中必然答对 ≥1 题。
 * need 缺省取 total（旧三参调用按「全对」保守判定）。 */
function judgeCatch(ball, correctCount, total, need = total) {
  if (ball === 'master') return true;
  if (ball === 'super' || ball === 'hyper') return correctCount >= need;
  return correctCount >= total;
}

/* 球种附加题数（§1.5）：普通 0、超级 +1、高级 +2、大师不走题组（直接捕获） */
const BALL_EXTRA_QUESTIONS = { normal: 0, super: 1, hyper: 2, master: 0 };
const BALL_LABEL = { normal: '精灵球', super: '超级球', hyper: '高级球', master: '大师球' };

/* 抓捕选题的硬排除集（审查 M2）：今日已作答的题（含本场遭遇前几次投球的题——
 * 抓捕作答会落 quiz_attempts，见 apiEncounterAnswer）＋今日题单里的题
 * （防抓捕里见过答案再回每日问答刷奖励的泄露链）。 */
async function catchExcludeIds(db, child) {
  const today = shDateStr();
  const ids = new Set();
  const { results } = await db.prepare('SELECT question_id FROM quiz_attempts WHERE child_id=? AND date_shanghai=?')
    .bind(child.id, today).all();
  for (const r of results) ids.add(Number(r.question_id));
  const daily = await db.prepare('SELECT question_ids FROM quiz_daily WHERE child_id=? AND date_shanghai=?')
    .bind(child.id, today).first();
  if (daily) for (const id of safeJsonArr(daily.question_ids)) ids.add(Number(id));
  return ids;
}

/* 抓捕选题：孩子本年级题库，沿用每日选题同一套去重分层
 * （没答过 → 答错已过 3 天 → 答对已过窗口 → 放宽按最久未出现），rng 可注入；
 * excludeIds 命中者硬排除（同场不重复出题，见 catchExcludeIds） */
async function pickCatchQuestions(db, child, n, rng = Math.random, excludeIds = null) {
  const { results: all } = await db.prepare('SELECT * FROM quiz_questions').all();
  // 2026-11-13 起抓捕也不再出脑筋急转弯（与每日问答 2026-11-09 口径一致；
  // 谜语只留在兄弟对战防守题）。此前漏改，1 年级抓精灵全是谜语。
  const rows = all.map(normalizeQuizRow).filter((q) => q.active && q.kind !== 'oak' && q.kind !== 'riddle' && !(excludeIds && excludeIds.has(Number(q.id))));
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const gradeOk = (q) => q.kind === 'riddle' || q.grade === gradeNum || q.grade == null;
  /* 进度门（2026-10-24 超纲事件后补齐；B 学习进度三门并行加载，任一对应门不通过即剔除） */
  const [mathGate, chineseGate, englishGate] = await Promise.all([
    loadMathGate(db, child),
    loadChineseGate(db, child),
    loadEnglishGate(db, child),
  ]);
  const history = await quizHistoryForChild(db, child.id);
  const today = shDateStr();
  const windowDays = Number((await getSetting(db, 'quiz_repeat_days')) || QUIZ_CORRECT_WINDOW_DAYS);
  const tierOf = (q) => {
    const h = history.get(Number(q.id));
    if (!h || !h.lastDate) return 0;
    const gap = diffDays(h.lastDate, today);
    if (h.lastCorrect) return gap >= windowDays ? 2 : 3;
    return gap > QUIZ_WRONG_GAP_DAYS ? 1 : 3;
  };
  const lastDateOf = (q) => { const h = history.get(Number(q.id)); return h && h.lastDate ? h.lastDate : null; };
  const rest = rows.filter(gradeOk).filter((q) => mathGatePass(q, mathGate) && chineseGatePass(q, chineseGate) && englishGatePass(q, englishGate));
  const picked = [];
  while (picked.length < n && rest.length) {
    const minTier = Math.min(...rest.map(tierOf));
    let cand;
    if (minTier <= 2) {
      const cands = rest.filter((q) => tierOf(q) === minTier);
      cand = cands[Math.floor(rng() * cands.length) % cands.length];
    } else {
      cand = [...rest].sort((a, b) =>
        String(lastDateOf(a) || '').localeCompare(String(lastDateOf(b) || '')) || (a.id - b.id))[0];
    }
    picked.push(cand);
    rest.splice(rest.indexOf(cand), 1);
  }
  return picked.map((q) => ({ id: q.id, question: q.question, options: q.options }));
}

/* encounters.quiz_state 解析（坏 JSON 按无待答题处理）。
 * 结构 {ball, questionIds, sel}：sel 是答题草稿 {questionId: answerIdx}（2026-10-24
 * 追加规格：已选答案落服务端，退出/关页重进恢复），只保留本题组题号、整数选项下标，
 * 旧状态没有 sel 时按空草稿返回。 */
function parseQuizState(enc) {
  if (!enc || !enc.quiz_state) return null;
  try {
    const qs = JSON.parse(enc.quiz_state);
    if (qs && ['normal', 'super', 'hyper', 'master'].includes(qs.ball) && Array.isArray(qs.questionIds) && qs.questionIds.length) {
      const sel = {};
      if (qs.sel && typeof qs.sel === 'object') {
        for (const qid of qs.questionIds) {
          const v = qs.sel[qid];
          if (Number.isInteger(v) && v >= 0 && v <= 7) sel[qid] = v;
        }
      }
      return { ball: qs.ball, questionIds: qs.questionIds, sel };
    }
  } catch { /* 损坏状态按无处理 */ }
  return null;
}

async function catchQuestionsView(db, questionIds) {
  const out = [];
  for (const qid of questionIds) {
    const row = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(qid).first();
    if (row) {
      const q = normalizeQuizRow(row);
      out.push({ id: q.id, question: q.question, options: q.options });
    }
  }
  return out;
}

function encounterView(enc, child, quizQuestions) {
  const tier = wildTierOf(enc.pokemon_no);
  const parsed = quizQuestions ? parseQuizState(enc) : null;
  return {
    id: enc.id, no: enc.pokemon_no, name: enc.name,
    tier, tierLabel: tier ? WILD_TIERS[tier].label : '', questionsNeeded: catchQuestionsFor(enc.pokemon_no),
    ballsUsed: enc.balls_used, caught: enc.status === 'caught', // 派生字段，不透传 hits 原值（审查 S16）
    balls: child ? (child.balls ?? 0) : 0, ballsSuper: child ? (child.balls_super ?? 0) : 0,
    ballsHyper: child ? (child.balls_hyper ?? 0) : 0, ballsMaster: child ? (child.balls_master ?? 0) : 0,
    // quiz.sel：已存草稿，前端据此恢复已选答案（没有草稿时为空对象）
    quiz: parsed ? { ball: parsed.ball, questions: quizQuestions, sel: parsed.sel || {} } : null,
  };
}

async function apiPendingEncounter(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const today = shDateStr();
  const enc = await pendingEncounter(db, childId, today);
  if (!enc) return json({ ok: true, encounter: null });
  const child = await getChild(db, childId);
  const qs = parseQuizState(enc);
  if (!qs && (enc.balls_used || 0) >= 3) {
    // 僵尸遭遇兜底（审查 M6）：球已投满却没有待答题组（数据异常）——正常流程下
    // 第 3 次投球未中在答题结算时已置 fled，此状态只可能来自数据损坏；按逃跑收尾，避免永久挂起。
    await db.prepare("UPDATE encounters SET status='fled' WHERE id=? AND status='pending' AND quiz_state IS NULL")
      .bind(enc.id).run();
    await syncTouch(db, childId, 'encounters', 'id=?', [enc.id]);
    return json({ ok: true, encounter: null });
  }
  const questions = qs ? await catchQuestionsView(db, qs.questionIds) : null;
  return json({ ok: true, encounter: encounterView(enc, child, questions) });
}

/* 投球：选球种扣库存 → 出题（题号存 quiz_state）；已有未答完的题组时直接续答、不重复扣球 */
async function apiThrowBall(db, req, session) {
  const body = await readJsonBody(req);
  const encId = Number(body.encounterId);
  const enc = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(encId).first();
  if (!enc) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const fb = forbidIfOtherChild(session, enc.child_id);
  if (fb) return fb;
  if (enc.status !== 'pending') return json({ ok: false, error: '这场遭遇已经结束啦' }, 400);
  // 遭遇只保留到当日结束（审查 S10）：昨天的遭遇不得隔日投球/续答
  if (enc.date !== shDateStr()) return json({ ok: false, error: '这场遭遇是之前留下的，已经结束啦' }, 400);
  const child = await getChild(db, enc.child_id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const pendingQs = parseQuizState(enc);
  if (pendingQs) {
    let questions = await catchQuestionsView(db, pendingQs.questionIds);
    if (!questions.length) {
      // 题组题目已被家长删除：按原球种重新出题（不重复扣球），否则这组题永远答不了（审查 M6 残余项）
      // 题数按原球种口径：超级球的题组仍多 1 题、高级球多 2 题，不得中途换口径（A 方案）
      const fresh = await pickCatchQuestions(db, child, catchQuestionsFor(enc.pokemon_no) + (BALL_EXTRA_QUESTIONS[pendingQs.ball] || 0), Math.random, await catchExcludeIds(db, child));
      if (fresh.length) {
        const st2 = { ball: pendingQs.ball, questionIds: fresh.map((q) => q.id), sel: {} };
        await db.prepare('UPDATE encounters SET quiz_state=? WHERE id=? AND quiz_state IS NOT NULL')
          .bind(JSON.stringify(st2), encId).run();
        await syncTouch(db, enc.child_id, 'encounters', 'id=?', [encId]);
        questions = fresh;
      }
    }
    return json({
      ok: true, resumed: true, encounterId: enc.id, ball: pendingQs.ball,
      ballsUsed: enc.balls_used, remaining: 3 - enc.balls_used, questions,
      sel: pendingQs.sel || {},
      balls: child.balls ?? 0, ballsSuper: child.balls_super ?? 0,
      ballsHyper: child.balls_hyper ?? 0, ballsMaster: child.balls_master ?? 0,
    });
  }
  // 「继续答题」显式续答意图（前端继续按钮传 resume:true）：待答题组在上方已按原球种
  // 续答返回（不查库存、不扣球）；走到这里说明根本没有未答完的题组——如实告知，
  // 绝不落入下面的新投球扣球路径（2026-10-24 修复：此前无题组时继续按钮也走本接口，
  // 已扔出的球都答完、库存又为 0 时被库存校验挡下报「没有精灵球」，与按钮文案矛盾；
  // 正式库实测遭遇 id=3 balls_used=2、quiz_state=NULL、普通球 0 即此状态）。
  if (body.resume === true) {
    return json({ ok: false, error: '已扔出的球都答完啦，再扔新球要用一颗精灵球哦' }, 400);
  }
  if (enc.balls_used >= 3) return json({ ok: false, error: '球已经用完啦' }, 400);
  const ball = ['normal', 'super', 'hyper', 'master'].includes(body.ball) ? body.ball : 'normal';
  const col = BALL_COLUMN[ball];
  if (ball === 'master') {
    // 大师球（§1.5）：0 题、合法遭遇直接捕获（传说宝可梦除外）；不写 quiz_state、不出题
    if (enc.pokemon_no === 151) return json({ ok: false, error: '大师球不能用来抓传说宝可梦哦' }, 400);
    const updM = await db.prepare('UPDATE children SET balls_master = balls_master - 1 WHERE id=? AND balls_master > 0').bind(child.id).run();
    if (!updM.meta || !updM.meta.changes) {
      return json({ ok: false, error: '没有大师球啦，大师球只能通过兑换获得哦' }, 400);
    }
    const ballsUsedM = enc.balls_used + 1;
    const occM = await db.prepare("UPDATE encounters SET balls_used=?, hits=1, status='caught', quiz_state=NULL WHERE id=? AND status='pending' AND quiz_state IS NULL AND balls_used=?")
      .bind(ballsUsedM, encId, enc.balls_used).run();
    if (!occM.meta || !occM.meta.changes) {
      await db.prepare('UPDATE children SET balls_master = balls_master + 1 WHERE id=?').bind(child.id).run();
      return json({ ok: false, error: 'STATE_CHANGED' }, 409);
    }
    const dexRes = await insertPokedexWithCarryRule(db, enc.child_id, enc.pokemon_no, shDateStr());
    {
      const v = await bumpChildVersion(db, enc.child_id);
      await touchRow(db, 'encounters', 'id=?', [encId], v);
      await touchRow(db, 'children', 'id=?', [enc.child_id], v);
      // 大师球捕获的 pokedex 行（主键为 child_id+entry_key，无 id 列）
      await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [enc.child_id, dexKeyForSpecies(enc.pokemon_no)], v);
    }
    const freshM = await getChild(db, enc.child_id);
    return json({
      ok: true, hit: true, master: true, encounterId: enc.id, ball, ballsUsed: ballsUsedM, remaining: 3 - ballsUsedM,
      status: 'caught', name: enc.name, no: enc.pokemon_no,
      notice: dexRes.notice || null,
      balls: freshM ? (freshM.balls ?? 0) : 0, ballsSuper: freshM ? (freshM.balls_super ?? 0) : 0,
      ballsHyper: freshM ? (freshM.balls_hyper ?? 0) : 0, ballsMaster: freshM ? (freshM.balls_master ?? 0) : 0,
    });
  }
  // 出题数（A 方案）：普通球 = 档位题数；超级球 = 档位题数 + 1；高级球 = 档位题数 + 2
  const need = catchQuestionsFor(enc.pokemon_no) + (BALL_EXTRA_QUESTIONS[ball] || 0);
  const questions = await pickCatchQuestions(db, child, need, Math.random, await catchExcludeIds(db, child));
  if (!questions.length) return json({ ok: false, error: '题库里暂时没有合适的题，等家长补充题目哦' }, 400);
  // 题数不足（审查 S12）：实际题数少于该档应答题数时不扣球——照常判定会让高档位变容易，
  // 且孩子平白耗掉一颗球；明确提示等题库补足后再来。
  if (questions.length < need) return json({ ok: false, error: '题库里的题不够啦，这次先不扔球，等家长补充题目再来抓哦' }, 400);
  // 条件扣球：库存为 0 时扣不动
  const upd = await db.prepare(`UPDATE children SET ${col} = ${col} - 1 WHERE id=? AND ${col} > 0`).bind(child.id).run();
  if (!upd.meta || !upd.meta.changes) {
    const noBallMsg = {
      normal: '没有精灵球啦，答题有机会掉落哦',
      super: '没有超级球啦，答题有机会掉落哦',
      hyper: '没有高级球啦，日常答题偶尔会掉落哦',
      master: '没有大师球啦，大师球只能通过兑换获得哦',
    }[ball] || '没有精灵球啦，答题有机会掉落哦';
    return json({ ok: false, error: noBallMsg }, 400);
  }
  const ballsUsed = enc.balls_used + 1;
  const quizState = { ball, questionIds: questions.map((q) => q.id), sel: {} };
  // 条件占位（审查 M1）：只有题组仍为空、投球数未被并发改动时才落库；
  // 占位失败说明并发的另一请求已抢先出题——退回刚扣的球并转续答，杜绝多扣少记/球白扣。
  const occ = await db.prepare('UPDATE encounters SET balls_used=?, quiz_state=? WHERE id=? AND quiz_state IS NULL AND balls_used=?')
    .bind(ballsUsed, JSON.stringify(quizState), encId, enc.balls_used).run();
  if (!occ.meta || !occ.meta.changes) {
    await db.prepare(`UPDATE children SET ${col} = ${col} + 1 WHERE id=?`).bind(child.id).run();
    const freshEnc = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(encId).first();
    const qs2 = freshEnc ? parseQuizState(freshEnc) : null;
    if (qs2) {
      const questions2 = await catchQuestionsView(db, qs2.questionIds);
      const freshChild = await getChild(db, enc.child_id);
      return json({
        ok: true, resumed: true, encounterId: enc.id, ball: qs2.ball,
        ballsUsed: freshEnc.balls_used, remaining: 3 - freshEnc.balls_used, questions: questions2,
        sel: qs2.sel || {},
        balls: freshChild ? (freshChild.balls ?? 0) : 0, ballsSuper: freshChild ? (freshChild.balls_super ?? 0) : 0,
        ballsHyper: freshChild ? (freshChild.balls_hyper ?? 0) : 0, ballsMaster: freshChild ? (freshChild.balls_master ?? 0) : 0,
      });
    }
    return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  }
  {
    const v = await bumpChildVersion(db, enc.child_id);
    await touchRow(db, 'encounters', 'id=?', [encId], v);
    await touchRow(db, 'children', 'id=?', [enc.child_id], v);
  }
  const fresh = await getChild(db, enc.child_id);
  return json({
    ok: true, encounterId: enc.id, ball, ballsUsed, remaining: 3 - ballsUsed,
    need: questions.length, questions,
    balls: fresh ? (fresh.balls ?? 0) : 0, ballsSuper: fresh ? (fresh.balls_super ?? 0) : 0,
    ballsHyper: fresh ? (fresh.balls_hyper ?? 0) : 0, ballsMaster: fresh ? (fresh.balls_master ?? 0) : 0,
  });
}

/* 抓捕答题草稿保存（2026-10-24 追加规格）：孩子每点选一次、点「先退出」时各存一次，
 * 把已选答案 {questionId: answerIdx} 写进 quiz_state.sel——退出不走提交、直接关页面，
 * 重进都能恢复已答进度接着答。只写草稿：不结算、不落 quiz_attempts、不动球数；
 * 草稿只认当前题组的题号与该题合法选项下标，外来题号/越界下标一律丢弃；
 * CAS 写入（quiz_state 原值比对）防与提交结算竞态，状态已变回 409 让前端静默放弃。 */
async function apiEncounterDraft(db, req, session) {
  const body = await readJsonBody(req);
  const encId = Number(body.encounterId);
  const enc = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(encId).first();
  if (!enc) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const fb = forbidIfOtherChild(session, enc.child_id);
  if (fb) return fb;
  if (enc.status !== 'pending') return json({ ok: false, error: '这场遭遇已经结束啦' }, 400);
  if (enc.date !== shDateStr()) return json({ ok: false, error: '这场遭遇是之前留下的，已经结束啦' }, 400);
  const qs = parseQuizState(enc);
  if (!qs) return json({ ok: false, error: '先扔一个球再答题哦' }, 400);
  const incoming = body.sel && typeof body.sel === 'object' ? body.sel : {};
  const sel = {};
  for (const qid of qs.questionIds) {
    const v = incoming[qid];
    if (!Number.isInteger(v) || v < 0) continue;
    const row = await db.prepare('SELECT options_json FROM quiz_questions WHERE id=?').bind(qid).first();
    let n = 4; // 题目已被删除时用默认选项数兜底（该题结算时本来就会被跳过）
    if (row) { try { const o = JSON.parse(row.options_json); if (Array.isArray(o) && o.length) n = o.length; } catch { /* 保持默认 */ } }
    if (v < n) sel[qid] = v;
  }
  const next = JSON.stringify({ ball: qs.ball, questionIds: qs.questionIds, sel });
  const upd = await db.prepare('UPDATE encounters SET quiz_state=? WHERE id=? AND quiz_state=?')
    .bind(next, encId, enc.quiz_state).run();
  if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  await syncTouch(db, enc.child_id, 'encounters', 'id=?', [encId]);
  return json({ ok: true, sel });
}

/* 抓捕答题提交：判题 → 命中判定 → 结算（命中进图鉴；第 3 次未中逃跑） */
async function apiEncounterAnswer(db, req, session) {
  const body = await readJsonBody(req);
  const encId = Number(body.encounterId);
  const enc = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(encId).first();
  if (!enc) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const fb = forbidIfOtherChild(session, enc.child_id);
  if (fb) return fb;
  if (enc.status !== 'pending') return json({ ok: false, error: '这场遭遇已经结束啦' }, 400);
  // 遭遇只保留到当日结束（审查 S10）：昨天的题组不得隔日续答
  if (enc.date !== shDateStr()) return json({ ok: false, error: '这场遭遇是之前留下的，已经结束啦' }, 400);
  const qs = parseQuizState(enc);
  if (!qs) return json({ ok: false, error: '先扔一个球再答题哦' }, 400);
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const rawById = new Map(answers.map((a) => [Number(a && a.questionId), a ? a.answerIdx : undefined]));
  let correctCount = 0;
  let blankCount = 0;
  const details = [];
  for (const qid of qs.questionIds) {
    const row = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(qid).first();
    if (!row) continue; // 题目已被删除：不算错、不计入 total（审查 S11）
    const q = normalizeQuizRow(row);
    if (!q.active) continue; // 已下架同理
    // 留空口径（2026-10-24 改版）：没提交这道题、或 answerIdx 为 null/非数字，一律算「没答」，
    // 且没答永远判错——旧实现 Number(null)=0 在正确答案恰为第 1 项时会把留空误判成答对，一并堵死。
    const rawAns = rawById.get(qid);
    const blank = rawAns === undefined || rawAns === null || !Number.isFinite(Number(rawAns));
    if (blank) blankCount++;
    const ok = !blank && Number(rawAns) === q.answer_idx;
    if (ok) correctCount++;
    details.push({ questionId: qid, correct: ok, correctIdx: q.answer_idx, explain: q.explain || '' });
  }
  const total = details.length; // 有效题数（已删/下架题不占分母）
  if (total === 0) {
    // 整组题都没了（审查 S11）：不是孩子的错——退回本次投球的球并清掉题组，让孩子重新投球。
    // 条件清状态防并发重复退球：状态已变则回 409，不退第二颗。
    const clr = await db.prepare('UPDATE encounters SET quiz_state=NULL WHERE id=? AND quiz_state IS NOT NULL').bind(encId).run();
    if (!clr.meta || !clr.meta.changes) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
    const col = BALL_COLUMN[qs.ball] || 'balls';
    await db.prepare(`UPDATE children SET ${col} = ${col} + 1 WHERE id=?`).bind(enc.child_id).run();
    {
      const v = await bumpChildVersion(db, enc.child_id);
      await touchRow(db, 'encounters', 'id=?', [encId], v);
      await touchRow(db, 'children', 'id=?', [enc.child_id], v);
    }
    return json({ ok: false, refunded: true, error: '题目被家长收起来啦，这颗球退回给你，重新扔一次吧' }, 400);
  }
  // 留空拦截（2026-10-24 改版）：有题没答且未经孩子显式确认（confirmBlanks=true，
  // 前端点「就这样交」才带），不结算、不落账、题组原样保留——绝不静默把留空结掉。
  // 确认后走到下面的结算：留空判错，命中判定与落账口径与全答时完全一致。
  if (blankCount > 0 && body.confirmBlanks !== true) {
    return json({ ok: false, error: `还有 ${blankCount} 道题没答哦`, blanks: blankCount }, 400);
  }
  const hit = judgeCatch(qs.ball, correctCount, total, catchQuestionsFor(enc.pokemon_no));
  let status = 'pending';
  if (hit) status = 'caught';
  else if (enc.balls_used >= 3) status = 'fled';
  // 条件落库：quiz_state 还在才结算（防重复提交/并发双答）
  const upd = await db.prepare('UPDATE encounters SET hits=?, status=?, quiz_state=NULL WHERE id=? AND quiz_state IS NOT NULL')
    .bind(hit ? 1 : (enc.hits || 0), status, encId).run();
  if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  await syncTouch(db, enc.child_id, 'encounters', 'id=?', [encId]);
  // 抓捕作答落历史（审查 M2）：与每日问答同一张 quiz_attempts，但不发经验/碎片；
  // 纳入同一套去重口径——同题当日在每日问答里视为已答，杜绝在抓捕里看过答案再回去刷奖励；
  // 本场后续投球的选题也会据此排除已出过的题（catchExcludeIds）。
  const nowEpoch = Math.floor(Date.now() / 1000);
  for (const d of details) {
    const attIns = await db.prepare(
      `INSERT OR IGNORE INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch)
       VALUES(?,?,?,?,0,0,?)`
    ).bind(enc.child_id, d.questionId, shDateStr(), d.correct ? 1 : 0, nowEpoch).run();
    if (attIns.meta && attIns.meta.changes) {
      await syncTouch(db, enc.child_id, 'quiz_attempts', 'id=?', [Number(attIns.meta.last_row_id)]);
    }
  }
  let dexRes = null;
  if (status === 'caught') {
    dexRes = await insertPokedexWithCarryRule(db, enc.child_id, enc.pokemon_no, shDateStr());
  }
  const child = await getChild(db, enc.child_id);
  return json({
    ok: true, hit, correctCount, total, wrongCount: total - correctCount, ball: qs.ball,
    status, ballsUsed: enc.balls_used, remaining: 3 - enc.balls_used, name: enc.name, details,
    notice: dexRes ? dexRes.notice || null : null,
    balls: child ? (child.balls ?? 0) : 0, ballsSuper: child ? (child.balls_super ?? 0) : 0,
    ballsHyper: child ? (child.balls_hyper ?? 0) : 0, ballsMaster: child ? (child.balls_master ?? 0) : 0,
  });
}

/* -------- 周末道馆 -------- */

const SHIELD_TEXTS = [
  '大岩蛇甩了甩尾巴，不过你的伙伴有护盾，一点都不疼！',
  '砰！攻击打在护盾上，火花四溅，伙伴稳稳站住！',
  '大岩蛇的攻击被护盾弹开了，伙伴趁机充满了力量！',
];

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

// F4：按孩子自己的主宠线判定当前主宠种号（优先 pet_instances 行，无实例行退回 LINES[child.line].forms[0].no，皮卡丘线首形态是 172 皮丘）
async function mainPetSpeciesNo(db, childId) {
  const child = await getChild(db, childId);
  if (!child || !child.line || !LINES[child.line]) return null;
  const row = await db.prepare(
    "SELECT species_no FROM pet_instances WHERE child_id=? AND line_key=? ORDER BY (source='main') DESC LIMIT 1"
  ).bind(childId, child.line).first();
  if (row && Number(row.species_no)) return Number(row.species_no);
  return LINES[child.line].forms[0].no;
}

async function isMainPetForChild(db, childId, no) {
  const n = Number(no);
  if (!n) return true;
  return (await mainPetSpeciesNo(db, childId)) === n;
}

async function ownedCollection(db, childId) {
  const { results } = await db.prepare(
    `SELECT p.*, sa.first_epoch
     FROM pokedex p
     LEFT JOIN species_acquisitions sa
       ON sa.child_id = p.child_id
      AND sa.species_no = CAST(SUBSTR(p.entry_key, INSTR(p.entry_key, ':') + 1) AS INTEGER)
     WHERE p.child_id = ?`
  ).bind(childId).all();

  const hasCol = results.length > 0 ? ('carried' in results[0]) : await hasCarriedColumn(db);
  // 任务 110：前主宠物种表（一次查询，供下面两分支共用）——判别只靠 has_been_main。
  const exMap = new Map((await exMainSpecies(db, childId)).map((ex) => [ex.no, ex]));
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
        counters: countersForType(sp.type),
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

/* 任务 73：兄弟对战棋盘备战展示——随身队里未入选出战的收藏宠（主宠＋携带上限 4 只，
 * 出战 2 只、备战最多 3 只）。只存物种身份快照（key/name/type/no/img），不含等级/体力，
 * 等级与体力由 battleView 按当前 battleLevel 现算，故加入展平后也不会过期。
 * 仅作棋盘展示，不进战斗结算、不挂换宠规则；battleNos 用 no 排除。
 * （2026-11-14 全量 151 批：主宠物种 25/4 已进 COLLECTION_MOVES；主宠与某只携带收藏宠
 * 同种时，battleNos 会同时排除那只收藏宠——已知角落情况，逻辑不动。） */
async function pvpBenchDisplayIds(db, childId, battleNos) {
  const inBattle = new Set((battleNos || []).map((n) => Number(n)).filter((n) => Number.isFinite(n)));
  const carried = await carriedCollection(db, childId);
  return carried.filter((c) => !inBattle.has(Number(c.no)))
    .map((c) => ({ key: `dex:${c.no}`, name: c.name, type: c.type, no: c.no, img: c.img }));
}

async function insertPokedexWithCarryRule(db, childId, no, today) {
  const n = Number(no);
  const key = dexKeyForSpecies(n);
  const isCollection = Boolean(COLLECTION_MOVES[n]);
  const hasCol = await hasCarriedColumn(db);

  if (!hasCol) {
    const ins = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
      .bind(childId, key, today).run();
    if (ins.meta && ins.meta.changes) {
      const v = await bumpChildVersion(db, childId);
      await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, key], v);
    }
    return { inserted: Boolean(ins.meta && ins.meta.changes), carried: isCollection ? 1 : 0, notice: null };
  }

  let carriedVal = 0;
  let notice = null;

  if (isCollection) {
    const currentCarried = await carriedCollection(db, childId);
    if (currentCarried.some((c) => c.no === n)) {
      return { inserted: false, carried: 1, notice: null };
    }
    if (currentCarried.length < MAX_CARRIED_COLLECTION) {
      carriedVal = 1;
    } else {
      carriedVal = 0;
      notice = {
        code: 'SENT_TO_WAREHOUSE',
        zh: '随身携带已满（4/4），新伙伴已送到大木博士的仓库！',
        en: "Party is full (4/4). Your new partner has been sent to Prof. Oak's storage!",
      };
    }
  }

  const ins = await db.prepare(
    'INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(?,?,?,?)'
  ).bind(childId, key, today, carriedVal).run();

  const inserted = Boolean(ins.meta && ins.meta.changes);
  if (inserted) {
    const v = await bumpChildVersion(db, childId);
    await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, key], v);
  } else {
    notice = null;
  }

  return { inserted, carried: carriedVal, notice };
}

// 任务 114：测试站仓库全量（2026-11-14 用户令：测试站仓库列全部 151、传说技能表按官方做；
// 正式站只按实际拥有显示）。测试模式（GATES_OPEN）下，仓库除真实拥有外，
// 还列出名册其余全部物种（不含主宠）；正式站行为一字未动。
async function warehouseLists(db, childId, mainNo) {
  const all = await ownedCollection(db, childId);
  const carried = all.filter((c) => c.carried);
  const stored = all.filter((c) => !c.carried);
  if (GATES_OPEN) {
    const have = new Set(all.map((c) => Number(c.no)));
    for (const key of Object.keys(COLLECTION_MOVES)) {
      const no = Number(key);
      if (no === mainNo || have.has(no)) continue;
      const sp = SPECIES[no];
      if (!sp) continue;
      stored.push({
        no,
        entry_key: dexKeyForSpecies(no),
        name: sp.name,
        type: sp.type,
        img: petImg(no),
        counters: countersForType(sp.type),
        carried: 0,
      });
    }
    stored.sort((a, b) => a.no - b.no);
  }
  return { carried, stored };
}

// F3：使用 getChild + isCareEnabled(db)，并返回 mainPet
async function apiWarehouseStatus(db, req, session) {
  const url = new URL(req.url);
  const scoped = scopeChildId(session, url.searchParams.get('child_id') ?? url.searchParams.get('childId'));
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const careEnabled = await isCareEnabled(db);
  await attachEvoForm(db, child, shDateStr());

  const { carried, stored } = await warehouseLists(db, childId, await mainPetSpeciesNo(db, childId));
  return json({
    ok: true,
    child_id: childId,
    care_enabled: careEnabled ? 1 : 0,
    max_carried: MAX_CARRIED_COLLECTION,
    mainPet: (() => {
      const f = formInfo(child);
      const e = child._evo;
      let no = null;
      if (e) {
        if (e.branchNo) no = e.branchNo;
        else if (e.formIdx > 0) {
          const forms = LINES[child.line] && LINES[child.line].forms;
          no = forms ? forms[Math.min(e.formIdx - 1, forms.length - 1)].no : null;
        }
      }
      return { name: f.formName, img: f.img, type: LINE_TYPE[child.line] || '', egg: f.egg, no };
    })(),
    carried,
    stored,
  });
}

// F4：store 判序：!no -> INVALID_SPECIES；主宠 -> MAIN_PET_CANNOT_STORE；非收藏种 -> INVALID_SPECIES
async function apiWarehouseStore(db, req, session) {
  const body = await readJsonBody(req);
  const scoped = scopeChildId(session, body.child_id ?? body.childId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const no = Number(body.no ?? body.species_no);
  if (!no) return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  if (await isMainPetForChild(db, childId, no)) {
    return json({ ok: false, error: 'MAIN_PET_CANNOT_STORE' }, 400);
  }
  // 任务 110：前主宠也可存回仓库（否则切线时携带已满、被送进仓库的旧主宠永远取不出来）
  if (!COLLECTION_MOVES[no] && !(await getExMainLine(db, childId, no))) {
    return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  }

  const key = dexKeyForSpecies(no);
  const res = await db.prepare(
    'UPDATE pokedex SET carried = 0 WHERE child_id = ? AND entry_key = ? AND carried = 1'
  ).bind(childId, key).run();

  if (!res.meta || !res.meta.changes) {
    return json({ ok: false, error: 'NOT_CARRIED' }, 400);
  }

  const v = await bumpChildVersion(db, childId);
  await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, key], v);

  const { carried, stored } = await warehouseLists(db, childId, await mainPetSpeciesNo(db, childId));
  return json({
    ok: true,
    carried,
    stored,
  });
}

// F4：take 判序：!no -> INVALID_SPECIES；主宠 -> INVALID_SPECIES；非收藏种 -> INVALID_SPECIES
async function apiWarehouseTake(db, req, session) {
  const body = await readJsonBody(req);
  if (body.replace_no || body.out_no) {
    return apiWarehouseSwapCore(
      db,
      session,
      body.child_id ?? body.childId,
      Number(body.no ?? body.in_no),
      Number(body.replace_no ?? body.out_no)
    );
  }

  const scoped = scopeChildId(session, body.child_id ?? body.childId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const no = Number(body.no ?? body.species_no);
  if (!no) return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  if (await isMainPetForChild(db, childId, no)) {
    return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  }
  // 任务 110：前主宠也可取回携带（与 store 对称）
  if (!COLLECTION_MOVES[no] && !(await getExMainLine(db, childId, no))) {
    return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  }

  const key = dexKeyForSpecies(no);
  // D1 单条语句最多 100 个绑定参数（2026-11-06 生产站 take 报 500 的根因：此处旧代码
  // 拼 146 个收藏种 key 的 IN 列表，UPDATE 共绑 149 参数、兜底 count 共绑 147 参数，
  // D1 直接抛 'too many SQL variables'；本地 node:sqlite 上限 999 故回归测不出来）。
  // 改用前缀谓词：收藏种的 entry_key 只可能是 wild:/egg:/rare: 三种前缀（dexKeyForSpecies），
  // form:（主宠形态行）与 gym:（道馆行）永远不是收藏种，故与 146-key IN 列表等价；
  // 且 take/swap 入口都有 COLLECTION_MOVES[no] 门禁（任务 110 起含前主宠例外），非收藏种永远无法被新置为 carried=1，
  // 前缀谓词对今后可达的数据也是精确的；即使将来出现例外，超算方向也是安全的
  // （只会提前判满、绝不会超 4 只）。绑定数：UPDATE 149→3，兜底 count 147→1。
  const res = await db.prepare(
    `UPDATE pokedex
     SET carried = 1
     WHERE child_id = ?
       AND entry_key = ?
       AND carried = 0
       AND (
         SELECT COUNT(*) FROM pokedex
         WHERE child_id = ? AND carried = 1
           AND entry_key NOT LIKE 'form:%' AND entry_key NOT LIKE 'gym:%'
       ) < ${MAX_CARRIED_COLLECTION}`
  ).bind(childId, key, childId).run();

  if (!res.meta || !res.meta.changes) {
    const cntRow = await db.prepare(
      `SELECT COUNT(*) AS cnt FROM pokedex
       WHERE child_id = ? AND carried = 1
         AND entry_key NOT LIKE 'form:%' AND entry_key NOT LIKE 'gym:%'`
    ).bind(childId).first();

    if ((cntRow?.cnt ?? 0) >= MAX_CARRIED_COLLECTION) {
      return json({ ok: false, error: 'PARTY_FULL_SWAP_REQUIRED' }, 400);
    }
    // 任务 114：测试站全量——仓库里还没有该种的行（合成条目），直接发一只（补行 carried=1）。
    // 正式站 GATES_OPEN 为 false，走不到这里；名册门（COLLECTION_MOVES）与主宠门
    // 在函数入口已验过，此处只补"有种无行"一种情况。
    if (GATES_OPEN && COLLECTION_MOVES[no]) {
      const ins = await db.prepare(
        'INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(?,?,?,1)'
      ).bind(childId, key, shDateStr()).run();
      if (ins.meta && ins.meta.changes) {
        const v = await bumpChildVersion(db, childId);
        await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, key], v);
        const { carried, stored } = await warehouseLists(db, childId, await mainPetSpeciesNo(db, childId));
        return json({ ok: true, carried, stored });
      }
    }
    return json({ ok: false, error: 'NOT_IN_WAREHOUSE' }, 400);
  }

  const v = await bumpChildVersion(db, childId);
  await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, key], v);

  const { carried, stored } = await warehouseLists(db, childId, await mainPetSpeciesNo(db, childId));
  return json({
    ok: true,
    carried,
    stored,
  });
}

async function apiWarehouseSwap(db, req, session) {
  const body = await readJsonBody(req);
  const takeNo = Number(body.take_no ?? body.in_no ?? body.no);
  const storeNo = Number(body.store_no ?? body.out_no ?? body.replace_no);
  return apiWarehouseSwapCore(db, session, body.child_id ?? body.childId, takeNo, storeNo);
}

// F4：swap-core 判序：!takeNo/!storeNo/相等 -> INVALID_SWAP_PAIR；主宠（任一）-> MAIN_PET_CANNOT_STORE；非收藏种（任一）-> INVALID_SPECIES
async function apiWarehouseSwapCore(db, session, rawChildId, takeNo, storeNo) {
  const scoped = scopeChildId(session, rawChildId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  if (!takeNo || !storeNo || takeNo === storeNo) {
    return json({ ok: false, error: 'INVALID_SWAP_PAIR' }, 400);
  }
  if ((await isMainPetForChild(db, childId, takeNo)) || (await isMainPetForChild(db, childId, storeNo))) {
    return json({ ok: false, error: 'MAIN_PET_CANNOT_STORE' }, 400);
  }
  // 任务 110：前主宠也可参与互换（与 store/take 对称）
  if (!(COLLECTION_MOVES[takeNo] || (await getExMainLine(db, childId, takeNo)))
    || !(COLLECTION_MOVES[storeNo] || (await getExMainLine(db, childId, storeNo)))) {
    return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  }

  const takeKey = dexKeyForSpecies(takeNo);
  const storeKey = dexKeyForSpecies(storeNo);

  const { results } = await db.prepare(
    'SELECT entry_key, carried FROM pokedex WHERE child_id = ? AND entry_key IN (?, ?)'
  ).bind(childId, takeKey, storeKey).all();

  const stateMap = new Map((results || []).map((r) => [r.entry_key, Number(r.carried)]));
  // 任务 114：测试站全量——取回的种在仓库里还没有行（合成条目），先补一行 carried=0 再互换。
  // 名册门与主宠门在函数入口已验过，此处只补"有种无行"一种情况；其他不匹配仍报 SWAP_STATE_MISMATCH。
  if (stateMap.get(takeKey) === undefined && stateMap.get(storeKey) === 1
    && GATES_OPEN && COLLECTION_MOVES[takeNo]) {
    const ins = await db.prepare(
      'INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(?,?,?,0)'
    ).bind(childId, takeKey, shDateStr()).run();
    if (ins.meta && ins.meta.changes) {
      const v0 = await bumpChildVersion(db, childId);
      await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, takeKey], v0);
    }
    stateMap.set(takeKey, 0);
  }
  if (stateMap.get(takeKey) !== 0 || stateMap.get(storeKey) !== 1) {
    return json({ ok: false, error: 'SWAP_STATE_MISMATCH' }, 400);
  }

  await db.batch([
    db.prepare('UPDATE pokedex SET carried = 0 WHERE child_id = ? AND entry_key = ? AND carried = 1').bind(childId, storeKey),
    db.prepare('UPDATE pokedex SET carried = 1 WHERE child_id = ? AND entry_key = ? AND carried = 0').bind(childId, takeKey),
  ]);

  const v = await bumpChildVersion(db, childId);
  await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, storeKey], v);
  await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, takeKey], v);

  const { carried, stored } = await warehouseLists(db, childId, await mainPetSpeciesNo(db, childId));
  return json({
    ok: true,
    carried,
    stored,
  });
}

async function apiGymStatus(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const today = shDateStr();
  const ws = weekStartMon(today);
  const [cnt, gw, child, cleared, finalEggSetting, gymCollection] = await Promise.all([
    weekApprovedCount(db, childId, ws),
    db.prepare('SELECT * FROM gym_weeks WHERE child_id=? AND week_start=?')
      .bind(childId, ws).first(),
    getChild(db, childId),
    clearedStages(db, childId),
    getSetting(db, `gym_final_egg_${childId}`),
    carriedCollection(db, childId),
  ]);
  const weekend = isWeekendDate(today);
  const myLevel = child ? levelFromXp(child.total_xp) : 1;
  const stages = GYM_STAGES.map((g) => {
    const sp = SPECIES[g.bossNo];
    const unlockedStage = g.stage === 1 || cleared.has(g.stage - 1);
    return {
      stage: g.stage, gymName: g.gymName, badge: g.badge, type: sp.type,
      bossNo: g.bossNo, bossName: sp.name, bossImg: petImg(g.bossNo), bossLevel: g.bossLevel,
      bossTypes: bossDefTypes(g.bossNo),
      needLevel: g.needLevel, eggSpecies: g.eggSpecies, eggName: SPECIES[g.eggSpecies].name,
      cleared: cleared.has(g.stage), unlocked: unlockedStage,
      state: cleared.has(g.stage) ? 'cleared' : unlockedStage ? 'open' : 'locked',
    };
  });
  const current = stages.find((s) => s.state === 'open') || stages[stages.length - 1];
  const finalEggAwarded = finalEggSetting === '1';
  return json({
    ok: true, today, isWeekend: weekend, weekStart: ws, weekApproved: cnt, need: 4,
    boss: { no: current.bossNo, name: current.bossName, img: current.bossImg },
    wonThisWeek: !!(gw && gw.won), eggAwardedThisWeek: !!(gw && gw.egg_awarded),
    canChallenge: GATES_OPEN || (weekend && cnt >= 4),
    gatesOpen: GATES_OPEN,
    reason: GATES_OPEN ? '' : !weekend ? '道馆只在周六、周日开放哦' : cnt < 4 ? `本周已打卡 ${cnt} 次，满 4 次才能挑战` : '',
    // —— 闯关梯子（迁移 0005）——
    myLevel, stages,
    badges: stages.map((s) => ({ stage: s.stage, badge: s.badge, type: s.type, lit: s.cleared })),
    clearedCount: cleared.size, finalEggAwarded,
    collection: gymCollection,
    ...(GATES_OPEN ? { benchOptions: await debugBenchOptions(db, childId) } : {}),
    balls: child ? (child.balls ?? 3) : 3,
    ballsSuper: child ? (child.balls_super ?? 0) : 0,
    // 主宠克制提示（借鉴包 v1 §6）：主宠属性克哪几关馆主
    mainType: child ? LINE_TYPE[child.line] : null,
    mainCounters: child ? countersForType(LINE_TYPE[child.line]) : [],
  });
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
  // 妖精不在本作 9 属性内（TYPES），唯一分支仙子伊布会撞 makePet 的类型校验；
  // 先回落到本线的普通属性进场（太阳/月亮伊布在分支表里本就是“普通”）。
  // 收藏 sylveon（700）备战同病是既有问题，不在这里顺手改，见报告。
  const petType = ex && benchType && !TYPES.includes(benchType) ? LINE_TYPE[ex.lineKey] : benchType;
  return makePet({
    key: `dex:${no}`, name: sp ? sp.name : speciesName(no), type: petType, no,
    img: petImg(no), level: battleLevel, defTypes: playerDefTypes(no),
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

/* ---------------- 道馆改版：同时选招结算（DESIGN-道馆改版-v1） ----------------
 * 仅 gym 分支经 resolveGymRound 进入；PvP 的 stagePvpAttack / resolveStagedAttack /
 * 防守答题 / 超时链完全不经此路。一回合 = 双方同时选招：
 * 换宠先行 → 变化招挂标记（本回合即生效）→ 双方出招且均有速度数据时按速度顺序结算，
 * 先攻方一击打倒对方且对方无存活宠时，对方不出手；每次伤害后先 drain，再判昏厥/顶上。
 * 非双方出招或无速度数据时回落同时互算，昏厥方已选的招照常打出，
 * drain 回血在统一判昏厥/顶上之前；同回合双亡判馆主胜（挑战未通关，不发徽章）。
 * 仅单人道馆改速度顺序；旧 bossTakeTurn 交替回合已退役。 */
// 道馆伤害区间由 calcDamage 官方分支统一控制，不再保留独立区间常量。
const GYM_MAX_ROUNDS = 100; // 僵局保护：正常对局 ≤ ~15 回合，超限判挑战失败防卡死

/* 馆主 AI：系统动作「蓄势」= 给自己挂 charge（不占招式表）；其余按威力加权选招。
 * 权重与定参模拟（sim-gym-rework）一致：有蓄力必打出（最高威力 60%、其余均分）；
 * 玩家上场宠残血（≤30%）以斩杀为主（蓄势 10%、最高威力 75%）；
 * 玩家上回合刚用 shell → 蓄势 45% 惩罚龟壳；常规蓄势 25%、最高威力 50%、其余均分。 */
function gymBossChoose(st, rng = Math.random) {
  const pet = activePetOf(st, 'B');
  if (!pet || !Array.isArray(pet.moves) || pet.moves.length === 0) return { type: 'none' };
  const sorted = [...pet.moves].sort((a, b) => b.power - a.power);
  const pickAttack = (topW) => {
    const rest = (1 - topW) / Math.max(1, sorted.length - 1);
    let r = rollRng(rng);
    for (let i = 0; i < sorted.length; i++) {
      const w = i === 0 ? topW : rest;
      if (r < w) return { type: 'move', move: sorted[i] };
      r -= w;
    }
    return { type: 'move', move: sorted[0] };
  };
  if (fxOf(st, 'B').charge) return pickAttack(0.6); // 蓄力必打出
  const foePet = activePetOf(st, 'A');
  const foeFrac = foePet && foePet.maxHp ? foePet.hp / foePet.maxHp : 1;
  let pCharge = 0.25;
  if (foeFrac <= 0.3) pCharge = 0.1; // 斩杀线：以攻击为主
  else if (st.gym && st.gym.lastPlayerKind === 'shell') pCharge = 0.45; // 惩罚龟壳
  if (rollRng(rng) < pCharge) return { type: 'charge' };
  return pickAttack(foeFrac <= 0.3 ? 0.75 : 0.5);
}

/* 变化招挂标记（本回合伤害阶段即按标记结算）；返回本方本回合的行动类别，
 * 供回合末记录玩家行为（馆主 AI 读 lastPlayerKind 判断是否惩罚龟壳）。 */
function applyGymRoundMarks(st, side, act, events, rng = Math.random) {
  const pet = activePetOf(st, side);
  // 2b：睡眠/麻痹导致无法行动时不蓄势、不挂标记，推状态事件（每行动只检定一次：伤害招在 gymStrike 里检定）。
  if (act.type === 'charge') { // 馆主系统动作「蓄势」
    const blocked = statusBlocksAction(pet, rng);
    if (blocked) {
      events.push({ type: 'status', side, pet: pet.name, kind: blocked, text: blocked === 'sleep' ? `${pet.name} 睡着了，不能行动！` : `${pet.name} 麻痹了，动不了！` });
      return 'blocked';
    }
    fxOf(st, side).charge = true;
    events.push({ type: 'effect', side, kind: 'charge', text: `${pet.name} 开始蓄势！下一击的威力会大增，小心啦！` });
    return 'charge';
  }
  if (act.type !== 'move') return act.type; // 'swap' / 'none'
  const eff = moveEffectOf(act.move.name);
  if (!eff || eff === 'drain') return 'attack';
  const blocked = statusBlocksAction(pet, rng);
  if (blocked) {
    events.push({ type: 'status', side, pet: pet.name, kind: blocked, text: blocked === 'sleep' ? `${pet.name} 睡着了，不能行动！` : `${pet.name} 麻痹了，动不了！` });
    return 'blocked';
  }
  applyEffectFlag(st, side, eff, act.move.skillLevel || 1);
  events.push({ type: 'effect', side, kind: eff, move: act.move.name, text: effectEventText(eff, pet.name, act.move.name) });
  return eff;
}

/* 单方伤害（纯计算不落账）：烟幕落空判定 → 区间伤害 → charge/weak/shell 依次消费，
 * 每步取整保底 1（与 consumeAttackMods 同口径）。变化招（非 drain）无伤害且不消费
 * 任何标记；落空只消费 smoke，不消费攻方 charge/weak 与守方 shell。 */
function gymStrike(st, atkSide, defSide, act, rng) {
  if (act.type !== 'move') return { dmg: 0, drain: false, kind: 'none' };
  const eff = moveEffectOf(act.move.name);
  if (eff && eff !== 'drain') return { dmg: 0, drain: false, kind: 'effect' };
  const atk = activePetOf(st, atkSide);
  const def = activePetOf(st, defSide);
  // 2b：睡眠/麻痹导致无法行动（不消费 smoke，不消费攻击标记；速度分支下后攻方在此时检定，
  // 先攻的接触触发已可影响后攻——与官方顺序一致）。
  const blocked = statusBlocksAction(atk, rng);
  if (blocked) return { dmg: 0, drain: false, kind: 'blocked', blocked };
  if (fxOf(st, atkSide).smoke) {
    const smokeLv = (typeof fxLvOf(st, atkSide).smoke === 'number' ? skillLevelOf({ x: fxLvOf(st, atkSide).smoke }, 'x') : 1);
    delete fxOf(st, atkSide).smoke; delete fxLvOf(st, atkSide).smoke;
    if (rollRng(rng) < SKILL_SMOKE_MISS[smokeLv - 1]) return { dmg: 0, drain: false, kind: 'miss' };
  }
  // 道馆攻击仅选择官方规则，不再传入伤害区间。
  // 友好度加成（D10，本次并进第一期）：只进道馆、只作用于玩家主宠（key==='main'）。
  // 暴击：友好度 255 时主宠出招暴击率 1/16→1/8（经 opts.critRate，不改 CRIT_RATE 全局常量）。
  // 闪避：友好度 ≥204 时主宠被打 +5%（经 opts.dodgePct，只动官方分支命中检定行；经典分支不加命中检定）。
  const friendship = (st.gym && Number.isFinite(st.gym.friendship)) ? st.gym.friendship : 0;
  const dmgOpts = { chart: 'official', weather: (st.weather && st.weather.kind) || null };
  if (atkSide === 'A' && atk.key === 'main' && friendship >= 255) dmgOpts.critRate = 1 / 8;
  if (defSide === 'A' && def.key === 'main' && friendship >= 204) dmgOpts.dodgePct = 5;
  const dmgRes = calcDamage(act.move, atk, def, rng, dmgOpts);
  if (dmgRes.error) return { dmg: 0, drain: false, kind: 'error', error: dmgRes.error };
  // 命中检定落空直接返回，不消费攻击标记。
  if (dmgRes.missed === true) return { dmg: 0, drain: false, kind: 'acc-miss' };
  const modded = consumeAttackMods(st, atkSide, dmgRes.dmg);
  return {
    dmg: modded.dmg, drain: eff === 'drain', kind: 'hit',
    critical: dmgRes.critical === true, mult: dmgRes.mult, mods: modded.mods || [],
    ability: dmgRes.ability || [],
  };
}

/* 出招事件组装（落账后调用，targetHp 为最终值；吸取回复并入 mods 文案，与旧引擎同形）。
 * 返回事件数组：特性触发事件（有则）在前，攻击/miss 事件在后。 */
function gymStrikeEvent(st, atkSide, act, hit, heal) {
  const defSide = atkSide === 'A' ? 'B' : 'A';
  // 特性事件（hit.abilityHeal 为调用方应用特性吸取后的实际回复量，供文案用）。
  const abilityEvs = abilityEvents(hit.ability || [], atkSide, defSide, hit.abilityHeal || 0);
  if (hit.kind === 'miss') {
    const atk = activePetOf(st, atkSide);
    return [...abilityEvs, { type: 'miss', side: atkSide, move: act.move.name, text: `${atk.name} 用了「${act.move.name}」，却打中了烟幕和分身——落空啦！` }];
  }
  // 命中检定落空沿用 miss 事件，文案与烟幕落空区分。
  if (hit.kind === 'acc-miss') {
    const atk = activePetOf(st, atkSide);
    return [...abilityEvs, { type: 'miss', side: atkSide, move: act.move.name, text: `${atk.name} 用了「${act.move.name}」，却没打中！` }];
  }
  // 2b：睡眠/麻痹导致无法行动。
  if (hit.kind === 'blocked') {
    const atk = activePetOf(st, atkSide);
    return [{ type: 'status', side: atkSide, pet: atk.name, kind: hit.blocked, text: hit.blocked === 'sleep' ? `${atk.name} 睡着了，不能行动！` : `${atk.name} 麻痹了，动不了！` }];
  }
  if (hit.kind !== 'hit') return abilityEvs;
  const atk = activePetOf(st, atkSide);
  const def = activePetOf(st, defSide);
  const mods = [...(hit.mods || [])];
  if (heal > 0) mods.push(`吸取回复 ${heal}`);
  return [...abilityEvs, {
    type: 'attack', side: atkSide, pet: atk.name, move: act.move.name, moveType: act.move.type,
    dmg: hit.dmg, mult: hit.mult, superEffective: hit.mult > 1, resisted: hit.mult > 0 && hit.mult < 1, immune: hit.mult === 0, critical: hit.critical === true,
    target: def.name, targetHp: def.hp,
    text: hit.mult === 0 ? `${atk.name} 用了「${act.move.name}」！没有效果！` : `${atk.name} 用了「${act.move.name}」！${hit.critical ? '会心一击！' : ''}${hit.mult > 1 ? '效果拔群！（×2）' : hit.mult > 0 && hit.mult < 1 ? '效果不好…（×0.5）' : ''}对 ${def.name} 造成 ${hit.dmg} 点伤害。${mods.length ? `（${mods.join('、')}）` : ''}`,
    mods,
  }];
}

/* 道馆一回合结算。action: { moveName } 或 { swapToIdx }（换宠优先）。
 * 成功返回 { events }；参数/状态错误返回 { error } 且调用方不应保存。 */
function resolveGymRound(st, action, rng = Math.random) {
  if (!st || st.mode !== 'gym') return { error: 'NOT_GYM' };
  if (st.winner) return { error: 'BATTLE_OVER' };
  if (!st.gym) st.gym = { lastPlayerKind: null }; // 改版前存量对局补字段
  // 天气（第三期简化版）：旧存量对局无 weather 字段，默认无天气。
  if (!st.weather) st.weather = { kind: null };
  // 友好度战斗加成（D10，本次并进第一期）：旧存量对局无此字段，默认无加成。
  if (!Number.isFinite(st.gym.friendship)) st.gym.friendship = 0;
  if (st.gym.endureUsed == null) st.gym.endureUsed = false;
  const A = st.sides && st.sides.A;
  const B = st.sides && st.sides.B;
  if (!A || !B) return { error: 'NO_ACTIVE_PET' };
  const aPetStart = activePetOf(st, 'A');
  if (!aPetStart || !(aPetStart.hp > 0)) return { error: 'NO_ACTIVE_PET' };
  if (!activePetOf(st, 'B')) return { error: 'NO_ACTIVE_PET' };

  // 玩家行动校验（用药优先于换宠/出招；换宠只能换给存活的非上场宠）
  let playerAct = null;
  if (action && action.itemKey) {
    // 道馆用药（v11 §9.3）：用药是本回合行动，先生效、玩家本回合不出招，馆主照常攻击
    const itemKey = String(action.itemKey);
    const eff = GYM_ITEM_EFFECTS[itemKey];
    if (!eff) return { error: 'ITEM_NOT_USABLE' };
    st.gym.itemUses = st.gym.itemUses || { heal: 0, revive: 0, boost: 0 };
    if ((st.gym.itemUses[eff.kind] || 0) >= (GYM_ITEM_CAPS[eff.kind] || 0)) return { error: 'ITEM_CAP_REACHED' };
    let targetIdx = null;
    if (eff.kind === 'revive') {
      targetIdx = Number(action.targetIdx);
      if (!Number.isInteger(targetIdx) || targetIdx < 0 || targetIdx >= A.pets.length || A.pets[targetIdx].hp > 0 || targetIdx === A.activeIdx) {
        return { error: 'ITEM_TARGET_INVALID' };
      }
    }
    if (eff.kind === 'heal' && aPetStart.hp >= aPetStart.maxHp) return { error: 'ITEM_NO_NEED' }; // 满血禁止浪费性使用
    playerAct = { type: 'item', itemKey, targetIdx, effect: eff };
  } else if (action && action.swapToIdx !== null && action.swapToIdx !== undefined) {
    const idx = Number(action.swapToIdx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= A.pets.length || idx === A.activeIdx || !(A.pets[idx].hp > 0)) {
      return { error: 'SWAP_INVALID' };
    }
    playerAct = { type: 'swap', toIdx: idx };
  } else {
    const moveName = action && action.moveName ? String(action.moveName) : null;
    if (!moveName) return { error: 'MUST_CHOOSE_MOVE' };
    const move = Array.isArray(aPetStart.moves) ? aPetStart.moves.find((m) => m.name === moveName) : null;
    if (!move) return { error: 'MOVE_NOT_LEARNED' };
    playerAct = { type: 'move', move };
  }
  // 馆主在回合开始状态上同时决策（与玩家同一起点；只读不改状态）
  const bossAct = gymBossChoose(st, rng);

  const preEvents = []; // 换宠 + 挂标记
  const postEvents = []; // 昏厥 + 顶上
  // 0. 主动换宠先行：新宠承受本回合全部攻击，换宠方本回合不出招
  if (playerAct.type === 'swap') {
    // 2a/2b：下场清阶段；自然回复下场时清除状态并推事件。新宠顶上后触发威吓。
    onPetLeavesField(st, 'A', aPetStart, preEvents);
    A.activeIdx = playerAct.toIdx;
    const np = activePetOf(st, 'A');
    preEvents.push({ type: 'swap', side: 'A', pet: np.name, text: `换 ${np.name} 上场！` });
    triggerSwitchIn(st, 'A', preEvents);
  }
  // 0.5 用药先生效（v11 §9.3）：回血上场宠／复活昏厥备战宠；复活宠在备战位，本回合不行动
  let itemUsed = null;
  if (playerAct.type === 'item') {
    const eff = playerAct.effect;
    st.gym.itemUses = st.gym.itemUses || { heal: 0, revive: 0, boost: 0 };
    st.gym.itemRounds = st.gym.itemRounds || {};
    if (eff.kind === 'heal') {
      const pet = activePetOf(st, 'A');
      const amount = Math.min(Math.floor(pet.maxHp * eff.pct / 100), pet.maxHp - pet.hp);
      pet.hp += amount;
      st.gym.itemUses.heal += 1;
      st.gym.itemRounds[st.turnNo] = { itemKey: playerAct.itemKey, targetIdx: null, amount };
      preEvents.push({ type: 'item', side: 'A', itemKey: playerAct.itemKey, amount, targetHp: pet.hp, text: `用了「${ITEM_CATALOG[playerAct.itemKey].name}」，${pet.name} 恢复了 ${amount} 点体力！` });
      itemUsed = { itemKey: playerAct.itemKey, targetIdx: null, amount };
    } else if (eff.kind === 'revive') {
      const pet = A.pets[playerAct.targetIdx];
      const amount = Math.floor(pet.maxHp * eff.pct / 100);
      pet.hp = amount;
      st.gym.itemUses.revive += 1;
      st.gym.itemRounds[st.turnNo] = { itemKey: playerAct.itemKey, targetIdx: playerAct.targetIdx, amount };
      preEvents.push({ type: 'item', side: 'A', itemKey: playerAct.itemKey, targetIdx: playerAct.targetIdx, amount, targetHp: pet.hp, text: `用了「${ITEM_CATALOG[playerAct.itemKey].name}」，${pet.name} 恢复了 ${amount} 点体力，重新站起来了！` });
      itemUsed = { itemKey: playerAct.itemKey, targetIdx: playerAct.targetIdx, amount };
    }
  }
  // 1. 变化招挂标记（本回合即生效：本回合打出的防御能挡本回合的攻击）
  const aKind = applyGymRoundMarks(st, 'A', playerAct, preEvents, rng);
  applyGymRoundMarks(st, 'B', bossAct, preEvents, rng);
  // 2-3. 单人道馆按速度顺序出招；顶上逻辑共用，事件写入对应结算队列。
  const events = [...preEvents];
  const promote = (sideKey, targetEvents) => {
    const sd = st.sides[sideKey];
    const nextIdx = sd.pets.findIndex((p) => p.hp > 0);
    if (nextIdx < 0) return false;
    sd.activeIdx = nextIdx;
    targetEvents.push({ type: 'swap', side: sideKey, pet: sd.pets[nextIdx].name, text: `${sd.pets[nextIdx].name} 上场啦！` });
    // 2a：顶上的宠若带威吓，降对方攻击。
    triggerSwitchIn(st, sideKey, targetEvents);
    return true;
  };
  // 2b：回合末结算（状态扣血/治愈/睡眠计数）。扣血致昏厥时推 faint 事件并顶上（顶不上有后备则记 out）。
  // 局部辅助：用本回合的 promote（含威吓触发）；返回 {aOut, bOut}。
  const settleEot = (targetEvents) => {
    const fainted = tickActiveStatuses(st, rng, targetEvents);
    let aOutEot = false, bOutEot = false;
    for (const { side: fSide, pet: fPet } of fainted) {
      targetEvents.push({ type: 'faint', side: fSide, pet: fPet.name, text: `${fPet.name} 倒下了！` });
      clearPetBattleState(fPet);
      if (!promote(fSide, targetEvents)) {
        if (fSide === 'A') aOutEot = true; else bOutEot = true;
      }
    }
    return { aOut: aOutEot, bOut: bOutEot };
  };
  // 2a/2b（D6）：速度按 effectiveSpeed（阶段修正，麻痹 ×0.5）；无属性时沿用旧口径（不同时结算）。
  // 天气（第三期简化版）：叶绿素晴天/悠游自如雨天速度×2，只影响道馆出招顺序。
  const aPetSpd = activePetOf(st, 'A');
  const bPetSpd = activePetOf(st, 'B');
  const aSpeed = aPetSpd.stats ? effectiveSpeed(aPetSpd, st.weather.kind) : undefined;
  const bSpeed = bPetSpd.stats ? effectiveSpeed(bPetSpd, st.weather.kind) : undefined;
  let aOut = false;
  let bOut = false;
  // 仅双方出招且速度均有限时启用顺序结算；平速才消耗一次随机数。
  if (playerAct.type === 'move' && bossAct.type === 'move' &&
      Number.isFinite(aSpeed) && Number.isFinite(bSpeed)) {
    const first = aSpeed > bSpeed ? 'A' : bSpeed > aSpeed ? 'B' : rollRng(rng) < 0.5 ? 'A' : 'B';
    const second = first === 'A' ? 'B' : 'A';
    // 两次攻击共用伤害、吸取、事件与即时昏厥处理，后攻现取顶上后的宠。
    const strikeOnce = (atkSide, defSide, act) => {
      const hit = gymStrike(st, atkSide, defSide, act, rng);
      if (hit.error) return { error: hit.error };
      const atkPet = activePetOf(st, atkSide);
      const defPet = activePetOf(st, defSide);
      if (typeof defPet.hp !== 'number' || !Number.isFinite(defPet.hp)) defPet.hp = 0;
      defPet.hp = Math.max(0, defPet.hp - hit.dmg);
      const heal = hit.drain && hit.dmg > 0 ? drainHeal(atkPet, hit.dmg) : 0;
      // 特性吸取回复（储水/蓄电免疫时）紧随 drain 回血、昏厥判定之前结算。
      hit.abilityHeal = applyAbilityHeal(defPet, hit.ability);
      // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
      applyAbilityStages(defPet, hit.ability);
      // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
      applyAbilityFlashFire(defPet, hit.ability);
      events.push(...gymStrikeEvent(st, atkSide, act, hit, heal));
      if (defPet.hp <= 0) {
        // 友好度硬撑：主宠致命伤按档概率留 1 HP，每场限 1 次（drain 回血之后判）。
        if (defSide === 'A' && tryEndure(st, defSide, defPet, rng)) {
          events.push({ type: 'endure', side: defSide, pet: defPet.name, text: `${defPet.name} 和你的羁绊让它撑住了！只剩 1 点体力！` });
        } else {
          events.push({ type: 'faint', side: defSide, pet: defPet.name, text: `${defPet.name} 倒下了！` });
          // 2b：昏厥时清除状态与阶段（不推事件）。
          clearPetBattleState(defPet);
          if (!promote(defSide, events)) return { out: defSide };
        }
      }
      // 2b：接触触发（伤害结算后、昏厥判定后；仅造成伤害、防守方存活且招式为接触时掷 30%）。
      // 放在昏厥判定之后：昏厥的宠不触发；顶上的新宠不是被打中的那只，不触发。
      if (hit.dmg > 0 && hit.kind === 'hit') applyContactTrigger(atkPet, defPet, act.move, rng, events, atkSide, defSide, (st.weather && st.weather.kind) || null);
      return { out: null };
    };
    const firstAct = first === 'A' ? playerAct : bossAct;
    const secondAct = second === 'A' ? playerAct : bossAct;
    const firstResult = strikeOnce(first, second, firstAct);
    if (firstResult.error) return { error: firstResult.error };
    if (firstResult.out) {
      st.winner = first;
    } else {
      const secondResult = strikeOnce(second, first, secondAct);
      if (secondResult.error) return { error: secondResult.error };
      if (secondResult.out) st.winner = second;
      else {
        // 2b：双方出招完成且无人出局时，回合末结算状态（扣血/治愈/睡眠计数）。
        const eot = settleEot(events);
        aOut = aOut || eot.aOut;
        bOut = bOut || eot.bOut;
      }
    }
  } else {
  // 2-3. 伤害互算：双方伤害只依赖回合开始快照（属性/等级/标记），先算完再同时落账
  const aHit = gymStrike(st, 'A', 'B', playerAct, rng);
  const bHit = gymStrike(st, 'B', 'A', bossAct, rng);
  if (aHit.error) return { error: aHit.error };
  if (bHit.error) return { error: bHit.error };
  const aPet = activePetOf(st, 'A');
  const bPet = activePetOf(st, 'B');
  if (typeof aPet.hp !== 'number' || !Number.isFinite(aPet.hp)) aPet.hp = 0;
  if (typeof bPet.hp !== 'number' || !Number.isFinite(bPet.hp)) bPet.hp = 0;
  bPet.hp = Math.max(0, bPet.hp - aHit.dmg);
  aPet.hp = Math.max(0, aPet.hp - bHit.dmg);
  // 4. drain 回血在昏厥判定之前结算（回血后 HP>0 则不昏厥，能把自己救回来）
  const aHeal = aHit.drain && aHit.dmg > 0 ? drainHeal(aPet, aHit.dmg) : 0;
  const bHeal = bHit.drain && bHit.dmg > 0 ? drainHeal(bPet, bHit.dmg) : 0;
  // 特性吸取回复（储水/蓄电免疫时）紧随 drain 回血、昏厥判定之前结算。
  aHit.abilityHeal = applyAbilityHeal(bPet, aHit.ability);
  bHit.abilityHeal = applyAbilityHeal(aPet, bHit.ability);
  // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
  applyAbilityStages(bPet, aHit.ability);
  applyAbilityStages(aPet, bHit.ability);
  // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
  applyAbilityFlashFire(bPet, aHit.ability);
  applyAbilityFlashFire(aPet, bHit.ability);
  events.push(...gymStrikeEvent(st, 'A', playerAct, aHit, aHeal));
  events.push(...gymStrikeEvent(st, 'B', bossAct, bHit, bHeal));
  // 5. 昏厥与顶上（回合末统一处理；顶上的新宠本回合不再行动）
  // 友好度硬撑：主宠致命伤按档概率留 1 HP，每场限 1 次（drain 回血之后判）。
  let aDown = aPet.hp <= 0;
  const bDown = bPet.hp <= 0;
  if (aDown && tryEndure(st, 'A', aPet, rng)) {
    aDown = false;
    postEvents.push({ type: 'endure', side: 'A', pet: aPet.name, text: `${aPet.name} 和你的羁绊让它撑住了！只剩 1 点体力！` });
  }
  if (bDown) {
    postEvents.push({ type: 'faint', side: 'B', pet: bPet.name, text: `${bPet.name} 倒下了！` });
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(bPet);
    if (!promote('B', postEvents)) bOut = true;
  }
  if (aDown) {
    postEvents.push({ type: 'faint', side: 'A', pet: aPet.name, text: `${aPet.name} 倒下了！` });
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(aPet);
    if (!promote('A', postEvents)) aOut = true;
  }
  // 2b：接触触发（伤害结算后、昏厥判定后；仅造成伤害、防守方存活且招式为接触时掷 30%）。
  // 按宠引用传参：昏厥的宠 hp 已为 0、函数内部守卫不触发；顶上的新宠不是被打中的那只，不触发。
  // 事件进 postEvents（在昏厥/顶上事件之后）。
  if (aHit.dmg > 0 && aHit.kind === 'hit') applyContactTrigger(aPet, bPet, playerAct.move, rng, postEvents, 'A', 'B', (st.weather && st.weather.kind) || null);
  if (bHit.dmg > 0 && bHit.kind === 'hit') applyContactTrigger(bPet, aPet, bossAct.move, rng, postEvents, 'B', 'A', (st.weather && st.weather.kind) || null);
  // 2b：双方均未出局时，回合末结算状态（扣血/治愈/睡眠计数）。
  if (!aOut && !bOut) {
    const eot = settleEot(postEvents);
    aOut = aOut || eot.aOut;
    bOut = bOut || eot.bOut;
  }
  events.push(...postEvents);
  }
  // 顺序结算下双亡不可达，仅作防御；同时回落模式仍用它。
  if (aOut && bOut) st.winner = 'B'; // 同回合双亡：挑战未通关，判馆主胜（不发徽章）
  else if (bOut) st.winner = 'A';
  else if (aOut) st.winner = 'B';
  st.turnNo = (st.turnNo || 1) + 1;
  st.acted.A = (st.acted.A || 0) + 1;
  st.acted.B = (st.acted.B || 0) + 1;
  st.turn = 'A'; // 每回合双方各行动一次，玩家侧恒可行动（turn='A'）；回合内出招顺序由速度定
  st.gym.lastPlayerKind = aKind;
  if (!st.winner && st.turnNo > GYM_MAX_ROUNDS) {
    st.winner = 'B';
    events.push({ type: 'note', text: '战斗持续太久啦，这次挑战失败，下次再来！' });
  }
  pushLog(st, events);
  return { events, itemUsed };
}

function battleView(row, st) {
  const sideView = (s) => (s ? {
    childId: s.childId, childName: s.childName, battleLevel: s.battleLevel,
    line: s.line || null,
    activeIdx: s.activeIdx || 0,
    pets: s.pets.map((p, i) => ({
      key: p.key, name: p.name, type: p.type, no: p.no, img: p.img, level: p.appLevel ?? p.level,
      hp: p.hp, maxHp: p.maxHp, active: i === (s.activeIdx || 0), fainted: p.hp <= 0, moves: p.moves,
    })),
    // 任务 73：备战展示——随身队里未入选出战的收藏宠；等级/体力按当前 battleLevel 现算（满血），
    // 加入展平后也不过期。仅作棋盘展示，不进战斗结算（道馆 side 无 benchDisplay，恒为空数组）。
    bench: (s.benchDisplay || []).map((b) => {
      const maxHp = pvpBenchHp(b.no, s.battleLevel);
      return { key: b.key, name: b.name, type: b.type, no: b.no, img: b.img, level: s.battleLevel, hp: maxHp, maxHp, fainted: false };
    }),
  } : null);
  // 道馆改版：回合内按速度先后结算，但每回合双方各行动一次，进行中一律视为等玩家行动（turn='A'）；
  // 改版前存量道馆对局（turn 可能停在 'B'）由此归一，不会卡在「馆主行动中」。PvP 不受影响。
  const viewTurn = row.status === 'active' ? (row.mode === 'gym' ? 'A' : st.turn) : null;
  return {
    battleId: row.id, mode: row.mode, stage: row.stage, status: row.status,
    weekStart: row.week_start,
    turn: viewTurn, turnNo: st.turnNo,
    firstSide: st.firstSide,
    // 天气（第三期简化版）：前端角标用；旧存量对局无此字段默认 null。
    weather: (st.weather && st.weather.kind) || null,
    // 道馆回合内按速度先后结算，玩家每回合恒可行动（canSideAttack 的先攻规则只对 PvP/旧引擎成立）
    canAttack: row.status === 'active' && !st.winner ? (row.mode === 'gym' ? true : canSideAttack(st, viewTurn || st.turn)) : false,
    winnerSide: st.winner || null, winnerChildId: row.winner_child_id,
    phase: st.pending ? 'defense' : 'move',
    fx: st.fx || { A: {}, B: {} },
    pending: st.pending ? {
      attackerSide: st.pending.attacker, defenderSide: st.pending.attacker === 'A' ? 'B' : 'A',
      moveName: st.pending.moveName, petName: st.pending.petName, targetName: st.pending.targetName,
      question: st.pending.question || null,
      /* 防守超时计时（前端倒计时用）：sinceEpoch 为题生成时刻，
       * 存量 pending 未被相关请求触及前为 null、deadlineEpoch 亦为 null，前端不显示倒计时 */
      sinceEpoch: st.pending.sinceEpoch || null,
      deadlineEpoch: st.pending.sinceEpoch ? st.pending.sinceEpoch + PVP_DEFENSE_TIMEOUT_SECS : null,
      timeoutSecs: PVP_DEFENSE_TIMEOUT_SECS,
    } : null,
    sides: { A: sideView(st.sides.A), B: sideView(st.sides.B) },
    log: st.log || [],
  };
}

async function loadBattle(db, battleId) {
  const row = await db.prepare('SELECT * FROM battles WHERE id=?').bind(battleId).first();
  if (!row) return null;
  let st = null;
  try { st = JSON.parse(row.state || '{}'); } catch { st = null; }
  return { row, st };
}

/* 保存战斗状态。expectedState（loadBattle 时读到的原始 state 字符串）可选：
 * 提供时 UPDATE 带 AND state=? 做轻量 CAS——状态已被别的请求推进过则 0 行、
 * 返回 false，调用方应放弃本次写入（路由层回 409 STATE_CHANGED）；
 * 不提供时行为与旧版一致（无条件更新、返回 true）。 */
async function saveBattle(db, row, st, expectedState) {
  const args = [JSON.stringify(st), row.status, row.winner_child_id, row.counted, row.finished_epoch, row.id];
  const touchBattleRow = async () => {
    const vA = await bumpChildVersion(db, row.child_a);
    await touchRow(db, 'battles', 'id=?', [row.id], vA);
    if (row.child_b) { const vB = await bumpChildVersion(db, row.child_b); await touchRow(db, 'battles', 'id=?', [row.id], Math.max(vA, vB)); }
  };
  if (expectedState === undefined) {
    await db.prepare('UPDATE battles SET state=?, status=?, winner_child_id=?, counted=?, finished_epoch=? WHERE id=?')
      .bind(...args).run();
    await touchBattleRow();
    return true;
  }
  const r = await db.prepare('UPDATE battles SET state=?, status=?, winner_child_id=?, counted=?, finished_epoch=? WHERE id=? AND state=?')
    .bind(...args, expectedState).run();
  if (r.meta && r.meta.changes) await touchBattleRow();
  return !!(r.meta && r.meta.changes);
}

/* 道馆用药视图（v11 §9.3）：可用药（背包余量）＋本场已用次数＋上限；只用于 gym 对局 */
async function gymItemsView(db, childId, st) {
  const uses = (st.gym && st.gym.itemUses) || { heal: 0, revive: 0, boost: 0 };
  const items = [];
  for (const [key, eff] of Object.entries(GYM_ITEM_EFFECTS)) {
    const qty = await getInventoryQty(db, childId, key);
    items.push({ key, name: ITEM_CATALOG[key].name, emoji: ITEM_CATALOG[key].emoji, kind: eff.kind, rate: eff.pct, qty, used: uses[eff.kind] || 0, cap: GYM_ITEM_CAPS[eff.kind] || 0 });
  }
  return { items, uses, caps: GYM_ITEM_CAPS };
}

/* 闯关首通奖励：点亮徽章（gym_progress）+ 馆主入图鉴 + 该关 species 封印蛋；
 * 四关全通再发梦幻终奖蛋（每孩仅一次）。重复通关不重发。绝不发经验。 */
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

/* 对战规则阶段 2（L5）：从战斗日志汇总防守表现——答对题数（dodge/block/guard/ward）与闪避次数。
 * 纯函数；defense 事件的 side 即防守方；超时／放弃／答错不计入“守住”。 */
function defenseSummaryFromLog(log) {
  const out = { A: { answered: 0, dodges: 0 }, B: { answered: 0, dodges: 0 } };
  for (const e of (log || [])) {
    if (!e || e.type !== 'defense' || (e.side !== 'A' && e.side !== 'B')) continue;
    if (e.kind === 'dodge' || e.kind === 'block' || e.kind === 'guard' || e.kind === 'ward') {
      out[e.side].answered += 1;
      if (e.kind === 'dodge') out[e.side].dodges += 1;
    }
  }
  return out;
}

/* 战斗收尾：置 finished、记胜者；PvP 计次并给胜者 +1 精灵球（不发经验）。
 * expectedState 传入时先做 CAS 保存、成功后才发奖：保存失败说明状态已被
 * 别的请求推进，返回 {conflict:true} 让路由层回 409，绝不发奖——避免出现
 * 「奖励已发但状态没存上」后重试导致的重复发奖。保存成功后本场 status 已是
 * finished，后续重复出招请求会被 apiBattleMove 的状态检查挡住。 */
async function finalizeBattle(db, row, st, today, expectedState) {
  row.status = 'finished';
  row.finished_epoch = Math.floor(Date.now() / 1000);
  const winnerSide = st.winner;
  const winnerChildId = winnerSide ? st.sides[winnerSide].childId : null;
  row.winner_child_id = winnerChildId;
  const winnerPetsLeft = winnerSide ? st.sides[winnerSide].pets.filter((p) => p.hp > 0).length : 0;
  st.result = { winnerSide, winnerChildId, winnerPetsLeft, totalActions: (st.acted.A || 0) + (st.acted.B || 0) };
  // 对战规则阶段 2（L5）：PvP 结算时把防守表现写进 result（败者防守只进单场战报，不上冠军墙）；
  // 道馆／合作无防守事件，不写该字段，旧局无此字段时前端按“无防守数据”省略。
  if (row.mode === 'pvp') st.result.defense = defenseSummaryFromLog(st.log);
  pushLog(st, []);
  if (row.mode === 'pvp' && !st.rematch) row.counted = 1; // 计次随 CAS 保存一起落库，发奖在其后；再来一局不计次（保守口径，待用户定案）
  const saved = await saveBattle(db, row, st, expectedState);
  if (!saved) return { conflict: true };
  let rewards = null;
  if (row.mode === 'gym' && winnerSide === 'A' && winnerChildId) {
    rewards = await awardGymClear(db, winnerChildId, row.stage, today);
  }
  if (row.mode === 'pvp' && st.rematch) {
    // 再来一局结算（保守口径，待用户定案）：不发冠军球、不改周冠军；批准单在此消费，用完即止
    if (st.rematchRequestId) {
      await db.prepare("UPDATE pvp_rematch_requests SET status='consumed', granted_battle_id=? WHERE id=? AND status='approved'")
        .bind(row.id, st.rematchRequestId).run();
    }
    rewards = { rematch: true };
  } else if (row.mode === 'pvp' && winnerChildId) {
    await db.prepare('UPDATE children SET balls = balls + 1 WHERE id=?').bind(winnerChildId).run();
    await syncTouch(db, winnerChildId, 'children', 'id=?', [winnerChildId]);
    await settleBallOverflow(db, winnerChildId, today); // v11：球满 99 自动向上兑换
    rewards = { ballsAwarded: 1, champion: true };
  }
  return rewards;
}

async function apiBattleGymStart(db, req, session) {
  return withChild(db, req, session, async (child, body) => {
    const cfg = GYM_STAGES.find((g) => g.stage === Number(body.stage));
    if (!cfg) return json({ ok: false, error: '没有这一关' }, 400);
    const today = shDateStr();
    const ws = weekStartMon(today);
    if (!GATES_OPEN) {
      if (!isWeekendDate(today)) return json({ ok: false, error: '道馆只在周六、周日开放哦' }, 400);
      const cnt = await weekApprovedCount(db, child.id, ws);
      if (cnt < 4) return json({ ok: false, error: `本周已打卡 ${cnt} 天，满 4 天才能挑战道馆` }, 400);
    }
    const level = levelFromXp(child.total_xp);
    if (!GATES_OPEN && level < cfg.needLevel) return json({ ok: false, error: `这一关要 Lv.${cfg.needLevel} 才能挑战，你现在 Lv.${level}，先升级吧` }, 400);
    const cleared = await clearedStages(db, child.id);
    if (!GATES_OPEN && cfg.stage > 1 && !cleared.has(cfg.stage - 1)) {
      return json({ ok: false, error: '先通关前一关，这一关还没解锁哦' }, 400);
    }
    const benchNo = body.benchNo ? Number(body.benchNo) : null;
    if (benchNo && !(await ownsSpecies(db, child.id, benchNo))) {
      return json({ ok: false, error: '这只收藏宠还没有收集到哦' }, 400);
    }
    await attachEvoForm(db, child, today); // v11：主宠须按实际形态（用石后的终极／伊布分支）出战；任务 126 提前——leadNo 校验须准确主宠号（不能只按等级推）
    await attachExMain(db, child, benchNo); // 任务 110：备战前主宠挂线信息
    // 任务 126：先发宠物 leadNo（可选）——须是随身宠物（主宠或携带列表），否则明确报错；
    // 校验须在作废旧对局之前，失败请求不产生副作用。
    const carriedEntries = await carriedCollection(db, child.id);
    const form0 = formInfo(child);
    const mainNo0 = form0.branchNo || (form0.img ? LINES[child.line].forms[form0.formIdx - 1].no : null);
    const leadNo = body.leadNo ? Number(body.leadNo) : null;
    if (leadNo) {
      const carriedNos = new Set([mainNo0, ...carriedEntries.map((c) => c.no)]);
      if (!carriedNos.has(leadNo)) {
        return json({ ok: false, code: 'LEAD_NOT_CARRIED', error: '先发宠物必须是随身携带的伙伴哦' }, 400);
      }
    }
    // 同一孩子同时只留一场进行中的闯关：旧的未完成闯关自动作废
    const doomed = (await db.prepare("SELECT id FROM battles WHERE mode='gym' AND child_a=? AND status='active'").bind(child.id).all()).results || [];
    let version;
    await db.prepare("UPDATE battles SET status='abandoned', finished_epoch=? WHERE mode='gym' AND child_a=? AND status='active'")
      .bind(Math.floor(Date.now() / 1000), child.id).run();
    if (doomed.length) {
      version = await bumpChildVersion(db, child.id);
      for (const d of doomed) await touchRow(db, 'battles', 'id=?', [d.id], version);
    }
    const sp = SPECIES[cfg.bossNo];
    let sideA, sideB, st;
    try {
      // 等比换算：战斗内等级一律用有效等级（玩家 floor(App×2.25)、馆主 floor(bossLevel×本关系数)）。
      // 任务 126：开局带全部随身宠物（主宠＋携带，最多 5 只），leadNo 指定先发。
      sideA = buildPlayerSide(child, effPlayerLevel(level), benchNo, { carried: carriedEntries, leadNo });
      sideB = {
        childId: null, childName: `${cfg.gymName}馆主 · ${sp.name}`, battleLevel: effBossLevel(cfg), activeIdx: 0,
        pets: [makePet({
          key: 'boss', name: sp.name, type: sp.type,
          defTypes: bossDefTypes(cfg.bossNo),
          no: cfg.bossNo, img: petImg(cfg.bossNo),
          level: effBossLevel(cfg), hpMult: cfg.hpMult ?? BOSS_HP_MULT,
          moves: cfg.bossMoves.map(([n, t, p]) => { const off = officialMove(n); return { name: n, type: t, damage_class: off ? off.damage_class : undefined, power: p }; }),
        })],
      };
      // 战斗视图显示的等级仍为 App 等级（避免孩子困惑）：pet.level 是有效等级（引擎用），appLevel 仅供展示。
      sideA.pets.forEach((p) => { p.appLevel = level; });
      sideB.pets[0].appLevel = cfg.bossLevel;
      const firstSide = 'A'; // 道馆改版：同时选招，无先攻、无首回合跳过（firstSide 仅保留字段兼容）
      // 天气（第三期简化版，D7）：开局按关卡配置生效（本批只定 S4＝晴天）、整场持续。
      st = createBattleState({ mode: 'gym', firstSide, sides: { A: sideA, B: sideB }, weather: cfg.weather || null });
      // 友好度战斗加成（D10）：开局读出挂到 st.gym（纯值，随 state 落库）。
      st.gym.friendship = await getChildMainFriendship(db, child, today);
      st.gym.endureUsed = false;
    } catch (e) {
      return json({ ok: false, error: 'PET_DATA_INVALID' }, 400); // 宠物/招式数据坏了：开战前拦住，不裸 500
    }
    const r = await db.prepare(
      'INSERT INTO battles(mode, week_start, stage, child_a, state, status, created_epoch) VALUES(?,?,?,?,?,?,?)'
    ).bind('gym', ws, cfg.stage, child.id, JSON.stringify(st), 'active', Math.floor(Date.now() / 1000)).run();
    if (r.meta && r.meta.changes > 0) {
      if (version === undefined) version = await bumpChildVersion(db, child.id);
      await touchRow(db, 'battles', 'id=?', [Number(r.meta.last_row_id)], version);
    }
    const row = await db.prepare('SELECT * FROM battles WHERE id=?').bind(r.meta.last_row_id).first();
    return json({ ok: true, battle: battleView(row, st) });
  });
}

/* 孩子密码校验（PvP 加入用）：与孩子登录同一套失败计数/锁定口径，防猜密码代打 */
async function verifyChildPwd(db, child, password) {
  if (!child.pwd_hash) return { ok: false, status: 403, error: '对方还没设置小密码，请爸爸妈妈先在设置里给他设置哦' };
  const now = Math.floor(Date.now() / 1000);
  if ((child.pwd_locked_until || 0) > now) {
    return { ok: false, status: 429, error: '对方密码被锁住啦，5 分钟后再试' };
  }
  const h = await sha256hex(String(password || ''));
  if (h !== child.pwd_hash) {
    // 原子自增再回读：旧快照回写在并发连点时计数不涨，失败锁定形同虚设
    await db.prepare('UPDATE children SET pwd_fail_count = pwd_fail_count + 1 WHERE id=?').bind(child.id).run();
    const fresh = await db.prepare('SELECT pwd_fail_count FROM children WHERE id=?').bind(child.id).first();
    const fails = fresh ? (fresh.pwd_fail_count || 0) : (child.pwd_fail_count || 0) + 1;
    if (fails >= PIN_LOCK_MAX) {
      await db.prepare('UPDATE children SET pwd_fail_count=0, pwd_locked_until=? WHERE id=?')
        .bind(now + PIN_LOCK_SECS, child.id).run();
      return { ok: false, status: 429, error: '密码错太多次，被锁住啦，5 分钟后再试' };
    }
    return { ok: false, status: 401, error: `密码不对，还能试 ${PIN_LOCK_MAX - fails} 次` };
  }
  await db.prepare('UPDATE children SET pwd_fail_count=0, pwd_locked_until=0 WHERE id=?').bind(child.id).run();
  return { ok: true };
}

async function pvpWeekGate(db, childId, today, ws) {
  if (GATES_OPEN) return { ok: true, weekApproved: await weekApprovedCount(db, childId, ws) };
  if (!isWeekendDate(today)) return { ok: false, error: '兄弟对战只在周末开放哦' };
  const cnt = await weekApprovedCount(db, childId, ws);
  if (cnt < 4) return { ok: false, error: `本周打卡还没满 4 天（现在 ${cnt} 天），达标后才能对战`, weekApproved: cnt };
  return { ok: true, weekApproved: cnt };
}

/* 防守题：从防守方答过的问题里抽一道（本周优先，其次近 30 天），没有记录则不触发防守答题 */
/* 防守题抽脑筋急转弯的概率（2026-11-09 用户定：谜语只出现在兄弟对战中） */
const DEFENSE_RIDDLE_RATE = 1 / 3;

async function pickDefenseQuestion(db, defenderChildId, today, ws, rng = Math.random) {
  const since30 = addDays(today, -29);
  /* 防守题加门（2026-10-24 超纲事件后补齐）：按防守方进度过滤其作答历史，
   * 历史里已有的超纲题不再复现；非数学题不受门约束，与每日问答口径一致 */
  const defender = await getChild(db, defenderChildId);
  const [mathGate, chineseGate, englishGate] = defender
    ? await Promise.all([loadMathGate(db, defender), loadChineseGate(db, defender), loadEnglishGate(db, defender)])
    : [null, null, null];
  const { results } = await db.prepare(
    `SELECT q.id, q.question, q.options_json, q.subject, q.kind, q.chapter, MAX(a.date_shanghai) AS last_date
     FROM quiz_attempts a JOIN quiz_questions q ON q.id = a.question_id
     WHERE a.child_id=? AND q.active=1 AND q.kind != 'oak' AND a.date_shanghai>=?
     GROUP BY q.id`
  ).bind(defenderChildId, since30).all();
  const pool = (results || []).filter((r) => mathGatePass(
    { kind: r.kind, subject: r.subject, chapter: r.chapter ?? null }, mathGate) && chineseGatePass(
    { kind: r.kind, subject: r.subject, chapter: r.chapter ?? null }, chineseGate) && englishGatePass(
    { kind: r.kind, subject: r.subject, chapter: r.chapter ?? null }, englishGate));
  /* 脑筋急转弯混合（2026-11-09 用户定：谜语只出现在兄弟对战中）：
   * 约 1/3 直接从题库抽一道 active 谜语（不依赖答过记录）；历史池为空时全用谜语兜底，
   * 仍要能触发防守答题；无谜语时返回 null，走即时结算兜底。谜语直接放行进度门。 */
  const pickRiddle = async () => {
    const { results } = await db.prepare(
      `SELECT id, question, options_json, subject, kind, chapter FROM quiz_questions WHERE kind='riddle' AND active=1`
    ).all();
    const rows = results || [];
    if (!rows.length) return null;
    const r = rows[Math.floor(rng() * rows.length) % rows.length];
    const options = safeJsonArr(r.options_json);
    if (!Array.isArray(options) || options.length < 2) return null;
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return { id: r.id, question: r.question, options: shuffled, subject: '' };
  };
  if (!pool.length) return pickRiddle();
  if (rng() < DEFENSE_RIDDLE_RATE) {
    const rq = await pickRiddle();
    if (rq) return rq;
  }
  /* 本周偏好（与旧 SQL 的 ORDER BY (MAX(date) >= ws) DESC, RANDOM() 同义）：先本周内随机，再全部随机 */
  const weekPool = pool.filter((r) => r.last_date >= ws);
  const cands = weekPool.length ? weekPool : pool;
  const r = cands[Math.floor(Math.random() * cands.length) % cands.length];
  const options = safeJsonArr(r.options_json);
  if (!Array.isArray(options) || options.length < 2) return null;
  // 选项打乱顺序（服务端按文本判对错，不受顺序影响）
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { id: r.id, question: r.question, options: shuffled, subject: r.subject || '' };
}

async function pvpCountedThisWeek(db, childId, ws) {
  const r = await db.prepare(
    "SELECT id FROM battles WHERE mode='pvp' AND week_start=? AND counted=1 AND (child_a=? OR child_b=?) LIMIT 1"
  ).bind(ws, childId, childId).first();
  return !!r;
}

async function otherChild(db, childId) {
  const all = await getChildren(db);
  return all.find((c) => c.id !== childId) || null;
}

async function apiBattlePvpCreate(db, req, session) {
  return withChild(db, req, session, async (me, body) => {
    const other = await otherChild(db, me.id);
    if (!other) return json({ ok: false, error: '找不到对战伙伴' }, 400);
    const today = shDateStr();
    const ws = weekStartMon(today);
    // 已有待加入/进行中的对战 → 直接返回（恢复）
    const existing = await db.prepare(
      "SELECT * FROM battles WHERE mode='pvp' AND week_start=? AND status IN ('waiting','active') AND (child_a=? OR child_b=?) ORDER BY id DESC LIMIT 1"
    ).bind(ws, me.id, me.id).first();
    if (existing) {
      const st = JSON.parse(existing.state || '{}');
      return json({ ok: true, resumed: true, battle: battleView(existing, st) });
    }
    // 对方已经建好本周待加入的局 → 不要再建第二局，否则两人互加对方的局会打成两场正式对战、重复计次发球
    const oppWaiting = await db.prepare(
      "SELECT * FROM battles WHERE mode='pvp' AND week_start=? AND status='waiting' AND child_a=? ORDER BY id DESC LIMIT 1"
    ).bind(ws, other.id).first();
    if (oppWaiting) {
      const st = JSON.parse(oppWaiting.state || '{}');
      return json({ ok: true, resumed: true, opponentWaiting: true, battle: battleView(oppWaiting, st) });
    }
    const g1 = await pvpWeekGate(db, me.id, today, ws);
    if (!g1.ok) return json({ ok: false, error: g1.error }, 400);
    const g2 = await pvpWeekGate(db, other.id, today, ws);
    if (!g2.ok) return json({ ok: false, error: `${other.name} ${g2.error}` }, 400);
    // 计次闸门：本周正式对战已打完时，只有家长批准待用的「再来一局」能再开一场（标记 st.rematch，结算不计次）
    let rematchGrant = null;
    if (!GATES_OPEN && (await pvpCountedThisWeek(db, me.id, ws) || await pvpCountedThisWeek(db, other.id, ws))) {
      const latest = await latestRematchRequest(db, ws);
      if (latest && latest.status === 'approved') rematchGrant = latest;
      else return json({ ok: false, error: '本周的正式对战已经打过啦，下周末再战！' }, 400);
    } else if (GATES_OPEN) {
      // 测试站门槛放行时也要挂上已批准的“再来一局”，否则再来一局会被当成普通正式局计次发球、批准单永不消费
      const latest = await latestRematchRequest(db, ws);
      if (latest && latest.status === 'approved') rematchGrant = latest;
    }
    const benchNo = body.benchNo ? Number(body.benchNo) : null;
    if (benchNo && !(await ownsSpecies(db, me.id, benchNo))) {
      return json({ ok: false, error: '这只收藏宠还没有收集到哦' }, 400);
    }
    await attachEvoForm(db, me, today); // v11：主宠须按实际形态出战
    await attachExMain(db, me, benchNo); // 任务 110：备战前主宠挂线信息
    let sideA, st;
    try {
      sideA = buildPlayerSide(me, levelFromXp(me.total_xp), benchNo);
      // 任务 73：备战展示快照——随身队里未入选出战的收藏宠（仅展示数据）；失败不阻塞建局。
      try { sideA.benchDisplay = await pvpBenchDisplayIds(db, me.id, benchNo ? [benchNo] : []); } catch { sideA.benchDisplay = []; }
      st = createBattleState({ mode: 'pvp', firstSide: 'A', sides: { A: sideA, B: null } });
      if (rematchGrant) { st.rematch = true; st.rematchRequestId = rematchGrant.id; }
    } catch (e) {
      return json({ ok: false, error: 'PET_DATA_INVALID' }, 400);
    }
    const r = await db.prepare(
      'INSERT INTO battles(mode, week_start, stage, child_a, state, status, created_epoch) VALUES(?,?,?,?,?,?,?)'
    ).bind('pvp', ws, null, me.id, JSON.stringify(st), 'waiting', Math.floor(Date.now() / 1000)).run();
    if (r.meta && r.meta.changes > 0) {
      await syncTouch(db, me.id, 'battles', 'id=?', [Number(r.meta.last_row_id)]);
    }
    const row = await db.prepare('SELECT * FROM battles WHERE id=?').bind(r.meta.last_row_id).first();
    return json({ ok: true, battle: battleView(row, st) });
  });
}

async function apiBattlePvpJoin(db, req, session) {
  const body = await readJsonBody(req);
  const got = await loadBattle(db, Number(body.battleId));
  if (!got || got.row.mode !== 'pvp') return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { row, st } = got;
  if (row.status !== 'waiting') return json({ ok: false, error: '这场对战已经开始或结束啦' }, 400);
  // 往周遗留的 waiting 局不能加入：计次会落在旧 week_start 上，本周还能再打一场
  if (row.week_start !== weekStartMon(shDateStr())) {
    await db.prepare("UPDATE battles SET status='abandoned' WHERE id=? AND status='waiting'").bind(row.id).run();
    await syncTouch(db, row.child_a, 'battles', 'id=?', [row.id]);
    return json({ ok: false, error: '这场对战是上周留下的，已经作废啦，重新建一场吧' }, 400);
  }
  const joinerId = Number(body.childId);
  const joiner = joinerId ? await getChild(db, joinerId) : null;
  if (!joiner) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (joiner.id === row.child_a) return json({ ok: false, error: '不能和自己对战哦' }, 400);
  const v = await verifyChildPwd(db, joiner, body.password);
  if (!v.ok) return json({ ok: false, error: v.error }, v.status);
  const today = shDateStr();
  const ws = weekStartMon(today);
  const g1 = await pvpWeekGate(db, row.child_a, today, ws);
  if (!g1.ok) return json({ ok: false, error: g1.error }, 400);
  const g2 = await pvpWeekGate(db, joiner.id, today, ws);
  if (!g2.ok) return json({ ok: false, error: g2.error }, 400);
  // 再来一局（st.rematch）由建局时的家长批准解锁，加入时不再被计次闸门挡；普通局维持原口径
  if (!GATES_OPEN && !st.rematch && (await pvpCountedThisWeek(db, row.child_a, ws) || await pvpCountedThisWeek(db, joiner.id, ws))) {
    return json({ ok: false, error: '本周的正式对战已经打过啦，下周末再战！' }, 400);
  }
  const benchNo = body.benchNo ? Number(body.benchNo) : null;
  if (benchNo && !(await ownsSpecies(db, joiner.id, benchNo))) {
    return json({ ok: false, error: '这只收藏宠还没有收集到哦' }, 400);
  }
  // 出战数取双方较少一方：一方没收藏宠 → 双方都只出主宠
  const flatLevel = Math.min(st.sides.A.battleLevel, levelFromXp(joiner.total_xp));
  await attachEvoForm(db, joiner, today); // v11：主宠须按实际形态出战
  await attachExMain(db, joiner, benchNo); // 任务 110：备战前主宠挂线信息
  let sideB;
  try {
    flattenSideLevel(st.sides.A, flatLevel);
    sideB = buildPlayerSide(joiner, flatLevel, benchNo);
    // B 方 HP 同走 PvP 专用口径（buildPlayerSide 为道馆/合作共用、不带倍率，这里补齐）
    for (const p of sideB.pets) { p.maxHp = pvpPetHp(p, flatLevel); p.hp = p.maxHp; }
  } catch (e) {
    return json({ ok: false, error: 'PET_DATA_INVALID' }, 400);
  }
  const teamSize = Math.min(st.sides.A.pets.length, sideB.pets.length);
  st.sides.A.pets = st.sides.A.pets.slice(0, teamSize);
  sideB.pets = sideB.pets.slice(0, teamSize);
  st.sides.B = sideB;
  // 任务 73：备战展示按加入后实际出战阵容重算——出战数取较少一方，被裁掉的出战宠回备战展示；
  // 等级/体力由 battleView 按 battleLevel 现算。失败不阻塞加入（A 沿用建局快照、B 置空）。
  try {
    st.sides.A.benchDisplay = await pvpBenchDisplayIds(db, row.child_a, st.sides.A.pets.map((p) => p.no));
    sideB.benchDisplay = await pvpBenchDisplayIds(db, joiner.id, sideB.pets.map((p) => p.no));
  } catch { st.sides.A.benchDisplay = st.sides.A.benchDisplay || []; sideB.benchDisplay = []; }
  st.firstSide = Math.random() < 0.5 ? 'A' : 'B';
  st.turn = st.firstSide;
  // 2a：B 方加入、对战正式开始时补触发双方威吓（建局时 B 为空，createBattleState 里的触发是空操作）。
  {
    const joinEvents = [];
    triggerSwitchIn(st, 'A', joinEvents);
    triggerSwitchIn(st, 'B', joinEvents);
    pushLog(st, joinEvents);
  }
  const token = randToken();
  row.child_b = joiner.id;
  row.status = 'active';
  row.join_token_hash = await sha256hex(token);
  // 先 CAS 保存状态成功，再落 child_b / join_token_hash 两列：
  // CAS 失败（状态已被别的请求改动）时不留半成品加入记录
  const savedJoin = await saveBattle(db, row, st, got.row.state);
  if (!savedJoin) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  await db.prepare('UPDATE battles SET child_b=?, status=?, join_token_hash=? WHERE id=?')
    .bind(row.child_b, row.status, row.join_token_hash, row.id).run();
  return json({ ok: true, joinToken: token, battle: battleView(row, st) });
}

/* ---------------- PvP 防守答题超时（用户定案 2026-10-22） ----------------
 * 120 秒；起算前提是「双方都已进入对战」且防守题已生成，缺一不计时：
 * 在场信号取自现有状态机——apiBattlePvpJoin 是唯一把对局置 active 的路径，
 * 加入方输 PIN 验证通过后才落 child_b 与 sides.B，且 pending 只能由
 * apiBattleMove 在 active 局里生成。故 row.status='active' + child_b 非空 +
 * sides.B 非空即「双方已进入」，不另造在场/心跳机制。
 * 超时 = 防守方放弃本次防御：按未触发防御的原始伤害结算，对战继续，
 * 不整场判负、不作废。存量 pending（借鉴包上线前生成、无 sinceEpoch）
 * 在相关请求首次触及时补记起算点并落盘，从那时起算 120 秒——既不误杀，
 * 也保证卡死老局在下一次有人打开后至多 120 秒必被推进。 */
const PVP_DEFENSE_TIMEOUT_SECS = 120;

function bothSidesEntered(row, st) {
  return row.status === 'active' && !!row.child_b && !!(st && st.sides && st.sides.A && st.sides.B);
}

/* 纯函数层推进（原地改 st，不落盘）：
 * 返回 null=无 pending/未到齐/未超时；{settled:false, backfilled:true}=刚为存量
 * pending 补记起算点；{settled:true, events}=已按放弃防御结算（含胜负判定）。 */
function stepDefenseTimeout(row, st, nowEpoch) {
  if (!row || row.mode !== 'pvp' || !st || !st.pending) return null;
  if (!bothSidesEntered(row, st)) return null; // 对方还没进入：保持等待，永不超时
  if (!st.pending.sinceEpoch) {
    st.pending.sinceEpoch = nowEpoch;
    return { settled: false, backfilled: true };
  }
  if (nowEpoch - st.pending.sinceEpoch < PVP_DEFENSE_TIMEOUT_SECS) return null;
  const p = st.pending;
  const staged = {
    attacker: p.attacker, moveName: p.moveName, moveType: p.moveType,
    petName: p.petName, targetName: p.targetName, dmg: p.dmg, mult: p.mult,
    critical: p.critical === true, mods: p.mods || [], drain: p.drain === true,
    // 一期 bug 修复：重建时漏了 ability，PvP 两段式防守路径会丢掉一期特性吸取回复（储水/蓄电）与二期升档（避雷针/电气引擎）。
    ability: p.ability || [],
  };
  const r = resolveStagedAttack(st, staged, { kind: null, skipped: true, correct: false, timedOut: true });
  delete st.pending;
  return { settled: true, events: r.events };
}

/* 接口层推进：state / move / defend 三个「相关请求」入口在鉴权后共用。
 * 结算或补记后 CAS 落盘（打赢了走 finalizeBattle 的发奖路径）；
 * 成功时同步 got.row.state 期望值，调用方可接着用新状态继续 CAS。
 * 返回 null=无事发生；{conflict:true}=状态已被别的请求推进，调用方回 409 或重读。 */
async function advanceDefenseTimeout(db, got, today) {
  const { row, st } = got;
  if (row.mode !== 'pvp' || row.status !== 'active' || !st || !st.pending) return null;
  const r = stepDefenseTimeout(row, st, Math.floor(Date.now() / 1000));
  if (!r) return null;
  if (r.settled && st.winner) {
    const fin = await finalizeBattle(db, row, st, today, got.row.state);
    if (fin && fin.conflict) return { conflict: true };
    got.row.state = JSON.stringify(st);
    return { settled: true, events: r.events, rewards: fin };
  }
  const saved = await saveBattle(db, row, st, got.row.state);
  if (!saved) return { conflict: true };
  got.row.state = JSON.stringify(st);
  return r.settled ? { settled: true, events: r.events } : { settled: false, backfilled: true };
}

/* 出招（统一入口）：gym 走同时选招（resolveGymRound，玩家一招与馆主 AI 一招同回合结算，
 * body 可带 swapToIdx 表示主动换宠）；PvP 严格按回合鉴权——A 方回合只认 A 的孩子会话，
 * B 方回合只认加入方本人会话，或无孩子会话时的加入凭证 joinToken；
 * 对手孩子（A 方）会话＋凭证一律拒绝（2026-10-24 凭证越权修复）。 */
async function apiBattleMove(db, req, session) {
  const body = await readJsonBody(req);
  const got = await loadBattle(db, Number(body.battleId));
  if (!got) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { row, st } = got;
  if (row.mode === 'coop') return json({ ok: false, error: '合作对战请在合作营地里操作哦' }, 400);
  if (row.status === 'waiting') return json({ ok: false, error: '对战还没开始，等对方加入哦' }, 400);
  if (row.status !== 'active') return json({ ok: false, error: '这场对战已经结束啦' }, 400);
  const today = shDateStr();
  const events = [];
  let itemUsed = null; // v11：本回合用药（道馆），状态存上后再扣库存
  if (row.mode === 'gym') {
    const fb = forbidIfOtherChild(session, row.child_a);
    if (fb) return fb;
    if (body.itemKey) {
      // 道馆用药（v11 §9.3）：先验库存与种类，再进回合结算
      const itemKey = String(body.itemKey);
      const eff = GYM_ITEM_EFFECTS[itemKey];
      if (!eff) return json({ ok: false, error: '这种道具不能在道馆里用哦' }, 400);
      if ((await getInventoryQty(db, row.child_a, itemKey)) < 1) {
        return json({ ok: false, error: `没有${ITEM_CATALOG[itemKey].name}啦` }, 400);
      }
      const r = resolveGymRound(st, { itemKey, targetIdx: body.targetIdx });
      if (r.error) {
        const msg = r.error === 'ITEM_CAP_REACHED' ? '这场战斗里这种药已经用满次数啦'
          : r.error === 'ITEM_NO_NEED' ? '体力已经满啦，不用浪费药哦'
          : r.error === 'ITEM_TARGET_INVALID' ? '这只伙伴现在不需要复活哦'
          : '现在不能用道具';
        return json({ ok: false, error: msg }, 400);
      }
      events.push(...r.events);
      itemUsed = r.itemUsed || { itemKey, targetIdx: body.targetIdx ?? null };
    } else {
      // 道馆改版：同时选招——玩家提交招式（或 swapToIdx 换宠），馆主同回合由 AI 选招一起结算
      const r = resolveGymRound(st, {
        moveName: body.moveName ? String(body.moveName) : null,
        swapToIdx: body.swapToIdx,
      });
      if (r.error) {
        const msg = r.error === 'MOVE_NOT_LEARNED' ? '这个招式还没学会哦'
          : r.error === 'SWAP_INVALID' ? '现在不能换这只宠哦'
          : r.error === 'MUST_CHOOSE_MOVE' ? '先选一个招式吧'
          : '现在不能出招';
        return json({ ok: false, error: msg }, 400);
      }
      events.push(...r.events);
    }
  } else {
    if (body.itemKey) return json({ ok: false, error: 'PvP 对战里不能用道具哦' }, 400); // v11 §9.3：PvP 服务端拒绝
    const side = st.turn;
    if (side === 'A') {
      if (!session || session.kind !== 'child' || session.child_id !== row.child_a) {
        return json({ ok: false, error: 'FORBIDDEN' }, 403);
      }
    } else {
      // B 方出招：加入方本人会话放行；无孩子会话时凭加入凭证放行（未登录同屏设备）；
      // 对手孩子（A 方）会话＋凭证一律 403（2026-10-24 凭证越权修复：已登录大宝账号的设备不得替小宝行动，旧同屏玩法随之失效）
      const isJoinerSession = session && session.kind === 'child' && session.child_id === row.child_b;
      if (!isJoinerSession) {
        if (session && session.kind === 'child') return json({ ok: false, error: 'FORBIDDEN' }, 403);
        const tok = body.joinToken ? await sha256hex(String(body.joinToken)) : null;
        if (!tok || tok !== row.join_token_hash) return json({ ok: false, error: 'FORBIDDEN' }, 403);
      }
    }
    if (st.pending) {
      // 防守挂起中：超时已到 → 先按放弃防御结算推进（卡死老局靠任一方的下一次请求解锁），
      // 本请求不再执行新出招，回合已随结算推进，前端刷新后由下一方行动；未超时才回等待文案
      const adv = await advanceDefenseTimeout(db, got, today);
      if (adv && adv.conflict) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
      if (adv && adv.settled) {
        return json({ ok: true, events: adv.events, rewards: adv.rewards || null, defenseTimeout: true, battle: battleView(row, st) });
      }
      return json({ ok: false, error: '对方正在答题防守，等他答完再继续哦' }, 400);
    }
    const moveName = body.moveName ? String(body.moveName) : null;
    // 防守答题：防守方有答过的问题时，出招先挂起，等防守方答题再结算；
    // 先攻首回合跳过、没选招式、或防守方毫无答题记录 → 沿用即时结算
    const defenderChildId = side === 'A' ? row.child_b : row.child_a;
    const question = (canSideAttack(st, side) && moveName)
      ? await pickDefenseQuestion(db, defenderChildId, today, weekStartMon(today))
      : null;
    if (!question) {
      // 即时结算兜底（防守方无答题记录等）：仍是 PvP 出招，暴击走 PvP 口径
      const r = applyBattleAction(st, side, moveName, Math.random, { critRate: PVP_CRIT_RATE, critMult: PVP_CRIT_MULT });
      if (r.error) return json({ ok: false, error: r.error === 'MOVE_NOT_LEARNED' ? '这个招式还没学会哦' : '现在不能这样出招' }, 400);
      events.push(...r.events);
    } else {
      const staged = stagePvpAttack(st, side, moveName);
      if (staged.error) return json({ ok: false, error: staged.error === 'MOVE_NOT_LEARNED' ? '这个招式还没学会哦' : '现在不能这样出招' }, 400);
      if (staged.blocked || staged.effectKind || staged.smokeMiss) {
        // 睡眠/麻痹无法行动、变化招式/烟幕落空没有伤害可防，即时结算并落到下方统一收尾
        const r = staged.blocked
          ? applyStagedBlocked(st, { ...staged, attacker: side })
          : staged.effectKind
            ? applyStagedEffect(st, { ...staged, attacker: side })
            : applyStagedMiss(st, { ...staged, attacker: side });
        events.push(...r.events);
      } else {
      st.pending = {
        attacker: side, moveName: staged.moveName, moveType: staged.moveType,
        petName: staged.petName, targetName: staged.targetName,
        dmg: staged.dmg, mult: staged.mult, critical: staged.critical === true, mods: staged.mods || [],
        drain: staged.drain === true, ability: staged.ability || [],
        sinceEpoch: Math.floor(Date.now() / 1000), // 防守题生成时刻：120 秒超时从此刻起算（双方已在本局内）
        question: { id: question.id, question: question.question, options: question.options, subject: question.subject },
      };
      pushLog(st, [{ type: 'attack_pending', side, text: `${staged.petName} 准备用「${staged.moveName}」攻击 ${staged.targetName}！防守方答对一道题就能防御！` }]);
      const savedStage = await saveBattle(db, row, st, got.row.state);
      if (!savedStage) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
      return json({ ok: true, events: [], staged: true, battle: battleView(row, st) });
      }
    }
  }
  let rewards = null;
  if (st.winner) {
    rewards = await finalizeBattle(db, row, st, today, got.row.state);
    if (rewards && rewards.conflict) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  } else {
    const savedMove = await saveBattle(db, row, st, got.row.state);
    if (!savedMove) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  }
  if (itemUsed) {
    // 状态已存上才扣库存（saveBattle/finalizeBattle 成功后才到这里）；扣不动只记日志，不回滚已存的回合
    const took = await takeItem(db, row.child_a, itemUsed.itemKey, 1, 'gym-use', 'battle', String(row.id), today);
    if (!took) {
      console.error('gym use-item deduct failed', { battleId: row.id, itemKey: itemUsed.itemKey });
    } else {
      await db.prepare('INSERT INTO item_uses(child_id, item_key, use_kind, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
        .bind(row.child_a, itemUsed.itemKey, 'gym', 'battle', String(row.id), Math.floor(Date.now() / 1000), today).run();
    }
  }
  const view = battleView(row, st);
  if (row.mode === 'gym') view.gymItems = await gymItemsView(db, row.child_a, st);
  return json({ ok: true, events, rewards, itemUsed, battle: view });
}

/* PvP 防守答题提交：判题→随机防御→结算挂起的攻击 */
async function apiBattleDefend(db, req, session) {
  const body = await readJsonBody(req);
  const got = await loadBattle(db, Number(body.battleId));
  if (!got) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { row, st } = got;
  if (row.mode !== 'pvp') return json({ ok: false, error: '道馆战没有防守答题' }, 400);
  if (row.status !== 'active') return json({ ok: false, error: '这场对战已经结束啦' }, 400);
  const pending = st.pending;
  if (!pending) return json({ ok: false, error: '现在不用防守哦' }, 400);
  const defenderSide = pending.attacker === 'A' ? 'B' : 'A';
  const defenderChildId = defenderSide === 'A' ? row.child_a : row.child_b;
  // 防守鉴权：防守方本人会话；防守方为 B 且无孩子会话时凭加入凭证放行（未登录同屏设备）；
  // 对手孩子会话＋凭证一律拒绝（2026-10-24 凭证越权修复）
  let allowed = session && session.kind === 'child' && session.child_id === defenderChildId;
  if (!allowed && defenderSide === 'B' && !(session && session.kind === 'child') && body.joinToken) {
    allowed = (await sha256hex(String(body.joinToken))) === row.join_token_hash;
  }
  if (!allowed) return json({ ok: false, error: 'FORBIDDEN' }, 403);
  const today = shDateStr();
  // 超时已到的防守提交不再判题：先按放弃防御结算（120 秒口径，用户定案）
  const adv = await advanceDefenseTimeout(db, got, today);
  if (adv && adv.conflict) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  if (adv && adv.settled) {
    return json({
      ok: true, events: adv.events, rewards: adv.rewards || null,
      defense: { correct: false, kind: null, label: null, skipped: true, timedOut: true, explain: '' },
      defenseTimeout: true,
      battle: battleView(row, st),
    });
  }
  // 判题：按选项文本比对（出招时已打乱顺序，位置不作数）
  let correct = false;
  let explain = '';
  const answerText = body.answerText === null || body.answerText === undefined ? null : String(body.answerText);
  const qrow = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(pending.question.id).first();
  if (qrow && answerText !== null) {
    const q = normalizeQuizRow(qrow);
    explain = q.explain || '';
    correct = answerText === q.options[q.answer_idx];
  }
  let defense = { kind: null, skipped: answerText === null, correct: false };
  if (correct) {
    const dk = pickDefenseKind();
    defense = { kind: dk.kind, label: dk.label, correct: true };
  }
  const staged = {
    attacker: pending.attacker, moveName: pending.moveName, moveType: pending.moveType,
    petName: pending.petName, targetName: pending.targetName, dmg: pending.dmg, mult: pending.mult, critical: pending.critical === true, mods: pending.mods || [],
    drain: pending.drain === true,
    // 一期 bug 修复：重建时漏了 ability，PvP 两段式防守路径会丢掉一期特性吸取回复（储水/蓄电）与二期升档（避雷针/电气引擎）。
    ability: pending.ability || [],
  };
  const r = resolveStagedAttack(st, staged, defense);
  delete st.pending;
  let rewards = null;
  if (st.winner) {
    rewards = await finalizeBattle(db, row, st, today, got.row.state);
    if (rewards && rewards.conflict) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  } else {
    const saved = await saveBattle(db, row, st, got.row.state);
    if (!saved) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  }
  return json({
    ok: true, events: r.events, rewards,
    defense: { correct, kind: defense.kind || null, label: defense.label || null, skipped: !!defense.skipped, explain },
    battle: battleView(row, st),
  });
}

async function apiBattleState(db, req, session) {
  const body = await readJsonBody(req);
  const got = await loadBattle(db, Number(body.battleId));
  if (!got) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { row, st } = got;
  if (row.mode === 'coop') return json({ ok: false, error: '合作对战请在合作营地里操作哦' }, 400);
  let allowed = session && session.kind === 'parent';
  if (!allowed && session && session.kind === 'child') {
    allowed = session.child_id === row.child_a || session.child_id === row.child_b;
  }
  if (!allowed && body.joinToken) {
    allowed = (await sha256hex(String(body.joinToken))) === row.join_token_hash;
  }
  if (!allowed) return json({ ok: false, error: 'FORBIDDEN' }, 403);
  // 读接口同样是「相关请求」：顺带推进已超时的防守（卡死老局靠任一方打开/轮询页面解锁）
  const adv = await advanceDefenseTimeout(db, got, shDateStr());
  if (adv && adv.conflict) {
    const fresh = await loadBattle(db, row.id); // 别人刚推进过：按最新状态展示，不打断轮询
    if (fresh) {
      const fb = battleView(fresh.row, fresh.st);
      if (fresh.row.mode === 'gym') fb.gymItems = await gymItemsView(db, fresh.row.child_a, fresh.st);
      return json({ ok: true, battle: fb });
    }
  }
  const view = battleView(row, st);
  if (row.mode === 'gym') view.gymItems = await gymItemsView(db, row.child_a, st);
  const out = { ok: true, battle: view };
  if (adv && adv.settled) {
    out.defenseTimeout = true;
    out.events = adv.events;
    if (adv.rewards) out.rewards = adv.rewards;
  }
  return json(out);
}

async function apiBattleAbandon(db, req, session) {
  const body = await readJsonBody(req);
  const got = await loadBattle(db, Number(body.battleId));
  if (!got) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { row, st } = got;
  if (row.mode === 'coop') return json({ ok: false, error: '合作对战请在合作营地里操作哦' }, 400);
  if (row.status !== 'waiting' && row.status !== 'active') {
    return json({ ok: false, error: '这场对战已经结束啦' }, 400);
  }
  let allowed = session && session.kind === 'parent';
  if (!allowed && session && session.kind === 'child') {
    allowed = session.child_id === row.child_a || session.child_id === row.child_b;
  }
  if (!allowed && body.joinToken) {
    allowed = (await sha256hex(String(body.joinToken))) === row.join_token_hash;
  }
  if (!allowed) return json({ ok: false, error: 'FORBIDDEN' }, 403);
  row.status = 'abandoned';
  row.finished_epoch = Math.floor(Date.now() / 1000);
  st.abandoned = true; // 改动 state 本身：并发中的出招请求 CAS 必然失败，不会把已弃赛的局写回 active
  const savedAbandon = await saveBattle(db, row, st, got.row.state); // counted 保持 0：弃赛不计次、不发奖
  if (!savedAbandon) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  return json({ ok: true, battle: battleView(row, st) });
}

/* ---------------- PvP 再来一局（用户 2026-10-24）：孩子申请 → 家长审核 → 批准解锁一场额外对战 ----------------
 * 口径：申请/批准都按周（week_start）隔离，跨周自动失效；同一周至多一张待审核或待用批准，
 * 不叠加囤积；批准只解除「每周 1 场」的计次限制，周末与双方本周打卡 ≥4 天等入场条件不变。
 * 再来一局的胜负口径未定案，v1 保守实现：不计次、不发冠军球、不改已决出的周冠军（见 finalizeBattle）。 */
async function latestRematchRequest(db, ws) {
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

async function apiBattlePvpRematchRequest(db, req, session) {
  return withChild(db, req, session, async (me, body) => {
    const other = await otherChild(db, me.id);
    const today = shDateStr();
    const ws = weekStartMon(today);
    const active = await db.prepare(
      "SELECT id FROM battles WHERE mode='pvp' AND week_start=? AND status IN ('waiting','active') AND (child_a=? OR child_b=?) LIMIT 1"
    ).bind(ws, me.id, me.id).first();
    if (active) return json({ ok: false, error: '还有一场对战在进行中，先打完它再申请吧' }, 400);
    const counted = (await pvpCountedThisWeek(db, me.id, ws)) || (other && await pvpCountedThisWeek(db, other.id, ws));
    if (!counted) return json({ ok: false, error: '本周的正式对战还没打完呢，打完才能申请再来一局' }, 400);
    const latest = await latestRematchRequest(db, ws);
    if (latest && latest.status === 'pending') return json({ ok: false, error: '已经申请过啦，正在等家长审核' }, 400);
    if (latest && latest.status === 'approved') return json({ ok: false, error: '家长已经批准啦，快去再打一场吧！' }, 400);
    if (latest && latest.status === 'rejected') return json({ ok: false, error: '家长这次没有批准再来一局，本周就到这里啦' }, 400);
    if (latest && latest.status === 'consumed') return json({ ok: false, error: '本周的再来一局已经用过啦' }, 400);
    const r = await db.prepare(
      'INSERT INTO pvp_rematch_requests(week_start, requester_child_id, status, created_epoch) VALUES(?,?,?,?)'
    ).bind(ws, me.id, 'pending', Math.floor(Date.now() / 1000)).run();
    const row = await db.prepare('SELECT * FROM pvp_rematch_requests WHERE id=?').bind(r.meta.last_row_id).first();
    return json({ ok: true, rematch: rematchView(row, (id) => (id === me.id ? me.name : (other && id === other.id ? other.name : null))) });
  });
}

async function apiParentPvpRematchList(db) {
  const ws = weekStartMon(shDateStr());
  const kids = await getChildren(db);
  const nameOf = (id) => { const k = kids.find((c) => c.id === id); return k ? k.name : null; };
  const r = await latestRematchRequest(db, ws);
  return json({ ok: true, weekStart: ws, rematch: rematchView(r, nameOf), requestId: r ? r.id : null });
}

async function apiParentPvpRematchDecide(db, req) {
  const body = await readJsonBody(req);
  const id = Number(body.id);
  const row = id ? await db.prepare('SELECT * FROM pvp_rematch_requests WHERE id=?').bind(id).first() : null;
  if (!row) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (row.status !== 'pending') return json({ ok: false, error: '这条申请已经处理过啦' }, 409);
  const ws = weekStartMon(shDateStr());
  if (row.week_start !== ws) return json({ ok: false, error: '这条申请是上周的，已经自动失效啦' }, 400);
  if (body.approve) {
    // 批准前再查一遍不变式：同一周不能同时存在两张待用批准
    const otherApproved = await db.prepare(
      "SELECT id FROM pvp_rematch_requests WHERE week_start=? AND status='approved' AND id<>? LIMIT 1"
    ).bind(ws, id).first();
    if (otherApproved) return json({ ok: false, error: '本周已经有一场批准待用的再来一局啦' }, 409);
  }
  await db.prepare('UPDATE pvp_rematch_requests SET status=?, decided_epoch=? WHERE id=? AND status=?')
    .bind(body.approve ? 'approved' : 'rejected', Math.floor(Date.now() / 1000), id, 'pending').run();
  const fresh = await db.prepare('SELECT * FROM pvp_rematch_requests WHERE id=?').bind(id).first();
  const kids = await getChildren(db);
  const nameOf = (cid) => { const k = kids.find((c) => c.id === cid); return k ? k.name : null; };
  return json({ ok: true, rematch: rematchView(fresh, nameOf) });
}

/* -------- 打卡历史奖励（迁移 0011/0012，用户 2026-10-24 定案；2026-10-24 通用发球卡取消后发球只走此口） --------
 * 家长在历史页对已通过记录点奖励：一次固定 1 颗普通精灵球，不批量、不发超级球。
 * 发球只动 children.balls，不发经验、不发碎片、不碰掉落与遭遇口径；
 * 每次发放必写 ball_grants 审计行（孩子/球种/数量/时间/关联打卡），家长面板可查。 */
async function apiParentGrantBall(db, req) {
  const body = await readJsonBody(req);
  const child = await getChild(db, Number(body.childId));
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  // 数量与球种由服务端固定，不接受客户端传入（防批量改数）
  // 发球只走历史奖励：无 checkinId 的通用发放已取消，一律拒绝
  const checkinId = body.checkinId != null && body.checkinId !== '' ? Number(body.checkinId) : null;
  if (checkinId == null) return json({ ok: false, error: 'CHECKIN_REQUIRED' }, 400);
  if (!Number.isInteger(checkinId)) return json({ ok: false, error: 'BAD_CHECKIN' }, 400);
  const ck = await db.prepare('SELECT * FROM checkins WHERE id=?').bind(checkinId).first();
  if (!ck) return json({ ok: false, error: 'CHECKIN_NOT_FOUND' }, 404);
  if (ck.child_id !== child.id) return json({ ok: false, error: 'CHECKIN_CHILD_MISMATCH' }, 400);
  if (ck.status !== 'approved') return json({ ok: false, error: 'CHECKIN_NOT_APPROVED' }, 400);
  const dup = await db.prepare('SELECT id FROM ball_grants WHERE checkin_id=?').bind(checkinId).first();
  if (dup) return json({ ok: false, error: 'ALREADY_REWARDED' }, 409);
  const nowEpoch = Math.floor(Date.now() / 1000);
  // 发球与审计同批执行：任一失败都不落账，杜绝无痕改数或有球无记录
  const stmts = [
    db.prepare('UPDATE children SET balls = balls + 1 WHERE id=?').bind(child.id),
    db.prepare(
      'INSERT INTO ball_grants(child_id, kind, qty, checkin_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?)'
    ).bind(child.id, 'normal', 1, checkinId, nowEpoch, shDateStr()),
  ];
  let grantId = null;
  try {
    const res = await db.batch(stmts);
    const ins = Array.isArray(res) ? res[1] : null;
    grantId = ins && ins.meta ? Number(ins.meta.last_row_id) : null;
  } catch (e) {
    // 并发重复奖励：唯一索引兜底，复查后回 409（球数未变，因同批回滚）
    if (checkinId != null) {
      const dup = await db.prepare('SELECT id FROM ball_grants WHERE checkin_id=?').bind(checkinId).first();
      if (dup) return json({ ok: false, error: 'ALREADY_REWARDED' }, 409);
    }
    throw e;
  }
  if (grantId == null) {
    // 批量返回不带 meta 的运行环境：按（孩子＋题组/时间）回查审计行 id（仅作回显）
    const row = checkinId != null
      ? await db.prepare('SELECT id FROM ball_grants WHERE checkin_id=?').bind(checkinId).first()
      : await db.prepare('SELECT id FROM ball_grants WHERE child_id=? AND created_epoch=? ORDER BY id DESC LIMIT 1').bind(child.id, nowEpoch).first();
    grantId = row ? row.id : null;
  }
  {
    const v = await bumpChildVersion(db, child.id);
    await touchRow(db, 'children', 'id=?', [child.id], v);
    if (grantId) await touchRow(db, 'ball_grants', 'id=?', [grantId], v);
  }
  const fresh = await getChild(db, child.id);
  return json({
    ok: true,
    grant: { id: grantId, childId: child.id, childName: child.name, kind: 'normal', qty: 1, checkinId, date: shDateStr() },
    balls: fresh ? (fresh.balls ?? 0) : 0, ballsSuper: fresh ? (fresh.balls_super ?? 0) : 0,
    ballsHyper: fresh ? (fresh.balls_hyper ?? 0) : 0, ballsMaster: fresh ? (fresh.balls_master ?? 0) : 0,
  });
}

/* -------- 打卡历史奖励下拉菜单（2026-11-03 用户定：每条已通过记录限奖 1 次，奖品任选其一） --------
 * 新口 POST /api/parent/history/grant {childId, checkinId, kind}，kind 白名单：
 *   ball（普通精灵球×1，走原发球路径＋审计行）、xp（经验+20）、
 *   medicine:potion（伤药）/ medicine:super-potion（好伤药）/ medicine:berry-juice（树果汁）/ medicine:water（美味之水）。
 * 限奖 1 次口径（不分奖品）：ball_grants.checkin_id（旧发球记录）或 item_ledger(ref_type='history_reward', ref_id=checkinId)
 * 任一存在即 409 ALREADY_REWARDED。所有路径先以 INSERT...SELECT WHERE NOT EXISTS 原子占位
 * （不新增迁移；item_ledger 无 ref 唯一约束，占位失败即已奖），占位行即流水行；球路径占位后发球，
 * 发球批内唯一索引再兜底球对球的并发。经验随后走 grantXp，道具随后只写库存 upsert
 * （不再经 addItem，避免流水重复）。
 * 占位成功后落账失败的窗口极小（同库同请求内），失败时返回 500、记录将显示已奖励，家长需告知助理核查；
 * 旧 /api/parent/balls/grant 原样保留。 */
const HISTORY_REWARD_KINDS = {
  ball: { name: '普通球', qty: 1 },
  xp: { name: '经验+20', qty: 20 },
  'medicine:potion': { name: '伤药', qty: 1 },
  'medicine:super-potion': { name: '好伤药', qty: 1 },
  'medicine:berry-juice': { name: '树果汁', qty: 1 },
  'medicine:water': { name: '美味之水', qty: 1 },
};
async function apiParentHistoryGrant(db, req) {
  const body = await readJsonBody(req);
  const child = await getChild(db, Number(body.childId));
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const kind = body.kind;
  if (!HISTORY_REWARD_KINDS[kind]) return json({ ok: false, error: 'BAD_REWARD_KIND' }, 400);
  const checkinId = body.checkinId != null && body.checkinId !== '' ? Number(body.checkinId) : null;
  if (checkinId == null) return json({ ok: false, error: 'CHECKIN_REQUIRED' }, 400);
  if (!Number.isInteger(checkinId)) return json({ ok: false, error: 'BAD_CHECKIN' }, 400);
  const ck = await db.prepare('SELECT * FROM checkins WHERE id=?').bind(checkinId).first();
  if (!ck) return json({ ok: false, error: 'CHECKIN_NOT_FOUND' }, 404);
  if (ck.child_id !== child.id) return json({ ok: false, error: 'CHECKIN_CHILD_MISMATCH' }, 400);
  if (ck.status !== 'approved') return json({ ok: false, error: 'CHECKIN_NOT_APPROVED' }, 400);
  const today = shDateStr();
  const nowEpoch = Math.floor(Date.now() / 1000);
  if (kind === 'ball') {
    // 先占位再发球：占位失败即已奖（覆盖先奖了经验/道具的情况）；发球批内唯一索引兜底球对球的并发
    const claim = await db.prepare(`INSERT INTO item_ledger(child_id, item_key, delta, reason, ref_type, ref_id, created_epoch, date_shanghai)
      SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM ball_grants WHERE checkin_id=?)
      AND NOT EXISTS (SELECT 1 FROM item_ledger WHERE ref_type='history_reward' AND ref_id=?)`)
      .bind(child.id, 'ball:normal', 1, 'history_reward', 'history_reward', checkinId, nowEpoch, today, checkinId, checkinId).run();
    if (!claim.meta || !claim.meta.changes) return json({ ok: false, error: 'ALREADY_REWARDED' }, 409);
    const stmts = [
      db.prepare('UPDATE children SET balls = balls + 1 WHERE id=?').bind(child.id),
      db.prepare('INSERT INTO ball_grants(child_id, kind, qty, checkin_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?)').bind(child.id, 'normal', 1, checkinId, nowEpoch, today),
    ];
    let grantId = null;
    try {
      const res = await db.batch(stmts);
      const ins = Array.isArray(res) ? res[1] : null;
      grantId = ins && ins.meta ? Number(ins.meta.last_row_id) : null;
    } catch (e) {
      const dup = await db.prepare('SELECT id FROM ball_grants WHERE checkin_id=?').bind(checkinId).first();
      if (dup) return json({ ok: false, error: 'ALREADY_REWARDED' }, 409);
      throw e;
    }
    if (grantId == null) {
      const row = await db.prepare('SELECT id FROM ball_grants WHERE checkin_id=?').bind(checkinId).first();
      grantId = row ? row.id : null;
    }
    const v = await bumpChildVersion(db, child.id);
    await touchRow(db, 'children', 'id=?', [child.id], v);
    if (grantId) await touchRow(db, 'ball_grants', 'id=?', [grantId], v);
    const fresh = await getChild(db, child.id);
    return json({ ok: true, grant: { kind, name: '普通球', qty: 1, checkinId }, balls: fresh ? (fresh.balls ?? 0) : 0, ballsSuper: fresh ? (fresh.balls_super ?? 0) : 0, ballsHyper: fresh ? (fresh.balls_hyper ?? 0) : 0, ballsMaster: fresh ? (fresh.balls_master ?? 0) : 0 });
  }
  const itemKey = kind === 'xp' ? 'xp:20' : kind;
  const delta = kind === 'xp' ? 20 : 1;
  const claim = await db.prepare(`INSERT INTO item_ledger(child_id, item_key, delta, reason, ref_type, ref_id, created_epoch, date_shanghai)
    SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM ball_grants WHERE checkin_id=?)
    AND NOT EXISTS (SELECT 1 FROM item_ledger WHERE ref_type='history_reward' AND ref_id=?)`)
    .bind(child.id, itemKey, delta, 'history_reward', 'history_reward', checkinId, nowEpoch, today, checkinId, checkinId).run();
  if (!claim.meta || !claim.meta.changes) return json({ ok: false, error: 'ALREADY_REWARDED' }, 409);
  if (kind === 'xp') {
    const xpInfo = await grantXp(db, child, 20, today);
    return json({ ok: true, grant: { kind, name: '经验+20', qty: 20, checkinId }, totalXp: xpInfo.totalXp, newLevel: xpInfo.newLevel });
  }
  await db.prepare(`INSERT INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(?,?,?,?)
    ON CONFLICT(child_id, item_key) DO UPDATE SET qty=qty+excluded.qty, updated_epoch=excluded.updated_epoch`)
    .bind(child.id, kind, 1, nowEpoch).run();
  const v = await bumpChildVersion(db, child.id);
  await touchRow(db, 'children', 'id=?', [child.id], v);
  return json({ ok: true, grant: { kind, name: HISTORY_REWARD_KINDS[kind].name, qty: 1, checkinId } });
}

async function apiBattlePvpStatus(db, req, session) {
  return withChild(db, req, session, async (me, body) => {
    const other = await otherChild(db, me.id);
    const today = shDateStr();
    const ws = weekStartMon(today);
    const info = async (c) => {
      if (!c) return null;
      const [weekApproved, counted] = await Promise.all([
        weekApprovedCount(db, c.id, ws),
        pvpCountedThisWeek(db, c.id, ws),
      ]);
      return {
      id: c.id, name: c.name, grade: c.grade_label || '', level: levelFromXp(c.total_xp), balls: c.balls ?? 3, ballsSuper: c.balls_super ?? 0,
      weekApproved,
      counted,
      hasPassword: !!c.pwd_hash,
      // 对战规则阶段 0 透传（只读，不新增判定）：主宠展示信息。formInfo 为纯函数（按等级推导、
      // 封顶 2 阶，绝不提前显示终极形态）；属性取 LINE_TYPE，与道馆 mainType 同口径
      // （伊布分支形态的类型以 LINE_TYPE.普通计，见 DEPLOY §43）。
      mainPet: (() => { const f = formInfo(c); return { name: f.formName, img: f.img, type: LINE_TYPE[c.line] || '', egg: f.egg }; })(),
    };
    };
    const [meInfo, otherInfo, mine, { results: champRows }, myColl, otherColl, latestRematch] = await Promise.all([
      info(me),
      info(other),
      db.prepare(
        "SELECT * FROM battles WHERE mode='pvp' AND week_start=? AND status IN ('waiting','active') AND (child_a=? OR child_b=?) ORDER BY id DESC LIMIT 1"
      ).bind(ws, me.id, me.id).first(),
      db.prepare(
        "SELECT * FROM battles WHERE mode='pvp' AND counted=1 AND status='finished' ORDER BY week_start DESC, id DESC LIMIT 24"
      ).all(),
      carriedCollection(db, me.id),
      other ? carriedCollection(db, other.id) : Promise.resolve([]),
      latestRematchRequest(db, ws),
    ]);
    let myMatch = null;
    if (mine) {
      const st = JSON.parse(mine.state || '{}');
      myMatch = battleView(mine, st);
      myMatch.mySide = mine.child_a === me.id ? 'A' : 'B';
    }
    // 对战规则修复（2026-10-27 浏览器验收发现）：建房只写 child_a、child_b 为空，
    // 等加入的局按 (child_a=? OR child_b=?) 查不到加入方，加入表单在浏览器里永远出不来
    // （单测直接拿 battleId 调加入接口，绕过了这一步，所以一直没发现）。
    // 加入方须看到对方本周的 waiting 局（mySide='B'），否则两人各建一局、永远打不起来；
    // create 接口的 oppWaiting 拦截本就是这个口径（不建第二局），状态接口须与之对齐。
    // 只补 waiting 局：active 局加入时已回填 child_b，本查询已能匹配。
    if (!myMatch && other) {
      const opp = await db.prepare(
        "SELECT * FROM battles WHERE mode='pvp' AND week_start=? AND status='waiting' AND child_a=? ORDER BY id DESC LIMIT 1"
      ).bind(ws, other.id).first();
      if (opp) {
        const st = JSON.parse(opp.state || '{}');
        myMatch = battleView(opp, st);
        myMatch.mySide = 'B';
      }
    }
    const seenWeek = new Set();
    const champions = [];
    const recent = [];
    for (const r of champRows) {
      const st = JSON.parse(r.state || '{}');
      const aName = st.sides && st.sides.A ? st.sides.A.childName : '';
      const bName = st.sides && st.sides.B ? st.sides.B.childName : '';
      const winnerName = r.winner_child_id === (st.sides && st.sides.A && st.sides.A.childId) ? aName : bName;
      if (!seenWeek.has(r.week_start)) {
        seenWeek.add(r.week_start);
        champions.push({ weekStart: r.week_start, childId: r.winner_child_id, childName: winnerName });
      }
      if (recent.length < 10) {
        recent.push({
          weekStart: r.week_start, aName, bName, winnerName,
          winnerPetsLeft: st.result ? st.result.winnerPetsLeft : null,
          totalActions: st.result ? st.result.totalActions : null,
          // 对战规则阶段 2（L5）：单场战报带败者防守表现；旧局无此字段时为 null，前端省略
          defense: st.result && st.result.defense ? st.result.defense : null,
        });
      }
    }
    // 对战规则阶段 1（R18）：备战宠「克制！」角标与实战同源——服务端用 typeMult(备战属性, 对方主宠属性)===2
    // 算出（countersForType 只表达“克哪几关馆主”，表达不了“克对方主宠”，故不用它；主宠属性取 LINE_TYPE，
    // 与 mainPet.type 同口径，伊布分支边角见 DEPLOY §43）。
    const myMainType = LINE_TYPE[me.line] || '';
    const otherMainType = other ? (LINE_TYPE[other.line] || '') : '';
    for (const it of myColl) it.pvpCounter = !!otherMainType && typeMult(it.type, otherMainType) === 2;
    for (const it of otherColl) it.pvpCounter = typeMult(it.type, myMainType) === 2;
    const nameOf = (cid) => (cid === me.id ? me.name : (other && cid === other.id ? other.name : null));
    const rematch = rematchView(latestRematch, nameOf);
    // 可申请 = 本周正式对战已计次打完、无进行中对局、本周还没申请过（驳回/已用同样不再放行，见申请接口）
    rematch.canRequest = !!((meInfo.counted || (otherInfo && otherInfo.counted)) && !myMatch && !latestRematch);
    return json({
      ok: true, today, isWeekend: isWeekendDate(today), weekStart: ws, gatesOpen: GATES_OPEN,
      me: meInfo, other: otherInfo,
      myMatch, champions, recent, rematch,
      myCollection: myColl,
      otherCollection: otherColl,
      ...(GATES_OPEN ? { benchOptions: await debugBenchOptions(db, me.id) } : {}),
    });
  });
}

// Task 104 批量真卡图：奖池 71 种全量映射（TCGdex 拉取，已是 WebP 600x825，原样落盘）；
// 其中 8 种取 30 周年 Celebration（2026-09-16）：151/144/145/146/150/196/197/38；
// 喷火龙（6）与耿鬼（94）的 30th Classic Collection 图 TCGdex 暂未收录（image 为空），
// 暂用最新版真卡图，后补 30th-c-001/018。图文件 public/static/img/tcg-*.webp 未进
// hash-assets 轮换（baseFiles 未含），直引。
const TCG_CARDS = { 3: '/static/img/tcg-3.webp', 6: '/static/img/tcg-6.webp', 9: '/static/img/tcg-9.webp', 12: '/static/img/tcg-12.webp', 15: '/static/img/tcg-15.webp', 18: '/static/img/tcg-18.webp', 20: '/static/img/tcg-20.webp', 22: '/static/img/tcg-22.webp', 24: '/static/img/tcg-24.webp', 26: '/static/img/tcg-26.webp', 28: '/static/img/tcg-28.webp', 31: '/static/img/tcg-31.webp', 34: '/static/img/tcg-34.webp', 36: '/static/img/tcg-36.webp', 38: '/static/img/tcg-38.webp', 40: '/static/img/tcg-40.webp', 42: '/static/img/tcg-42.webp', 45: '/static/img/tcg-45.webp', 47: '/static/img/tcg-47.webp', 49: '/static/img/tcg-49.webp', 51: '/static/img/tcg-51.webp', 53: '/static/img/tcg-53.webp', 55: '/static/img/tcg-55.webp', 57: '/static/img/tcg-57.webp', 59: '/static/img/tcg-59.webp', 62: '/static/img/tcg-62.webp', 65: '/static/img/tcg-65.webp', 68: '/static/img/tcg-68.webp', 71: '/static/img/tcg-71.webp', 73: '/static/img/tcg-73.webp', 76: '/static/img/tcg-76.webp', 78: '/static/img/tcg-78.webp', 80: '/static/img/tcg-80.webp', 82: '/static/img/tcg-82.webp', 85: '/static/img/tcg-85.webp', 87: '/static/img/tcg-87.webp', 89: '/static/img/tcg-89.webp', 91: '/static/img/tcg-91.webp', 94: '/static/img/tcg-94.webp', 97: '/static/img/tcg-97.webp', 99: '/static/img/tcg-99.webp', 101: '/static/img/tcg-101.webp', 103: '/static/img/tcg-103.webp', 105: '/static/img/tcg-105.webp', 110: '/static/img/tcg-110.webp', 117: '/static/img/tcg-117.webp', 119: '/static/img/tcg-119.webp', 121: '/static/img/tcg-121.webp', 130: '/static/img/tcg-130.webp', 134: '/static/img/tcg-134.webp', 135: '/static/img/tcg-135.webp', 136: '/static/img/tcg-136.webp', 139: '/static/img/tcg-139.webp', 141: '/static/img/tcg-141.webp', 144: '/static/img/tcg-144.webp', 145: '/static/img/tcg-145.webp', 146: '/static/img/tcg-146.webp', 149: '/static/img/tcg-149.webp', 150: '/static/img/tcg-150.webp', 151: '/static/img/tcg-151.webp', 181: '/static/img/tcg-181.webp', 196: '/static/img/tcg-196.webp', 197: '/static/img/tcg-197.webp', 208: '/static/img/tcg-208.webp', 212: '/static/img/tcg-212.webp', 464: '/static/img/tcg-464.webp', 466: '/static/img/tcg-466.webp', 470: '/static/img/tcg-470.webp', 471: '/static/img/tcg-471.webp', 700: '/static/img/tcg-700.webp', 900: '/static/img/tcg-900.webp' };

/* -------- 封印蛋 -------- */

async function apiSealedEggs(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const today = shDateStr();
  const { hatched, notice } = await hatchDueEggs(db, childId, today);
  const { results } = await db.prepare(
    'SELECT * FROM sealed_eggs WHERE child_id=? ORDER BY id DESC'
  ).bind(childId).all();
  // 奖励蛋（v11 reward_eggs）：与封印蛋同一列表形态返回，前端按 reward 区分
  const { results: rew } = await db.prepare(
    'SELECT * FROM reward_eggs WHERE child_id=? ORDER BY id DESC'
  ).bind(childId).all();
  const rewardEggs = rew.map((e) => {
    const no = Number(e.species_no);
    return {
      id: e.id, awardedDate: e.date_shanghai, unlockDate: e.unlock_date,
      hatched: e.status === 'hatched', daysLeft: e.status === 'hatched' ? 0 : Math.max(0, diffDays(today, e.unlock_date)),
      species: no, speciesName: (SPECIES[no] || {}).name || `图鉴 #${no}`,
      reward: true, source: e.source, egg: eggDesignFor(no),
    };
  });
  const owned = await ownedSpeciesSet(db, childId);
  const cards = rareCardHallPool()
    .filter(({ no }) => owned.has(no))
    .map(({ no, group }) => ({
      no,
      name: SPECIES[no]?.name || speciesName(no),
      group,
      types: (DEX_DETAILS[no] || {}).types || [],
      img: petImg(no),
      tcg: TCG_CARDS[no] || null,
      hp: (DEX_DETAILS[no] || {}).stats?.hp ?? null,
      moves: cardFaceMoves(no),
      weak: (((DEX_DETAILS[no] || {}).types || [])[0] && matchupsForType(((DEX_DETAILS[no] || {}).types || [])[0])?.weak?.[0]) || null,
    }));
  return json({
    ok: true,
    justHatched: hatched,
    notice: notice || null,
    eggs: results.map((e) => {
      const no = Number(e.species) || 151;
      return {
        id: e.id, awardedDate: e.awarded_date, unlockDate: e.unlock_date,
        hatched: !!e.hatched, daysLeft: e.hatched ? 0 : Math.max(0, diffDays(today, e.unlock_date)),
        species: no, speciesName: (SPECIES[no] || RARE).name, egg: eggDesignFor(no),
      };
    }),
    rewardEggs,
    cards,
  });
}

/* -------- 图鉴 -------- */

async function apiPokedex(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const c = await getChild(db, childId);
  if (!c) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  await unlockForms(db, c, today);
  const [{ results }, eeveeInst, acqRows] = await Promise.all([
    db.prepare('SELECT entry_key, unlocked_at FROM pokedex WHERE child_id=?').bind(childId).all(),
    c.line === 'eevee' ? getPetInstance(db, childId, 'eevee') : Promise.resolve(null),
    db.prepare('SELECT species_no, source FROM species_acquisitions WHERE child_id=?').bind(childId).all(),
  ]);
  const unlocked = new Set(results.map((r) => r.entry_key));
  const obtained = new Map(results.map((r) => [r.entry_key, r.unlocked_at]));
  // 主宠友好度（任务 93）：图鉴卡片主宠线上显示；只读 pet_instances，不建行（无行则 0）
  const mainInst = await getPetInstance(db, childId, c.line);
  const mainFriendship = mainInst && mainInst.friendship != null ? Math.max(0, Math.min(FRIENDSHIP_MAX, Number(mainInst.friendship))) : 0;
  const level = levelFromXp(c.total_xp);
  const intoLevel = c.total_xp - xpForLevel(level);
  const span = xpForLevel(level + 1) - xpForLevel(level);
  const xp = { total: c.total_xp, intoLevel, span, toNext: span - intoLevel };
  const eeveeBranch = eeveeInst ? eeveeInst.branch : null;
  const lineEntries = [];
  for (const [key, line] of Object.entries(LINES)) {
    // 伊布无线性二/三阶：只到 idx 1（旧循环到 3 会取 forms[2] 崩掉）；8 个分支是正常图鉴条目（134/135/136 在关都图鉴、其余在收藏进化）
    const maxIdx = key === 'eevee' ? 1 : 3;
    for (let idx = 0; idx <= maxIdx; idx++) {
      const ekey = `form:${key}:${idx}`;
      const isEgg = idx === 0;
      lineEntries.push({
        key: ekey, line: key, lineLabel: line.label, formIdx: idx,
        name: isEgg ? '神秘的蛋' : line.forms[idx - 1].name,
        no: isEgg ? null : line.forms[idx - 1].no,
        img: isEgg ? null : petImg(line.forms[idx - 1].no),
        egg: isEgg ? eggDesignFor(line.forms[0].no) : null,
        unlocked: GATES_OPEN || unlocked.has(ekey),
        // 伊布已进化分支时，当前形态是分支条目而非伊布本身
        current: key === c.line && !(key === 'eevee' && eeveeBranch),
      });
    }
  }
  const wild = WILD.map((w) => ({
    key: `wild:${w.no}`, no: w.no, name: w.name, img: petImg(w.no),
    unlocked: GATES_OPEN || unlocked.has(`wild:${w.no}`),
  }));
  const others = [
    ...GYM_STAGES.map((g) => {
      const sp = SPECIES[g.bossNo];
      return { key: `gym:${g.bossNo}`, no: g.bossNo, name: sp.name, img: petImg(g.bossNo), unlocked: GATES_OPEN || unlocked.has(`gym:${g.bossNo}`), kind: '道馆主' };
    }),
    { key: `rare:${RARE.no}`, no: RARE.no, name: RARE.name, img: petImg(RARE.no), unlocked: GATES_OPEN || unlocked.has(`rare:${RARE.no}`), kind: '稀有' },
  ];
  // 封印蛋孵化（2026-10-27 用户定）：固定道馆蛋 6 只（两孩一样）＋按各自的主线放其他的几只。
  // 主线蛋物种号取自主宠蛋池 WHEEL_EGG_POOL：皮卡丘线是 25，不是线一阶 172——25 才是高级转盘/单元测试实际发的蛋物种号，
  // 172 只出现在主宠线形态 form:pikachu:1，永不以 egg:172 落库，所以图鉴格子按 egg:25 点亮。
  const MAIN_LINE_EGG_NO = { pikachu: 25, charmander: 4, squirtle: 7, bulbasaur: 1, eevee: 133 };
  const eggSpeciesNos = [];
  for (const no of [...GYM_STAGES.map((g) => g.eggSpecies), ...WHEEL_EGG_POOL.filter((no) => no !== MAIN_LINE_EGG_NO[c.line])]) {
    if (!eggSpeciesNos.includes(no)) eggSpeciesNos.push(no);
  }
  const eggSpecies = eggSpeciesNos.map((no) => {
    const key = dexKeyForSpecies(no);
    // 注意：1/4/7/25 不在 SPECIES 表里（主宠线物种只在 LINES 里），须用 speciesName（含 LINES＋分支兜底），不能用 SPECIES[no].name
    return { key, no, name: speciesName(no), img: petImg(no), unlocked: GATES_OPEN || unlocked.has(key), kind: '封印蛋' };
  });
  // 进化/奖励蛋获得的收藏宠（v11）：egg:{no} 图鉴行中除固定道馆蛋物种之外的种；
  // 含 >151 的进化种（464/466/470/471/700/900），它们不进 151 网格，只在这里展示
  const gymEggNos = new Set(GYM_STAGES.map((g) => g.eggSpecies));
  const acqSource = new Map((acqRows.results || []).map((r) => [Number(r.species_no), r.source]));
  const collection = [];
  for (const r of results) {
    const m = /^egg:(\d+)$/.exec(r.entry_key);
    if (!m) continue;
    const no = Number(m[1]);
    if (gymEggNos.has(no) || !COLLECTION_MOVES[no]) continue;
    if (collection.some((x) => x.no === no)) continue;
    const sp = SPECIES[no];
    collection.push({
      key: r.entry_key, no, name: sp?.name || `图鉴 #${no}`, img: petImg(no),
      unlocked: true, type: sp?.type || null, source: acqSource.get(no) || 'egg',
      obtainedAt: r.unlocked_at,
    });
  }
  collection.sort((a, b) => a.no - b.no);
  const entryKeys = [...unlocked];
  function details(e) {
    if (!e || e.no == null) return {};
    // 未获得条目不返回详情（图鉴格子显示 ???、不可点）；伊布分支不再例外。
    if (!GATES_OPEN && !e.unlocked) return {};
    const isLine = e.line === c.line;
    const gym = GYM_STAGES.find((g) => e.key === `gym:${g.bossNo}`);
    const lineType = e.line ? LINE_TYPE[e.line] : SPECIES[e.no]?.type;
    let moves = e.line
      ? learnedMoves(e.line, level).map(([lv, name, desc]) => {
        const off = officialMove(name);
        return { level: lv, name, desc, type: off ? off.type : LINE_TYPE[e.line], damage_class: off ? off.damage_class : undefined, power: 25 + 6 * lv };
      })
      : gym
        ? gym.bossMoves.map(([name, type, power]) => {
          const off = officialMove(name);
          return { name, type, damage_class: off ? off.damage_class : undefined, power };
        })
        : (() => { // 卡片展示物种完整招式表（带学会等级）；已学会的带技能等级（与备战战斗同源 collectionMovesFor），可进升级入口；战斗仍按已学会招式算（buildPlayerSide）
          const learned = new Map(collectionMovesFor(c, e.no, level).map((m) => [m.name, m]));
          return (COLLECTION_LEARNSET[e.no] || []).map(([lv, name, desc]) => {
            const lm = learned.get(name);
            if (lm) return { ...lm, learned: true };
            const off = officialMove(name);
            return { level: lv, name, desc, type: off ? off.type : lineType, damage_class: off ? off.damage_class : undefined, power: 25 + 6 * lv, skillLevel: 1, learned: false };
          });
        })()
    // 妖精技能石教会的招式只挂在当前主宠线上（v11）
    if (isLine) {
      const fm = fairyMovesOf(c);
      if (fm.length) moves = [...moves, ...fm.map((m) => ({ level: m.level, name: m.name, desc: m.desc || '', fairy: true, type: '妖精', power: 25 + 6 * m.level }))];
    }
    const det = DEX_DETAILS[e.no] || null;
    // 伊布本体卡片不泄露未获得的分支路线：只列已进化出的分支（进化一个点亮一个，路线由孩子自己发现）。
    let evo = dexEvoChain(e.no);
    if (!GATES_OPEN && e.no === 133 && evo.branches) {
      const byNo = new Map(Object.entries(EEVEE_BRANCHES).map(([k, b]) => [b.no, k]));
      const kept = evo.branches.filter((b) => unlocked.has(`form:eevee:branch:${byNo.get(b.no)}`));
      evo = { ...evo, branches: kept.length ? kept : null };
    }
    let actualLevel = null;
    let actualStats = null;
    let scaledLevel = null;
    if (gym) {
      actualLevel = gym.bossLevel;
      scaledLevel = effBossLevel(gym);
      actualStats = statsFor(e.no, scaledLevel);
    } else if (isLine) {
      const formNo = lineFormNo(c.line, level);
      actualLevel = level;
      scaledLevel = effPlayerLevel(level);
      actualStats = formNo != null ? statsFor(formNo, scaledLevel) : null;
    } else {
      actualLevel = level;
      scaledLevel = effPlayerLevel(level);
      actualStats = statsFor(e.no, scaledLevel);
    }
    return {
      type: lineType,
      types: det ? det.types : [lineType].filter(Boolean),
      moves,
      abilities: det ? det.abilities : [],
      stats: det ? det.stats : null,
      ...(actualStats ? { actualStats, actualLevel, scaledLevel } : {}),
      evo,
      // 实战克制关系：馆主条目按官方双属性（bossDefTypes）算，与道馆 calcDamage 同源；其余条目按战斗单属性（lineType）算
      matchups: gym ? matchupsForTypes(bossDefTypes(e.no)) : (lineType ? matchupsForType(lineType) : null),
      ...(gym ? { matchupsDual: true } : {}),
      ...(isLine ? { level } : {}),
      ...(isLine ? { friendship: mainFriendship } : {}),
      obtainedAt: obtained.get(e.key),
    };
  }
  for (const e of [...lineEntries, ...wild, ...others, ...eggSpecies, ...collection]) {
    Object.assign(e, details(e));
  }
  // 测试站备战卡片：benchOptions 里的种在测试站视为已收录（仅 GATES_OPEN）。
  // 只补那些在任何图鉴分册（lineEntries/wild/others/eggSpecies/collection/dex151）里
  // 都没有条目的种（>151 的进化种，第一批后只剩 196/197/470/471/700 五种伊布进化形）；
  // 已有条目的种（179 野外、700 蛋等）一律不动。benchDex 是独立字段，不进 collection，
  // 不影响图鉴页渲染与 progress 统计；正式站无此字段。
  const benchDex = [];
  if (GATES_OPEN) {
    const haveNos = new Set([
      ...lineEntries, ...wild, ...others, ...eggSpecies, ...collection,
    ].map((e) => e.no).filter((n) => n != null));
    for (let n = 1; n <= POKEDEX_TOTAL; n++) haveNos.add(n);
    for (const no of Object.keys(COLLECTION_MOVES).map(Number).sort((a, b) => a - b)) {
      if (haveNos.has(no)) continue;
      const sp = SPECIES[no];
      const e = { key: dexKeyForSpecies(no), no, name: sp?.name || speciesName(no), img: petImg(no), unlocked: true, type: sp?.type || null, kind: '收藏进化', source: 'bench' };
      Object.assign(e, details(e));
      benchDex.push(e);
    }
  }

  const ownedEntries = [...lineEntries.filter((e) => e.current), ...wild, ...others, ...eggSpecies, ...collection];
  const entryForNo = (no) => ownedEntries.find((e) => e.no === no && e.unlocked);
  const ownedNos = new Set(ownedDexNos(entryKeys, c.line));
  const progress = dex151Progress(entryKeys, c.line);
  const dex151 = Array.from({ length: POKEDEX_TOTAL }, (_, i) => {
    const no = i + 1;
    if (!GATES_OPEN && !ownedNos.has(no)) return { no, unlocked: false, name: null, img: petImg(no) };
    const form = lineEntries.find((e) => e.current && e.no === no);
    const entry = entryForNo(no) || (GATES_OPEN
      ? lineEntries.find((e) => e.no === no) || { key: dexKeyForSpecies(no), no, unlocked: true }
      : undefined);
    return {
      no, unlocked: true, name: GATES_OPEN ? speciesName(no) : SPECIES[no]?.name ?? form?.name ?? null,
      img: petImg(no),
      ...details(entry),
    };
  });
  return json({ ok: true, lineEntries, wild, others, eggSpecies, collection, ...(GATES_OPEN ? { benchDex } : {}), currentLine: c.line, progress, dex151, level, xp, fragments: c.quiz_fragments || 0 });

}

/* -------- 统计 / 历史（家长） -------- */

async function apiStats(db) {
  const today = shDateStr();
  const ws = weekStartMon(today);
  const monthPrefix = today.slice(0, 7);
  const out = [];
  for (const c of await getChildren(db)) {
    const q = async (where, ...args) => {
      const r = await db.prepare(`SELECT COUNT(DISTINCT date) n FROM checkins WHERE child_id=? AND ${where}`).bind(c.id, ...args).first();
      return r ? r.n : 0;
    };
    out.push({
      childId: c.id, name: c.name,
      weekApproved: await q("status='approved' AND date>=? AND date<?", ws, addDays(ws, 7)), // 按天计
      monthApproved: await q("status='approved' AND date LIKE ?", monthPrefix + '%'),
      totalApproved: await q("status='approved'"),
      totalXp: c.total_xp, level: levelFromXp(c.total_xp), streak: c.streak,
    });
  }
  return json({ ok: true, stats: out, today, weekStart: ws });
}

async function apiHistory(db) {
  const { results } = await db.prepare(
    `SELECT ck.*, ch.name AS child_name FROM checkins ck JOIN children ch ON ch.id=ck.child_id
     ORDER BY ck.id DESC LIMIT 80`
  ).all();
  const pmap = await photosByCheckin(db, results.map((r) => r.id));
  // 历史奖励态：一次查询拉出已奖励的打卡 id 集合（旧通用发球记录 checkin_id 为空，不影响；
  // 2026-11-03 起下拉菜单的非球奖励以 item_ledger 统一标记行记账，两处取并集）
  const rewarded = new Set();
  const rewardedName = new Map();
  if (results.length) {
    const placeholders = results.map(() => '?').join(',');
    const { results: gs } = await db.prepare(
      `SELECT checkin_id FROM ball_grants WHERE checkin_id IN (${placeholders})`
    ).bind(...results.map((r) => r.id)).all();
    for (const g of gs) if (g.checkin_id != null) rewarded.add(g.checkin_id);
    const { results: ls } = await db.prepare(
      `SELECT ref_id, item_key FROM item_ledger WHERE ref_type='history_reward' AND ref_id IN (${placeholders})`
    ).bind(...results.map((r) => r.id)).all();
    for (const l of ls) {
      if (l.ref_id == null) continue;
      rewarded.add(l.ref_id);
      if (!rewardedName.has(l.ref_id)) {
        rewardedName.set(l.ref_id, l.item_key === 'ball:normal' ? '普通球' : l.item_key === 'xp:20' ? '经验+20' : ((ITEM_CATALOG[l.item_key] || {}).name || l.item_key));
      }
    }
  }
  return json({
    ok: true,
    history: results.map((r) => ({
      id: r.id, childId: r.child_id, childName: r.child_name, date: r.date,
      subject: r.subject || (safeJsonArr(r.subjects)[0] || ''), note: r.note || '',
      subjects: safeJsonArr(r.subjects), submittedAt: r.submitted_at,
      status: r.status, isEarly: !!r.is_early, xp: r.xp_awarded, reason: r.reason,
      photos: pmap.get(r.id) || [],
      rewarded: rewarded.has(r.id),
      rewardedName: rewardedName.get(r.id) || null,
    })),
  });
}

/* -------- 设置（家长） -------- */

async function apiGetSettings(db, env) {
  const testMode = isTestMode(env);
  const kids = await getChildren(db);
  // 111: 设置读取原来是约 15 次顺序单键查询（每孩 3 个进度＋8 个全局＋2 个调试），
  // 串行 D1 往返占了 /api/parent/settings 大部分耗时。改成一次批量取（getSettings，1 次往返）。
  const keys = [];
  for (const c of kids) keys.push(`math_progress_${c.id}`, `chinese_progress_${c.id}`, `english_progress_${c.id}`);
  keys.push('care_enabled', 'oak_assess', 'english_mode', 'base_xp', 'subject_xp', 'cutoff_time', 'quiz_xp', 'quiz_repeat_days');
  if (testMode) keys.push('debug_day_offset', 'debug_hour');
  const S = await getSettings(db, keys);
  const children = [];
  for (const c of kids) {
    const g = gradeNumFromLabel(c.grade_label);
    const chapters = g != null ? MATH_CHAPTERS[g] : null;
    let mathProgress = null;
    if (Array.isArray(chapters) && chapters.length) {
      const savedRaw = S.get(`math_progress_${c.id}`);
      const saved = savedRaw == null ? '' : String(savedRaw).trim();
      const valid = !!saved && chapters.includes(saved);
      mathProgress = {
        chapters,
        current: valid ? saved : defaultMathChapter(g),
        isDefault: !valid,
      };
    }
    let chineseProgress = null;
    const chineseChapters = g != null ? CHINESE_CHAPTERS[g] : null;
    if (Array.isArray(chineseChapters) && chineseChapters.length) {
      const savedRaw = S.get(`chinese_progress_${c.id}`);
      const saved = savedRaw == null ? '' : String(savedRaw).trim();
      const valid = !!saved && chineseChapters.includes(saved);
      chineseProgress = {
        chapters: chineseChapters,
        current: valid ? saved : defaultChineseChapter(g),
        isDefault: !valid,
      };
    }
    let englishProgress = null;
    const englishChapters = g != null ? ENGLISH_UNITS[g] : null;
    if (Array.isArray(englishChapters) && englishChapters.length) {
      const savedRaw = S.get(`english_progress_${c.id}`);
      const saved = savedRaw == null ? '' : String(savedRaw).trim();
      const valid = !!saved && englishChapters.includes(saved);
      englishProgress = {
        chapters: englishChapters,
        current: valid ? saved : defaultEnglishChapter(g),
        isDefault: !valid,
      };
    }
    children.push({
      id: c.id, name: c.name, grade: c.grade_label, line: c.line,
      hasPassword: !!c.pwd_hash,
      mathProgress,
      chineseProgress,
      englishProgress,
    });
  }
  return json({
    ok: true,
    settings: {
    careEnabled: S.get('care_enabled') === '1',
    oakAssess: S.get('oak_assess') !== '0',
    englishMode: S.get('english_mode') === '1',
      baseXp: Number(S.get('base_xp') || 40),
      subjectXp: Number(S.get('subject_xp') || 15),
      cutoffTime: S.get('cutoff_time') || '21:30',
      quizXp: Number(S.get('quiz_xp') || 10),
      quizRepeatDays: Number(S.get('quiz_repeat_days') || QUIZ_CORRECT_WINDOW_DAYS),
      children,
      lines: Object.entries(LINES).map(([k, v]) => ({ key: k, label: v.label, short: v.label.replace(/线$/, ''), img: petImg(v.forms[0].no) })),
      copyright: COPYRIGHT,
      testMode,
      debug: testMode ? {
        dayOffset: parseInt(S.get('debug_day_offset') || '0', 10) || 0,
        hour: S.get('debug_hour') || '',
        virtualToday: shDateStr(),
        virtualTime: shTimeHM(),
        isWeekend: isWeekendDate(shDateStr()),
        gatesOpen: GATES_OPEN_FULL,
      } : null,
    },
  });
}

async function apiUpdateSettings(db, req) {
  const body = await readJsonBody(req);
  let visibleChange = false;
  if (body.careEnabled !== undefined) await setSetting(db, 'care_enabled', body.careEnabled ? '1' : '0');
  if (body.careEnabled !== undefined) visibleChange = true;
  if (body.oakAssess !== undefined) await setSetting(db, 'oak_assess', body.oakAssess ? '1' : '0');
  if (body.oakAssess !== undefined) visibleChange = true;
  if (body.englishMode !== undefined) await setSetting(db, 'english_mode', body.englishMode ? '1' : '0');
  if (body.englishMode !== undefined) visibleChange = true;
  // 孩子名/年级
  if (Array.isArray(body.children)) {
    for (const k of body.children) {
      const name = String(k.name || '').trim().slice(0, 12);
      const grade = String(k.grade || '').trim().slice(0, 12);
      if (!name || !grade) return json({ ok: false, error: '名字和年级不能为空' }, 400);
      await db.prepare('UPDATE children SET name=?, grade_label=? WHERE id=?')
        .bind(name, grade, Number(k.id)).run();
      visibleChange = true;
    }
  }
  if (body.baseXp !== undefined) {
    const v = Number(body.baseXp);
    if (!Number.isInteger(v) || v < 10 || v > 200) return json({ ok: false, error: '基础经验需为 10–200' }, 400);
    await setSetting(db, 'base_xp', String(v));
    visibleChange = true;
  }
  if (body.subjectXp !== undefined) {
    const v = Number(body.subjectXp);
    if (!Number.isInteger(v) || v < 1 || v > 100) return json({ ok: false, error: '每科经验需为 1–100' }, 400);
    await setSetting(db, 'subject_xp', String(v));
    visibleChange = true;
  }
  if (body.quizRepeatDays !== undefined) {
    const v = Number(body.quizRepeatDays);
    if (!Number.isInteger(v) || v < 7 || v > 90) return json({ ok: false, error: '去重窗口需为 7–90 天' }, 400);
    await setSetting(db, 'quiz_repeat_days', String(v));
    visibleChange = true;
  }
  if (body.quizXp !== undefined) {
    const v = Number(body.quizXp);
    if (!Number.isInteger(v) || v < 0 || v > 100) return json({ ok: false, error: '问答奖励经验需为 0–100' }, 400);
    await setSetting(db, 'quiz_xp', String(v));
    visibleChange = true;
  }
  if (body.cutoffTime !== undefined) {
    const v = String(body.cutoffTime);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return json({ ok: false, error: '时间格式不对' }, 400);
    await setSetting(db, 'cutoff_time', v);
    visibleChange = true;
  }
  if (body.newPin !== undefined) {
    const v = String(body.newPin);
    if (!/^\d{4}$/.test(v)) return json({ ok: false, error: 'PIN 必须是 4 位数字' }, 400);
    await setSetting(db, 'pin', await sha256hex(v));
  }
  // 孩子入口密码：为每个孩子分别设置/重置（存哈希）；传空字符串 = 清除（回到未设置）
  // 密码变动后立即作废该孩子已有的全部会话：否则改密码前已登录的设备（会话 30 天有效）
  // 会一直免密码直进，家长改完密码却看不到任何变化（2026-10-21 iPhone 上报的 bug）。
  if (Array.isArray(body.childPasswords)) {
    for (const item of body.childPasswords) {
      const cid = Number(item && item.id);
      const target = cid ? await getChild(db, cid) : null;
      if (!target) return json({ ok: false, error: 'NOT_FOUND' }, 404);
      if (item.password === '' || item.password === null) {
        await db.prepare('UPDATE children SET pwd_hash=NULL, pwd_fail_count=0, pwd_locked_until=0 WHERE id=?')
          .bind(cid).run();
      } else {
        const v = String(item.password);
        if (!/^\d{4}$/.test(v)) return json({ ok: false, error: '孩子密码必须是 4 位数字' }, 400);
        await db.prepare('UPDATE children SET pwd_hash=?, pwd_fail_count=0, pwd_locked_until=0 WHERE id=?')
          .bind(await sha256hex(v), cid).run();
      }
      await db.prepare("DELETE FROM sessions WHERE kind='child' AND child_id=?").bind(cid).run();
      visibleChange = true;
    }
  }
  // 数学学习进度（每个孩子单独）：chapter 必须是该孩子年级章节列表内的合法值；
  // 传空字符串 = 清除设置回到默认（上册第2单元）。先整体校验再写入，避免部分写入。
  if (body.mathProgress !== undefined) {
    if (!Array.isArray(body.mathProgress)) {
      return json({ ok: false, error: 'mathProgress 必须为数组' }, 400);
    }
    const ops = [];
    for (const item of body.mathProgress) {
      const cid = Number(item && item.id);
      const target = cid ? await getChild(db, cid) : null;
      if (!target) return json({ ok: false, error: 'NOT_FOUND' }, 404);
      const g = gradeNumFromLabel(target.grade_label);
      const chapters = g != null ? MATH_CHAPTERS[g] : null;
      if (!Array.isArray(chapters) || !chapters.length) {
        return json({ ok: false, error: '该年级暂无数学章节列表' }, 400);
      }
      const chapter = item.chapter == null ? '' : String(item.chapter).trim();
      const key = `math_progress_${target.id}`;
      if (!chapter) {
        ops.push({ key, chapter: null });
      } else if (!chapters.includes(chapter)) {
        return json({ ok: false, error: '章节不在该年级列表内' }, 400);
      } else {
        ops.push({ key, chapter });
      }
    }
    for (const op of ops) {
      if (op.chapter === null) {
        await db.prepare('DELETE FROM settings WHERE key=?').bind(op.key).run();
      } else {
        await setSetting(db, op.key, op.chapter);
      }
      visibleChange = true;
    }
  }
  if (body.chineseProgress !== undefined) {
    if (!Array.isArray(body.chineseProgress)) {
      return json({ ok: false, error: 'chineseProgress 必须为数组' }, 400);
    }
    const ops = [];
    for (const item of body.chineseProgress) {
      const cid = Number(item && item.id);
      const target = cid ? await getChild(db, cid) : null;
      if (!target) return json({ ok: false, error: 'NOT_FOUND' }, 404);
      const g = gradeNumFromLabel(target.grade_label);
      const chapters = g != null ? CHINESE_CHAPTERS[g] : null;
      if (!Array.isArray(chapters) || !chapters.length) {
        return json({ ok: false, error: '该年级暂无语文单元列表' }, 400);
      }
      const chapter = item.chapter == null ? '' : String(item.chapter).trim();
      const key = `chinese_progress_${target.id}`;
      if (!chapter) {
        ops.push({ key, chapter: null });
      } else if (!chapters.includes(chapter)) {
        return json({ ok: false, error: '语文章节不在该年级列表内' }, 400);
      } else {
        ops.push({ key, chapter });
      }
    }
    for (const op of ops) {
      if (op.chapter === null) {
        await db.prepare('DELETE FROM settings WHERE key=?').bind(op.key).run();
      } else {
        await setSetting(db, op.key, op.chapter);
      }
      visibleChange = true;
    }
  }
  if (body.englishProgress !== undefined) {
    if (!Array.isArray(body.englishProgress)) {
      return json({ ok: false, error: 'englishProgress 必须为数组' }, 400);
    }
    const ops = [];
    for (const item of body.englishProgress) {
      const cid = Number(item && item.id);
      const target = cid ? await getChild(db, cid) : null;
      if (!target) return json({ ok: false, error: 'NOT_FOUND' }, 404);
      const g = gradeNumFromLabel(target.grade_label);
      const chapters = g != null ? ENGLISH_UNITS[g] : null;
      if (!Array.isArray(chapters) || !chapters.length) {
        return json({ ok: false, error: '该年级暂无英语单元列表' }, 400);
      }
      const chapter = item.chapter == null ? '' : String(item.chapter).trim();
      const key = `english_progress_${target.id}`;
      if (!chapter) {
        ops.push({ key, chapter: null });
      } else if (!chapters.includes(chapter)) {
        return json({ ok: false, error: '英语单元不在该年级列表内' }, 400);
      } else {
        ops.push({ key, chapter });
      }
    }
    for (const op of ops) {
      if (op.chapter === null) {
        await db.prepare('DELETE FROM settings WHERE key=?').bind(op.key).run();
      } else {
        await setSetting(db, op.key, op.chapter);
      }
      visibleChange = true;
    }
  }
  if (visibleChange) await bumpAllChildrenVersions(db);
  return json({ ok: true });
}

/* 换主宠门槛（v11 §5.3）：孩子同时持有某属性进化石、又获得该属性主宠类蛋时可选择更换；
 * 蛋＋石配对见 SWITCH_REQ；切回曾作主宠的线（has_been_main）无需蛋石；不消耗道具；
 * 换主宠继承等级/XP，新线按当前等级推导招式，不自动授予终极形态；蛋须已孵化（孵化后执行）。 */
async function checkSwitchLine(db, child, lineKey, today) {
  if (!LINES[lineKey]) return { ok: false, error: '没有这条线' };
  if (child.line === lineKey) return { ok: false, error: '已经是这条线啦' };
  const inst = await ensurePetInstance(db, child.id, lineKey, today, 'egg');
  if (inst.has_been_main) return { ok: true, inst, free: true };
  const req = SWITCH_REQ[lineKey];
  if (!req) return { ok: false, error: '这条线暂时不能切换' };
  if (GATES_OPEN) return { ok: true, inst, free: true };
  const eggNo = req.egg;
  const eggName = speciesName(eggNo);
  const hasEgg = await ownsSpeciesEver(db, child.id, eggNo);
  if (!hasEgg) {
    const pending = await hasPendingEgg(db, child.id, eggNo);
    return { ok: false, error: pending ? '蛋还在孵化，等孵出来再换哦' : `还没有${eggName}的蛋哦`, missing: 'egg', pending };
  }
  let stone = null;
  for (const s of req.stones) {
    if ((await getInventoryQty(db, child.id, s)) > 0) { stone = s; break; }
  }
  if (!stone) return { ok: false, error: '还没有对应的进化石哦', missing: 'stone' };
  return { ok: true, inst, free: false, stone };
}

async function doSwitchLine(db, child, lineKey, today) {
  const gate = await checkSwitchLine(db, child, lineKey, today);
  if (!gate.ok) return gate;
  const oldLine = child.line;
  // 任务 110：把旧主宠实例落盘（has_been_main=1）——实例是懒创建的；
  // 若此前从未跑过 attachEvoForm/unlockForms，旧线实例可能根本不存在，
  // 那之后 getExMainLine 永远查不到它。已存在时同样补上标记
  // （蛋来源创建的实例 has_been_main 初始为 0）。
  const oldInst = await ensurePetInstance(db, child.id, oldLine, today, 'main');
  if (oldInst && !oldInst.has_been_main) {
    await db.prepare('UPDATE pet_instances SET has_been_main=1, updated_epoch=? WHERE id=?')
      .bind(Math.floor(Date.now() / 1000), oldInst.id).run();
  }
  // 任务 110：旧主宠进携带——先按旧主宠当前形态算物种（attachEvoForm 同款口径，
  // 在副本上算，不动 child 本体；蛋形态没有物种可带，oldNo 为 null 时跳过）。
  const oldChild = { ...child };
  await attachEvoForm(db, oldChild, today);
  const oldEvo = oldChild._evo;
  const oldNo = oldEvo && oldEvo.branchNo ? oldEvo.branchNo
    : (oldEvo && oldEvo.formIdx > 0 ? LINES[oldLine].forms[Math.min(oldEvo.formIdx - 1, LINES[oldLine].forms.length - 1)].no : null);
  const hasCol = await hasCarriedColumn(db);
  await db.prepare('UPDATE children SET line=? WHERE id=?').bind(lineKey, child.id).run();
  await syncTouch(db, child.id, 'children', 'id=?', [child.id]);
  await db.prepare('UPDATE pet_instances SET has_been_main=1, updated_epoch=? WHERE id=?')
    .bind(Math.floor(Date.now() / 1000), gate.inst.id).run();
  if (oldNo) {
    const oldKey = dexKeyForSpecies(oldNo);
    let changed = false;
    if (hasCol) {
      const carriedNow = await carriedCollection(db, child.id);
      const carriedVal = carriedNow.length < MAX_CARRIED_COLLECTION ? 1 : 0;
      const ins = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(?,?,?,?)')
        .bind(child.id, oldKey, today, carriedVal).run();
      if (ins.meta && ins.meta.changes) changed = true;
      else {
        const upd = await db.prepare('UPDATE pokedex SET carried=? WHERE child_id=? AND entry_key=? AND carried!=?')
          .bind(carriedVal, child.id, oldKey, carriedVal).run();
        if (upd.meta && upd.meta.changes) changed = true;
      }
    } else {
      // 旧链：没有 carried 列，只记获得（携带按获得顺序算，insertPokedexWithCarryRule 同款）
      const ins = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
        .bind(child.id, oldKey, today).run();
      if (ins.meta && ins.meta.changes) changed = true;
    }
    if (changed) {
      const v = await bumpChildVersion(db, child.id);
      await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [child.id, oldKey], v);
    }
  }
  // A 步：清新主宠的 carried（目标线全部形态种——切回时旧形态行不残留，杜绝重复显示）。
  if (hasCol) {
    const newKeys = [
      ...LINES[lineKey].forms.map((f) => dexKeyForSpecies(f.no)),
      ...(lineKey === 'eevee' ? Object.values(EEVEE_BRANCHES).map((b) => dexKeyForSpecies(b.no)) : []),
    ];
    let cleared = false;
    for (const k of newKeys) {
      const c = await db.prepare('UPDATE pokedex SET carried=0 WHERE child_id=? AND entry_key=? AND carried=1')
        .bind(child.id, k).run();
      if (c.meta && c.meta.changes) cleared = true;
    }
    if (cleared) {
      const v = await bumpChildVersion(db, child.id);
      for (const k of newKeys) await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [child.id, k], v);
    }
  }
  await unlockForms(db, { ...child, line: lineKey }, today);
  return { ok: true, line: lineKey, lineLabel: LINES[lineKey].label, from: oldLine, free: gate.free };
}

/* 家长路由（保留）：requirePin 由路由层做 */
async function apiSwitchLine(db, req) {
  const body = await readJsonBody(req);
  const child = await getChild(db, Number(body.childId));
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const r = await doSwitchLine(db, child, String(body.line || ''), shDateStr());
  if (!r.ok) return json({ ok: false, error: r.error }, 400);
  return json({ ok: true, line: r.line, lineLabel: r.lineLabel, from: r.from, free: r.free });
}

/* 孩子自选发起换主宠（v11 §5.3）：无需家长审批，门槛与家长路由同一套 */
async function apiChildSwitchLine(db, req, session) {
  return withChild(db, req, session, async (child, body) => {
    const r = await doSwitchLine(db, child, String(body.line || ''), shDateStr());
    if (!r.ok) return json({ ok: false, error: r.error }, 400);
    return json({ ok: true, line: r.line, lineLabel: r.lineLabel, from: r.from, free: r.free });
  });
}

/* 重置时连带清照片：先删 R2 对象（尽力而为），再删索引行 */
async function clearAllPhotos(db, env) {
  try {
    const { results } = await db.prepare('SELECT object_key FROM checkin_photos').all();
    for (const r of results) await photoDelete(env, r.object_key);
  } catch { /* 照片表/桶异常不阻塞重置主流程 */ }
}

async function apiResetAll(db, env, req) {
  const body = await readJsonBody(req);
  if (body.confirm !== true) return json({ ok: false, error: '需要二次确认' }, 400);
  await clearAllPhotos(db, env);
  const stmts = [
    'DELETE FROM checkin_photos',
    'DELETE FROM checkins', 'DELETE FROM encounters', 'DELETE FROM gym_battles',
    'DELETE FROM gym_weeks', 'DELETE FROM sealed_eggs', 'DELETE FROM pokedex',
    'DELETE FROM battles', 'DELETE FROM gym_progress',
    'DELETE FROM pvp_rematch_requests', // 再来一局申请也须清：已批准的申请同周内会一直打开对战（canOpen），残留会污染下一轮验收
    "DELETE FROM settings WHERE key LIKE 'gym_final_egg_%'",
    'DELETE FROM quiz_attempts', 'DELETE FROM quiz_daily', 'DELETE FROM quiz_diagnoses', 'DELETE FROM child_notices',
    'DELETE FROM ball_grants',
    'DELETE FROM care_logs', 'DELETE FROM oak_assessments', 'DELETE FROM oak_draws',
    'DELETE FROM item_inventory', 'DELETE FROM item_ledger', 'DELETE FROM item_grants', 'DELETE FROM item_uses',
    'DELETE FROM pet_instances', 'DELETE FROM species_acquisitions',
    'DELETE FROM school_test_records', 'DELETE FROM wheel_chances', 'DELETE FROM wheel_week_quotas',
    'DELETE FROM unit_tests', 'DELETE FROM unit_test_questions', 'DELETE FROM unit_test_answers',
    'DELETE FROM unit_test_draws', 'DELETE FROM draw_week_quotas', 'DELETE FROM reward_eggs', 'DELETE FROM daily_item_drops',
    "UPDATE children SET total_xp=0, streak=0, last_checkin_date=NULL, titles='[]', stickers='[]', quiz_fragments=0, quiz_correct_total=0, unlocked_moves='[]', balls=3, balls_super=0, balls_hyper=0, balls_master=0, fairy_moves='[]'",
    "UPDATE children SET name='大宝', grade_label='三年级', line='pikachu' WHERE id=1",
    "UPDATE children SET name='小宝', grade_label='一年级', line='charmander' WHERE id=2",
    "INSERT INTO settings(key,value) VALUES('pin_fail_count','0'),('pin_locked_until','0') ON CONFLICT(key) DO UPDATE SET value=excluded.value",
  ];
  await db.batch(stmts.map((s) => db.prepare(s)));
  await bumpAllChildrenVersions(db); // 批量删除：只推版本、不逐行记 tombstone（全量重同步可恢复）
  return json({ ok: true });
}

/* -------- 测试模式专用接口（路由层先判 TEST_MODE，非测试环境一律 404） -------- */

/* 调试快照：单个孩子的全部可调指标＋招式表（纯读，不写库）。 */
async function debugSnapshotForChild(db, c) {
  const level = levelFromXp(c.total_xp);
  const base = xpForLevel(level), next = xpForLevel(level + 1);
  const dbgMoves = debugMovesFor(c.line, level, safeJsonArr(c.unlocked_moves));
  return {
    id: c.id, name: c.name, line: c.line, lineLabel: LINES[c.line].label,
    level, totalXp: c.total_xp,
    xpIntoLevel: c.total_xp - base, xpForLevelSpan: next - base, xpToNext: next - c.total_xp,
    formIdx: formIdxForLevel(level),
    balls: c.balls ?? 3, ballsSuper: c.balls_super ?? 0,
    ballsHyper: c.balls_hyper ?? 0, ballsMaster: c.balls_master ?? 0,
    fragments: c.quiz_fragments ?? 0, quizCorrectTotal: c.quiz_correct_total ?? 0,
    streak: c.streak ?? 0,
    moves: dbgMoves,
    // 妖精招式不参与技能升级，恒为 1 级；无妖精招式时行为与原来完全一致。
    skillLevels: (() => {
      const mainSkillLevels = dbgMoves.filter((m) => m.learned || m.early).map((m) => ({ name: m.name, skillLevel: skillLevelOf(safeJsonObj(c.move_levels), m.name) }));
      return [...mainSkillLevels, ...fairyMovesOf(c).filter((m) => !mainSkillLevels.some((s) => s.name === m.name)).map((m) => ({ name: m.name, skillLevel: 1 }))];
    })(),
  };
}

async function apiDebugState(db) {
  const out = [];
  for (const c of await getChildren(db)) out.push(await debugSnapshotForChild(db, c));
  return json({ ok: true, children: out });
}

async function apiDebugSet(db, req) {
  const body = await readJsonBody(req);
  const childId = Number(body.childId);
  if (!Number.isInteger(childId) || childId <= 0) return json({ ok: false, error: 'childId 不对' }, 400);
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  // —— 先整体校验再写入，避免部分写入（与 apiUpdateSettings 的 mathProgress 同款做法） ——
  const has = (k) => body[k] !== undefined && body[k] !== null;
  let newTotalXp = null, xpChanged = false;
  if (has('level') || has('totalXp')) {
    let level = null;
    if (has('level')) {
      level = Number(body.level);
      if (!Number.isInteger(level) || level < DEBUG_LEVEL_MIN || level > DEBUG_LEVEL_MAX)
        return json({ ok: false, error: `等级需为 ${DEBUG_LEVEL_MIN}–${DEBUG_LEVEL_MAX} 的整数` }, 400);
    }
    if (has('totalXp')) {
      const xp = Number(body.totalXp);
      if (!Number.isInteger(xp) || xp < 0 || xp > DEBUG_XP_MAX)
        return json({ ok: false, error: `累计经验需为 0–${DEBUG_XP_MAX} 的整数` }, 400);
      newTotalXp = xp;
    } else {
      newTotalXp = xpForLevel(level);
    }
    if (level !== null && newTotalXp !== xpForLevel(level))
      return json({ ok: false, error: `等级与经验不一致（${level} 级对应累计经验 ${xpForLevel(level)}）` }, 400);
    xpChanged = newTotalXp !== child.total_xp;
  }
  const intField = (key, min, max, label) => {
    if (!has(key)) return null;
    const v = Number(body[key]);
    if (!Number.isInteger(v) || v < min || v > max)
      return { error: `${label}需为 ${min}–${max} 的整数` };
    return { value: v };
  };
  const balls = intField('balls', 0, DEBUG_BALLS_MAX, '精灵球数');
  if (balls && balls.error) return json({ ok: false, error: balls.error }, 400);
  const ballsSuper = intField('ballsSuper', 0, DEBUG_BALLS_MAX, '超级球数');
  if (ballsSuper && ballsSuper.error) return json({ ok: false, error: ballsSuper.error }, 400);
  const ballsHyper = intField('ballsHyper', 0, DEBUG_BALLS_MAX, '高级球数');
  if (ballsHyper && ballsHyper.error) return json({ ok: false, error: ballsHyper.error }, 400);
  const ballsMaster = intField('ballsMaster', 0, DEBUG_BALLS_MAX, '大师球数');
  if (ballsMaster && ballsMaster.error) return json({ ok: false, error: ballsMaster.error }, 400);
  const fragments = intField('fragments', 0, DEBUG_FRAGMENTS_MAX, '碎片数');
  if (fragments && fragments.error) return json({ ok: false, error: fragments.error }, 400);
  const streak = intField('streak', 0, DEBUG_STREAK_MAX, '连击天数');
  if (streak && streak.error) return json({ ok: false, error: streak.error }, 400);
  let unlockedToStore = null;
  if (has('unlockedMoves')) {
    if (!Array.isArray(body.unlockedMoves)) return json({ ok: false, error: 'unlockedMoves 必须为数组' }, 400);
    const tableNames = new Set(LINES[child.line].moves.map((m) => m[1]));
    for (const n of body.unlockedMoves) {
      if (typeof n !== 'string' || !tableNames.has(n))
        return json({ ok: false, error: `没有这个招式：${String(n)}` }, 400);
    }
    // 只存“尚未随等级学会”的招：已随等级学会的招不进 unlocked_moves（effectiveMoves 本就包含它们）。
    const postLevel = newTotalXp !== null ? levelFromXp(newTotalXp) : levelFromXp(child.total_xp);
    const learned = new Set(learnedMoves(child.line, postLevel).map((m) => m[1]));
    unlockedToStore = [...new Set(body.unlockedMoves)].filter((n) => !learned.has(n));
  }
  if (newTotalXp === null && !balls && !ballsSuper && !ballsHyper && !ballsMaster && !fragments && !streak && unlockedToStore === null)
    return json({ ok: false, error: '没有要改的项' }, 400);
  // —— 写入 ——
  const sets = [], args = [];
  if (newTotalXp !== null) { sets.push('total_xp=?'); args.push(newTotalXp); }
  if (balls) { sets.push('balls=?'); args.push(balls.value); }
  if (ballsSuper) { sets.push('balls_super=?'); args.push(ballsSuper.value); }
  if (ballsHyper) { sets.push('balls_hyper=?'); args.push(ballsHyper.value); }
  if (ballsMaster) { sets.push('balls_master=?'); args.push(ballsMaster.value); }
  if (fragments) {
    // 碎片与答对总数保持不变量 fragments == floor(quiz_correct_total/5)：设碎片 F 即视同答对 5F 题。
    sets.push('quiz_fragments=?', 'quiz_correct_total=?');
    args.push(fragments.value, fragments.value * 5);
  }
  if (streak) { sets.push('streak=?'); args.push(streak.value); }
  if (unlockedToStore !== null) { sets.push('unlocked_moves=?'); args.push(JSON.stringify(unlockedToStore)); }
  if (sets.length) {
    await db.prepare(`UPDATE children SET ${sets.join(', ')} WHERE id=?`).bind(...args, childId).run();
  }
  await syncTouch(db, childId, 'children', 'id=?', [childId]);
  if (xpChanged) {
    const fresh = await getChild(db, childId);
    await syncChildForms(db, fresh, shDateStr());
  }
  const snap = await debugSnapshotForChild(db, await getChild(db, childId));
  return json({ ok: true, child: snap });
}

/* 设置/清除时间模拟偏移（settings: debug_day_offset 天、debug_hour ''=跟随真实） */
async function apiDebugTimeSet(db, req) {
  const body = await readJsonBody(req);
  if (body.clear === true) {
    await setSetting(db, 'debug_day_offset', '0');
    await setSetting(db, 'debug_hour', '');
    return json({ ok: true, cleared: true });
  }
  const off = Number(body.dayOffset);
  if (!Number.isInteger(off) || off < -3650 || off > 3650) {
    return json({ ok: false, error: '偏移天数需为 -3650..3650 的整数' }, 400);
  }
  let hour = body.hour;
  if (hour === undefined || hour === null || hour === '' || hour === 'real') {
    hour = '';
  } else {
    hour = Number(hour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return json({ ok: false, error: '模拟小时需为 0–23，或留空跟随真实时间' }, 400);
    }
    hour = String(hour);
  }
  await setSetting(db, 'debug_day_offset', String(off));
  await setSetting(db, 'debug_hour', hour);
  return json({ ok: true, dayOffset: off, hour });
}

/* 重置测试数据：清打卡/问答/进度回出厂（含孩子密码回到未设置），保留题目库与 settings（PIN/参数），并清零时间偏移 */
/* 开/关门槛放行（settings: debug_open_gates；仅测试模式路由可达） */
async function apiDebugGatesSet(db, req) {
  const body = await readJsonBody(req);
  const open = body.open === true;
  await setSetting(db, 'debug_open_gates', open ? '1' : '0');
  return json({ ok: true, gatesOpen: open });
}

async function apiDebugReset(db, env, req) {
  const body = await readJsonBody(req);
  if (body.confirm !== true) return json({ ok: false, error: '需要二次确认' }, 400);
  const childrenSchema = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='children'").first();
  const resetMoveLevels = childrenSchema?.sql?.includes('move_levels') ? ", move_levels='{}'" : '';
  await clearAllPhotos(db, env);
  const stmts = [
    'DELETE FROM checkin_photos',
    'DELETE FROM checkins', 'DELETE FROM encounters', 'DELETE FROM gym_battles',
    'DELETE FROM gym_weeks', 'DELETE FROM sealed_eggs', 'DELETE FROM pokedex',
    'DELETE FROM battles', 'DELETE FROM gym_progress',
    'DELETE FROM pvp_rematch_requests', // 再来一局申请也须清：已批准的申请同周内会一直打开对战（canOpen），残留会污染下一轮验收
    "DELETE FROM settings WHERE key LIKE 'gym_final_egg_%'",
    'DELETE FROM quiz_attempts', 'DELETE FROM quiz_daily', 'DELETE FROM quiz_diagnoses', 'DELETE FROM child_notices',
    'DELETE FROM ball_grants',
    'DELETE FROM care_logs', 'DELETE FROM oak_assessments', 'DELETE FROM oak_draws',
    'DELETE FROM item_inventory', 'DELETE FROM item_ledger', 'DELETE FROM item_grants', 'DELETE FROM item_uses',
    'DELETE FROM pet_instances', 'DELETE FROM species_acquisitions',
    'DELETE FROM school_test_records', 'DELETE FROM wheel_chances', 'DELETE FROM wheel_week_quotas',
    'DELETE FROM unit_tests', 'DELETE FROM unit_test_questions', 'DELETE FROM unit_test_answers',
    'DELETE FROM unit_test_draws', 'DELETE FROM draw_week_quotas', 'DELETE FROM reward_eggs', 'DELETE FROM daily_item_drops',
    "UPDATE children SET total_xp=0, streak=0, last_checkin_date=NULL, titles='[]', stickers='[]', quiz_fragments=0, quiz_correct_total=0, unlocked_moves='[]', balls=3, balls_super=0, balls_hyper=0, balls_master=0, fairy_moves='[]'" + resetMoveLevels,
    'UPDATE children SET pwd_hash=NULL, pwd_fail_count=0, pwd_locked_until=0',
    "UPDATE children SET name='测试大宝', grade_label='三年级', line='pikachu' WHERE id=1",
    "UPDATE children SET name='测试小宝', grade_label='一年级', line='charmander' WHERE id=2",
    "INSERT INTO settings(key,value) VALUES('pin_fail_count','0'),('pin_locked_until','0'),('debug_day_offset','0'),('debug_hour','') ON CONFLICT(key) DO UPDATE SET value=excluded.value",
  ];
  await db.batch(stmts.map((s) => db.prepare(s)));
  await bumpAllChildrenVersions(db); // 批量删除：只推版本、不逐行记 tombstone（全量重同步可恢复）
  return json({ ok: true });
}

/* ================= v11 进化道具：新端点 =================
 * 背包 / 用石 / 进化（孩子）· 学校成绩与高级转盘（家长＋孩子）· App 单元测试（家长开＋孩子答） */

/* 孩子背包总览：球＋库存＋蛋＋实例＋可进化项＋高级转盘机会＋当日掉落数 */
async function apiEvoBackpack(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('childId'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  await hatchDueEggs(db, child.id, today);
  await attachEvoForm(db, child, today);
  const level = levelFromXp(child.total_xp);
  const inv = await getInventory(db, child.id);
  const invQty = {};
  for (const it of inv) invQty[it.key] = it.qty;
  const { results: instRows } = await db.prepare('SELECT * FROM pet_instances WHERE child_id=? ORDER BY id').bind(child.id).all();
  const ownedSet = await ownedSpeciesSet(db, child.id);
  const claimedSteps = await evoRewardClaimedSteps(db, child.id);
  const instances = [];
  for (const inst of instRows) {
    const isMain = inst.line_key === child.line;
    const cur = isMain ? child._evo : null;
    const name = cur ? cur.formName : speciesName(inst.species_no);
    instances.push({
      lineKey: inst.line_key, speciesNo: inst.species_no, name,
      img: cur ? cur.img : petImg(inst.species_no),
      formIdx: inst.form_idx, branch: inst.branch || null,
      source: inst.source, hasBeenMain: !!inst.has_been_main, current: isMain,
      evoOptions: evoOptionsFor(child, inst, invQty, level, { owned: ownedSet, claimedSteps }),
    });
  }
  const { results: sealed } = await db.prepare('SELECT * FROM sealed_eggs WHERE child_id=? AND hatched=0 ORDER BY unlock_date').bind(child.id).all();
  const { results: rew } = await db.prepare("SELECT * FROM reward_eggs WHERE child_id=? AND status='pending' ORDER BY unlock_date").bind(child.id).all();
  const eggs = [
    ...sealed.map((e) => {
      const no = Number(e.species) || 151;
      return { id: e.id, kind: 'sealed', species: no, speciesName: (SPECIES[no] || RARE).name, egg: eggDesignFor(no), unlockDate: e.unlock_date, daysLeft: Math.max(0, diffDays(today, e.unlock_date)) };
    }),
    ...rew.map((e) => {
      const no = Number(e.species_no);
      return { id: e.id, kind: 'reward', species: no, speciesName: (SPECIES[no] || {}).name || `图鉴 #${no}`, egg: eggDesignFor(no), unlockDate: e.unlock_date, daysLeft: Math.max(0, diffDays(today, e.unlock_date)), source: e.source };
    }),
  ];
  const wheelChances = await wheelChancesLeft(db, child.id);
  const rareWheelChances = await rareWheelChancesLeft(db, child.id);
  const careWheelChances = await careWheelChancesLeft(db, child.id);
  const dd = await db.prepare('SELECT COUNT(*) n FROM daily_item_drops WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first();
  return json({
    ok: true, childId: child.id, line: child.line, level,
    balls: { normal: child.balls ?? 0, super: child.balls_super ?? 0, hyper: child.balls_hyper ?? 0, master: child.balls_master ?? 0 },
    inventory: inv.map((it) => (it.key && it.key.startsWith('egg:') && EGG_SPECIES_BY_ITEM[it.key]
      ? { ...it, egg: eggDesignFor(EGG_SPECIES_BY_ITEM[it.key]) } : it)),
    fairyMoves: fairyMovesOf(child), eggs, instances,
    wheelChances, rareWheelChances, careWheelChances,
    gatesOpen: GATES_OPEN_FULL, /* 任务 124：转盘页据此决定 0 次时能否扭 */
    dailyDropsToday: dd ? (dd.n || 0) : 0, dailyDropLimit: DAILY_DROP_DAILY_LIMIT,
  });
}

/* 进化失败文案（服务端错误码 → 孩子能看懂的话） */
function evoErrorMessage(r) {
  switch (r.error) {
    case 'NO_STONE': return `没有${(ITEM_CATALOG[r.stone] || {}).name || '对应的石头'}啦`;
    case 'LEVEL_TOO_LOW': return `要到 ${r.need} 级才能进化哦`;
    case 'ALREADY_EVOLVED': return '已经进化过啦';
    case 'EVO_REWARD_CLAIMED': return '这个进化奖励已经领过啦';
    case 'FAIRY_POOL_FULL': return '妖精招式都学会啦，这块石头用不上';
    case 'NO_FAIRY_MOVE': return '要先用妖精技能石学会妖精招式哦';
    case 'NO_FINAL_FORM': return '这条线没有终极形态哦';
    case 'NO_EVO_LINE': return '这只精灵没有进化路线哦';
    case 'BAD_BRANCH': return '没有这个进化分支';
    default: return r.error || '现在不能进化哦';
  }
}

/* 用石（孩子）：主宠终极 / 伊布分支 / 收藏线用石步骤 / 妖精技能石教学。
 * body: {childId, target: 'main'|'eevee'|'species:{no}', branch?, to?（目标物种号，收藏线分支用）, action?: 'teach'|'evolve'} */
async function apiEvoUseStone(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const target = String(body.target || '');
    let r;
    if (target === 'main') {
      if (child.line === 'eevee') return json({ ok: false, error: '伊布没有终极形态，8 个分支在伊布线里选哦' }, 400);
      const inst = await ensurePetInstance(db, child.id, child.line, today);
      r = await applyMainFinalEvo(db, child, inst, today);
    } else if (target === 'eevee') {
      if (child.line !== 'eevee') return json({ ok: false, error: '先切换到伊布线再进化哦' }, 400);
      const inst = await ensurePetInstance(db, child.id, 'eevee', today);
      if (body.action === 'teach') {
        r = await applyFairyTeach(db, child, inst, today);
      } else {
        const branch = String(body.branch || '');
        if (!EEVEE_BRANCHES[branch]) return json({ ok: false, error: '没有这个进化分支' }, 400);
        r = await applyEeveeBranchEvo(db, child, inst, branch, today);
      }
    } else if (target.startsWith('species:')) {
      const inst = await ensurePetInstance(db, child.id, target, today, 'egg');
      const ownedSet = await ownedSpeciesSet(db, child.id);
      const claimedSteps = await evoRewardClaimedSteps(db, child.id);
      const opts = evoOptionsFor(child, inst, {}, levelFromXp(child.total_xp), { owned: ownedSet, claimedSteps });
      if (!opts.length) return json({ ok: false, error: '现在不能进化哦' }, 400);
      const toNo = body.to != null && body.to !== '' ? Number(body.to) : null;
      const opt = toNo != null ? opts.find((o) => o.target === toNo) : opts[0];
      if (!opt) return json({ ok: false, error: '没有这个进化分支' }, 400);
      if (!opt.item) return json({ ok: false, error: '这次进化不用石头，去进化入口确认吧' }, 400);
      r = await applyCollectionEvo(db, child, inst, today, toNo);
    } else {
      return json({ ok: false, error: '参数不对' }, 400);
    }
    if (!r.ok) return json({ ok: false, error: evoErrorMessage(r) }, 400);
    return json({ ok: true, ...r, inventory: await getInventory(db, child.id) });
  });
}

/* 进化确认（孩子）：不用石头的进化——收藏线等级/交换门槛、仙子伊布确认。
 * body: {childId, target: 'species:{no}'|'eevee', branch?, to?（目标物种号，收藏线分支用）} */
async function apiEvoEvolve(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const target = String(body.target || '');
    let r;
    if (target === 'eevee') {
      if (child.line !== 'eevee') return json({ ok: false, error: '先切换到伊布线再进化哦' }, 400);
      if (String(body.branch || '') !== 'sylveon') return json({ ok: false, error: '不用石头的伊布进化只有仙子伊布哦' }, 400);
      const inst = await ensurePetInstance(db, child.id, 'eevee', today);
      r = await applyEeveeBranchEvo(db, child, inst, 'sylveon', today);
    } else if (target.startsWith('species:')) {
      const inst = await ensurePetInstance(db, child.id, target, today, 'egg');
      r = await applyCollectionEvo(db, child, inst, today, body.to != null && body.to !== '' ? Number(body.to) : null);
    } else {
      return json({ ok: false, error: '参数不对' }, 400);
    }
    if (!r.ok) return json({ ok: false, error: evoErrorMessage(r) }, 400);
    return json({ ok: true, ...r, inventory: await getInventory(db, child.id) });
  });
}

/* -------- 学校成绩与道具奖励（v11 §2.3/§2.4） -------- */

/* -------- 学校成绩与道具奖励（v11 §2.3/§2.4） -------- */

/* 学校成绩提交输入校验（家长直登与孩子上报共用；百分制折算）。
 * 返回 {err} 或 {subject, unit, score, fullScore, examDate, photo}（photo 可能为 null）。 */
function parseSchoolTestInput(body) {
  const subject = String(body.subject || '');
  if (!QUIZ_SUBJECTS.includes(subject)) return { err: '科目只能选 语文/数学/英语/阅读' };
  const unit = String(body.unit || '').trim().slice(0, 40);
  if (!unit) return { err: '单元不能为空' };
  const score = Number(body.score);
  const fullScore = body.fullScore !== undefined && body.fullScore !== null && body.fullScore !== '' ? Number(body.fullScore) : 100;
  if (!Number.isFinite(score) || score < 0 || !Number.isFinite(fullScore) || fullScore <= 0 || score > fullScore) {
    return { err: '分数不对' };
  }
  const examDate = String(body.examDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return { err: '考试日期不对' };
  // 照片（可选，最多 1 张；≥95 想拿高级转盘机会必须传）
  let photo = null;
  if (body.photos !== undefined) {
    const parsed = parsePhotosArg(body.photos);
    if (parsed.err) return { err: parsed.err };
    if (parsed.list && parsed.list.length > 1) return { err: '试卷照片最多 1 张' };
    if (parsed.list && parsed.list.length === 1 && parsed.list[0].bytes) photo = parsed.list[0];
  }
  return { subject, unit, score, fullScore, examDate, photo };
}

/* 写一条学校成绩记录（照片上 R2，key 含记录 id；15 天后到期懒删）。
 * status：家长直登 'active'，孩子上报 'pending'（待家长审核）。 */
async function insertSchoolTestRecord(db, env, child, input, status) {
  const today = shDateStr();
  const now = Math.floor(Date.now() / 1000);
  const pct = Math.round((input.score / input.fullScore) * 1000) / 10;
  const ins = await db.prepare(
    `INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, photo_key, photo_expires_epoch, reward_granted, status, created_epoch, date_shanghai)
     VALUES(?,?,?,?,?,?,?,NULL,NULL,0,?,?,?)`
  ).bind(child.id, input.subject, input.unit, input.score, input.fullScore, pct, input.examDate, status, now, today).run();
  const recordId = ins.meta ? Number(ins.meta.last_row_id) : null;
  if (!recordId) return { err: '保存失败' };
  // 照片上 R2（key 含记录 id；15 天后到期懒删）
  let photoKey = null;
  if (input.photo) {
    try {
      photoKey = `school/${child.id}/${recordId}.${photoExt(input.photo.contentType)}`;
      await photoPut(env, photoKey, input.photo.bytes, input.photo.contentType);
      await db.prepare('UPDATE school_test_records SET photo_key=?, photo_expires_epoch=? WHERE id=?')
        .bind(photoKey, now + SCHOOL_PHOTO_KEEP_DAYS * 86400, recordId).run();
    } catch (e) {
      console.error('school test photo upload failed', e);
      photoKey = null;
    }
  }
  await syncTouch(db, child.id, 'school_test_records', 'id=?', [recordId]);
  return { recordId, photoKey, pct };
}

/* ≥95＋试卷照片：记 1 次高级转盘机会（与家长直登同一口径）。
 * 每孩每周最多 3 次、同一科目每周最多 1 次；科目名额原子占位、总量条件记账。 */
async function maybeGrantWheelChance(db, childId, recordId, subject, pct, photoKey, today, now) {
  let wheelChance = false, wheelReason = null;
  if (GATES_OPEN && pct >= 95) {
    const ins = await db.prepare(
      'INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)'
    ).bind(childId, recordId, weekStartMon(today), now, today).run();
    if (ins.meta && ins.meta.changes) {
      const v = await bumpChildVersion(db, childId);
      await touchRow(db, 'wheel_chances', 'id=?', [Number(ins.meta.last_row_id)], v);
      wheelChance = true;
    }
    return { wheelChance, wheelReason };
  }
  if (pct >= 95 && photoKey) {
    const ws = weekStartMon(today);
    // 科目名额原子占位（count<1 才 +1；已占则 0 行）
    const claim = await db.prepare(
      `INSERT INTO wheel_week_quotas(child_id, week_start, subject, count) VALUES(?,?,?,1)
       ON CONFLICT(child_id, week_start, subject) DO UPDATE SET count=count+1 WHERE count<1`
    ).bind(childId, ws, subject).run();
    if (!claim.meta || !claim.meta.changes) {
      wheelReason = '这门科目本周已经有过一次高级转盘机会啦';
    } else {
      // 总量条件记账（每周最多 3 次；满了把科目名额还回去）
      const chIns = await db.prepare(
        `INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai)
         SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM wheel_chances WHERE child_id=? AND week_start=?) < ?`
      ).bind(childId, recordId, ws, now, today, childId, ws, WHEEL_WEEK_LIMIT).run();
      if (!chIns.meta || !chIns.meta.changes) {
        await db.prepare('UPDATE wheel_week_quotas SET count=count-1 WHERE child_id=? AND week_start=? AND subject=? AND count>0')
          .bind(childId, ws, subject).run();
        wheelReason = '本周的高级转盘机会已经用完啦（每周最多 3 次）';
      } else {
        wheelChance = true;
        if (chIns.meta) {
          const v = await bumpChildVersion(db, childId);
          await touchRow(db, 'wheel_chances', 'id=?', [Number(chIns.meta.last_row_id)], v);
        }
      }
    }
  } else if (pct >= 95 && !photoKey) {
    wheelReason = '上传试卷照片后可获得 1 次高级转盘机会';
  }
  return { wheelChance, wheelReason };
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
async function pickOldestChance(db, table, childId) {
  try {
    return await db.prepare(
      `SELECT * FROM ${table} WHERE child_id=? AND used_epoch IS NULL ORDER BY created_epoch ASC, id ASC LIMIT 1`
    ).bind(childId).first();
  } catch { return null; }
}
/* CAS 占位（三盘同口径）：UPDATE … SET used_epoch=? WHERE id=? AND used_epoch IS NULL，抢到（changes>0）返回 true；
 * 调用方在返回 false 时一律回 STATE_CHANGED 409。 */
async function claimWheelChance(db, table, id, now) {
  const claim = await db.prepare(`UPDATE ${table} SET used_epoch=? WHERE id=? AND used_epoch IS NULL`).bind(now, id).run();
  return !!(claim.meta && claim.meta.changes);
}
/* 稀有 / 养成转盘共用 spin 骨架（先占位 CAS 再掷骰发奖）。
 * 差异全部由 cfg 注入：prepare（占位后取可抢池）、roll、award、wheel；
 * onEmptyPool:'refund' 仅稀有盘传——空池时把占位的 used_epoch 置回 NULL（养成盘无此分支，也不得补；补不补是产品决策）。
 * 高级盘（apiEvoWheelSpin）流程不同（先掷骰后占位、两表取机会），不走本骨架，只共用 withChild / claimWheelChance。 */
async function spinWheel(db, req, session, cfg) {
  return withChild(db, req, session, async (child, body, today) => {
    const now = Math.floor(Date.now() / 1000);
    let ch = await pickOldestChance(db, cfg.table, child.id);
    /* 任务 124：放行且没有机会时自动补一次（来源 debug-gates，ref 唯一），走正常占位/发奖流程，
     * 转完即消耗，可反复转；不放行时仍按原规则报没有机会。 */
    if (!ch && GATES_OPEN_FULL) {
      await grantWheelChance(db, cfg.table, 'debug-gates', child.id, 'debug-gates', `debug-${now}-${Math.floor(Math.random() * 1e9)}`, today, now);
      ch = await pickOldestChance(db, cfg.table, child.id);
    }
    if (!ch) return json({ ok: false, error: cfg.noChanceMsg }, 400);
    if (!(await claimWheelChance(db, cfg.table, ch.id, now))) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
    const ctx = cfg.prepare ? await cfg.prepare(db, child) : null;
    const prize = cfg.roll(ctx);
    if (cfg.emptyMsg && !prize) {
      if (cfg.onEmptyPool === 'refund') await db.prepare(`UPDATE ${cfg.table} SET used_epoch=NULL WHERE id=?`).bind(ch.id).run();
      return json({ ok: false, error: cfg.emptyMsg }, 400);
    }
    const awarded = await cfg.award(db, child, ch, prize, today);
    if (awarded.err) return awarded.err;
    const left = await wheelChancesLeftFor(db, cfg.table, child.id);
    return json({ ok: true, prize: awarded.prize, chancesLeft: left, wheel: cfg.wheel(ctx, prize) });
  });
}
/* -------- 稀有转盘（2026-11-07 新建）：机会发放 --------
 * 机会表 rare_wheel_chances（迁移 0026）：不进 sync 注册表——转盘须联网，离线端不用。
 * 发放一律 INSERT OR IGNORE（UNIQUE(child_id, source, ref_id) 防重），返回是否新发。 */
async function grantRareWheelChance(db, childId, source, refId, today, now) {
  return grantWheelChance(db, 'rare_wheel_chances', 'rare', childId, source, refId, today, now);
}
/* 稀有转盘可用次数（仿 wheelChancesLeft，只数本表未用行；表未建如旧迁移链时当 0，不抛错）。 */
async function rareWheelChancesLeft(db, childId) {
  return wheelChancesLeftFor(db, 'rare_wheel_chances', childId);
}
/* -------- 养成转盘（2026-11-08 新建，Daily English 奖励）：机会发放 --------
 * 机会表 care_wheel_chances（迁移 0028）：不进 sync 注册表——转盘须联网，离线端不用。
 * 发放一律 INSERT OR IGNORE（UNIQUE(child_id, source, ref_id) 防重），返回是否新发。
 * 不占高级转盘周上限：不走 wheel_chances、不触 WHEEL_WEEK_LIMIT（周上限仅限高级转盘）。 */
async function grantCareWheelChance(db, childId, source, refId, today, now) {
  return grantWheelChance(db, 'care_wheel_chances', 'care', childId, source, refId, today, now);
}
/* 养成转盘可用次数（仿 rareWheelChancesLeft，只数本表未用行；表未建如旧迁移链时当 0，不抛错）。 */
async function careWheelChancesLeft(db, childId) {
  return wheelChancesLeftFor(db, 'care_wheel_chances', childId);
}
/* 稀有转盘唯一途径（2026-11-14 用户令：只有期末考试成绩上传一个渠道；出题发机会已删）：期末考试成绩优秀。条件：unit 含“期末”且 pct >= 95（95 分沿用高级转盘“优秀”口径；
 * 不要求照片——任务表未提照片要求；无周上限）。满足则 INSERT OR IGNORE 记 1 次。 */
async function maybeGrantRareWheelChance(db, childId, recordId, unit, pct, today, now) {
  if (!String(unit || '').includes('期末') || !(Number(pct) >= 95)) return false;
  return grantRareWheelChance(db, childId, 'final-exam', recordId, today, now);
}

/* 家长保存一条学校考试成绩（百分制折算；≥85 审核/保存后自动发普通奖励、≥95＋试卷照片记 1 次高级转盘机会）。 */
async function apiParentSchoolTestSave(db, env, req) {
  const body = await readJsonBody(req);
  const child = await getChild(db, Number(body.childId));
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const input = parseSchoolTestInput(body);
  if (input.err) return json({ ok: false, error: input.err }, 400);
  const ins = await insertSchoolTestRecord(db, env, child, input, 'active');
  if (ins.err) return json({ ok: false, error: ins.err }, 500);
  const today = shDateStr();
  const now = Math.floor(Date.now() / 1000);
  const { wheelChance, wheelReason } = await maybeGrantWheelChance(db, child.id, ins.recordId, input.subject, ins.pct, ins.photoKey, today, now);
  // 稀有转盘途径二（2026-11-07）：家长直登的期末 95+ 成绩发 1 次稀有机会（不要求照片、无周上限）
  await maybeGrantRareWheelChance(db, child.id, ins.recordId, input.unit, ins.pct, today, now);
  // 家长录入的已激活成绩同样自动发放普通奖励。
  const ordinary = ins.pct >= 85
    ? await grantSchoolTestOrdinary(db, { id: ins.recordId, child_id: child.id, status: 'active', pct: ins.pct, reward_granted: 0 }, today)
    : null;
  return json({ ok: true, record: { id: ins.recordId, childId: child.id, subject: input.subject, unit: input.unit, score: input.score, fullScore: input.fullScore, pct: ins.pct, examDate: input.examDate, photoKey: ins.photoKey, rewardGranted: ordinary?.ok === true }, wheelChance, wheelReason, ordinary: ordinary ? (ordinary.ok ? { granted: ordinary.granted } : { error: ordinary.error }) : null });
}

/* 孩子上报一条学校考试成绩（2026-10-27：入口从家长端横幅移到孩子端）。
 * 只写 status='pending' 的记录，不发高级转盘机会、不发奖励——等家长在审核 tab 通过后，
 * 再按同一口径记高级转盘机会（≥95＋照片），85 分以上自动发普通奖励。 */
async function apiChildSchoolTestSubmit(db, env, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const input = parseSchoolTestInput(body);
  if (input.err) return json({ ok: false, error: input.err }, 400);
  const ins = await insertSchoolTestRecord(db, env, child, input, 'pending');
  if (ins.err) return json({ ok: false, error: ins.err }, 500);
  return json({ ok: true, record: { id: ins.recordId, childId: child.id, subject: input.subject, unit: input.unit, score: input.score, fullScore: input.fullScore, pct: ins.pct, examDate: input.examDate, photoKey: ins.photoKey, status: 'pending' } });
}

/* 孩子查自己上报的学校成绩（状态：pending 待审核／active 已通过／rejected 已驳回／void 已作废）。 */
async function apiChildSchoolTests(db, req, session) {
  const url = new URL(req.url);
  const sc = scopeChildId(session, url.searchParams.get('childId'));
  if (sc.err) return sc.err;
  const { results } = await db.prepare(
    'SELECT * FROM school_test_records WHERE child_id=? ORDER BY id DESC LIMIT 20'
  ).bind(sc.id).all();
  const out = [];
  for (const r of results) {
    const ch = await db.prepare('SELECT id, used_epoch FROM wheel_chances WHERE school_test_id=?').bind(r.id).first();
    out.push({
      id: r.id, subject: r.subject, unit: r.unit, score: r.score, fullScore: r.full_score, pct: r.pct,
      examDate: r.exam_date, hasPhoto: !!r.photo_key, status: r.status,
      rewardGranted: !!r.reward_granted, rewardItemKey: r.reward_item_key || null,
      wheelChance: !ch ? 'none' : (ch.used_epoch ? 'spun' : 'pending'),
    });
  }
  return json({ ok: true, records: out });
}

/* 家长审核孩子上报的学校成绩（审核 tab；与打卡审核同一入口感）。
 * 通过：status pending→active（CAS，防重复审核），再按同一口径记高级转盘机会；
 * 85 分以上审核通过后自动发放普通奖励（普通随机一次），不再走手动发放。
 * 驳回：status pending→rejected；pending 记录从未记过高级转盘机会，无需清理。 */
async function apiParentSchoolTestReview(db, req) {
  const body = await readJsonBody(req);
  const rec = await db.prepare('SELECT * FROM school_test_records WHERE id=?').bind(Number(body.recordId)).first();
  if (!rec) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (rec.status !== 'pending') return json({ ok: false, error: '这条成绩已经审核过了' }, 400);
  const decision = body.decision;
  if (decision === 'reject') {
    const upd = await db.prepare("UPDATE school_test_records SET status='rejected' WHERE id=? AND status='pending'").bind(rec.id).run();
    if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: '这条成绩已经审核过了' }, 400);
    await syncTouch(db, rec.child_id, 'school_test_records', 'id=?', [rec.id]);
    return json({ ok: true, rejected: true });
  }
  if (decision !== 'approve') return json({ ok: false, error: '参数不对' }, 400);
  const upd = await db.prepare("UPDATE school_test_records SET status='active' WHERE id=? AND status='pending'").bind(rec.id).run();
  if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: '这条成绩已经审核过了' }, 400);
  await syncTouch(db, rec.child_id, 'school_test_records', 'id=?', [rec.id]);
  const today = shDateStr();
  const now = Math.floor(Date.now() / 1000);
  const photoOk = rec.photo_key && (!rec.photo_expires_epoch || rec.photo_expires_epoch >= now) ? rec.photo_key : null;
  const { wheelChance, wheelReason } = await maybeGrantWheelChance(db, rec.child_id, rec.id, rec.subject, rec.pct, photoOk, today, now);
  // 稀有转盘途径二（2026-11-07）：审核通过的期末 95+ 成绩发 1 次稀有机会（不要求照片、无周上限）
  await maybeGrantRareWheelChance(db, rec.child_id, rec.id, rec.unit, rec.pct, today, now);
  // 85 分以上审核通过后自动发放普通奖励；不影响已激活状态和高级转盘机会。
  const ordinary = rec.pct >= 85
    ? await grantSchoolTestOrdinary(db, { ...rec, status: 'active' }, today)
    : null;
  return json({ ok: true, approved: true, wheelChance, wheelReason, ordinary: ordinary ? (ordinary.ok ? { granted: ordinary.granted } : { error: ordinary.error }) : null, record: { id: rec.id, childId: rec.child_id, subject: rec.subject, unit: rec.unit, score: rec.score, fullScore: rec.full_score, pct: rec.pct, examDate: rec.exam_date, rewardGranted: ordinary?.ok === true } });
}

/* 家长看孩子上报的试卷照片（审核时核对用；PIN 会话；照片 15 天到期后 404）。 */
async function apiParentSchoolPhoto(db, env, recordId) {
  const rec = await db.prepare('SELECT * FROM school_test_records WHERE id=?').bind(recordId).first();
  if (!rec || !rec.photo_key) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const now = Math.floor(Date.now() / 1000);
  if (rec.photo_expires_epoch && rec.photo_expires_epoch < now) return json({ ok: false, error: '照片已过期' }, 404);
  if (!env.PHOTOS) return json({ ok: false, error: '照片功能还没开通' }, 503);
  const obj = await env.PHOTOS.get(rec.photo_key);
  if (!obj) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const ct = rec.photo_key.endsWith('.png') ? 'image/png' : rec.photo_key.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  return new Response(obj.body, { headers: { 'Content-Type': ct, 'Cache-Control': 'private, max-age=3600' } });
}

/* 家长查学校成绩列表（附高级转盘机会状态；照片 15 天到期懒删，只留文字档案） */
async function apiParentSchoolTests(db, env, req) {
  const url = new URL(req.url);
  const childId = Number(url.searchParams.get('childId')) || null;
  const { results } = await db.prepare(
    childId
      ? 'SELECT * FROM school_test_records WHERE child_id=? ORDER BY exam_date DESC, id DESC LIMIT 100'
      : 'SELECT * FROM school_test_records ORDER BY exam_date DESC, id DESC LIMIT 100'
  ).bind(...(childId ? [childId] : [])).all();
  const now = Math.floor(Date.now() / 1000);
  const out = [];
  for (const r of results) {
    let photoKey = r.photo_key;
    let photoExpired = false;
    if (photoKey && r.photo_expires_epoch && r.photo_expires_epoch < now) {
      await photoDelete(env, photoKey);
      await db.prepare('UPDATE school_test_records SET photo_key=NULL, photo_expires_epoch=NULL WHERE id=?').bind(r.id).run();
      photoKey = null; photoExpired = true;
    }
    const ch = await db.prepare('SELECT id, used_epoch FROM wheel_chances WHERE school_test_id=?').bind(r.id).first();
    out.push({
      id: r.id, childId: r.child_id, subject: r.subject, unit: r.unit,
      score: r.score, fullScore: r.full_score, pct: r.pct, examDate: r.exam_date,
      photoKey, photoExpired, photoExpiresEpoch: r.photo_expires_epoch,
      rewardGranted: !!r.reward_granted, rewardItemKey: r.reward_item_key || null,
      status: r.status, wheelChance: !ch ? 'none' : (ch.used_epoch ? 'spun' : 'pending'),
      createdAt: r.created_epoch,
    });
  }
  return json({ ok: true, childId, records: out });
}

/* 家长按学校成绩发放奖励（v11 §2.3）：≥85、每条记录最多一次、固定数量 1；
 * 大师球禁发（仅兑换获得）、梦幻蛋禁发；蛋走去重、球走球列、其余走背包。 */
/* 普通奖励先 CAS 占位再落账；落账失败不撤销占位，交由调用方返回 500（与高级转盘先占位后发奖同口径）。 */
async function grantSchoolTestOrdinary(db, rec, today, rng = Math.random) {
  if (rec.status !== 'active') return { ok: false, error: rec.status === 'pending' ? '这条成绩还在等审核，通过后才能发放奖励哦' : rec.status === 'rejected' ? '这条成绩已被驳回，不能发放奖励哦' : '这条成绩已经作废啦' };
  if ((rec.pct ?? 0) < 85) return { ok: false, error: '要 85 分以上才能发放奖励哦' };
  if (rec.reward_granted) return { ok: false, error: 'ALREADY_REWARDED' };
  const rolled = rollSchoolOrdinary(rng);
  const now = Math.floor(Date.now() / 1000);
  const claim = await db.prepare("UPDATE school_test_records SET reward_granted=1, reward_item_key=?, reward_granted_epoch=? WHERE id=? AND reward_granted=0")
    .bind(rolled.key, now, rec.id).run();
  if (!claim.meta || !claim.meta.changes) return { ok: false, error: 'ALREADY_REWARDED' };
  const childId = rec.child_id;
  const granted = { ...rolled };
  if (rolled.kind === 'ball') {
    await addBalls(db, childId, 'normal', 1, today);
  } else if (rolled.kind === 'xp') {
    const child = await getChild(db, childId);
    granted.xpInfo = await grantXp(db, child, SCHOOL_ORDINARY_XP, today);
    await db.prepare('INSERT INTO item_grants(child_id, source, ref_id, item_key, qty, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
      .bind(childId, 'school-test', rec.id, 'xp:20', 1, now, today).run();
  } else if (rolled.kind === 'medicine') {
    await addItem(db, childId, rolled.key, 1, 'school-test', 'school_test', rec.id, today);
  }
  await syncTouch(db, childId, 'school_test_records', 'id=?', [rec.id]);
  return { ok: true, granted };
}

/* 家长按学校成绩补发普通奖励（自动随机，不再手动选道具）：已激活且 reward_granted=0 的记录可补发一次；
 * 正式站推送时大宝 100 分记录（高级转盘已抽、reward_granted=0）即走此入口补发。 */
async function apiParentSchoolTestGrant(db, req) {
  const body = await readJsonBody(req);
  const rec = await db.prepare('SELECT * FROM school_test_records WHERE id=?').bind(Number(body.recordId)).first();
  if (!rec) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (rec.status !== 'active') return json({ ok: false, error: rec.status === 'pending' ? '这条成绩还在等审核，通过后才能发放奖励哦' : rec.status === 'rejected' ? '这条成绩已被驳回，不能发放奖励哦' : '这条成绩已经作废啦' }, 400);
  if ((rec.pct ?? 0) < 85) return json({ ok: false, error: '要 85 分以上才能发放奖励哦' }, 400);
  if (rec.reward_granted) return json({ ok: false, error: 'ALREADY_REWARDED' }, 409);
  const today = shDateStr();
  const ordinary = await grantSchoolTestOrdinary(db, rec, today);
  if (!ordinary.ok) return json({ ok: false, error: ordinary.error }, ordinary.error === 'ALREADY_REWARDED' ? 409 : 400);
  return json({ ok: true, granted: ordinary.granted, recordId: rec.id });
}

/* 家长作废一条学校成绩：未转机会随记录作废同步取消（2026-10-26 用户定）；已发奖／已转过的不让作废 */
async function apiParentSchoolTestVoid(db, env, req) {
  const body = await readJsonBody(req);
  const rec = await db.prepare('SELECT * FROM school_test_records WHERE id=?').bind(Number(body.recordId)).first();
  if (!rec) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (rec.status !== 'active') return json({ ok: false, error: '这条成绩已经作废啦' }, 400);
  if (rec.reward_granted) return json({ ok: false, error: '已经发放过奖励的成绩不能作废哦' }, 400);
  const ch = await db.prepare('SELECT id, week_start, used_epoch FROM wheel_chances WHERE school_test_id=?').bind(rec.id).first();
  if (ch && ch.used_epoch) return json({ ok: false, error: '高级转盘机会已经用过啦，不能作废哦' }, 400);
  await db.prepare("UPDATE school_test_records SET status='void' WHERE id=? AND status='active'").bind(rec.id).run();
  await syncTouch(db, rec.child_id, 'school_test_records', 'id=?', [rec.id]);
  if (rec.photo_key) await photoDelete(env, rec.photo_key);
  if (ch) {
    await db.prepare('DELETE FROM wheel_chances WHERE id=? AND used_epoch IS NULL').bind(ch.id).run();
    {
      const v = await bumpChildVersion(db, rec.child_id);
      await recordTombstone(db, rec.child_id, 'wheel_chances', ch.id, v);
    }
    await db.prepare('UPDATE wheel_week_quotas SET count=count-1 WHERE child_id=? AND week_start=? AND subject=? AND count>0')
      .bind(rec.child_id, ch.week_start, rec.subject).run();
  }
  return json({ ok: true, voided: true });
}

/* 孩子转高级转盘（v11 §2.4）：耗 1 次机会、归一化掷骰、全池为空禁转不扣机会；
 * 先占位（CAS）再发奖，奖品走 grantEgg/addBalls/addItem 各自的审计口径。 */
async function apiEvoWheelSpin(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const now = Math.floor(Date.now() / 1000);
    // 两表并取最旧一条未用机会（学校 wheel_chances ＋ 进化 evo_wheel_grants，按 created_epoch 先到先转）
    let ch = await db.prepare(
      `SELECT id, 'wheel' AS src, created_epoch FROM wheel_chances WHERE child_id=? AND used_epoch IS NULL
     UNION ALL
     SELECT id, 'evo' AS src, created_epoch FROM evo_wheel_grants WHERE child_id=? AND used_epoch IS NULL
     ORDER BY created_epoch ASC, id ASC LIMIT 1`
    ).bind(child.id, child.id).first();
    /* 任务 124：放行且没有机会时，往 evo_wheel_grants 补一次（step_key 唯一），走正常占位/发奖流程，
     * 转完即消耗，可反复转；不放行时仍按原规则报没有机会。 */
    if (!ch && GATES_OPEN_FULL) {
      const ws = weekStartMon(today);
      await db.prepare(
        `INSERT OR IGNORE INTO evo_wheel_grants(child_id, step_key, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)`
      ).bind(child.id, `debug-${now}-${Math.floor(Math.random() * 1e9)}`, ws, now, today).run();
      ch = await db.prepare(
        `SELECT id, 'wheel' AS src, created_epoch FROM wheel_chances WHERE child_id=? AND used_epoch IS NULL
     UNION ALL
     SELECT id, 'evo' AS src, created_epoch FROM evo_wheel_grants WHERE child_id=? AND used_epoch IS NULL
     ORDER BY created_epoch ASC, id ASC LIMIT 1`
      ).bind(child.id, child.id).first();
    }
    if (!ch) return json({ ok: false, error: '没有高级转盘机会哦，考 95 分以上并上传试卷照片可以获得一次' }, 400);
    const owned = GATES_OPEN ? new Set() : await ownedSpeciesSet(db, child.id);
    const ownedEggs = GATES_OPEN ? new Set() : await pendingEggSpeciesSet(db, child.id);
    const prize = rollWheelPrize(Math.random, owned, ownedEggs);
    if (!prize) return json({ ok: false, error: '奖池里的东西都有啦，这次转不了' }, 400);
    const claimTable = ch.src === 'evo' ? 'evo_wheel_grants' : 'wheel_chances';
    if (!(await claimWheelChance(db, claimTable, ch.id, now))) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
    if (ch.src === 'wheel') await syncTouch(db, child.id, 'wheel_chances', 'id=?', [ch.id]); // evo 表不进同步层，不 touch
    const chanceRefType = ch.src === 'evo' ? 'evo_wheel_grant' : 'wheel_chance';
    let awarded = null;
    if (prize.kind === 'egg') {
      const g = await grantEgg(db, child.id, prize.species, 'wheel', ch.id, today);
      if (!g.granted) {
        console.error('wheel spin egg grant failed after claim', { chanceId: ch.id, species: prize.species });
        return json({ ok: false, error: '发奖失败，请找爸爸妈妈看看' }, 500);
      }
      awarded = { kind: 'egg', species: prize.species, name: speciesName(prize.species), img: petImg(prize.species), unlockDate: g.unlockDate };
    } else if (prize.kind === 'ball') {
      await addBalls(db, child.id, 'hyper', 1, today);
      awarded = { kind: 'ball', key: 'ball:hyper', name: '高级球', emoji: '🟡' };
    } else if (prize.kind === 'medicine') {
      await addItem(db, child.id, prize.key, 1, 'wheel', chanceRefType, ch.id, today);
      awarded = { kind: 'medicine', key: prize.key, name: ITEM_CATALOG[prize.key].name, emoji: ITEM_CATALOG[prize.key].emoji };
    } else if (prize.kind === 'stone') {
      await addItem(db, child.id, prize.key, 1, 'wheel', chanceRefType, ch.id, today);
      awarded = { kind: 'stone', key: prize.key, name: ITEM_CATALOG[prize.key].name, emoji: ITEM_CATALOG[prize.key].emoji };
    }
    const left = await wheelChancesLeft(db, child.id);
    // 转盘升级（2026-11-07）：扇区由本次实际可用奖池算出（蛋档去重后为空时蛋扇区不出现），
    // winnerIndex 对应本次奖品（蛋奖品对应 'egg' 扇区）；奖池权重与机会规则一字不动。
    const { entries } = evoWheelEntries(owned, ownedEggs);
    const wheelBuilt = buildWheelSectors(entries);
    const winnerKey = prize.kind === 'egg' ? 'egg' : prize.key;
    return json({ ok: true, prize: awarded, chancesLeft: left, wheel: { ...wheelBuilt, winnerIndex: wheelWinnerIndex(wheelBuilt.sectors, winnerKey) } });
  });
}

/* 孩子转稀有转盘（2026-11-07 新建，仿 apiEvoWheelSpin）：耗 1 次稀有机会、奖品走 grantEgg 发蛋；
 * 先占位（CAS）再掷骰发奖；空池禁转不扣机会（占位已抢到时把 used_epoch 置回 NULL）。 */
async function apiRareWheelSpin(db, req, session) {
  return spinWheel(db, req, session, {
    table: 'rare_wheel_chances',
    noChanceMsg: '没有稀有转盘机会哦，出测验题或期末考试 95 分以上可以获得一次',
    emptyMsg: '奖池里的都拥有啦，这次转不了',
    onEmptyPool: 'refund', // 稀有盘独有：空池禁转不扣机会
    async prepare(db, child) {
      const owned = await ownedSpeciesSet(db, child.id);
      const ownedEggs = await pendingEggSpeciesSet(db, child.id);
      return { owned, ownedEggs };
    },
    roll: (ctx) => rollRareWheelPrize(Math.random, ctx.owned, ctx.ownedEggs),
    async award(db, child, ch, prize, today) {
      const g = await grantEgg(db, child.id, prize.species, 'rare-wheel', ch.id, today);
      if (!g.granted) {
        console.error('rare wheel spin egg grant failed after claim', { chanceId: ch.id, species: prize.species });
        return { err: json({ ok: false, error: '发奖失败，请找爸爸妈妈看看' }, 500) };
      }
      return { prize: { kind: 'egg', species: prize.species, name: speciesName(prize.species), img: petImg(prize.species), unlockDate: g.unlockDate } };
    },
    wheel(ctx, prize) {
      const { owned, ownedEggs } = ctx;
      const avail = {
        legendary: RARE_WHEEL_LEGENDARIES.filter((n) => !owned.has(n) && !ownedEggs.has(n)),
        eevee: RARE_WHEEL_EEVEE.filter((n) => !owned.has(n) && !ownedEggs.has(n)),
        final: RARE_WHEEL_FINALS.filter((n) => !owned.has(n) && !ownedEggs.has(n)),
      };
      const wheelBuilt = rareWheelSectors(avail);
      return { ...wheelBuilt, winnerIndex: wheelWinnerIndex(wheelBuilt.sectors, rareSectorKeyFor(prize)) };
    },
  });
}

/* 孩子转养成转盘（2026-11-08 新建，仿 apiRareWheelSpin）：耗 1 次养成机会、奖品走 addItem 发照顾道具；
 * 先占位（CAS）再掷骰发奖；只消耗 care_wheel_chances，不动 wheel_chances、不触 WHEEL_WEEK_LIMIT
 *（周上限仅限高级转盘）。奖池 10 样全是 care:*，抽中必为其一。 */
async function apiCareWheelSpin(db, req, session) {
  return spinWheel(db, req, session, {
    table: 'care_wheel_chances',
    noChanceMsg: '没有养成转盘机会哦，完成今日 5 句每日英语跟读可以获得一次',
    // 养成盘无空池分支（奖池 10 样全是 care:*，抽中必为其一），不传 emptyMsg / onEmptyPool
    roll: () => rollCareWheelPrize(Math.random),
    async award(db, child, ch, prizeKey, today) {
      await addItem(db, child.id, prizeKey, 1, 'care-wheel', 'care_wheel_chance', ch.id, today);
      const cat = ITEM_CATALOG[prizeKey] || {};
      return { prize: { kind: 'item', key: prizeKey, name: cat.name || prizeKey, emoji: cat.emoji || '🎁' } };
    },
    wheel: (ctx, prizeKey) => careWheelFor(prizeKey),
  });
}

/* -------- App 内单元测试（v11 路径 B） -------- */

/* 单元测试选题：数学／语文／英语仅取当前进度内所选单元的已激活题（无 chapter 不使用，新门 fail-closed）；其余科目按科目＋单元取。
 * 首期 20 道等权；题量不足 20 时按实际题数出（≥5 才开），分数按百分比折算。 */
async function pickUnitTestQuestions(db, child, subject, unit, count, rng = Math.random) {
  const { results: all } = await db.prepare('SELECT * FROM quiz_questions').all();
  const rows = all.map(normalizeQuizRow).filter((q) => q.active);
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const mathGate = subject === '数学' ? await loadMathGate(db, child) : null;
  const chineseGate = subject === '语文' ? await loadChineseGate(db, child) : null;
  const englishGate = subject === '英语' ? await loadEnglishGate(db, child) : null;
  const cands = rows.filter((q) => {
    if (q.kind === 'oak') return false;
    if (q.kind === 'riddle') return false;
    if (q.subject !== subject) return false;
    if (!(q.grade === gradeNum || q.grade == null)) return false;
    if (subject === '数学') {
      if (!q.chapter || q.chapter !== unit) return false; // 无 chapter 不使用
      return mathGatePass(q, mathGate);
    }
    if (subject === '语文') {
      if (q.chapter === '通用复习') return false; // 通用复习题不进单元测试
      if (!q.chapter || q.chapter !== unit) return false; // 无 chapter 不使用（与数学同模式，新门 fail-closed）
      return chineseGatePass(q, chineseGate);
    }
    if (subject === '英语') {
      if (q.chapter === '通用复习') return false; // 通用复习题不进单元测试
      if (!q.chapter || q.chapter !== unit) return false; // 无 chapter 不使用（与数学同模式，新门 fail-closed）
      return englishGatePass(q, englishGate);
    }
    if (q.chapter && q.chapter !== unit) return false;
    return true;
  });
  const arr = [...cands];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

/* 家长开启一次单元测试：20 道等权（题量不足时按实际题数，≥5 才开）；
 * 同孩子／科目／单元重开冷却 24 小时；每孩每上海自然周最多 3 次机会（开局时计数）。 */
async function apiParentUnitTestStart(db, req) {
  const body = await readJsonBody(req);
  const child = await getChild(db, Number(body.childId));
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const subject = String(body.subject || '');
  if (!QUIZ_SUBJECTS.includes(subject)) return json({ ok: false, error: '科目只能选 语文/数学/英语/阅读' }, 400);
  const unit = String(body.unit || '').trim().slice(0, 40);
  if (!unit) return json({ ok: false, error: '单元不能为空' }, 400);
  const today = shDateStr();
  const now = Math.floor(Date.now() / 1000);
  // 冷却：同孩子／科目／单元 24 小时内开过就不再开
  const last = await db.prepare('SELECT created_epoch FROM unit_tests WHERE child_id=? AND subject=? AND unit=? ORDER BY created_epoch DESC LIMIT 1')
    .bind(child.id, subject, unit).first();
  if (!GATES_OPEN && last && now - (last.created_epoch || 0) < UNIT_TEST_COOLDOWN_SECS) {
    return json({ ok: false, error: '这个单元 24 小时内已经开过一次啦，明天再来吧' }, 400);
  }
  const questions = await pickUnitTestQuestions(db, child, subject, unit, UNIT_TEST_QUESTION_COUNT);
  if (questions.length < 5) {
    return json({ ok: false, error: `这个单元的题目还不够（只有 ${questions.length} 道，至少要 5 道）` }, 400);
  }
  // 周限额原子计数（开局时计数，中奖与否均计数）：已有行且 count<3 才 +1，无行先插首行
  const ws = weekStartMon(today);
  if (!GATES_OPEN) {
  const inc = await db.prepare('UPDATE draw_week_quotas SET count=count+1 WHERE child_id=? AND week_start=? AND count<?')
    .bind(child.id, ws, UNIT_TEST_WEEK_LIMIT).run();
  if (!inc.meta || !inc.meta.changes) {
    const insQ = await db.prepare('INSERT OR IGNORE INTO draw_week_quotas(child_id, week_start, count) VALUES(?,?,1)')
      .bind(child.id, ws).run();
    if (!insQ.meta || !insQ.meta.changes) {
      const inc2 = await db.prepare('UPDATE draw_week_quotas SET count=count+1 WHERE child_id=? AND week_start=? AND count<?')
        .bind(child.id, ws, UNIT_TEST_WEEK_LIMIT).run();
      if (!inc2.meta || !inc2.meta.changes) {
        return json({ ok: false, error: '本周的单元测试机会已经用完啦（每周最多 3 次）' }, 400);
      }
    }
  }
  }
  const qSnap = questions.map((q) => ({ id: q.id, question: q.question, options: q.options, answer_idx: q.answer_idx, explain: q.explain || '' }));
  const ins = await db.prepare(
    "INSERT INTO unit_tests(child_id, subject, unit, question_ids, status, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?, 'open',?,?,?)"
  ).bind(child.id, subject, unit, JSON.stringify(qSnap.map((q) => q.id)), ws, now, today).run();
  const testId = ins.meta ? Number(ins.meta.last_row_id) : null;
  if (ins.meta && ins.meta.changes > 0) {
    await syncTouch(db, child.id, 'unit_tests', 'id=?', [testId]);
  }
  if (!testId) return json({ ok: false, error: '开启失败' }, 500);
  await db.batch(qSnap.map((q) =>
    db.prepare('INSERT INTO unit_test_questions(unit_test_id, question_id, question_json) VALUES(?,?,?)')
      .bind(testId, q.id, JSON.stringify(q))
  ));
  return json({
    ok: true,
    test: {
      id: testId, childId: child.id, subject, unit, questionCount: qSnap.length,
      questions: qSnap.map((q) => ({ id: q.id, question: q.question, options: q.options })),
    },
  });
}

/* 孩子取单元测试（最新一次未答的＋最近 5 次记录） */
async function apiChildUnitTest(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('childId'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const open = await db.prepare("SELECT * FROM unit_tests WHERE child_id=? AND status='open' ORDER BY created_epoch DESC LIMIT 1")
    .bind(child.id).first();
  let openTest = null;
  if (open) {
    const { results: qs } = await db.prepare('SELECT question_json FROM unit_test_questions WHERE unit_test_id=? ORDER BY id')
      .bind(open.id).all();
    openTest = {
      id: open.id, subject: open.subject, unit: open.unit, questionCount: qs.length,
      questions: qs.map((r) => {
        const q = JSON.parse(r.question_json);
        return { id: q.id, question: q.question, options: q.options };
      }),
    };
  }
  const { results: recent } = await db.prepare("SELECT * FROM unit_tests WHERE child_id=? AND status='submitted' ORDER BY submitted_epoch DESC LIMIT 5")
    .bind(child.id).all();
  const draws = {};
  if (recent.length) {
    const { results: dr } = await db.prepare(`SELECT * FROM unit_test_draws WHERE unit_test_id IN (${recent.map(() => '?').join(',')})`)
      .bind(...recent.map((r) => r.id)).all();
    for (const d of dr) draws[d.unit_test_id] = d;
  }
  return json({
    ok: true,
    openTest,
    recent: recent.map((r) => ({
      id: r.id, subject: r.subject, unit: r.unit, score: r.score,
      correctCount: r.correct_count, total: r.total_count, submittedAt: r.submitted_epoch,
      draw: draws[r.id] ? { won: !!draws[r.id].won, prizeKey: draws[r.id].prize_key || null } : null,
    })),
  });
}

/* 孩子提交单元测试：计分（百分比）→ 85 分以上抽奖；测试题不产生每日经验或掉球，不触发 §9 日常事件 */
async function apiChildUnitTestSubmit(db, req, session) {
  return withChild(db, req, session, async (child, body) => {
    const testId = Number(body.testId);
    const test = await db.prepare('SELECT * FROM unit_tests WHERE id=?').bind(testId).first();
    if (!test) return json({ ok: false, error: 'NOT_FOUND' }, 404);
    if (test.child_id !== child.id) return json({ ok: false, error: 'FORBIDDEN' }, 403);
    if (test.status !== 'open') return json({ ok: false, error: '这场测试已经交过啦' }, 400);
    const { results: qs } = await db.prepare('SELECT question_id, question_json FROM unit_test_questions WHERE unit_test_id=? ORDER BY id')
      .bind(testId).all();
    if (!qs.length) return json({ ok: false, error: '这场测试没有题目' }, 400);
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const byId = new Map(answers.map((a) => [Number(a && a.questionId), a ? a.answerIdx : undefined]));
    let correctCount = 0;
    const answerRows = [];
    for (const row of qs) {
      const q = JSON.parse(row.question_json);
      const raw = byId.get(Number(q.id));
      const ok = raw !== undefined && raw !== null && Number(raw) === q.answer_idx;
      if (ok) correctCount++;
      answerRows.push({ questionId: Number(q.id), correct: ok });
    }
    const total = qs.length;
    const score = Math.round((correctCount / total) * 100);
    const today = shDateStr();
    const now = Math.floor(Date.now() / 1000);
    // 先把测试行条件改成已交（防重复提交；发奖只在 CAS 成功后做，否则会发双份）
    const upd = await db.prepare("UPDATE unit_tests SET status='submitted', score=?, correct_count=?, total_count=?, submitted_epoch=? WHERE id=? AND status='open'")
      .bind(score, correctCount, total, now, testId).run();
    if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
    const version = await syncTouch(db, child.id, 'unit_tests', 'id=?', [testId]);
    await db.batch(answerRows.map((a) =>
      db.prepare('INSERT INTO unit_test_answers(unit_test_id, question_id, correct, created_epoch) VALUES(?,?,?,?)')
        .bind(testId, a.questionId, a.correct ? 1 : 0, now)
    ));
    // 抽奖：85 分以上才掷；中奖率 85–89 40%、90–94 50%、95–100 60%
    let draw = null;
    if (score >= 85) {
      const winChance = unitTestWinChance(score);
      const won = rollRng(Math.random) < winChance;
      let prize = null;
      if (won) {
        const owned = GATES_OPEN ? new Set() : await ownedSpeciesSet(db, child.id);
        const ownedEggs = GATES_OPEN ? new Set() : await pendingEggSpeciesSet(db, child.id);
        const rolled = rollUnitTestPrize(Math.random, owned, ownedEggs, new Set());
        if (rolled && rolled.kind !== 'none') {
          prize = rolled;
          if (rolled.kind === 'egg') {
            const g = await grantEgg(db, child.id, rolled.species, 'unit-test', testId, today);
            if (g.granted) prize = { ...rolled, unlockDate: g.unlockDate, name: speciesName(rolled.species) };
            else prize = null; // 极小概率竞态：蛋已在别处获得，本次按未中奖计
          } else if (rolled.kind === 'ball') {
            const ballKind = rolled.key === 'ball:super' ? 'super' : 'hyper';
            await addBalls(db, child.id, ballKind, 1, today);
            prize = { ...rolled, ballKind, name: ballKind === 'super' ? '超级球' : '高级球' };
          } else {
            await addItem(db, child.id, rolled.key, 1, 'unit-test', 'unit_test', testId, today);
            prize = { ...rolled, name: ITEM_CATALOG[rolled.key].name };
          }
        }
      }
      draw = { won: won && !!prize, prizeKey: prize ? (prize.key || prize.kind) : null, prize };
      const drawIns = await db.prepare('INSERT INTO unit_test_draws(unit_test_id, won, prize_key, created_epoch) VALUES(?,?,?,?)')
        .bind(testId, draw.won ? 1 : 0, draw.prizeKey, now).run();
      if (drawIns.meta && drawIns.meta.changes > 0) {
        await touchRow(db, 'unit_test_draws', 'id=?', [Number(drawIns.meta.last_row_id)], version);
      }
    }
    return json({
      ok: true, testId, score, correctCount, total,
      won: draw ? draw.won : false,
      prize: draw ? draw.prize : null,
    });
  });
}

/* ---------------- 路由 ---------------- */

const STATIC_PREFIXES = ['/static/', '/favicon.ico'];

/* ================= 假期合作道馆（批 1，2026-10-22） =================
   总开关：settings.coop_master_enabled（家长设置，默认关）；关时孩子端不可见、全部 coop 接口拒绝。
   规格：DESIGN-假期合作-批1实施设计-v1.md。合力破盾不实现，仅预留字段/钩子。 */

// ===== 合作道馆：地图配置（批 1） =====

// 合作道馆奖励类型白名单（禁止 xp / egg 等其他类型）
const COOP_REWARD_TYPES = ['node_badge', 'node_sticker', 'expedition_badge', 'story_card'];

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

const COOP_DEFAULT_MAP_VERSION = 'coop-m1.v1';

// 取指定版本的节点数组，找不到返回 []
function coopMapNodes(mapVersion) {
  const map = COOP_MAPS[mapVersion];
  return map && Array.isArray(map.nodes) ? map.nodes : [];
}

// 取指定版本的单个节点，找不到返回 null
function coopNode(mapVersion, nodeId) {
  return coopMapNodes(mapVersion).find(n => n.node_id === nodeId) || null;
}

// 奖励幂等引用键
function coopRewardRef(mapVersion, node, rewardType) {
  switch (rewardType) {
    case 'node_badge': return `coop:${mapVersion}:${node.node_id}:badge`;
    case 'node_sticker': return `coop:${mapVersion}:${node.node_id}:sticker`;
    case 'expedition_badge': return `coop:${mapVersion}:expedition`;
    case 'story_card': return `coop:${mapVersion}:${node.node_id}:story`;
    default: return null;
  }
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

// 奖励落到孩子资产的字段；story_card 只记发放明细，不写资产数组
function coopRewardAsset(node, rewardType) {
  const value = coopRewardLabel(node, rewardType);
  switch (rewardType) {
    case 'node_badge':
    case 'expedition_badge':
      return { field: 'titles', value };
    case 'node_sticker':
      return { field: 'stickers', value };
    case 'story_card':
      return { field: null, value };
    default:
      return { field: null, value: null };
  }
}

// 校验地图配置
function validateCoopMap(map) {
  const errors = [];
  if (!map || !Array.isArray(map.nodes)) {
    return { ok: false, errors: ['地图缺少 nodes 数组'] };
  }
  const nodes = map.nodes;
  const KIND_ORDER = ['normal', 'normal', 'normal', 'elite', 'final'];
  if (nodes.length !== 5) errors.push(`节点数应为 5，实际 ${nodes.length}`);

  // node_id 唯一
  const ids = new Set();
  for (const n of nodes) {
    if (!n || typeof n.node_id !== 'string' || !n.node_id) {
      errors.push('存在缺少 node_id 的节点');
      continue;
    }
    if (ids.has(n.node_id)) errors.push(`node_id 重复：${n.node_id}`);
    ids.add(n.node_id);
  }

  // kind 顺序与 next 单链
  nodes.forEach((n, i) => {
    if (!n) return;
    if (i < KIND_ORDER.length && n.kind !== KIND_ORDER[i]) {
      errors.push(`${n.node_id}: kind 应为 ${KIND_ORDER[i]}，实际 ${n.kind}`);
    }
    if (i < nodes.length - 1) {
      const nextId = nodes[i + 1] && nodes[i + 1].node_id;
      if (n.next !== nextId) errors.push(`${n.node_id}: next 应为 ${nextId}，实际 ${n.next}`);
    } else if (n.next !== null) {
      errors.push(`${n.node_id}: 末节点 next 必须为 null`);
    }
  });

  // 无环检查：从首节点沿 next 走
  if (nodes.length && nodes[0]) {
    const byId = new Map(nodes.filter(Boolean).map(n => [n.node_id, n]));
    const seen = new Set();
    let cur = nodes[0];
    while (cur) {
      if (seen.has(cur.node_id)) { errors.push(`next 链存在环：${cur.node_id}`); break; }
      seen.add(cur.node_id);
      cur = cur.next == null ? null : byId.get(cur.next) || null;
    }
  }

  // 逐节点字段校验
  for (const n of nodes) {
    if (!n) continue;
    const id = n.node_id;
    const strong = n.kind === 'elite' || n.kind === 'final';

    if (!Array.isArray(n.rewards)) {
      errors.push(`${id}: rewards 必须为数组`);
    } else {
      for (const r of n.rewards) {
        const t = r && r.type;
        if (!COOP_REWARD_TYPES.includes(t)) errors.push(`${id}: 非法奖励类型 ${t}`);
      }
    }

    const moves = Array.isArray(n.bossMoves) ? n.bossMoves : [];
    if (!moves.length) errors.push(`${id}: bossMoves 不能为空`);
    for (const m of moves) {
      if (!Array.isArray(m) || m.length !== 3 || typeof m[0] !== 'string' || !m[0]) {
        errors.push(`${id}: 招式格式应为 [名, 属性, 威力]`);
        continue;
      }
      if (!TYPES.includes(m[1])) errors.push(`${id}: 招式 ${m[0]} 属性非法 ${m[1]}`);
      if (typeof m[2] !== 'number' || !(m[2] > 0)) errors.push(`${id}: 招式 ${m[0]} 威力须为正数`);
    }
    const moveNames = moves.filter(Array.isArray).map(m => m[0]);

    if (n.sweep === true) {
      if (!strong) errors.push(`${id}: 仅 elite/final 可开启 sweep`);
      if (!n.sweepMove) errors.push(`${id}: sweep 开启时 sweepMove 不能为空`);
      else if (!moveNames.includes(n.sweepMove)) errors.push(`${id}: sweepMove ${n.sweepMove} 不在 bossMoves 中`);
    }

    if (n.shield !== null && n.shield !== undefined) {
      if (!strong) errors.push(`${id}: 仅 elite/final 可设置 shield`);
      if (!Number.isInteger(n.shield) || n.shield <= 0) errors.push(`${id}: shield 须为正整数`);
    }

    const sp = SPECIES[n.bossNo];
    if (!sp) errors.push(`${id}: bossNo ${n.bossNo} 不存在`);
    else if (n.bossType !== sp.type) errors.push(`${id}: bossType ${n.bossType} 与图鉴属性 ${sp.type} 不一致`);

    if (typeof n.hpMult !== 'number' || !(n.hpMult > 0)) errors.push(`${id}: hpMult 须为大于 0 的数`);
    if (!Number.isInteger(n.levelOffset) || n.levelOffset < 0) errors.push(`${id}: levelOffset 须为 ≥0 的整数`);
    if (typeof n.timeBudgetSec !== 'number' || !(n.timeBudgetSec > 0)) errors.push(`${id}: timeBudgetSec 须为正数`);
  }

  return { ok: errors.length === 0, errors };
}

function coopAddShellLayer(pet, mult, by) {
  if (!pet) return false;
  if (!Array.isArray(pet.shellLayers)) pet.shellLayers = [];
  // 防御层上限 2 层
  if (pet.shellLayers.length >= 2) return false;
  pet.shellLayers.push({ mult, by });
  return true;
}

// 内部：找出下一次受击将被消费的层下标（优先 0.5，其次 0.7）
function coopShellLayerIndex(pet) {
  if (!pet || !Array.isArray(pet.shellLayers) || pet.shellLayers.length === 0) return -1;
  const layers = pet.shellLayers;
  let idx = layers.findIndex((l) => l && l.mult === 0.5);
  if (idx < 0) idx = layers.findIndex((l) => l && l.mult === 0.7);
  // 兜底：存在非常规倍率的层时按顺序消费首层
  if (idx < 0) idx = 0;
  return idx;
}

function coopPeekShellLayer(pet) {
  const idx = coopShellLayerIndex(pet);
  if (idx < 0) return null;
  return pet.shellLayers[idx] || null;
}

function coopConsumeShellLayer(pet) {
  const idx = coopShellLayerIndex(pet);
  if (idx < 0) return 1;
  const removed = pet.shellLayers.splice(idx, 1)[0];
  return removed && typeof removed.mult === 'number' ? removed.mult : 1;
}

// 内部：取招式列表中威力最大的招式（同威力取靠前者）
function coopStrongestMove(moves) {
  if (!Array.isArray(moves) || moves.length === 0) return null;
  let best = moves[0];
  for (let i = 1; i < moves.length; i++) {
    if ((moves[i].power || 0) > (best.power || 0)) best = moves[i];
  }
  return best;
}

function buildCoopBossSide(node, baseLevel) {
  const bossLevel = baseLevel + (node.levelOffset || 0);
  const species = SPECIES[node.bossNo] || { name: '未知', type: node.bossType };
  const moves = (node.bossMoves || []).map((m) => { const off = officialMove(m[0]); return { name: m[0], type: m[1], damage_class: off ? off.damage_class : undefined, power: m[2] }; });
  const pet = makePet({
    key: 'boss',
    name: species.name,
    type: node.bossType || species.type,
    no: node.bossNo,
    img: petImg(node.bossNo),
    level: bossLevel,
    moves,
    hpMult: node.hpMult,
  });
  // 馆主最大威力决定支援治疗量
  const maxPower = moves.reduce((mx, m) => Math.max(mx, m.power || 0), 0);
  const supportHealAmt = Math.max(1, Math.floor(maxPower * (0.5 + 0.05 * bossLevel) / 3));
  return {
    childId: null,
    childName: `馆主 · ${species.name}`,
    battleLevel: bossLevel,
    activeIdx: 0,
    pets: [pet],
    aggro: { seat: null, streak: 0 },
    sweep: { lastRound: null, count: 0 },
    supportHealAmt,
  };
}

function createCoopBattleState(node, sideA, sideB, baseLevel) {
  const bossSide = buildCoopBossSide(node, baseLevel);
  const st = createBattleState({ mode: 'coop', firstSide: 'A', sides: { A: sideA, B: sideB, BOSS: bossSide } });
  st.round_no = 1;
  st.nodeId = node.node_id;
  st.nodeKind = node.kind;
  sideA.role = 'fighter';
  sideA.support = { enteredRound: null, nextRound: null };
  sideB.role = 'fighter';
  sideB.support = { enteredRound: null, nextRound: null };
  // 初始化三方 fx
  fxOf(st, 'A');
  fxOf(st, 'B');
  fxOf(st, 'BOSS');
  fxOf(st, 'BOSS').telegraph = null;
  st.coop = { phase: 'choosing', ended: null };
  // 2a：馆主若带威吓，开局降双方攻击（createBattleState 只触发 A、B 两席）。
  {
    const openEvents = [];
    triggerSwitchIn(st, 'BOSS', openEvents);
    pushLog(st, openEvents);
  }
  return st;
}

function coopExpectedHit(move, bossPet, defPet) {
  // 桩 rng 恒 0.5：命中检定恒过、区间因子恒 0.93，且不触发暴击
  const r = calcDamage(move, bossPet, defPet, () => 0.5, { chart: 'official' });
  if (!r || r.error || typeof r.dmg !== 'number') return 0;
  return r.dmg;
}

function coopScoreTargets(st, move) {
  const out = { A: null, B: null };
  const bossFx = fxOf(st, 'BOSS');
  const bossSide = st.sides.BOSS;
  const bossLevel = bossSide.battleLevel;
  for (const S of ['A', 'B']) {
    const pet = activePetOf(st, S);
    if (!pet || pet.hp <= 0) continue;
    let score = 1.0;
    // 克制
    if (typeMult(move.type, pet.type) === 2) score *= 2.0;
    // 斩杀：只读估算期望伤害
    let exp = coopExpectedHit(move, activePetOf(st, 'BOSS'), pet);
    if (bossFx.charge) exp = Math.max(1, Math.round(exp * 1.5));
    if (typeof bossFx.weakNum === 'number') exp = Math.max(1, Math.round(exp * bossFx.weakNum));
    const layer = coopPeekShellLayer(pet);
    if (layer) exp = Math.max(1, Math.round(exp * layer.mult));
    if (pet.hp <= exp) score *= 2.5;
    // 威胁：玩家处于蓄力状态
    if (fxOf(st, S).charge) score *= 1.5;
    // 有盾
    if (Array.isArray(pet.shellLayers) && pet.shellLayers.length >= 1) score *= 0.6;
    // 仇恨上限：连续锁定同一席位
    const aggro = bossSide.aggro;
    if (aggro && aggro.seat === S && aggro.streak >= 2) score *= 0.5;
    out[S] = score;
  }
  return out;
}

function coopPickTarget(st, move, rng) {
  const sc = coopScoreTargets(st, move);
  const sA = sc.A;
  const sB = sc.B;
  if (sA === null && sB === null) return null;
  if (sA === null) return 'B';
  if (sB === null) return 'A';
  // 双席可选：恰好消耗 2 次 rng
  const r1 = rollRng(rng);
  const r2 = rollRng(rng);
  if (r1 < 0.85) {
    const total = sA + sB;
    const pA = total > 0 ? sA / total : 0.5;
    return r2 < pA ? 'A' : 'B';
  }
  return r2 < 0.5 ? 'A' : 'B';
}

function coopBossChoose(st, node, rng) {
  const none = { kind: 'none', moveName: null, targetSeat: null, fromLock: false, nextLock: null };
  const bossFx = fxOf(st, 'BOSS');
  const bossPet = activePetOf(st, 'BOSS');
  if (!bossPet || !Array.isArray(bossPet.moves) || bossPet.moves.length === 0) return none;
  const bossSide = st.sides.BOSS;
  const strongest = coopStrongestMove(bossPet.moves);

  // 1) 执行上回合蓄势锁定的动作（不消耗 rng）
  const tg = bossFx.telegraph;
  if (tg && tg.forRound === st.round_no) {
    const kind = tg.kind;
    return {
      kind,
      moveName: kind === 'sweep' ? node.sweepMove : strongest.name,
      targetSeat: tg.seat,
      fromLock: true,
      nextLock: null,
    };
  }

  // 2) 蓄势判定
  if (!bossFx.charge) {
    let pCharge = 0.25;
    for (const S of ['A', 'B']) {
      const p = activePetOf(st, S);
      if (p && p.hp <= p.maxHp * 0.3) {
        pCharge = 0.10;
        break;
      }
    }
    if (rollRng(rng) < pCharge) {
      const sw = bossSide.sweep || { lastRound: null, count: 0 };
      const sweepOk = !!node.sweep && st.round_no >= 2 && sw.count < 3 &&
        (sw.lastRound === null || (st.round_no + 1) - sw.lastRound >= 3);
      // 无论横扫可用与否都消耗一次，保证抽数确定
      const rKind = rollRng(rng);
      let nextLock = null;
      if (sweepOk && rKind < 0.5) {
        nextLock = { kind: 'sweep', seat: null };
      } else {
        let seat = coopPickTarget(st, strongest, rng);
        if (seat === null) {
          // 改锁任一可用席
          for (const S of ['A', 'B']) {
            const p = activePetOf(st, S);
            if (p && p.hp > 0) {
              seat = S;
              break;
            }
          }
        }
        if (seat !== null) nextLock = { kind: 'single', seat };
      }
      if (nextLock) {
        return { kind: 'charge', moveName: null, targetSeat: null, fromLock: false, nextLock };
      }
      // 无可锁定目标：本次不蓄势，落入攻击流程
    }
  }

  // 3) 攻击回合：按权重选招
  const sorted = bossPet.moves.slice().sort((a, b) => (b.power || 0) - (a.power || 0));
  const n = sorted.length;
  const wTop = n === 1 ? 1 : (bossFx.charge ? 0.6 : 0.5);
  const wRest = n > 1 ? (1 - wTop) / (n - 1) : 0;
  const r = rollRng(rng);
  let move = sorted[n - 1];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += i === 0 ? wTop : wRest;
    if (r < acc) {
      move = sorted[i];
      break;
    }
  }
  const targetSeat = coopPickTarget(st, move, rng);
  if (targetSeat === null) return none;
  return { kind: 'single', moveName: move.name, targetSeat, fromLock: false, nextLock: null };
}

function resolveCoopRound(st, acts, bossAction, rng = Math.random) {
  if (!st || st.mode !== 'coop') return { error: 'NOT_COOP' };
  if (st.coop && st.coop.ended) return { error: 'BATTLE_OVER' };

  const SEATS = ['A', 'B'];
  const FX_KINDS = ['weak', 'charge', 'smoke', 'shell'];
  const BOSS_KINDS = ['single', 'sweep', 'charge', 'none'];
  const otherSeat = (s) => (s === 'A' ? 'B' : 'A');
  acts = acts || {};

  // 按招式名在宠物招式表中查找（兼容对象或字符串）
  function findMove(pet, name) {
    if (!pet || !Array.isArray(pet.moves) || !name) return null;
    return pet.moves.find((m) => (typeof m === 'string' ? m : m && m.name) === name) || null;
  }
  // 取某席存活的上场宠，无则 null
  function aliveActive(seat) {
    const p = activePetOf(st, seat);
    return p && p.hp > 0 ? p : null;
  }
  // 攻击文案（仿现行 attack 文案）
  function attackText(atkName, moveName, critical, mult, defName, dmg, mods) {
    if (mult === 0) return `${atkName} 用了「${moveName}」！没有效果！`;
    return `${atkName} 用了「${moveName}」！${critical ? '会心一击！' : ''}${mult > 1 ? '效果拔群！（×2）' : mult > 0 && mult < 1 ? '效果不好…（×0.5）' : ''}对 ${defName} 造成 ${dmg} 点伤害。${mods.length ? `（${mods.join('、')}）` : ''}`;
  }

  const boss = st.sides.BOSS;
  const bossPet = activePetOf(st, 'BOSS');
  const bfx = fxOf(st, 'BOSS');

  // ---------- 校验：馆主行动 ----------
  if (!bossAction || !BOSS_KINDS.includes(bossAction.kind)) return { error: 'BAD_BOSS_ACTION' };
  if (bossAction.kind === 'single' || bossAction.kind === 'sweep') {
    if (!bossPet || !findMove(bossPet, bossAction.moveName)) return { error: 'BAD_BOSS_ACTION' };
    if (bossAction.kind === 'single' && !SEATS.includes(bossAction.targetSeat)) return { error: 'BAD_BOSS_ACTION' };
  }
  if (bossAction.kind === 'charge' && (!bossAction.nextLock || !bossAction.nextLock.kind)) {
    return { error: 'BAD_BOSS_ACTION' };
  }

  // ---------- 校验：玩家两席 ----------
  for (const seat of SEATS) {
    const side = st.sides[seat];
    const act = acts[seat] || null;
    if (!act) continue;
    if (side.role === 'support') {
      if (act.type !== 'support') return { error: 'SUPPORT_CANNOT_ACT' };
      if (!['a', 'b', 'c'].includes(act.kind)) return { error: 'BAD_SUPPORT_KIND' };
      const next = (side.support && side.support.nextRound) ?? 0;
      if (st.round_no < next) return { error: 'SUPPORT_NOT_READY' };
      continue;
    }
    if (act.type === 'move') {
      const pet = activePetOf(st, seat);
      if (!pet || pet.hp <= 0 || !findMove(pet, act.moveName)) return { error: 'MOVE_NOT_LEARNED' };
      const eff = moveEffectOf(act.moveName);
      if (act.shellTarget !== undefined && act.shellTarget !== null) {
        if (eff !== 'shell') return { error: 'SHELL_TARGET_INVALID' };
        if (act.shellTarget !== 'self' && act.shellTarget !== 'ally') return { error: 'SHELL_TARGET_INVALID' };
        if (act.shellTarget === 'ally' && !aliveActive(otherSeat(seat))) return { error: 'SHELL_TARGET_INVALID' };
      }
    } else if (act.type === 'switch') {
      const t = act.toIdx;
      if (!Number.isInteger(t) || t < 0 || t >= side.pets.length || t === side.activeIdx || !(side.pets[t].hp > 0)) {
        return { error: 'SWAP_INVALID' };
      }
    } else {
      return { error: 'BAD_ACT' };
    }
  }

  const events = [];

  // ---------- 1. 换宠（先 A 后 B） ----------
  for (const seat of SEATS) {
    const act = acts[seat];
    if (!act || act.type !== 'switch' || st.sides[seat].role !== 'fighter') continue;
    const side = st.sides[seat];
    // 2a/2b：下场清阶段；自然回复下场时清除状态并推事件。新宠顶上后触发威吓。
    onPetLeavesField(st, seat, activePetOf(st, seat), events);
    side.activeIdx = act.toIdx;
    const p = side.pets[act.toIdx];
    events.push({ type: 'swap', side: seat, pet: p.name, text: `换 ${p.name} 上场！` });
    triggerSwitchIn(st, seat, events);
  }

  // ---------- 2. 标记与应援 ----------
  // 2b：行动阻断检定（每席每回合只掷一次；睡眠直接跳过、麻痹 25% 无法行动）。
  // 同一回合内新获得的状态不影响本回合行动（下回合起生效）。应援是训练师场边动作，不受状态影响。
  const blockedBySeat = {};
  for (const seat of SEATS) {
    const act = acts[seat];
    const side = st.sides[seat];
    if (!act || act.type !== 'move' || side.role !== 'fighter') continue;
    blockedBySeat[seat] = statusBlocksAction(activePetOf(st, seat), rng);
  }
  // 2b：馆主行动阻断检定（每回合只掷一次；蓄势与出招共用）。
  const bossBlocked = (bossAction.kind === 'single' || bossAction.kind === 'sweep' || bossAction.kind === 'charge')
    ? statusBlocksAction(bossPet, rng) : null;
  for (const seat of SEATS) {
    const act = acts[seat];
    const side = st.sides[seat];
    if (!act) continue;
    if (act.type === 'move' && side.role === 'fighter') {
      const kind = moveEffectOf(act.moveName);
      if (!FX_KINDS.includes(kind)) continue;
      // 2b：睡眠/麻痹时不挂标记。
      if (blockedBySeat[seat]) {
        const bk = blockedBySeat[seat];
        const myPet0 = activePetOf(st, seat);
        events.push({ type: 'status', side: seat, pet: myPet0.name, kind: bk, text: bk === 'sleep' ? `${myPet0.name} 睡着了，不能行动！` : `${myPet0.name} 麻痹了，动不了！` });
        continue;
      }
      const myPet = activePetOf(st, seat);
      if (kind === 'weak') {
        bfx.weakNum = Math.min(typeof bfx.weakNum === 'number' ? bfx.weakNum : 1, 0.6);
      } else if (kind === 'charge') {
        fxOf(st, seat).charge = true;
      } else if (kind === 'smoke') {
        bfx.smoke = true;
      } else if (kind === 'shell') {
        const toSeat = act.shellTarget === 'ally' ? otherSeat(seat) : seat;
        const tPet = activePetOf(st, toSeat);
        const ok = tPet ? coopAddShellLayer(tPet, 0.5, seat) : false;
        if (ok) {
          events.push({
            type: 'guard_shell', fromSeat: seat, toSeat, mult: 0.5,
            text: toSeat === seat
              ? `${myPet.name} 为自己撑起了防御层（下次受到伤害×0.5）！`
              : `${myPet.name} 为队友的 ${tPet.name} 撑起了防御层（下次受到伤害×0.5）！`,
          });
        } else {
          events.push({ type: 'shell_full', side: seat, text: `${tPet ? tPet.name : '目标'} 的防御层已经满了，无法再叠加。` });
        }
      }
      events.push({ type: 'effect', side: seat, kind, move: act.moveName, text: effectEventText(kind, myPet.name, act.moveName) });
    } else if (act.type === 'support' && side.role === 'support') {
      if (!side.support) side.support = {};
      side.support.lastUsedRound = st.round_no;
      side.support.nextRound = st.round_no + 2;
      const ally = aliveActive(otherSeat(seat));
      const who = side.childName || '队友';
      if (act.kind === 'a') {
        const ok = ally ? coopAddShellLayer(ally, 0.7, seat) : false;
        events.push({
          type: 'support_act', side: seat, kind: 'a', value: ok ? 0.7 : 0,
          text: ok ? `${who} 在场边为 ${ally.name} 加油，撑起了防御层（下次受到伤害×0.7）！` : `${who} 想为队友撑起防御层，但没能成功。`,
        });
      } else if (act.kind === 'b') {
        let healed = 0;
        if (ally) {
          const amt = boss.supportHealAmt || 0;
          const before = ally.hp;
          ally.hp = Math.min(ally.maxHp, ally.hp + amt);
          healed = ally.hp - before;
        }
        events.push({
          type: 'support_act', side: seat, kind: 'b', value: healed,
          text: healed > 0 ? `${who} 为 ${ally.name} 送上补给，回复了 ${healed} 点体力！` : `${who} 想为队友补给，但没有效果。`,
        });
      } else if (act.kind === 'c') {
        bfx.weakNum = Math.min(typeof bfx.weakNum === 'number' ? bfx.weakNum : 1, 0.6);
        events.push({
          type: 'support_act', side: seat, kind: 'c', value: 0.6,
          text: `${who} 在场边大声干扰，馆主的下一次攻击被削弱了！`,
        });
      }
    }
  }

  // 馆主蓄势
  if (bossAction.kind === 'charge') {
    // 2b：睡眠/麻痹时不能蓄势（不设 telegraph）。
    if (bossBlocked) {
      events.push({ type: 'status', side: 'BOSS', pet: bossPet.name, kind: bossBlocked, text: bossBlocked === 'sleep' ? `${bossPet.name} 睡着了，不能行动！` : `${bossPet.name} 麻痹了，动不了！` });
    } else {
    const lock = bossAction.nextLock;
    bfx.charge = true;
    bfx.telegraph = { kind: lock.kind, seat: lock.seat ?? null, forRound: st.round_no + 1 };
    const bossName = bossPet ? bossPet.name : '馆主';
    const tName = lock.seat ? (st.sides[lock.seat] && st.sides[lock.seat].childName) || `${lock.seat} 席` : null;
    events.push({
      type: 'boss_telegraph', actionKind: lock.kind, targetSeat: lock.seat ?? null,
      text: lock.kind === 'sweep'
        ? `${bossName} 开始蓄势……下回合将发动强力横扫，大家小心！`
        : `${bossName} 开始蓄势……${tName ? `目光锁定了 ${tName}，` : ''}下回合将发动强力一击！`,
    });
    }
  }

  // ---------- 3. 伤害计算（只算不落账） ----------
  const hits = [];
  for (const seat of SEATS) {
    const act = acts[seat];
    const side = st.sides[seat];
    if (!act || act.type !== 'move' || side.role !== 'fighter') continue;
    const eff = moveEffectOf(act.moveName);
    if (FX_KINDS.includes(eff)) continue;
    // 2b：睡眠/麻痹导致无法行动（本回合不出招）。
    if (blockedBySeat[seat]) {
      const bk = blockedBySeat[seat];
      const atkPet0 = activePetOf(st, seat);
      events.push({ type: 'status', side: seat, pet: atkPet0.name, kind: bk, text: bk === 'sleep' ? `${atkPet0.name} 睡着了，不能行动！` : `${atkPet0.name} 麻痹了，动不了！` });
      continue;
    }
    const atkPet = activePetOf(st, seat);
    const move = findMove(atkPet, act.moveName);
    // 合作玩家攻击使用官方统一区间。
    const res = calcDamage(move, atkPet, bossPet, rng, { chart: 'official' });
    if (res.error) return { error: res.error };
    let dmg = res.dmg;
    const mods = [];
    const afx = fxOf(st, seat);
    if (dmg > 0) {
      if (afx.charge) { delete afx.charge; dmg = Math.max(1, Math.round(dmg * 1.5)); mods.push('蓄力爆发'); }
      if (afx.weak) { delete afx.weak; dmg = Math.max(1, Math.round(dmg * 0.6)); mods.push('被弱化'); }
    }
    hits.push({
      atkSide: seat, defSide: 'BOSS', pet: atkPet, move, moveName: act.moveName, dmg, mult: res.mult,
      // 保留玩家命中检定落空标记，仅供事件渲染使用。
      missed: res.missed === true,
      critical: res.critical, drain: eff === 'drain', mods, targetPet: bossPet, shellMult: undefined,
      ability: res.ability || [],
    });
  }

  let bossMissed = false;
  let aggroHitSeat = null;
  let sweepExecuted = false;
  if (bossAction.kind === 'single' || bossAction.kind === 'sweep') {
    // 2b：睡眠/麻痹导致馆主无法行动（不消费烟幕）。
    if (bossBlocked) {
      events.push({ type: 'status', side: 'BOSS', pet: bossPet.name, kind: bossBlocked, text: bossBlocked === 'sleep' ? `${bossPet.name} 睡着了，不能行动！` : `${bossPet.name} 麻痹了，动不了！` });
    } else if (bfx.smoke) {
      delete bfx.smoke;
      if (rollRng(rng) < 0.5) bossMissed = true;
    }
    if (!bossBlocked && !bossMissed) {
      const move = findMove(bossPet, bossAction.moveName);
      let targets = [];
      if (bossAction.kind === 'single') {
        let ts = bossAction.targetSeat;
        if (!aliveActive(ts)) ts = otherSeat(ts);
        if (aliveActive(ts)) targets = [ts];
      } else {
        targets = SEATS.filter((s) => aliveActive(s));
        sweepExecuted = true;
      }
      const hasCharge = !!bfx.charge;
      const weakNum = typeof bfx.weakNum === 'number' ? bfx.weakNum : null;
      for (const ts of targets) {
        const tPet = activePetOf(st, ts);
        // 合作馆主攻击使用官方统一区间。
        const res = calcDamage(move, bossPet, tPet, rng, { chart: 'official' });
        if (res.error) return { error: res.error };
        let dmg = res.dmg;
        const mods = [];
        if (dmg > 0) {
          if (hasCharge) { dmg = Math.max(1, Math.round(dmg * 1.5)); mods.push('蓄力爆发'); }
          if (weakNum !== null) { dmg = Math.max(1, Math.round(dmg * weakNum)); mods.push('被弱化'); }
          if (bossAction.kind === 'sweep') { dmg = Math.max(1, Math.round(dmg * 0.6)); mods.push('横扫'); }
        }
        const hit = {
          atkSide: 'BOSS', defSide: ts, pet: bossPet, move, moveName: bossAction.moveName, dmg, mult: res.mult,
          // 保留馆主命中检定落空标记，仅供事件渲染使用。
          missed: res.missed === true,
          critical: res.critical, drain: false, mods, targetPet: tPet, shellMult: undefined,
          ability: res.ability || [],
        };
        const layer = coopPeekShellLayer(tPet);
        if (layer && hit.dmg > 0) {
          hit.dmg = Math.max(1, Math.round(hit.dmg * layer.mult));
          hit.shellMult = layer.mult;
          mods.push('防御层');
        }
        hits.push(hit);
      }
      // 修正标记统一消费一次
      if (hasCharge) delete bfx.charge;
      if (weakNum !== null) delete bfx.weakNum;
      if (bossAction.kind === 'single' && targets.length) aggroHitSeat = targets[0];
    }
  }

  // ---------- 4. 落账 ----------
  const playerHits = hits.filter((h) => h.atkSide !== 'BOSS');
  const bossHits = hits.filter((h) => h.atkSide === 'BOSS');
  const totalToBoss = playerHits.reduce((s, h) => s + h.dmg, 0);
  bossPet.hp = Math.max(0, bossPet.hp - totalToBoss);
  for (const h of bossHits) {
    h.targetPet.hp = Math.max(0, h.targetPet.hp - h.dmg);
    h.targetHpAfter = h.targetPet.hp;
  }

  // ---------- 5. 吸取回复（昏厥判定前） ----------
  for (const h of playerHits) {
    if (h.drain && h.dmg > 0) {
      const healed = drainHeal(h.pet, h.dmg);
      if (healed > 0) h.mods.push(`吸取回复 ${healed}`);
    }
    // 特性吸取回复（储水/蓄电免疫时）：防守方（馆主）回复最大体力 1/4。
    h.abilityHeal = applyAbilityHeal(bossPet, h.ability);
    // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
    applyAbilityStages(bossPet, h.ability);
    // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
    applyAbilityFlashFire(bossPet, h.ability);
  }
  for (const h of bossHits) {
    // 特性吸取回复（储水/蓄电免疫时）：被打的玩家宠回复最大体力 1/4。
    h.abilityHeal = applyAbilityHeal(h.targetPet, h.ability);
    // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
    applyAbilityStages(h.targetPet, h.ability);
    // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
    applyAbilityFlashFire(h.targetPet, h.ability);
  }

  // 事件组装：玩家 A、玩家 B、馆主（miss 或命中）
  for (const h of playerHits) {
    // 玩家命中检定落空渲染为 miss，目标血量仍取落账后的值。
    if (h.missed) {
      events.push({
        type: 'miss', side: h.atkSide, attackerSeat: h.atkSide, pet: h.pet.name, move: h.moveName,
        moveType: h.move && h.move.type, dmg: 0, mult: h.mult,
        target: bossPet.name, targetHp: bossPet.hp, mods: [],
        text: `${h.pet.name} 用了「${h.moveName}」，却没打中！`,
      });
      continue;
    }
    events.push(...abilityEvents(h.ability || [], h.atkSide, h.defSide, h.abilityHeal || 0));
    events.push({
      type: 'attack', side: h.atkSide, attackerSeat: h.atkSide, pet: h.pet.name, move: h.moveName,
      moveType: h.move && h.move.type, dmg: h.dmg, mult: h.mult, superEffective: h.mult > 1, resisted: h.mult > 0 && h.mult < 1, immune: h.mult === 0,
      critical: h.critical, target: bossPet.name, targetHp: bossPet.hp, mods: h.mods,
      text: attackText(h.pet.name, h.moveName, h.critical, h.mult, bossPet.name, h.dmg, h.mods),
    });
  }
  if (bossMissed) {
    events.push({ type: 'miss', side: 'BOSS', move: bossAction.moveName, text: `${bossPet.name} 的「${bossAction.moveName}」被烟幕挡住，落空了！` });
  }
  for (const h of bossHits) {
    if (h.shellMult !== undefined) {
      const mult = coopConsumeShellLayer(h.targetPet);
      events.push({ type: 'shell_consume', side: h.defSide, mult, text: `${h.targetPet.name} 的防御层挡下了部分伤害（×${mult}）！` });
    }
    // 馆主命中检定落空渲染为 miss，保留横扫座位与原有防御层事件逻辑。
    if (h.missed) {
      const ev = {
        type: 'miss', side: 'BOSS',
        attackerSeat: 'BOSS', pet: bossPet.name, move: h.moveName, moveType: h.move && h.move.type,
        dmg: 0, mult: h.mult,
        target: h.targetPet.name, targetHp: h.targetHpAfter, mods: [],
        text: `${bossPet.name} 用了「${h.moveName}」，却没打中！`,
      };
      if (bossAction.kind === 'sweep') ev.seat = h.defSide;
      events.push(ev);
      continue;
    }
    events.push(...abilityEvents(h.ability || [], 'BOSS', h.defSide, h.abilityHeal || 0));
    const ev = {
      type: bossAction.kind === 'sweep' ? 'boss_sweep' : 'attack', side: 'BOSS',
      attackerSeat: 'BOSS', pet: bossPet.name, move: h.moveName, moveType: h.move && h.move.type,
      dmg: h.dmg, mult: h.mult, superEffective: h.mult > 1, resisted: h.mult > 0 && h.mult < 1, immune: h.mult === 0, critical: h.critical,
      target: h.targetPet.name, targetHp: h.targetHpAfter, mods: h.mods,
      text: attackText(bossPet.name, h.moveName, h.critical, h.mult, h.targetPet.name, h.dmg, h.mods),
    };
    if (bossAction.kind === 'sweep') ev.seat = h.defSide;
    events.push(ev);
  }

  // 仇恨与横扫记账
  if (aggroHitSeat) {
    if (boss.aggro && boss.aggro.seat === aggroHitSeat) boss.aggro.streak = (boss.aggro.streak || 0) + 1;
    else boss.aggro = { seat: aggroHitSeat, streak: 1 };
  }
  if (sweepExecuted) {
    if (!boss.sweep) boss.sweep = { lastRound: null, count: 0 };
    boss.sweep.count = (boss.sweep.count || 0) + 1;
    boss.sweep.lastRound = st.round_no;
  }
  if (bossAction.fromLock) bfx.telegraph = null;

  // 2b：接触触发（伤害结算后、昏厥判定后；仅造成伤害、未落空、防守方存活且招式为接触时掷 30%）。
  // 放在 §6 之前调用、函数内部按 hp>0 守卫：昏厥的宠不触发；§6 随后统一处理昏厥。
  for (const h of playerHits) {
    if (h.dmg > 0 && !h.missed) applyContactTrigger(h.pet, h.targetPet, h.move, rng, events, h.atkSide, h.defSide, (st.weather && st.weather.kind) || null);
  }
  for (const h of bossHits) {
    if (h.dmg > 0 && !h.missed) applyContactTrigger(h.pet, h.targetPet, h.move, rng, events, h.atkSide, h.defSide, (st.weather && st.weather.kind) || null);
  }
  // 2b：回合末结算（双方上场宠＋馆主的状态扣血/治愈/睡眠计数）。放在 §6 之前，让 §6 的昏厥处理统一覆盖回合末昏厥。
  tickActiveStatuses(st, rng, events);

  // ---------- 6. 昏厥与顶上 ----------
  for (const seat of SEATS) {
    const side = st.sides[seat];
    if (side.role !== 'fighter') continue;
    const pet = activePetOf(st, seat);
    if (!pet || pet.hp > 0) continue;
    pet.shellLayers = [];
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(pet);
    events.push({ type: 'faint', side: seat, pet: pet.name, text: `${pet.name} 倒下了！` });
    const idx = side.pets.findIndex((p) => p.hp > 0);
    if (idx >= 0) {
      side.activeIdx = idx;
      events.push({ type: 'swap', side: seat, pet: side.pets[idx].name, text: `${side.pets[idx].name} 上场啦！` });
      // 2a：顶上的宠若带威吓，降对方攻击。
      triggerSwitchIn(st, seat, events);
    } else {
      side.role = 'support';
      if (!side.support) side.support = {};
      side.support.enteredRound = st.round_no + 1;
      side.support.nextRound = st.round_no + 1;
      events.push({ type: 'support_enter', side: seat, text: `${side.childName || '训练师'} 的宠物都倒下了，转为场边应援！` });
    }
  }
  let bossDown = false;
  if (bossPet.hp <= 0) {
    bossDown = true;
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(bossPet);
    events.push({ type: 'faint', side: 'BOSS', pet: bossPet.name, text: `${bossPet.name} 倒下了！` });
  }

  // ---------- 7. 终局判定 ----------
  if (st.sides.A.role === 'support' && st.sides.B.role === 'support') {
    st.coop.ended = 'lose';
    events.push({ type: 'lose', text: '两位训练师的宠物都倒下了……馆主获胜，下次再来挑战吧！' });
  } else if (bossDown) {
    st.coop.ended = 'win';
    events.push({ type: 'win', text: `合力击败了馆主的 ${bossPet.name}！挑战成功！` });
  }

  // ---------- 8. 回合推进 ----------
  if (!st.coop.ended) {
    st.round_no += 1;
    if (st.round_no > GYM_MAX_ROUNDS) {
      st.coop.ended = 'lose';
      events.push({ type: 'note', text: '战斗持续太久啦，这次挑战失败，下次再来！' });
    }
  }
  st.turnNo = st.round_no;
  pushLog(st, events);
  return { events };
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
  for (const id of ids) {
    const h = parseJsonSafe(await getSetting(db, `holiday:${id}`), null);
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
async function ensureCoopEvent(db, holiday) {
  const kids = (await getChildren(db)).slice().sort((x, y) => Number(x.id) - Number(y.id)).slice(0, 2);
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
  if (subs.length && days.length) {
    const sql = `SELECT COUNT(*) AS c FROM checkins WHERE child_id=? AND status='approved' AND subject IN (${subs.map(() => '?').join(',')}) AND date IN (${days.map(() => '?').join(',')})`;
    const r = await db.prepare(sql).bind(childId, ...subs, ...days).first();
    aCount = Number((r && r.c) || 0);
  }
  const gw = holiday.gather_window;
  const rb = await db.prepare(
    "SELECT COUNT(DISTINCT date) AS c FROM checkins WHERE child_id=? AND status='approved' AND subject='阅读' AND date BETWEEN ? AND ?"
  ).bind(childId, gw.start, gw.end).first();
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

// 队友集结状态（只暴露状态级信息）
function gatherMateState(gatheringRow) {
  if (!gatheringRow) return { state: 'gathering', reading_gap_days: 12, homework_on_way: true };
  const snap = parseJsonSafe(gatheringRow.stats_snapshot, {});
  const r = gatheringRow.result;
  return {
    state: (r === 'pass' || r === 'makeup_pass') ? 'gathered' : 'gathering',
    reading_gap_days: Math.max(0, 12 - (Number(snap.bDays) || 0)),
    homework_on_way: !Number(gatheringRow.gate_a_pass)
  };
}

// 统计合作关卡出战次数（计入上限或尚未结束的都算）
async function coopCountRuns(db, eventId, field, value) {
  if (!eventId || value == null) return 0;
  const col = field === 'week_key' ? 'week_key' : 'event_day';
  const r = await db.prepare(
    `SELECT COUNT(*) AS n FROM coop_runs WHERE event_id=? AND ${col}=? AND (counts_toward_cap=1 OR end_reason IS NULL)`
  ).bind(eventId, value).first();
  return (r && r.n) || 0;
}

// 读取某孩子在某假期的集结行
async function coopReadGathering(db, holidayId, childId) {
  if (!childId) return null;
  return await db.prepare('SELECT * FROM coop_gatherings WHERE holiday_id=? AND user_id=? LIMIT 1')
    .bind(holidayId, childId).first();
}

// 公共前置：总开关、当前假期、时间区间、参与者校验
async function coopPrecheck(db, childId) {
  const master = await getMasterEnabled(db);
  const holiday = await currentHoliday(db);
  const reasonOff = { available: false, reason: master ? 'no_holiday' : 'coop_disabled' };
  if (!master || !holiday) return { off: reasonOff };
  const phase = holidayPhase(holiday);
  const gw = holiday.gather_window || {};
  if (!gw.start || phase.today < gw.start || phase.today > holiday.end_date) return { off: reasonOff };
  const event = await ensureCoopEvent(db, holiday);
  if (!event || (event.participant_a !== childId && event.participant_b !== childId)) {
    return { off: { available: false, reason: 'not_participant' } };
  }
  const mateId = event.participant_a === childId ? event.participant_b : event.participant_a;
  return { holiday, phase, event, mateId };
}

// 从 today 到 end（含）的周一至周五天数
function coopWorkdaysBetween(from, to) {
  let n = 0;
  if (!from || !to || from > to) return 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const w = new Date(d + 'T00:00:00Z').getUTCDay();
    if (w >= 1 && w <= 5) n++;
  }
  return n;
}

// 孩子端集结令视图（白名单字段）
async function buildGatherView(db, childId) {
  const pre = await coopPrecheck(db, childId);
  if (pre.off) return pre.off;
  const { holiday, phase, mateId } = pre;
  let event = pre.event;
  await refreshGathering(db, event, holiday, childId);
  if (mateId) await refreshGathering(db, event, holiday, mateId);
  event = (await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(event.event_id).first()) || event;
  const myRow = await coopReadGathering(db, holiday.holiday_id, childId);
  const mateRow = await coopReadGathering(db, holiday.holiday_id, mateId);
  const snap = parseJsonSafe(myRow?.stats_snapshot, {}) || {};
  const mateDerived = gatherMateState(mateRow);
  const today = phase.today;
  const gw = holiday.gather_window || {};
  const passSet = ['pass', 'makeup_pass'];

  // 本人状态派生
  let meState = 'gathering';
  const result = myRow?.result;
  if (passSet.includes(result)) meState = 'gathered';
  else if (result === 'not_open') meState = 'resting';
  else if (result === 'makeup') meState = 'continue_in_holiday';
  else if (result === 'pending') {
    if (today > gw.end) {
      meState = 'continue_in_holiday';
    } else if (today >= gw.start && today <= gw.end) {
      const subjCount = Math.max((snap.subjectsLocked || []).length, 1);
      const remainA = coopWorkdaysBetween(today, gw.end) * subjCount;
      const remainDays = diffDays(today, gw.end) + 1;
      const aCount = snap.aCount || 0;
      const bDays = snap.bDays || 0;
      const threshold = snap.threshold || 0;
      if (remainA + aCount < threshold || remainDays + bDays < 12) meState = 'continue_in_holiday';
    }
  }

  // 队伍状态
  const passCount = [myRow?.result, mateRow?.result].filter((r) => passSet.includes(r)).length;
  const teamState = passCount === 2 ? 'all_gathered' : passCount === 1 ? 'one_arrived' : 'camp_waiting';

  // 补做信息
  let makeup = null;
  if (result === 'makeup' || result === 'makeup_pass') {
    const progress = parseJsonSafe(myRow?.makeup_progress, {}) || {};
    const gap = parseJsonSafe(myRow?.makeup_gap, {}) || {};
    makeup = { done: progress.count || 0, need: gap.D || 0 };
  }

  const weekKey = phase.week?.week_key ?? null;
  const todayUsed = await coopCountRuns(db, event.event_id, 'event_day', today);
  const weekUsed = weekKey ? await coopCountRuns(db, event.event_id, 'week_key', weekKey) : 0;

  return {
    available: true,
    phase: { inWindow: !!phase.inWindow, inHoliday: !!phase.inHoliday, inCoopWeek: !!phase.week },
    holiday: { holiday_id: holiday.holiday_id, start_date: holiday.start_date, end_date: holiday.end_date },
    me: {
      homework: {
        done: snap.aCount || 0,
        target: snap.threshold || 0,
        expectedTotal: snap.expectedTotal || 0,
        pass: !!myRow?.gate_a_pass,
        configured: !!snap.subjectsLocked?.length,
        unconfigured: !!snap.unconfigured
      },
      reading: { done: snap.bDays || 0, target: 12, pass: !!myRow?.gate_b_pass },
      state: meState,
      makeup
    },
    team: { state: teamState },
    mate: mateDerived,
    event: { status: event.status },
    caps: { todayUsed, weekUsed, weekKey },
    todayGate: await coopDayGateMet(db, childId, today)
  };
}

async function apiCoopGathering(db, env, req, session) {
  const sc = scopeChildId(session, new URL(req.url).searchParams.get('childId'));
  if (sc.err) return sc.err;
  const view = await buildGatherView(db, sc.id);
  return json({ ok: true, ...view });
}

// 查宠物图鉴名（兼容数组或对象形态的 SPECIES）
function coopSpeciesName(no) {
  if (no == null || typeof SPECIES === 'undefined') return null;
  const sp = Array.isArray(SPECIES) ? SPECIES.find((s) => s && String(s.no) === String(no)) : SPECIES[no];
  return sp ? sp.name : null;
}

async function apiCoopMap(db, env, req, session) {
  const sc = scopeChildId(session, new URL(req.url).searchParams.get('childId'));
  if (sc.err) return sc.err;
  const childId = sc.id;
  const pre = await coopPrecheck(db, childId);
  if (pre.off) return json({ ok: true, ...pre.off });
  await refreshGathering(db, pre.event, pre.holiday, childId);
  const event = (await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(pre.event.event_id).first()) || pre.event;
  const mapVersion = event.map_version || COOP_DEFAULT_MAP_VERSION;

  const progRows = (await db.prepare('SELECT * FROM coop_node_progress WHERE event_id=?').bind(event.event_id).all()).results || [];
  const progMap = {};
  for (const p of progRows) progMap[p.node_id] = p;

  const nodes = (coopMapNodes(mapVersion) || []).map((n) => {
    const bossNo = n.bossNo ?? n.boss_no ?? n.boss?.no ?? null;
    return {
      node_id: n.node_id,
      name: n.name,
      kind: n.kind,
      bossName: coopSpeciesName(bossNo),
      bossType: n.bossType ?? n.boss?.type ?? null,
      sweep: n.sweep ?? null,
      state: progMap[n.node_id]?.state || 'locked'
    };
  });

  const campRow = progRows.find((p) => p.camp_snapshot);
  const camp = campRow ? { exists: true, nodeId: campRow.node_id } : { exists: false };

  const runRows = (await db.prepare('SELECT * FROM coop_runs WHERE event_id=? ORDER BY started_at').bind(event.event_id).all()).results || [];
  const runs = runRows.map((r) => ({
    run_id: r.run_id, node_id: r.node_id, event_day: r.event_day,
    week_key: r.week_key, end_reason: r.end_reason, counts_toward_cap: r.counts_toward_cap
  }));

  const grantRows = (await db.prepare('SELECT * FROM coop_grants WHERE user_id=?').bind(childId).all()).results || [];
  const myRewards = grantRows.map((g) => {
    const node = coopNode(mapVersion, g.node_id);
    const label = node ? (coopRewardLabel(node, g.reward_type) || g.reward_ref) : g.reward_ref;
    return { node_id: g.node_id, reward_type: g.reward_type, reward_ref: g.reward_ref, label };
  });

  const b = await db.prepare(
    "SELECT * FROM battles WHERE mode='coop' AND coop_event_id=? AND status IN ('waiting','active','suspended') ORDER BY id DESC LIMIT 1"
  ).bind(event.event_id).first();
  const openBattle = b ? { battleId: b.id, status: b.status, mine: b.child_a === childId, nodeId: b.coop_node_id ?? null } : null;

  return json({
    ok: true,
    available: true,
    event: { event_id: event.event_id, status: event.status, holiday_id: event.holiday_id, map_version: mapVersion },
    nodes, camp, runs, myRewards, openBattle,
    myCollection: await ownedCollection(db, childId),
    ...(GATES_OPEN ? { benchOptions: await debugBenchOptions(db, childId) } : {}),
  });
}

async function apiParentHolidayGet(db, env, session) {
  const children = await getChildren(db);
  const subjects = {};
  for (const c of children) {
    const v = parseJsonSafe(await getSetting(db, `daily_subjects:${c.id}`), { subjects: [] }) || { subjects: [] };
    subjects[c.id] = Array.isArray(v.subjects) ? v.subjects : [];
  }
  return json({
    ok: true,
    masterEnabled: await getMasterEnabled(db),
    holiday: await currentHoliday(db),
    holidays: await listHolidays(db),
    statutory: parseJsonSafe(await getSetting(db, 'cn_statutory_holidays'), {}),
    subjects,
    children: children.map((c) => ({ id: c.id, name: c.name }))
  });
}

// 校验 YYYY-MM-DD 合法日期
function coopIsDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

async function apiParentHolidayUpdate(db, env, req, session) {
  const body = await readJsonBody(req);
  const bad = (msg) => json({ ok: false, error: msg }, 400);

  if (body.masterEnabled !== undefined) {
    await setSetting(db, 'coop_master_enabled', body.masterEnabled ? '1' : '0');
  }

  if (body.statutory !== undefined) {
    const st = body.statutory;
    if (!st || typeof st !== 'object' || Array.isArray(st)) return bad('节假日数据格式不对');
    for (const k of Object.keys(st)) {
      const v = st[k];
      if (!v || typeof v !== 'object' || !Array.isArray(v.off) || !v.off.every(coopIsDate)) {
        return bad('节假日数据格式不对');
      }
    }
    await setSetting(db, 'cn_statutory_holidays', JSON.stringify(st));
  }

  if (body.subjects !== undefined) {
    const sj = body.subjects;
    const allowed = ['语文', '数学', '英语', '阅读'];
    if (!sj || typeof sj !== 'object' || Array.isArray(sj)) return bad('日常科目只能选语文/数学/英语/阅读且至少一科');
    const ids = Object.keys(sj);
    // 先全部校验，再写入
    for (const id of ids) {
      const arr = sj[id];
      if (!Array.isArray(arr) || !arr.length || !arr.every((s) => allowed.includes(s))) {
        return bad('日常科目只能选语文/数学/英语/阅读且至少一科');
      }
      const rows = (await db.prepare('SELECT stats_snapshot FROM coop_gatherings WHERE user_id=?').bind(id).all()).results || [];
      for (const r of rows) {
        const snap = parseJsonSafe(r.stats_snapshot, {}) || {};
        if (Array.isArray(snap.subjectsLocked) && snap.subjectsLocked.length) {
          return json({ ok: false, error: 'subjects_locked', message: '集结窗口已开启，该孩子的日常科目已锁定' }, 400);
        }
      }
    }
    for (const id of ids) {
      await setSetting(db, `daily_subjects:${id}`, JSON.stringify({ subjects: [...new Set(sj[id])] }));
    }
  }

  let written = null;
  if (body.holiday !== undefined) {
    const h = body.holiday || {};
    const hid = typeof h.holiday_id === 'string' ? h.holiday_id.trim() : '';
    if (!hid) return bad('假期编号不能为空');
    if (!coopIsDate(h.start_date) || !coopIsDate(h.end_date)) return bad('假期起止日期格式不对');
    if (h.start_date > h.end_date) return bad('假期开始日期不能晚于结束日期');
    const mapVersion = h.map_version || COOP_DEFAULT_MAP_VERSION;
    if (!COOP_MAPS || !COOP_MAPS[mapVersion]) return bad('地图版本不存在');
    if (!Array.isArray(h.coop_weeks) || !h.coop_weeks.length) return bad('至少需要设置一个合作周');
    const weeks = [];
    for (const w of h.coop_weeks) {
      if (!w || !coopIsDate(w.start) || !coopIsDate(w.end)) return bad('合作周日期格式不对');
      if (w.start > w.end) return bad('合作周开始不能晚于结束');
      if (w.start < h.start_date || w.end > h.end_date) return bad('合作周必须在假期范围内');
      weeks.push({ week_key: w.start, start: w.start, end: w.end });
    }
    weeks.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    for (let i = 1; i < weeks.length; i++) {
      if (weeks[i].start <= weeks[i - 1].end) return bad('合作周之间不能重叠');
    }
    let ebl = h.enemy_base_level;
    if (ebl === undefined || ebl === '') ebl = null;
    if (ebl !== null && !(Number.isInteger(ebl) && ebl >= 1 && ebl <= 40)) return bad('敌方基础等级需为 1~40 的整数或留空');

    // 缺口已固定后的锁定检查
    const old = parseJsonSafe(await getSetting(db, `holiday:${hid}`), null);
    if (old) {
      const fixed = await db.prepare('SELECT 1 AS x FROM coop_gatherings WHERE holiday_id=? AND makeup_gap IS NOT NULL LIMIT 1').bind(hid).first();
      if (fixed) {
        const norm = (ws) => JSON.stringify((ws || []).map((w) => [w.start, w.end]).sort());
        if (old.start_date !== h.start_date || norm(old.coop_weeks) !== norm(weeks)) {
          return bad('缺口已固定，假期首日与合作周不可再改');
        }
      }
    }

    written = {
      holiday_id: hid,
      start_date: h.start_date,
      end_date: h.end_date,
      coop_weeks: weeks,
      map_version: mapVersion,
      enemy_base_level: ebl,
      segments: Array.isArray(h.segments) ? h.segments : [],
      gather_window: { start: addDays(h.start_date, -21), end: addDays(h.start_date, -1) },
      makeup_deadline: addDays(weeks[weeks.length - 1].start, -1)
    };
    await setSetting(db, `holiday:${hid}`, JSON.stringify(written));
    const idx = parseJsonSafe(await getSetting(db, 'holiday_index'), []);
    const list = Array.isArray(idx) ? idx : [];
    if (!list.includes(hid)) list.push(hid);
    await setSetting(db, 'holiday_index', JSON.stringify(list));
  }

  return json({
    ok: true,
    masterEnabled: await getMasterEnabled(db),
    holiday: body.holiday ? written : await currentHoliday(db)
  });
}

async function apiParentCoopOverview(db, env, session) {
  const holiday = await currentHoliday(db);
  if (!holiday) return json({ ok: true, available: false });
  const kids = await getChildren(db);
  if (kids.length < 2) return json({ ok: true, available: false });
  const a = kids[0].id, b = kids[1].id;
  // 只读：查已有的参与者对事件，不新建
  const event = await db.prepare(
    'SELECT * FROM coop_events WHERE holiday_id=? AND ((participant_a=? AND participant_b=?) OR (participant_a=? AND participant_b=?)) LIMIT 1'
  ).bind(holiday.holiday_id, a, b, b, a).first();
  if (!event) return json({ ok: true, available: false });

  const gRows = (await db.prepare('SELECT * FROM coop_gatherings WHERE event_id=? AND holiday_id=?')
    .bind(event.event_id, holiday.holiday_id).all()).results || [];
  const gatherings = gRows.map((r) => ({
    ...r,
    stats_snapshot: parseJsonSafe(r.stats_snapshot, {}),
    makeup_gap: parseJsonSafe(r.makeup_gap, null),
    makeup_progress: parseJsonSafe(r.makeup_progress, null)
  }));
  const nodes = (await db.prepare('SELECT * FROM coop_node_progress WHERE event_id=?').bind(event.event_id).all()).results || [];
  const runs = (await db.prepare('SELECT * FROM coop_runs WHERE event_id=? ORDER BY started_at').bind(event.event_id).all()).results || [];
  const grants = (await db.prepare(
    'SELECT * FROM coop_grants WHERE run_id IN (SELECT run_id FROM coop_runs WHERE event_id=?)'
  ).bind(event.event_id).all()).results || [];
  const phase = holidayPhase(holiday);
  const weekKey = phase.week?.week_key ?? null;
  const weekUsed = weekKey ? await coopCountRuns(db, event.event_id, 'week_key', weekKey) : 0;

  return json({
    ok: true,
    available: true,
    event,
    gatherings,
    nodes,
    runs,
    grants,
    caps: { weekUsed, weekKey }
  });
}

const COOP_ONLINE_TTL_SECS = 15;
const COOP_REMIND_SECS = 90;
const COOP_AUTO_SECS = 180;
const COOP_WAITING_VOID_SECS = 600;
const COOP_BATTLE_LIMIT_SECS = 1500; // 25 分钟

// 席位 ↔ 阵营映射：L↔A，R↔B
function sideOfSeat(seat) {
  return seat === 'L' ? 'A' : 'B';
}

function seatOfSide(side) {
  return side === 'A' ? 'L' : 'R';
}

function otherSeat(seat) {
  return seat === 'L' ? 'R' : 'L';
}

function parseSeatMeta(row) {
  return parseJsonSafe(row.seat_meta, null);
}

// 仅写 seat_meta，不升 version
async function saveSeatMeta(db, battleId, meta) {
  await db.prepare('UPDATE battles SET seat_meta=? WHERE id=?').bind(JSON.stringify(meta), battleId).run();
}

// 提醒 / 代选阈值（测试模式可加速）
async function coopThresholds(db, env) {
  if (env && env.TEST_MODE) {
    const v = await getSetting(db, 'debug_coop_fast_clock');
    if (v === '1') return { remindSecs: 9, autoSecs: 18 };
  }
  return { remindSecs: COOP_REMIND_SECS, autoSecs: COOP_AUTO_SECS };
}

// 代选用：第一个攻击类招式（无特效或吸血）
function firstAttackMoveName(pet) {
  if (!pet || !Array.isArray(pet.moves) || !pet.moves.length) return null;
  for (const m of pet.moves) {
    if (!m || !m.name) continue;
    const fx = moveEffectOf(m.name);
    if (fx === null || fx === undefined || fx === 'drain') return m.name;
  }
  return pet.moves[0].name || null;
}

function seatOfChildId(meta, childId) {
  if (!meta) return null;
  for (const s of ['L', 'R']) {
    if (meta[s] && String(meta[s].child_id) === String(childId)) return s;
  }
  return null;
}

// 当前合作周 week_key（无假期或不在合作周 → null）
async function coopWeekKeyNow(db, today) {
  try {
    const h = await currentHoliday(db);
    if (!h) return null;
    const ph = holidayPhase(h, today);
    return (ph && ph.week && ph.week.week_key) || null;
  } catch (e) {
    return null;
  }
}

// 非 win 终局 / 作废落账（幂等）
async function settleCoopEnd(db, row, reason) {
  const now = nowEpoch();
  const counts = reason === 'void' ? 0 : 1;
  const status = reason === 'lose' ? 'finished' : 'abandoned';
  const stmts = [
    db.prepare('UPDATE coop_runs SET end_reason=?, counts_toward_cap=?, ended_at=? WHERE run_id=? AND end_reason IS NULL')
      .bind(reason, counts, now, row.run_id),
    db.prepare("UPDATE battles SET status=?, finished_epoch=? WHERE id=? AND status IN ('active','suspended','waiting')")
      .bind(status, now, row.id)
  ];
  if (reason === 'lose') {
    stmts.push(db.prepare("UPDATE coop_node_progress SET camp_snapshot=NULL, version=version+1 WHERE event_id=? AND node_id=? AND camp_snapshot IS NOT NULL AND json_extract(camp_snapshot, '$.battle_id')=?")
      .bind(row.coop_event_id, row.node_id, row.id));
  }
  await db.batch(stmts);
  {
    const vA = await bumpChildVersion(db, row.child_a);
    await touchRow(db, 'battles', 'id=?', [row.id], vA);
    if (row.child_b) {
      const vB = await bumpChildVersion(db, row.child_b);
      await touchRow(db, 'battles', 'id=?', [row.id], Math.max(vA, vB));
    }
  }
  return { ok: true };
}

// 作废并清除指向本 battle 的扎营快照
async function coopVoidAndClearCamp(db, row) {
  await settleCoopEnd(db, row, 'void');
  await db.prepare("UPDATE coop_node_progress SET camp_snapshot=NULL, version=version+1 WHERE event_id=? AND node_id=? AND camp_snapshot IS NOT NULL AND json_extract(camp_snapshot, '$.battle_id')=?")
    .bind(row.coop_event_id, row.node_id, row.id).run();
}

// 通关结算（幂等、原子）
async function settleCoopWin(db, row, st) {
  let event = await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(row.coop_event_id).first();
  const node = event ? coopNode(event.map_version, row.node_id) : null;
  const run = await db.prepare('SELECT * FROM coop_runs WHERE run_id=?').bind(row.run_id).first();
  if (!event || !node || !run) return { settled: false, error: 'DATA_MISSING' };

  const types = (node.rewards || []).map(r => (typeof r === 'string' ? r : r && r.type)).filter(Boolean);
  const kids = [row.child_a, row.child_b].filter(k => k !== null && k !== undefined);
  // 下一节点：优先 node.next，否则按地图顺序
  let nextNode = null;
  if (node.next) nextNode = coopNode(event.map_version, node.next);
  if (!nextNode) {
    const nodes = coopMapNodes(event.map_version) || [];
    const idx = nodes.findIndex(n => n && (n.id === row.node_id || n.node_id === row.node_id));
    if (idx >= 0 && idx + 1 < nodes.length) nextNode = nodes[idx + 1];
  }
  const nextId = nextNode ? (nextNode.id || nextNode.node_id) : null;

  for (let attempt = 0; attempt < 3; attempt++) {
    event = await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(row.coop_event_id).first();
    const np = await db.prepare('SELECT * FROM coop_node_progress WHERE event_id=? AND node_id=?')
      .bind(row.coop_event_id, row.node_id).first();
    if (!np || !event) return { settled: false, error: 'DATA_MISSING' };
    const existing = await db.prepare('SELECT settlement_id, status FROM coop_settlements WHERE run_id=? AND node_id=?')
      .bind(row.run_id, row.node_id).first();
    if (existing && np.state === 'cleared') return { settled: true, alreadySettled: true };

    const now = nowEpoch();
    const stmts = [];
    let firstClear, settlementId;
    if (existing) {
      // 补写分支：settlement 已在，但节点未推进
      settlementId = existing.settlement_id;
      firstClear = existing.status === 'settled_granted';
    } else {
      firstClear = np.state !== 'cleared';
      settlementId = crypto.randomUUID();
      stmts.push(db.prepare('INSERT INTO coop_settlements(settlement_id, run_id, node_id, event_id, status, settled_at) VALUES(?,?,?,?,?,?)')
        .bind(settlementId, row.run_id, row.node_id, row.coop_event_id, firstClear ? 'settled_granted' : 'settled_repeat', now));
    }
    stmts.push(db.prepare("UPDATE coop_runs SET end_reason='win', counts_toward_cap=1, ended_at=? WHERE run_id=? AND end_reason IS NULL")
      .bind(now, row.run_id));
    stmts.push(db.prepare("UPDATE coop_node_progress SET state='cleared', camp_snapshot=NULL, first_cleared_at=COALESCE(first_cleared_at, ?), version=version+1 WHERE event_id=? AND node_id=? AND version=?")
      .bind(now, row.coop_event_id, row.node_id, np.version));
    if (nextId) {
      stmts.push(db.prepare("UPDATE coop_node_progress SET state='open', version=version+1 WHERE event_id=? AND node_id=? AND state='locked'")
        .bind(row.coop_event_id, nextId));
    }
    if (node.kind === 'final' && firstClear) {
      stmts.push(db.prepare("UPDATE coop_events SET status='completed', version=version+1, updated_at=? WHERE event_id=? AND version=?")
        .bind(now, row.coop_event_id, event.version));
    }
    const rewards = [];
    if (firstClear) {
      for (const type of types) {
        const ref = coopRewardRef(event.map_version, node, type);
        for (const kid of kids) {
          stmts.push(db.prepare(`INSERT ${existing ? 'OR IGNORE ' : ''}INTO coop_grants(grant_id, settlement_id, run_id, node_id, user_id, reward_type, reward_ref, qty, granted_at) VALUES(?,?,?,?,?,?,?,1,?)`)
            .bind(crypto.randomUUID(), settlementId, row.run_id, row.node_id, kid, type, ref, now));
          rewards.push({ childId: kid, type, ref, label: coopRewardLabel(node, type) });
        }
      }
      // 资产落账（字段名来自固定白名单）
      for (const kid of kids) {
        for (const type of types) {
          const asset = coopRewardAsset(node, type);
          const field = asset && asset.field;
          if (field !== 'titles' && field !== 'stickers') continue;
          const ref = coopRewardRef(event.map_version, node, type);
          const val = asset.value !== undefined ? asset.value : ref;
          stmts.push(db.prepare(`UPDATE children SET ${field} = CASE WHEN EXISTS(SELECT 1 FROM json_each(COALESCE(${field}, '[]')) WHERE value=?) THEN ${field} ELSE json_insert(COALESCE(${field}, '[]'), '$[#]', ?) END WHERE id=?`)
            .bind(val, val, kid));
        }
      }
    }

    try {
      await db.batch(stmts);
      {
        const vA = await bumpChildVersion(db, row.child_a);
        await touchRow(db, 'battles', 'id=?', [row.id], vA);
        if (row.child_b) {
          const vB = await bumpChildVersion(db, row.child_b);
          await touchRow(db, 'battles', 'id=?', [row.id], Math.max(vA, vB));
        }
        for (const kid of kids) await syncTouch(db, kid, 'children', 'id=?', [kid]);
      }
    } catch (e) {
      continue; // 冲突：下一轮重新判定（已结算 / 补写）
    }
    const np2 = await db.prepare('SELECT state FROM coop_node_progress WHERE event_id=? AND node_id=?')
      .bind(row.coop_event_id, row.node_id).first();
    if (!np2 || np2.state !== 'cleared') continue;
    return { settled: true, firstClear, rewards };
  }
  return { settled: false, error: 'SETTLE_RETRY_EXHAUSTED' };
}

function coopCampSnapshot(row, st, meta, weekKey) {
  return {
    week_key: weekKey,
    run_id: row.run_id,
    battle_id: row.id,
    round_no: st.round_no,
    battle_version: row.version,
    lineup: { L: meta.L && meta.L.lineup, R: meta.R && meta.R.lineup },
    camped_at: nowEpoch(),
    reason: 'time_cap'
  };
}

// 重读并返回视图
async function coopReloadView(db, battleId, callerSeat, extra) {
  const g = await loadBattle(db, battleId);
  if (!g) return { error: 'NOT_FOUND', status: 404 };
  const m = parseSeatMeta(g.row) || {};
  return Object.assign({ view: await coopBattleView(db, g.row, g.st, m, callerSeat), events: [] }, extra || {});
}

// 该席本回合是否需要提交（fighter 且仍有存活宠）
function coopSeatShouldSubmit(st, seat) {
  const side = st.sides && st.sides[sideOfSeat(seat)];
  if (!side || side.role === 'support') return false;
  return (side.pets || []).some(p => p && p.hp > 0);
}

// 推进函数（幂等）
async function advanceCoopBattle(db, env, battleId, callerSeat) {
  const got = await loadBattle(db, battleId);
  if (!got || got.row.mode !== 'coop') return { error: 'NOT_FOUND', status: 404 };
  const row = got.row;
  const st = got.st;
  const meta = parseSeatMeta(row) || {};
  const now = nowEpoch();
  const today = shDateStr();

  if ((callerSeat === 'L' || callerSeat === 'R') && meta[callerSeat]) {
    meta[callerSeat].last_seen_epoch = now;
    meta[callerSeat].online = true;
  }
  const fresh = S => meta[S] && now - (meta[S].last_seen_epoch || 0) <= COOP_ONLINE_TTL_SECS;

  // c. 等待中
  if (row.status === 'waiting') {
    if (now - (row.created_epoch || now) > COOP_WAITING_VOID_SECS) await settleCoopEnd(db, row, 'void');
    await saveSeatMeta(db, row.id, meta);
    return coopReloadView(db, battleId, callerSeat);
  }

  // d. 已终局：惰性补结算
  if (row.status === 'finished' || row.status === 'abandoned') {
    if (st.coop && st.coop.ended === 'win') {
      const s = await db.prepare('SELECT 1 AS x FROM coop_settlements WHERE run_id=?').bind(row.run_id).first();
      if (!s) await settleCoopWin(db, row, st);
    }
    await saveSeatMeta(db, row.id, meta);
    return coopReloadView(db, battleId, callerSeat);
  }

  // e. 挂起
  if (row.status === 'suspended') {
    const kind = meta.suspend_kind;
    if (kind === 'timeout' || kind === 'drop') {
      const run = await db.prepare('SELECT event_day FROM coop_runs WHERE run_id=?').bind(row.run_id).first();
      if (run && run.event_day && today > run.event_day) {
        await coopVoidAndClearCamp(db, row);
        await saveSeatMeta(db, row.id, meta);
        return coopReloadView(db, battleId, callerSeat);
      }
    } else if (kind === 'camp') {
      const np = await db.prepare('SELECT camp_snapshot FROM coop_node_progress WHERE event_id=? AND node_id=?')
        .bind(row.coop_event_id, row.node_id).first();
      const camp = parseJsonSafe(np && np.camp_snapshot, null);
      const campWeek = camp && camp.battle_id === row.id ? camp.week_key : null;
      const weekKeyNow = await coopWeekKeyNow(db, today);
      if (!weekKeyNow || !campWeek || weekKeyNow !== campWeek) {
        await coopVoidAndClearCamp(db, row);
        await saveSeatMeta(db, row.id, meta);
        return coopReloadView(db, battleId, callerSeat);
      }
    }
    if (!(fresh('L') && fresh('R'))) {
      await saveSeatMeta(db, row.id, meta);
      return coopReloadView(db, battleId, callerSeat);
    }
    // 两席在线 → 恢复
    const oldSince = row.since_epoch;
    const ures = await db.prepare("UPDATE battles SET status='active', since_epoch=NULL WHERE id=? AND status='suspended'")
      .bind(row.id).run();
    if (!ures.meta || ures.meta.changes === 0) {
      await saveSeatMeta(db, row.id, meta);
      return coopReloadView(db, battleId, callerSeat);
    }
    row.status = 'active';
    row.since_epoch = null;
    meta.suspend_kind = null;
    meta.timer = meta.timer || {};
    meta.timer.last_tick_epoch = now;
    meta.timer.both_online_ms = 0;
    meta.timer.reminded_90 = false;
    if (meta.L) meta.L.auto_pick_streak = 0;
    if (meta.R) meta.R.auto_pick_streak = 0;
    if (meta.timer.deadline_epoch && oldSince) meta.timer.deadline_epoch += (now - oldSince);
  }

  if (row.status !== 'active') {
    await saveSeatMeta(db, row.id, meta);
    return coopReloadView(db, battleId, callerSeat);
  }

  // f. 进行中主流程
  const th = await coopThresholds(db, env);
  const bothOnline = !!(fresh('L') && fresh('R'));
  meta.timer = meta.timer || { round_no: st.round_no, both_online_ms: 0, last_tick_epoch: now, reminded_90: false, deadline_epoch: null };
  const tick = meta.timer;
  if (bothOnline && tick.last_tick_epoch) tick.both_online_ms = (tick.both_online_ms || 0) + Math.max(0, now - tick.last_tick_epoch) * 1000;
  tick.last_tick_epoch = now;

  const subRes = await db.prepare('SELECT * FROM coop_submissions WHERE battle_id=? AND round_no=?').bind(row.id, st.round_no).all();
  const subs = {};
  for (const s of (subRes.results || [])) subs[s.seat] = s;
  const fighters = ['L', 'R'].filter(S => meta[S] && coopSeatShouldSubmit(st, S));
  const missing = fighters.filter(S => !subs[S]);

  if (bothOnline && tick.both_online_ms >= th.remindSecs * 1000 && missing.length) tick.reminded_90 = true;

  if (bothOnline && tick.both_online_ms >= th.autoSecs * 1000) {
    for (const S of missing) {
      const moveName = firstAttackMoveName(activePetOf(st, sideOfSeat(S)));
      if (!moveName) continue;
      const ins = await db.prepare("INSERT OR IGNORE INTO coop_submissions(battle_id, round_no, seat, user_id, action_type, move_id, is_auto_pick, submitted_at) VALUES(?, ?, ?, ?, 'move', ?, 1, ?)")
        .bind(row.id, st.round_no, S, meta[S].child_id, moveName, now).run();
      if (ins.meta && ins.meta.changes > 0) {
        meta[S].auto_pick_streak = (meta[S].auto_pick_streak || 0) + 1;
        subs[S] = { seat: S, action_type: 'move', move_id: moveName, is_auto_pick: 1 };
      } else {
        const ex = await db.prepare('SELECT * FROM coop_submissions WHERE battle_id=? AND round_no=? AND seat=?')
          .bind(row.id, st.round_no, S).first();
        if (ex) subs[S] = ex;
      }
    }
  }

  if (!fighters.every(S => subs[S])) {
    await saveSeatMeta(db, row.id, meta);
    return { view: await coopBattleView(db, row, st, meta, callerSeat), events: [] };
  }

  // g. 结算
  const event = await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(row.coop_event_id).first();
  const node = event ? coopNode(event.map_version, row.node_id) : null;
  if (!event || !node) return { error: 'DATA_MISSING', status: 500 };

  let rowRd = await db.prepare('SELECT * FROM coop_rounds WHERE battle_id=? AND round_no=?').bind(row.id, st.round_no).first();
  if (!rowRd) {
    const b0 = coopBossChoose(st, node, Math.random);
    await db.prepare('INSERT OR IGNORE INTO coop_rounds(battle_id, round_no, boss_action, opened_at) VALUES(?,?,?,?)')
      .bind(row.id, st.round_no, JSON.stringify(b0), now).run();
    rowRd = await db.prepare('SELECT * FROM coop_rounds WHERE battle_id=? AND round_no=?').bind(row.id, st.round_no).first();
  }
  const ba = parseJsonSafe(rowRd && rowRd.boss_action, null);

  const acts = {};
  for (const S of ['L', 'R']) {
    const sub = subs[S];
    let a = null;
    if (sub) {
      if (sub.action_type === 'move') {
        const t = sub.target_seat;
        a = { type: 'move', moveName: sub.move_id, shellTarget: (t === 'L' || t === 'R') ? (t === S ? 'self' : 'ally') : undefined };
      } else if (sub.action_type === 'switch') {
        a = { type: 'switch', toIdx: sub.switch_to };
      } else if (sub.action_type === 'support') {
        a = { type: 'support', kind: sub.support_kind };
      }
    }
    acts[sideOfSeat(S)] = a;
  }

  const stBefore = JSON.parse(JSON.stringify(st));
  const oldRound = st.round_no;
  const r = resolveCoopRound(st, acts, ba, Math.random);
  if (r && r.error) {
    await saveSeatMeta(db, row.id, meta);
    return { error: r.error, status: 400, view: await coopBattleView(db, row, stBefore, meta, callerSeat) };
  }
  for (const S of ['L', 'R']) {
    if (subs[S] && !Number(subs[S].is_auto_pick) && meta[S]) meta[S].auto_pick_streak = 0;
  }

  const ended = (st.coop && st.coop.ended) || null;
  const newStatus = ended ? 'finished' : 'active';
  const nextBa = ended ? null : coopBossChoose(st, node, Math.random);
  const oldVersion = row.version;
  const newVersion = oldVersion + 1;

  const stmts = [
    db.prepare('UPDATE battles SET state=?, round_no=?, version=?, status=?, finished_epoch=? WHERE id=? AND round_no=? AND version=?')
      .bind(JSON.stringify(st), st.round_no, newVersion, newStatus, ended ? now : row.finished_epoch, row.id, oldRound, oldVersion),
    db.prepare('UPDATE coop_rounds SET resolved_at=?, result_json=? WHERE battle_id=? AND round_no=? AND resolved_at IS NULL AND EXISTS(SELECT 1 FROM battles WHERE id=? AND version=?)')
      .bind(now, JSON.stringify({ events: r.events }), row.id, oldRound, row.id, newVersion)
  ];
  if (!ended) {
    stmts.push(db.prepare('INSERT OR IGNORE INTO coop_rounds(battle_id, round_no, boss_action, opened_at) SELECT ?, ?, ?, ? WHERE EXISTS(SELECT 1 FROM battles WHERE id=? AND version=?)')
      .bind(row.id, st.round_no, JSON.stringify(nextBa), now, row.id, newVersion));
  } else {
    stmts.push(db.prepare('UPDATE coop_runs SET end_reason=?, counts_toward_cap=1, ended_at=? WHERE run_id=? AND end_reason IS NULL AND EXISTS(SELECT 1 FROM battles WHERE id=? AND version=?)')
      .bind(ended, now, row.run_id, row.id, newVersion));
    if (ended === 'lose') {
      stmts.push(db.prepare("UPDATE coop_node_progress SET camp_snapshot=NULL, version=version+1 WHERE event_id=? AND node_id=? AND camp_snapshot IS NOT NULL AND json_extract(camp_snapshot, '$.battle_id')=? AND EXISTS(SELECT 1 FROM battles WHERE id=? AND version=?)")
        .bind(row.coop_event_id, row.node_id, row.id, row.id, newVersion));
    }
  }
  const results = await db.batch(stmts);
  if (!results[0] || !results[0].meta || results[0].meta.changes === 0) {
    // CAS 失败：他人已推进，返回最新视图
    return coopReloadView(db, battleId, callerSeat);
  }
  row.version = newVersion;
  row.status = newStatus;
  row.round_no = st.round_no;

  let suspended = false;
  // 连续代选 ≥2 → 判离开挂起
  if (!ended && ['L', 'R'].some(S => meta[S] && (meta[S].auto_pick_streak || 0) >= 2)) {
    await db.prepare("UPDATE battles SET status='suspended', since_epoch=? WHERE id=? AND version=?").bind(now, row.id, newVersion).run();
    meta.suspend_kind = 'timeout';
    row.status = 'suspended';
    row.since_epoch = now;
    suspended = true;
  }
  // 25 分钟扎营
  if (!ended && !suspended && tick.deadline_epoch && now >= tick.deadline_epoch) {
    const weekKey = (await coopWeekKeyNow(db, today)) || weekStartMon(today);
    const camp = coopCampSnapshot(row, st, meta, weekKey);
    await db.prepare('UPDATE coop_node_progress SET camp_snapshot=?, version=version+1 WHERE event_id=? AND node_id=?')
      .bind(JSON.stringify(camp), row.coop_event_id, row.node_id).run();
    await db.prepare("UPDATE battles SET status='suspended', since_epoch=? WHERE id=? AND version=?").bind(now, row.id, newVersion).run();
    meta.suspend_kind = 'camp';
    row.status = 'suspended';
    row.since_epoch = now;
    suspended = true;
  }
  if (!ended && !suspended) {
    tick.round_no = st.round_no;
    tick.both_online_ms = 0;
    tick.reminded_90 = false;
    tick.last_tick_epoch = now;
  }
  if (ended === 'win') await settleCoopWin(db, row, st);

  await saveSeatMeta(db, row.id, meta);
  const g2 = await loadBattle(db, battleId);
  if (!g2) return { error: 'NOT_FOUND', status: 404 };
  const meta2 = parseSeatMeta(g2.row) || {};
  return {
    view: await coopBattleView(db, g2.row, g2.st, meta2, callerSeat),
    events: r.events || [],
    settled: ended ? ended : undefined
  };
}

/* ===================== 合作模式：视图 / 鉴权 / 校验 / API ===================== */

// 统一错误响应
function coopErr(code, status, extra) {
  return json(Object.assign({ ok: false, error: code }, extra || {}), status);
}

// 读取合作对战：兼容 loadBattle 返回 {row, st} 或直接返回行
async function coopLoad(db, id) {
  if (id == null || id === '') return null;
  const got = await loadBattle(db, Number(id));
  if (!got) return null;
  const row = got.row || got;
  if (!row || row.mode !== 'coop') return null;
  const st = got.st !== undefined ? got.st : parseJsonSafe(row.state, null);
  return { row, st };
}

// 合作活动参与者（兼容多种列形态）
function coopParticipants(event) {
  if (!event) return [];
  let ids = [event.participant_a, event.participant_b];
  return ids.filter(x => x != null).map(Number);
}

function coopMateSeat(seat) {
  return seat === 'L' ? 'R' : 'L';
}

async function coopReadEvent(db, id) {
  const r = await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(id).first();
  if (r && r.id == null) r.id = r.event_id;
  return r;
}

async function coopDayGateOk(db, childId, dateStr) {
  const g = await coopDayGateMet(db, childId, dateStr);
  return g === true || !!(g && g.met);
}

// 1. 白名单视图
async function coopBattleView(db, row, st, meta, viewerSeat) {
  meta = meta || {};
  const live = st && row.status !== 'waiting' && st.round_no != null;
  const subs = live
    ? ((await db.prepare('SELECT * FROM coop_submissions WHERE battle_id=? AND round_no=?')
        .bind(row.id, st.round_no).all()).results || [])
    : [];
  const run = row.run_id
    ? await db.prepare('SELECT * FROM coop_runs WHERE run_id=?').bind(row.run_id).first()
    : null;

  function sideView(s) {
    if (!s) return null;
    return {
      childId: s.childId, childName: s.childName, battleLevel: s.battleLevel, activeIdx: s.activeIdx,
      pets: (s.pets || []).map(p => ({
        key: p.key, name: p.name, type: p.type, no: p.no, img: p.img, level: p.level,
        hp: p.hp, maxHp: p.maxHp, active: p.active, fainted: p.fainted, moves: p.moves,
        shellCount: (p.shellLayers || []).length,
      })),
    };
  }

  // 预告：仅当本回合有效时公开
  let telegraph = null;
  let bossView = null;
  if (st && st.sides && st.sides.BOSS) {
    const fx = fxOf(st, 'BOSS') || {};
    const tel = fx.telegraph;
    if (tel && tel.forRound === st.round_no) {
      telegraph = { kind: tel.kind, seat: tel.seat ? seatOfSide(tel.seat) : null };
    }
    bossView = sideView(st.sides.BOSS);
    bossView.fx = { charge: !!fx.charge, weak: fx.weakNum != null, telegraph };
  }

  function seatView(S) {
    const m = meta[S] || {};
    const sub = subs.find(x => x.seat === S);
    const sd = st?.sides?.[sideOfSeat(S)];
    return {
      childId: m.child_id ?? null,
      childName: sd?.childName ?? null,
      online: m.last_seen_epoch ? (nowEpoch() - m.last_seen_epoch <= 15) : false,
      role: sd?.role ?? 'fighter',
      autoPickStreak: m.auto_pick_streak || 0,
      submitted: !!sub,
      submittedAction: sub ? {
        type: sub.action_type, moveName: sub.move_id, isAutoPick: !!sub.is_auto_pick,
        shellTargetSeat: sub.target_seat, supportKind: sub.support_kind,
      } : null,
      supportNextRound: sd?.support?.nextRound ?? null,
    };
  }

  let rewards = null;
  if (row.status === 'finished' && st?.coop?.ended === 'win') {
    const gr = (await db.prepare('SELECT * FROM coop_grants WHERE run_id=?').bind(row.run_id).all()).results || [];
    rewards = gr.map(g => ({ childId: g.user_id, type: g.reward_type, ref: g.reward_ref }));
  }

  return {
    battleId: row.id, mode: 'coop', status: row.status, nodeId: row.node_id, eventId: row.coop_event_id,
    roundNo: st?.round_no ?? row.round_no ?? 0,
    mySeat: viewerSeat ?? null,
    ended: st?.coop?.ended ?? null,
    endReason: run?.end_reason ?? null,
    suspended: row.status === 'suspended',
    suspendKind: meta?.suspend_kind ?? null,
    seats: { L: seatView('L'), R: seatView('R') },
    sides: { A: sideView(st?.sides?.A), B: sideView(st?.sides?.B), BOSS: bossView },
    telegraph,
    timer: {
      reminded90: !!meta?.timer?.reminded_90,
      bothOnlineMs: meta?.timer?.both_online_ms || 0,
      deadlineEpoch: meta?.timer?.deadline_epoch ?? null,
    },
    log: st?.log ?? [],
    rewards,
  };
}

// 2. 席位鉴权：孩子会话优先，其次席位 token
async function coopActorSeat(db, req, session, row, body) {
  const meta = parseSeatMeta(row);
  if (session?.kind === 'child') {
    const seat = seatOfChildId(meta, session.child_id);
    if (seat) return { seat, meta };
  }
  if (body?.token) {
    const hash = await sha256hex(String(body.token));
    const tk = meta.tokens || {};
    for (const s of ['L', 'R']) {
      if (tk[s] && tk[s] === hash) return { seat: s, meta };
    }
  }
  return { err: coopErr('not_your_seat', 403) };
}

// 3. 公共前置：总开关 → 假期
async function coopOpenGate(db, env, session) {
  if (!(await getMasterEnabled(db))) return { errResp: coopErr('coop_disabled', 403) };
  const holiday = await currentHoliday(db);
  if (!holiday) return { errResp: coopErr('out_of_holiday', 400) };
  const phase = holidayPhase(holiday);
  const event = await ensureCoopEvent(db, holiday);
  if (event && event.id == null) event.id = event.event_id;
  return { holiday, phase, event };
}

// 4. 开局校验链
async function coopStartChecks(db, holiday, phase, event, childIds, nodeId, opts) {
  const excludeRunId = opts?.excludeRunId || null;
  const fail = (code, status) => ({ err: { code, status: status || 400 } });
  if (!phase || !phase.week) return fail('out_of_holiday');

  const ev = (await coopReadEvent(db, event.id)) || event;
  const gs = (await db.prepare('SELECT * FROM coop_gatherings WHERE event_id=? AND user_id IN (?,?)')
    .bind(ev.id, childIds[0], childIds[1]).all()).results || [];
  const hasMakeup = gs.some(g => g.result === 'makeup');
  const notGathered = () => fail(hasMakeup ? 'makeup_pending' : 'not_gathered');
  if (ev.status !== 'active') return notGathered();
  const passed = childIds.every(cid => {
    const g = gs.find(x => Number(x.user_id) === Number(cid));
    return g && (g.result === 'pass' || g.result === 'makeup_pass');
  });
  if (!passed) return notGathered();

  const today = shDateStr();
  for (const cid of childIds) {
    if (!(await coopDayGateOk(db, cid, today))) return fail('daily_gate_unmet');
  }

  const p = shParts();
  const mins = Number(p.hour ?? p.h) * 60 + Number(p.minute ?? p.m ?? p.min);
  if (!(mins >= 540 && mins <= 1230)) return fail('outside_time_window');

  const mx = (await db.prepare(
    "SELECT created_epoch FROM battles WHERE (child_a IN (?,?) OR child_b IN (?,?)) AND mode IN ('gym','pvp') AND status != 'abandoned'"
  ).bind(childIds[0], childIds[1], childIds[0], childIds[1]).all()).results || [];
  if (mx.some(b => b.created_epoch && shDateStr(new Date(b.created_epoch * 1000)) === today)) {
    return fail('mutex_gym_pvp');
  }

  const runs = ((await db.prepare(
    'SELECT run_id, event_day, week_key FROM coop_runs WHERE event_id=? AND (counts_toward_cap=1 OR end_reason IS NULL)'
  ).bind(ev.id).all()).results || []).filter(r => !excludeRunId || r.run_id !== excludeRunId);
  if (runs.filter(r => r.event_day === today).length >= 1) return fail('daily_cap_reached');
  if (runs.filter(r => r.week_key === phase.week.week_key).length >= 4) return fail('weekly_cap_reached');

  const np = await db.prepare('SELECT * FROM coop_node_progress WHERE event_id=? AND node_id=?')
    .bind(ev.id, nodeId).first();
  if (!np || np.state === 'locked') return fail('node_locked');
  return { ok: true, week: phase.week };
}

// 读取某活动未终局 run 对应的对战并按 resumed 返回
async function coopResumedResp(db, eventId, childId) {
  const run = await db.prepare('SELECT * FROM coop_runs WHERE event_id=? AND end_reason IS NULL').bind(eventId).first();
  if (!run) return null;
  const got = await coopLoad(db, run.battle_id);
  if (!got) return null;
  const meta = parseSeatMeta(got.row);
  const view = await coopBattleView(db, got.row, got.st, meta, seatOfChildId(meta, childId));
  return json({ ok: true, resumed: true, battle: view });
}

// 5. 建局
async function apiCoopCreate(db, env, req, session) {
  const body = await readJsonBody(req);
  if (session?.kind !== 'child') return coopErr('not_your_seat', 403);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;

  const gate = await coopOpenGate(db, env, session);
  if (gate.errResp) return gate.errResp;
  const { holiday, phase } = gate;
  let event = gate.event;

  const me = await getChild(db, sc.id);
  const parts = coopParticipants(event);
  if (!me || !parts.includes(Number(me.id))) return coopErr('not_participant', 403);
  const other = await getChild(db, parts.find(x => x !== Number(me.id)));
  if (!other) return coopErr('not_participant', 403);

  await refreshGathering(db, event, holiday, me.id);
  await refreshGathering(db, event, holiday, other.id);
  event = (await coopReadEvent(db, event.id)) || event;

  const resumed = await coopResumedResp(db, event.id, me.id);
  if (resumed) return resumed;

  const nodeId = body.nodeId;
  const checks = await coopStartChecks(db, holiday, phase, event, [me.id, other.id], nodeId, {});
  if (checks.err) return coopErr(checks.err.code, checks.err.status);

  // 营地快照：须明确丢弃，否则走 resume
  const np = await db.prepare('SELECT * FROM coop_node_progress WHERE event_id=? AND node_id=?')
    .bind(event.id, nodeId).first();
  if (np && np.camp_snapshot) {
    if (body.camp === 'discard') {
      await db.prepare('UPDATE coop_node_progress SET camp_snapshot=NULL, version=version+1 WHERE event_id=? AND node_id=?')
        .bind(event.id, nodeId).run();
    } else {
      const snap = parseJsonSafe(np.camp_snapshot, {}) || {};
      return coopErr('camp_locked_config', 409, { campBattleId: snap.battle_id ?? null });
    }
  }

  const benchNo = body.benchNo != null && body.benchNo !== '' ? Number(body.benchNo) : null;
  if (benchNo && !(await ownsSpecies(db, me.id, benchNo))) {
    return json({ ok: false, error: 'bench_not_owned', message: '这只收藏宠还没有收集到哦' }, 400);
  }

  const now = nowEpoch();
  const today = shDateStr();
  const runId = crypto.randomUUID();
  const tokenMe = randToken();
  const seatBase = { auto_pick_streak: 0, all_fainted: false, cheer_from_round: null, cheer_next_round: null };
  const meta = {
    L: Object.assign({ child_id: me.id, joined_epoch: now, last_seen_epoch: now, online: true }, seatBase, { lineup: { benchNo: benchNo || null } }),
    R: Object.assign({ child_id: other.id, joined_epoch: null, last_seen_epoch: 0, online: false }, seatBase, { lineup: { benchNo: null } }),
    timer: { round_no: 0, both_online_ms: 0, last_tick_epoch: now, reminded_90: false, deadline_epoch: null },
    tokens: { L: await sha256hex(tokenMe) },
    suspend_kind: null,
  };

  const ins = await db.prepare(
    "INSERT INTO battles (mode, week_start, stage, child_a, child_b, state, status, counted, coop_event_id, node_id, run_id, seat_meta, version, round_no, created_epoch) VALUES ('coop', ?, NULL, ?, ?, '{}', 'waiting', 0, ?, ?, ?, ?, 0, 0, ?)"
  ).bind(weekStartMon(today), me.id, other.id, event.id, nodeId, runId, JSON.stringify(meta), now).run();
  const battleId = ins.meta.last_row_id;

  try {
    await db.prepare('INSERT INTO coop_runs (run_id, event_id, node_id, battle_id, event_day, week_key, started_at) VALUES (?,?,?,?,?,?,?)')
      .bind(runId, event.id, nodeId, battleId, today, phase.week.week_key, now).run();
  } catch (e) {
    // 并发建局：删除孤儿行，回到已有对局
    await db.prepare("DELETE FROM battles WHERE id=? AND status='waiting'").bind(battleId).run();
    const r = await coopResumedResp(db, event.id, me.id);
    if (r) return r;
    return coopErr('daily_cap_reached', 409);
  }

  {
    const vA = await bumpChildVersion(db, me.id);
    await touchRow(db, 'battles', 'id=?', [battleId], vA);
    const vB = await bumpChildVersion(db, other.id);
    await touchRow(db, 'battles', 'id=?', [battleId], Math.max(vA, vB));
  }
  const got = await coopLoad(db, battleId);
  const view = await coopBattleView(db, got.row, got.st, parseSeatMeta(got.row), 'L');
  return json({ ok: true, battleId, token: tokenMe, battle: view });
}

// 6. 入局
async function apiCoopJoin(db, env, req, session) {
  const body = await readJsonBody(req);
  const got = await coopLoad(db, body.battleId);
  if (!got) return coopErr('not_found', 404);
  const row = got.row;
  const sc = scopeChildId(session, body.childId);
  const selfId = sc.err ? null : Number(sc.id);

  if (row.status !== 'waiting') {
    if (row.status === 'active' && selfId === Number(row.child_b)) return coopErr('already_joined', 409);
    return coopErr('battle_ended', 400);
  }
  const now = nowEpoch();
  const today = shDateStr(); // v11：attachEvoForm 需当日日期
  if (now - row.created_epoch > 600) {
    await settleCoopEnd(db, row, 'void');
    return coopErr('battle_ended', 400);
  }
  if (sc.err) return sc.err;
  if (selfId !== Number(row.child_b)) return coopErr('not_participant', 403);
  const joiner = await getChild(db, row.child_b);
  if (!joiner) return coopErr('not_participant', 403);

  const v = await verifyChildPwd(db, joiner, body.password);
  if (!v.ok) return json({ ok: false, error: v.error }, v.status);

  const gate = await coopOpenGate(db, env, session);
  if (gate.errResp) return gate.errResp;
  const { holiday, phase } = gate;
  let event = gate.event;
  const creator = await getChild(db, row.child_a);
  await refreshGathering(db, event, holiday, joiner.id);
  await refreshGathering(db, event, holiday, creator.id);
  event = (await coopReadEvent(db, event.id)) || event;

  const checks = await coopStartChecks(db, holiday, phase, event, [creator.id, joiner.id], row.node_id, { excludeRunId: row.run_id });
  if (checks.err) return coopErr(checks.err.code, checks.err.status);

  const benchNo = body.benchNo != null && body.benchNo !== '' ? Number(body.benchNo) : null;
  if (benchNo && !(await ownsSpecies(db, joiner.id, benchNo))) {
    return json({ ok: false, error: 'bench_not_owned', message: '这只收藏宠还没有收集到哦' }, 400);
  }

  // 组装对战状态
  const meta = parseSeatMeta(row);
  await attachEvoForm(db, creator, today); // v11：主宠须按实际形态出战
  await attachEvoForm(db, joiner, today);
  await attachExMain(db, creator, meta.L?.lineup?.benchNo || null); // 任务 110：备战前主宠挂线信息
  await attachExMain(db, joiner, benchNo); // 任务 110：备战前主宠挂线信息
  const sideA = buildPlayerSide(creator, levelFromXp(creator.total_xp), meta.L?.lineup?.benchNo || null);
  const sideB = buildPlayerSide(joiner, levelFromXp(joiner.total_xp), benchNo || null);
  meta.R = meta.R || {};
  meta.R.lineup = { benchNo: benchNo || null };
  const node = coopNode(event.map_version, row.node_id);
  const baseLevel = holiday.enemy_base_level || Math.max(levelFromXp(creator.total_xp), levelFromXp(joiner.total_xp));
  const st = createCoopBattleState(node, sideA, sideB, baseLevel);

  const tokenR = randToken();
  meta.R.joined_epoch = now;
  meta.R.last_seen_epoch = now;
  meta.tokens = meta.tokens || {};
  meta.tokens.R = await sha256hex(tokenR);
  meta.timer = meta.timer || {};
  meta.timer.round_no = 1;
  meta.timer.last_tick_epoch = now;
  meta.timer.deadline_epoch = now + COOP_BATTLE_LIMIT_SECS;

  const ba1 = coopBossChoose(st, node, Math.random);

  // 先以乐观锁激活对局，成功后再写 run 与首回合
  const up = await db.prepare(
    "UPDATE battles SET state=?, status='active', round_no=1, version=version+1, seat_meta=? WHERE id=? AND status='waiting' AND version=?"
  ).bind(JSON.stringify(st), JSON.stringify(meta), row.id, row.version).run();
  if (!up.meta || up.meta.changes !== 1) {
    const again = await coopLoad(db, row.id);
    if (again && again.row.status === 'active') return coopErr('already_joined', 409);
    return coopErr('battle_ended', 400);
  }
  {
    const vA = await bumpChildVersion(db, row.child_a);
    await touchRow(db, 'battles', 'id=?', [row.id], vA);
    if (row.child_b) {
      const vB = await bumpChildVersion(db, row.child_b);
      await touchRow(db, 'battles', 'id=?', [row.id], Math.max(vA, vB));
    }
  }
  await db.batch([
    db.prepare('UPDATE coop_runs SET started_at=?, event_day=?, week_key=? WHERE run_id=?')
      .bind(now, shDateStr(), phase.week.week_key, row.run_id),
    db.prepare('INSERT INTO coop_rounds (battle_id, round_no, boss_action, opened_at) VALUES (?,1,?,?)')
      .bind(row.id, typeof ba1 === 'string' ? ba1 : JSON.stringify(ba1), now),
  ]);

  const got2 = await coopLoad(db, row.id);
  const view = await coopBattleView(db, got2.row, got2.st, parseSeatMeta(got2.row), 'R');
  return json({ ok: true, joinToken: tokenR, battle: view });
}

// 推进结果统一转响应
function coopAdvResp(adv, extra) {
  if (adv.error) {
    return json(Object.assign({ ok: false, error: adv.error }, adv.view ? { view: adv.view } : {}), adv.status || 400);
  }
  const out = Object.assign({ ok: true, battle: adv.view, events: adv.events || [] }, extra || {});
  if (adv.settled) out.settled = adv.settled;
  return json(out);
}

// 7. 拉取状态（顺带惰性推进）
async function apiCoopState(db, env, req, session) {
  if (!(await getMasterEnabled(db))) return coopErr('coop_disabled', 403);

  let body = {};
  if (req.method === 'GET') {
    const u = new URL(req.url);
    body = { battleId: u.searchParams.get('battleId'), token: u.searchParams.get('token') };
  } else {
    body = await readJsonBody(req);
  }
  const got = await coopLoad(db, body.battleId);
  if (!got) return coopErr('not_found', 404);
  const actor = await coopActorSeat(db, req, session, got.row, body);
  if (actor.err) return actor.err;
  const adv = await advanceCoopBattle(db, env, got.row.id, actor.seat);
  return coopAdvResp(adv);
}

// 8. 提交动作
async function apiCoopSubmit(db, env, req, session) {
  if (!(await getMasterEnabled(db))) return coopErr('coop_disabled', 403);

  const body = await readJsonBody(req);
  const got = await coopLoad(db, body.battleId);
  if (!got) return coopErr('not_found', 404);
  const actor = await coopActorSeat(db, req, session, got.row, body);
  if (actor.err) return actor.err;
  const seat = actor.seat;

  await advanceCoopBattle(db, env, got.row.id, seat);
  const got2 = await coopLoad(db, got.row.id);
  const row2 = got2.row;
  const st = got2.st;
  const meta2 = parseSeatMeta(row2);
  const view = async () => await coopBattleView(db, row2, st, meta2, seat);

  if (row2.status !== 'active') {
    if (row2.status === 'suspended') return coopErr('battle_suspended', 409, { view: await view() });
    if (row2.status === 'waiting') return coopErr('not_started', 400);
    return coopErr('battle_ended', 400, { view: await view() });
  }
  const rn = Number(body.roundNo);
  if (!st || rn !== row2.round_no || rn !== st.round_no) return coopErr('round_stale', 409, { view: await view() });

  const sideKey = sideOfSeat(seat);
  const side = st.sides?.[sideKey];
  const mate = coopMateSeat(seat);
  const action = body.action || {};
  const rec = { action_type: null, move_id: null, target_seat: null, switch_to: null, support_kind: null };

  if (side?.role === 'support') {
    const okKind = ['a', 'b', 'c'].includes(action.kind);
    if (action.type !== 'support' || !okKind || st.round_no < (side.support?.nextRound ?? 0)) {
      return coopErr('support_not_ready', 400);
    }
    rec.action_type = 'support';
    rec.support_kind = action.kind;
    rec.target_seat = action.kind === 'c' ? 'BOSS' : mate;
  } else if (action.type === 'move') {
    const pet = activePetOf(st, sideKey);
    const alive = pet && !pet.fainted && pet.hp > 0;
    const learned = alive && (pet.moves || []).some(m => (typeof m === 'string' ? m : m?.name) === action.moveName);
    if (!learned) return coopErr('MOVE_NOT_LEARNED', 400);
    if (moveEffectOf(action.moveName) === 'shell') {
      const t = action.shellTarget || 'self';
      if (t !== 'self' && t !== 'ally') return coopErr('SHELL_TARGET_INVALID', 400);
      rec.target_seat = t === 'self' ? seat : mate;
    } else if (action.shellTarget) {
      return coopErr('SHELL_TARGET_INVALID', 400);
    }
    rec.action_type = 'move';
    rec.move_id = action.moveName;
  } else if (action.type === 'switch') {
    const idx = Number(action.toIdx);
    const p = Number.isInteger(idx) ? (side?.pets || [])[idx] : null;
    if (!p || p.fainted || p.hp <= 0 || idx === side.activeIdx) return coopErr('SWAP_INVALID', 400);
    rec.action_type = 'switch';
    rec.switch_to = idx;
  } else {
    return coopErr('support_not_ready', 400);
  }

  const subs = (await db.prepare('SELECT * FROM coop_submissions WHERE battle_id=? AND round_no=?')
    .bind(row2.id, st.round_no).all()).results || [];
  const existing = subs.find(s => s.seat === seat);
  const mateSide = st.sides?.[sideOfSeat(mate)];
  const oppSub = mateSide?.role === 'support' ? null : subs.find(s => s.seat === mate);
  const now = nowEpoch();
  const uid = meta2[seat]?.child_id ?? null;

  if (!existing) {
    await db.prepare(
      'INSERT INTO coop_submissions (battle_id, round_no, seat, user_id, action_type, move_id, target_seat, switch_to, support_kind, is_auto_pick, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,0,?)'
    ).bind(row2.id, st.round_no, seat, uid, rec.action_type, rec.move_id, rec.target_seat, rec.switch_to, rec.support_kind, now).run();
  } else {
    const same = existing.action_type === rec.action_type && (existing.move_id ?? null) === rec.move_id &&
      (existing.target_seat ?? null) === rec.target_seat &&
      (existing.switch_to == null ? null : Number(existing.switch_to)) === rec.switch_to &&
      (existing.support_kind ?? null) === rec.support_kind && !existing.is_auto_pick;
    if (!same) {
      if (oppSub) return coopErr('move_locked', 409, { view: await view() });
      await db.prepare(
        'UPDATE coop_submissions SET user_id=?, action_type=?, move_id=?, target_seat=?, switch_to=?, support_kind=?, is_auto_pick=0, submitted_at=? WHERE battle_id=? AND round_no=? AND seat=?'
      ).bind(uid, rec.action_type, rec.move_id, rec.target_seat, rec.switch_to, rec.support_kind, now, row2.id, st.round_no, seat).run();
    }
  }

  // 真实提交：清空代选连击
  if (meta2[seat]) {
    meta2[seat].auto_pick_streak = 0;
    await saveSeatMeta(db, row2.id, meta2);
  }

  const adv = await advanceCoopBattle(db, env, row2.id, seat);
  return coopAdvResp(adv);
}

// 9. 断线恢复：密码换新 token
async function apiCoopResume(db, env, req, session) {
  if (!(await getMasterEnabled(db))) return coopErr('coop_disabled', 403);

  const body = await readJsonBody(req);
  const got = await coopLoad(db, body.battleId);
  if (!got) return coopErr('not_found', 404);
  const row = got.row;
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const cid = Number(sc.id);
  if (cid !== Number(row.child_a) && cid !== Number(row.child_b)) return coopErr('not_participant', 403);
  const child = await getChild(db, cid);
  if (!child) return coopErr('not_participant', 403);
  const v = await verifyChildPwd(db, child, body.password);
  if (!v.ok) return json({ ok: false, error: v.error }, v.status);
  if (row.status !== 'suspended' && row.status !== 'active') return coopErr('battle_ended', 400);

  const meta = parseSeatMeta(row);
  const seat = seatOfChildId(meta, cid);
  if (!seat) return coopErr('not_your_seat', 403);
  const tokenNew = randToken();
  meta.tokens = meta.tokens || {};
  meta.tokens[seat] = await sha256hex(tokenNew);
  await saveSeatMeta(db, row.id, meta);

  const adv = await advanceCoopBattle(db, env, row.id, seat);
  return coopAdvResp(adv, { token: tokenNew });
}

// 10. 退出
async function apiCoopQuit(db, env, req, session) {
  if (!(await getMasterEnabled(db))) return coopErr('coop_disabled', 403);

  const body = await readJsonBody(req);
  const got = await coopLoad(db, body.battleId);
  if (!got) return coopErr('not_found', 404);
  const row = got.row;
  const actor = await coopActorSeat(db, req, session, row, body);
  if (actor.err) return actor.err;

  if (row.status === 'waiting') {
    await settleCoopEnd(db, row, 'void');
  } else if (row.status === 'active' || row.status === 'suspended') {
    await settleCoopEnd(db, row, 'quit');
  }
  const got2 = await coopLoad(db, row.id);
  const r2 = got2 ? got2.row : row;
  const st2 = got2 ? got2.st : got.st;
  const view = await coopBattleView(db, r2, st2, parseSeatMeta(r2), actor.seat);
  return json({ ok: true, battle: view });
}

/* 静态资源缓存：文件名带 .<8位hash>. 的为内容寻址资源，可长期 immutable；
   其余（sw.js / manifest.json / 音频 / 旧名）保持 max-age=0 防旧脚本长期驻留。
   旧名文件部署后磁盘上不存在（已重命名），请求旧名直接 404，不会拿到旧脚本。 */
const HASHED_ASSET_RE = /\.[0-9a-f]{8}\.(?:js|css|png|webp|svg|woff2)$/;
function cacheControlForStatic(path) {
  return HASHED_ASSET_RE.test(path) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate';
}
function pinStaticCache(r, path) {
  const headers = new Headers(r.headers);
  headers.set('Cache-Control', cacheControlForStatic(path));
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers });
}

/* ---- 本地缓存完整版 · 同步接口（迁移 0020）---- */

/* GET /api/sync?since=&child_id= ：增量拉取。since 缺失/非法时返回全量（不过滤 ver）。
* changed 只含 ver > since 的行（行含全部列 + ver + updated_epoch）；deleted 来自
* sync_tombstones（仅增量时返回，version > since）。返回 {ok:true, version, schema_version, changed, deleted}。
* 安全：children 行去掉 pwd_hash / pwd_fail_count / pwd_locked_until；settings 行去掉 key='pin'
*（settings.pin 是家长 PIN 的 SHA-256，绝不能同步给孩子端）。 */
async function apiSync(db, url, session) {
const sc = scopeChildId(session, url.searchParams.get('child_id') || url.searchParams.get('id'));
if (sc.err) return sc.err;
const childId = sc.id;
if (!(await hasSyncTables(db))) return json({ ok: false, error: 'SYNC_NOT_READY'}, 503);
const sinceParam = url.searchParams.get('since');
const since = sinceParam!== null && /^\d+$/.test(sinceParam)? Number(sinceParam): null;
const vRow = await db.prepare('SELECT version FROM sync_versions WHERE child_id=?').bind(childId).first();
const version = vRow? vRow.version: 0;
const sRow = await db.prepare("SELECT value FROM settings WHERE key='sync_schema_version'").bind().first();
const schemaVersion = sRow? Number(sRow.value) || 1: 1;
const changed = {};
const deleted = {};
const verFilter = since === null? '': ' AND ver >?';
for (const t of SYNC_TABLES) {
let rows = [];
if (t.name === 'children') {
const sql = 'SELECT * FROM children WHERE id=?' + verFilter;
const args = since === null? [childId]: [childId, since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
rows = rows.map((r) => {
const c = {...r};
delete c.pwd_hash; delete c.pwd_fail_count; delete c.pwd_locked_until;
return c;
});
} else if (t.name === 'quiz_questions' || t.name === 'settings') {
const sql = 'SELECT * FROM ' + t.name + (since === null? '': ' WHERE ver >?');
const args = since === null? []: [since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
if (t.name === 'settings') rows = rows.filter((r) => r.key!== 'pin');
} else if (t.name === 'battles') {
const sql = 'SELECT * FROM battles WHERE (child_a=? OR child_b=?)' + verFilter;
const args = since === null? [childId, childId]: [childId, childId, since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
} else if (t.name === 'checkin_photos') {
const sql = 'SELECT * FROM checkin_photos WHERE checkin_id IN (SELECT id FROM checkins WHERE child_id=?)' + verFilter;
const args = since === null? [childId]: [childId, since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
} else if (t.name === 'unit_test_draws') {
const sql = 'SELECT * FROM unit_test_draws WHERE unit_test_id IN (SELECT id FROM unit_tests WHERE child_id=?)' + verFilter;
const args = since === null? [childId]: [childId, since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
} else {
const sql = 'SELECT * FROM ' + t.name + ' WHERE child_id=?' + verFilter;
const args = since === null? [childId]: [childId, since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
}
if (rows.length) changed[t.name] = rows;
}
if (since!== null) {
const { results} = await db.prepare(
'SELECT table_name, row_id FROM sync_tombstones WHERE child_id=? AND version >?'
).bind(childId, since).all();
for (const r of (results || [])) {
(deleted[r.table_name] = deleted[r.table_name] || []).push(r.row_id);
}
}
return json({ ok: true, version, schema_version: schemaVersion, changed, deleted});
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

/* POST /api/commands {cmd_id, child_id, type, payload}：outbox 命令提交。
* 鉴权复用 scopeChildId（孩子会话只能替自己提交，家长会话可替任一孩子）。
* types：checkin（payload 即原 /api/checkin body，含 childId）、quiz_answer
*（payload 即原 /api/quiz/answer body，含 childId 或 child_id）、gym_settle、
* pvp_settle、unit_test_submit（payload 即原 /api/child/unit-test/submit body）。
* 其余 type 返回 {ok:false, error:'UNKNOWN_TYPE'} 400。cmd_id 缺失返回 CMD_ID_REQUIRED 400。 */
async function apiCommands(db, env, req, session) {
const body = await readJsonBody(req);
const cmdId = String(body.cmd_id || '');
if (!cmdId) return json({ ok: false, error: 'CMD_ID_REQUIRED'}, 400);
const sc = scopeChildId(session, body.child_id?? body.childId);
if (sc.err) return sc.err;
const childId = sc.id;
if (!(await hasSyncTables(db))) return json({ ok: false, error: 'SYNC_NOT_READY'}, 503);
const type = String(body.type || '');
const payload = (body.payload && typeof body.payload === 'object')? body.payload: {};
const mkReq = (path) => new Request('https://test.local' + path, {
method: 'POST', headers: { 'Content-Type': 'application/json'},
body: JSON.stringify({...payload, childId}),
});
return runIdempotentCommand(db, cmdId, childId, type, async () => {
switch (type) {
case 'checkin': return apiSubmitCheckin(db, env, mkReq('/api/checkin'), session);
case 'quiz_answer': return apiQuizAnswer(db, mkReq('/api/quiz/answer'), session);
case 'gym_settle': return settleGymCore(db, childId, payload);
case 'pvp_settle': return settlePvpCore(db, childId, payload);
case 'unit_test_submit': return apiChildUnitTestSubmit(db, mkReq('/api/child/unit-test/submit'), session);
default: return json({ ok: false, error: 'UNKNOWN_TYPE'}, 400);
}
});
}

/* GET /api/quiz/all?child_id= ：全量题库拉取（755 道左右）。鉴权与 /api/quiz/today 同口径
*（scopeChildId + getChild），行经 normalizeQuizRow 归一化后返回。 */
async function apiQuizAll(db, url, session) {
const sc = scopeChildId(session, url.searchParams.get('child_id') || url.searchParams.get('id'));
if (sc.err) return sc.err;
const child = await getChild(db, sc.id);
if (!child) return json({ ok: false, error: 'NOT_FOUND'}, 404);
const { results} = await db.prepare('SELECT * FROM quiz_questions ORDER BY id').all();
return json({ ok: true, childId: child.id, count: (results || []).length, questions: (results || []).map(normalizeQuizRow)});
}

/* POST /api/photo/upload {child_id, checkin_id, name, data_b64}：离线照片补传。
* 校验与现有打卡照片路径一致：复用 parsePhotosArg 做解码与大小校验
*（PHOTO_MAX_BYTES、PHOTO_TYPES 口径不变）；按 name 后缀定 contentType
*（.png→image/png，.webp→image/webp，其余 image/jpeg）；对象 key 与
* setCheckinPhotos 同格式 checkins/{childId}/{date}/{checkinId}-{now}-{rand}.{ext}；
* PHOTOS.put 后写 checkin_photos 索引行并 syncTouch；返回 {ok:true, url, photoId}，
* url 为 /api/photos/{id}。桶未开通时 503。 */
async function apiPhotoUpload(db, env, req, session) {
const body = await readJsonBody(req);
const sc = scopeChildId(session, body.child_id?? body.childId);
if (sc.err) return sc.err;
const childId = sc.id;
const checkinId = Number(body.checkin_id?? body.checkinId);
const ck = checkinId? await db.prepare('SELECT * FROM checkins WHERE id=?').bind(checkinId).first(): null;
if (!ck) return json({ ok: false, error: 'NOT_FOUND'}, 404);
if (ck.child_id!== childId) return json({ ok: false, error: 'FORBIDDEN'}, 403);
if (!env.PHOTOS) return json({ ok: false, error: '照片功能还没开通'}, 503);
const name = String(body.name || '');
const ext = /\.png$/i.test(name)? 'png': /\.webp$/i.test(name)? 'webp': 'jpg';
const contentType = ext === 'png'? 'image/png': ext === 'webp'? 'image/webp': 'image/jpeg';
const parsed = parsePhotosArg([{ data: body.data_b64, contentType}]);
if (parsed.err) return json({ ok: false, error: parsed.err}, 400);
const item = parsed.list[0];
const now = Math.floor(Date.now() / 1000);
const rand = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
const key = `checkins/${childId}/${ck.date}/${checkinId}-${now}-${rand}.${ext}`;
await photoPut(env, key, item.bytes, item.contentType);
const r = await db.prepare(
'INSERT INTO checkin_photos(checkin_id, object_key, content_type, size, created_epoch) VALUES(?,?,?,?,?)'
).bind(checkinId, key, item.contentType, item.bytes.length, now).run();
const photoId = r.meta? Number(r.meta.last_row_id): null;
await syncTouch(db, childId, 'checkin_photos', 'id=?', [photoId]);
return json({ ok: true, url: `/api/photos/${photoId}`, photoId});
}

/* 道馆通关结算核心（供 /api/gym/settle 直接路由与 /api/commands gym_settle 共用）。
* payload：{stage, won, date, team}。校验顺序：
* ① stage 存在；② won 为 false 时不结算，返回 {ok:true, settled:false, reason:'LOST'}；
* ③ date 的上海周（weekStartMon）须等于当前周，否则 {ok:false, error:'WEEK_PASSED'} 400
*（§5.2：周次已过结算失败，客户端回滚预演）；④ 该周已有 gym_battles won 行或该关已在
* clearedStages 中 → {ok:false, error:'ALREADY_CLEARED'} 400；⑤ 孩子等级须 ≥ cfg.needLevel，
* 否则 LEVEL_TOO_LOW 400；⑥ stage>1 时前一关须已通关，否则 STAGE_LOCKED 400。
* 通过后：记一条 gym_battles(status='won', rounds=3, hearts=3) 并走现有道馆获胜奖励路径
* awardGymClear（徽章＋封印蛋＋四关全通终奖蛋，不发经验）；syncTouch gym_battles 行。
* 不改任何难度常量，不直接发经验。 */
async function settleGymCore(db, childId, payload) {
const stage = Number(payload.stage);
const cfg = GYM_STAGES.find((g) => g.stage === stage);
if (!cfg) return json({ ok: false, error: 'STAGE_NOT_FOUND'}, 400);
if (payload.won === false) return json({ ok: true, settled: false, reason: 'LOST'});
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
const wonRow = await db.prepare(
"SELECT id FROM gym_battles WHERE child_id=? AND week_start=? AND status='won' LIMIT 1"
).bind(childId, ws).first();
const cleared = await clearedStages(db, childId);
if (wonRow || cleared.has(stage)) return json({ ok: false, error: 'ALREADY_CLEARED'}, 400);
const child = await getChild(db, childId);
if (!child) return json({ ok: false, error: 'NOT_FOUND'}, 404);
if (levelFromXp(child.total_xp) < cfg.needLevel) return json({ ok: false, error: 'LEVEL_TOO_LOW'}, 400);
if (stage > 1 &&!cleared.has(stage - 1)) return json({ ok: false, error: 'STAGE_LOCKED'}, 400);
const now = Math.floor(Date.now() / 1000);
const r = await db.prepare(
"INSERT INTO gym_battles(child_id, week_start, created_at, rounds, hearts, status) VALUES(?,?,?,?,?, 'won')"
).bind(childId, ws, now, 3, 3).run();
const battleId = r.meta? Number(r.meta.last_row_id): null;
const rewards = await awardGymClear(db, childId, stage, shDateStr());
const version = await syncTouch(db, childId, 'gym_battles', 'id=?', [battleId]);
return json({ ok: true, settled: true, battleId, rewards, version});
}

/* POST /api/gym/settle {cmd_id, child_id, stage, won, date, team}：在线结算直接路由，
* 与 /api/commands 的 gym_settle 分发共用 settleGymCore 与同一套 cmd_log 幂等键。
*（二选一说明：两者都提供，直接路由供在线结算复用，commands 分发供 outbox 离线补交复用，
* 核心与幂等同一份代码，不会双写。） */
async function apiGymSettle(db, req, session) {
const body = await readJsonBody(req);
const cmdId = String(body.cmd_id || '');
if (!cmdId) return json({ ok: false, error: 'CMD_ID_REQUIRED'}, 400);
const sc = scopeChildId(session, body.child_id?? body.childId);
if (sc.err) return sc.err;
const childId = sc.id;
if (!(await hasSyncTables(db))) return json({ ok: false, error: 'SYNC_NOT_READY'}, 503);
return runIdempotentCommand(db, cmdId, childId, 'gym_settle', () => settleGymCore(db, childId, body));
}

/* PvP 结算核心（供 /api/pvp/settle 直接路由与 /api/commands pvp_settle 共用）。
* payload：{winner_child_id, loser_child_id, week}，week 为周一日期串，缺省为当前周。
* ②B：服务端用现有 pvpCountedThisWeek 校验（两孩任一本周已有计次场即视为已计次）；
* 未计次且 week 等于当前周 → 记一条 battles(mode='pvp', counted=1, status='finished',
* winner_child_id=胜者) 并按现有 PvP 获胜路径发奖（胜者 children.balls +1 ＋
* settleBallOverflow，不发经验、不改 total_xp），冠军由 apiBattlePvpStatus 从 counted 行
* 派生，无需另写冠军表；返回 {ok:true, counted:true, practice:false, battleId}。
* 已计次或 week 不等于当前周（过周）→ 记一条 practice=1、counted=0 的 battles 行
*（保留战报、不发奖、不改冠军），返回 {ok:true, counted:false, practice:true, battleId}。
* state 字段存最小战报 JSON：{sides:{A:{childId,childName},B:{childId,childName}},
* winner:'A', result:{winnerSide:'A', winnerChildId, winnerPetsLeft:null, totalActions:null}}，
* 其中 A 固定为胜者方（便于荣誉墙按 winner_child_id 取名）。
* 两孩版本都推进；battles 行 ver 取两者较大值（任一孩子增量同步都能看到这行）。 */
async function settlePvpCore(db, childId, payload) {
const winnerId = Number(payload.winner_child_id?? payload.winnerChildId?? childId);
const loserId = Number(payload.loser_child_id?? payload.loserChildId);
const ws = String(payload.week || weekStartMon(shDateStr()));
const curWs = weekStartMon(shDateStr());
const winner = await getChild(db, winnerId);
const loser = loserId? await getChild(db, loserId): null;
if (!winner ||!loser) return json({ ok: false, error: 'NOT_FOUND'}, 404);
/* 提交者（会话孩子）必须是这场对战的双方之一，且胜负双方不能是同一人。
* 注：离线本地 PvP 在服务端没有任何先行 battles 行（两人同机对战、只入队 pvp_settle），
* 故不能要求“已有对战记录”，否则合法离线结算全部被拒；本函数自己落 battles 行。 */
if (winnerId === loserId) return json({ ok: false, error: 'INVALID_PAIR'}, 400);
if (Number(childId)!== winnerId && Number(childId)!== loserId) return json({ ok: false, error: 'FORBIDDEN'}, 403);
const counted =(await pvpCountedThisWeek(db, winnerId, ws)) || (await pvpCountedThisWeek(db, loserId, ws));
const overWeek = ws!== curWs;
const now = Math.floor(Date.now() / 1000);
const state = {
sides: {
A: { childId: winnerId, childName: winner.name || ''},
B: { childId: loserId, childName: loser.name || ''},
},
winner: 'A',
result: { winnerSide: 'A', winnerChildId: winnerId, winnerPetsLeft: null, totalActions: null},
};
if (!counted &&!overWeek) {
const r = await db.prepare(
"INSERT INTO battles(mode, week_start, stage, child_a, child_b, state, status, counted, winner_child_id, finished_epoch, created_epoch) VALUES('pvp',?, NULL,?,?,?, 'finished', 1,?,?,?)"
).bind(ws, winnerId, loserId, JSON.stringify(state), winnerId, now, now).run();
const battleId = r.meta? Number(r.meta.last_row_id): null;
await db.prepare('UPDATE children SET balls = balls + 1 WHERE id=?').bind(winnerId).run();
await settleBallOverflow(db, winnerId, shDateStr());
const vW = await bumpChildVersion(db, winnerId);
const vL = await bumpChildVersion(db, loserId);
await touchRow(db, 'battles', 'id=?', [battleId], Math.max(vW, vL));
await syncTouch(db, winnerId, 'children', 'id=?', [winnerId]);
return json({ ok: true, counted: true, practice: false, battleId});
}
const r = await db.prepare(
"INSERT INTO battles(mode, week_start, stage, child_a, child_b, state, status, counted, winner_child_id, finished_epoch, created_epoch, practice) VALUES('pvp',?, NULL,?,?,?, 'finished', 0,?,?,?, 1)"
).bind(ws, winnerId, loserId, JSON.stringify(state), winnerId, now, now).run();
const battleId = r.meta? Number(r.meta.last_row_id): null;
const vW = await bumpChildVersion(db, winnerId);
const vL = await bumpChildVersion(db, loserId);
await touchRow(db, 'battles', 'id=?', [battleId], Math.max(vW, vL));
return json({ ok: true, counted: false, practice: true, battleId});
}

/* POST /api/pvp/settle {cmd_id, child_id, winner_child_id, loser_child_id, week}：
* 在线结算直接路由，与 /api/commands 的 pvp_settle 分发共用 settlePvpCore 与同一套
* cmd_log 幂等键（同 gym_settle 的二选一说明）。 */
async function apiPvpSettle(db, req, session) {
const body = await readJsonBody(req);
const cmdId = String(body.cmd_id || '');
if (!cmdId) return json({ ok: false, error: 'CMD_ID_REQUIRED'}, 400);
const sc = scopeChildId(session, body.child_id?? body.childId);
if (sc.err) return sc.err;
const childId = sc.id;
if (!(await hasSyncTables(db))) return json({ ok: false, error: 'SYNC_NOT_READY'}, 503);
return runIdempotentCommand(db, cmdId, childId, 'pvp_settle', () => settlePvpCore(db, childId, body));
}

/* -------- 路由表（B1）：原 switch(path) 的 104 个 case 机械展开，顺序不变 --------
 * method：'GET' | 'POST' | '*'（不限，原无方法检查的路由必须显式写 '*'，不得按“默认 POST”收紧）。
 * auth：'session'（仅过 requireFamily；孩子范围由 handler 内 scopeChildId/forbidIfOtherChild 自管）｜
 *       'pin'（家长 PIN 新鲜）｜'debug'（仅测试环境，非测试环境一律 404）。
 * 校验顺序与原 case 逐一一致：debug = 测试门 → PIN → method；其余 = method → PIN。 */
const ROUTES = new Map();
function route(path, opts, handler) {
  if (!opts || !opts.method) throw new Error('route ' + path + ': method 必须显式声明');
  if (ROUTES.has(path)) throw new Error('route ' + path + ': 重复注册');
  ROUTES.set(path, { opts: { method: opts.method, auth: opts.auth || 'session' }, handler });
}
function methodGate(req, method) {
  return method !== '*' && req.method !== method ? json({ ok: false, error: 'METHOD' }, 405) : null;
}
async function runRoute({ opts, handler }, c) {
  const { method, auth } = opts;
  if (auth === 'debug') {
    if (!isTestMode(c.env)) return json({ ok: false, error: 'NOT_FOUND' }, 404);
    return withPin(c.session, () => methodGate(c.req, method) || handler(c));
  }
  const m = methodGate(c.req, method);
  if (m) return m;
  return auth === 'pin' ? withPin(c.session, () => handler(c)) : handler(c);
}

route('/api/logout', { method: '*' }, ({ db, req, session }) => apiLogout(db, req, session));
route('/api/overview', { method: '*' }, ({ db, session }) => apiOverview(db, session));
route('/api/child', { method: '*' }, ({ db, url, session }) => apiChildDetail(db, Number(url.searchParams.get('id')), session));
route('/api/checkin', { method: '*' }, ({ db, env, req, session }) => apiSubmitCheckin(db, env, req, session));
route('/api/checkin/edit', { method: 'POST' }, ({ db, env, req, session }) => apiEditCheckin(db, env, req, session));
route('/api/notices/ack', { method: 'POST' }, ({ db, req, session }) => apiNoticesAck(db, req, session));
route('/api/quiz/today', { method: '*' }, ({ db, url, session }) => apiQuizToday(db, url, session));
route('/api/quiz/all', { method: '*' }, ({ db, url, session }) => apiQuizAll(db, url, session));
route('/api/care/status', { method: 'GET' }, ({ db, req, session }) => apiCareStatus(db, req, session));
route('/api/care/feed', { method: 'POST' }, ({ db, req, session }) => apiCareFeed(db, req, session));
route('/api/care/bath', { method: 'POST' }, ({ db, req, session }) => apiCareBath(db, req, session));
route('/api/warehouse/status', { method: 'GET' }, ({ db, req, session }) => apiWarehouseStatus(db, req, session));
route('/api/warehouse/store', { method: 'POST' }, ({ db, req, session }) => apiWarehouseStore(db, req, session));
route('/api/warehouse/take', { method: 'POST' }, ({ db, req, session }) => apiWarehouseTake(db, req, session));
route('/api/warehouse/swap', { method: 'POST' }, ({ db, req, session }) => apiWarehouseSwap(db, req, session));
route('/api/care/qa/status', { method: 'GET' }, ({ db, req, session }) => apiCareQaStatus(db, req, session));
route('/api/care/qa/question', { method: 'GET' }, ({ db, req, session }) => apiCareQaQuestion(db, req, session));
route('/api/care/qa/answer', { method: 'POST' }, ({ db, req, session }) => apiCareQaAnswer(db, req, session));
route('/api/quiz/answer', { method: 'POST' }, ({ db, req, session }) => apiQuizAnswer(db, req, session));
route('/api/sync', { method: '*' }, ({ db, url, session }) => apiSync(db, url, session));
route('/api/commands', { method: 'POST' }, ({ db, env, req, session }) => apiCommands(db, env, req, session));
route('/api/photo/upload', { method: 'POST' }, ({ db, env, req, session }) => apiPhotoUpload(db, env, req, session));
route('/api/gym/settle', { method: 'POST' }, ({ db, req, session }) => apiGymSettle(db, req, session));
route('/api/pvp/settle', { method: 'POST' }, ({ db, req, session }) => apiPvpSettle(db, req, session));
route('/api/quiz/diagnosis', { method: '*' }, ({ db, url, session }) => apiQuizDiagnosis(db, url, session));
route('/api/quiz/review', { method: 'POST' }, ({ db, req, session }) => apiQuizReview(db, req, session));
route('/api/quiz/upgrade-move', { method: 'POST' }, ({ db, req, session }) => apiQuizUpgradeMove(db, req, session));
route('/api/oak/today', { method: '*' }, ({ db, url, session }) => apiOakToday(db, url, session));
route('/api/oak/listen', { method: 'POST' }, ({ db, req, session }) => apiOakListen(db, req, session));
route('/api/oak/assess', { method: '*' }, ({ db, env, req, session }) => apiOakAssess(db, req, session, env));
route('/api/daily-english', { method: '*' }, ({ db, url, session }) => apiDailyEnglish(db, url, session));
route('/api/daily-english/checkin', { method: 'POST' }, ({ db, req, session }) => apiDailyEnglishCheckin(db, req, session));
route('/api/daily-english/assess', { method: '*' }, ({ db, env, req, session }) => apiDailyEnglishAssess(db, req, session, env));
route('/api/daily-chinese', { method: '*' }, ({ db, url, session }) => apiDailyChinese(db, url, session));
route('/api/daily-chinese/checkin', { method: 'POST' }, ({ db, req, session }) => apiDailyChineseCheckin(db, req, session));
route('/api/daily-chinese/assess', { method: '*' }, ({ db, env, req, session }) => apiDailyChineseAssess(db, req, session, env));
route('/api/daily-math', { method: '*' }, ({ db, url, session }) => apiDailyMath(db, url, session));
route('/api/daily-math/answer', { method: 'POST' }, ({ db, req, session }) => apiDailyMathAnswer(db, req, session));
route('/api/daily-math/checkin', { method: 'POST' }, ({ db, req, session }) => apiDailyMathCheckin(db, req, session));
route('/api/encounter/pending', { method: '*' }, ({ db, req, session }) => apiPendingEncounter(db, req, session));
route('/api/encounter/throw', { method: '*' }, ({ db, req, session }) => apiThrowBall(db, req, session));
route('/api/encounter/answer', { method: 'POST' }, ({ db, req, session }) => apiEncounterAnswer(db, req, session));
route('/api/encounter/draft', { method: 'POST' }, ({ db, req, session }) => apiEncounterDraft(db, req, session));
route('/api/gym/status', { method: '*' }, ({ db, req, session }) => apiGymStatus(db, req, session));
route('/api/battle/gym/start', { method: 'POST' }, ({ db, req, session }) => apiBattleGymStart(db, req, session));
route('/api/battle/move', { method: 'POST' }, ({ db, req, session }) => apiBattleMove(db, req, session));
route('/api/battle/defend', { method: 'POST' }, ({ db, req, session }) => apiBattleDefend(db, req, session));
route('/api/battle/state', { method: 'POST' }, ({ db, req, session }) => apiBattleState(db, req, session));
route('/api/battle/abandon', { method: 'POST' }, ({ db, req, session }) => apiBattleAbandon(db, req, session));
route('/api/battle/pvp/create', { method: 'POST' }, ({ db, req, session }) => apiBattlePvpCreate(db, req, session));
route('/api/battle/pvp/join', { method: 'POST' }, ({ db, req, session }) => apiBattlePvpJoin(db, req, session));
route('/api/battle/pvp/status', { method: '*' }, ({ db, req, session }) => apiBattlePvpStatus(db, req, session));
route('/api/battle/pvp/rematch/request', { method: 'POST' }, ({ db, req, session }) => apiBattlePvpRematchRequest(db, req, session));
route('/api/coop/gathering', { method: '*' }, ({ db, env, req, session }) => apiCoopGathering(db, env, req, session));
route('/api/coop/map', { method: '*' }, ({ db, env, req, session }) => apiCoopMap(db, env, req, session));
route('/api/parent/coop/overview', { method: '*', auth: 'pin' }, ({ db, env, session }) => apiParentCoopOverview(db, env, session));
route('/api/parent/holiday/config', { method: '*', auth: 'pin' }, ({ db, env, session }) => apiParentHolidayGet(db, env, session));
route('/api/parent/holiday/config/update', { method: 'POST', auth: 'pin' }, ({ db, env, req, session }) => apiParentHolidayUpdate(db, env, req, session));
route('/api/battle/coop/create', { method: 'POST' }, ({ db, env, req, session }) => apiCoopCreate(db, env, req, session));
route('/api/battle/coop/join', { method: 'POST' }, ({ db, env, req, session }) => apiCoopJoin(db, env, req, session));
route('/api/battle/coop/state', { method: '*' }, ({ db, env, req, session }) => apiCoopState(db, env, req, session));
route('/api/battle/coop/submit', { method: 'POST' }, ({ db, env, req, session }) => apiCoopSubmit(db, env, req, session));
route('/api/battle/coop/resume', { method: 'POST' }, ({ db, env, req, session }) => apiCoopResume(db, env, req, session));
route('/api/battle/coop/quit', { method: 'POST' }, ({ db, env, req, session }) => apiCoopQuit(db, env, req, session));
route('/api/eggs', { method: '*' }, ({ db, req, session }) => apiSealedEggs(db, req, session));
route('/api/pokedex', { method: '*' }, ({ db, req, session }) => apiPokedex(db, req, session));
route('/api/parent/verify-pin', { method: '*' }, ({ db, req, session }) => apiVerifyPin(db, req, session));
route('/api/parent/pending', { method: '*', auth: 'pin' }, ({ db }) => apiPendingReviews(db));
route('/api/parent/pvp-rematch', { method: '*', auth: 'pin' }, ({ db }) => apiParentPvpRematchList(db));
route('/api/parent/pvp-rematch/decide', { method: 'POST', auth: 'pin' }, ({ db, req }) => apiParentPvpRematchDecide(db, req));
route('/api/parent/balls/grant', { method: 'POST', auth: 'pin' }, ({ db, req }) => apiParentGrantBall(db, req));
route('/api/parent/history/grant', { method: 'POST', auth: 'pin' }, ({ db, req }) => apiParentHistoryGrant(db, req));
route('/api/parent/review', { method: '*', auth: 'pin' }, ({ db, req }) => apiReview(db, req));
route('/api/parent/stats', { method: '*', auth: 'pin' }, ({ db }) => apiStats(db));
route('/api/parent/history', { method: '*', auth: 'pin' }, ({ db }) => apiHistory(db));
route('/api/parent/settings', { method: '*', auth: 'pin' }, ({ db, env }) => apiGetSettings(db, env));
route('/api/parent/questions', { method: '*', auth: 'pin' }, ({ db, req }) => (req.method === 'POST' ? apiParentQuestionAdd(db, req) : apiParentQuestions(db)));
route('/api/parent/settings/update', { method: '*', auth: 'pin' }, ({ db, req }) => apiUpdateSettings(db, req));
route('/api/parent/switch-line', { method: '*', auth: 'pin' }, ({ db, req }) => apiSwitchLine(db, req));
/* 进化道具 v11（迁移 0019）：孩子端用 scopeChildId 鉴权，家长端用 requirePin */
route('/api/evo/backpack', { method: '*' }, ({ db, url, session }) => apiEvoBackpack(db, url, session));
route('/api/evo/use-stone', { method: 'POST' }, ({ db, req, session }) => apiEvoUseStone(db, req, session));
route('/api/evo/evolve', { method: 'POST' }, ({ db, req, session }) => apiEvoEvolve(db, req, session));
route('/api/evo/wheel/spin', { method: 'POST' }, ({ db, req, session }) => apiEvoWheelSpin(db, req, session));
route('/api/rare-wheel/spin', { method: 'POST' }, ({ db, req, session }) => apiRareWheelSpin(db, req, session));
route('/api/care-wheel/spin', { method: 'POST' }, ({ db, req, session }) => apiCareWheelSpin(db, req, session));
route('/api/child/switch-line', { method: 'POST' }, ({ db, req, session }) => apiChildSwitchLine(db, req, session));
route('/api/child/unit-test', { method: '*' }, ({ db, url, session }) => apiChildUnitTest(db, url, session));
route('/api/child/unit-test/submit', { method: 'POST' }, ({ db, req, session }) => apiChildUnitTestSubmit(db, req, session));
route('/api/parent/school-test/save', { method: 'POST', auth: 'pin' }, ({ db, env, req }) => apiParentSchoolTestSave(db, env, req));
route('/api/parent/school-tests', { method: '*', auth: 'pin' }, ({ db, env, req }) => apiParentSchoolTests(db, env, req));
route('/api/parent/school-test/grant', { method: 'POST', auth: 'pin' }, ({ db, req }) => apiParentSchoolTestGrant(db, req));
route('/api/parent/school-test/void', { method: 'POST', auth: 'pin' }, ({ db, env, req }) => apiParentSchoolTestVoid(db, env, req));
route('/api/parent/school-test/review', { method: 'POST', auth: 'pin' }, ({ db, req }) => apiParentSchoolTestReview(db, req));
route('/api/child/school-test/submit', { method: 'POST' }, ({ db, env, req, session }) => apiChildSchoolTestSubmit(db, env, req, session));
route('/api/child/school-tests', { method: '*' }, ({ db, req, session }) => apiChildSchoolTests(db, req, session));
route('/api/parent/unit-test/start', { method: 'POST', auth: 'pin' }, ({ db, req }) => apiParentUnitTestStart(db, req));
route('/api/parent/reset', { method: '*', auth: 'pin' }, ({ db, env, req }) => apiResetAll(db, env, req));
route('/api/parent/debug-time', { method: 'POST', auth: 'debug' }, ({ db, req }) => apiDebugTimeSet(db, req));
route('/api/parent/debug-gates', { method: 'POST', auth: 'debug' }, ({ db, req }) => apiDebugGatesSet(db, req));
route('/api/parent/debug-reset', { method: 'POST', auth: 'debug' }, ({ db, env, req }) => apiDebugReset(db, env, req));
route('/api/parent/debug-state', { method: '*', auth: 'debug' }, ({ db }) => apiDebugState(db));
route('/api/parent/debug-set', { method: 'POST', auth: 'debug' }, ({ db, req }) => apiDebugSet(db, req));

/* Server-Timing（任务 89）：total 全程、session 会话查找、db（D1 等待墙钟，见 timedDb）、
 * handler 会话后分发（含 DB＋业务逻辑）。未走会话查找的路径（登录、静态资源）只有 total（登录有 db）。
 * X-D1-Stats：q 查询数、wall D1 等待总墙钟、exec D1 内部执行总和、read/written 行数、slow 最慢 2 条（墙钟/执行/读行:SQL）。
 * 注意：first() 不带 meta，exec/read 为下限；并行查询的墙钟会重叠相加，db 墙钟可能大于 total。 */
/* Server-Timing 的边缘信息（Task 89 item 6）：只含数据中心 colo 与运营商 AS 号 asn，绝不含客户端 IP。
 * req.cf 在本地开发 / 单测（mock Request）里为 undefined：全程守卫，取不到就不输出对应字段，header 与改前一致。
 * 用 desc 而不是 dur（这两个不是时长）；值经白名单校验，避免带入引号/分号等字符。 */
function edgeTimingParts(req) {
  const cf = req && req.cf;
  if (!cf) return [];
  const parts = [];
  if (typeof cf.colo === 'string' && /^[A-Za-z0-9]{2,8}$/.test(cf.colo)) parts.push(`colo;desc="${cf.colo}"`);
  if (Number.isInteger(cf.asn) && cf.asn > 0) parts.push(`asn;desc="${cf.asn}"`);
  return parts;
}
function withServerTiming(res, totalMs, sessionMs, handlerMs, dbStats, includeQueryLog, req) {
  const parts = [`total;dur=${totalMs.toFixed(1)}`];
  if (sessionMs != null) parts.push(`session;dur=${sessionMs.toFixed(1)}`);
  if (dbStats && dbStats.queries > 0) parts.push(`db;dur=${dbStats.dbWallMs.toFixed(1)}`);
  if (handlerMs != null) parts.push(`handler;dur=${handlerMs.toFixed(1)}`);
  parts.push(...edgeTimingParts(req));
  const h = new Headers(res.headers);
  h.set('Server-Timing', parts.join(', '));
  if (dbStats && dbStats.queries > 0) h.set('X-D1-Stats', d1StatsHeader(dbStats));
  if (includeQueryLog && dbStats && dbStats.log.length > 0) h.set('X-D1-Queries', d1QueriesHeader(dbStats));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function d1QueriesHeader(s) {
  // 全部查询按执行顺序：序号:墙钟ms:SQL（截 70 字）。仅测试模式输出，供 Claude 标 batch 用。
  return s.log.map((e, i) => `${i + 1}:${Math.round(e.wall)}:${e.sql.replace(/[^ -~]/g, '').replace(/;/g, ' ')}`).join('; ');
}

function d1StatsHeader(s) {
  const parts = [`q=${s.queries}`, `wall=${Math.round(s.dbWallMs)}`, `exec=${Math.round(s.dbExecMs)}`, `read=${s.rowsRead}`, `written=${s.rowsWritten}`];
  s.slow.forEach((e, i) => {
    parts.push(`slow${i + 1}=${Math.round(e.wall)}/${Math.round(e.exec)}/${e.read}:${e.sql.replace(/[^ -~]/g, '').replace(/;/g, ' ')}`);
  });
  return parts.join('; ');
}

/* D1 计时（任务 89 续）：包一层 db，累计每请求的查询数、D1 等待墙钟、D1 内部执行时间、
 * 读/写行数与最慢的 2 条 SQL。墙钟含往返，exec 为 D1 内部耗时，两者之差≈网络往返。
 * 只包 prepare/batch；SQL 文本为代码常量（值走 bind），不含用户数据。 */
function timedDb(realDb, stats) {
  function cleanSql(sql, n) { return String(sql).replace(/\s+/g, ' ').slice(0, n); }
  function pushSlow(sql, wall, exec, read) {
    stats.slow.push({ sql: cleanSql(sql, 80), wall, exec, read });
    stats.slow.sort((a, b) => b.wall - a.wall);
    if (stats.slow.length > 2) stats.slow.length = 2;
  }
  function record(sql, wallMs, meta) {
    stats.queries += 1;
    stats.dbWallMs += wallMs;
    stats.log.push({ sql: cleanSql(sql, 70), wall: wallMs });
    if (meta) {
      stats.dbExecMs += meta.duration || 0;
      stats.rowsRead += meta.rows_read || 0;
      stats.rowsWritten += meta.rows_written || 0;
    }
    pushSlow(sql, wallMs, (meta && meta.duration) || 0, (meta && meta.rows_read) || 0);
  }
  function wrapStmt(sql, real) {
    // 注意：D1 的 bind() 返回新语句（不可变语义），丢掉返回值就等于没绑定参数，
    // 执行时报 "Wrong number of parameter bindings"。必须跟踪 bind 的返回值。
    let bound = real;
    const stmt = {
      get _real() { return bound; },
      bind(...args) { bound = bound.bind(...args); return stmt; },
      async first() { const t0 = Date.now(); const r = await bound.first(); record(sql, Date.now() - t0, r && r.meta); return r; },
      async all() { const t0 = Date.now(); const r = await bound.all(); record(sql, Date.now() - t0, r && r.meta); return r; },
      async run() { const t0 = Date.now(); const r = await bound.run(); record(sql, Date.now() - t0, r && r.meta); return r; },
    };
    return stmt;
  }
  return {
    prepare(sql) { return wrapStmt(sql, realDb.prepare(sql)); },
    async batch(stmts) {
      const t0 = Date.now();
      const reals = (stmts || []).map((s) => (s && s._real) ? s._real : s);
      const res = await realDb.batch(reals);
      const wall = Date.now() - t0;
      stats.queries += (stmts || []).length;
      stats.dbWallMs += wall;
      if (Array.isArray(res)) {
        for (const r of res) {
          const meta = r && r.meta;
          if (meta) {
            stats.dbExecMs += meta.duration || 0;
            stats.rowsRead += meta.rows_read || 0;
            stats.rowsWritten += meta.rows_written || 0;
          }
        }
      }
      pushSlow('BATCH(' + (stmts || []).length + ' stmts)', wall, 0, 0);
      stats.log.push({ sql: 'BATCH(' + (stmts || []).length + ' stmts)', wall });
      return res;
    },
  };
}

// 维护页：全站停用时返回。内联样式，不依赖任何静态资源。
function maintenancePage() {
  const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>打卡站维护中</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f1e7;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#333}main{text-align:center;padding:24px}.e{font-size:56px}h1{font-size:28px;margin:12px 0}p{font-size:17px;line-height:1.8;margin:8px 0;color:#666}</style></head>'
    + '<body><main><div class="e">🔧</div><h1>无法让网瘾少年使用</h1>'
    + '<p>打卡站维护中</p></main></body></html>';
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(req, env) {
    const t0 = Date.now();
    let sessionMs = null;
    let tHandler0 = 0;
    const dbStats = { queries: 0, dbWallMs: 0, dbExecMs: 0, rowsRead: 0, rowsWritten: 0, slow: [], log: [] };
    const includeQueryLog = isTestMode(env); // 测试模式才输出 X-D1-Queries 全部查询清单
    try {
      const res = await (async () => {
    const url = new URL(req.url);
    const path = url.pathname;
    // 维护模式（2026-11-12 用户令）：MAINTENANCE_MODE=1 时停用打卡站。
    // exempt.example.com 例外（用户 2026-11-12 令恢复并保持能打开）：该域名不拦。
    // 首页与所有页面返回维护页，API 返回 503；不查库、不读静态资源、不登录。
    const MAINTENANCE_EXEMPT = new Set(['exempt.example.com', 'www.exempt.example.com']);
    if (env.MAINTENANCE_MODE === '1' && !MAINTENANCE_EXEMPT.has(url.hostname)) {
      if (path.startsWith('/api/')) return json({ ok: false, error: 'MAINTENANCE' }, 503);
      return maintenancePage();
    }
    const db = timedDb(env.DB, dbStats);
    await applyDebugTime(db, env); // 正式环境恒为 no-op（DEBUG_NOW_MS=null）

    // 登录 API（公开）：孩子密码登录 / 家长 PIN 登录。原 /api/login（家庭密码）已下线
    if (path === '/api/child/login' && req.method === 'POST') return apiChildLogin(db, req);
    if (path === '/api/parent/login' && req.method === 'POST') return apiParentLogin(db, req);
    if (path === '/login') {
      const s0 = await getSession(db, req);
      if (s0) return Response.redirect(new URL('/', url), 302);
      return rolePage(db, url.hostname);
    }

    // 静态资源（无机密；图片/manifest/图标/前端脚本）
    // iOS 会直接请求站点根部的 apple-touch-icon；manifest 惯例路径也要能命中（文件都在 /static/ 下）
    const ASSET_ALIAS = { '/apple-touch-icon.png': '/static/icon-180.b45abbc0.png', '/apple-touch-icon-precomposed.png': '/static/icon-180.b45abbc0.png', '/manifest.json': '/static/manifest.json', '/sw.js': '/static/sw.js' };
    if (path !== '/' && ASSET_ALIAS[path]) {
      return pinStaticCache(await env.ASSETS.fetch(new Request(new URL(ASSET_ALIAS[path], url), req)), ASSET_ALIAS[path]);
    }
    if (path !== '/' && STATIC_PREFIXES.some((p) => path.startsWith(p))) {
      return pinStaticCache(await env.ASSETS.fetch(req), path);
    }

    // 首页与 API 都要先有会话（孩子或家长）
    const tSess = Date.now();
    const session = await getSession(db, req);
    sessionMs = Date.now() - tSess;
    tHandler0 = Date.now();
    if (path === '/' || path === '/index.html') {
      if (!session) return rolePage(db, url.hostname);
      const r = await env.ASSETS.fetch(new Request(new URL('/index.html', url), req));
      const h = new Headers(r.headers);
      h.set('Cache-Control', 'no-store');
      if (!isProdHost(url.hostname)) h.set('X-Robots-Tag', 'noindex');
      return new Response(r.body, { status: r.status, headers: h });
    }

    if (path.startsWith('/api/')) {
      const gate = requireFamily(session);
      if (gate) return gate;
        // 照片读取：GET /api/photos/:id（鉴权在处理函数内按归属判定）
        const pm = path.match(/^\/api\/photos\/(\d+)$/);
        if (pm && req.method === 'GET') return apiGetPhoto(db, env, Number(pm[1]), session);
        // 家长看试卷照片：GET /api/parent/school-photo/:recordId（PIN 会话）
        const spm = path.match(/^\/api\/parent\/school-photo\/(\d+)$/);
        if (spm && req.method === 'GET') return withPin(session, () => apiParentSchoolPhoto(db, env, Number(spm[1])));
        // 家长题目管理：带 id 的子路径（DELETE / toggle）
        const qm = path.match(/^\/api\/parent\/questions\/(\d+)(\/toggle)?$/);
        if (qm) {
          return withPin(session, () => {
            const qid = Number(qm[1]);
            if (req.method === 'DELETE' && !qm[2]) return apiParentQuestionDelete(db, qid);
            if (req.method === 'POST' && qm[2]) return apiParentQuestionToggle(db, qid);
            return json({ ok: false, error: 'NOT_FOUND' }, 404);
          });
        }
        const hit = ROUTES.get(path);
        if (!hit) return json({ ok: false, error: 'NOT_FOUND' }, 404);
        return runRoute(hit, { db, env, req, url, session });
    }

    // 其余路径：已登录回首页，未登录回入口页
    return session ? Response.redirect(new URL('/', url), 302) : rolePage(db, url.hostname);
      })();
      const totalMs = Date.now() - t0;
      const handlerMs = tHandler0 ? Date.now() - tHandler0 : null;
      return withServerTiming(res, totalMs, sessionMs, handlerMs, dbStats, includeQueryLog, req);
    } catch (e) {
      const res = json({ ok: false, error: 'SERVER_ERROR', message: String(e && e.message || e) }, 500);
      return withServerTiming(res, Date.now() - t0, null, null, dbStats, includeQueryLog, req);
    }
  },
};

/* 纯函数导出（本地单测用） */
export {
  CARE_FOODS, CARE_BATHS, CARE_SCENES, CARE_FAVORITE_BY_LINE, CARE_XP_FAVORITE, careSceneForDate, careFavoriteFood, careFoodByKey, careBathByKey, isCareEnabled,
  shDateStr, shTimeHM, addDays, diffDays, isWeekendDate, weekStartMon,
  nowDate, isTestMode, applyDebugTime,
  xpForLevel, levelFromXp, formIdxForLevel, learnedMoves, newMovesBetween, earlyBefore,
  LINES, WILD,
  QUIZ_SUBJECTS, QUIZ_SLOTS_ALL, CHECKIN_SUBJECTS, expandQuizSubjects, quizDailyTotal, gradeNumFromLabel,
  QUIZ_CORRECT_WINDOW_DAYS, QUIZ_WRONG_GAP_DAYS,
  fragmentsForCorrectTotal, fragmentAwardOnCorrect, questionLabel,
  OAK_GROUP_SIZE, pickOakEpisode, oakAudioUrl, oakGroupForChild, oakSummaryForChild,
  OAK_FIVE_STAR_PRON, OAK_DRAW_MIN_FIVE_STAR, OAK_DRAW_XP, OAK_WHEEL_POOL, oakStarsFromPron, oakRollDraw, oakPrizeDisplay, oakWheelEntries, oakWheelFor,
  effectiveMoves, allMovesFor, lineMovesFor, getExMainLine, debugMovesFor, selectDailyQuestions, safeJsonArr, safeJsonObj,
  MOVES_OFFICIAL, COLLECTION_LEARNSET, learnedCollectionMoves, collectionMovesFor,
  MATH_CHAPTERS, chapterOrder, mathGateFor, defaultMathChapter, normalizeQuizRow,
  loadMathGate, mathGatePass, questionActivationError, pickCatchQuestions, pickDefenseQuestion, pickUnitTestQuestions,
  CHINESE_CHAPTERS, ENGLISH_UNITS, chineseOrder, englishOrder, chineseGateFor, englishGateFor,
  photosByCheckin,
  oakEnglishOrder, showEnglishZh,
  defaultChineseChapter, defaultEnglishChapter, loadChineseGate, loadEnglishGate, chineseGatePass, englishGatePass,
  TYPES, TYPE_CHART, typeMult, OFFICIAL_MULT, typeMultOfficial, countersForType, matchupsForType, bossDefTypes, playerDefTypes, typeMultOfficialMulti, matchupsForTypes, statsFor, officialMove, moveCategory, lineFormNo, calcDamage, battleMaxHp, makePet, createBattleState,
  abilityOf, ABILITY_NO_EFFECT, endureRate, tryEndure, healPet, applyAbilityHeal, FRIENDSHIP_MAX,
  // 战斗特性第二期：阶段/状态系统。
  stageMult, stagesOf, changeStage, resetStages, clearPetBattleState, effectiveSpeed,
  triggerSwitchIn, onPetLeavesField, foeSidesOf, isContactMove, NON_CONTACT_MOVES,
  STATUS_KINDS, STATUS_LABEL, STAGE_KEYS, STAGE_LABEL,
  statusImmunityReason, tryInflictStatus, applyStatusInflict, applyContactTrigger,
  statusBlocksAction, settleStatusTick, tickActiveStatuses, applyAbilityStages, applyAbilityFlashFire, stagedMoveForContact, applyStagedBlocked, abilityEventText,
  applyBattleAction, canSideAttack, activePetOf, flattenSideLevel, rollRng,
  // 导出独立命中率查询，并移除已废弃的道馆区间常量。
  officialAccuracy,
  resolveGymRound, gymBossChoose,
  stagePvpAttack, resolveStagedAttack, DEFENSE_KINDS, pickDefenseKind, defenseSummaryFromLog,
  PVP_CRIT_RATE, PVP_CRIT_MULT, PVP_HP_MULT, pvpMaxHp,
  PVP_DEFENSE_TIMEOUT_SECS, bothSidesEntered, stepDefenseTimeout,
  CRIT_RATE, CRIT_MULT, BALL_DROP_DAILY_LIMIT, rollBallDrop, rollWildEncounter,
  WILD_TIERS, wildTierOf, catchQuestionsFor, pickWildSpecies, judgeCatch,
  MOVE_EFFECTS, moveEffectOf, fxOf, applyStagedEffect, applyStagedMiss, applyEffectFlag, consumeAttackMods,
  SKILL_MAX_LEVEL, SKILL_WEAK_MULT, SKILL_CHARGE_MULT, SKILL_SHELL_MULT, SKILL_SMOKE_MISS, skillLevelOf, skillPower, skillEffectFor,
  loadBattle, saveBattle,
  COOP_MAPS, coopNode, coopMapNodes, coopRewardRef, coopRewardLabel, coopRewardAsset, validateCoopMap,
  createCoopBattleState, buildCoopBossSide, coopBossChoose, resolveCoopRound,
  coopAddShellLayer, coopPeekShellLayer, coopConsumeShellLayer,
  getMasterEnabled, listHolidays, currentHoliday, holidayPhase, ensureCoopEvent, computeGatherCounts, refreshGathering, coopDayGateMet,
  advanceCoopBattle, settleCoopWin, settleCoopEnd, coopThresholds,
  SPECIES, COLLECTION_MOVES, GYM_STAGES, PLAYER_SCALE, BOSS_SCALE, effPlayerLevel, effBossLevel, dexKeyForSpecies, speciesOfDexKey, LINE_TYPE,
  POKEDEX_TOTAL, ownedDexNos, dex151Progress,
  pinFresh, PIN_SESSION_SECS,
  MATH_PREREQ_G1G3, DIAG_WINDOW_DAYS, DIAG_WEAK_MIN_WRONG, DIAG_WEAK_MIN_RATIO,
  DIAG_REVIEW_COUNT, DIAG_MAX_DEPTH, DIAG_EXPIRE_DAYS, DIAG_FAIL_CLOSED, DIAG_NO_QUESTION_TOPIC,
  diagTopicStates, diagWeakestTopic, diagFindRoot, diagPickReview,
  ITEM_CATALOG, EGG_ITEM_BY_SPECIES, EGG_SPECIES_BY_ITEM, EGG_HATCH_DAYS, MAIN_EVO_STONE, EEVEE_BRANCHES,
  EGG_DESIGNS, EGG_TYPE_FALLBACK, EGG_MYSTERY, eggDesignFor,
  FAIRY_TEACH_POOL, EVO_LINES, SWITCH_REQ, GYM_ITEM_EFFECTS, GYM_ITEM_CAPS,
  DEX_DETAILS, evoCondText, dexEvoChain,
  DAILY_DROP_RATE, DAILY_DROP_DAILY_LIMIT, DAILY_DROP_TABLE, DAILY_DROP_STONES, WHEEL_POOL, WHEEL_EGG_POOL,
  UNIT_TEST_WIN_CHANCE, UNIT_TEST_PRIZE, UNIT_TEST_STONES_COMMON, UNIT_TEST_STONES_RARE,
  UNIT_TEST_EGG_MAIN, UNIT_TEST_EGG_RARE, UNIT_TEST_QUESTION_COUNT, UNIT_TEST_COOLDOWN_SECS,
  UNIT_TEST_WEEK_LIMIT, WHEEL_WEEK_LIMIT, SCHOOL_PHOTO_KEEP_DAYS, BALL_EXCHANGE, BALL_MAX,
  rollDailyItemDrop, rollWheelPrize, rollSchoolOrdinary, SCHOOL_ORDINARY_XP, SCHOOL_HEAL_MEDICINES, unitTestWinChance, rollUnitTestPrize, evoOptionsFor, evoStepsForSpecies,
  WHEEL_COLORS, buildWheelSectors, wheelWinnerIndex,
  RARE_WHEEL_LEGENDARIES, RARE_WHEEL_EEVEE, RARE_WHEEL_FINALS, rareWheelFinals, rollRareWheelPrize, rareWheelSectors, TCG_CARDS,
  CARE_WHEEL_POOL, rollCareWheelPrize, careWheelEntries, careWheelFor, grantCareWheelChance, careWheelChancesLeft,
  settleBallOverflow, addBalls, addItem, takeItem, grantEgg,
  iflytekWavToPcm, iflytekB64encode, iflytekB64decodeUtf8, iflytekSignature, iflytekAuthUrl,
  iflytekDpToErr, iflytekParseResultXml, iflytekAssess, azureAssess,
  ownedCollection, carriedCollection, insertPokedexWithCarryRule, mainPetSpeciesNo, friendshipHeartsOf,
  DAILY_ENGLISH_COUNT, DAILY_ENGLISH_POOL, DAILY_ENGLISH_EPISODES, DAILY_ENGLISH_PASS_PRON, dailyEnglishStarsFromPron, dailyEnglishSidKey,
  DAILY_CHINESE_POOL, DAILY_CHINESE_PASS_PRON, dailyChineseStarsFromPron, dailyChineseTodayFor,
  DAILY_MATH_COUNT, DAILY_MATH_PASS_COUNT, genMathProblem, dailyMathTodayFor, genMathBracket, genMathWord, DAILY_MATH_WORD_G1, DAILY_MATH_WORD_G3,
  dailyEnglishHash32, mulberry32, dailyEnglishPoolFor, pickDailyEnglish, pickDailyEnglishMixed, isDailyEnglishSpoken, dailyEnglishTodayFor,
};
