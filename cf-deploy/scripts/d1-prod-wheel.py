#!/usr/bin/env python3
"""只读核对正式库：大宝今天的测验成绩与高级转盘机会。
用法：python3 scripts/d1-prod-wheel.py（只读，不改库）。"""
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

print("== children ==")
for k in q("SELECT id, name, grade_label, line, total_xp, streak FROM children ORDER BY id"):
    print(k)
print("== school_test_records (child 1,2; date_shanghai >= 2026-11-13) ==")
for r in q("SELECT id, child_id, subject, unit, score, full_score, pct, status, exam_date, date_shanghai, created_epoch, photo_key IS NOT NULL AS has_photo, reward_granted FROM school_test_records WHERE child_id IN (1,2) AND date_shanghai >= '2026-11-13' ORDER BY id DESC"):
    print(r)
print("== wheel_chances (both kids, latest 20) ==")
for r in q("SELECT id, child_id, school_test_id, week_start, used_epoch, created_epoch, date_shanghai FROM wheel_chances WHERE child_id IN (1,2) ORDER BY id DESC LIMIT 20"):
    print(r)
print("== wheel_week_quotas (both kids) ==")
for r in q("SELECT child_id, week_start, subject, count FROM wheel_week_quotas WHERE child_id IN (1,2) ORDER BY week_start DESC, child_id"):
    print(r)
print("== unused counts ==")
for r in q("SELECT child_id, COUNT(*) AS unused FROM wheel_chances WHERE child_id IN (1,2) AND used_epoch IS NULL GROUP BY child_id"):
    print(r)
print("== rare/care unused counts ==")
for r in q("SELECT child_id, COUNT(*) AS unused FROM rare_wheel_chances WHERE child_id IN (1,2) AND used_epoch IS NULL GROUP BY child_id"):
    print("rare:", r)
for r in q("SELECT child_id, COUNT(*) AS unused FROM care_wheel_chances WHERE child_id IN (1,2) AND used_epoch IS NULL GROUP BY child_id"):
    print("care:", r)
