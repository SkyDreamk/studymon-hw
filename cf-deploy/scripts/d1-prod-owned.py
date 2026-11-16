#!/usr/bin/env python3
"""只读核对正式库 species_acquisitions：正式站两孩各自拥有哪几种珍稀卡。
用法：python3 scripts/d1-prod-owned.py（只读，不改库）。"""
import json, sys, urllib.request
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

ACCT = "YOUR_CLOUDFLARE_ACCOUNT_ID"
BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACCT}"
PROD_DB = "YOUR_D1_DATABASE_ID"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused")

def call(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json"} if data else {})
    add_surrogate_to_request(req, "custom.cloudflare", allowed_hosts=["api.cloudflare.com"])
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=30) as resp:
        return read_json_response(resp)

def q(sql):
    r = call("POST", f"/d1/database/{PROD_DB}/query", {"sql": sql})
    return (r.get("result") or [{}])[0].get("results", [])

# 孩子基本信息 + 主宠
kids = q("SELECT id, name, grade, line, level FROM children ORDER BY id")
for k in kids:
    print("孩子:", k)
# 各孩拥有的种（species_acquisitions）
rows = q("SELECT child_id, species_no, source FROM species_acquisitions ORDER BY child_id, species_no")
from collections import defaultdict
owned = defaultdict(list)
for r in rows:
    owned[r["child_id"]].append((r["species_no"], r["source"]))
for cid in sorted(owned):
    print(f"孩子 {cid} 拥有 {len(owned[cid])} 种:", owned[cid])
# 主宠行（pet_instances）
pets = q("SELECT child_id, line, is_main, level, total_xp FROM pet_instances ORDER BY child_id, is_main DESC")
for p in pets:
    print("pet_instances:", p)
# 稀有蛋/已孵化状态（sealedEggs 相关：pokedex 里 egg: 开头的行）
dex = q("SELECT child_id, entry_key, carried FROM pokedex WHERE entry_key LIKE 'egg:%' ORDER BY child_id, entry_key")
for d in dex:
    print("pokedex egg:", d)
