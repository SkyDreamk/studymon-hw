const api = require('../../utils/api');

const BASE_URL = 'https://example.com';

function resolveImg(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.indexOf('//') === 0) return 'https:' + url;
  return BASE_URL + (url.indexOf('/') === 0 ? url : '/' + url);
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
  if (!err) return '加载失败，请重试';
  if (typeof err === 'string') return err;
  return err.error || err.message || err.errMsg || '加载失败，请重试';
}

function stateLabel(state) {
  if (state === 'cleared') return '已通关';
  if (state === 'open') return '可挑战';
  return '未解锁';
}

Page({
  data: {
    loading: false,
    errorMsg: '',
    status: null,
    badges: [],
    stages: [],
  },

  onShow() {
    this.loadStatus();
  },

  onRetry() {
    this.loadStatus();
  },

  loadStatus() {
    const childId = resolveChildId();
    if (!childId) {
      this.setData({
        loading: false,
        errorMsg: '未找到孩子信息，请先登录',
        status: null,
      });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });

    api.getGymStatus({ childId }).then(
      (res) => {
        if (!res || res.ok === false) {
          this.setData({
            loading: false,
            errorMsg: extractErrorMsg(res),
          });
          return;
        }
        const stages = (res.stages || []).map((s) => ({
          stage: s.stage,
          gymName: s.gymName,
          badge: s.badge,
          type: s.type,
          bossNo: s.bossNo,
          bossName: s.bossName,
          bossImgUrl: resolveImg(s.bossImg),
          bossLevel: s.bossLevel,
          bossTypeText:
            s.bossTypes && s.bossTypes.length
              ? s.bossTypes.join(' / ')
              : s.type || '',
          needLevel: s.needLevel,
          eggSpecies: s.eggSpecies,
          eggName: s.eggName,
          cleared: !!s.cleared,
          unlocked: !!s.unlocked,
          state: s.state,
          stateText: stateLabel(s.state),
        }));

        this.setData({
          loading: false,
          errorMsg: '',
          status: res,
          badges: res.badges || [],
          stages,
        });
      },
      (err) => {
        this.setData({
          loading: false,
          errorMsg: extractErrorMsg(err),
        });
      }
    );
  },

  onChallengeTap(e) {
    const stage = e.currentTarget.dataset.stage;
    if (!stage) return;
    if (!this.data.status || !this.data.status.canChallenge) {
      wx.showToast({
        title: (this.data.status && this.data.status.reason) || '现在还不能挑战',
        icon: 'none',
        duration: 2000,
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/battle/battle?stage=' + stage,
    });
  },
});
