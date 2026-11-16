const { getOakToday, listenOak, assessOak } = require('../../utils/api');

const AUDIO_BASE_URL = 'https://example.com';

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

function resolveAudioUrl(audio) {
  if (!audio) return '';
  const str = String(audio).trim();
  if (!str) return '';
  if (str.indexOf('https://') === 0 || str.indexOf('http://') === 0) {
    return str;
  }
  if (str.indexOf('/static/audio/oak/') === 0 || str.indexOf('/') === 0) {
    return AUDIO_BASE_URL + str;
  }
  return AUDIO_BASE_URL + '/' + str;
}

function formatDrawText(draw) {
  if (!draw) return '';
  if (typeof draw === 'string') return draw;
  return (
    draw.message ||
    draw.text ||
    draw.title ||
    draw.rewardName ||
    draw.reward ||
    draw.name ||
    draw.label ||
    '抽奖啦！'
  );
}

Page({
  data: {
    loading: true,
    loadError: '',
    childId: null,
    date: '',
    topic: '',
    quizXp: 0,
    listenedCount: 0,
    totalCount: 0,
    completed: false,
    xpAwardedToday: 0,
    fiveStarCount: 0,
    fiveStarTotal: 0,
    assessEnabled: false,
    drawText: '',
    sentences: [],
    playingId: null,
    listeningId: null,
    recordingId: null,
    assessingId: null
  },

  onLoad() {
    this._unloaded = false;
    this._assessMap = {};
    this._pendingSentence = null;
    this.initAudio();
    this.initRecorder();
    this.loadToday();
  },

  onUnload() {
    this._unloaded = true;
    this.stopAudio();
    if (this.audioCtx) {
      try {
        this.audioCtx.destroy();
      } catch (e) {}
      this.audioCtx = null;
    }
    if (this.recorderManager && this.data.recordingId !== null) {
      try {
        this.recorderManager.stop();
      } catch (e) {}
    }
    this.recorderManager = null;
  },

  initAudio() {
    const ctx = wx.createInnerAudioContext();
    ctx.onEnded(() => {
      if (this._unloaded) return;
      this.setData({ playingId: null });
    });
    ctx.onStop(() => {
      if (this._unloaded) return;
      this.setData({ playingId: null });
    });
    ctx.onError(() => {
      if (this._unloaded) return;
      this.setData({ playingId: null });
      wx.showToast({ title: '音频播放失败', icon: 'none' });
    });
    this.audioCtx = ctx;
  },

  initRecorder() {
    const rm = wx.getRecorderManager();
    rm.onStop((res) => {
      if (this._unloaded) return;
      const sentence = this._pendingSentence;
      this._pendingSentence = null;
      this.setData({ recordingId: null });
      if (!sentence || !res || !res.tempFilePath) {
        return;
      }
      this.submitRecording(sentence, res.tempFilePath);
    });

    rm.onError((err) => {
      if (this._unloaded) return;
      this._pendingSentence = null;
      this.setData({ recordingId: null });
      const msg = (err && (err.errMsg || err.message)) || '';
      if (/auth|deny|permission/i.test(msg)) {
        this.showMicPermissionModal();
      } else if (/NotFoundError/i.test(msg)) {
        wx.showModal({
          title: '未检测到麦克风',
          content: '没有找到麦克风，请在有麦克风的手机上使用跟读功能。',
          showCancel: false
        });
      } else {
        wx.showModal({
          title: '录音失败',
          content: msg || '录音遇到问题，请重试。',
          showCancel: false
        });
      }
    });

    this.recorderManager = rm;
  },

  showMicPermissionModal() {
    wx.showModal({
      title: '需要麦克风权限',
      content: '请在设置中开启麦克风权限，才能进行跟读评分。',
      confirmText: '去设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  buildSentences(rawSentences, listenedCount) {
    const list = Array.isArray(rawSentences) ? rawSentences : [];
    return list.map((item, idx) => {
      const audioUrl = resolveAudioUrl(item.audio);
      const latest = this._assessMap[item.id] || null;
      return {
        id: item.id,
        idx,
        en: item.en || '',
        zh: item.zh || '',
        showZh: !!item.showZh,
        audioUrl,
        hasAudio: !!audioUrl,
        listened: !!item.listened,
        canListen: !item.listened && idx === listenedCount,
        latestPron: latest ? latest.pron : null,
        latestStarsStr: latest ? latest.starsStr : ''
      };
    });
  },

  applyTodayData(res) {
    const listenedCount = Number(res.listenedCount) || 0;
    const rawSentences = Array.isArray(res.sentences) ? res.sentences : [];
    const sentences = this.buildSentences(rawSentences, listenedCount);
    const totalCount = sentences.length;
    this.setData({
      loading: false,
      loadError: '',
      date: res.date || '',
      topic: res.topic || '',
      quizXp: Number(res.quizXp) || 0,
      listenedCount,
      totalCount,
      completed: !!res.completed,
      xpAwardedToday: Number(res.xpAwardedToday) || 0,
      fiveStarCount: Number(res.fiveStarCount) || 0,
      fiveStarTotal: Number(res.fiveStarTotal) || totalCount,
      assessEnabled: !!res.assessEnabled,
      drawText: res.draw ? formatDrawText(res.draw) : '',
      sentences
    });
  },

  loadToday(options) {
    const silent = options && options.silent;
    const childId = resolveChildId();
    if (!childId) {
      this.setData({
        loading: false,
        loadError: '未找到孩子信息，请先选择孩子'
      });
      return Promise.resolve(null);
    }

    if (!silent) {
      this.setData({ loading: true, loadError: '', childId });
    } else {
      this.setData({ childId });
    }

    return getOakToday(childId)
      .then((res) => {
        if (this._unloaded) return null;
        if (!res || !res.ok) {
          const errMsg = (res && res.error) || '加载英语交流内容失败，请重试';
          if (!silent) {
            this.setData({ loading: false, loadError: errMsg });
          } else {
            wx.showToast({ title: errMsg, icon: 'none' });
          }
          return null;
        }
        this.applyTodayData(res);
        return res;
      })
      .catch((err) => {
        if (this._unloaded) return null;
        const errMsg = (err && (err.error || err.message)) || '网络开小差了，请稍后重试';
        if (!silent) {
          this.setData({ loading: false, loadError: errMsg });
        } else {
          wx.showToast({ title: errMsg, icon: 'none' });
        }
        return null;
      });
  },

  onRetryTap() {
    this.loadToday();
  },

  stopAudio() {
    if (this.audioCtx) {
      try {
        this.audioCtx.stop();
      } catch (e) {}
    }
    if (this.data.playingId !== null) {
      this.setData({ playingId: null });
    }
  },

  onPlayTap(e) {
    const id = Number(e.currentTarget.dataset.id);
    const sentence = this.data.sentences.find((s) => s.id === id);
    if (!sentence || !sentence.hasAudio) return;
    if (this.data.recordingId !== null || this.data.assessingId !== null) return;

    if (this.data.playingId === id) {
      this.stopAudio();
      return;
    }

    this.stopAudio();
    this.setData({ playingId: id });
    this.audioCtx.src = sentence.audioUrl;
    this.audioCtx.play();
  },

  onListenTap(e) {
    const id = Number(e.currentTarget.dataset.id);
    const sentence = this.data.sentences.find((s) => s.id === id);
    if (!sentence || !sentence.canListen) return;
    if (this.data.listeningId !== null) return;

    const childId = this.data.childId || resolveChildId();
    if (!childId) {
      wx.showToast({ title: '未找到孩子信息', icon: 'none' });
      return;
    }

    const wasCompleted = this.data.completed;
    this.setData({ listeningId: id });

    listenOak({ childId, questionId: id })
      .then((res) => {
        if (this._unloaded) return;
        this.setData({ listeningId: null });
        if (!res || !res.ok) {
          const msg = (res && res.error) || '标记失败，请重试';
          wx.showToast({ title: msg, icon: 'none' });
          return;
        }

        const newListenedCount =
          typeof res.listenedCount === 'number' ? res.listenedCount : this.data.listenedCount + 1;
        const newCompleted = !!res.completed;
        const xpAwarded = Number(res.xpAwarded) || 0;

        const updatedSentences = this.data.sentences.map((s) => {
          const isTarget = s.id === id;
          const listened = isTarget ? true : s.listened;
          return Object.assign({}, s, {
            listened,
            canListen: !listened && s.idx === newListenedCount
          });
        });

        this.setData({
          sentences: updatedSentences,
          listenedCount: newListenedCount,
          completed: newCompleted,
          xpAwardedToday: xpAwarded > 0 ? this.data.xpAwardedToday + xpAwarded : this.data.xpAwardedToday
        });

        if (!wasCompleted && newCompleted) {
          const content =
            xpAwarded > 0 ? `今日英语交流完成，获得 ${xpAwarded} 经验！` : '今日英语交流完成！';
          wx.showModal({
            title: '今日英语交流完成',
            content,
            showCancel: false,
            confirmText: '太棒了'
          });
        }

        this.loadToday({ silent: true });
      })
      .catch((err) => {
        if (this._unloaded) return;
        this.setData({ listeningId: null });
        const msg = (err && (err.error || err.message)) || '网络失败，请重试';
        wx.showToast({ title: msg, icon: 'none' });
      });
  },

  onRecordTap(e) {
    if (!this.data.assessEnabled) return;
    const id = Number(e.currentTarget.dataset.id);
    const sentence = this.data.sentences.find((s) => s.id === id);
    if (!sentence) return;

    if (this.data.assessingId !== null) return;

    if (this.data.recordingId === id) {
      try {
        this.recorderManager.stop();
      } catch (err) {
        this.setData({ recordingId: null });
      }
      return;
    }

    if (this.data.recordingId !== null) return;

    this.stopAudio();

    wx.authorize({
      scope: 'scope.record',
      success: () => {
        if (this._unloaded) return;
        this._pendingSentence = sentence;
        this.setData({ recordingId: id });
        try {
          this.recorderManager.start({
            format: 'wav',
            sampleRate: 16000,
            numberOfChannels: 1,
            duration: 60000
          });
        } catch (err) {
          this._pendingSentence = null;
          this.setData({ recordingId: null });
          wx.showModal({
            title: '无法启动录音',
            content: (err && err.message) || '请重试。',
            showCancel: false
          });
        }
      },
      fail: () => {
        if (this._unloaded) return;
        this.showMicPermissionModal();
      }
    });
  },

  submitRecording(sentence, tempFilePath) {
    const childId = this.data.childId || resolveChildId();
    if (!childId) {
      wx.showToast({ title: '未找到孩子信息', icon: 'none' });
      return;
    }

    this.setData({ assessingId: sentence.id });

    wx.getFileSystemManager().readFile({
      filePath: tempFilePath,
      success: (fileRes) => {
        if (this._unloaded) return;
        assessOak(childId, sentence.en, fileRes.data)
          .then((res) => {
            if (this._unloaded) return;
            this.setData({ assessingId: null });
            if (!res || !res.ok) {
              const code = res && res.error;
              wx.showToast({ title: mapAssessError(code), icon: 'none' });
              return;
            }

            const pron = Math.round(Number(res.pron) || 0);
            const stars = typeof res.stars === 'number' ? res.stars : calcStars(pron);
            const starsStr = starsText(stars);
            this._assessMap[sentence.id] = { pron, stars, starsStr };

            const updatedSentences = this.data.sentences.map((s) => {
              if (s.id !== sentence.id) return s;
              return Object.assign({}, s, {
                latestPron: pron,
                latestStarsStr: starsStr
              });
            });

            const patch = {
              sentences: updatedSentences
            };
            if (typeof res.fiveStarCount === 'number') {
              patch.fiveStarCount = res.fiveStarCount;
            }
            if (typeof res.fiveStarTotal === 'number') {
              patch.fiveStarTotal = res.fiveStarTotal;
            }
            if (res.draw) {
              patch.drawText = formatDrawText(res.draw);
            }
            this.setData(patch);

            if (res.draw) {
              wx.showModal({
                title: '幸运抽奖',
                content: formatDrawText(res.draw),
                showCancel: false,
                confirmText: '太棒了'
              });
            }
          })
          .catch((err) => {
            if (this._unloaded) return;
            this.setData({ assessingId: null });
            const errCode =
              (err && (err.error || (err.data && err.data.error))) || '';
            wx.showToast({ title: mapAssessError(errCode), icon: 'none' });
          });
      },
      fail: () => {
        if (this._unloaded) return;
        this.setData({ assessingId: null });
        wx.showToast({ title: '读取录音失败，请重试', icon: 'none' });
      }
    });
  }
});
