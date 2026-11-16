#!/usr/bin/env python3
"""只读核对线上 D1 题库数量（今晚首轮真实答题前静默检查用）。

用法：python3 scripts/d1-quiz-count.py
期望（2026-10-20 首批补题后基数）：riddle(通用)=79, study/grade1=104,
study/grade3=110, 合计 293, 全部 active=1。
基数说明：195 基数＋100 首批补充＝295；其中 2 题 active=0 已禁用
（一年级「"日"字加一笔」争议题、急转弯「越吃越饿」重复题各 1）。
custom 为家长后台追加的自定义题，单独列出，不计入 293。
退出码 0=基数吻合；1=不吻合或请求失败。
凭证走 custom.cloudflare 注册连接，不在任何地方落盘。
"""
import json, sys, urllib.request
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

ACCT = "YOUR_CLOUDFLARE_ACCOUNT_ID"
BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACCT}"

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

try:
    dbs = call("GET", "/d1/database")
    db = next((d for d in dbs.get("result", []) if d.get("name") == "studymon-hw"), None)
    if not db:
        print("FAIL: 未找到名为 studymon-hw 的 D1 数据库")
        sys.exit(1)
    dbid = db["uuid"]
    q = call("POST", f"/d1/database/{dbid}/query", {"sql":
        "SELECT kind, grade, is_custom, COUNT(*) AS c FROM quiz_questions "
        "WHERE active=1 GROUP BY kind, grade, is_custom ORDER BY kind, grade"})
    rows = (q.get("result") or [{}])[0].get("results", [])
except Exception as e:
    print(f"FAIL: 请求失败 {type(e).__name__} {str(e)[:200]}")
    sys.exit(1)

EXPECTED = {("riddle", None, 0): 79, ("study", 1, 0): 104, ("study", 3, 0): 110}
ok = True
total = 0
for r in rows:
    key = (r["kind"], r["grade"], r["is_custom"])
    total += r["c"]
    tag = "custom" if r["is_custom"] else "base"
    exp = EXPECTED.get(key)
    mark = "OK " if exp == r["c"] else ("-- " if exp is None else "MISMATCH")
    if exp is not None and exp != r["c"]:
        ok = False
    print(f"[{mark}] kind={r['kind']} grade={r['grade']} {tag} count={r['c']}" +
          (f" (期望 {exp})" if exp is not None else ""))
print(f"TOTAL_ACTIVE={total} (题库基数期望 293)")
for key, exp in EXPECTED.items():
    if not any((r["kind"], r["grade"], r["is_custom"]) == key for r in rows):
        print(f"[MISSING] kind={key[0]} grade={key[1]} 期望 {exp}，线上无记录")
        ok = False
print("RESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
