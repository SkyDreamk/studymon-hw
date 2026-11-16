import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CARE_FOODS, CARE_BATHS, CARE_SCENES, CARE_FAVORITE_BY_LINE,
  CARE_XP_FAVORITE, careSceneForDate, careFavoriteFood,
  careFoodByKey, careBathByKey, isCareEnabled,
} from '../src/index.js';

test('照顾目录与最爱食物', () => {
  assert.equal(CARE_XP_FAVORITE, 5);
  assert.equal(CARE_FOODS.length, 6);
  assert.equal(CARE_BATHS.length, 4);
  assert.equal(CARE_SCENES.length, 7);
  for (const [line, food] of Object.entries(CARE_FAVORITE_BY_LINE)) {
    assert.equal(careFavoriteFood(line), food);
    assert.ok(careFoodByKey(food));
  }
  for (const food of CARE_FOODS) assert.equal(careFoodByKey(food.key), food);
  for (const bath of CARE_BATHS) assert.equal(careBathByKey(bath.key), bath);
  for (const key of ['unknown', '__proto__', 'constructor', '', null, undefined]) {
    assert.equal(careFavoriteFood(key), null);
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
  const source = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
  for (const name of ['Status', 'Feed', 'Bath']) {
    const start = source.indexOf(`async function apiCare${name}(`);
    assert.ok(start >= 0);
    const end = source.indexOf('\nasync function ', start + 1);
    const body = source.slice(start, end < 0 ? source.length : end);
    assert.ok(body.indexOf('isCareEnabled(db)') < body.indexOf('care_logs'));
    assert.match(body, /CARE_DISABLED/);
    assert.match(body, /scopeChildId\(session,\s*body\.child_id \?\? body\.childId\)/);
    if (name !== 'Status') {
      assert.match(body, /INSERT INTO care_logs/);
      assert.match(body, /WHERE NOT EXISTS/);
      assert.match(body, /changes === 0/);
      assert.match(body, /ALREADY_DONE/);
    }
    if (name === 'Bath') assert.doesNotMatch(body, /grantXp\s*\(/);
    if (name === 'Feed') {
      assert.match(body, /grantXp\(db, child, CARE_XP_FAVORITE, today\)/);
      assert.match(body, /pushNotice\(db, child\.id, 'evolution', xpInfo\.evolved\)/);
    }
  }
});
