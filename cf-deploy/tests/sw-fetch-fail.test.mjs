import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const SW_SRC = readFileSync(
  new URL('../public/static/sw.js', import.meta.url),
  'utf8',
);

const AUDIO_URL =
  'https://test.local/static/audio/oak/ep-card-01__s001-n-0dbfe1.mp3';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function audioRequest() {
  return {
    url: AUDIO_URL,
    method: 'GET',
    mode: 'no-cors',
    destination: 'audio',
  };
}

function navigationRequest() {
  return {
    url: 'https://test.local/',
    method: 'GET',
    mode: 'navigate',
    destination: 'document',
  };
}

function apiRequest() {
  return {
    url: 'https://test.local/api/child?id=2',
    method: 'GET',
    mode: 'cors',
    destination: '',
  };
}

function createSandbox({
  fetchImpl,
  initialEntries = [],
  addDelayMs = 0,
  failAdd = () => false,
}) {
  const handlers = Object.create(null);
  const entries = new Map(initialEntries);
  const events = [];
  const stats = {
    calls: 0,
    addUrls: [],
    activeAdds: 0,
    maxConcurrentAdds: 0,
  };

  let ctx;

  function keyOf(req) {
    return typeof req === 'string' ? req : req.url;
  }

  const cache = {
    async match(req) {
      const response = entries.get(keyOf(req));
      return response ? response.clone() : undefined;
    },

    async put(req, res) {
      entries.set(keyOf(req), res.clone());
    },

    async add(url) {
      const index = stats.addUrls.length;
      stats.addUrls.push(url);
      stats.activeAdds += 1;
      stats.maxConcurrentAdds = Math.max(
        stats.maxConcurrentAdds,
        stats.activeAdds,
      );
      events.push({ type: 'add:start', url, index });

      try {
        const response = await ctx.fetch(url);
        if (addDelayMs > 0) {
          await delay(addDelayMs);
        }
        if (failAdd(url, index)) {
          throw new TypeError('Load failed');
        }
        if (!response.ok) {
          throw new TypeError(`Cache.add failed: ${response.status}`);
        }
        entries.set(keyOf(url), response.clone());
      } finally {
        stats.activeAdds -= 1;
        events.push({ type: 'add:end', url, index });
      }
    },
  };

  ctx = vm.createContext({
    self: {
      addEventListener(type, fn) {
        handlers[type] = fn;
      },
      skipWaiting() {
        events.push('skipWaiting');
        return Promise.resolve();
      },
      clients: {
        claim: async () => {},
      },
    },
    caches: {
      open: async () => cache,
      match: (req) => cache.match(req),
    },
    fetch: async (...args) => {
      stats.calls += 1;
      return fetchImpl(...args);
    },
    Response,
    Request,
    URL,
    setTimeout,
    console,
  });

  vm.runInContext(SW_SRC, ctx, { filename: 'sw.js' });

  return { handlers, entries, events, stats, cache, ctx };
}

function dispatchFetch(handlers, request) {
  let responded = null;
  handlers.fetch({
    request,
    respondWith(p) {
      responded = p;
    },
  });
  return responded;
}

function dispatchInstall(handlers) {
  let waited = null;
  handlers.install({
    waitUntil(p) {
      waited = p;
    },
  });
  return waited;
}

async function resolvedFetch(sandbox, request) {
  const responded = dispatchFetch(sandbox.handlers, request);
  assert.ok(responded && typeof responded.then === 'function');
  await assert.doesNotReject(() => responded);
  const response = await responded;
  assert.ok(response instanceof Response);
  return response;
}

async function resolvedInstall(sandbox) {
  const waited = dispatchInstall(sandbox.handlers);
  assert.ok(waited && typeof waited.then === 'function');
  await assert.doesNotReject(() => waited);
}

async function waitForCachedEntry(entries, url) {
  const deadline = Date.now() + 2000;
  while (!entries.has(url) && Date.now() < deadline) {
    await delay(5);
  }
  assert.ok(entries.has(url), `Expected cache entry for ${url}`);
}

function audioFileCount() {
  const arrayMatch = SW_SRC.match(
    /\bAUDIO_FILES\s*=\s*\[([\s\S]*?)\]/,
  );
  assert.ok(arrayMatch, 'AUDIO_FILES array must be present');
  return [...arrayMatch[1].matchAll(/(['"])\/static\/audio\/[^'"]+\1/g)]
    .length;
}

function assertInstallOrdering(sandbox, expectedCount) {
  const { events, stats } = sandbox;
  assert.equal(stats.addUrls.length, expectedCount);
  assert.equal(new Set(stats.addUrls).size, expectedCount);
  assert.equal(stats.activeAdds, 0);
  assert.ok(stats.maxConcurrentAdds <= 6);
  assert.equal(stats.maxConcurrentAdds, 6);

  const starts = new Map();
  const ends = new Map();

  events.forEach((event, position) => {
    if (event.type === 'add:start') {
      starts.set(event.index, position);
    } else if (event.type === 'add:end') {
      ends.set(event.index, position);
    }
  });

  assert.equal(starts.size, expectedCount);
  assert.equal(ends.size, expectedCount);

  for (let first = 0; first < expectedCount; first += 6) {
    const batchSize = Math.min(6, expectedCount - first);
    const batchIndices = Array.from(
      { length: batchSize },
      (_, offset) => first + offset,
    );
    const lastStart = Math.max(...batchIndices.map((i) => starts.get(i)));
    const firstEnd = Math.min(...batchIndices.map((i) => ends.get(i)));

    assert.ok(
      lastStart < firstEnd,
      `Batch starting at ${first} must launch before any member finishes`,
    );

    if (first > 0) {
      const previousIndices = Array.from(
        { length: 6 },
        (_, offset) => first - 6 + offset,
      );
      const previousLastEnd = Math.max(
        ...previousIndices.map((i) => ends.get(i)),
      );
      assert.ok(
        starts.get(first) > previousLastEnd,
        `Batch starting at ${first} must wait for the previous batch`,
      );
    }
  }

  assert.equal(events.filter((event) => event === 'skipWaiting').length, 1);
  assert.equal(events.at(-1), 'skipWaiting');
}

test('navigation fetch throws twice still resolves to offline page', async () => {
  const sandbox = createSandbox({
    fetchImpl: async () => {
      throw new TypeError('Load failed');
    },
  });

  const response = await resolvedFetch(sandbox, navigationRequest());

  assert.equal(sandbox.stats.calls, 2);
  assert.equal(response.status, 503);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/i);

  const body = await response.text();
  assert.match(body, /加载失败/);
  assert.match(body, /重新加载/);
});

test('audio fetch throws with empty cache resolves to 504', async () => {
  const sandbox = createSandbox({
    fetchImpl: async () => {
      throw new TypeError('Load failed');
    },
  });

  const response = await resolvedFetch(sandbox, audioRequest());

  assert.equal(response.status, 504);
  assert.equal(sandbox.stats.calls, 2);
  assert.equal(sandbox.entries.has(AUDIO_URL), false);
});

test('audio fetch throws with cached copy returns the cached copy', async () => {
  const sandbox = createSandbox({
    initialEntries: [
      [AUDIO_URL, new Response('cached-audio', { status: 200 })],
    ],
    fetchImpl: async () => {
      throw new TypeError('Load failed');
    },
  });

  const response = await resolvedFetch(sandbox, audioRequest());

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'cached-audio');
  assert.equal(sandbox.stats.calls, 0);
});

test('non-audio non-navigation fetch throws resolves to 504', async () => {
  const sandbox = createSandbox({
    fetchImpl: async () => {
      throw new TypeError('Load failed');
    },
  });

  const response = await resolvedFetch(sandbox, apiRequest());

  assert.equal(response.status, 504);
  assert.equal(sandbox.stats.calls, 2);
});

test('audio fetch fails once then succeeds on retry', async () => {
  let calls = 0;
  const sandbox = createSandbox({
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        throw new TypeError('Load failed');
      }
      return new Response('ok', { status: 200 });
    },
  });

  const response = await resolvedFetch(sandbox, audioRequest());

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'ok');
  assert.equal(calls, 2);
  assert.equal(sandbox.stats.calls, 2);

  await waitForCachedEntry(sandbox.entries, AUDIO_URL);
  const cached = await sandbox.cache.match(audioRequest());
  assert.ok(cached instanceof Response);
  assert.equal(cached.status, 200);
  assert.equal(await cached.text(), 'ok');
});

test('navigation fetch succeeds returns the network response', async () => {
  const sandbox = createSandbox({
    fetchImpl: async () => new Response('ok', { status: 200 }),
  });

  const response = await resolvedFetch(sandbox, navigationRequest());

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'ok');
  assert.equal(sandbox.stats.calls, 1);
});

test(
  'install precaches in batches of 6 and skipWaiting runs last',
  { timeout: 30_000 },
  async (t) => {
    const expectedCount = audioFileCount();
    assert.equal(expectedCount, 259);

    await t.test('all audio files are cached in sequential batches', async () => {
      const sandbox = createSandbox({
        fetchImpl: async () => new Response('ok', { status: 200 }),
        addDelayMs: 5,
      });

      await resolvedInstall(sandbox);

      assertInstallOrdering(sandbox, expectedCount);
      assert.equal(sandbox.stats.calls, expectedCount);
      assert.equal(sandbox.entries.size, expectedCount);
      for (const url of sandbox.stats.addUrls) {
        assert.ok(sandbox.entries.has(url), `Missing cached file: ${url}`);
      }
    });

    await t.test('one cache.add failure does not abort installation', async () => {
      const sandbox = createSandbox({
        fetchImpl: async () => new Response('ok', { status: 200 }),
        addDelayMs: 5,
        failAdd: (_url, index) => index === 0,
      });

      await resolvedInstall(sandbox);

      assertInstallOrdering(sandbox, expectedCount);
      assert.equal(sandbox.stats.calls, expectedCount);
      assert.equal(sandbox.entries.size, expectedCount - 1);

      const failedUrl = sandbox.stats.addUrls[0];
      assert.equal(sandbox.entries.has(failedUrl), false);
      for (const url of sandbox.stats.addUrls.slice(1)) {
        assert.ok(sandbox.entries.has(url), `Missing cached file: ${url}`);
      }
    });
  },
);
