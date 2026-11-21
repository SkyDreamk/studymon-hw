"""测试站 D1 迁移前后统计（只读，一次批量查询）。用法：python3 scripts/d1-test-stats.py <输出json>"""
import subprocess, json, sys
SQL = """SELECT c.id AS child_id, c.name,
 (SELECT COUNT(*) FROM pet_instances p WHERE p.child_id=c.id) AS pets,
 (SELECT COUNT(*) FROM pokedex d WHERE d.child_id=c.id) AS pokedex,
 c.balls AS balls_normal, c.balls_super, c.balls_hyper, c.balls_master,
 (c.balls+c.balls_super+c.balls_hyper+c.balls_master) AS balls_total,
 (SELECT COUNT(DISTINCT date) FROM checkins k WHERE k.child_id=c.id) AS checkin_days,
 (SELECT COUNT(*) FROM checkins k WHERE k.child_id=c.id) AS checkin_rows,
 (SELECT COALESCE(SUM(qty),0) FROM item_inventory i WHERE i.child_id=c.id) AS backpack_qty,
 (SELECT COUNT(*) FROM battles b WHERE b.child_a=c.id OR b.child_b=c.id) AS battles,
 (SELECT COUNT(*) FROM gym_progress g WHERE g.child_id=c.id) AS gym_rows,
 c.total_xp
FROM children c ORDER BY c.id"""
out = subprocess.run(["python3", "scripts/run-wrangler.py", "d1", "execute", "YOUR_D1_DATABASE_NAME",
  "-c", "wrangler.staging.toml", "--remote", "--json", "--command", SQL],
  capture_output=True, text=True, cwd="/home/hatch/workspace/studymon-hw/cf-deploy")
o = out.stdout; i = o.find("[")
val, _ = json.JSONDecoder().raw_decode(o[i:])
res = val[0].get("results")
if res is None: print(o, out.stderr); sys.exit(1)
json.dump(res, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))
