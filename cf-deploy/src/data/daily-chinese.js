/* 每日语文内容池（2026-11-09，任务表 77②）
 * 来源：部编版语文教材已学范围，逐首核对课本原文，绝不编造。
 * - 三年级上册 5 首（夜书所见、望洞庭、山行、所见、舟夜书所见）：用户 2026-11-09 提供的
 *   三上语文期中复习资料（淇淇麻麻《三上语文期中 98 分，3 天够了》），任务 75 出题时已核对课本原文。
 * - 复习 5 首（静夜思、春晓、咏鹅、赋得古原草送别、登鹳雀楼）：站内 quiz-bank.json 三年级语文题
 *   引用过（《静夜思》的作者、《咏鹅》的作者、“春眠不觉晓”的下一句、“野火烧不尽”的下一句、
 *   “欲穷千里目”的下一句），属已学范围；全文经公开课文资料核对。
 * - 一年级上册 6 篇（咏鹅、江南、小小的船、四季、画、悯农其二）：部编版一年级上册课文/语文园地
 *   日积月累，经公开课文资料核对（《四季》末句为“我就是冬天”，以 2018 部编版课文为准）。
 * 注意：《赋得古原草送别》只取前四句（课本背诵段、题库引用段）。
 * text 为朗读全文（含标点，评测 refText 直接用它）；展示时前端按“。”分行。
 */
export const DAILY_CHINESE_POOL = {
  xiaobao: [
    { id: 'g1-yonge', title: '咏鹅', author: '唐·骆宾王', kind: 'poem', unit: '一年级上册 语文园地一', text: '鹅，鹅，鹅，曲项向天歌。白毛浮绿水，红掌拨清波。' },
    { id: 'g1-jiangnan', title: '江南', author: '汉乐府', kind: 'poem', unit: '一年级上册 第3课', text: '江南可采莲，莲叶何田田。鱼戏莲叶间。鱼戏莲叶东，鱼戏莲叶西，鱼戏莲叶南，鱼戏莲叶北。' },
    { id: 'g1-xiaoxiaodechuan', title: '小小的船', author: '叶圣陶', kind: 'passage', unit: '一年级上册 第2课', text: '弯弯的月儿小小的船，小小的船儿两头尖。我在小小的船里坐，只看见闪闪的星星蓝蓝的天。' },
    { id: 'g1-siji', title: '四季', author: '', kind: 'passage', unit: '一年级上册 第4课', text: '草芽尖尖，他对小鸟说："我是春天。"荷叶圆圆，他对青蛙说："我是夏天。"谷穗弯弯，他鞠着躬说："我是秋天。"雪人大肚子一挺，他顽皮地说："我就是冬天。"' },
    { id: 'g1-hua', title: '画', author: '唐·王维', kind: 'poem', unit: '一年级上册 第6课', text: '远看山有色，近听水无声。春去花还在，人来鸟不惊。' },
    { id: 'g1-minnong', title: '悯农（其二）', author: '唐·李绅', kind: 'poem', unit: '一年级上册 语文园地五', text: '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。' },
  ],
  dabao: [
    { id: 'g3-yeshusuojian', title: '夜书所见', author: '宋·叶绍翁', kind: 'poem', unit: '三年级上册 期中', text: '萧萧梧叶送寒声，江上秋风动客情。知有儿童挑促织，夜深篱落一灯明。' },
    { id: 'g3-wangdongting', title: '望洞庭', author: '唐·刘禹锡', kind: 'poem', unit: '三年级上册 期中', text: '湖光秋月两相和，潭面无风镜未磨。遥望洞庭山水翠，白银盘里一青螺。' },
    { id: 'g3-shanxing', title: '山行', author: '唐·杜牧', kind: 'poem', unit: '三年级上册 期中', text: '远上寒山石径斜，白云生处有人家。停车坐爱枫林晚，霜叶红于二月花。' },
    { id: 'g3-suojian', title: '所见', author: '清·袁枚', kind: 'poem', unit: '三年级上册 语文园地一', text: '牧童骑黄牛，歌声振林樾。意欲捕鸣蝉，忽然闭口立。' },
    { id: 'g3-zhouyeshusuojian', title: '舟夜书所见', author: '清·查慎行', kind: 'poem', unit: '三年级上册 期中', text: '月黑见渔灯，孤光一点萤。微微风簇浪，散作满河星。' },
    { id: 'g3-jingyesi', title: '静夜思', author: '唐·李白', kind: 'poem', unit: '复习', text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。' },
    { id: 'g3-chunxiao', title: '春晓', author: '唐·孟浩然', kind: 'poem', unit: '复习', text: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。' },
    { id: 'g3-yonge', title: '咏鹅', author: '唐·骆宾王', kind: 'poem', unit: '复习', text: '鹅，鹅，鹅，曲项向天歌。白毛浮绿水，红掌拨清波。' },
    { id: 'g3-fudeguyuancaosongbie', title: '赋得古原草送别（前四句）', author: '唐·白居易', kind: 'poem', unit: '复习', text: '离离原上草，一岁一枯荣。野火烧不尽，春风吹又生。' },
    { id: 'g3-dengguanquelou', title: '登鹳雀楼', author: '唐·王之涣', kind: 'poem', unit: '复习', text: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。' },
  ],
};
