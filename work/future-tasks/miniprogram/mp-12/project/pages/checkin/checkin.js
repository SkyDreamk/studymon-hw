const { getChild } = require('../../utils/api');

Page({
  data: {
    child: null,
    subjects: [],
    errorMsg: ''
  },
  onShow() {
    this.loadData();
  },
  async loadData() {
    try {
      const app = getApp();
      const res = await getChild(app.globalData.childId);
      if (res.ok && res.child) {
        const parsedSubjects = (res.child.todaySubjects || []).map(s => {
          let pillText = '未提交';
          let pillClass = 'status-none';

          if (s.checkin) {
            if (s.checkin.status === 'pending') {
              pillText = '待审核';
              pillClass = 'status-pending';
            } else if (s.checkin.status === 'approved') {
              pillText = `已通过 +${s.checkin.xpAwarded || 0}`;
              pillClass = 'status-approved';
            } else if (s.checkin.status === 'rejected') {
              pillText = '被驳回';
              pillClass = 'status-rejected';
            }
          }
          return { ...s, pillText, pillClass };
        });
        this.setData({ child: res.child, subjects: parsedSubjects, errorMsg: '' });
      } else {
        this.setData({ errorMsg: res.error || '加载失败' });
      }
    } catch (err) {
      if (err.message !== 'NEED_LOGIN') {
        this.setData({ errorMsg: err.message });
      }
    }
  },
  goDetail(e) {
    const idx = e.currentTarget.dataset.index;
    const app = getApp();
    app.globalData.currentSubject = this.data.subjects[idx];
    wx.navigateTo({ url: '/pages/subject/subject' });
  }
});
