const { getQuizToday, answerQuiz } = require('../../utils/api');

Page({
  data: {
    quizData: null,
    errorMsg: '',
    isAnswering: false
  },
  onShow() {
    this.loadData();
  },
  goMoves() {
    wx.navigateTo({ url: '/pages/moves/moves' });
  },
  async loadData() {
    const app = getApp();
    try {
      const res = await getQuizToday(app.globalData.childId);
      if (res.ok) {
        this.setData({ quizData: res, errorMsg: '' });
      } else {
        this.setData({ errorMsg: res.error || '加载失败' });
      }
    } catch (err) {
      if (err.message !== 'NEED_LOGIN') {
        this.setData({ errorMsg: err.message });
      }
    }
  },
  async selectOption(e) {
    const app = getApp();
    if (this.data.isAnswering) return;
    const qid = e.currentTarget.dataset.qid;
    const idx = e.currentTarget.dataset.idx;

    this.setData({ isAnswering: true });
    try {
      const res = await answerQuiz({
        childId: app.globalData.childId,
        questionId: qid,
        answerIdx: idx
      });

      if (res.ok) {
        const updatedData = { ...this.data.quizData };
        updatedData.answeredCount = res.answeredCount;
        updatedData.remaining = res.remaining;
        if (updatedData.quiz) {
          updatedData.quiz.fragments = res.quizFragments;
          updatedData.quiz.nextFragmentIn = res.nextFragmentIn;
        }

        const qIndex = updatedData.questions.findIndex(q => q.id === qid);
        if (qIndex !== -1) {
          updatedData.questions[qIndex].answered = true;
          updatedData.questions[qIndex].correct = res.correct;
          updatedData.questions[qIndex].correctIdx = res.correctIdx;
          updatedData.questions[qIndex].chosenIdx = idx;
          updatedData.questions[qIndex].result = {
            correct: res.correct,
            xpAwarded: res.xpAwarded,
            fragmentsAwarded: res.fragmentsAwarded,
            drop: res.drop,
            itemDrop: res.itemDrop,
            encounter: res.encounter,
            level: res.level,
            showExplain: res.showExplain,
            explain: res.explain
          };
        }
        this.setData({ quizData: updatedData, isAnswering: false });
      } else {
        wx.showModal({ title: '提示', content: res.error || '答题失败', showCancel: false });
        this.setData({ isAnswering: false });
      }
    } catch (err) {
      if (err.message !== 'NEED_LOGIN') {
        wx.showModal({ title: '网络错误', content: err.message, showCancel: false });
      }
      this.setData({ isAnswering: false });
    }
  }
});
