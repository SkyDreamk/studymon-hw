const { getBackpack } = require('../../utils/api');

const BASE_URL = 'https://example.com';

function resolveChildId() {
  const app = getApp();
  if (app && app.globalData) {
    if (app.globalData.childId) return app.globalData.childId;
    if (app.globalData.child && app.globalData.child.id) return app.globalData.child.id;
  }
  const storedChild = wx.getStorageSync('child');
  if (storedChild && storedChild.id) return storedChild.id;
  return wx.getStorageSync('childId');
}

function resolveImgUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return BASE_URL + (url.charAt(0) === '/' ? url : '/' + url);
}

function getEggPatternGroup(pat) {
  if (pat === 'spots') return 'spots';
  if (pat === 'stripes' || pat === 'waves') return 'stripes';
  if (pat === 'drops' || pat === 'bubbles') return 'drops';
  if (pat === 'flame' || pat === 'bolt') return 'flame';
  if (pat === 'ring' || pat === 'shell' || pat === 'curl' || pat === 'belly') return 'ring';
  return '';
}

function formatSource(source) {
  if (source === 'main') return '主宠';
  if (source === 'egg') return '从蛋里孵出来';
  return source || '';
}

Page({
  data: {
    loading: false,
    loaded: false,
    error: '',
    balls: {
      normal: 0,
      super: 0,
      hyper: 0,
      master: 0
    },
    inventory: [],
    fairyMovesText: '',
    eggs: [],
    instances: []
  },

  onShow() {
    this.loadBackpack();
  },

  onRetry() {
    if (this.data.loading) return;
    this.loadBackpack();
  },

  loadBackpack() {
    const childId = resolveChildId();
    if (!childId) {
      this.setData({
        loading: false,
        error: '未找到当前孩子信息，请重新登录后重试'
      });
      return;
    }

    this.setData({
      loading: true,
      error: ''
    });

    getBackpack(childId)
      .then((res) => {
        if (!res || res.ok === false) {
          this.setData({
            loading: false,
            error: (res && (res.error || res.message)) || '加载背包失败，请稍后重试'
          });
          return;
        }

        const rawBalls = res.balls || {};
        const balls = {
          normal: Number(rawBalls.normal || 0),
          super: Number(rawBalls.super || 0),
          hyper: Number(rawBalls.hyper || 0),
          master: Number(rawBalls.master || 0)
        };

        const inventory = (Array.isArray(res.inventory) ? res.inventory : []).map((item) => ({
          key: item.key || '',
          emoji: item.emoji || '🎁',
          name: item.name || item.key || '',
          qty: item.qty != null ? item.qty : 0,
          desc: item.desc || ''
        }));

        const fairyMoves = Array.isArray(res.fairyMoves) ? res.fairyMoves : [];
        const fairyMovesText = fairyMoves
          .map((m) => (m && m.name ? m.name : ''))
          .filter(Boolean)
          .join('、');

        const eggs = (Array.isArray(res.eggs) ? res.eggs : []).map((item) => {
          const eggDesign = item && item.egg && typeof item.egg === 'object' ? item.egg : null;
          const bg = (eggDesign && eggDesign.bg) || '#fef3c7';
          const c1 = (eggDesign && eggDesign.c1) || '#f59e0b';
          const c2 = (eggDesign && eggDesign.c2) || c1;
          const pat = (eggDesign && eggDesign.pat) || '';
          const daysLeft = Number(item.daysLeft || 0);
          return {
            speciesName: item.speciesName || '',
            isReward: item.kind === 'reward',
            daysLeft,
            statusText: daysLeft > 0 ? '还有 ' + daysLeft + ' 天孵化' : '今天就能孵化啦',
            bg,
            c1,
            c2,
            patGroup: getEggPatternGroup(pat)
          };
        });

        const instances = (Array.isArray(res.instances) ? res.instances : []).map((inst) => ({
          name: inst.name || '',
          imgUrl: resolveImgUrl(inst.img),
          current: !!inst.current,
          sourceText: formatSource(inst.source)
        }));

        this.setData({
          loading: false,
          loaded: true,
          error: '',
          balls,
          inventory,
          fairyMovesText,
          eggs,
          instances
        });
      })
      .catch((err) => {
        this.setData({
          loading: false,
          error: (err && (err.message || err.errMsg)) || '加载背包失败，请检查网络后重试'
        });
      });
  }
});
