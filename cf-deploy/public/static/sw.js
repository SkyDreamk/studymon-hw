// 打卡大冒险 service worker
// 作用：满足 Android Chrome 的 PWA 可安装性要求（清单 + 图标 + service worker 三件套），
// 使「添加到主屏幕」生成全屏独立应用而不是浏览器书签。
// 策略：仅音频预缓存并优先读取缓存；其余请求网络直通，避免孩子端看到旧版本。
const AUDIO_CACHE = 'sm-audio-v1';
const AUDIO_FILES = ["/static/audio/moves/m001.mp3", "/static/audio/moves/m002.mp3", "/static/audio/moves/m003.mp3", "/static/audio/moves/m004.mp3", "/static/audio/moves/m005.mp3", "/static/audio/moves/m006.mp3", "/static/audio/moves/m007.mp3", "/static/audio/moves/m008.mp3", "/static/audio/moves/m009.mp3", "/static/audio/moves/m010.mp3", "/static/audio/moves/m011.mp3", "/static/audio/moves/m012.mp3", "/static/audio/moves/m013.mp3", "/static/audio/moves/m014.mp3", "/static/audio/moves/m015.mp3", "/static/audio/moves/m016.mp3", "/static/audio/moves/m017.mp3", "/static/audio/moves/m018.mp3", "/static/audio/moves/m019.mp3", "/static/audio/moves/m020.mp3", "/static/audio/moves/m021.mp3", "/static/audio/moves/m022.mp3", "/static/audio/moves/m023.mp3", "/static/audio/moves/m024.mp3", "/static/audio/moves/m025.mp3", "/static/audio/moves/m026.mp3", "/static/audio/moves/m027.mp3", "/static/audio/moves/m028.mp3", "/static/audio/moves/m029.mp3", "/static/audio/moves/m030.mp3", "/static/audio/moves/m031.mp3", "/static/audio/moves/m032.mp3", "/static/audio/moves/m033.mp3", "/static/audio/moves/m034.mp3", "/static/audio/moves/m035.mp3", "/static/audio/moves/m036.mp3", "/static/audio/moves/m037.mp3", "/static/audio/moves/m038.mp3", "/static/audio/moves/m039.mp3", "/static/audio/moves/m040.mp3", "/static/audio/moves/m041.mp3", "/static/audio/moves/m042.mp3", "/static/audio/moves/m043.mp3", "/static/audio/moves/m044.mp3", "/static/audio/moves/m045.mp3", "/static/audio/moves/m046.mp3", "/static/audio/moves/m047.mp3", "/static/audio/moves/m048.mp3", "/static/audio/moves/m049.mp3", "/static/audio/moves/m050.mp3", "/static/audio/moves/m051.mp3", "/static/audio/moves/m052.mp3", "/static/audio/moves/m053.mp3", "/static/audio/moves/m054.mp3", "/static/audio/moves/m055.mp3", "/static/audio/moves/m056.mp3", "/static/audio/moves/m057.mp3", "/static/audio/moves/m058.mp3", "/static/audio/moves/m059.mp3", "/static/audio/moves/m060.mp3", "/static/audio/moves/m061.mp3", "/static/audio/moves/m062.mp3", "/static/audio/moves/m063.mp3", "/static/audio/moves/m064.mp3", "/static/audio/moves/m065.mp3", "/static/audio/moves/m066.mp3", "/static/audio/moves/m067.mp3", "/static/audio/moves/m068.mp3", "/static/audio/moves/m069.mp3", "/static/audio/moves/m070.mp3", "/static/audio/moves/m071.mp3", "/static/audio/moves/m072.mp3", "/static/audio/moves/m073.mp3", "/static/audio/moves/m074.mp3", "/static/audio/moves/m075.mp3", "/static/audio/moves/m076.mp3", "/static/audio/moves/m077.mp3", "/static/audio/moves/m078.mp3", "/static/audio/moves/m079.mp3", "/static/audio/moves/m080.mp3", "/static/audio/moves/m081.mp3", "/static/audio/moves/m082.mp3", "/static/audio/moves/m083.mp3", "/static/audio/moves/m084.mp3", "/static/audio/moves/manifest.json", "/static/audio/oak/ep-card-01__s001-n-0dbfe1.mp3", "/static/audio/oak/ep-card-01__s002-n-49f0f0.mp3", "/static/audio/oak/ep-card-01__s003-n-b9a731.mp3", "/static/audio/oak/ep-card-01__s004-n-8ada93.mp3", "/static/audio/oak/ep-card-01__s005-n-d54db8.mp3", "/static/audio/oak/ep-card-01__s006-n-111d70.mp3", "/static/audio/oak/ep-card-03__s001-n-4cbc6d.mp3", "/static/audio/oak/ep-card-03__s002-n-fb1880.mp3", "/static/audio/oak/ep-card-03__s003-n-6d8f33.mp3", "/static/audio/oak/ep-card-03__s004-n-4ecdb7.mp3", "/static/audio/oak/ep-card-03__s005-n-1b54ba.mp3", "/static/audio/oak/ep-card-03__s006-n-26f3dc.mp3", "/static/audio/oak/ep-pep1-u1__s001-n-bbeeb5.mp3", "/static/audio/oak/ep-pep1-u1__s002-n-c3cab5.mp3", "/static/audio/oak/ep-pep1-u1__s003-n-98d69e.mp3", "/static/audio/oak/ep-pep1-u1__s004-n-1b245d.mp3", "/static/audio/oak/ep-pep1-u1__s005-n-efa42e.mp3", "/static/audio/oak/ep-pep1-u1__s006-n-019e6d.mp3", "/static/audio/oak/ep-pep1-u2__s001-n-7ea4b8.mp3", "/static/audio/oak/ep-pep1-u2__s002-n-d91b05.mp3", "/static/audio/oak/ep-pep1-u2__s003-n-ca2f4a.mp3", "/static/audio/oak/ep-pep1-u2__s004-n-cf335c.mp3", "/static/audio/oak/ep-pep1-u2__s005-n-fb3743.mp3", "/static/audio/oak/ep-pep1-u2__s006-n-0343c9.mp3", "/static/audio/oak/ep-pep1-u3__s001-n-4101a2.mp3", "/static/audio/oak/ep-pep1-u3__s002-n-b13e6b.mp3", "/static/audio/oak/ep-pep1-u3__s003-n-74ef97.mp3", "/static/audio/oak/ep-pep1-u3__s004-n-27f6d7.mp3", "/static/audio/oak/ep-pep1-u3__s005-n-fb9d87.mp3", "/static/audio/oak/ep-pep1-u3__s006-n-62c027.mp3", "/static/audio/oak/ep-pep1-u4__s001-n-cc94d2.mp3", "/static/audio/oak/ep-pep1-u4__s002-n-7236c8.mp3", "/static/audio/oak/ep-pep1-u4__s003-n-0b889b.mp3", "/static/audio/oak/ep-pep1-u4__s004-n-de8634.mp3", "/static/audio/oak/ep-pep1-u4__s005-n-48fd4b.mp3", "/static/audio/oak/ep-pep1-u4__s006-n-71568d.mp3", "/static/audio/oak/ep-pep1-u5__s001-n-8eeafc.mp3", "/static/audio/oak/ep-pep1-u5__s002-n-5f63c4.mp3", "/static/audio/oak/ep-pep1-u5__s003-n-dc4ff0.mp3", "/static/audio/oak/ep-pep1-u5__s004-n-cca695.mp3", "/static/audio/oak/ep-pep1-u5__s005-n-33edcb.mp3", "/static/audio/oak/ep-pep1-u5__s006-n-03db57.mp3", "/static/audio/oak/ep-pep1-u6__s001-n-6c0cbc.mp3", "/static/audio/oak/ep-pep1-u6__s002-n-075e52.mp3", "/static/audio/oak/ep-pep1-u6__s003-n-332e32.mp3", "/static/audio/oak/ep-pep1-u6__s004-n-918365.mp3", "/static/audio/oak/ep-pep1-u6__s005-n-1c34b6.mp3", "/static/audio/oak/ep-pep1-u6__s006-n-02c1c0.mp3", "/static/audio/oak/ep-pep1b-u1__s001-n-03db57.mp3", "/static/audio/oak/ep-pep1b-u1__s002-n-7e8359.mp3", "/static/audio/oak/ep-pep1b-u1__s003-n-f2a992.mp3", "/static/audio/oak/ep-pep1b-u1__s004-n-8ea1c8.mp3", "/static/audio/oak/ep-pep1b-u1__s005-n-6c7a23.mp3", "/static/audio/oak/ep-pep1b-u1__s006-n-459785.mp3", "/static/audio/oak/ep-pep1b-u2__s001-n-3f60a2.mp3", "/static/audio/oak/ep-pep1b-u2__s002-n-60c7aa.mp3", "/static/audio/oak/ep-pep1b-u2__s003-n-5624d5.mp3", "/static/audio/oak/ep-pep1b-u2__s004-n-aec563.mp3", "/static/audio/oak/ep-pep1b-u2__s005-n-c0a0db.mp3", "/static/audio/oak/ep-pep1b-u2__s006-n-97e70f.mp3", "/static/audio/oak/ep-pep1b-u3__s001-n-ab2c7f.mp3", "/static/audio/oak/ep-pep1b-u3__s002-n-e809a6.mp3", "/static/audio/oak/ep-pep1b-u3__s003-n-4fee88.mp3", "/static/audio/oak/ep-pep1b-u3__s004-n-030803.mp3", "/static/audio/oak/ep-pep1b-u3__s005-n-3bae88.mp3", "/static/audio/oak/ep-pep1b-u3__s006-n-ec4876.mp3", "/static/audio/oak/ep-pep1b-u4__s001-n-8e999a.mp3", "/static/audio/oak/ep-pep1b-u4__s002-n-8ea3dc.mp3", "/static/audio/oak/ep-pep1b-u4__s003-n-7cdb03.mp3", "/static/audio/oak/ep-pep1b-u4__s004-n-75e496.mp3", "/static/audio/oak/ep-pep1b-u4__s005-n-1f0cf4.mp3", "/static/audio/oak/ep-pep1b-u4__s006-n-df62c7.mp3", "/static/audio/oak/ep-pep1b-u5__s001-n-0ceb10.mp3", "/static/audio/oak/ep-pep1b-u5__s002-n-49a069.mp3", "/static/audio/oak/ep-pep1b-u5__s003-n-47fd72.mp3", "/static/audio/oak/ep-pep1b-u5__s004-n-345ce1.mp3", "/static/audio/oak/ep-pep1b-u5__s005-n-aa54ca.mp3", "/static/audio/oak/ep-pep1b-u5__s006-n-dd6eb8.mp3", "/static/audio/oak/ep-pep1b-u6__s001-n-86880c.mp3", "/static/audio/oak/ep-pep1b-u6__s002-n-a3729f.mp3", "/static/audio/oak/ep-pep1b-u6__s003-n-ca733d.mp3", "/static/audio/oak/ep-pep1b-u6__s004-n-5420a8.mp3", "/static/audio/oak/ep-pep1b-u6__s005-n-58b45c.mp3", "/static/audio/oak/ep-pep1b-u6__s006-n-09172a.mp3", "/static/audio/oak/ep-pep3-u1__s001-n-8d1930.mp3", "/static/audio/oak/ep-pep3-u1__s002-n-5314fe.mp3", "/static/audio/oak/ep-pep3-u1__s003-n-f2b6dd.mp3", "/static/audio/oak/ep-pep3-u1__s004-n-1e2da6.mp3", "/static/audio/oak/ep-pep3-u1__s005-n-64dcb5.mp3", "/static/audio/oak/ep-pep3-u1__s006-n-517b2e.mp3", "/static/audio/oak/ep-pep3-u2__s001-n-ef279e.mp3", "/static/audio/oak/ep-pep3-u2__s002-n-1c8e23.mp3", "/static/audio/oak/ep-pep3-u2__s003-n-3e598e.mp3", "/static/audio/oak/ep-pep3-u2__s004-n-f2b6dd.mp3", "/static/audio/oak/ep-pep3-u2__s005-n-a1175a.mp3", "/static/audio/oak/ep-pep3-u2__s006-n-d16231.mp3", "/static/audio/oak/ep-pep3-u3__s001-n-3f98e8.mp3", "/static/audio/oak/ep-pep3-u3__s002-n-761c32.mp3", "/static/audio/oak/ep-pep3-u3__s003-n-fe5de7.mp3", "/static/audio/oak/ep-pep3-u3__s004-n-f16daf.mp3", "/static/audio/oak/ep-pep3-u3__s005-n-ca0a2c.mp3", "/static/audio/oak/ep-pep3-u3__s006-n-3c43c3.mp3", "/static/audio/oak/ep-pep3-u4__s001-n-5624c4.mp3", "/static/audio/oak/ep-pep3-u4__s002-n-f7590b.mp3", "/static/audio/oak/ep-pep3-u4__s003-n-85398f.mp3", "/static/audio/oak/ep-pep3-u4__s004-n-a7a391.mp3", "/static/audio/oak/ep-pep3-u4__s005-n-18826f.mp3", "/static/audio/oak/ep-pep3-u4__s006-n-b08ebc.mp3", "/static/audio/oak/ep-pep3-u5__s001-n-6d6b9e.mp3", "/static/audio/oak/ep-pep3-u5__s002-n-6488e4.mp3", "/static/audio/oak/ep-pep3-u5__s003-n-6d6b9e.mp3", "/static/audio/oak/ep-pep3-u5__s004-n-74ef97.mp3", "/static/audio/oak/ep-pep3-u5__s005-n-bf1aa4.mp3", "/static/audio/oak/ep-pep3-u5__s006-n-45fff8.mp3", "/static/audio/oak/ep-pep3-u6__s001-n-856602.mp3", "/static/audio/oak/ep-pep3-u6__s002-n-3658df.mp3", "/static/audio/oak/ep-pep3-u6__s003-n-217c86.mp3", "/static/audio/oak/ep-pep3-u6__s004-n-f6c275.mp3", "/static/audio/oak/ep-pep3-u6__s005-n-adedea.mp3", "/static/audio/oak/ep-pep3-u6__s006-n-15be53.mp3", "/static/audio/oak/ep-pep3a-u3__s001-n-2ab2b8.mp3", "/static/audio/oak/ep-pep3a-u3__s002-n-f3256c.mp3", "/static/audio/oak/ep-pep3a-u3__s003-n-25fa12.mp3", "/static/audio/oak/ep-pep3a-u3__s004-n-112e9b.mp3", "/static/audio/oak/ep-pep3a-u3__s005-n-52b796.mp3", "/static/audio/oak/ep-pep3a-u3__s006-n-3cf78c.mp3", "/static/audio/oak/ep-pep3b-u1__s001-n-a75e1a.mp3", "/static/audio/oak/ep-pep3b-u1__s002-n-92fdd4.mp3", "/static/audio/oak/ep-pep3b-u1__s003-n-5dcedf.mp3", "/static/audio/oak/ep-pep3b-u1__s004-n-5f96e8.mp3", "/static/audio/oak/ep-pep3b-u1__s005-n-d6c284.mp3", "/static/audio/oak/ep-pep3b-u1__s006-n-9cd298.mp3", "/static/audio/oak/ep-pep3b-u2__s001-n-964e5f.mp3", "/static/audio/oak/ep-pep3b-u2__s002-n-b4f25e.mp3", "/static/audio/oak/ep-pep3b-u2__s003-n-011270.mp3", "/static/audio/oak/ep-pep3b-u2__s004-n-0a9a6f.mp3", "/static/audio/oak/ep-pep3b-u2__s005-n-e211d7.mp3", "/static/audio/oak/ep-pep3b-u2__s006-n-7ea122.mp3", "/static/audio/oak/ep-pep3b-u3__s001-n-630391.mp3", "/static/audio/oak/ep-pep3b-u3__s002-n-441519.mp3", "/static/audio/oak/ep-pep3b-u3__s003-n-33459f.mp3", "/static/audio/oak/ep-pep3b-u3__s004-n-1c1470.mp3", "/static/audio/oak/ep-pep3b-u3__s005-n-c60f7a.mp3", "/static/audio/oak/ep-pep3b-u3__s006-n-cb4e04.mp3", "/static/audio/oak/ep-pep3b-u4__s001-n-04776e.mp3", "/static/audio/oak/ep-pep3b-u4__s002-n-a58e79.mp3", "/static/audio/oak/ep-pep3b-u4__s003-n-52e329.mp3", "/static/audio/oak/ep-pep3b-u4__s004-n-b30582.mp3", "/static/audio/oak/ep-pep3b-u4__s005-n-694fe0.mp3", "/static/audio/oak/ep-pep3b-u4__s006-n-8fda75.mp3", "/static/audio/oak/ep-pep3b-u5__s001-n-8cd620.mp3", "/static/audio/oak/ep-pep3b-u5__s002-n-26b8fd.mp3", "/static/audio/oak/ep-pep3b-u5__s003-n-ad518a.mp3", "/static/audio/oak/ep-pep3b-u5__s004-n-33fa4f.mp3", "/static/audio/oak/ep-pep3b-u5__s005-n-73fb73.mp3", "/static/audio/oak/ep-pep3b-u5__s006-n-a5db2c.mp3", "/static/audio/oak/ep-pep3b-u6__s001-n-ea7ef1.mp3", "/static/audio/oak/ep-pep3b-u6__s002-n-255545.mp3", "/static/audio/oak/ep-pep3b-u6__s003-n-1ed6c4.mp3", "/static/audio/oak/ep-pep3b-u6__s004-n-db3ded.mp3", "/static/audio/oak/ep-pep3b-u6__s005-n-eb6b32.mp3", "/static/audio/oak/ep-pep3b-u6__s006-n-d92da0.mp3", "/static/audio/oak/ep-starter-hello__s001-n-d19399.mp3", "/static/audio/oak/ep-starter-hello__s002-n-019e6d.mp3", "/static/audio/oak/ep-starter-hello__s003-n-cb0797.mp3", "/static/audio/oak/ep-starter-hello__s004-n-c39323.mp3", "/static/audio/oak/ep-starter-hello__s005-n-67e1f9.mp3", "/static/audio/oak/ep-starter-hello__s006-n-ab2c7f.mp3", "/static/audio/oak/ep-video-firstnight__s001-n-4637ee.mp3", "/static/audio/oak/ep-video-firstnight__s002-n-847c9b.mp3", "/static/audio/oak/ep-video-firstnight__s003-n-a76176.mp3", "/static/audio/oak/ep-video-firstnight__s004-n-aba03d.mp3", "/static/audio/oak/ep-video-firstnight__s005-n-0e278e.mp3", "/static/audio/oak/ep-video-firstnight__s006-n-fe627d.mp3"];

const OFFLINE_HTML = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>加载失败</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;margin:0;padding:40px 24px;text-align:center;color:#555}h1{font-size:20px;color:#333}button{margin-top:16px;padding:10px 24px;font-size:16px;border-radius:8px;border:1px solid #ccc;background:#fff}</style></head><body><h1>加载失败</h1><p>网络连接失败，请检查网络后重试。</p><button type="button" onclick="location.reload()">重新加载</button></body></html>';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FETCH_TIMEOUT_MS = 8000;

// 单次请求超时：只等响应头，超时即 abort 走原失败路径，避免旧 SW 把导航无限挂起；无 AbortController 的环境走原逻辑
function fetchOnce(request) {
  if (typeof AbortController === 'undefined') return fetch(request);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(request, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function fetchWithRetry(request) {
  try {
    return await fetchOnce(request);
  } catch (e) {
    await sleep(300);
    return fetchOnce(request);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(AUDIO_CACHE);
      const BATCH = 6;
      for (let i = 0; i < AUDIO_FILES.length; i += BATCH) {
        await Promise.all(
          AUDIO_FILES.slice(i, i + BATCH).map((u) => cache.add(u).catch(() => {})),
        );
      }
    } catch (e) {}
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== AUDIO_CACHE).map((k) => caches.delete(k)));
  } catch (e) {}
  await self.clients.claim();
})()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && url.pathname.startsWith('/static/audio/')) {
    event.respondWith((async () => {
      try {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        let res;
        try {
          res = await fetchWithRetry(event.request);
        } catch (e) {
          const fallback = await caches.match(event.request, { ignoreSearch: true }).catch(() => undefined);
          return fallback || new Response(null, { status: 504 });
        }
        if (res && res.ok) {
          try {
            const cache = await caches.open(AUDIO_CACHE);
            await cache.put(event.request, res.clone());
          } catch (e) {}
        }
        return res;
      } catch (e) {
        try {
          const fallback = await caches.match(event.request, { ignoreSearch: true });
          if (fallback) return fallback;
        } catch (e2) {}
        return new Response(null, { status: 504 });
      }
    })());
    return;
  }
  event.respondWith((async () => {
    try {
      return await fetchWithRetry(event.request);
    } catch (e) {
      if (event.request.mode === 'navigate' || event.request.destination === 'document') {
        return new Response(OFFLINE_HTML, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return new Response(null, { status: 504 });
    }
  })());
});
