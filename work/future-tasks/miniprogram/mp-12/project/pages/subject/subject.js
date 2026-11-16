const { submitCheckin, editCheckin } = require('../../utils/api');

Page({
  data: {
    subject: null,
    isApproved: false,
    note: '',
    photos: [],
    isSubmitting: false
  },
  onLoad() {
    const app = getApp();
    const subj = app.globalData.currentSubject;
    if (!subj) {
      wx.navigateBack();
      return;
    }
    const isApproved = subj.checkin && subj.checkin.status === 'approved';
    const note = subj.checkin ? (subj.checkin.note || '') : '';
    // 服务端照片只有 {id, contentType, size}，没有 data——先记 id，src 靠 downloadFile 拉回来
    const photos = subj.checkin && subj.checkin.photos
      ? subj.checkin.photos.map((p) => ({ id: p.id, src: '' }))
      : [];

    this.setData({ subject: subj, isApproved, note, photos });
    wx.setNavigationBarTitle({ title: `${subj.subject} 打卡` });
    this.loadPhotoImages();
  },
  // 已有照片要带 famsess Cookie 才能读：<image> 发不出自定义头，用 downloadFile 拉到本地临时文件再显示
  loadPhotoImages() {
    const app = getApp();
    const token = app.globalData.famsess || '';
    this.data.photos.forEach((p, idx) => {
      if (!p.id || p.src) return;
      wx.downloadFile({
        url: `https://example.com/api/photos/${p.id}`,
        header: { 'Cookie': `famsess=${token}` },
        success: (res) => {
          if (res.statusCode === 200) {
            const arr = [...this.data.photos];
            arr[idx] = { ...arr[idx], src: res.tempFilePath };
            this.setData({ photos: arr });
          }
        }
      });
    });
  },
  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },
  removePhoto(e) {
    const idx = e.currentTarget.dataset.index;
    const newPhotos = [...this.data.photos];
    newPhotos.splice(idx, 1);
    this.setData({ photos: newPhotos });
  },
  // 长边压到 1600px 再传（canvas 缩放）；canvas 失败时退回只压画质，不丢照片
  resizeTo1600(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: (info) => {
          let targetW = info.width;
          let targetH = info.height;
          const maxEdge = 1600;
          if (targetW > maxEdge || targetH > maxEdge) {
            if (targetW > targetH) {
              targetH = Math.round(targetH * maxEdge / targetW);
              targetW = maxEdge;
            } else {
              targetW = Math.round(targetW * maxEdge / targetH);
              targetH = maxEdge;
            }
          }
          wx.createSelectorQuery().select('#compressCanvas').fields({ node: true, size: true }).exec((queryRes) => {
            if (!queryRes || !queryRes[0] || !queryRes[0].node) {
              reject(new Error('canvas not ready'));
              return;
            }
            const canvas = queryRes[0].node;
            const ctx = canvas.getContext('2d');
            canvas.width = targetW;
            canvas.height = targetH;
            const img = canvas.createImage();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, targetW, targetH);
              wx.canvasToTempFilePath({
                canvas,
                x: 0, y: 0, width: targetW, height: targetH, destWidth: targetW, destHeight: targetH,
                success: resolve,
                fail: reject
              });
            };
            img.onerror = reject;
            img.src = src;
          });
        },
        fail: reject
      });
    });
  },
  addPhoto() {
    const maxCount = 3 - this.data.photos.length;
    if (maxCount <= 0) return;

    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        wx.showLoading({ title: '处理中...', mask: true });
        const fs = wx.getFileSystemManager();
        const newPhotos = [...this.data.photos];

        for (const file of res.tempFiles) {
          try {
            let src = file.tempFilePath;
            try {
              const resized = await this.resizeTo1600(file.tempFilePath);
              src = resized.tempFilePath;
            } catch (e) {
              console.warn('Canvas resize failed, fallback to direct compress', e);
            }
            const comp = await new Promise((resolve, reject) => {
              wx.compressImage({
                src,
                quality: 80,
                success: resolve,
                fail: reject
              });
            });
            const b64 = fs.readFileSync(comp.tempFilePath, 'base64');
            const dataUrl = `data:image/jpeg;base64,${b64}`;
            newPhotos.push({ data: dataUrl, src: dataUrl });
          } catch (e) {
            console.error('Photo processing failed', e);
          }
        }
        wx.hideLoading();
        this.setData({ photos: newPhotos });
      },
      fail: (err) => {
        console.error('chooseMedia failed', err);
      }
    });
  },
  async doSubmit() {
    if (this.data.isSubmitting) return;
    this.setData({ isSubmitting: true });

    try {
      const app = getApp();
      // 提交时只发最小形状：已有照片发 {id}（后端按 keepId 保留），新照片发 {data}
      const photos = this.data.photos.map((p) =>
        (p.id && !p.data) ? { id: p.id } : { data: p.data }
      );
      const note = this.data.note.trim();

      let res;
      if (this.data.subject.checkin && this.data.subject.checkin.status === 'pending') {
        // 编辑接口认 checkinId，不认 childId/subject——发错会 404 NOT_FOUND
        res = await editCheckin({
          checkinId: this.data.subject.checkin.id,
          note,
          photos
        });
      } else {
        res = await submitCheckin({
          childId: app.globalData.childId,
          subject: this.data.subject.subject,
          note,
          photos
        });
      }

      if (res.ok) {
        wx.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => { wx.navigateBack(); }, 1500);
      } else {
        wx.showModal({ title: '提交失败', content: res.error || '未知错误', showCancel: false });
        this.setData({ isSubmitting: false });
      }
    } catch (err) {
      if (err.message !== 'NEED_LOGIN') {
        wx.showModal({ title: '网络错误', content: err.message, showCancel: false });
      }
      this.setData({ isSubmitting: false });
    }
  }
});
