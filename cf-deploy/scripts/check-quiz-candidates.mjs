/* 批量题库入库前校验：node scripts/check-quiz-candidates.mjs <candidates.json> [...]
 * 入库标签规矩（2026-10-24 超纲事件后立）：数学学习题无 chapter 标签或标签无法解析
 * 时不得入库激活，否则进度门会放行（chapter 为空放行是为兼容旧题的过渡口径，
 * 新题不许再走这个口子）。与 src/index.js 的 questionActivationError 共用同一规则。
 * 版本比对关（2026-10-24 北师大重标后加）：数学学习题 chapter 可解析但不在
 * MATH_CHAPTERS 表内时亦不得入库（版本错配，如残留人教版章节、错别字章节）；
 * chapter 为 fail-closed 标记「待核对（北师大未对应）」时只作警告列出（须在缺口清单中），
 * 不阻塞（标记本身即 fail-closed 信号，激活规则会挡住它）。
 * 候选文件格式：JSON 数组，或含 questions/candidates/items 数组的对象；
 * 每条需含 subject 与 chapter（数学学习题），其余字段不校验。
 * 退出码：0=全部通过（警告不影响），1=有违规条目，2=用法/文件错误。
 */
import { readFileSync } from 'node:fs';
import { questionActivationError, MATH_CHAPTERS } from '../src/index.js';

const FAIL_CLOSED_MARKER = '待核对（北师大未对应）';
const TABLE_CHAPTERS = new Set(Object.values(MATH_CHAPTERS).flat());

const files = process.argv.slice(2);
if (!files.length) {
  console.error('用法：node scripts/check-quiz-candidates.mjs <candidates.json> [...]');
  process.exit(2);
}

let total = 0;
let bad = 0;
let warned = 0;
for (const f of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    console.error(`读文件失败 ${f}：${e.message}`);
    process.exit(2);
  }
  const entries = Array.isArray(data)
    ? data
    : (data.questions || data.candidates || data.items || []);
  if (!Array.isArray(entries)) {
    console.error(`文件无题目数组 ${f}`);
    process.exit(2);
  }
  for (const [i, e] of entries.entries()) {
    total++;
    // fail-closed 标记先行：标记本身即“不得激活”的 intentional 状态，只作警告列出，
    // 不走 questionActivationError（标记无法解析，否则会被误判为违规）。
    if ((e.kind || 'study') === 'study' && e.subject === '数学' && e.chapter === FAIL_CLOSED_MARKER) {
      warned++;
      console.warn(`警告（fail-closed，须在缺口清单中） ${f}[${i}] topic=${e.topicId || '-'}：题干=${String(e.q || e.question || '').slice(0, 40)}`);
      continue;
    }
    const err = questionActivationError({
      kind: e.kind || 'study',
      subject: e.subject ?? null,
      chapter: e.chapter ?? null,
    });
    if (err) {
      bad++;
      console.error(`违规 ${f}[${i}] source=${e.source || '-'}：${err}；题干=${String(e.q || e.question || '').slice(0, 40)}`);
      continue;
    }
    // 版本比对关：仅数学学习题，chapter 可解析但不在表内时视为版本错配
    if ((e.kind || 'study') === 'study' && e.subject === '数学' && e.chapter) {
      if (!TABLE_CHAPTERS.has(e.chapter)) {
        bad++;
        console.error(`违规（章节不在 MATH_CHAPTERS 表内，疑似版本错配） ${f}[${i}] topic=${e.topicId || '-'}：chapter=${e.chapter}；题干=${String(e.q || e.question || '').slice(0, 40)}`);
      }
    }
  }
}
if (bad) {
  console.error(`共 ${total} 条，${bad} 条违规，不得入库（另 ${warned} 条 fail-closed 警告）`);
  process.exit(1);
}
console.log(`校验通过：共 ${total} 条（另 ${warned} 条 fail-closed 警告，已列出）`);
