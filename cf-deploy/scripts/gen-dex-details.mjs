#!/usr/bin/env node
/* 图鉴详情数据生成器：从 data/pokedex-details.json 抽取卡片要用的字段，生成嵌入 src/index.js 的 DEX_DETAILS 字面量。
 * 只取 types / abilities（name/hidden/effect）/ stats（六围＋总和）；名字、进化链、立绘由
 * SPECIES / EVO_LINES / LINES / petImg 覆盖，不重复内嵌。
 * 用法（在 cf-deploy/ 下运行）：
 *   node scripts/gen-dex-details.mjs            # 打印字面量到 stdout
 *   node scripts/gen-dex-details.mjs --write    # 写回 src/index.js（替换 DEX_DETAILS:BEGIN/END 标记之间的内容）
 *   node scripts/gen-dex-details.mjs --check    # 校验 src/index.js 内嵌内容与 JSON 一致
 * 再生后跑 node --test tests/pokedex-card.test.mjs。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'src/index.js');
const JSON_PATH = resolve(root, 'data/pokedex-details.json');
const BEGIN = '/* DEX_DETAILS:BEGIN */';
const END = '/* DEX_DETAILS:END */';

function buildLiteral() {
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const species = data.species || data;
  const lines = ['const DEX_DETAILS = {'];
  for (const s of [...species].sort((a, b) => a.no - b.no)) {
    const entry = {
      types: s.types,
      abilities: (s.abilities || []).map((a) => ({ name: a.name, hidden: !!a.hidden, effect: a.effect || '' })),
      stats: s.stats,
    };
    lines.push(`  ${s.no}: ${JSON.stringify(entry)},`);
  }
  lines.push('};');
  return lines.join('\n');
}

const mode = process.argv[2] || '';
const literal = buildLiteral();
if (mode === '--write') {
  const src = readFileSync(SRC, 'utf8');
  const i = src.indexOf(BEGIN);
  const j = src.indexOf(END);
  if (i === -1 || j === -1 || j <= i) throw new Error('src/index.js 缺少 DEX_DETAILS 标记（先在 SPECIES 后手工放一对空标记）');
  // 防丢守卫（2026-11-06）：BEGIN/END 之间只允许 DEX_DETAILS 字面量；officialMove /
  // officialAccuracy 曾因放在该区内被 --write 误删导致模块无法导入。区内一旦出现
  // function 定义或其他非字面量内容，拒绝写入，先把手工代码移出该区再跑。
  const oldRegion = src.slice(i + BEGIN.length, j).trim();
  if (oldRegion && (!oldRegion.startsWith('const DEX_DETAILS = {') || /\bfunction\b/.test(oldRegion))) {
    throw new Error('拒绝写入：DEX_DETAILS 标记之间含有非字面量内容（疑似手工代码），请先移出 BEGIN/END 之间再跑 --write');
  }
  const next = src.slice(0, i + BEGIN.length) + '\n' + literal + '\n' + src.slice(j);
  writeFileSync(SRC, next);
  console.log(`已写回 ${SRC}（${literal.split('\n').length} 行）`);
} else if (mode === '--check') {
  const src = readFileSync(SRC, 'utf8');
  const i = src.indexOf(BEGIN);
  const j = src.indexOf(END);
  if (i === -1 || j === -1) throw new Error('缺少 DEX_DETAILS 标记');
  const embedded = src.slice(i + BEGIN.length, j).trim();
  if (embedded !== literal) {
    console.error('CHECK FAILED：内嵌 DEX_DETAILS 与 data/pokedex-details.json 不一致，请跑 --write 再生');
    process.exitCode = 1;
  } else {
    console.log('CHECK OK');
  }
} else if (mode) {
  throw new Error('用法：node scripts/gen-dex-details.mjs [--write|--check]');
} else {
  console.log(literal);
}
