#!/usr/bin/env node
import {
  readFileSync, writeFileSync, readdirSync, existsSync,
  mkdirSync, renameSync, copyFileSync, unlinkSync,
} from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (resolve(process.cwd()) !== root) {
  throw new Error('请在 cf-deploy/ 下运行');
}

const flags = process.argv.slice(2);
if (flags.some(x => !['--dry-run', '--verify', '--revert'].includes(x))
    || flags.length > 1) {
  throw new Error('用法：node scripts/hash-assets.mjs [--dry-run|--verify|--revert]');
}
const mode = flags[0] || '';
const abs = p => join(root, p);
const read = p => readFileSync(abs(p), 'utf8');
const strip = s => s.replace(/\.[0-9a-f]{8}\./g, '.');
const digest = b => createHash('sha256').update(b).digest('hex');
const manifestPath = 'public/static/asset-manifest.json';
const nos = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 25, 26, 37, 38, 39, 40, 43, 44, 45, 50,
  51, 54, 55, 58, 59, 74, 75, 76, 95, 98, 99, 111, 112, 121, 123, 125, 131, 133,
  134, 135, 136, 143, 147, 148, 149, 151, 172, 179, 180, 181, 196, 197, 208, 212, 217, 390,
  464, 466, 470, 471, 700, 900,
  // 第三批（2026-11-06）
  35, 36, 41, 42, 46, 47, 48, 49, 52, 53, 56, 57, 60, 61, 62, 63, 64, 65, 66, 67,
  // 第四批（2026-11-06）
  68, 69, 70, 71, 72, 73, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
  // 第五批（2026-11-06）
  91, 92, 93, 94, 96, 97, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 113, 114, 115,
  // 第六批（2026-11-06）：19 种（144 不进池）
  116, 117, 118, 119, 120, 122, 124, 126, 127, 128, 129, 130, 132, 137, 138, 139, 140, 141, 142,
  // 备战全选补漏（2026-11-06）：COLLECTION_MOVES 里有图但从未进轮换
  10, 11, 12, 13, 14, 15, 19, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31, 32, 33, 34,
  // 传说 4 种（2026-11-07）：稀有转盘发蛋用（RARE_WHEEL_LEGENDARIES）
  144, 145, 146, 150,
];

function walk(dir) {
  return readdirSync(abs(dir), { withFileTypes: true }).flatMap(e => {
    const p = `${dir}/${e.name}`;
    return e.isDirectory() ? walk(p) : [p];
  });
}

const publicFiles = () => walk('public');
const baseFiles = [
  'static/app.js', 'static/style.css', 'static/engine-local.js', 'static/care-room.js', // 任务 122：养成小房间懒加载 bundle，与 app.js/style.css 同一 hash
  ...nos.map(n => `static/img/p${n}.webp`),
  'static/img/avatar-charmander.webp',
  'static/img/avatar-pikachu.webp',
  'static/img/avatar-back-charmander.webp',
  'static/img/avatar-back-pikachu.webp',
  'static/img/back-5.webp',
  'static/img/back-6.webp',
  'static/img/back-25.webp',
  'static/img/back-26.webp',
  'static/img/back-131.webp',
  'static/img/back-143.webp',
  'static/icon-180.png', 'static/icon-192.png',
  'static/icon-512.png', 'static/icon-512-maskable.png',
];

function discover() {
  const disk = publicFiles();
  const types = [...new Set(disk
    .map(p => strip(p.slice('public/'.length)))
    .filter(p => /^static\/img\/types\/[^/]+\.webp$/.test(p)))].sort();
  if (types.length !== 10) throw new Error(`types 图标数量应为 10，实际 ${types.length}`);
  const icons = [...new Set(disk
    .map(p => strip(p.slice('public/'.length)))
    .filter(p => /^static\/img\/icons\/[^/]+\.webp$/.test(p)))].sort();
  if (icons.length !== 31) throw new Error(`icons 图标数量应为 31，实际 ${icons.length}`);
  const bases = [...baseFiles, ...types, ...icons].sort();
  const located = {};
  for (const base of bases) {
    const matches = disk.filter(p => strip(p.slice(7)) === base);
    if (matches.length !== 1) {
      throw new Error(`${base} 必须恰有一个磁盘文件，实际 ${matches.length}`);
    }
    located[base] = matches[0];
  }
  return { bases, located };
}

const escapeRE = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 只匹配指定引用锚点；允许其中存在旧 token，不全局改写源文件。
function pattern(base) {
  const dot = base.lastIndexOf('.');
  return new RegExp(
    escapeRE(base.slice(0, dot))
    + '(?:\\.[0-9a-f]{8})?'
    + escapeRE(base.slice(dot)), 'g',
  );
}
function hashed(base, h) {
  const dot = base.lastIndexOf('.');
  return base.slice(0, dot) + (h ? `.${h}` : '') + base.slice(dot);
}

const rules = {
  'public/index.html': [
    ['/static/app.js', 1], ['/static/style.css', 1],
    ['/static/icon-180.png', 1], ['/static/icon-192.png', 1],
  ],
  'public/static/manifest.json': [
    ['icon-192.png', 1], ['icon-512.png', 1], ['icon-512-maskable.png', 1],
  ],
  'src/index.js': [
    ['const petImg = (no) => `/static/img/p${no}.webp`;', 1],
    // v11：头像改为三元兜底（专属头像线用 avatar- 文件，其余线用形态立绘），锚点只取模板字面量
    ['`/static/img/avatar-${c.line}.webp`', 1],
    ['`/static/img/avatar-${child.line}.webp`', 1],
    ['href="/static/icon-180.png"', 1],
    ['href="/static/icon-192.png"', 1],
    ["'/static/icon-180.png'", 2],
  ],
  'public/static/app.js': [
    ['/static/care-room.js', 1], // 任务 122：careRoomEnsure 动态 import，懒加载
    ['/static/engine-local.js', 1], // 对战修复批 #4：lcLoadEngine 动态 import，离线本地对战才加载
    ['`/static/img/p${p.no}.webp`', 2],
    ['`/static/img/p${hp.no}.webp`', 1],
    ['`/static/img/p${pet.no}.webp`', 1],
    ['<img src="/static/img/p${e.no}.webp">', 1],
    ['`/static/img/back-${no}.webp`', 1],
    ['`/static/img/avatar-back-${line}.webp`', 1],
    ["/static/img/types/${TYPE_EN[m.type] || 'normal'}.webp", 1], // 2026-11-06：对战选技能图标排复用同一锚点（伙伴招式列表＋对战选技能各 1 处）；2026-11-09 任务 72：SVG 换生成图 webp；2026-11-13 任务 106：两处渲染改走 moveIconSrc，属性图标模板只剩兜底里的 1 处
    ['/static/img/types/${en}.webp', 2], // 2026-11-09 任务 74：图鉴筛选 chips 复用同一锚点（typeChip 属性徽标＋筛选 chip 各 1 处）
    ['`/static/img/icons/${slug}.webp`', 1], // 2026-11-09 任务 72：道具图标（ITEM_ICON_SRC 模板）
  ],
};

function anchorPattern(anchor) {
  // 在锚点中的资源扩展名前插入可选旧 token。
  const marked = anchor.replace(/\.(js|css|png|webp|svg)(?=[`"'<>;,]|$)/g,
    (_, ext) => `\u0000${ext}\u0000`);
  const source = escapeRE(marked).replace(/\u0000(js|css|png|webp|svg)\u0000/g,
    (_, ext) => `(?:\\.[0-9a-f]{8})?\\.${ext}`);
  return new RegExp(source, 'g');
}

function rewrite(logical, text, h) {
  let count = 0;
  for (const [anchor, expected] of rules[logical]) {
    const re = anchorPattern(anchor);
    const matches = [...text.matchAll(re)];
    if (matches.length !== expected) {
      throw new Error(`${logical}: 锚点 ${anchor} 应出现 ${expected} 次，实际 ${matches.length}`);
    }
    text = text.replace(re, value => {
      count++;
      return strip(value).replace(/\.(js|css|png|webp|svg)(?=[`"'<>;,]|$)/g,
        (_, ext) => `${h ? `.${h}` : ''}.${ext}`);
    });
  }
  return { text, count };
}

function prepare() {
  const { bases, located } = discover();
  const sources = {};
  for (const logical of Object.keys(rules)) {
    const actual = logical === 'public/static/app.js'
      ? located['static/app.js'] : logical;
    sources[logical] = { actual, text: read(actual) };
  }
  const normalizedApp = rewrite(
    'public/static/app.js', sources['public/static/app.js'].text, '',
  ).text;
  const lines = bases.map(base => {
    const bytes = base === 'static/app.js'
      ? Buffer.from(normalizedApp, 'utf8')
      : readFileSync(abs(located[base]));
    return `${base}:${digest(bytes)}\n`;
  }).join('');
  const h = digest(Buffer.from(lines, 'utf8')).slice(0, 8);
  const files = Object.fromEntries(bases.map(base => [base, hashed(base, h)]));
  const changes = Object.fromEntries(Object.entries(sources).map(([logical, source]) => {
    const result = rewrite(logical, source.text, h);
    return [logical, { ...source, ...result }];
  }));
  const renames = bases.map(base => ({
    base: `public/${base}`,
    from: located[base],
    to: `public/${files[base]}`,
  }));
  return { h, files, changes, renames };
}

function verify() {
  const issues = [];
  let m;
  try { m = JSON.parse(read(manifestPath)); }
  catch (e) { issues.push(`manifest 无法读取：${e.message}`); }
  let plan;
  try { plan = prepare(); }
  catch (e) { issues.push(e.message); }
  if (m && plan) {
    if (m.hash !== plan.h) issues.push(`hash 不一致：manifest=${m.hash}, 计算=${plan.h}`);
    if (JSON.stringify(Object.entries(m.files || {}).sort())
        !== JSON.stringify(Object.entries(plan.files).sort())) {
      issues.push('manifest files 与计算映射不一致');
    }
    for (const [base, target] of Object.entries(plan.files)) {
      if (!existsSync(abs(`public/${target}`))) issues.push(`缺少 ${target}`);
      if (existsSync(abs(`public/${base}`))) issues.push(`残留基准文件 ${base}`);
    }
    for (const [logical, change] of Object.entries(plan.changes)) {
      // 重写到当前 H 必须完全无变化：同时检查旧 token 与基准名残留。
      if (change.text !== read(change.actual)) {
        issues.push(`${logical}: 指定引用存在基准名或错误 token`);
      }
      // 静态字面量引用必须存在；动态模板引用（${} 拼接）由锚点计数 + 上面的文本相等校验覆盖。
      const refs = change.text.matchAll(
        /\/static\/[A-Za-z0-9_./-]+\.(?:js|css|png|webp|svg)\b/g,
      );
      for (const match of refs) {
        const rel = match[0].slice(1);
        if (Object.hasOwn(plan.files, strip(rel))
            && !existsSync(abs(`public/${rel}`))) {
          issues.push(`${logical}: 引用不存在 ${match[0]}`);
        }
      }
    }
  }
  if (issues.length) {
    console.error('VERIFY FAILED\n' + [...new Set(issues)].map(s => `- ${s}`).join('\n'));
    return false;
  }
  console.log('VERIFY OK');
  return true;
}

function stamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-`
    + `${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function revert() {
  const work = abs('work');
  const dirs = existsSync(work)
    ? readdirSync(work).filter(n => /^hash-backup-\d{8}-\d{4}$/.test(n)).sort()
    : [];
  if (!dirs.length) throw new Error('没有 hash 备份');
  const backup = `work/${dirs.at(-1)}`;
  const metadata = JSON.parse(read(`${backup}/renames.json`));
  // 先检查，避免恢复到一半才发现缺失。
  for (const entry of metadata.renames) {
    if (!existsSync(abs(entry.to)) && !existsSync(abs(entry.base))) {
      throw new Error(`无法恢复：${entry.to}`);
    }
  }
  for (const file of metadata.references) {
    if (!existsSync(abs(`${backup}/${file.logical}`))) {
      throw new Error(`备份缺失：${file.logical}`);
    }
  }
  for (const entry of metadata.renames) {
    if (entry.to !== entry.base && existsSync(abs(entry.to))) {
      if (existsSync(abs(entry.base))) throw new Error(`目标已存在：${entry.base}`);
      renameSync(abs(entry.to), abs(entry.base));
    }
  }
  for (const file of metadata.references) {
    copyFileSync(abs(`${backup}/${file.logical}`), abs(file.logical));
  }
  // 恢复基准名后，hash manifest 不再有效；保留旧 manifest 于备份供人工核对。
  if (existsSync(abs(manifestPath))) unlinkSync(abs(manifestPath));
  console.log(`已恢复基准文件名与备份引用：${backup}`);
  console.log('须重新部署才生效（或 wrangler rollback）');
}

try {
  if (mode === '--revert') {
    revert();
  } else if (mode === '--verify') {
    if (!verify()) process.exitCode = 1;
  } else {
    const plan = prepare();
    const renames = plan.renames.filter(e => e.from !== e.to);
    const prefix = mode === '--dry-run' ? '[DRY RUN] ' : '';
    console.log(`${prefix}H=${plan.h}`);
    console.log(`${prefix}重命名文件数=${renames.length}`);
    for (const e of renames) console.log(`${prefix}${e.from} -> ${e.to}`);
    for (const [logical, change] of Object.entries(plan.changes)) {
      console.log(`${prefix}${logical}: 改写处数=${change.count}`
        + (change.text === read(change.actual) ? '（内容无变化）' : ''));
    }
    console.log(`${prefix}manifest=${manifestPath}`);
    if (mode !== '--dry-run') {
      const backup = `work/hash-backup-${stamp()}`;
      if (existsSync(abs(backup))) {
        throw new Error(`本分钟已有备份 ${backup}；请下一分钟重跑，禁止覆盖备份`);
      }
      mkdirSync(abs(backup), { recursive: true });
      const references = Object.keys(plan.changes).map(logical => ({ logical }));
      for (const [logical, change] of Object.entries(plan.changes)) {
        mkdirSync(dirname(abs(`${backup}/${logical}`)), { recursive: true });
        copyFileSync(abs(change.actual), abs(`${backup}/${logical}`));
      }
      if (existsSync(abs(manifestPath))) {
        mkdirSync(dirname(abs(`${backup}/${manifestPath}`)), { recursive: true });
        copyFileSync(abs(manifestPath), abs(`${backup}/${manifestPath}`));
      }
      writeFileSync(abs(`${backup}/renames.json`), JSON.stringify({
        renames: plan.renames, references,
      }, null, 2) + '\n');
      for (const e of renames) renameSync(abs(e.from), abs(e.to));
      for (const [logical, change] of Object.entries(plan.changes)) {
        const target = logical === 'public/static/app.js'
          ? `public/${plan.files['static/app.js']}` : logical;
        // 写入指定锚点改写结果，不改变其他文本。
        writeFileSync(abs(target), change.text);
      }
      writeFileSync(abs(manifestPath), JSON.stringify({
        hash: plan.h, files: plan.files,
      }, null, 2) + '\n');
      if (!verify()) process.exitCode = 1;
    }
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
