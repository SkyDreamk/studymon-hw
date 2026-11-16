const {
  getDailyMath,
  answerDailyMath,
  checkinDailyMath
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

function mapKindLabel(kind) {
  if (kind === 'word') return '应用题';
  if (kind === 'bracket') return '填一填';
  return '';
}

function buildProblemList(problems, answers, prevList) {
  const sorted = (Array.isArray(problems) ? problems.slice() : []).sort(
    (a, b) => Number(a.index) - Number(b.index)
  );
  const prevMap = {};
  if (Array.isArray(prevList)) {
    for (let i = 0; i < prevList.length; i += 1) {
      prevMap[prevList[i].index] = prevList[i];
    }
  }
  const ansMap = answers || {};
  return sorted.map((p) => {
    const idx = p.index;
    const stored = ansMap[idx] || ansMap[String(idx)];
    const prev = prevMap[idx];
    const answered = Boolean(stored);
    return {
      index: idx,
      q: p.q || '',
      qEn: p.qEn || '',
      kind: p.kind || '',
      kindLabel: mapKindLabel(p.kind),
      answered,
      userAnswer: answered ? String(stored.answer) : '',
      correct: answered ? Boolean(stored.correct) : false,
      correctAnswer: answered && stored.correctAnswer !== undefined ? stored.correctAnswer : '',
      inputValue: answered ? String(stored.answer) : (prev ? prev.inputValue : ''),
      submitting: false
    };
  });
}

Page({
  data: {
    loading: true,
    loadError: '',
    date: '',
    correctCount: 0,
    neededCount: 4,
    passed: false,
    completed: false,
    checkingIn: false,
    problemList: []
  },

  onLoad() {
    this._unloaded = false;
    this.loadData(true);
  },

  onUnload() {
    this._unloaded = true;
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

    getDailyMath(childId)
      .then((res) => {
        if (this._unloaded) return;
        if (!res || !res.ok) {
          this.setData({
            loading: false,
            loadError: (res && res.error) || '加载失败，请重试'
          });
          return;
        }
        const correctCount = Number(res.correctCount) || 0;
        const passed = Boolean(res.passed || correctCount >= 4);
        const problemList = buildProblemList(
          res.problems,
          res.answers,
          this.data.problemList
        );
        this.setData({
          loading: false,
          loadError: '',
          date: res.date || '',
          correctCount,
          neededCount: Math.max(0, 4 - correctCount),
          passed,
          completed: Boolean(res.completed),
          problemList
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

  onInputAnswer(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const val = e.detail && e.detail.value !== undefined ? String(e.detail.value) : '';
    const list = this.data.problemList.slice();
    const pos = list.findIndex((item) => Number(item.index) === idx);
    if (pos === -1) return;
    if (list[pos].answered || this.data.completed) return;
    list[pos] = Object.assign({}, list[pos], { inputValue: val });
    this.setData({ problemList: list });
  },

  onTapSubmit(e) {
    if (this.data.completed) return;
    const idx = Number(e.currentTarget.dataset.index);
    const list = this.data.problemList.slice();
    const pos = list.findIndex((item) => Number(item.index) === idx);
    if (pos === -1) return;

    const target = list[pos];
    if (target.answered || target.submitting) return;

    const raw = String(target.inputValue || '').trim();
    if (raw === '') {
      wx.showToast({ title: '请输入答案', icon: 'none' });
      return;
    }
    const numericAnswer = Number(raw);
    if (!Number.isFinite(numericAnswer)) {
      wx.showToast({ title: '请输入答案', icon: 'none' });
      return;
    }

    const childId = resolveChildId();
    if (!childId) {
      wx.showToast({ title: '未找到孩子信息', icon: 'none' });
      return;
    }

    list[pos] = Object.assign({}, target, { submitting: true });
    this.setData({ problemList: list });

    answerDailyMath({
      childId,
      index: idx,
      answer: numericAnswer
    })
      .then((res) => {
        if (this._unloaded) return;
        const nextList = this.data.problemList.slice();
        const curPos = nextList.findIndex((item) => Number(item.index) === idx);
        if (!res || !res.ok) {
          if (curPos !== -1) {
            nextList[curPos] = Object.assign({}, nextList[curPos], { submitting: false });
          }
          this.setData({ problemList: nextList });
          wx.showToast({
            title: (res && res.error) || '提交失败，请重试',
            icon: 'none'
          });
          return;
        }

        const storedAns = res.answer !== undefined ? String(res.answer) : String(numericAnswer);
        if (curPos !== -1) {
          nextList[curPos] = Object.assign({}, nextList[curPos], {
            submitting: false,
            answered: true,
            userAnswer: storedAns,
            inputValue: storedAns,
            correct: Boolean(res.correct),
            correctAnswer: res.correctAnswer !== undefined ? res.correctAnswer : ''
          });
        }
        const correctCount = Number(res.correctCount) || 0;
        const passed = Boolean(res.passed || correctCount >= 4);
        this.setData({
          problemList: nextList,
          correctCount,
          neededCount: Math.max(0, 4 - correctCount),
          passed
        });
      })
      .catch((err) => {
        if (this._unloaded) return;
        const nextList = this.data.problemList.slice();
        const curPos = nextList.findIndex((item) => Number(item.index) === idx);
        if (curPos !== -1) {
          nextList[curPos] = Object.assign({}, nextList[curPos], { submitting: false });
        }
        this.setData({ problemList: nextList });
        wx.showToast({
          title: (err && (err.error || err.message)) || '提交失败，请重试',
          icon: 'none'
        });
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
    checkinDailyMath({ childId })
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
          : '今日数学练习已完成';
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
