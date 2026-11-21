/* 文字跨行修复（2026-10-27 §53，用户定：网格格子、按钮、双栏卡文案必须一行放下）单测：
 *  node --test tests/nowrap-fix.test.mjs
 * ① 导航按钮：大木博士收短、遭遇按钮收短（继续抓！）、.navgrid .bigbtn 14px＋flex＋nowrap＋ellipsis
 *    （14px 是带图标能放下的尺寸：16px 时大木博士溢出 12px；演示页 16px 是无图标纯文本）；
 * ② VS 卡：定高行（.vs-side/.vs-sprite/.vs-name/.vs-lv）、队名／备战 pill nowrap＋12px＋ellipsis、
 *    VS 居中、等级说明收短、招式句进 pvp-tip、备战文案去 Lv；
 * ③ 道馆关卡名：去掉与馆名重复的 typeChip，单行 nowrap＋ellipsis 兜底；
 * ④ 旧内联结构清零：VS 卡不再用 width:120px 内联盒＋badge 队名。
 * 真实 Azure 调用 0 次。 */
import { assetPath } from './asset-path.mjs';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = () => readFileSync(assetPath('app.js'), 'utf8');
const css = () => readFileSync(assetPath('style.css'), 'utf8');
function rule(c, sel) {
  const m = c.match(new RegExp(sel.replace('.', '\\.') + '\\{[^}]*\\}'));
  assert.ok(m, `缺 ${sel} 规则`);
  return m[0];
}

describe('导航按钮一行', () => {
  test('大木博士收短', () => {
    // 2026-11-05 用户验收：入口改名“大木博士之家”（里面不止英语一项）；旧“大木博士（已听”切片已删
    assert.match(app(), /大木博士之家/);
    assert.doesNotMatch(app(), /childSlice2Oak/);
    assert.doesNotMatch(app(), /大木博士英语（已听/);
  });
  test('遭遇按钮收短', () => {
    // 2026-10-31 切片 2：按钮文案改为 LANG.childSlice2KeepCatching / childSlice2GoCatch，字典仍含收短版
    assert.match(app(), /childSlice2KeepCatching: \['继续抓！'/);
    assert.match(app(), /childSlice2GoCatch: \['去抓'/);
    assert.doesNotMatch(app(), /还没抓完/);
    assert.doesNotMatch(app(), /继续答题！/);
    assert.doesNotMatch(app(), /野外遭遇！去抓/);
  });
  test('.navgrid .bigbtn 图上文下、两行 clamp（任务 107 取代一行省略）', () => {
    const r = rule(css(), '.navgrid .bigbtn');
    // 任务 107：2×2 按钮改图上文下居中，图标进 52 底板、文字长短不再带偏图标位置；一行省略由最多两行 clamp 取代
    assert.match(r, /font-size:14px/);
    assert.match(r, /display:flex/);
    assert.match(r, /flex-direction:column/);
    assert.match(r, /min-height:104px/);
    assert.doesNotMatch(r, /white-space:nowrap/);
    const t = rule(css(), '.navgrid .btn-tx');
    assert.match(t, /-webkit-line-clamp:2/);
  });
});

describe('道馆关卡名一行', () => {
  test('关卡名去掉重复 typeChip、单行兜底', () => {
    const a = app();
    // 关卡名行：馆名已含属性（岩石道馆），typeChip 的属性字是重复的，去掉
    assert.doesNotMatch(a, /第 \$\{s\.stage\} 关 · \$\{esc\(s\.gymName\)\} \$\{typeChip\(s\.type\)\}/);
    assert.match(a, /tr\(`第 \$\{s\.stage\} 关 `, `Stage \$\{s\.stage\} `\)\}\$\{esc\(s\.gymName\)\}<\/div>/);
    assert.match(a, /class="sc-name" style="font-size:var\(--fs-body\);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\$\{tr\(`第 \$\{s\.stage\} 关/);
  });
  test('家长审核三按钮行的改经验按钮收短', () => {
    const a = app();
    // 通过／改经验通过／驳回 三等分行：改经验通过 5 字在 101px 格里溢出 7px，收短为改经验；后改 tr 双语短文案
    assert.doesNotMatch(a, /改经验通过/);
    assert.match(a, /onclick="reviewAdjust\(\$\{r\.id\}\)">\$\{tr\('改经验', 'Adjust XP'\)\}<\/button>/);
  });
});

describe('VS 卡定高对齐', () => {
  test('CSS 类与定高行在位', () => {
    const c = css();
    for (const sel of ['.vs-row', '.vs-side', '.vs-team', '.vs-sprite', '.vs-name',
      '.vs-lv', '.vs-mid', '.vs-note', '.vs-benchrow', '.vs-bench']) {
      assert.ok(c.includes(sel + '{'), `缺 ${sel}`);
    }
    assert.match(rule(c, '.vs-side'), /width:140px/);
    assert.match(rule(c, '.vs-sprite'), /height:94px/);
    assert.match(rule(c, '.vs-name'), /min-height:28px/);
    assert.match(rule(c, '.vs-lv'), /height:22px/);
    assert.match(rule(c, '.vs-mid'), /align-self:center/);
  });
  test('队名／备战 pill 分行显示（2026-10-28 不用省略号藏内容）', () => {
    const c = css();
    for (const sel of ['.vs-team', '.vs-bench']) {
      const r = rule(c, sel);
      assert.match(r, /font-size:14px/, sel);
      assert.match(r, /white-space:normal/, sel);
      assert.doesNotMatch(r, /text-overflow:ellipsis/, sel);
    }
  });
  test('VS 卡用 class 不用旧内联结构', () => {
    const a = app();
    for (const cls of ['class="vs-row"', 'class="vs-side"', 'class="vs-mid"',
      'class="vs-benchrow"', 'class="vs-bench"', 'class="vs-note"']) {
      assert.ok(a.includes(cls), `缺 ${cls}`);
    }
    assert.doesNotMatch(a, /text-align:center;width:120px/);
  });
  test('等级说明收短、招式句进 pvp-tip、备战文案去 Lv', () => {
    const a = app();
    assert.match(a, /let flatNote = tr\('等级按较低一方压平', 'Levels are flattened to the lower side'\);/);
    assert.doesNotMatch(a, /等级按较低一方压平 · 招式保留各自已解锁/);
    assert.match(a, /招式保留各自已解锁。/);
    assert.doesNotMatch(a, /\$\{esc\(myBenchPet\.name\)\} Lv\./);
    assert.doesNotMatch(a, /\$\{esc\(bp\.name\)\} Lv\./);
    assert.match(a, /\$\{esc\(myBenchPet\.name\)\} \$\{esc\(myBenchPet\.type\)\}/);
  });
});

describe('家长设置页孩子密码网格不溢出', () => {
  test('收敛网格自动最小尺寸，密码进新模块结构、标签不再省略', () => {
    const c = css();
    const a = app();

    assert.ok(c.includes('.grid2>*{min-width:0}'));
    assert.ok(c.includes('.grid2 input,.grid2 select,.grid2 textarea{min-width:0}'));
    assert.equal(
      rule(c, '.grid2'),
      '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}'
    );
    assert.doesNotMatch(c, /\.formgrid label\{[^}]*white-space:nowrap/);
    assert.doesNotMatch(c, /\.formgrid label\{[^}]*text-overflow:ellipsis/);
    assert.ok(a.includes("psetOpen('security')"));
    assert.ok(a.includes('psetBack'));
    assert.ok(a.includes('class="pset-list"'));
    assert.ok(a.includes('${esc(c.name)} 的密码：'));
    assert.ok(a.includes('cpw-${c.id}'));
  });
});
