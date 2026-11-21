// Batch 11 — D 登记收尾（26 种零实效，ABILITY_NO_EFFECT 2→28）
// 本批不改变任何战斗行为：只登记、不做处理函数；图鉴卡片展示不动。
// 验收：登记集合内容（M+L 一致）＋首特性覆盖＋已实现特性不在登记内＋总数 28。
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';

const M = await import('../src/index.js');
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);
const ENGINES = [['M', M], ['L', L]];

// 登记顺序＝src/index.js 里 ABILITY_NO_EFFECT 的定义顺序（Set 保序，deepEqual 逐项比）。
const EXPECTED_28 = [
  '坚硬脑袋', '压迫感',
  '逃跑', '捡拾', '发光', '湿气', '锐利目光', '鳞粉', '我行我素', '蹒跚',
  '斗争心', '污泥浆', '黏着', '连续攻击', '预知梦', '危险预知', '察觉',
  '天恩', '穿透', '奇迹皮肤', '友情防守', '治愈之心', '舍身', '强行',
  '轻装', '贪吃鬼', '收获', '紧张感',
];
const D26 = EXPECTED_28.slice(2);

// 首特性为 D 类特性的种（活 DEX_DETAILS 核实，plan §3.4 F 列一致）：
// 逃跑 7（19,20,77,78,84,85,133）＋捡拾 1（52）＋发光 2（120,121）＋湿气 2（54,55）
// ＋锐利目光 7（16,17,18,21,22,83,107）＋鳞粉 3（10,13,49）＋我行我素 1（108）＝23 种。
const D_FIRST_NOS = [19, 20, 77, 78, 84, 85, 133, 52, 120, 121, 54, 55, 16, 17, 18, 21, 22, 83, 107, 10, 13, 49, 108];
// 既有登记的首特性种：坚硬脑袋 8（74,75,76,95,104,105,142,208）＋压迫感 4（144,145,146,150）。
const EXISTING_FIRST_NOS = [74, 75, 76, 95, 104, 105, 142, 208, 144, 145, 146, 150];

// 已实现（各批已接线）的特性：一个都不许进零实效登记（防误登记守卫）。
const IMPLEMENTED = [
  '孢子', '避雷针', '储水', '飘浮', '威吓', '蓄电', '叶绿素', '毅力', '引火', // Batch 0
  '隔音', // Batch 1
  '下载', '变身者', // Batch 2
  '魔法防守', '雨盘', '沙之力', '无关天气', '引爆', // Batch 3
  '铁拳', '干燥皮肤', '多重鳞片', '过滤', '适应力', // Batch 4
  '迷人之躯', '迟钝', // Batch 5
  '精神力', '恶臭', '不屈之心', // Batch 6
  '磁力', '沙穴', // Batch 7
  '冰雹', '雪隐', '日照', '冰冻之躯', // Batch 8
  '复制', '诅咒之躯', '破格', '化学变化气体', // Batch 9
  '结实', // Batch 10
];

describe('Batch 11 — D 登记收尾（T1–T4）', () => {
  test('T1: 登记集合内容：28 种，顺序与定义一致（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      assert.deepEqual([...E.ABILITY_NO_EFFECT], EXPECTED_28, `${tag}: registry contents must match`);
    }
  });

  test('T2: 26 种 D 类全部在登记内（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      for (const name of D26) {
        assert.ok(E.ABILITY_NO_EFFECT.has(name), `${tag}: ${name} must be registered`);
      }
      assert.ok(E.ABILITY_NO_EFFECT.has('坚硬脑袋'), `${tag}: 坚硬脑袋 must stay registered`);
      assert.ok(E.ABILITY_NO_EFFECT.has('压迫感'), `${tag}: 压迫感 must stay registered`);
    }
  });

  test('T3: 首特性覆盖：23 种 D 类＋12 种既有，共 35 种的首特性在登记内（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      for (const no of [...D_FIRST_NOS, ...EXISTING_FIRST_NOS]) {
        assert.ok(E.ABILITY_NO_EFFECT.has(E.abilityOf(no)), `${tag}: ${no} first ability must be registered`);
      }
    }
  });

  test('T4: 已实现特性不在登记内＋总数 28（M+L）', () => {
    for (const [tag, E] of ENGINES) {
      assert.equal(E.ABILITY_NO_EFFECT.size, 28, `${tag}: registry size must be 28`);
      for (const name of IMPLEMENTED) {
        assert.equal(E.ABILITY_NO_EFFECT.has(name), false, `${tag}: implemented ability ${name} must NOT be registered`);
      }
    }
  });
});
