const { login } = require('../../utils/api');

Page({
  data: {
    selectedChild: null,
    password: '',
    errorMsg: ''
  },
  selectChild(e) {
    this.setData({
      selectedChild: parseInt(e.currentTarget.dataset.id),
      errorMsg: '',
      password: ''
    });
  },
  goBack() {
    this.setData({ selectedChild: null, errorMsg: '', password: '' });
  },
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },
  async doLogin() {
    if (this.data.password.length !== 4) {
      this.setData({ errorMsg: '请输入 4 位密码' });
      return;
    }
    try {
      const res = await login(this.data.selectedChild, this.data.password);
      if (res.ok) {
        wx.switchTab({ url: '/pages/home/home' });
      } else if (res.error === 'PWD_WRONG') {
        this.setData({ errorMsg: `密码错误，还剩 ${res.attemptsLeft} 次机会` });
      } else if (res.error === 'CHILD_LOCKED') {
        this.setData({ errorMsg: `账号已锁定，请 ${Math.ceil((res.retryAfter || 300) / 60)} 分钟后再试` });
      } else if (res.error === 'PWD_NOT_SET') {
        this.setData({ errorMsg: '未设置密码，请家长在网页端设置' });
      } else if (res.error === 'NOT_FOUND') {
        this.setData({ errorMsg: '找不到这个孩子，请重新选择' });
      } else {
        this.setData({ errorMsg: res.error || '登录失败' });
      }
    } catch (err) {
      this.setData({ errorMsg: err.message });
    }
  }
});
