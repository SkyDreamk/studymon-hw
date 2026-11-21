// 后端源码全文（模块化后端：src/index.js + src/lib/*.js + src/routes/*.js 拼接）。
// 仅供“源码口径”类测试读取，避免它们因函数搬出 src/index.js 而断言落空。
// 拼接时去掉拆分新增的“纯接线行”（跨文件 import / 文件尾 export 名单 / register 调用），
// 让按行/按次数统计的源码守卫仍只数到原来的代码本身。
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../src/', import.meta.url);
const WIRING = [
  /^import \{[^}]*\} from '\.{1,2}\/(lib|routes)\/[\w-]+\.js';$/,
  /^import \{[^}]*\} from '\.\.\/data\/[\w-]+\.js';$/,
  /^import \{ register as register_\w+ \} from '\.\/routes\/[\w-]+\.js';$/,
  /^register_\w+\(route\);$/,
];
const stripWiring = (text, { isIndex }) => text.split('\n').filter((line) => {
  if (!isIndex && /^export \{[^}]*\};$/.test(line)) return false;
  return !WIRING.some((re) => re.test(line));
}).join('\n');

export function readBackendSource() {
  let out = stripWiring(readFileSync(new URL('index.js', root), 'utf8'), { isIndex: true });
  for (const dir of ['lib/', 'routes/']) {
    const d = new URL(dir, root);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((n) => n.endsWith('.js')).sort()) {
      out += '\n' + stripWiring(readFileSync(new URL(dir + f, root), 'utf8'), { isIndex: false });
    }
  }
  return out;
}
