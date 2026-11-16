#!/usr/bin/env python3
"""把 test.example.com 绑到测试 Worker studymon-hw-test（Workers Custom Domains）。

zone 沿用 example.com（id 已知）；与 scripts/bind-domain.py（正式版）相互独立。
凭证走 custom.cloudflare 注册连接，不在任何地方落盘。
"""
import json, sys, urllib.request, urllib.error
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

ACCOUNT = "YOUR_CLOUDFLARE_ACCOUNT_ID"
ZONE_ID = "YOUR_CLOUDFLARE_ZONE_ID"  # example.com
HOSTNAME = "test.example.com"
SERVICE = "studymon-hw-test"
BASE = "https://api.cloudflare.com/client/v4"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused")

def call(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    add_surrogate_to_request(req, "custom.cloudflare", allowed_hosts=["api.cloudflare.com"])
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=30) as resp:
            return resp.status, read_json_response(resp)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {"errors": [{"message": "unparsable error body"}]}

# 1. 查是否已绑定
status, data = call("GET", f"{BASE}/accounts/{ACCOUNT}/workers/domains?zone_id={ZONE_ID}")
existing = [d for d in (data.get("result") or []) if d.get("hostname") == HOSTNAME]
if existing:
    print("ALREADY_ATTACHED:", json.dumps(existing, ensure_ascii=False))
    sys.exit(0)

# 2. 绑定
status, data = call("PUT", f"{BASE}/accounts/{ACCOUNT}/workers/domains", {
    "zone_id": ZONE_ID,
    "hostname": HOSTNAME,
    "service": SERVICE,
    "environment": "production",
})
print("attach:", status, json.dumps(data, ensure_ascii=False)[:800])
sys.exit(0 if status == 200 and data.get("success") else 1)
