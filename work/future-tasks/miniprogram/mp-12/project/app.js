App({
  globalData: {
    childId: null,
    lang: 'zh',
    famsess: null
  },

  onLaunch() {
    const famsess = wx.getStorageSync('famsess');
    const childId = wx.getStorageSync('childId');
    if (famsess && childId) {
      this.globalData.famsess = famsess;
      this.globalData.childId = childId;
      wx.switchTab({
        url: '/pages/home/home'
      });
    } else {
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }
  }
});
