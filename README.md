# 作业打卡站（Study Check-in）

一个家庭作业打卡应用：孩子每天打卡作业、答题、攒经验升级，家长审核后发放奖励。
后端跑在 Cloudflare Workers + D1 上，前端是单页应用；另有一个微信小程序版（`work/future-tasks/miniprogram/mp-12/project/`），与网页版共用同一后端。

本仓库只公开**代码与思路**。图片、音频等美术资源不在仓库里（见下面的版权说明）。

## 版权说明

- 本仓库只包含代码与思路，**不包含任何宝可梦美术资源、图片与音频**。
- 图片/音频资源需使用者自行准备（例如用 AI 生成新立绘，或自行决定其他来源与使用方式）。
- 相关版权与合规责任由使用者自行承担。
- 代码里对资源路径的引用（例如按宝可梦编号拼立绘路径）属于代码，保留原样；只要把对应文件放到约定的路径下即可。

## 部署前：先把占位符换成自己的值

仓库里所有真实域名、账号与资源 ID 都已替换为占位符。部署前请逐一换成自己的：

| 占位符 | 含义 | 出现位置 |
|---|---|---|
| `example.com` | 主站域名 | `wrangler.toml` routes、`src/`、迁移文件、小程序 `project/` |
| `exempt.example.com` | 第二个域名（维护模式下豁免，不被 503 拦截） | 同上。**注意：它和主站域名必须是两个不同的域名**，不能合并成同一个，否则维护模式的测试会自相矛盾 |
| `YOUR_CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账号 ID | `scripts/` |
| `YOUR_CLOUDFLARE_ZONE_ID` | Cloudflare Zone ID | `scripts/`（绑定域名脚本） |
| `YOUR_D1_DATABASE_ID` | D1 数据库 ID | 3 个 `wrangler*.toml` |
| `YOUR_D1_DATABASE_NAME` | D1 数据库名 | `scripts/` |
| `YOUR_R2_BUCKET` | R2 存储桶名 | `wrangler*.toml`、`src/` |
| `YOUR_AZURE_SPEECH_RESOURCE` | Azure Speech 资源名（语音评测/合成） | `src/` |
| `YOUR_PIN` / `YOUR_PASSWORD` | 家长 PIN / 家庭密码（测试夹具用） | `tests/`、`migrations/0001_init.sql`（种子哈希对应 `sha256('YOUR_PASSWORD')` 与 `sha256('0000')`） |

另：`wrangler.toml` 里的 `routes` 请改成自己的域名；小程序 `project.config.json` 里的 `appid` 是占位 `touristappid`，请换成自己的小程序 AppID，并在小程序后台把后端域名加进 request 合法域名。

## 哈希 bundle：由 .orig 重新生成

前端源码以 `.orig` 文件为准（`public/static/app.js.orig`、`style.css.orig` 等），
带哈希的构建产物（`app.<hash>.js`、`style.<hash>.css`、`care-room.<hash>.js`、`engine-local.<hash>.js`、`asset-manifest.json`）**不入库**。

首次使用（或改完 `.orig` 后）先重新生成：

```bash
cd cf-deploy
node scripts/hash-assets.mjs        # 生成带哈希的 bundle 与 asset-manifest.json
node scripts/hash-assets.mjs --verify
node --test "tests/*.test.mjs"      # 回归测试
```

部署用 Wrangler：

```bash
python3 scripts/run-wrangler.py deploy -c wrangler.staging.toml   # 测试站
python3 scripts/run-wrangler.py deploy -c wrangler.toml           # 正式站
```

## 小程序（mp-12）导入说明

- 用微信开发者工具导入 `work/future-tasks/miniprogram/mp-12/project/`。
- `project.config.json` 里的 `appid` 是占位 `touristappid`，导入后换成自己的 AppID。
- 后端地址在代码里是占位域名（见上表），请换成自己的域名，并在小程序后台「开发管理 → 开发设置 → 服务器域名」里把该域名加进 request 合法域名。
- 小程序与网页版共用同一后端、同一数据库，数据天然同步。
- 注意：`app.json` 里引用的 8 个 tabBar 图标（`images/tab-home.png` 等）是图片资源，**不在仓库里**，请自行准备同名图片放进 `project/images/`，否则 tabBar 图标会缺失。

## 测试说明

- `cf-deploy/work/` 里只有两个测试夹具文件（`skill-levels-migrate-test.sql`、`quiz-midterm-cn-20261109.json`），是部分单测的依赖；其余内部工作文档均未入库。
- 部分单测依赖图片/音频资源文件（`public/static/img/`、`public/static/audio/`），这些资源不在仓库里，因此以下测试在干净检出后会失败，属于预期行为：立绘覆盖、哈希 bundle 不可变、卡片图鉴映射、图标 webp、传说立绘、`oak.test.mjs`（需要 `audio/oak/` 目录）、`webp-lazy.test.mjs`。补齐资源文件后即可通过。
- 另有一处已知失败与资源无关：`task-111-layout.test.mjs` 的「吸顶「已选」」断言期望的字符串不在当前代码中（上游即如此），其余 54 项均通过。

## 目录结构

```
cf-deploy/                 # 网站：Workers 后端 + 前端 + 测试 + 迁移
  src/                     # 后端入口（src/index.js）+ 路由模块（src/routes/）+ 共享逻辑（src/lib/shared.js）
  public/static/           # 前端 .orig 源码（app.js.orig、style.css.orig…）
  scripts/                 # 运维与部署脚本（含 hash-assets.mjs）
  tests/                   # Node 单测（node --test）
  migrations/              # D1 迁移（0001_init.sql 起）
  data/                    # 公开参考数据
  quiz-bank.json           # 题库
work/
  future-tasks/miniprogram/mp-12/project/   # 微信小程序（最终版）
  battle-scene/            # PixiJS v8 道馆对战场景（独立模块，见其 README）
  care-room-v3/care-room.js                 # 照顾页 PixiJS 模块
```

## 许可证

本仓库代码按原作者的意愿公开；宝可梦相关名称、形象与美术资源归其权利人所有，使用者自行负责合规。
