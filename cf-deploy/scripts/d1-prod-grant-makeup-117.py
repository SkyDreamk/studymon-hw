#!/usr/bin/env python3
"""正式库手动补 1 次高级转盘机会（任务 117，用户 2026-11-14 23:05 点头）。
对象：大宝（child 1）数学期中测试记录 17（120/120，2026-11-15，有照片，已通过）。
原因：数学本周科目限额已被 11-11 预考卷（记录 7）占掉，按规则不再发；用户特批补 1 次。
做法：与线上正常发放同一 INSERT（maybeGrantWheelChance 的 chIns 口径），不碰 wheel_week_quotas
（限额行已是 count=1，补发是特批例外，不改限额）；正式库无 sync_versions 表，故
bumpChildVersion/touchRow 在线上本就是 no-op（旧链），不做。
写前已核对：记录 17 仍 active/100%/有照片；school_test_id=17 尚无机会行；大宝未用机会为 0；
本周（2026-11-09）大宝机会行共 1 条（已用），补 1 条后共 2 条，未超周上限 3 次。
用法：python3 scripts/d1-prod-grant-makeup-117.py（只写这一行，成功后立即核对并打印）。"""
import json, sys, time, urllib.request
from datetime import datetime, timezone, timedelta
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

ACCT = "YOUR_CLOUDFLARE_ACCOUNT_ID"
BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACCT}"
PROD_DB = "YOUR_D1_DATABASE_ID"
CHILD_ID = 1
RECORD_ID = 17
WEEK_START = "2026-11-09"

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
    return (r.get("result") or [{}])[0]

now = int(time.time())
today_sh = (datetime.now(timezone.utc) + timedelta(hours=8)).strftime("%Y-%m-%d")
print(f"now={now} today_shanghai={today_sh} week_start={WEEK_START}")
assert today_sh == "2026-11-15", f"今天上海日期不是 2026-11-15（算出 {today_sh}），停下核对"

# 写前最后一次核对：记录 17 仍 active 且尚无机会行
rec = q("SELECT id, status, pct FROM school_test_records WHERE id=17").get("results", [])
assert len(rec) == 1 and rec[0]["status"] == "active" and rec[0]["pct"] == 100, f"记录 17 状态不对：{rec}"
existing = q("SELECT id FROM wheel_chances WHERE school_test_id=17").get("results", [])
assert existing == [], f"记录 17 已有机会行，停下（防重复发）：{existing}"

# 发放（与 maybeGrantWheelChance 的 chIns 同一口径；本周总量条件已核对：现 1 条 < 3）。
# 值全是已核对的常量（整数＋固定日期），直接拼进 SQL，不用 params（与只读脚本同一调用方式）。
meta_res = q(
    f"INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) "
    f"VALUES({CHILD_ID}, {RECORD_ID}, '{WEEK_START}', {now}, '{today_sh}')")
meta = meta_res.get("meta", {})
print("insert meta:", meta)
assert meta.get("changes") == 1, f"INSERT 未影响 1 行，停下核对：{meta_res}"
new_id = meta.get("last_row_id")
assert new_id, f"未拿到 last_row_id：{meta_res}"
print(f"已补发 wheel_chances id={new_id}（child 1 / record 17 / week 2026-11-09）")

# 写后核对
row = q(f"SELECT id, child_id, school_test_id, week_start, used_epoch, created_epoch, date_shanghai, ver, updated_epoch FROM wheel_chances WHERE id={int(new_id)}").get("results", [])
print("new row:", row)
assert len(row) == 1 and row[0]["used_epoch"] is None and row[0]["school_test_id"] == 17, "新行核对不通过"
unused = q("SELECT COUNT(*) AS c FROM wheel_chances WHERE child_id=1 AND used_epoch IS NULL").get("results", [])
print("child 1 unused wheel_chances:", unused)
assert unused and unused[0]["c"] == 1, f"未用机会数不是 1：{unused}"
week_total = q("SELECT COUNT(*) AS c FROM wheel_chances WHERE child_id=1 AND week_start='2026-11-09'").get("results", [])
print("child 1 week 2026-11-09 total:", week_total)
print("OK：补发完成，大宝高级转盘未用机会现为 1 次")
