const {
  getDailyChinese,
  checkinDailyChinese,
  assessDailyChinese
} = require('../../utils/api');

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

function calcStars(score) {
  const n = Number(score) || 0;
  if (n >= 85) return 5;
  if (n >= 75) return 4;
  if (n >= 60) return 3;
  if (n >= 40) return 2;
  return 1;
}

function starsText(stars) {
  const count = Math.max(1, Math.min(5, Number(stars) || 1));
  return '★'.repeat(count);
}

function mapAssessError(errCode) {
  if (errCode === 'not_recognized') return '没听清，请再读一次';
  if (errCode === 'timeout') return '评分超时，请重试';
  if (errCode === 'not_configured') return '评分服务未配置';
  return String(errCode || '评分失败，请重试');
}

function mapKindLabel(kind) {
  if (kind === 'poem') return '古诗';
  if (kind === 'text') return '课文';
  return '';
}

Page({
  data: {
    loading: true,
    loadError: '',
    date: '',
    item: {},
    kindLabel: '',
    completed: false,
    hasScore: false,
    best: 0,
    attempts: 0,
    passed: false,
    starsStr: '',
    lastPron: null,
    recording: false,
    assessing: false,
    checkingIn: false
  },

  onLoad() {
    this._unloaded = false;
    this.audioCtx = null;
    this.recorderManager = wx.getRecorderManager();
    this.initRecorder();
    this.loadData(true);
  },

  onHide() {
    this.stopAudio();
    if (this.data.recording && this.recorderManager) {
      try {
        this.recorderManager.stop();
      } catch (e) {
        // ignore
      }
    }
  },

  onUnload() {
    this._unloaded = true;
    this.stopAudio();
    if (this.data.recording && this.recorderManager) {
      try {
        this.recorderManager.stop();
      } catch (e) {
        // ignore
      }
    }
    this.recorderManager = null;
  },

  stopAudio() {
    if (this.audioCtx) {
      try {
        this.audioCtx.stop();
        this.audioCtx.destroy();
      } catch (e) {
        // ignore
      }
      this.audioCtx = null;
    }
  },

  initRecorder() {
    const rm = this.recorderManager;
    if (!rm) return;

    rm.onStop((res) => {
      if (this._unloaded) return;
      this.setData({ recording: false });
      const filePath = res && res.tempFilePath;
      if (!filePath) return;

      const childId = resolveChildId();
      const refText = (this.data.item && this.data.item.text) || '';
      if (!childId || !refText) {
        wx.showToast({ title: '朗读内容未就绪', icon: 'none' });
        return;
      }

      this.setData({ assessing: true });
      const fs = wx.getFileSystemManager();
      fs.readFile({
        filePath,
        success: (fileRes) => {
          assessDailyChinese(childId, refText, fileRes.data)
            .then((scoreRes) => {
              if (this._unloaded) return;
              if (!scoreRes || !scoreRes.ok) {
                wx.showToast({
                  title: mapAssessError(scoreRes && scoreRes.error),
                  icon: 'none'
                });
                this.setData({ assessing: false });
                return;
              }
              const best = Number(scoreRes.best) || 0;
              const pron = scoreRes.pron !== undefined ? Number(scoreRes.pron) : best;
              const stars = scoreRes.stars || calcStars(best);
              const passed = Boolean(scoreRes.passed);
              const attempts = Number(scoreRes.attempts) || (this.data.attempts + 1);
              this.setData({
                assessing: false,
                hasScore: true,
                best,
                attempts,
                passed,
                starsStr: starsText(stars),
                lastPron: pron
              });
            })
            .catch((err) => {
              if (this._unloaded) return;
              const errCode =
                (err && err.data && err.data.error) ||
                (err && err.error) ||
                '';
              wx.showToast({
                title: mapAssessError(errCode),
                icon: 'none'
              });
              this.setData({ assessing: false });
            });
        },
        fail: () => {
          if (this._unloaded) return;
          wx.showToast({ title: '读取录音失败，请重试', icon: 'none' });
          this.setData({ assessing: false });
        }
      });
    });

    rm.onError((err) => {
      if (this._unloaded) return;
      this.setData({ recording: false, assessing: false });
      const msg = (err && (err.errMsg || err.message)) || '';
      if (/auth|permission|deny/i.test(msg)) {
        this.showMicSettingModal();
      } else if (/NotFoundError/i.test(msg)) {
        wx.showModal({
          title: '提示',
          content: '没有找到麦克风，请在有麦克风的手机上使用跟读功能。',
          showCancel: false
        });
      } else {
        wx.showModal({
          title: '录音出错',
          content: msg || '录音失败，请重试',
          showCancel: false
        });
      }
    });
  },

  showMicSettingModal() {
    wx.showModal({
      title: '需要麦克风权限',
      content: '请在设置中开启麦克风权限，才能进行跟读评分。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  loadData(showLoading) {
    const childId = resolveChildId();
    if (!childId) {
      this.setData({
        loading: false,
        loadError: '未找到当前孩子信息，请先选择孩子'
      });
      return;
    }

    if (showLoading) {
      this.setData({ loading: true, loadError: '' });
    } else {
      this.setData({ loadError: '' });
    }

    getDailyChinese(childId)
      .then((res) => {
        if (this._unloaded) return;
        if (!res || !res.ok) {
          this.setData({
            loading: false,
            loadError: (res && res.error) || '加载失败，请重试'
          });
          return;
        }
        const item = res.item || {};
        const score = res.score;
        const hasScore = Boolean(score && score.best !== undefined && score.best !== null);
        const best = hasScore ? Number(score.best) || 0 : 0;
        const attempts = hasScore ? Number(score.attempts) || 0 : 0;
        const passed = Boolean(score && score.passed);
        this.setData({
          loading: false,
          loadError: '',
          date: res.date || '',
          item,
          kindLabel: mapKindLabel(item.kind),
          completed: Boolean(res.completed),
          hasScore,
          best,
          attempts,
          passed,
          starsStr: hasScore ? starsText(calcStars(best)) : ''
        });
      })
      .catch((err) => {
        if (this._unloaded) return;
        this.setData({
          loading: false,
          loadError: (err && (err.error || err.message)) || '网络异常，请稍后重试'
        });
      });
  },

  onRetry() {
    this.loadData(true);
  },

  onTapRecord() {
    if (this.data.assessing) return;

    if (this.data.recording) {
      try {
        this.recorderManager.stop();
      } catch (e) {
        this.setData({ recording: false });
      }
      return;
    }

    this.stopAudio();

    wx.authorize({
      scope: 'scope.record',
      success: () => {
        if (this._unloaded) return;
        this.setData({ recording: true });
        this.recorderManager.start({
          format: 'wav',
          sampleRate: 16000,
          numberOfChannels: 1,
          duration: 60000
        });
      },
      fail: () => {
        this.showMicSettingModal();
      }
    });
  },

  onTapCheckin() {
    if (this.data.completed || !this.data.passed || this.data.checkingIn) return;
    const childId = resolveChildId();
    if (!childId) {
      wx.showToast({ title: '未找到孩子信息', icon: 'none' });
      return;
    }

    this.setData({ checkingIn: true });
    checkinDailyChinese({ childId })
      .then((res) => {
        if (this._unloaded) return;
        this.setData({ checkingIn: false });
        if (!res || !res.ok) {
          wx.showToast({
            title: (res && res.error) || '打卡失败，请重试',
            icon: 'none'
          });
          return;
        }
        const content = res.careWheelGranted
          ? '太棒了！获得 1 次养成转盘机会'
          : '今日语文跟读已完成';
        wx.showModal({
          title: '打卡成功',
          content,
          showCancel: false,
          success: () => {
            this.loadData(false);
          }
        });
      })
      .catch((err) => {
        if (this._unloaded) return;
        this.setData({ checkingIn: false });
        wx.showToast({
          title: (err && (err.error || err.message)) || '打卡失败，请重试',
          icon: 'none'
        });
      });
  }
});
