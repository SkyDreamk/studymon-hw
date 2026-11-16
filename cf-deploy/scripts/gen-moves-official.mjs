// 用法：
//   node scripts/gen-moves-official.mjs          输出内嵌字面量
//   node scripts/gen-moves-official.mjs --write 更新 src/data/moves-official.js 标记之间的内容
//   node scripts/gen-moves-official.mjs --check 校验内嵌内容；不一致时打印差异招式名并非零退出
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const dataUrl = new URL('../data/moves-official.json', import.meta.url);
const srcUrl = new URL('../src/data/moves-official.js', import.meta.url);
const begin = '/* MOVES_OFFICIAL:BEGIN */';
const end = '/* MOVES_OFFICIAL:END */';
const preferredOrder = [
  '电光一闪', '撒娇', '电击', '蹭蹭脸颊', '影子分身',
  '铁尾', '十万伏特', '电球', '伏特攻击', '打雷',
  '抓', '叫声', '火花', '烟幕', '火焰牙',
  '劈开', '喷射火焰', '龙爪', '闪焰冲锋', '大字爆炎',
  '撞击', '摇尾巴', '水枪', '缩入壳中', '泡沫',
  '水之波动', '高速旋转', '水炮', '求雨', '加农水炮',
  '藤鞭', '生长', '寄生种子', '飞叶快刀',
  '魔法叶', '日光束', '飞叶风暴', '疯狂植物', '大地之力',
];
const rank = new Map(preferredOrder.map((name, i) => [name, i]));
const quote = (value) => `'${value
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")
  .replace(/\r/g, '\\r')
  .replace(/\n/g, '\\n')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029')}'`;

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && !['--write', '--check'].includes(args[0]))) {
    throw new Error('用法：node scripts/gen-moves-official.mjs [--write|--check]');
  }
  const { moves } = JSON.parse(readFileSync(dataUrl, 'utf8'));
  if (!Array.isArray(moves)) throw new Error('data/moves-official.json 缺少 moves 数组');
  const expected = Object.create(null);
  for (const move of moves) {
    const { name, type, damage_class } = move;
    if (![name, type, damage_class].every((v) => typeof v === 'string' && v.length)) {
      throw new Error(`招式字段无效：${name ?? '(无名称)'}`);
    }
    if (Object.hasOwn(expected, name)) throw new Error(`重复招式：${name}`);
    expected[name] = { type, damage_class };
    // 命中率与威力仅从 JSON 读取；非有限数不写入内嵌表。
    // 威力供珍稀卡牌馆卡面显示（任务 116）——战斗结算不吃它，见 data/moves-official.json 注。
    if (Number.isFinite(move.accuracy)) {
      expected[name].accuracy = move.accuracy;
    }
    if (Number.isFinite(move.power)) {
      expected[name].power = move.power;
    }
  }
  const names = Object.keys(expected).sort((a, b) => {
    const ar = rank.get(a) ?? Infinity;
    const br = rank.get(b) ?? Infinity;
    return ar === br ? (a < b ? -1 : a > b ? 1 : 0) : ar < br ? -1 : 1;
  });
  const literal = [
    'export const MOVES_OFFICIAL = {',
    ...names.map((name) => {
      const { type, damage_class } = expected[name];
      // 有限命中率与威力输出为数值字面量，不手写各招式数值。
      const accuracyField = Number.isFinite(expected[name].accuracy) ? `, accuracy: ${expected[name].accuracy}` : '';
      const powerField = Number.isFinite(expected[name].power) ? `, power: ${expected[name].power}` : '';
      return `  ${quote(name)}: { type: ${quote(type)}, damage_class: ${quote(damage_class)}${accuracyField}${powerField} },`;
    }),
    '};',
  ].join('\n');
  if (!args.length) {
    process.stdout.write(`${literal}\n`);
    return;
  }
  const src = readFileSync(srcUrl, 'utf8');
  const start = src.indexOf(begin);
  const finish = src.indexOf(end, start + begin.length);
  if (start < 0 || finish < 0 ||
      src.indexOf(begin, start + begin.length) >= 0 ||
      src.indexOf(end, finish + end.length) >= 0) {
    throw new Error('src/data/moves-official.js 的 MOVES_OFFICIAL 标记缺失或重复');
  }
  const contentStart = start + begin.length;
  const generated = `\n${literal}\n`;
  if (args[0] === '--write') {
    writeFileSync(srcUrl, src.slice(0, contentStart) + generated + src.slice(finish), 'utf8');
    return;
  }
  const embedded = src.slice(contentStart, finish);
  if (embedded === generated) return;
  let actual;
  try {
    // 内嵌文本带 export 前缀，vm 按脚本求值前先去掉（仅用于解析比对）。
    actual = runInNewContext(`${embedded.replace(/export\s+const/, 'const')}\nMOVES_OFFICIAL;`, Object.create(null), { timeout: 1000 });
  } catch {
    console.error(`内嵌招式表无法解析；差异招式名：${names.join('、')}`);
    process.exitCode = 1;
    return;
  }
  const allNames = new Set([...names, ...Object.keys(actual ?? {})]);
  const differing = [...allNames].filter((name) => {
    const a = actual?.[name];
    const e = expected[name];
    if (!a || !e) return true;
    if (a.type !== e.type || a.damage_class !== e.damage_class) return true;
    // 命中率与威力按值比对（缺失与 null 等价）；内嵌条目不得有多余键。
    if ((a.accuracy ?? null) !== (e.accuracy ?? null)) return true;
    if ((a.power ?? null) !== (e.power ?? null)) return true;
    return Object.keys(a).some((k) => !['type', 'damage_class', 'accuracy', 'power'].includes(k));
  });
  console.error(`MOVES_OFFICIAL 不一致${differing.length ? '' : '（格式或顺序）'}；差异招式名：${(differing.length ? differing : names).join('、')}`);
  process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
