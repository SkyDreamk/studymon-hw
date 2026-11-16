#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if Path.cwd().resolve() != ROOT:
    raise SystemExit("请在 cf-deploy/ 下运行")

worker = ROOT / "src/index.js"
source = worker.read_text(encoding="utf-8")

hunks = [
    (
        """/* 静态资源缓存加固：Worker 转发时显式钉死 must-revalidate，防资源层默认策略变化导致旧脚本长期驻留 */
function pinStaticCache(r) {
  const headers = new Headers(r.headers);
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers });
}""",
        r"""/* 静态资源缓存：文件名带 .<8位hash>. 的为内容寻址资源，可长期 immutable；
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
}""",
    ),
    (
        "      return pinStaticCache(await env.ASSETS.fetch(new Request(new URL(ASSET_ALIAS[path], url), req)));",
        "      return pinStaticCache(await env.ASSETS.fetch(new Request(new URL(ASSET_ALIAS[path], url), req)), ASSET_ALIAS[path]);",
    ),
    (
        "      return pinStaticCache(await env.ASSETS.fetch(req));",
        "      return pinStaticCache(await env.ASSETS.fetch(req), path);",
    ),
]

def replace_exact(text, old, new, count, label):
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f"{label}: 预期 {count} 次，实际 {actual} 次；未写盘")
    return text.replace(old, new)

for index, (old, new) in enumerate(hunks, 1):
    source = replace_exact(source, old, new, 1, f"Worker hunk {index}")

app_js = "const appJs = readFileSync(new URL('../public/static/app.js', import.meta.url), 'utf8');"
app = "const app = readFileSync(new URL('../public/static/app.js', import.meta.url), 'utf8');"
css = "const css = readFileSync(new URL('../public/static/style.css', import.meta.url), 'utf8');"
images = "readdirSync(new URL('../public/static/img/', import.meta.url))"

plans = {
    "tests/borrow.test.mjs": [(app_js, "const appJs = readFileSync(assetPath('app.js'), 'utf8');", 3)],
    "tests/dex151-collapse.test.mjs": [
        (app, "const app = readFileSync(assetPath('app.js'), 'utf8');", 1),
        (css, "const css = readFileSync(assetPath('style.css'), 'utf8');", 1),
    ],
    "tests/pin.test.mjs": [(app_js, "const appJs = readFileSync(assetPath('app.js'), 'utf8');", 3)],
    "tests/pokedex-card.test.mjs": [
        (app, "const app = readFileSync(assetPath('app.js'), 'utf8');", 1),
        (css, "const css = readFileSync(assetPath('style.css'), 'utf8');", 1),
    ],
    # tests/webp-lazy.test.mjs 不走此处：已用交付的完整新文件覆盖（含 assetPath 改法）。
}

pending = {worker: source}
for name, replacements in plans.items():
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    if "from './asset-path.mjs'" in text:
        raise SystemExit(f"{name}: 已存在 asset-path import；未写盘")
    for old, new, count in replacements:
        text = replace_exact(text, old, new, count, name)
    text = "import { assetPath } from './asset-path.mjs';\n" + text
    pending[path] = text

# 全部断言完成后才写盘。随后用交付的完整 webp-lazy 新文件覆盖该测试。
for path, text in pending.items():
    with path.open("w", encoding="utf-8", newline="") as stream:
        stream.write(text)
    print(path.relative_to(ROOT))
print("应用完成；请安装完整 webp-lazy/cache 测试，再运行 hash 与回归。")
