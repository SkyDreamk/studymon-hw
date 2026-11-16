#!/usr/bin/env python3
"""手感动效 DOM 轮询验证（测试站专用）：亚秒级动画用截图抓不到，改用高频 DOM 轮询取证。
用法: xvfb-run -a ~/workspace/.venv/pw/bin/python scripts/verify-fx-dom.py quiz|battle
前置: 本地代理 127.0.0.1:8888 在跑；测试站家长 PIN（占位符 YOUR_PIN）。
"""
import json
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "https://test.example.com"
PROXY = {"server": "http://127.0.0.1:8888"}


def d1(sql):
    out = subprocess.run(
        ["python3", "scripts/run-wrangler.py", "d1", "execute", "YOUR_D1_DATABASE_NAME",
         "--remote", "--json", "--command", sql],
        capture_output=True, text=True, cwd="/home/hatch/workspace/studymon-hw/cf-deploy").stdout
    return json.loads(out[out.find("["):])[0]["results"]


def parent_login(page):
    # 注：自建 Playwright 经本地代理时，选人页数字垫的点击提交不触发（工具浏览器与真机均正常），
    # 故这里用页面内 fetch 直接换家长会话（与垫子提交的是同一个接口）。
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.wait_for_timeout(1200)
    j = api(page, "/api/parent/login", {"pin": "0000"})
    assert j.get("ok"), f"parent login failed: {j}"
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(1500)


def api(page, path, body=None):
    return page.evaluate(
        """async ([path, body]) => {
          const opt = { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' } };
          if (body) opt.body = JSON.stringify(body);
          const r = await fetch(path, opt);
          return await r.json().catch(() => ({ ok: false }));
        }""", [path, body])


def poll_quiz_fx(page, seconds):
    """答题动效探针（直查选择器）。沙盒代理下接口往返可达 2s+，故轮询到结果出现后再多盯 1.2s。"""
    seen = {}
    t0 = time.time()
    result_at = None
    while time.time() - t0 < seconds:
        vals = page.evaluate(
            """() => {
              const f = document.querySelector('.fx-float');
              return {
                float: f ? f.textContent : null,
                pop: !!document.querySelector('.quizopt.opt-pop'),
                sparks: document.querySelectorAll('.fx-spark').length,
                result: !!document.querySelector('.qexp'),
              };
            }""")
        for k, v in vals.items():
            if k not in seen and v:
                seen[k] = (round(time.time() - t0, 2), v)
        if vals["result"] and result_at is None:
            result_at = time.time()
        if result_at and time.time() - result_at > 1.2:
            break
        time.sleep(0.06)
    return seen


def phase_quiz(page):
    parent_login(page)
    # 准备：提交并通过「阅读」，解锁一道新题
    j = api(page, "/api/checkin", {"childId": 1, "subject": "阅读", "note": "动效点验", "photos": []})
    print("submit 阅读:", j.get("ok"), j.get("error", ""))
    pend = api(page, "/api/parent/pending")
    rid = [r for r in pend.get("reviews", []) if r["childId"] == 1][-1]["id"]
    j = api(page, "/api/parent/review", {"checkinId": rid, "decision": "approve"})
    print("approve:", j.get("ok"))
    today = api(page, "/api/quiz/today?child_id=1")
    un = [q for q in today["questions"] if not q["answered"]]
    print("unanswered:", len(un))
    if not un:
        print("NO_UNANSWERED_QUESTION")
        return
    q = un[0]
    ans = d1(f"SELECT answer_idx FROM quiz_questions WHERE id={q['id']};")[0]["answer_idx"]
    print("question:", q["question"][:40], "| correct idx:", ans, "| options:", q["options"])
    # UI 进入孩子主页并打开问答
    page.goto(BASE + "/", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.locator(".kidcard").first.click()
    page.wait_for_timeout(1200)
    page.locator("button", has_text="今日问答").first.click()
    page.wait_for_selector(".quizopt")
    # 若弹窗停在已答题上，点「下一题」直到未答题（提交按钮可见）
    for _ in range(6):
        if page.query_selector("#qsubmit"):
            break
        nxt = page.locator("button", has_text="下一题")
        if nxt.count():
            nxt.first.click()
            page.wait_for_timeout(500)
    page.locator(".quizopt").nth(ans).click()
    page.wait_for_timeout(200)
    # 点提交后轮询（等结果渲染＋动画播完）
    page.locator("#qsubmit").click()
    seen = poll_quiz_fx(page, 9)
    print("QUIZ FX SEEN:", json.dumps(seen, ensure_ascii=False))
    # 完成并回伙伴页，验经验条滑动与宠物回弹：点「完成」起连续采样 8s（代理延迟下渲染较晚），
    # 经验条取 getComputedStyle 的实际像素宽（过渡中间值也采得到）。
    done = page.locator("button", has_text="完成")
    if done.count():
        done.first.click()
    seen2 = {}
    widths = []
    t0 = time.time()
    while time.time() - t0 < 8:
        v = page.evaluate(
            """() => { const s = !!document.querySelector('.squash-once');
                       const i = document.querySelector('.xpbar i');
                       return { squash: s, w: i ? Math.round(parseFloat(getComputedStyle(i).width)) : null }; }""")
        if v["squash"] and "squash" not in seen2:
            seen2["squash"] = round(time.time() - t0, 2)
        if v["w"] and (not widths or widths[-1] != v["w"]):
            widths.append(v["w"])
        time.sleep(0.06)
    print("HOME FX:", json.dumps({"squash_at": seen2.get("squash"), "xp_computed_widths": widths}, ensure_ascii=False))


OBSERVER_JS = """() => {
  window.__fxlog = [];
  const interesting = (el) => {
    if (!el || el.nodeType !== 1) return;
    const c = el.className && el.className.toString ? el.className.toString() : '';
    for (const k of ['fx-float', 'fx-spark', 'opt-pop', 'nudge', 'squash-once', 'dmg', 'hit-flash', 'hit-shake', 'lunge-up', 'lunge-down', 'card-pop', 'btn-done']) {
      if (c.includes(k)) window.__fxlog.push([Math.round(performance.now()), k, (el.textContent || '').slice(0, 20)]);
    }
  };
  const scan = (node) => { interesting(node); if (node.querySelectorAll) node.querySelectorAll('*').forEach(interesting); };
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach(scan);
      if (m.type === 'attributes') interesting(m.target);
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  return 'observer-ready';
}"""


def approve_subject(page, child_id, subject):
    j = api(page, "/api/checkin", {"childId": child_id, "subject": subject, "note": "动效点验", "photos": []})
    if not j.get("ok"):
        return False
    pend = api(page, "/api/parent/pending")
    rows = [r for r in pend.get("reviews", []) if r["childId"] == child_id]
    if not rows:
        return False
    return api(page, "/api/parent/review", {"checkinId": rows[-1]["id"], "decision": "approve"}).get("ok", False)


def phase_homefx(page):
    """小宝路径：答对一题后回伙伴页，页面内监听器记录 squash 与经验条 style 变化。"""
    parent_login(page)
    print("approve 小宝数学:", approve_subject(page, 2, "数学"))
    today = api(page, "/api/quiz/today?child_id=2")
    un = [q for q in today["questions"] if not q["answered"]]
    print("unanswered:", len(un))
    if not un:
        print("NO_UNANSWERED_QUESTION")
        return
    q = un[0]
    ans = d1(f"SELECT answer_idx FROM quiz_questions WHERE id={q['id']};")[0]["answer_idx"]
    print("question:", q["question"][:40], "| correct idx:", ans)
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    page.locator(".kidcard").nth(1).click()
    page.wait_for_timeout(1500)
    page.evaluate(OBSERVER_JS)
    page.locator("button", has_text="今日问答").first.click()
    page.wait_for_selector(".quizopt")
    for _ in range(6):
        if page.query_selector("#qsubmit"):
            break
        nxt = page.locator("button", has_text="下一题")
        if nxt.count():
            nxt.first.click()
            page.wait_for_timeout(500)
    page.locator(".quizopt").nth(ans).click()
    page.wait_for_timeout(200)
    page.locator("#qsubmit").click()
    # 等结果面板（代理延迟）
    for _ in range(20):
        page.wait_for_timeout(500)
        if page.query_selector(".qexp"):
            break
    # 关问答（「稍后再来」-> closeQuiz -> refreshAfterQuiz -> 回伙伴页重渲染，触发经验回流动画）
    later = page.locator("button", has_text="稍后再来")
    if later.count():
        later.first.click()
    page.wait_for_timeout(7000)
    log = page.evaluate("() => window.__fxlog")
    print("HOMEFX LOG:", json.dumps(log, ensure_ascii=False))


def phase_battle(page):
    """铺垫：模拟 Thu/Fri/Sun 三天打卡，周日（周末）开道馆第一关，监听命中动效。"""
    parent_login(page)
    subs = {1: "其他", 2: "数学", 4: "英语"}
    for off, subj in subs.items():
        j = api(page, "/api/parent/debug-time", {"dayOffset": off})
        print(f"offset {off}:", j.get("ok"), j.get("today", j.get("error", "")))
        print("  approve:", approve_subject(page, 1, subj))
    st = api(page, "/api/gym/status", {"childId": 1})
    print("gym:", {k: st.get(k) for k in ("isWeekend", "weekApproved", "need", "myLevel")})
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    page.locator(".kidcard").first.click()
    page.wait_for_timeout(1500)
    page.locator("button", has_text="道馆").first.click()
    page.evaluate(OBSERVER_JS)
    try:
        page.wait_for_selector("button:has-text('开始挑战')", timeout=40000)
    except Exception:
        print("NO_START_BUTTON (gym page state:", page.inner_text("body")[:200].replace("\n", " | "), ")")
        return
    print("start button appeared")
    page.locator("button", has_text="开始挑战").first.click()
    try:
        page.wait_for_selector(".battlelog", timeout=40000)
    except Exception:
        print("NO_BATTLE_VIEW")
        return
    # 连出三招（含先攻热身跳过），每招后等动画播完（代理延迟下放宽等待）
    for i in range(3):
        page.wait_for_timeout(1500)
        skip = page.locator("button", has_text="跳过这一回合")
        moves = page.locator(".bigbtn.blue")
        if skip.count():
            skip.first.click()
        elif moves.count():
            moves.first.click()
        else:
            print(f"round {i}: no move buttons")
            break
        page.wait_for_timeout(5000)
    log = page.evaluate("() => window.__fxlog")
    print("BATTLE LOG:", json.dumps(log, ensure_ascii=False))
    # 收尾：清时间模拟
    j = api(page, "/api/parent/debug-time", {"dayOffset": 0})
    print("offset reset:", j.get("ok"))


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False, proxy=PROXY)
        ctx = browser.new_context(ignore_https_errors=True,
                                  user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
                                  viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        if sys.argv[1] == "quiz":
            phase_quiz(page)
        elif sys.argv[1] == "homefx":
            phase_homefx(page)
        elif sys.argv[1] == "battle":
            phase_battle(page)
        browser.close()


if __name__ == "__main__":
    main()
