#!/usr/bin/env python3
"""用 custom.cloudflare 替身凭证运行 wrangler（令牌不落盘、不打印）。

用法：python3 scripts/run-wrangler.py <wrangler 参数...>
例： python3 scripts/run-wrangler.py d1 list
     python3 scripts/run-wrangler.py deploy -c wrangler.staging.toml
"""
import os, subprocess, sys
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import dynamic_credential_entry

entry = dynamic_credential_entry("custom.cloudflare")
env = dict(os.environ)
env["CLOUDFLARE_API_TOKEN"] = str(entry["surrogate"]).strip()
env["CLOUDFLARE_ACCOUNT_ID"] = "YOUR_CLOUDFLARE_ACCOUNT_ID"
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cmd = ["npx", "wrangler"] + sys.argv[1:]
print("+", " ".join(cmd), file=sys.stderr)
r = subprocess.run(cmd, env=env, cwd=root)
sys.exit(r.returncode)
