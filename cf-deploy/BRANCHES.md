# 分支规矩（2026-11-17 用户定）

## 主分支
- `main` 是唯一可部署分支。测试站只从 `main` 部署；正式站只从 `main` 上打过标签的干净状态推。
- 正式站发布打标签，格式 `prod-YYYYMMDD-<简述>`（例：`prod-20261117-v2`）。

## 任务分支
- 以后每个任务一个分支，做完合回 `main` 再删分支。
- 运维分支：`ops/<任务名>`（例：`ops/131-parent-settings`）。
- Claude（写代码）分支：`feature/<任务名>`（例：`feature/remember-username`）。

## 合并门槛
- 合并进 `main` 之前：本地全量回归必须全绿，并且 eno 核对 diff（只看 diff，不信生产者自报）。
- 合并后才能部署测试站；测试站验过才能推正式站。

## 库里有什么、没什么
- 库里只留源文件：`src/`（不含 `index.js.orig`）、`public/static/*.orig`、`public/static/audio/`、`public/static/local-cache.js`、`public/static/sw.js`、`migrations/`、`tests/`、`scripts/`、`data/`、`wrangler*.toml`、`package.json`、`package-lock.json`、`.gitignore`、本文件。
- 不进库：hashed 生成文件（`app.<hash>.js`、`style.<hash>.css`、`img/` 全目录、`icon-*.<hash>.png`、`asset-manifest.json`、`manifest.json`）、`backups/`（正式库备份）、`work/`（任务记录、证据、日志、快照）、`tasks/`、`*.bak`、`.orig` 的备份（`*.orig.orig`、`src/index.js.orig`、`tests/*.orig`）、`DEPLOY.md` 等记录文档。
- 注意：`img/`（宝可梦立绘）因文件名带 hash 未进库，只在磁盘上有；全新 clone 后部署前须先把 `img/` 从磁盘或 hash-backup 拷回来，再跑 `hash-assets.mjs`。
- `.bak` 与 `hash-backup-*` 目录：不进库，留磁盘不删（回滚用）。
