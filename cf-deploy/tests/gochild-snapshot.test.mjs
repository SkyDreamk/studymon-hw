/* 快照完整性校验＋伙伴页防御性读取单测：
 *  node --test tests/gochild-snapshot.test.mjs
 * 读取 assetPath('app.js') 指向的 hash 部署文件，做源码级断言：
 * ① lcSnapshot 拒绝缺 form／sealedEggs／moves 的快照；
 * ② goChild 含只读本地兜底量；
 * ③ goChild 内无指定字段的裸读；
 * ④ 全文件无旧 const form 声明。
 * 真实 Azure 调用 0 次。 */
import { assetPath, assetHash } from './asset-path.mjs';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = () => readFileSync(assetPath('app.js'), 'utf8');

// app.js 的顶层函数以无缩进的 } 结束，函数内部块均有缩进。
// 只截取目标函数体，避免将其他函数的校验或读取计入断言。
function functionBody(source, name) {
  const header = new RegExp(
    '^(?:async\\s+)?function\\s+' + name + '\\b[^\\n]*\\{[ \\t]*\\r?\\n',
    'm'
  );
  const match = header.exec(source);
  assert.ok(match, `缺 ${name} 函数声明`);
  const rest = source.slice(match.index + match[0].length);
  const end = rest.search(/^\}/m);
  assert.ok(end >= 0, `缺 ${name} 函数结束标记`);
  return rest.slice(0, end);
}

describe('快照完整性校验＋伙伴页防御性读取', () => {
  test('lcSnapshot 在函数体内校验完整孩子对象并返回 null', () => {
    const body = functionBody(app(), 'lcSnapshot');
    assert.match(
      body,
      /if\s*\(\s*!snap\.child\.form\s*\|\|\s*!Array\.isArray\(snap\.child\.sealedEggs\)\s*\|\|\s*!Array\.isArray\(snap\.child\.moves\)\s*\)\s*return null;/,
      '缺 form／sealedEggs／moves 完整性校验及 return null'
    );
  });

  test('goChild 在函数体内声明本地兜底量', () => {
    const body = functionBody(app(), 'goChild');
    for (const declaration of [
      'const form = k.form ||',
      'const sealedEggs = Array.isArray(k.sealedEggs)',
      'const moves = Array.isArray(k.moves)',
      'const quiz = k.quiz ||',
      'const titles = Array.isArray(k.titles)',
      'const stickers = Array.isArray(k.stickers)'
    ]) {
      assert.ok(body.includes(declaration), `缺 ${declaration}`);
    }
  });

  test('goChild 函数体内无指定字段的裸读', () => {
    const body = functionBody(app(), 'goChild');
    for (const access of [
      'k.sealedEggs.length',
      'k.moves.length',
      'k.quiz.fragments',
      'k.titles.length'
    ]) {
      assert.strictEqual(
        body.split(access).length - 1,
        0,
        `goChild 内仍有裸读 ${access}`
      );
    }
  });

  test('全文件无旧 const form 声明，避免重复声明', () => {
    const source = app();
    assert.strictEqual(
      source.split('const form = k.form;').length - 1,
      0,
      '仍有旧 const form = k.form; 声明'
    );
  });

  test('goChild 兜底量只认数组（旧快照 JSON 文本不进 .map）', () => {
    const body = functionBody(app(), 'goChild');
    for (const declaration of [
      'Array.isArray(k.sealedEggs)',
      'Array.isArray(k.moves)',
      'Array.isArray(k.titles)',
      'Array.isArray(k.stickers)'
    ]) {
      assert.ok(body.includes(declaration), `缺 ${declaration}`);
    }
  });

  // 2026-11-13 与小程序同步：伙伴页导航网格里周末道馆按钮换成英语交流
  // （点进 openOakEnglish）；道馆只留底部导航栏入口，首页不再重复放。
  // 2026-11-13 任务 106：💬 换成首页图标 home-oak-english.webp。
  test('伙伴页导航网格：英语交流在位、周末道馆按钮已撤', () => {
    const body = functionBody(app(), 'goChild');
    assert.match(
      body,
      /navBtns\.push\(`<button class="bigbtn blue" onclick="openOakEnglish\(\$\{k\.id\}\)"><span class="btn-plate pl-52"><img class="btn-ic" src="\/static\/img\/home\/home-oak-english\.webp" alt=""><\/span><span class="btn-tx">\$\{bi\('英语交流', 'English Chat'\)\}<\/span><\/button>`\)/,
      '缺首页英语交流按钮（图标，openOakEnglish）'
    );
    assert.doesNotMatch(body, /navBtns\.push\([^)]*goGym/, '首页导航网格里仍有周末道馆按钮');
  });

  test('道馆入口仍在底部导航栏（tabbar）', () => {
    const body = functionBody(app(), 'tabbar');
    assert.match(body, /on\(\['gym'\]\)/, 'tabbar 缺 gym 高亮');
    assert.match(body, /onclick="goGym\(\$\{id\}\)"/, 'tabbar 缺 goGym 入口');
  });

  // 2026-11-13：封印蛋模块已是珍稀卡牌馆＋蛋行，旧名「封印蛋」不符现状，
  // 首页按钮与收藏馆页标题、道馆页入口一律改叫收藏馆（Collection Hall）；
  // 蛋行、孵化庆祝等描述真实蛋的文案不动。
  test('收藏馆改名：首页按钮与页标题都是收藏馆', () => {
    const body = functionBody(app(), 'goChild');
    assert.match(body, /childSlice2Eggs: \['收藏馆', 'Collection Hall'\]/, '首页按钮仍叫封印蛋');
    assert.doesNotMatch(body, /childSlice2Eggs: \['封印蛋', 'Sealed eggs'\]/, '首页按钮旧名未清');
    const eggsBody = functionBody(app(), 'goEggs');
    assert.match(eggsBody, /eggSlice1Title: \['收藏馆', 'Collection Hall'\]/, '收藏馆页标题仍叫封印蛋');
  });
});

// 任务 91：快照资源 hash 校验——旧 hash 快照作废、走网络重拉，防图鉴空白。
// hash-assets 轮换后旧 hash 图片文件下线；快照（__full__ 行）存的旧 img URL
// 会 404，图鉴先读快照渲染就空白。lcSnapshot 须比对快照 img hash 与当前
// app.<hash>.js，不一致作废快照。
function fullFunction(source, name) {
  const header = new RegExp(
    '^(?:async\\s+)?function\\s+' + name + '\\b[^\\n]*\\{[ \\t]*\\r?\\n',
    'm'
  );
  const match = header.exec(source);
  assert.ok(match, `缺 ${name} 函数声明`);
  const rest = source.slice(match.index + match[0].length);
  const end = rest.search(/^\}/m);
  assert.ok(end >= 0, `缺 ${name} 函数结束标记`);
  return source.slice(match.index, match.index + match[0].length + end + 1);
}

describe('快照资源 hash 校验（任务 91）', () => {
  test('lcSnapshot 在函数体内做 hash 校验、旧 hash 作废', () => {
    const body = functionBody(app(), 'lcSnapshot');
    assert.ok(
      body.includes('if (!lcSnapshotHashOk(full, snap.child)) return null;'),
      'lcSnapshot 缺 hash 校验及 return null'
    );
  });

  test('lcSnapshotHashOk：旧 hash 判废、新 hash 保留、取不到 hash 不断言', async () => {
    const { createContext, runInContext } = await import('node:vm');
    const source = app();
    const helpers = fullFunction(source, 'lcCurrentAssetHash') + '\n' + fullFunction(source, 'lcSnapshotHashOk');
    const cur = assetHash();
    assert.ok(cur && /^[0-9a-f]{8}$/.test(cur), 'manifest 里应有当前 hash');
    const stale = cur === 'e94b474e' ? 'aaaaaaaa' : 'e94b474e';
    const run = (scriptSrc, full, child) => {
      const ctx = {
        window: {},
        document: { getElementsByTagName: () => (scriptSrc ? [{ src: scriptSrc }] : []) },
      };
      ctx.window = ctx;
      createContext(ctx);
      runInContext(helpers, ctx);
      return runInContext(
        `lcSnapshotHashOk(${JSON.stringify(full)}, ${JSON.stringify(child)})`,
        ctx
      );
    };
    const staleFull = { wild: [{ no: 16, img: `/static/img/p16.${stale}.webp` }] };
    const freshFull = { wild: [{ no: 16, img: `/static/img/p16.${cur}.webp` }] };
    // 旧 hash 快照 → 作废（false）
    assert.strictEqual(run(`/static/app.${cur}.js`, staleFull, null), false);
    // 新 hash 快照 → 保留（true）
    assert.strictEqual(run(`/static/app.${cur}.js`, freshFull, null), true);
    // 取不到当前 hash（无 app 脚本标签）→ 不断言，保留（true）
    assert.strictEqual(run('', staleFull, null), true);
    // 快照里没有任何带 hash 的 img → 保留（true）
    assert.strictEqual(run(`/static/app.${cur}.js`, { wild: [{ no: 16, img: null }] }, null), true);
    // 孩子 form img 旧 hash 同样判废
    assert.strictEqual(
      run(`/static/app.${cur}.js`, { wild: [] }, { form: { img: `/static/img/p25.${stale}.webp` } }),
      false
    );
  });
});
