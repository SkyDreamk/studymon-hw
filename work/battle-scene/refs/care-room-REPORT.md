# 养成小房间 v3 验收报告（Gemini 第 3 轮）

- 时间：2026-11-15，America/Los_Angeles
- 交付：`package.json` 0.1.2，提取到 `/workspace/care-room-v3/`（v1 0.1.0、v2 0.1.1 未改动）
- 官方 demo：未注入 import map，`PORT=4173 npm run demo` 直接启动，日志「房间就绪: mode=pixi」
- 真实立绘：从 v2 `demo/real/` 复制 14 个 WebP；demo 通过 `GET /__demo_real_assets` 探测并切换，模块源码无写死 URL/hash
- 范围：只在本地跑；未对 test/prod 发 POST，未改生产代码

---

## 结论与建议

**建议交给 Muse 集成（先上 test）。不需要再开一轮必须修复的 Gemini 任务，因此未写 `FIXES-round4-for-gemini.md`。**

第 3 轮清单上的验收标准全部实测通过；上一轮功能回归套件 `run-accept.py` 为 **59/59**。视觉上，雷丘 / 尼多王 / 梦幻的脚底已经落在淡阴影上，薄荷色地台和山丘花点已去掉，饥饿态在静帧里能一眼分清。剩余问题是紧凑高度（390×664、房间 200px）下的贴边和软预算超标，属于集成时的抛光，不是挡住上 test 的缺陷。

---

## 第 3 轮清单：通过 / 失败

| 项 | 验收标准 | 结果 | 实测 |
|---|---|---|---|
| 官方 demo 可启动 | 无 import map，出现「房间就绪」且有 canvas | **通过** | `http://127.0.0.1:4173/demo/index.html`，canvas=1，无 pageerror |
| 脚底对齐（不透明 bbox） | 雷丘 / 尼多王 / 梦幻的不透明底部落在地面/阴影上 | **通过** | 房间卡裁切后，三只宠在 844 的脚底 y≈231–234（目标 0.84×280=235，差 1–4px，含呼吸），阴影从脚底下方 **1px** 开始；见 `accept/foot-crops/` |
| 不透明高度占比 | 常规 0.50×H（280→140±4），紧凑 0.48×H（200→96±4），除非被 HUD 8px 规则缩小 | **通过** | 844：三只均为 **140**；664：三只均为 **93**（目标 96，因 `hudBottom+8=75`、`0.84×200=168`，可用高度 93，规则允许） |
| 三只宠体型一致 | 同一视口下不透明高度接近 | **通过** | 844 全 140，664 全 93，spread=0 |
| 场景背景 | 只用站点彩虹草原渐变，无薄荷色色块 / 山丘 / 小花 | **通过** | CSS 与 Pixi 渐变均为 `120deg, #ffe1e8, #fff1cf, #dcf3df, #dcecff, #ecdfff`；源码无 `hillsGfx` / flowers / `#d3f2d6`；截图只有淡云，无山丘花点 |
| HUD 距耳朵 / 不透明顶 | ≥ 8px | **通过** | 844：earGap=**28.2px**；664：刚好 **8.0px** |
| 浮动文案不与 HUD 重叠 | 生成与运动全程不交叠 | **通过** | 844：floatTop≈80.9，hudBottom≈67.3；664：floatTop≈72.3，hudBottom≈67.3，间距约 5px，未重叠（见下「剩余抛光」） |
| `showHearts` | 默认显示；`false` 隐藏红心与「友好度 n/255」 | **通过** | 取消 `#chkShowHearts` 后 `.care-hearts-bar` hidden |
| `sceneText` 字幕 | 14px / 400 / `#3D2C1E`，390 宽不溢出 | **通过** | computed `14px` / `400` / `rgb(61, 44, 30)`；默认与超长文案的 `scrollWidth==clientWidth==336` |
| 饥饿态静帧可辨 | 相对 idle 一眼能看出 | **通过** | 6.5° 倾斜 + 手绘气泡/苹果；房间区域像素差 844=5.63、664=4.02（阈值 2.5） |
| 静音按钮 | 绘制图标（非系统 emoji），热区 ≥ 44px | **通过** | SVG 精灵，热区 **44×44** |
| 光晕缩小 | 超出不透明盒 8–16px | **通过** | 投放环椭圆为不透明盒 +12px（水平）/+10px（垂直），`care-room.js:1197-1205` |
| 真实立绘切换 | demo 发现 `demo/real/` 即可切换，不把 WebP 打进模块 | **通过** | `/__demo_real_assets` 返回 4 只宠 + 10 个食物图标；`src/care-room.js` 无 hash |

自动化清单见 `results-round3.json`：**32/32 通过**。

---

## 功能回归（上一轮全套）

复用并改路径后的 `/workspace/care-room-v3/accept/run-accept.py`，仍走官方 demo、不注入 import map。

**59/59 通过**（脚本结案数字；含官方启动、字号 token、喂食/拖拽/取消、中途 `setFeedSource` 不丢掉 ghost、卸载时摘掉 window 监听、`pointercancel` 回正、降级、10 次重挂载无泄漏、减弱动态 / 无 WebGL / 低帧率）。

第 2 轮的 4 个必须修复项在 v3 仍全部通过：

- 官方 demo 能解析 `pixi.js`
- 请求进行中重新 `setFeedSource` 不杀掉拖拽幽灵，且仍只打一次 feed
- 拖拽中卸载会清掉 `pointermove/up/cancel`
- `pointercancel` 后不发请求，幽灵收回

---

## 体积（相对 v2）

| | raw | gzip -9 | brotli | 相对 150 KB gzip 软预算 |
|---|---:|---:|---:|---|
| v1 | 581,702（568.07 KB） | 170,899（166.89 KB） | 140,733（137.43 KB） | 超 16.89 KB |
| v2 | 582,266（568.62 KB） | 171,164（167.15 KB） | 141,180（137.87 KB） | 超 17.15 KB |
| **v3** | **584,950（571.24 KB）** | **171,970（167.94 KB）** | **141,714（138.39 KB）** | **超 17.94 KB** |
| v3 − v2 | +2,684 | +806 | +534 | 再超 0.79 KB |

PixiJS 8.23.0，esbuild 0.24.2。gzip 软预算从 v1 起就超，本轮因 bbox / HUD / 饥饿气泡略增，**不作为硬失败**。Muse 集成时继续按页面懒加载即可。

---

## v2 → v3 差异（模块行为）

`src/care-room.js` 2202 行 → 2386 行。对外 API 保持：`mount` / `unmount` / `update` / `setFeedSource` / `fallback` / `getDiagnostics`。新增函数：`getOpaqueBoundsForImage`、`measureHudBottom`、`getMuteSvgMarkup`、`buildHungryThoughtBubble`。`getDiagnostics()` 只**增加** `opaqueBox: {width,height,hudBottom}`，旧字段仍在。

主要行为变化（都在第 3 轮要求内）：

- 按 alpha>8 扫描不透明包围盒，按 URL 缓存；CORS 污染时回退整图
- 缩放对齐不透明高度 0.50 / 0.48，宽度上限 0.52W，并保证 HUD 下 8px
- 精灵 `anchor (0,0)` 后按不透明底边放到 `petBaseY = 0.84H`，阴影画在脚底
- 去掉薄荷色台地、椭圆山丘、小花；房间只用站点渐变 + 淡云
- HUD 分三行：标题+日期、`sceneText`、可选红心；静音改右上角 44×44 SVG
- `update({ showHearts, sceneText })`
- 饥饿：3400ms 浅呼吸、6.5° 倾斜、手绘思想泡

demo：`scripts/dev-server.mjs` 增加 `/__demo_real_assets`；`demo/index.html` 增加立绘来源下拉和 `chkShowHearts`。v3 不再带 v2 的独立 `demo/real.html`（能力已并进官方 demo）。重置喂食会保留当前立绘。

---

## 设计负责人视觉判断

对照当前站点养成页（`00-site-care-page.png` 与 `00-side-by-side-site-vs-v3-raichu.png`）和第 2 轮真实立绘问题，这一轮是一次**合格的视觉修复**，可以进集成。

做得对的地方：

- **脚底**：尼多王不再悬空。三只宠的不透明底边几乎压在淡棕色椭圆阴影上（间隙约 1px）。梦幻作为漂浮角色，身体仍略离地，但最低不透明像素已接地，看起来是角色设定而不是裁切错误。
- **体型**：844 时视觉高度与站点白底 150×150 `object-fit: contain` 的雷丘相当，且三只一致，不再一个大一个小。
- **场景**：房间就是站点那张彩虹草原渐变，宠物站在渐变里而不是白卡片上，这正是做 Pixi 房间的意义。淡云可以留。薄荷色地台和剪贴画山丘/小花已经消失，不再和官方像素风雨马牛不相及。
- **HUD**：标题、日期、场景寄语、友好度分层清楚，字色字号跟站点 token 一致。静音从系统 emoji 换成线条图标，位置合理。
- **饥饿**：歪头 + 思想泡里的苹果，静帧就能读出「还没喂」，比 v2 那 2px 下沉有用得多。
- **交互**：点击出粉色小心、拖食物有投放环和幽灵、喂完绿色「吃得很开心！友好度 +10」出现在 HUD 下方，流程完整。

仍然要老实说的地方（不挡 Muse，但集成时别假装没有）：

- **390×664 / 房间 200px 很挤。** HUD（标题+寄语+红心）占 67px，宠物被压到 93px，耳朵离 HUD 正好 8px。能过线，但看起来像把 280px 的布局硬塞进 200px。投放橙环在这个高度几乎撑满剩余天空，会擦到 HUD 下沿（环顶约 65px，HUD 底 67px）。若 Muse 上线后真实短屏也是 200px 房间，建议把紧凑态 HUD 再收一档，或投放环在 `isCompactH` 时减 padding。
- **浮动文案在 664 几乎贴着红心。** 起始预留了 10px，但上漂被限制到 HUD 下 6px，实测约 5px，没有重叠，只是紧。
- **Demo 托盘仍是 3 列**，站点是 `repeat(6, minmax(0,1fr))`。这是 demo 外壳，不应随模块一起上线；宿主页继续用站点 CSS。
- 光晕已从 v2 那种夸张橙圈收到 +10–12px，点击金闪仍按 `petBoxH * 0.45` 画圆，一闪而过，可以接受。

总评：模块 UI 已经和站点 token、现有立绘处在同一套视觉语言里。之前「截图 CSS 很奇怪」的问题，主因（占位几何体 + 薄荷地台 + 悬空脚 + 系统 emoji 静音）已经去掉。剩下的是短屏密度，不是风格错误。

---

## 剩余项（非必须再开一轮）

没有未通过的必须修复项。下面是建议 Muse 或后续抛光时看的点，均带位置：

1. **浮动文案上漂终点只保证 6px，不是 8px** — `src/care-room.js:1384-1387`。`minSafeTop = hudBottom+10` 符合生成间距；`maxTravel` 用的是 `hudBottom+6`。664 实测终点间距约 5px。若要严格全程 ≥8px，把 `+ 6` 改成 `+ 8`。
2. **紧凑高度投放环可能擦到 HUD** — `src/care-room.js:1197-1205`（椭圆 `+12 / +10`），664 环顶约 65px vs HUD 67px。可在 `isCompactH` 时减小 padding，或把环顶 `clamp` 到 `hudBottom+2`。
3. **200px 房间 HUD 偏高** — HUD 结构约 `care-room.js:810` 起。67/200 的占位让 8px 规则成为常态而不是例外。可考虑紧凑态缩小标题/寄语行高，或允许隐藏日期。
4. **gzip 软预算仍超 17.94 KB** — 从 v1 就超，本轮再 +806 字节。继续懒加载，不建议为此再砍功能。

---

## 截图（均在 `/workspace/care-room-v3/accept/`）

- 站点对照：`00-site-care-page.png`、`00-site-care-page-full.png`、`00-side-by-side-site-vs-v3-raichu.png`
- 官方 demo 总览：`00-official-demo-overview.png`、`00-official-demo-no-importmap.png`
- 390×844：`844-idle-raichu.png` / `844-idle-nidoking.png` / `844-idle-mew.png`，以及雷丘 `844-tap-to-pet.png`、`844-mid-drag.png`、`844-after-feed.png`、`844-hungry.png`
- 390×664：同上前缀 `664-`
- 脚底特写：`foot-crops/*-foot.png`（红线=检测到的不透明底边，蓝线=阴影起始）
- 回归套件另存了 `01-`–`05-` 等功能截图
- 数据：`results-round3.json`、`results.json`

---

## 建议

把 v3 模块交给 Muse，在 test 环境接入现有养成页：宿主继续传 `k.form.img`（`/static/img/p{n}.{hash}.webp`），不要在模块里写死 hash；`showHearts` / `sceneText` 按产品需要传入；底部导航和现有 API 不要改。先在 test 用真实网络与真实 CORS 看立绘（本地是拷贝的 WebP，因为 test 静态资源没有 ACAO，localhost 不能热链）。短屏 HUD 和投放环如上面第 2、3 条，可在集成时一起收，不必再为它们单独跑一轮 Gemini。
