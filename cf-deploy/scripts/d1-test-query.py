"""测试站 D1 只读查询。用法：python3 scripts/d1-test-query.py "SELECT ..." """
import subprocess, json, sys
sql = sys.argv[1]
out = subprocess.run(
    ["python3", "scripts/run-wrangler.py", "d1", "execute", "YOUR_D1_DATABASE_NAME",
     "-c", "wrangler.staging.toml", "--remote", "--json", "--command", sql],
    capture_output=True, text=True, cwd="/home/hatch/workspace/studymon-hw/cf-deploy").stdout
i = out.find("[")
dec = json.JSONDecoder()
val, _ = dec.raw_decode(out[i:])
print(json.dumps(val[0].get("results", val), ensure_ascii=False, indent=2))
