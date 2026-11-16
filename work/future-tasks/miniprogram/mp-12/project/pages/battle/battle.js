const api = require('../../utils/api');

const BASE_URL = 'https://example.com';

function resolveImg(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.indexOf('//') === 0) return 'https:' + url;
  return BASE_URL + (url.indexOf('/') === 0 ? url : '/' + url);
}

/* 电系招式专属图标（与网站 MOVE_ICONS 同名映射，2026-11-14 MP-11 同步）；无专属图时不显示图标 */
const MOVE_ICONS = { '伏特攻击': 'icon-volt-tackle', '打雷': 'icon-thunder', '十万伏特': 'icon-thunderbolt', '电球': 'icon-electro-ball' };
function withMoveIcon(moves) {
  return (moves || []).map(function (m) {
    const f = MOVE_ICONS[m.name];
    return f ? Object.assign({}, m, { icon: '/images/' + f + '.webp' }) : m;
  });
}

function resolveChildId() {
  const app = getApp();
  const gd = (app && app.globalData) || {};
  if (gd.childId) return gd.childId;
  if (gd.child && gd.child.id) return gd.child.id;
  const storedChild = wx.getStorageSync('child');
  if (storedChild && storedChild.id) return storedChild.id;
  const storedId = wx.getStorageSync('childId');
  if (storedId) return storedId;
  return null;
}

function extractErrorMsg(err) {
  if (!err) return '操作失败，请重试';
  if (typeof err === 'string') return err;
  return err.error || err.message || err.errMsg || '操作失败，请重试';
}

function isStateChangedError(err) {
  if (!err) return false;
  const status = err.status || err.statusCode;
  if (status === 409) return true;
  const msg = extractErrorMsg(err);
  return msg === 'STATE_CHANGED' || msg.indexOf('STATE_CHANGED') !== -1;
}

function calcHpPct(hp, maxHp) {
  if (!maxHp || maxHp <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((hp * 100) / maxHp)));
}

function formatPet(pet, idx) {
  if (!pet) return null;
  return {
    idx,
    key: pet.key,
    name: pet.name,
    type: pet.type,
    no: pet.no,
    imgUrl: resolveImg(pet.img),
    level: pet.level,
    hp: pet.hp,
    maxHp: pet.maxHp,
    hpPct: calcHpPct(pet.hp, pet.maxHp),
    active: !!pet.active,
    fainted: !!pet.fainted,
    moves: pet.moves || [],
  };
}

function formatWeather(weather) {
  if (!weather) return '';
  if (weather === 'sand') return '沙暴';
  if (weather === 'sun') return '晴天';
  return weather;
}

Page({
  data: {
    loading: true,
    startError: '',
    actionError: '',
    busy: false,
    battle: null,
    rewards: null,
    weatherLabel: '',
    bossPet: null,
    playerPet: null,
    benchPets: [],
    moves: [],
    usableItems: [],
    logLines: [],
  },

  onLoad(options) {
    const stage = Number(options && options.stage);
    if (!stage) {
      this.setData({
        loading: false,
        startError: '缺少关卡参数',
      });
      return;
    }
    this.startBattle(stage);
  },

  startBattle(stage) {
    const childId = resolveChildId();
    if (!childId) {
      this.setData({
        loading: false,
        startError: '未找到孩子信息，请先登录',
      });
      return;
    }

    this.setData({ loading: true, startError: '', actionError: '' });

    api.startGymBattle({ childId, stage }).then(
      (res) => {
        if (!res || res.ok === false || !res.battle) {
          this.setData({
            loading: false,
            startError: extractErrorMsg(res),
          });
          return;
        }
        this.applyBattle(res.battle, null);
        this.setData({ loading: false });
      },
      (err) => {
        this.setData({
          loading: false,
          startError: extractErrorMsg(err),
        });
      }
    );
  },

  applyBattle(battle, rewards) {
    const sideB = (battle.sides && battle.sides.B) || {};
    const sideBPets = sideB.pets || [];
    const bossIdx =
      typeof sideB.activeIdx === 'number' ? sideB.activeIdx : 0;
    const bossPet = formatPet(sideBPets[bossIdx] || sideBPets[0], bossIdx);

    const sideA = (battle.sides && battle.sides.A) || {};
    const sideAPets = sideA.pets || [];
    let activeIdx =
      typeof sideA.activeIdx === 'number'
        ? sideA.activeIdx
        : sideAPets.findIndex((p) => p.active);
    if (activeIdx < 0) activeIdx = 0;

    const playerPet = formatPet(sideAPets[activeIdx], activeIdx);

    const benchPets = [];
    for (let i = 0; i < sideAPets.length; i += 1) {
      if (i !== activeIdx) {
        benchPets.push(formatPet(sideAPets[i], i));
      }
    }

    const faintedIdx = sideAPets.findIndex((p) => p.fainted);
    const gymItems = (battle.gymItems && battle.gymItems.items) || [];
    const usableItems = [];
    for (let i = 0; i < gymItems.length; i += 1) {
      const it = gymItems[i];
      if (it.qty > 0 && it.used < it.cap) {
        if (it.kind === 'revive') {
          if (faintedIdx >= 0) {
            usableItems.push({
              key: it.key,
              name: it.name,
              emoji: it.emoji || '',
              kind: it.kind,
              qty: it.qty,
              used: it.used,
              cap: it.cap,
              targetIdx: faintedIdx,
            });
          }
        } else {
          usableItems.push({
            key: it.key,
            name: it.name,
            emoji: it.emoji || '',
            kind: it.kind,
            qty: it.qty,
            used: it.used,
            cap: it.cap,
            targetIdx: activeIdx,
          });
        }
      }
    }

    const logLines = (battle.log || []).slice(-6);

    this.setData({
      battle,
      rewards: rewards || this.data.rewards,
      weatherLabel: formatWeather(battle.weather),
      bossPet,
      playerPet,
      benchPets,
      moves: withMoveIcon(playerPet && playerPet.moves),
      usableItems,
      logLines,
    });
  },

  reloadBattleState() {
    const battleId = this.data.battle && this.data.battle.battleId;
    if (!battleId) {
      this.setData({ busy: false });
      return;
    }
    api.getBattleState({ battleId }).then(
      (res) => {
        if (res && res.ok !== false && res.battle) {
          this.applyBattle(res.battle, null);
          this.setData({ busy: false, actionError: '' });
        } else {
          this.setData({
            busy: false,
            actionError: extractErrorMsg(res),
          });
        }
      },
      (err) => {
        this.setData({
          busy: false,
          actionError: extractErrorMsg(err),
        });
      }
    );
  },

  sendMoveRequest(payload) {
    if (this.data.busy || !this.data.battle || this.data.battle.status !== 'active') {
      return;
    }
    this.setData({ busy: true, actionError: '' });

    api.battleMove(payload).then(
      (res) => {
        if (!res || res.ok === false || !res.battle) {
          if (isStateChangedError(res)) {
            this.reloadBattleState();
            return;
          }
          this.setData({
            busy: false,
            actionError: extractErrorMsg(res),
          });
          return;
        }
        this.applyBattle(res.battle, res.rewards || null);
        this.setData({ busy: false });
      },
      (err) => {
        if (isStateChangedError(err)) {
          this.reloadBattleState();
          return;
        }
        this.setData({
          busy: false,
          actionError: extractErrorMsg(err),
        });
      }
    );
  },

  onMoveTap(e) {
    const moveName = e.currentTarget.dataset.move;
    if (!moveName || !this.data.battle) return;
    this.sendMoveRequest({
      battleId: this.data.battle.battleId,
      moveName,
    });
  },

  onSwapTap(e) {
    const swapToIdx = Number(e.currentTarget.dataset.idx);
    if (isNaN(swapToIdx) || !this.data.battle) return;
    this.sendMoveRequest({
      battleId: this.data.battle.battleId,
      swapToIdx,
    });
  },

  onItemTap(e) {
    const itemKey = e.currentTarget.dataset.key;
    const targetIdx = Number(e.currentTarget.dataset.target);
    if (!itemKey || isNaN(targetIdx) || !this.data.battle) return;
    this.sendMoveRequest({
      battleId: this.data.battle.battleId,
      itemKey,
      targetIdx,
    });
  },

  onAbandonTap() {
    if (this.data.busy || !this.data.battle || this.data.battle.status !== 'active') {
      return;
    }
    this.setData({ busy: true, actionError: '' });

    api.abandonBattle({ battleId: this.data.battle.battleId }).then(
      (res) => {
        if (res && res.ok === false) {
          this.setData({
            busy: false,
            actionError: extractErrorMsg(res),
          });
          return;
        }
        this.setData({ busy: false });
        wx.switchTab({ url: '/pages/gym/gym' });
      },
      (err) => {
        this.setData({
          busy: false,
          actionError: extractErrorMsg(err),
        });
      }
    );
  },

  onBackToGym() {
    wx.switchTab({ url: '/pages/gym/gym' });
  },
});
