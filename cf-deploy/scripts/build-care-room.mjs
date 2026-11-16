#!/usr/bin/env node
// 养成小房间：把 work/care-room-v3/care-room.js + pixi.js 打成同域懒加载 bundle。
// 用法（在 cf-deploy/ 下）：node scripts/build-care-room.mjs
// 产物：public/static/care-room.js（未 hash；hash-assets.mjs 会把它和 app.js/style.css 用同一 hash 重命名）。
// 重新打包前先删掉旧的 care-room.*.js，保证 hash-assets 的 discover() 只找到一个文件。
import { build } from 'esbuild';
import { readdirSync, unlinkSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (resolve(process.cwd()) !== root) {
  throw new Error('请在 cf-deploy/ 下运行');
}

const outDir = resolve(root, 'public/static');
for (const name of readdirSync(outDir)) {
  if (/^care-room(\.[0-9a-f]{8})?\.js$/.test(name)) {
    unlinkSync(resolve(outDir, name));
    console.log(`删除旧产物 ${name}`);
  }
}

const result = await build({
  entryPoints: [resolve(root, '../work/care-room-v3/care-room.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  minify: true,
  sourcemap: false,
  // 入口在 ../work/ 下，裸导入 pixi.js 须指到 cf-deploy/node_modules 解析
  nodePaths: [resolve(root, 'node_modules')],
  outfile: resolve(outDir, 'care-room.js'),
  logLevel: 'info',
});

const bytes = statSync(resolve(outDir, 'care-room.js')).size;
console.log(`care-room.js 已生成：${bytes} 字节（${(bytes / 1024).toFixed(1)} KB），gzip 约 ${(bytes * 0.29 / 1024).toFixed(1)} KB（估算）`);
if (result.errors.length) {
  console.error(result.errors);
  process.exit(1);
}
