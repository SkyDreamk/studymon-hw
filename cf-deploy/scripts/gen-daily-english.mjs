// 用法：
//   node scripts/gen-daily-english.mjs          输出校验（不写文件）
//   node scripts/gen-daily-english.mjs --write 更新 src/data/daily-english.js
//   node scripts/gen-daily-english.mjs --check 校验内嵌内容；不一致时非零退出
// 输入：work/daily-english-pool.json（跟读站素材只读 API v1 快照，python3 work/extract-daily-english-pool.py 生成）
// 输出：src/data/daily-english.js（DAILY_ENGLISH_EPISODES 集信息＋DAILY_ENGLISH_POOL 两孩句池）
// 校验：两孩句数须为 236/1100；每句 en/zh/双音频齐全；同一池内 (episode_id, sid) 不重复。
// 句子字段：s=sid，e=episode_id，k=集类型（textbook/card/video，口语=card/video），
// sp=说话人（card/video 句有，课本句为 null），en/zh，双音频 an/as。
import { readFileSync, writeFileSync } from 'node:fs';

const poolUrl = new URL('../work/daily-english-pool.json', import.meta.url);
const srcUrl = new URL('../src/data/daily-english.js', import.meta.url);

const EXPECTED = { xiaobao: 236, dabao: 1100 };

function build() {
  const raw = JSON.parse(readFileSync(poolUrl, 'utf8'));
  const episodes = {};
  const pool = {};
  for (const kid of ['xiaobao', 'dabao']) {
    const k = raw.kids[kid];
    if (!k) throw new Error(`pool 缺少 ${kid}`);
    if (k.pool.length !== EXPECTED[kid]) {
      throw new Error(`${kid} 句数 ${k.pool.length}，期望 ${EXPECTED[kid]}（快照变了？先核对 work/daily-english-pool.json）`);
    }
    const seen = new Set();
    pool[kid] = k.pool.map((s) => {
      if (!s.en || !s.zh || !s.audio_normal || !s.audio_slow) {
        throw new Error(`${kid} 句子缺字段：${JSON.stringify(s).slice(0, 160)}`);
      }
      const key = `${s.episode_id}:${s.sid}`;
      if (seen.has(key)) throw new Error(`${kid} 重复句子 ${key}`);
      seen.add(key);
      if (!episodes[s.episode_id]) {
        episodes[s.episode_id] = { t: s.title_en || '', z: s.title_zh || '', k: s.type || '' };
      }
      return { s: s.sid, e: s.episode_id, k: s.type || '', sp: s.speaker || null, en: s.en, zh: s.zh, an: s.audio_normal, as: s.audio_slow };
    });
  }
  return { episodes, pool, fetched: raw.fetched || '' };
}

function render({ episodes, pool, fetched }) {
  const epJson = JSON.stringify(episodes, null, 2);
  const poolJson = JSON.stringify(pool, null, 2);
  return `/* 每日英语内容池（快照）
 * 来源：跟读站素材只读 API v1（english.example.com/api/materials/v1，见 ~/workspace/user/files/API-_-v1.md）
 * 快照日期：${fetched || '2026-11-13'}（work/daily-english-pool.json）
 * 刷新方法：python3 work/extract-daily-english-pool.py（经 API 重拉跟读站）→ node scripts/gen-daily-english.mjs --write（重生成本文件）
 * 内容只用快照原样数据，不得手改句子、翻译、音频。API version 变了重拉对应集，音频 URL 以最新响应为准。
 * 小宝池：g1＋starter，29 集 236 句（口语 card 82 句）；大宝池：g3，40 集 1100 句（口语 card 98＋video 677 句）。
 * 每日选题只取课本句（见 src/index.js dailyEnglishTodayFor；2026-11-13 用户定：每日英语走课本内容，口语对话归 Oak）。
 */

/* DAILY_ENGLISH_EPISODES:BEGIN */
export const DAILY_ENGLISH_EPISODES = ${epJson};
/* DAILY_ENGLISH_EPISODES:END */

/* DAILY_ENGLISH_POOL:BEGIN */
export const DAILY_ENGLISH_POOL = ${poolJson};
/* DAILY_ENGLISH_POOL:END */
`;
}

const { episodes, pool, fetched } = build();
const out = render({ episodes, pool, fetched });
const flags = process.argv.slice(2);
if (flags.includes('--write')) {
  writeFileSync(srcUrl, out);
  console.log(`wrote src/data/daily-english.js（小宝 ${pool.xiaobao.length} 句、大宝 ${pool.dabao.length} 句、${Object.keys(episodes).length} 集）`);
} else {
  let cur = '';
  try { cur = readFileSync(srcUrl, 'utf8'); } catch { /* 文件尚不存在 */ }
  if (cur === out) {
    console.log(`OK：src/data/daily-english.js 与快照一致（小宝 ${pool.xiaobao.length} 句、大宝 ${pool.dabao.length} 句）`);
  } else {
    console.error('MISMATCH：src/data/daily-english.js 与 work/daily-english-pool.json 不一致，跑 node scripts/gen-daily-english.mjs --write 更新');
    process.exit(1);
  }
}
