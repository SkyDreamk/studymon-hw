新任务（已确认）：把养成页的 PixiJS 动画小房间接进测试站。
附件三个：本说明、模块源码 care-room.js.txt（用时改回 care-room.js）、本地验收报告 care-room-REPORT.txt。
模块依赖 pixi.js ^8.6.6（ESM，package 名 care-room-pixi 0.1.2），导出 mount / unmount / update / setFeedSource / fallback / getDiagnostics。
如果第二轮返工（开关点击区、按钮字号、阴影）还没交，先把那个做完交对照，再做这个。
说明里出现的 /workspace/... 路径是我这边电脑上的，你那边打不开，以附件为准。

# 养成小房间 接入说明（给 Muse）

已验收版本：/workspace/care-room-v3/（Gemini 第三版，本地验收 59/59 + 第三轮 32/32 通过）
- 模块：/workspace/care-room-v3/src/care-room.js（PixiJS v8，导出 mount / unmount / update / setFeedSource / fallback / getDiagnostics）
- 验收报告和截图：/workspace/care-room-v3/accept/REPORT.md
- 原始任务单：/workspace/checkin-audit/pet/TASK-pixi-care-room.md

## 接入要求
1. 只在养成（照顾）页懒加载（动态 import），首页/打卡页不加载 Pixi。
2. 宿主传现有立绘地址：pet: { img: form.img, name: form.name }（就是现在的 k.form.img）。不要在模块里写死 hash，不要换图。
3. 在 renderCarePage 里保留 #careRoom 容器；状态变化用 update()，食物格重绘后用 setFeedSource()。食物飞入/接口请求进行中不要用 innerHTML 整页重写。
4. 离开养成页前先 unmount()。
5. 降级：reduced-motion、无 WebGL、低帧率、context-lost、出错时回到现在的 CSS 版照顾页，功能不能少。
6. 喂食仍走现有 /api/care/feed 等接口，不加新后端。爱心如果由宿主显示，传 showHearts:false。
7. 静态资源同域加载；接到测试站后确认立绘纹理在 test 域下正常（本地验收时因 CORS 用的是本地副本）。

## 顺手调的 3 处小问题（不用退回 Gemini）
1. 飘字终点离顶部信息栏改成至少 8px：src/care-room.js:1384-1387 把 hudBottom + 6 改成 + 8。
2. 矮屏（房间 200px，isCompactH）时投放食物的橙色光圈收小或 clamp，别擦到顶部信息栏：src/care-room.js:1197-1205。
3. 矮屏时顶部信息栏压矮一点（现在 67/200），约 src/care-room.js:810 起。

## 规则
- 只上测试站 test.example.com；上正式站要负责人批准。
- 测试站待审核的打卡不要动。
- token：底色 #FFF7E8，主按钮 #FF9F43 配 #3D2C1E 字，字号 14/16/18/20/22，字重 400/500/600，只用一种阴影。
- 接好后把改前改后对照发给 dr eggbot 验收（390×844、390×664、1280），负责人也会用手机实测流畅度。
