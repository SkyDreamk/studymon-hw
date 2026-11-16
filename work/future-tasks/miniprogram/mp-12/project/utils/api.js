const BASE_URL = 'https://example.com';

function api(path, body = null) {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const headers = {
      'Content-Type': 'application/json'
    };

    if (app && app.globalData.famsess) {
      headers['Cookie'] = `famsess=${app.globalData.famsess}`;
    }

    wx.request({
      url: `${BASE_URL}${path}`,
      method: body ? 'POST' : 'GET',
      data: body,
      header: headers,
      success: (res) => {
        if (res.data && res.data.error === 'NEED_LOGIN') {
          if (app) {
            app.globalData.famsess = null;
            app.globalData.childId = null;
          }
          wx.removeStorageSync('famsess');
          wx.removeStorageSync('childId');
          wx.redirectTo({ url: '/pages/login/login' });
          reject(new Error('NEED_LOGIN'));
          return;
        }
        resolve({ data: res.data, header: res.header });
      },
      fail: (err) => {
        reject(new Error(err.errMsg || 'Network request failed'));
      }
    });
  }).then(res => res.data);
}

function login(childId, password) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/api/child/login`,
      method: 'POST',
      data: { childId, password },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        const setCookie = res.header['Set-Cookie'] || res.header['set-cookie'];
        if (setCookie) {
          const match = setCookie.match(/famsess=([^;]+)/);
          if (match) {
            const token = match[1];
            wx.setStorageSync('famsess', token);
            wx.setStorageSync('childId', childId);
            const app = getApp();
            if (app) {
              app.globalData.famsess = token;
              app.globalData.childId = childId;
            }
          }
        }
        resolve(res.data);
      },
      fail: (err) => {
        reject(new Error(err.errMsg || 'Network request failed'));
      }
    });
  });
}

function logout() {
  return api('/api/logout', {}).then((res) => {
    const app = getApp();
    if (app) {
      app.globalData.famsess = null;
      app.globalData.childId = null;
    }
    wx.removeStorageSync('famsess');
    wx.removeStorageSync('childId');
    return res;
  });
}

function getOverview() {
  return api('/api/overview');
}

function getChild(childId) {
  return api(`/api/child?id=${childId}`);
}

function submitCheckin(body) {
  return api('/api/checkin', body);
}

function editCheckin(body) {
  return api('/api/checkin/edit', body);
}

function getQuizToday(childId) {
  return api(`/api/quiz/today?child_id=${childId}`);
}

function answerQuiz(body) {
  return api('/api/quiz/answer', body);
}

function ackNotices(body) {
  return api('/api/notices/ack', body);
}

function upgradeMove(body) {
  return api('/api/quiz/upgrade-move', body);
}

function getDailyEnglish(childId) {
  return api(`/api/daily-english?child_id=${encodeURIComponent(childId)}`);
}

function checkinDailyEnglish(body) {
  return api('/api/daily-english/checkin', body);
}

function assessDailyEnglish(childId, refText, arrayBuffer) {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const token = (app && app.globalData.famsess) || wx.getStorageSync('famsess') || '';
    const header = {
      'Content-Type': 'audio/wav',
      'x-ref-text': encodeURIComponent(refText)
    };
    if (token) {
      header.Cookie = `famsess=${token}`;
    }

    wx.request({
      url: `${BASE_URL}/api/daily-english/assess?child_id=${encodeURIComponent(childId)}`,
      method: 'POST',
      data: arrayBuffer,
      header,
      success(res) {
        let data = res.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            data = { ok: false, error: 'bad_json' };
          }
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && data && data.ok) {
          resolve(data);
          return;
        }
        const errCode =
          (data && data.error) ||
          (res.statusCode === 404
            ? 'NOT_FOUND'
            : res.statusCode === 405
            ? 'METHOD'
            : res.statusCode === 502
            ? 'network'
            : `HTTP_${res.statusCode}`);
        reject({
          statusCode: res.statusCode,
          error: errCode,
          data: data || null
        });
      },
      fail(err) {
        reject({
          statusCode: 0,
          error: 'network',
          detail: err
        });
      }
    });
  });
}

function assessWav(path, childId, refText, arrayBuffer) {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const token = (app && app.globalData.famsess) || wx.getStorageSync('famsess') || '';
    const header = {
      'Content-Type': 'audio/wav',
      'x-ref-text': encodeURIComponent(refText)
    };
    if (token) {
      header.Cookie = `famsess=${token}`;
    }

    wx.request({
      url: `${BASE_URL}${path}?child_id=${encodeURIComponent(childId)}`,
      method: 'POST',
      data: arrayBuffer,
      header,
      success(res) {
        let data = res.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            data = { ok: false, error: 'bad_json' };
          }
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && data && data.ok) {
          resolve(data);
          return;
        }
        const errCode =
          (data && data.error) ||
          (res.statusCode === 404
            ? 'NOT_FOUND'
            : res.statusCode === 405
            ? 'METHOD'
            : res.statusCode === 502
            ? 'network'
            : `HTTP_${res.statusCode}`);
        reject({
          statusCode: res.statusCode,
          error: errCode,
          data: data || null
        });
      },
      fail(err) {
        reject({
          statusCode: 0,
          error: 'network',
          detail: err
        });
      }
    });
  });
}

function getDailyChinese(childId) {
  return api(`/api/daily-chinese?child_id=${encodeURIComponent(childId)}`);
}

function checkinDailyChinese(body) {
  return api('/api/daily-chinese/checkin', body);
}

function assessDailyChinese(childId, refText, arrayBuffer) {
  return assessWav('/api/daily-chinese/assess', childId, refText);
}

function getDailyMath(childId) {
  return api(`/api/daily-math?child_id=${encodeURIComponent(childId)}`);
}

function answerDailyMath(body) {
  return api('/api/daily-math/answer', body);
}

function checkinDailyMath(body) {
  return api('/api/daily-math/checkin', body);
}

function getOakToday(childId) {
  return api(`/api/oak/today?child_id=${encodeURIComponent(childId)}`);
}

function listenOak(body) {
  return api('/api/oak/listen', body);
}

function assessOak(childId, refText, arrayBuffer) {
  return assessWav('/api/oak/assess', childId, refText);
}

function getGymStatus(body) {
  return api('/api/gym/status', body);
}

function startGymBattle(body) {
  return api('/api/battle/gym/start', body);
}

function battleMove(body) {
  return api('/api/battle/move', body);
}

function getBattleState(body) {
  return api('/api/battle/state', body);
}

function abandonBattle(body) {
  return api('/api/battle/abandon', body);
}

function getPokedex(body) {
  return api('/api/pokedex', body);
}

function getBackpack(childId) {
  return api('/api/evo/backpack?childId=' + encodeURIComponent(childId));
}

function getCareStatus(childId) {
  return api('/api/care/status?childId=' + encodeURIComponent(childId));
}

function feedCare(body) {
  return api('/api/care/feed', body);
}

function bathCare(body) {
  return api('/api/care/bath', body);
}

function getCareQaStatus(childId) {
  return api('/api/care/qa/status?childId=' + encodeURIComponent(childId));
}

function getCareQaQuestion(childId) {
  return api('/api/care/qa/question?childId=' + encodeURIComponent(childId));
}

function answerCareQa(body) {
  return api('/api/care/qa/answer', body);
}

function spinCareWheel(body) {
  return api('/api/care-wheel/spin', body);
}

module.exports = {
  api,
  login,
  logout,
  getOverview,
  getChild,
  submitCheckin,
  editCheckin,
  getQuizToday,
  answerQuiz,
  ackNotices,
  upgradeMove,
  getDailyEnglish,
  checkinDailyEnglish,
  assessDailyEnglish,
  getDailyChinese,
  checkinDailyChinese,
  assessDailyChinese,
  getDailyMath,
  answerDailyMath,
  checkinDailyMath,
  getOakToday,
  listenOak,
  assessOak,
  getGymStatus,
  startGymBattle,
  battleMove,
  getBattleState,
  abandonBattle,
  getPokedex,
  getBackpack,
  getCareStatus,
  feedCare,
  bathCare,
  getCareQaStatus,
  getCareQaQuestion,
  answerCareQa,
  spinCareWheel
};
