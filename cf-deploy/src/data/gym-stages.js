/* 道馆定参（2026-10-22 改版，DESIGN-道馆改版-v1 §6 定版）：同时选招＋区间伤害下
 * 以「门槛等级主宠＋同级克制备战、贪心策略」模拟定参，目标胜率带 40–50%
 * （镜像关 S2/S4 取难线进带口径）。数值与 sim-gym-rework/rec.json 逐项一致，勿手改。
 * 2026-10-24 S2 改版（DESIGN-道馆后续关卡规范-v1.md 规则 E）：仅招式配比调整（水 40→30、
 * 地面 60→70），bossLevel/hpMult/needLevel 不动；仿真 scripts/sim-s2-rework.mjs（真实引擎，
 * 两孩真实队伍）：大宝 Lv.8 50.8%、小宝＋草备战 Lv.9 46.3%（N=5000，目标带 40–55%）。
 * 2026-10-26 v11 仿真门（DESIGN-进化道具-方案-v11 §9.4）：道具组（伤药×2＋活力碎片×1）
 * 把 S1 带道具胜率推到 62.9%/58.5%（超带），按“超带则重调 boss 参数”将 S1 hpMult
 * 2.82→3.0；重仿真后 S1 带道具 52.8%/49.1% 回带内（无道具 36.9%/30.8%）；
 * rec.json 与 results-final.json 已同步更新，见 scripts/sim-gym-stages.mjs v11 段。
 * 2026-10-27 等比换算分关实施：S2 hpMult 2.0→1.8（配合馆主系数 1.5；筛查见 work/sim-scale-1.5-1.8-2.0.txt §六）。
 * 2026-10-28 PvE 收紧实施（用户点选主选组合）：BOSS_SCALE → { 1: 2.33, 2: 1.7, 3: 1.7, 4: 1.85 }，S4 hpMult 2.55→2.7；筛查见 work/sim-tighten-20261028.txt §七。
 * 2026-11-08 新增 S5 火系道馆（59 风速狗，needLevel 17，bossLevel 21，hpMult 2.4，蛋 126）与 S6 地面道馆（112 铁甲暴龙，needLevel 20，bossLevel 23，hpMult 2.6，蛋 208）；BOSS_SCALE 5/6 均取 1.85，真实队伍带道具仿真难线胜率 S5 小宝+54 47.05%、S6 大宝+98 46.50%（目标带 40–55%）。
 * 2026-11-08 蛋更换（用户定）：S5 蛋 58→126 鸭嘴火兽、S6 蛋 111→208 大钢蛇——58/111 已在第一批野外池且大宝已有，道馆蛋须是不易得的种；126（火稀有独立种）、208（地面稀有，前身 95 不在野外池）两孩均未有。 */
export const GYM_STAGES = [
  { stage: 1, gymName: '岩石道馆', badge: '岩石徽章', bossNo: 95, needLevel: 5, bossLevel: 6, hpMult: 3.0, eggSpecies: 143, weather: 'sand', bossMoves: [['岩石猛击', '岩石', 28], ['尾巴横扫', '普通', 34], ['大地重压', '地面', 36]] },
  { stage: 2, gymName: '水系道馆', badge: '水滴徽章', bossNo: 121, needLevel: 8, bossLevel: 12, hpMult: 1.8, eggSpecies: 131, weather: null, bossMoves: [['水炮冲击', '水', 30], ['大地之力', '地面', 70], ['旋转突进', '普通', 60]] },
  { stage: 3, gymName: '电系道馆', badge: '闪电徽章', bossNo: 125, needLevel: 11, bossLevel: 13, hpMult: 2.2, eggSpecies: 133, weather: null, bossMoves: [['雷电重拳', '电', 64], ['十万电光', '电', 72], ['疾风电爪', '电', 54]] },
  { stage: 4, gymName: '草系道馆', badge: '叶绿徽章', bossNo: 45, needLevel: 14, bossLevel: 18, hpMult: 4.0, eggSpecies: 147, weather: 'sun', bossMoves: [['花瓣狂舞', '草', 56], ['巨叶拍打', '草', 48], ['甘露重压', '水', 72]] },
  { stage: 5, gymName: '火系道馆', badge: '烈焰徽章', bossNo: 59, needLevel: 17, bossLevel: 21, hpMult: 2.4, eggSpecies: 126, weather: null, bossMoves: [['闪焰冲锋', '火', 68], ['火焰牙', '火', 58], ['神速冲锋', '普通', 60]] },
  { stage: 6, gymName: '地面道馆', badge: '大地徽章', bossNo: 112, needLevel: 20, bossLevel: 23, hpMult: 2.6, eggSpecies: 208, weather: null, bossMoves: [['地震', '地面', 70], ['岩崩', '岩石', 64], ['直冲钻', '地面', 60]] },
];
