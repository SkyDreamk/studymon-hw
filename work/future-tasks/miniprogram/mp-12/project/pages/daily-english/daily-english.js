const {
  getDailyEnglish,
  checkinDailyEnglish,
  assessDailyEnglish
} = require('../../utils/api');

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

function resolveChildId(options) {
  const app = getApp();
  const gd = (app && app.globalData) || {};
  return (
    (options && options.childId) ||
    gd.childId ||
    (gd.child && gd.child.id) ||
    (gd.currentChild && gd.currentChild.id) ||
    wx.getStorageSync('childId') ||
    (wx.getStorageSync('child') && wx.getStorageSync('child').id) ||
    ''
  );
}

Page({
  data: {
    loading: false,
    loadError: '',
    date: '',
    completed: false,
    sentences: [],
    missingCount: 5,
    playingIndex: -1,
    playingSpeed: '',
    recordingIndex: -1,
    assessingIndex: -1,
    checkingIn: false
  },

  onLoad(options) {
    this.childId = resolveChildId(options);
    this.initAudio();
    this.initRecorder();
  },

  onShow() {
    if (!this.childId) {
      this.childId = resolveChildId();
    }
    if (this.data.recordingIndex === -1 && this.data.assessingIndex === -1) {
      this.loadDailyEnglish();
    }
  },

  onUnload() {
    this.stopAudio();
    if (this.audioCtx) {
      this.audioCtx.destroy();
      this.audioCtx = null;
    }
    if (this.recorderManager && this.data.recordingIndex !== -1) {
      try {
        this.recorderManager.stop();
      } catch (e) {}
    }
  },

  initAudio() {
    const ctx = wx.createInnerAudioContext();
    ctx.onEnded(() => {
      this.setData({ playingIndex: -1, playingSpeed: '' });
    });
    ctx.onStop(() => {
      this.setData({ playingIndex: -1, playingSpeed: '' });
    });
    ctx.onError(() => {
      this.setData({ playingIndex: -1, playingSpeed: '' });
      wx.showToast({ title: '音频播放失败', icon: 'none' });
    });
    this.audioCtx = ctx;
  },

  initRecorder() {
    const rm = wx.getRecorderManager();
    rm.onStop((res) => {
      const idx = this.data.recordingIndex;
      if (idx === -1) return;
      this.setData({ recordingIndex: -1, assessingIndex: idx });
      this.processRecording(idx, res.tempFilePath);
    });
    rm.onError((err) => {
      const msg = (err && err.errMsg) || '';
      this.setData({ recordingIndex: -1, assessingIndex: -1 });
      if (/auth|deny|permission/i.test(msg)) {
        this.showMicSettingModal();
      } else if (/NotFoundError/i.test(msg)) {
        wx.showModal({
          title: '录音失败',
          content: '没有找到麦克风，请在有麦克风的手机上使用跟读功能。',
          showCancel: false
        });
      } else {
        wx.showModal({
          title: '录音失败',
          content: msg || '无法启动录音，请重试',
          showCancel: false
        });
      }
    });
    this.recorderManager = rm;
  },

  showMicSettingModal() {
    wx.showModal({
      title: '需要麦克风权限',
      content: '请在设置中开启麦克风权限，才能进行跟读评分。',
      confirmText: '去设置',
      success(res) {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  loadDailyEnglish() {
    if (!this.childId) {
      this.setData({ loadError: '未找到当前孩子信息' });
      return Promise.resolve();
    }
    this.setData({ loading: true, loadError: '' });
    return getDailyEnglish(this.childId)
      .then((res) => {
        const scores = (res && res.scores) || {};
        const prevMap = {};
        this.data.sentences.forEach((item) => {
          if (item.lastPron !== null) {
            prevMap[item.key] = {
              lastPron: item.lastPron,
              lastStarsText: item.lastStarsText
            };
          }
        });

        const list = ((res && res.sentences) || []).map((s) => {
          const key = `${s.episodeId}:${s.sid}`;
          const sc = scores[key];
          const hasScore = Boolean(sc && (sc.attempts > 0 || sc.best !== undefined));
          const best = hasScore ? Number(sc.best || 0) : 0;
          const passed = Boolean(sc && sc.passed);
          const prev = prevMap[key];
          return {
            ...s,
            key,
            hasScore,
            best,
            attempts: hasScore ? Number(sc.attempts || 0) : 0,
            passed,
            bestStarsText: hasScore ? starsText(calcStars(best)) : '',
            lastPron: prev ? prev.lastPron : null,
            lastStarsText: prev ? prev.lastStarsText : ''
          };
        });

        const missingCount = list.filter((s) => !s.passed).length;
        this.setData({
          loading: false,
          date: (res && res.date) || '',
          completed: Boolean(res && res.completed),
          sentences: list,
          missingCount
        });
      })
      .catch((err) => {
        this.setData({
          loading: false,
          loadError: (err && (err.error || err.message)) || '加载失败，请重试'
        });
      });
  },

  stopAudio() {
    if (this.audioCtx && this.data.playingIndex !== -1) {
      try {
        this.audioCtx.stop();
      } catch (e) {}
      this.setData({ playingIndex: -1, playingSpeed: '' });
    }
  },

  onPlayDemo(e) {
    const index = Number(e.currentTarget.dataset.index);
    const speed = e.currentTarget.dataset.speed;
    const item = this.data.sentences[index];
    if (!item || !this.audioCtx) return;
    // view 没有原生 disabled，点按时自己拦（录音中/评分中不许切音频）
    if (this.data.recordingIndex === index || this.data.assessingIndex === index) return;

    if (this.data.playingIndex === index && this.data.playingSpeed === speed) {
      this.stopAudio();
      return;
    }

    const url = speed === 'slow' ? item.audioSlow : item.audioNormal;
    if (!url) return;

    try {
      this.audioCtx.stop();
    } catch (e2) {}

    this.setData({ playingIndex: index, playingSpeed: speed });
    this.audioCtx.src = url;
    this.audioCtx.play();
  },

  onToggleRecord(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (this.data.assessingIndex !== -1) return;

    if (this.data.recordingIndex === index) {
      this.recorderManager.stop();
      return;
    }
    if (this.data.recordingIndex !== -1) return;

    this.stopAudio();

    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.setData({ recordingIndex: index });
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

  processRecording(index, tempFilePath) {
    const sentence = this.data.sentences[index];
    if (!sentence || !tempFilePath) {
      this.setData({ assessingIndex: -1 });
      return;
    }

    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath: tempFilePath,
      success: (fileRes) => {
        assessDailyEnglish(this.childId, sentence.en, fileRes.data)
          .then((res) => {
            const list = this.data.sentences.slice();
            const cur = list[index];
            const best = Number(res.best !== undefined ? res.best : cur.best);
            const pron = Number(res.pron !== undefined ? res.pron : best);
            const passed = Boolean(res.passed);
            const starCount = res.stars || calcStars(pron);

            list[index] = {
              ...cur,
              hasScore: true,
              best,
              attempts: Number(res.attempts || (cur.attempts + 1)),
              passed,
              bestStarsText: starsText(calcStars(best)),
              lastPron: pron,
              lastStarsText: starsText(starCount)
            };

            const missingCount = list.filter((s) => !s.passed).length;
            this.setData({
              sentences: list,
              missingCount,
              assessingIndex: -1
            });
          })
          .catch((err) => {
            this.setData({ assessingIndex: -1 });
            const errCode = (err && (err.error || (err.data && err.data.error))) || '评分失败';
            wx.showModal({
              title: '评分提示',
              content: mapAssessError(errCode),
              showCancel: false
            });
          });
      },
      fail: () => {
        this.setData({ assessingIndex: -1 });
        wx.showModal({
          title: '读取录音失败',
          content: '无法读取录音文件，请重试',
          showCancel: false
        });
      }
    });
  },

  onCheckin() {
    if (this.data.completed || this.data.missingCount > 0 || this.data.checkingIn) return;
    this.setData({ checkingIn: true });

    checkinDailyEnglish({ childId: this.childId })
      .then((res) => {
        this.setData({
          checkingIn: false,
          completed: true
        });
        const extra = res && res.careWheelGranted ? '\n获得 1 次养成转盘机会' : '';
        wx.showModal({
          title: '打卡成功',
          content: `今日打卡完成${extra}`,
          showCancel: false
        });
      })
      .catch((err) => {
        this.setData({ checkingIn: false });
        const payload = (err && err.data) || err || {};
        if (payload.error === 'NOT_PASSED') {
          const missing = Array.isArray(payload.missing) ? payload.missing : [];
          const text = missing.length
            ? missing.map((m) => `第 ${m.index} 句（最好 ${m.best || 0} 分）`).join('、')
            : '仍有句子未达标（需 >= 75 分）';
          wx.showModal({
            title: '暂未达标',
            content: `以下句子尚未达标：${text}`,
            showCancel: false
          });
          this.loadDailyEnglish();
        } else {
          wx.showModal({
            title: '打卡失败',
            content: String(payload.error || payload.message || '打卡失败，请重试'),
            showCancel: false
          });
        }
      });
  }
});
