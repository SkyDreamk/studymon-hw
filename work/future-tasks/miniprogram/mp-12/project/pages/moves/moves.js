const { getChild, upgradeMove } = require('../../utils/api');

Page({
  data: {
    loaded: false,
    fragments: 0,
    moves: [],
    upgrading: false,
    errorMsg: ''
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    const app = getApp();
    try {
      const res = await getChild(app.globalData.childId);
      if (res.ok && res.child) {
        const fragments = (res.child.quiz && typeof res.child.quiz.fragments === 'number')
          ? res.child.quiz.fragments
          : 0;
        const rawMoves = Array.isArray(res.child.moves) ? res.child.moves : [];
        const moves = rawMoves
          .filter(m => !m.fairy)
          .map(m => ({
            ...m,
            skillLevel: Number(m.skillLevel) || 1
          }));
        this.setData({
          loaded: true,
          fragments,
          moves,
          errorMsg: ''
        });
      } else {
        this.setData({
          loaded: true,
          errorMsg: res.error || '加载失败'
        });
      }
    } catch (err) {
      if (err.message !== 'NEED_LOGIN') {
        this.setData({
          loaded: true,
          errorMsg: err.message
        });
      }
    }
  },

  onTapUpgrade(e) {
    if (this.data.upgrading) return;
    const idx = e.currentTarget.dataset.index;
    const move = this.data.moves[idx];
    if (!move || move.skillLevel >= 5 || this.data.fragments < 3) return;

    const curLv = move.skillLevel;
    const nextLv = curLv + 1;
    wx.showModal({
      title: '确认升级',
      content: `花 3 枚碎片把「${move.name}」从技能 Lv.${curLv} 升到 Lv.${nextLv}？`,
      success: (modalRes) => {
        if (modalRes.confirm) {
          this.doUpgrade(idx, move.name);
        }
      }
    });
  },

  async doUpgrade(idx, moveName) {
    const app = getApp();
    this.setData({ upgrading: true });
    try {
      const res = await upgradeMove({
        childId: app.globalData.childId,
        moveName
      });

      if (res.ok && res.move) {
        const updatedMoves = [...this.data.moves];
        if (updatedMoves[idx]) {
          updatedMoves[idx] = {
            ...updatedMoves[idx],
            ...res.move,
            skillLevel: Number(res.move.skillLevel) || updatedMoves[idx].skillLevel
          };
        }
        const nextFragments = typeof res.quizFragments === 'number'
          ? res.quizFragments
          : this.data.fragments;

        this.setData({
          moves: updatedMoves,
          fragments: nextFragments,
          upgrading: false
        });

        wx.showModal({
          title: '升级成功',
          content: `「${res.move.name}」升到技能 Lv.${res.move.skillLevel}！还剩 ${nextFragments} 枚碎片`,
          showCancel: false
        });
      } else {
        this.setData({ upgrading: false });
        wx.showModal({
          title: '提示',
          content: res.error || '升级失败',
          showCancel: false,
          success: () => {
            this.loadData();
          }
        });
      }
    } catch (err) {
      this.setData({ upgrading: false });
      if (err.message !== 'NEED_LOGIN') {
        wx.showModal({
          title: '网络错误',
          content: err.message,
          showCancel: false
        });
      }
    }
  }
});
