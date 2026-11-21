/* 任务 102 批次 B（Phase 2：动机强化，2026-11-14）
 * node --test tests/motivation-batch-b.test.mjs
 * B1a：打卡页「首个未交科目」卡片静态柔光。
 *   未交 = 没有打卡记录（!t.checkin）；被驳回的科目有记录（红色「被驳回」胶囊 + 修改按钮），不发光；全部已交时 findIndex 为 -1，无卡片发光。
 *   纯 CSS 静态强调（描边 + 柔光环），不加动画、不改 transition，不引入新颜色。
 * 说明：读取的是带哈希的构建产物（assetPath('app.js') / assetPath('style.css')），不是 .orig。
 * 本批未使用任何 Ruixen 组件。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assetPath } from './asset-path.mjs';
import { readBackendSource } from './backend-src.mjs';

const APP = readFileSync(assetPath('app.js'), 'utf8');
const CSS = readFileSync(assetPath('style.css'), 'utf8');

/* goCheckinPage 函数体（到下一个顶层函数为止） */
function checkinPageBody() {
  const start = APP.indexOf('async function goCheckinPage');
  assert.ok(start >= 0, '找不到 goCheckinPage');
  const rest = APP.slice(start + 10);
  const end = rest.search(/\n(?:async )?function /);
  return rest.slice(0, end > 0 ? end : undefined);
}

describe('B1a 首个未交科目柔光', () => {
  test('CSS：存在 .subjcard.next 规则，含 border-color、无 box-shadow（返工 2：橙色描边阴影已去，强调只用边框颜色），且没有 animation', () => {
    const rules = CSS.split('\n').filter((l) => l.startsWith('.subjcard.next{'));
    assert.equal(rules.length, 1, '应恰有一条 .subjcard.next 规则');
    assert.doesNotMatch(rules[0], /box-shadow:/, '返工 2 已去橙色描边阴影');
    assert.match(rules[0], /border-color:[^;}]+/);
    assert.doesNotMatch(rules[0], /animation/);
  });

  test('源码：goCheckinPage 用 findIndex 在「!t.checkin」上算出第一个未交下标', () => {
    const body = checkinPageBody();
    assert.match(body, /const nextIdx = subs\.findIndex\(\(t\) => !t\.checkin\);/);
    assert.match(body, /\$\{subs\.map\(\(t, i\) => \{/);
  });

  test("源码：subjcard 的 class 模板恰在 i === nextIdx 时加 ' next'，onclick 不变", () => {
    const body = checkinPageBody();
    assert.match(body, /<div class="subjcard\$\{window\._popSubject === t\.subject \? ' card-pop' : ''\}\$\{i === nextIdx \? ' next' : ''\}" onclick="goSubjectDetail\(\$\{id\},'\$\{t\.subject\}'\)">/);
  });

  test("源码：只有打卡页的 subjcard 模板带 next（其它页面的卡片不会获得 next 类）", () => {
    const marks = [...APP.matchAll(/\$\{i === nextIdx \? ' next' : ''\}/g)];
    assert.equal(marks.length, 1);
    assert.ok(checkinPageBody().includes("' next'"), "' next' 应出现在打卡页内");
    // 其它页面的 subjcard 模板保持无 next
    const others = APP.split('\n').filter((l) => /class="subjcard"/.test(l));
    assert.ok(others.length >= 1);
    for (const l of others) assert.doesNotMatch(l, /\bnext\b/);
    // CSS 里也只有这一处 .next 选择器
    assert.equal(CSS.split('\n').filter((l) => /\.next\b/.test(l)).length, 1);
  });
});

describe('B1b 快孵化的蛋柔光与标签', () => {
  test('CSS：存在 .eggrow.soon 规则，含 box-shadow 与 border-color，且没有 animation', () => {
    const rules = CSS.split('\n').filter((l) => l.startsWith('.eggrow.soon{'));
    assert.equal(rules.length, 1, '应恰有一条 .eggrow.soon 规则');
    assert.match(rules[0], /box-shadow:[^;}]+/);
    assert.match(rules[0], /border-color:[^;}]+/);
    assert.doesNotMatch(rules[0], /animation/);
  });

  test('CSS：存在 .egg-soon 规则，含 color:#7c4a00', () => {
    const rules = CSS.split('\n').filter((l) => l.startsWith('.egg-soon{'));
    assert.equal(rules.length, 1, '应恰有一条 .egg-soon 规则');
    assert.match(rules[0], /color:#7c4a00[;}]/);
  });

  test("源码：两个蛋列表（j.eggs 与 j.rewardEggs）均在 !e.hatched && e.daysLeft === 1 时加 ' soon' 类", () => {
    assert.match(APP, /j\.eggs\.map\(\(e\) => `<div class="card eggrow\$\{!e\.hatched && e\.daysLeft === 1 \? ' soon' : ''\}">/);
    assert.match(APP, /j\.rewardEggs\.map\(\(e\) => `<div class="card eggrow\$\{!e\.hatched && e\.daysLeft === 1 \? ' soon' : ''\}">/);
    const soonMarks = [...APP.matchAll(/class="card eggrow\$\{!e\.hatched && e\.daysLeft === 1 \? ' soon' : ''\}"/g)];
    assert.equal(soonMarks.length, 2);
  });

  test('源码：两个蛋列表均在 </b> 后按相同条件插入「快孵化啦 / Hatching soon!」标签，且别处无此标签', () => {
    const label = "${!e.hatched && e.daysLeft === 1 ? `<span class=\"egg-soon\">${tr('快孵化啦', 'Hatching soon!')}</span>` : ''}";
    const sealedMatch = APP.match(/j\.eggs\.map\(\(e\) => `<div class="card eggrow[^\n]*\n[^\n]*\n[^\n]*<\/b>([^\n]*)/);
    const rewardMatch = APP.match(/j\.rewardEggs\.map\(\(e\) => `<div class="card eggrow[^\n]*\n[^\n]*\n[^\n]*<\/b>([^\n]*)/);
    assert.ok(sealedMatch && sealedMatch[1] === label, '封存蛋行 </b> 后应紧跟 egg-soon 标签');
    assert.ok(rewardMatch && rewardMatch[1] === label, '奖励蛋行 </b> 后应紧跟 egg-soon 标签');
    assert.equal(APP.split('快孵化啦').length - 1, 2);
    assert.equal(APP.split('Hatching soon!').length - 1, 2);
    assert.equal(APP.split('egg-soon').length - 1, 2);
  });

  test('源码：仅改前端，后端 src/index.js 未引入 egg-soon 或孵化提醒文案', () => {
    const backend = readBackendSource();
    assert.doesNotMatch(backend, /egg-soon|快孵化啦|Hatching soon!/);
  });
});

describe('B2 已获得健身徽章渐变背景', () => {
  test('CSS：.badgeslot.lit 规则包含渐变背景 background:linear-gradient(180deg, #fff, var(--pri-l))', () => {
    const rules = CSS.split('\n').filter((l) => l.startsWith('.badgeslot.lit{'));
    assert.equal(rules.length, 1, '应恰有一条 .badgeslot.lit 规则');
    assert.ok(rules[0].includes('background:linear-gradient(180deg, #fff, var(--pri-l))'));
  });

  test('CSS：.badgeslot.lit 规则保留 color:var(--ink)，柔光阴影已去掉（返工 2026-11-14 阴影收敛）', () => {
    const rules = CSS.split('\n').filter((l) => l.startsWith('.badgeslot.lit{'));
    assert.equal(rules.length, 1, '应恰有一条 .badgeslot.lit 规则');
    assert.ok(rules[0].includes('color:var(--ink)'));
    assert.doesNotMatch(rules[0], /box-shadow/, '返工 2026-11-14：.badgeslot.lit 柔光阴影应已去掉');
  });

  test('CSS：未获得槽位 .badgeslot 不含 linear-gradient 且仍为 border:2px dashed', () => {
    const rules = CSS.split('\n').filter((l) => l.startsWith('.badgeslot{'));
    assert.equal(rules.length, 1, '应恰有一条 .badgeslot 规则');
    assert.doesNotMatch(rules[0], /linear-gradient/);
    assert.ok(rules[0].includes('border:2px dashed'));
  });

  test('CSS：首页小徽章 .badge 规则与基线逐字节一致', () => {
    const rules = CSS.split('\n').filter((l) => l.startsWith('.badge{'));
    assert.equal(rules.length, 1, '应恰有一条 .badge 规则');
    assert.equal(
      rules[0],
      '.badge{display:inline-block;background:var(--amber-bg);border-radius:12px;padding:6px 12px;margin:4px;font-weight:600}'
    );
  });
});

describe('B3 连续打卡距下次开箱倒计时', () => {
  test('源码：概览 kidcard streak 胶囊后紧跟唯一的 <div class="streak-countdown">，含公式与达成条件', () => {
    assert.equal(APP.split('<div class="streak-countdown">').length - 1, 1);
    const m = APP.match(
      /<div class="streak">\$\{ic\('flame'\)\} \$\{tr\(\.\.\.LANG\.streak\)\}\$\{k\.streak\}[^\n]*<\/div>\n\s*<div class="streak-countdown">([^\n]+)<\/div>/
    );
    assert.ok(m, '概览 kidcard 的 streak 胶囊后应紧跟 <div class="streak-countdown">');
    assert.ok(m[1].includes('7 - (k.streak % 7)'));
    assert.ok(m[1].includes('k.streak > 0 && k.streak % 7 === 0'));
  });

  test('源码：倒计时行包含完整中英文逐字文案对', () => {
    const m = APP.match(/<div class="streak-countdown">([^\n]+)<\/div>/);
    assert.ok(m);
    const line = m[1];
    assert.ok(line.includes('距离下次开箱还差'));
    assert.ok(line.includes('Next streak box in '));
    assert.ok(line.includes('本周开箱已达成'));
    assert.ok(line.includes('Weekly box earned!'));
  });

  test('逻辑：从源码提取真实表达式运行，各 streak 天数返回值符合预期', () => {
    const m = APP.match(/<div class="streak-countdown">([^\n]+)<\/div>/);
    assert.ok(m && m[1].startsWith('${') && m[1].endsWith('}'));
    const expr = m[1].slice(2, -1);
    const evalExpr = new Function('k', 'tr', `return (${expr});`);
    const trZh = (zh) => zh;
    const trEn = (_zh, en) => en;
    const expected = [
      [0, 7],
      [1, 6],
      [2, 5],
      [3, 4],
      [4, 3],
      [5, 2],
      [6, 1],
      [7, 'earned'],
      [8, 6],
      [13, 1],
      [14, 'earned'],
      [29, 6],
      [30, 5],
    ];
    for (const [streak, days] of expected) {
      const zh = evalExpr({ streak }, trZh);
      const en = evalExpr({ streak }, trEn);
      if (days === 'earned') {
        assert.equal(zh, '本周开箱已达成', `streak=${streak} zh`);
        assert.equal(en, 'Weekly box earned!', `streak=${streak} en`);
      } else {
        assert.equal(zh, `距离下次开箱还差 ${days} 天`, `streak=${streak} zh`);
        assert.equal(en, `Next streak box in ${days} day${days === 1 ? '' : 's'}`, `streak=${streak} en`);
      }
    }
  });

  test('CSS：存在 .streak-countdown 规则且含 font-size:var(--fs-label)，.streak 规则与基线逐字节一致', () => {
    const countdownRules = CSS.split('\n').filter((l) => l.startsWith('.streak-countdown{'));
    assert.equal(countdownRules.length, 1, '应恰有一条 .streak-countdown 规则');
    assert.ok(countdownRules[0].includes('font-size:var(--fs-label)'));
    const streakRules = CSS.split('\n').filter((l) => l.startsWith('.streak{'));
    assert.equal(streakRules.length, 1, '应恰有一条 .streak 规则');
    assert.equal(
      streakRules[0],
      '.streak{display:inline-block;background:var(--pri-l);border-radius:var(--radius-pill);padding:4px 12px;font-weight:600;margin-top:4px}'
    );
  });
});
