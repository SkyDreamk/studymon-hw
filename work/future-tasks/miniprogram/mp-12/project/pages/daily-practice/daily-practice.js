const {
  getDailyEnglish,
  getDailyChinese,
  getDailyMath
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

function buildEnglishCard(res, errMsg) {
  const base = {
    key: 'english',
    title: '每日英语跟读',
    icon: '/images/icon-english.webp',
    subtitle: '5 句',
    url: '/pages/daily-english/daily-english',
    date: '',
    completed: false,
    statusText: '未开始',
    statusClass: 'dp-status-idle'
  };
  if (errMsg || !res || !res.ok) {
    return Object.assign({}, base, {
      statusText: '加载失败',
      statusClass: 'dp-status-error'
    });
  }
  const sentences = Array.isArray(res.sentences) ? res.sentences : [];
  const scores = res.scores || {};
  let passedCount = 0;
  let hasAttempt = false;
  for (let i = 0; i < sentences.length; i += 1) {
    const s = sentences[i];
    const scoreKey = s.episodeId + ':' + s.sid;
    const sc = scores[scoreKey];
    if (sc) {
      if ((Number(sc.attempts) || 0) > 0 || sc.best !== undefined) {
        hasAttempt = true;
      }
      if (sc.passed) {
        passedCount += 1;
      }
    }
  }
  const completed = Boolean(res.completed);
  let statusText = '未开始';
  let statusClass = 'dp-status-idle';
  if (completed) {
    statusText = '今日已完成';
    statusClass = 'dp-status-done';
  } else if (passedCount > 0 || hasAttempt) {
    statusText = '已达标 ' + passedCount + '/5';
    statusClass = 'dp-status-progress';
  }
  return Object.assign({}, base, {
    date: res.date || '',
    completed,
    statusText,
    statusClass
  });
}

function buildChineseCard(res, errMsg) {
  const base = {
    key: 'chinese',
    title: '每日语文',
    icon: '/images/icon-chinese.webp',
    subtitle: '1 篇',
    url: '/pages/daily-chinese/daily-chinese',
    date: '',
    completed: false,
    statusText: '未开始',
    statusClass: 'dp-status-idle'
  };
  if (errMsg || !res || !res.ok) {
    return Object.assign({}, base, {
      statusText: '加载失败',
      statusClass: 'dp-status-error'
    });
  }
  const completed = Boolean(res.completed);
  const score = res.score;
  let statusText = '未开始';
  let statusClass = 'dp-status-idle';
  if (completed) {
    statusText = '今日已完成';
    statusClass = 'dp-status-done';
  } else if (score && score.passed) {
    statusText = '已达标 ✓';
    statusClass = 'dp-status-done';
  } else if (score && score.best !== undefined && score.best !== null) {
    statusText = '最好 ' + score.best + ' 分';
    statusClass = 'dp-status-progress';
  }
  return Object.assign({}, base, {
    date: res.date || '',
    completed,
    statusText,
    statusClass
  });
}

function buildMathCard(res, errMsg) {
  const base = {
    key: 'math',
    title: '每日数学',
    icon: '/images/icon-math.webp',
    subtitle: '5 道题',
    url: '/pages/daily-math/daily-math',
    date: '',
    completed: false,
    statusText: '未开始',
    statusClass: 'dp-status-idle'
  };
  if (errMsg || !res || !res.ok) {
    return Object.assign({}, base, {
      statusText: '加载失败',
      statusClass: 'dp-status-error'
    });
  }
  const completed = Boolean(res.completed);
  const correctCount = Number(res.correctCount) || 0;
  const answers = res.answers || {};
  const answeredCount = Object.keys(answers).length;
  let statusText = '未开始';
  let statusClass = 'dp-status-idle';
  if (completed) {
    statusText = '今日已完成';
    statusClass = 'dp-status-done';
  } else if (correctCount > 0 || answeredCount > 0) {
    statusText = '已答对 ' + correctCount + '/5';
    statusClass = 'dp-status-progress';
  }
  return Object.assign({}, base, {
    date: res.date || '',
    completed,
    statusText,
    statusClass
  });
}

Page({
  data: {
    loading: true,
    totalError: '',
    date: '',
    cards: []
  },

  onLoad() {
    this._hasLoaded = false;
  },

  onShow() {
    this.loadHub(!this._hasLoaded);
  },

  loadHub(showLoading) {
    const childId = resolveChildId();
    if (!childId) {
      this.setData({
        loading: false,
        totalError: '未找到当前孩子信息，请先选择孩子'
      });
      return;
    }

    if (showLoading) {
      this.setData({ loading: true, totalError: '' });
    } else {
      this.setData({ totalError: '' });
    }

    const wrap = (promise) =>
      Promise.resolve(promise)
        .then((res) => ({ res, err: null }))
        .catch((err) => ({
          res: null,
          err: (err && (err.error || err.message)) || '加载失败'
        }));

    Promise.all([
      wrap(getDailyEnglish(childId)),
      wrap(getDailyChinese(childId)),
      wrap(getDailyMath(childId))
    ]).then(([enPack, zhPack, mathPack]) => {
      this._hasLoaded = true;
      const enOk = Boolean(enPack.res && enPack.res.ok);
      const zhOk = Boolean(zhPack.res && zhPack.res.ok);
      const mathOk = Boolean(mathPack.res && mathPack.res.ok);

      if (!enOk && !zhOk && !mathOk) {
        const errMsg =
          (enPack.res && enPack.res.error) ||
          enPack.err ||
          (zhPack.res && zhPack.res.error) ||
          zhPack.err ||
          '网络异常，请稍后重试';
        this.setData({
          loading: false,
          totalError: errMsg,
          cards: []
        });
        return;
      }

      const date =
        (enOk && enPack.res.date) ||
        (zhOk && zhPack.res.date) ||
        (mathOk && mathPack.res.date) ||
        '';

      const cards = [
        buildEnglishCard(enPack.res, enOk ? '' : enPack.err || (enPack.res && enPack.res.error) || '加载失败'),
        buildChineseCard(zhPack.res, zhOk ? '' : zhPack.err || (zhPack.res && zhPack.res.error) || '加载失败'),
        buildMathCard(mathPack.res, mathOk ? '' : mathPack.err || (mathPack.res && mathPack.res.error) || '加载失败')
      ];

      this.setData({
        loading: false,
        totalError: '',
        date,
        cards
      });
    });
  },

  onRetry() {
    this.loadHub(true);
  },

  onTapCard(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.navigateTo({ url });
  }
});
