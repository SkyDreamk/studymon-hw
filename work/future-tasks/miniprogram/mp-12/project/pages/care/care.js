const {
  getCareStatus,
  feedCare,
  bathCare,
  getCareQaStatus,
  getCareQaQuestion,
  answerCareQa,
  spinCareWheel,
  getBackpack,
  getChild
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

function buildHeartList(hearts, friendship) {
  let count = typeof hearts === 'number' ? hearts : Math.floor((friendship || 0) / 51);
  if (count < 0) count = 0;
  if (count > 5) count = 5;
  const list = [];
  for (let i = 0; i < 5; i += 1) {
    list.push(i < count);
  }
  return list;
}

function formatLevelUp(level) {
  if (!level) return '';
  let text = `升级啦！Lv.${level.oldLevel} → Lv.${level.newLevel}`;
  if (level.evolved) {
    text += '（进化啦！）';
  }
  return text;
}

// 🫧 (U+1FAE7) is too new and renders as a tofu box in this environment; use 🛁 instead.
function displayEmoji(emoji) {
  if (emoji === '🫧') return '🛁';
  return emoji || '';
}

function normalizeItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    emoji: displayEmoji(item.emoji)
  }));
}

function fxSparksFor(kind, favorite) {
  if (kind === 'bath') return ['💧', '✨', '💧'];
  if (favorite) return ['💖', '⭐', '💖'];
  return ['❤️', '💖', '❤️'];
}

Page({
  data: {
    loading: true,
    initialized: false,
    loadError: '',
    careDisabled: false,

    scene: null,
    friendship: 0,
    hearts: 0,
    heartList: [false, false, false, false, false],

    petImg: '',
    petName: '',
    petBounce: false,
    showFx: false,
    fxEmoji: '',
    fxSparks: [],

    fedToday: false,
    bathedToday: false,
    foods: [],
    baths: [],
    recent: [],

    feedingKey: '',
    feedResult: null,
    feedError: '',

    bathingKey: '',
    bathResult: null,
    bathError: '',

    qaStatus: {
      dailyLimit: 3,
      answeredToday: 0,
      remainingToday: 3
    },
    qaLoading: false,
    qaSubmitting: false,
    qaQuestion: null,
    qaResult: null,
    qaError: '',
    optionLabels: ['A', 'B', 'C', 'D', 'E', 'F'],

    wheelChances: 0,
    spinning: false,
    wheelPrize: null,
    wheelError: ''
  },

  onLoad() {
    this._unloaded = false;
    this._spinTimer = null;
    this._fxTimer = null;
    this._bounceTimer = null;
  },

  onShow() {
    this._unloaded = false;
    this.loadAllData();
  },

  onUnload() {
    this._unloaded = true;
    if (this._spinTimer) {
      clearTimeout(this._spinTimer);
      this._spinTimer = null;
    }
    if (this._fxTimer) {
      clearTimeout(this._fxTimer);
      this._fxTimer = null;
    }
    if (this._bounceTimer) {
      clearTimeout(this._bounceTimer);
      this._bounceTimer = null;
    }
  },

  onRetry() {
    this.loadAllData();
  },

  async loadAllData() {
    const childId = resolveChildId();
    if (!childId) {
      this.setData({
        loading: false,
        loadError: '未找到小朋友信息，请先登录后重试'
      });
      return;
    }

    if (!this.data.initialized) {
      this.setData({ loading: true, loadError: '', careDisabled: false });
    } else {
      this.setData({ loadError: '' });
    }

    try {
      const [careRes, qaRes, backpackRes, childRes] = await Promise.all([
        getCareStatus(childId),
        getCareQaStatus(childId),
        getBackpack(childId),
        getChild(childId)
      ]);

      if (this._unloaded) return;

      if (!careRes || !careRes.ok) {
        const errCode = (careRes && (careRes.code || careRes.error)) || '';
        if (errCode === 'CARE_DISABLED' || (careRes && careRes.enabled === false)) {
          this.setData({
            loading: false,
            initialized: true,
            careDisabled: true,
            loadError: ''
          });
          return;
        }
        this.setData({
          loading: false,
          loadError: (careRes && careRes.error) || '加载照顾页面失败，请稍后重试'
        });
        return;
      }

      const patch = {
        loading: false,
        initialized: true,
        careDisabled: false,
        loadError: '',
        scene: careRes.scene || null,
        fedToday: !!careRes.fedToday,
        bathedToday: !!careRes.bathedToday,
        foods: normalizeItems(careRes.foods),
        baths: normalizeItems(careRes.baths),
        recent: Array.isArray(careRes.recent) ? careRes.recent : []
      };

      if (childRes && childRes.ok && childRes.child) {
        const child = childRes.child;
        if (child.avatar) {
          const av = String(child.avatar);
          patch.petImg = 'https://example.com' + (av.charAt(0) === '/' ? av : '/' + av);
        }
        patch.petName = (child.form && child.form.formName) || child.formName || '';
      }

      if (qaRes && qaRes.ok) {
        const friendship = typeof qaRes.friendship === 'number' ? qaRes.friendship : 0;
        const hearts = typeof qaRes.hearts === 'number' ? qaRes.hearts : Math.floor(friendship / 51);
        patch.friendship = friendship;
        patch.hearts = hearts;
        patch.heartList = buildHeartList(hearts, friendship);
        patch.qaStatus = {
          dailyLimit: qaRes.dailyLimit || 3,
          answeredToday: qaRes.answeredToday || 0,
          remainingToday: typeof qaRes.remainingToday === 'number' ? qaRes.remainingToday : 0
        };
      }

      if (backpackRes && backpackRes.ok) {
        patch.wheelChances = typeof backpackRes.careWheelChances === 'number'
          ? backpackRes.careWheelChances
          : 0;
      }

      this.setData(patch);
    } catch (err) {
      if (this._unloaded) return;
      this.setData({
        loading: false,
        loadError: (err && err.message) || '网络连接失败，请重试'
      });
    }
  },

  async refreshCareAndFriendship(childId) {
    try {
      const [careRes, qaRes] = await Promise.all([
        getCareStatus(childId),
        getCareQaStatus(childId)
      ]);
      if (this._unloaded) return;
      const patch = {};
      if (careRes && careRes.ok) {
        patch.scene = careRes.scene || this.data.scene;
        patch.fedToday = !!careRes.fedToday;
        patch.bathedToday = !!careRes.bathedToday;
        patch.foods = normalizeItems(careRes.foods).length ? normalizeItems(careRes.foods) : this.data.foods;
        patch.baths = normalizeItems(careRes.baths).length ? normalizeItems(careRes.baths) : this.data.baths;
        patch.recent = Array.isArray(careRes.recent) ? careRes.recent : this.data.recent;
      }
      if (qaRes && qaRes.ok) {
        const friendship = typeof qaRes.friendship === 'number' ? qaRes.friendship : this.data.friendship;
        const hearts = typeof qaRes.hearts === 'number' ? qaRes.hearts : Math.floor(friendship / 51);
        patch.friendship = friendship;
        patch.hearts = hearts;
        patch.heartList = buildHeartList(hearts, friendship);
        patch.qaStatus = {
          dailyLimit: qaRes.dailyLimit || 3,
          answeredToday: qaRes.answeredToday || 0,
          remainingToday: typeof qaRes.remainingToday === 'number' ? qaRes.remainingToday : 0
        };
      }
      this.setData(patch);
    } catch (e) {
      // Ignore silent refresh errors after a successful action
    }
  },

  // Pet interaction animation: the item flies to the pet, hearts/sparks float up,
  // and the pet does a happy bounce. Mirrors the web care page (care-fx-fly).
  playCareFx(kind, favorite, emoji) {
    if (this._fxTimer) {
      clearTimeout(this._fxTimer);
      this._fxTimer = null;
    }
    if (this._bounceTimer) {
      clearTimeout(this._bounceTimer);
      this._bounceTimer = null;
    }
    this.setData({
      petBounce: true,
      showFx: true,
      fxEmoji: emoji || '',
      fxSparks: fxSparksFor(kind, favorite)
    });
    this._bounceTimer = setTimeout(() => {
      this._bounceTimer = null;
      if (!this._unloaded) this.setData({ petBounce: false });
    }, 700);
    this._fxTimer = setTimeout(() => {
      this._fxTimer = null;
      if (!this._unloaded) this.setData({ showFx: false, fxEmoji: '', fxSparks: [] });
    }, 1300);
  },

  async onTapFood(e) {
    if (this.data.feedingKey || this.data.fedToday) return;
    const { key, name, qty } = e.currentTarget.dataset;
    if (!key || Number(qty) <= 0) return;

    const childId = resolveChildId();
    if (!childId) return;

    this.setData({
      feedingKey: key,
      feedError: '',
      feedResult: null
    });

    try {
      const res = await feedCare({ childId, food: key });
      if (this._unloaded) return;

      if (!res || !res.ok) {
        this.setData({
          feedingKey: '',
          feedError: (res && res.error) || '喂食失败，请重试'
        });
        return;
      }

      const friendship = typeof res.friendship === 'number' ? res.friendship : this.data.friendship;
      const hearts = typeof res.hearts === 'number' ? res.hearts : Math.floor(friendship / 51);
      const friendshipAwarded = typeof res.friendshipAwarded === 'number' ? res.friendshipAwarded : 10;
      const xpAwarded = typeof res.xpAwarded === 'number' ? res.xpAwarded : 0;

      this.setData({
        feedingKey: '',
        friendship,
        hearts,
        heartList: buildHeartList(hearts, friendship),
        feedResult: {
          foodName: name || '食物',
          friendshipAwarded,
          favorite: !!res.favorite,
          xpAwarded,
          levelText: formatLevelUp(res.level)
        }
      });

      const fedItem = (this.data.foods || []).find((it) => it.key === key);
      this.playCareFx('feed', !!res.favorite, fedItem ? fedItem.emoji : '');

      await this.refreshCareAndFriendship(childId);
    } catch (err) {
      if (this._unloaded) return;
      this.setData({
        feedingKey: '',
        feedError: (err && err.message) || '网络异常，喂食失败'
      });
    }
  },

  async onTapBath(e) {
    if (this.data.bathingKey || this.data.bathedToday) return;
    const { key, name, qty } = e.currentTarget.dataset;
    if (!key || Number(qty) <= 0) return;

    const childId = resolveChildId();
    if (!childId) return;

    this.setData({
      bathingKey: key,
      bathError: '',
      bathResult: null
    });

    try {
      const res = await bathCare({ childId, bath: key });
      if (this._unloaded) return;

      if (!res || !res.ok) {
        this.setData({
          bathingKey: '',
          bathError: (res && res.error) || '洗澡失败，请重试'
        });
        return;
      }

      const friendship = typeof res.friendship === 'number' ? res.friendship : this.data.friendship;
      const hearts = typeof res.hearts === 'number' ? res.hearts : Math.floor(friendship / 51);
      const friendshipAwarded = typeof res.friendshipAwarded === 'number' ? res.friendshipAwarded : 10;

      this.setData({
        bathingKey: '',
        friendship,
        hearts,
        heartList: buildHeartList(hearts, friendship),
        bathResult: {
          bathName: name || '洗澡',
          friendshipAwarded
        }
      });

      const bathItem = (this.data.baths || []).find((it) => it.key === key);
      this.playCareFx('bath', false, bathItem ? bathItem.emoji : '');

      await this.refreshCareAndFriendship(childId);
    } catch (err) {
      if (this._unloaded) return;
      this.setData({
        bathingKey: '',
        bathError: (err && err.message) || '网络异常，洗澡失败'
      });
    }
  },

  async onStartQa() {
    if (this.data.qaLoading || this.data.qaSubmitting) return;
    if (this.data.qaStatus.remainingToday <= 0) return;

    const childId = resolveChildId();
    if (!childId) return;

    this.setData({
      qaLoading: true,
      qaError: '',
      qaResult: null
    });

    try {
      const res = await getCareQaQuestion(childId);
      if (this._unloaded) return;

      if (!res || !res.ok) {
        this.setData({
          qaLoading: false,
          qaError: (res && res.error) || '暂时没有可用的题目'
        });
        return;
      }

      const friendship = typeof res.friendship === 'number' ? res.friendship : this.data.friendship;
      const hearts = typeof res.hearts === 'number' ? res.hearts : Math.floor(friendship / 51);

      this.setData({
        qaLoading: false,
        qaQuestion: res.question || null,
        qaResult: null,
        friendship,
        hearts,
        heartList: buildHeartList(hearts, friendship),
        qaStatus: {
          dailyLimit: this.data.qaStatus.dailyLimit || 3,
          answeredToday: typeof res.answeredToday === 'number' ? res.answeredToday : this.data.qaStatus.answeredToday,
          remainingToday: typeof res.remainingToday === 'number' ? res.remainingToday : this.data.qaStatus.remainingToday
        }
      });
    } catch (err) {
      if (this._unloaded) return;
      this.setData({
        qaLoading: false,
        qaError: (err && err.message) || '获取题目失败，请重试'
      });
    }
  },

  async onSelectQaOption(e) {
    if (this.data.qaSubmitting || this.data.qaLoading) return;
    if (!this.data.qaQuestion || (this.data.qaResult && this.data.qaResult.answered)) return;

    const answerIdx = Number(e.currentTarget.dataset.idx);
    if (Number.isNaN(answerIdx)) return;

    const childId = resolveChildId();
    if (!childId) return;

    this.setData({
      qaSubmitting: true,
      qaError: ''
    });

    try {
      const res = await answerCareQa({
        childId,
        questionId: this.data.qaQuestion.id,
        answerIdx
      });
      if (this._unloaded) return;

      if (!res || !res.ok) {
        this.setData({
          qaSubmitting: false,
          qaError: (res && res.error) || '提交答案失败，请重试'
        });
        return;
      }

      const friendship = typeof res.friendship === 'number' ? res.friendship : this.data.friendship;
      const hearts = typeof res.hearts === 'number' ? res.hearts : Math.floor(friendship / 51);

      this.setData({
        qaSubmitting: false,
        friendship,
        hearts,
        heartList: buildHeartList(hearts, friendship),
        qaStatus: {
          dailyLimit: this.data.qaStatus.dailyLimit || 3,
          answeredToday: typeof res.answeredToday === 'number' ? res.answeredToday : this.data.qaStatus.answeredToday + 1,
          remainingToday: typeof res.remainingToday === 'number' ? res.remainingToday : Math.max(0, this.data.qaStatus.remainingToday - 1)
        },
        qaResult: {
          answered: true,
          selectedIdx: answerIdx,
          correct: !!res.correct,
          correctIdx: typeof res.answerIdx === 'number' ? res.answerIdx : -1,
          explain: res.explain ? String(res.explain).trim() : '',
          xpAwarded: typeof res.xpAwarded === 'number' ? res.xpAwarded : 0,
          levelText: formatLevelUp(res.level)
        }
      });
    } catch (err) {
      if (this._unloaded) return;
      this.setData({
        qaSubmitting: false,
        qaError: (err && err.message) || '提交失败，请稍后重试'
      });
    }
  },

  async onSpinWheel() {
    if (this.data.spinning || this.data.wheelChances <= 0) return;

    const childId = resolveChildId();
    if (!childId) return;

    this.setData({
      spinning: true,
      wheelPrize: null,
      wheelError: ''
    });

    const delayPromise = new Promise((resolve) => {
      this._spinTimer = setTimeout(() => {
        this._spinTimer = null;
        resolve();
      }, 1000);
    });

    try {
      const [res] = await Promise.all([
        spinCareWheel({ childId }),
        delayPromise
      ]);

      if (this._unloaded) return;

      if (!res || !res.ok) {
        this.setData({
          spinning: false,
          wheelError: (res && res.error) || '抽奖失败，请稍后重试'
        });
        return;
      }

      const nextChances = typeof res.chancesLeft === 'number'
        ? res.chancesLeft
        : Math.max(0, this.data.wheelChances - 1);

      this.setData({
        spinning: false,
        wheelChances: nextChances,
        wheelPrize: res.prize || null,
        wheelError: ''
      });

      await this.refreshCareAndFriendship(childId);
    } catch (err) {
      await delayPromise;
      if (this._unloaded) return;
      this.setData({
        spinning: false,
        wheelError: (err && err.message) || '网络异常，抽奖失败'
      });
    }
  }
});
