#!/usr/bin/env node
/* Oak 集清单静态生成器（Fable 优化 #15）
 * 从种子迁移在内存 SQLite 里跑 DISTINCT + 每集 COUNT，生成 src/data/oak-episode-lists.js。
 * 种子迁移（最小集，与测试夹具等价——已验算：本集与 opt14 全量夹具链的 DISTINCT+计数逐项一致）：
 *   0001_init.sql（children 表，0002 的 ALTER TABLE 依赖它）
 *   0002_quiz.sql（quiz_questions 表 + idx_quiz_kind_grade）
 *   0014_oak.sql（Oak 列＋174 行）
 *   0032_oak_dialogue.sql（补 225 行）
 * 注意 0016 只改写 oak_audio，不影响集名与行数，故不在此列；0027/0030/0031 不含 kind='oak' 行。
 * 用法（在 cf-deploy/ 下运行，不联网、不碰真库）：
 *   node scripts/gen-oak-episodes.mjs            # 打印模块到 stdout
 *   node scripts/gen-oak-episodes.mjs --write    # 写回 src/data/oak-episode-lists.js
 *   node scripts/gen-oak-episodes.mjs --check    # 校验已签入模块与种子一致（不一致 exit 1）
 * 输出是确定性的（无时间戳），--check 按字符串全等比较。
 * 内容变了（新种子迁移、新集、改集名、改行数）必须重跑 --write，否则
 * tests/oak-episode-lists.test.mjs 的漂移守卫会失败。不要手改生成文件。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0014_oak.sql', '0032_oak_dialogue.sql'];
const OUT = resolve(root, 'src/data/oak-episode-lists.js');

function buildRows() {
  const db = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) db.exec(readFileSync(resolve(root, 'migrations', f), 'utf8'));
  const out = {};
  for (const g of [1, 3]) {
    out[g] = db.prepare(
      "SELECT oak_episode AS ep, COUNT(*) AS n FROM quiz_questions WHERE kind='oak' AND grade=? GROUP BY oak_episode ORDER BY oak_episode"
    ).all(g);
  }
  return out;
}

function buildModule(rows) {
  const tot = (g) => rows[g].reduce((s, r) => s + r.n, 0);
  const lines = [
    '/* Oak 集清单（静态快照，Fable 优化 #15）',
    ' * 来源：种子迁移 0001+0002+0014+0032（0014 种 174 行、0032 补 225 行，共 399 行 kind=\'oak\'）。',
    ' * 每项 { ep, n }：ep = 该年级 DISTINCT oak_episode（ORDER BY oak_episode，与运行时 DISTINCT 同序）；',
    ' * n = 该集 kind=\'oak\' 行数（全部 kind 分类——SQL 只按 kind=\'oak\' 计，与补句 COUNT 语义一致；',
    ' * 集类型过滤 card/video 仍在运行时按 DAILY_ENGLISH_EPISODES 做，不在这里过滤）。',
    ' * 内容变了（新种子迁移、新集、改集名、改行数）必须重跑：node scripts/gen-oak-episodes.mjs --write，',
    ' * 否则 tests/oak-episode-lists.test.mjs 的漂移守卫会失败。不要手改本文件。',
    ` * g1 ${rows[1].length} 集/${tot(1)} 行，g3 ${rows[3].length} 集/${tot(3)} 行。`,
    ' */',
    'export const OAK_EPISODE_ROWS = {',
  ];
  for (const g of [1, 3]) {
    lines.push(`  ${g}: [`);
    for (const r of rows[g]) lines.push(`    { ep: ${JSON.stringify(r.ep)}, n: ${r.n} },`);
    lines.push('  ],');
  }
  lines.push('};');
  return lines.join('\n') + '\n';
}

const mode = process.argv[2] || '';
const module = buildModule(buildRows());
if (mode === '--write') {
  writeFileSync(OUT, module);
  console.log(`已写回 ${OUT}`);
} else if (mode === '--check') {
  const current = readFileSync(OUT, 'utf8');
  if (current !== module) {
    console.error('CHECK FAILED：src/data/oak-episode-lists.js 与种子不一致，请跑 node scripts/gen-oak-episodes.mjs --write 再生');
    process.exitCode = 1;
  } else {
    console.log('CHECK OK');
  }
} else if (mode) {
  throw new Error('用法：node scripts/gen-oak-episodes.mjs [--write|--check]');
} else {
  process.stdout.write(module);
}
