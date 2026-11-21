// 2026-11-16 用户管理跟进：新档案随机发蛋、选线器撤掉、打卡设置移到学习进度
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readBackendSource } from './backend-src.mjs';

const src = readBackendSource();
const app = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const fn = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start) + 1));

describe('新建孩子档案：随机四选一＋封印蛋', () => {
  // 选线和发蛋已抽成共用 helper（pickStarterLine / giveStarterEgg，邀请码新码注册也用），一并检查
  const block = (fn(src, 'const STARTER_LINES', 'async function apiAuthRegister') + fn(src, 'async function apiParentAccountCreate', 'async function apiParentAccountResetPin')).replace(/\/\/.*$/gm, ''); // 只看代码，不看注释
  test('忽略客户端 line，四条线 getRandomValues % 4，不含伊布', () => {
    assert.ok(!/body\.line/.test(block));
    assert.match(block, /\['pikachu', 'charmander', 'squirtle', 'bulbasaur'\]/);
    assert.match(block, /crypto\.getRandomValues\(new Uint8Array\(1\)\)\[0\] % 4/);
    assert.ok(!/eevee/.test(block));
  });
  test('发一颗 7 天后解封的封印蛋、走 touchRow/bumpChildVersion、不建 pet_instances', () => {
    assert.match(block, /INSERT INTO sealed_eggs\(child_id, awarded_date, unlock_date, species\)/);
    assert.match(block, /addDays\(today, 7\)/);
    assert.match(block, /LINES\[line\]\.forms\[0\]\.no/);
    assert.match(block, /bumpChildVersion/);
    assert.match(block, /touchRow\(db, 'sealed_eggs'/);
    assert.ok(!/pet_instances/.test(block));
  });
  test('绑定已有孩子分支不发蛋（蛋只在新建分支里）', () => {
    const bindBranch = block.slice(block.indexOf('if (childId) {'), block.indexOf('} else {', block.indexOf('if (childId) {')));
    assert.ok(!/sealed_eggs/.test(bindBranch));
  });
});

describe('前端：用户管理页', () => {
  const um = fn(app, 'function parentCheckinSettingsHtml', 'function gradeNumFromGradeLabel');
  const mgmt = fn(app, 'async function parentCreateAccountHtml', 'async function parentAccountsListHtml');
  test('没有选线器；打卡设置与学习进度已并入，保存只发当前页区块', () => {
    for (const k of ['linegrid', 'switchLine']) assert.ok(!um.includes(k), k);
    for (const k of ['subjectxp', 'basexp', 'quizxp', 'quizrepeat', 'cutoff', '范围：']) assert.ok(um.includes(k), k);
    assert.ok(!mgmt.includes('ac-line'));
    assert.ok(mgmt.includes('ac-grade') && mgmt.includes('ac-bind') && mgmt.includes('ac-av'));
    const save = fn(app, 'window.saveSettings = async', 'window.saveSecurity');
    assert.match(save, /api\('\/api\/parent\/settings\/update', body\)/);
    assert.match(save, /if \(!nmEl\) continue;/);
  });
});

describe('前端：邀请码页只有生成按钮', () => {
  const inv = fn(app, 'async function parentInvitesHtml', 'async function parentAccountMgmtHtml');
  test('没有宠物线选择和年级输入，列表行只有码、状态、到期', () => {
    for (const k of ['iv-line', 'iv-grade', 'lineOpts', 'esc(i.line)', 'esc(i.grade)']) assert.ok(!inv.includes(k), k);
    assert.ok(inv.includes('生成邀请码'));
    const create = fn(app, 'async function inviteCreate', 'window.acctCreate');
    assert.ok(!/iv-line|iv-grade/.test(create));
  });
});
