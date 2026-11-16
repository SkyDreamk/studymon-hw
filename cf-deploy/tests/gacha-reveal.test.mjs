/* 扭蛋机揭示常驻（任务 92，2026-11-11）：抽完奖品不再约 1 秒自动归位、按钮变“再扭一次”。
 * 旧行为：playTwist 1650ms 揭示→2650ms resetMachine() 收走奖品，奖励只在退出时 celebrate() 弹一次，
 * 用户抽完看不到奖品、攒 3 次要进出 3 次。新行为：揭示后奖品常驻显示，按钮变“再扭一次”，
 * 再扭先收起上一轮奖品再跑动画；退出时仍按现行汇总弹一次结果、回背包。
 * 源码级断言（动画是定时器驱动，不做 DOM 真跑）：
 *  node --test tests/gacha-reveal.test.mjs */
import { assetPath } from './asset-path.mjs';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const app = () => readFileSync(assetPath('app.js'), 'utf8');

// 提取完整函数声明（头＋体＋收尾 }），供 VM 里真实调用
function functionDecl(source, name) {
  const header = new RegExp(
    '^(?:async\\s+)?function\\s+' + name + '\\b[^\\n]*\\{[ \\t]*\\r?\\n',
    'm'
  );
  const match = header.exec(source);
  assert.ok(match, `缺 ${name} 函数声明`);
  const rest = source.slice(match.index + match[0].length);
  const end = rest.search(/^\}/m);
  assert.ok(end >= 0, `缺 ${name} 函数结束标记`);
  return match[0] + rest.slice(0, end) + '}';
}

// showWheel 是大函数（内含 resetMachine／playTwist 等闭包），functionBody 截不到它；
// 用“const resetMachine = …;”到“const playTwist = …;”之间的文本做断言。
function closureBody(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start > -1, `缺 ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `缺 ${endMarker}`);
  return source.slice(start, end);
}

describe('扭蛋机揭示常驻（任务 92）', () => {
  test('resetMachine 接受 keepPrize，留奖品时不收出球口卡片', () => {
    const body = closureBody(app(), 'const resetMachine =', 'const playTwist =');
    assert.ok(body.includes('const resetMachine = (keepPrize) => {'), 'resetMachine 应接受 keepPrize 参数');
    assert.ok(body.includes('if (!keepPrize) {'), '收奖品（隐藏出球口、清空奖品）应只在 keepPrize 为假时执行');
    assert.ok(body.includes('twistBtn.textContent = keepPrize ? twistAgainLabel : twistLabel;'), '留奖品时按钮应变“再扭一次”，否则回“扭一下”');
  });

  test('playTwist 揭示后常驻（resetMachine(true)），开抽前先收上一轮奖品', () => {
    const body = closureBody(app(), 'const playTwist =', 'const startTwist =');
    // 揭示后不再自动归位：2650ms 与减动效 1000ms 均走 resetMachine(true)
    assert.ok(body.includes('setTimeout(() => { if (!done) resetMachine(true); }, 2650);'), '正常动画揭示后应 resetMachine(true) 常驻');
    assert.ok(body.includes('setTimeout(() => { if (!done) resetMachine(true); }, 1000);'), '减动效揭示后应 resetMachine(true) 常驻');
    assert.ok(!body.includes('setTimeout(() => { if (!done) resetMachine(); }, 2650);'), '不应再有 2650ms 自动归位（resetMachine()）');
    // 开抽前先收起上一轮奖品
    assert.ok(body.includes("drop.hidden = true;"), 'playTwist 开头应先收起上一轮奖品');
    assert.ok(body.includes("dropPrize.innerHTML = '';"), 'playTwist 开头应先清空上一轮奖品');
  });

  test('“再扭一次”文案在位', () => {
    const source = app();
    assert.ok(source.includes("const twistAgainLabel = tr('🔁 再扭一次', '🔁 Twist again');"), '缺“再扭一次”文案定义');
  });

  test('切盘仍收奖品（resetMachine() 无参）', () => {
    const body = closureBody(app(), 'const switchWheel =', 'if (isUnified) gachaSession =');
    assert.ok(body.includes('resetMachine();'), '切盘应调无参 resetMachine() 收起当前奖品');
  });

  test('makeWheelTwist 读对 winnerIndex（任务 92 根因）', () => {
    // 服务端 spin 响应是 {ok, prize, chancesLeft, wheel:{sectors, winnerIndex}}；
    // winnerIndex 与 sectors 同级在 wheel 里，不在顶层。误读 r.winnerIndex 得 undefined，
    // startTwist 的 wheelValid 恒失败，抽奖永远走“没有机会了”早退、playTwist 从不跑、
    // 奖品从不在机器里亮（服务端其实已扣次发奖，退出时 celebrate 才看得到）。
    const body = functionDecl(app(), 'makeWheelTwist');
    assert.ok(body.includes('winnerIndex: r.wheel.winnerIndex'), '应读 r.wheel.winnerIndex');
    assert.ok(!body.includes('winnerIndex: r.winnerIndex'), '不得读顶层 r.winnerIndex（恒为 undefined）');
    // 功能验证：用服务端形状的响应跑一遍，返回值须通过 wheelValid
    const wheelValidBody = functionDecl(app(), 'wheelValid');
    const sandbox = { prizes: [], onChances: () => {} };
    vm.createContext(sandbox);
    vm.runInContext(`${wheelValidBody}\n${body}\nthis.__twist = makeWheelTwist('/api/care-wheel/spin', 1, prizes, onChances);`, sandbox);
    // 桩 api：返回服务端真实形状
    sandbox.api = async () => ({
      ok: true,
      prize: { kind: 'item', key: 'care:berry', name: '树果', emoji: '🍓' },
      chancesLeft: 1,
      wheel: { sectors: Array.from({ length: 10 }, (_, i) => ({ key: `care:k${i}`, label: `奖${i}`, emoji: '🎁', color: '#fff', weight: 5 })), total: 42, winnerIndex: 3 },
    });
    return (async () => {
      const r = await sandbox.__twist();
      assert.ok(r, 'spin 应返回结果对象');
      assert.equal(r.winnerIndex, 3, 'winnerIndex 应为服务端定的 3');
      assert.equal(r.chancesLeft, 1);
      assert.equal(r.prizeName, '树果');
      assert.ok(sandbox.wheelValid({ sectors: r.sectors, winnerIndex: r.winnerIndex }), '返回值须通过 wheelValid，否则 startTwist 会早退');
      assert.equal(sandbox.prizes.length, 1, '奖品应进 sessionPrizes（退出时才弹汇总）');
    })();
  });
});
