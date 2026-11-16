const { getChild, ackNotices, logout } = require('../../utils/api');

function noticeText(n) {
  const p = n.payload || {};
  if (n.kind === 'streak_box') {
    return `🎉 连续打卡 ${p.streak} 天！开箱奖励 +${p.xp} 经验，获得称号「${p.title || ''}」`;
  }
  if (n.kind === 'evolution') {
    return `✨ ${p.from || ''} 进化成了 ${p.to || ''}！`;
  }
  if (n.kind === 'evo-ready') {
    return `✨ 可以进化啦！伊布升到 16 级就能进化成${p.to || '仙子伊布'}！`;
  }
  return '💬 你有一条新消息';
}

Page({
  data: {
    child: null,
    errorMsg: '',
    showPrivacy: false
  },
  onShow() {
    this.checkPrivacyAuth();
    this.loadData();
  },
  // 隐私授权（MP-12）：录音/选照片是隐私接口，首次调用前须用户同意隐私指引。
  // 官方 demo1 做法：进首页先查 wx.getPrivacySetting，needAuthorization 时弹自定义弹窗；
  // 弹窗里的同意按钮须是 <button open-type="agreePrivacyAuthorization">，用户点后平台记下同意状态，
  // 之后录音/拍照接口才能调用。拒绝或暂不使用只关弹窗，下次进首页还会再弹；同意前调隐私接口会直接失败。
  checkPrivacyAuth() {
    if (typeof wx.getPrivacySetting !== 'function') return; // 基础库 < 2.32.3，无隐私拦截，不弹
    const that = this;
    wx.getPrivacySetting({
      success: function (res) {
        if (res && res.needAuthorization) {
          that.setData({ showPrivacy: true });
        }
      },
      fail: function () {}
    });
  },
  // 同意按钮点后触发：平台已记同意，直接关弹窗
  onAgreePrivacy() {
    this.setData({ showPrivacy: false });
  },
  // 暂不使用：只关弹窗，下次进首页 needAuthorization 仍为 true 会再弹
  onPrivacyLater() {
    this.setData({ showPrivacy: false });
  },
  // 查看指引全文
  openPrivacyContract() {
    if (typeof wx.openPrivacyContract === 'function') {
      wx.openPrivacyContract();
    }
  },
  async loadData() {
    try {
      const app = getApp();
      const res = await getChild(app.globalData.childId);
      if (res.ok && res.child) {
        const child = res.child;
        // XP 进度按后端给的本级内进度算（等级曲线是 20*L*(L-1)，不是每级 100）
        const span = child.xpForLevelSpan || 0;
        child.xpPercent = span > 0 ? Math.round(((child.xpIntoLevel || 0) / span) * 100) : 0;
        // 通知是 {id, kind, payload} 对象，按 kind 翻成一句话
        child.notices = (child.notices || []).map((n) => ({ ...n, text: noticeText(n) }));
        this.setData({ child, errorMsg: '' });
        // 显示完就确认掉，否则下次打开还会再弹一遍
        if (child.notices.length > 0) {
          const ids = child.notices.map((n) => n.id).filter(Boolean);
          if (ids.length > 0) {
            ackNotices({ ids }).catch(() => {});
          }
        }
      } else {
        this.setData({ errorMsg: res.error || '加载失败' });
      }
    } catch (err) {
      if (err.message !== 'NEED_LOGIN') {
        this.setData({ errorMsg: err.message });
      }
    }
  },
  goCheckin() {
    wx.switchTab({ url: '/pages/checkin/checkin' });
  },
  goQuiz() {
    wx.navigateTo({ url: '/pages/quiz/quiz' });
  },
  goDailyEnglish() {
    wx.navigateTo({ url: '/pages/daily-english/daily-english' });
  },
  goDailyPractice() {
    wx.navigateTo({ url: '/pages/daily-practice/daily-practice' });
  },
  goOak() {
    wx.navigateTo({ url: '/pages/oak/oak' });
  },
  goBackpack() {
    wx.navigateTo({ url: '/pages/backpack/backpack' });
  },
  goCare() {
    wx.navigateTo({ url: '/pages/care/care' });
  },
  // 退出登录：先调接口销会话，本地状态无论如何都清掉，再回到登录页
  async doLogout() {
    try {
      await logout();
    } catch (e) {
      console.warn('logout api failed, clearing local state anyway', e);
    }
    const app = getApp();
    if (app) {
      app.globalData.famsess = null;
      app.globalData.childId = null;
    }
    wx.removeStorageSync('famsess');
    wx.removeStorageSync('childId');
    wx.reLaunch({ url: '/pages/login/login' });
  }
});
