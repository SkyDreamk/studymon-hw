import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readBackendSource } from './backend-src.mjs';
import {
  CARE_FOODS, CARE_BATHS, CARE_SCENES,
  CARE_XP_FAVORITE, careSceneForDate, careDailyFavorite,
  careFoodByKey, careBathByKey, isCareEnabled,
} from '../src/index.js';

test('照顾目录与每天随机最爱', () => {
  assert.equal(CARE_XP_FAVORITE, 5);
  assert.equal(CARE_FOODS.length, 6);
  assert.equal(CARE_BATHS.length, 4);
  assert.equal(CARE_SCENES.length, 7);
  // 每天随机最爱（2026-11-20）：同一（孩子，日期）稳定不变，返回值必为合法键，60 天内确有轮换。
  const a = careDailyFavorite(1, '2026-11-20');
  assert.deepEqual(a, careDailyFavorite(1, '2026-11-20'));
  assert.ok(CARE_FOODS.some((f) => f.key === a.food));
  assert.ok(CARE_BATHS.some((b) => b.key === a.bath));
  const foods = new Set(); const baths = new Set();
  for (const m of ['10', '11']) for (let d = 1; d <= 30; d++) {
    const f = careDailyFavorite(1, `2026-${m}-${String(d).padStart(2, '0')}`);
    foods.add(f.food); baths.add(f.bath);
  }
  assert.ok(foods.size >= 4, `60 天最爱食物应轮换，实际 ${foods.size} 种`);
  assert.ok(baths.size >= 3, `60 天最爱洗澡应轮换，实际 ${baths.size} 种`);
  for (const food of CARE_FOODS) assert.equal(careFoodByKey(food.key), food);
  for (const bath of CARE_BATHS) assert.equal(careBathByKey(bath.key), bath);
  for (const key of ['unknown', '__proto__', 'constructor', '', null, undefined]) {
    assert.equal(careFoodByKey(key), null);
    assert.equal(careBathByKey(key), null);
  }
});

test('上海日期对应完整一周场景', () => {
  for (let day = 19; day <= 25; day++) {
    const scene = careSceneForDate(`2026-10-${day}`);
    assert.equal(scene, CARE_SCENES[day - 19]);
    assert.equal(scene.weekday, (day - 18) % 7);
  }
  assert.equal(careSceneForDate('2024-02-29').weekday, 4);
});

test('非法日期安全回落到周一', () => {
  for (const value of [
    undefined, null, {}, 123, '', 'bad', '2026-02-29',
    '2026-04-31', '2026-00-01', '2026-13-01', '2026-10-00',
    '2026-10-32', '2026-1-1', '2026-10-25T00:00:00Z',
  ]) assert.equal(careSceneForDate(value), CARE_SCENES[0]);
});

test('总开关只接受字符串 1 且不访问照顾表', async () => {
  for (const value of ['1', '0', null, undefined, '', 'true', 1]) {
    const db = {
      prepare(sql) {
        assert.match(sql, /settings/i);
        assert.doesNotMatch(sql, /care_logs/i);
        return {
          bind(...args) {
            assert.ok(args.includes('care_enabled'));
            return this;
          },
          async first() {
            return value == null ? null : { value };
          },
        };
      },
    };
    assert.equal(await isCareEnabled(db), value === '1');
  }
});

test('迁移包含并发唯一约束和查询索引', async () => {
  const sql = await readFile(new URL('../migrations/0015_care_logs.sql', import.meta.url), 'utf8');
  assert.match(sql, /UNIQUE\s*\(\s*child_id,\s*date_shanghai,\s*kind\s*\)/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_care_logs_child_date/i);
  assert.doesNotMatch(sql, /UPDATE\s+settings|DELETE\s+FROM\s+settings/i);
});

test('接口静态安全契约：先检查开关、条件 INSERT、洗澡无经验', async () => {
  const source = readBackendSource();
  const sliceFn = (fnName) => {
    const start = source.indexOf(`async function ${fnName}(`);
    assert.ok(start >= 0, `missing ${fnName}`);
    const end = source.indexOf('\nasync function ', start + 1);
    return source.slice(start, end < 0 ? source.length : end);
  };
  const statusBody = sliceFn('apiCareStatus');
  assert.ok(statusBody.indexOf('isCareEnabled(db)') < statusBody.indexOf('care_logs'));
  assert.match(statusBody, /CARE_DISABLED/);
  assert.match(statusBody, /scopeChildId\(session,\s*body\.child_id \?\? body\.childId\)/);

  const sharedBody = sliceFn('doCareAction');
  assert.ok(sharedBody.indexOf('isCareEnabled(db)') < sharedBody.indexOf('care_logs'));
  assert.match(sharedBody, /CARE_DISABLED/);
  assert.match(sharedBody, /scopeChildId\(session,\s*body\.child_id \?\? body\.childId\)/);
  assert.match(sharedBody, /INSERT INTO care_logs/);
  assert.match(sharedBody, /WHERE NOT EXISTS/);
  assert.match(sharedBody, /changes === 0/);
  assert.match(sharedBody, /ALREADY_DONE/);
  assert.match(sharedBody, /grantXp\(db, child, CARE_XP_FAVORITE, today\)/);
  assert.match(sharedBody, /pushNotice\(db, child\.id, 'evolution', xpInfo\.evolved\)/);

  sliceFn('apiCareFeed');
  const bathBody = sliceFn('apiCareBath');
  assert.doesNotMatch(bathBody, /grantXp\s*\(/);
});
