import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sourceUrl = new URL('../public/static/local-cache.js', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8');

const clone = (value) => structuredClone(value);
const encodeKey = (key) => JSON.stringify(key);

function keyFor(value, keyPath) {
  const key = Array.isArray(keyPath)
    ? keyPath.map((part) => value[part])
    : value[keyPath];

  if (
    key === undefined ||
    (Array.isArray(key) && key.some((part) => part === undefined))
  ) {
    throw new Error('DataError: missing key');
  }
  return key;
}

function createFakeIndexedDB() {
  let database;

  function storeView(definition, rows, transaction) {
    const request = (work) => transaction.request(work);
    const matching = (keyPath, query) => [...rows.values()].filter((row) =>
      query === undefined ||
      encodeKey(keyFor(row, keyPath)) === encodeKey(query)
    );

    return {
      keyPath: definition.keyPath,
      indexNames: {
        contains: (name) => definition.indexes.has(name),
      },
      createIndex(name, keyPath) {
        definition.indexes.set(name, keyPath);
      },
      get(key) {
        return request(() => clone(rows.get(encodeKey(key))));
      },
      getKey(key) {
        return request(() => rows.has(encodeKey(key)) ? clone(key) : undefined);
      },
      put(value) {
        // IDB 在创建请求时捕获输入值，而非等待异步请求完成。
        const saved = clone(value);
        return request(() => {
          transaction.assertWritable();
          const key = keyFor(saved, definition.keyPath);
          rows.set(encodeKey(key), saved);
          return clone(key);
        });
      },
      delete(key) {
        return request(() => {
          transaction.assertWritable();
          rows.delete(encodeKey(key));
          return undefined;
        });
      },
      getAll(query) {
        return request(() => clone(matching(definition.keyPath, query)));
      },
      index(name) {
        if (!definition.indexes.has(name)) {
          throw new Error('NotFoundError: index ' + name);
        }
        const keyPath = definition.indexes.get(name);
        return {
          getAll(query) {
            return request(() => clone(matching(keyPath, query)));
          },
          count(query) {
            return request(() => matching(keyPath, query).length);
          },
          getAllKeys(query) {
            return request(() => matching(keyPath, query).map((row) =>
              clone(keyFor(row, definition.keyPath))
            ));
          },
        };
      },
    };
  }

  function createTransaction(db, names, mode) {
    const definitions = new Map();
    const working = new Map();
    const listeners = new Map();
    let pending = 0;
    let active = true;
    let completionTimer;

    for (const name of typeof names === 'string' ? [names] : names) {
      const definition = db.stores.get(name);
      if (!definition) {
        throw new Error('NotFoundError: store ' + name);
      }
      definitions.set(name, definition);
      working.set(name, clone(definition.rows));
    }

    function emit(type) {
      const event = { type, target: tx };
      tx['on' + type]?.(event);
      for (const listener of listeners.get(type) ?? []) {
        listener(event);
      }
    }

    function scheduleCompletion() {
      clearImmediate(completionTimer);
      if (!active || pending !== 0) return;

      completionTimer = setImmediate(() => {
        if (!active || pending !== 0) return;
        if (mode === 'readwrite') {
          for (const [name, rows] of working) {
            definitions.get(name).rows = rows;
          }
        }
        active = false;
        emit('complete');
      });
    }

    const tx = {
      error: null,
      oncomplete: null,
      onabort: null,
      onerror: null,
      addEventListener(type, listener) {
        const entries = listeners.get(type) ?? [];
        entries.push(listener);
        listeners.set(type, entries);
      },
      assertWritable() {
        if (mode !== 'readwrite') {
          throw new Error('ReadOnlyError');
        }
      },
      objectStore(name) {
        if (!active) throw new Error('TransactionInactiveError');
        if (!definitions.has(name)) {
          throw new Error('NotFoundError: store ' + name);
        }
        return storeView(definitions.get(name), working.get(name), tx);
      },
      request(work) {
        if (!active) throw new Error('TransactionInactiveError');
        clearImmediate(completionTimer);
        pending += 1;
        const request = {
          result: undefined,
          error: null,
          onsuccess: null,
          onerror: null,
        };

        setImmediate(() => {
          if (!active) return;
          try {
            request.result = work();
          } catch (error) {
            request.error = error;
            tx.error = error;
            request.onerror?.({ type: 'error', target: request });
            emit('error');
            tx.abort();
            return;
          }

          pending -= 1;
          request.onsuccess?.({ type: 'success', target: request });
          // 后续 await 的微任务可继续排请求，并取消此完成任务。
          scheduleCompletion();
        });

        return request;
      },
      abort() {
        if (!active) throw new Error('InvalidStateError');
        active = false;
        clearImmediate(completionTimer);
        setImmediate(() => emit('abort'));
      },
    };

    scheduleCompletion();
    return tx;
  }

  function createDatabase() {
    const stores = new Map();
    const db = {
      stores,
      objectStoreNames: {
        contains: (name) => stores.has(name),
      },
      createObjectStore(name, { keyPath }) {
        if (stores.has(name)) throw new Error('ConstraintError');
        const definition = {
          keyPath,
          indexes: new Map(),
          rows: new Map(),
        };
        stores.set(name, definition);
        return storeView(definition, definition.rows, null);
      },
      transaction(names, mode) {
        return createTransaction(db, names, mode);
      },
      close() {},
    };
    return db;
  }

  return {
    open() {
      const request = {
        result: undefined,
        transaction: undefined,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };

      setImmediate(() => {
        try {
          const upgrade = !database;
          database ??= createDatabase();
          request.result = database;
          request.transaction = {
            objectStore(name) {
              const definition = database.stores.get(name);
              if (!definition) throw new Error('NotFoundError');
              return storeView(definition, definition.rows, null);
            },
          };
          if (upgrade) {
            request.onupgradeneeded?.({
              type: 'upgradeneeded',
              target: request,
            });
          }
        } catch (error) {
          request.error = error;
          request.onerror?.({ type: 'error', target: request });
          return;
        }
        request.onsuccess?.({ type: 'success', target: request });
      });

      return request;
    },
  };
}

function loadCache() {
  const context = vm.createContext({
    indexedDB: createFakeIndexedDB(),
    window: {},
    fetch() {
      throw new Error('Network calls are forbidden in this test');
    },
  });
  vm.runInContext(source, context, { filename: sourceUrl.pathname });
  return context.window.LocalCache;
}

function fullData() {
  return {
    child: {
      id: 1,
      name: '小智',
      line: 'pikachu',
      sealedEggs: [{ id: 1 }],
      form: { formName: '皮卡丘' },
      hatchedEggs: [{ id: 2 }],
      moves: [{ name: '撞击' }],
      quiz: { fragments: 1 },
      quizToday: { answered: 2 },
      oakToday: { answered: 1 },
      level: 10,
      xpToNext: 120,
      totalXp: 1000,
      total_xp: 1000,
    },
    questions: [],
    pokedex: [],
    syncVersion: 4,
    gymStatus: { won: 1 },
    pvpStatus: { won: 2 },
    quizToday: { answered: 2 },
  };
}

function syncResponse(rows, version = 5, table = 'children') {
  return {
    version,
    changed: { [table]: rows },
    deleted: {},
  };
}

// 仅用于读取 getSnapshot 不暴露的业务行与原始 meta；不直接写 fake 数据。
async function readStored(cache, table, key) {
  const db = await cache.open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([table], 'readonly');
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
    tx.onerror = () => {};
    const request = tx.objectStore(table).get(key);
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error);
  });
}

test('children 增量保留完整对象的计算字段，并更新数据库列', async () => {
  const cache = loadCache();
  const data = fullData();
  await cache.saveFull(1, data);

  await cache.applySync(1, syncResponse([{
    id: 1,
    child_id: 1,
    name: '小智',
    total_xp: 1120,
    ver: 5,
    updated_epoch: 1,
  }]));

  const snapshot = clone(await cache.getSnapshot(1));
  for (const field of [
    'sealedEggs', 'form', 'hatchedEggs', 'moves', 'quiz',
    'quizToday', 'oakToday', 'level', 'xpToNext', 'totalXp',
  ]) {
    assert.deepEqual(snapshot.child[field], data.child[field], field);
  }
  assert.equal(snapshot.child.total_xp, 1120);
  assert.equal(snapshot.child.ver, 5);
  assert.equal(snapshot.child.updated_epoch, 1);
  assert.equal(snapshot.child.sealedEggs.length, 1);
});

test('无已存 children 行时直接存入，并补齐 child_id', async () => {
  const cache = loadCache();
  const row = {
    id: 1,
    name: '小智',
    total_xp: 1120,
    ver: 5,
    updated_epoch: 1,
  };

  await cache.applySync(1, syncResponse([row]));

  const snapshot = clone(await cache.getSnapshot(1));
  assert.deepEqual(snapshot.child, { ...row, child_id: 1 });
  assert.equal(snapshot.syncVersion, 5);
  assert.equal(snapshot.complete, false);
});

test('数据库 line 优先覆盖，sealedEggs 仍保留', async () => {
  const cache = loadCache();
  const data = fullData();
  await cache.saveFull(1, data);

  // 真实数据库行不带 child_id，合并读取必须使用规范化后的 key。
  await cache.applySync(1, syncResponse([{
    id: 1,
    line: 'charmander',
    total_xp: 1120,
  }]));

  const snapshot = clone(await cache.getSnapshot(1));
  assert.equal(snapshot.child.child_id, 1);
  assert.equal(snapshot.child.line, 'charmander');
  assert.deepEqual(snapshot.child.sealedEggs, data.child.sealedEggs);
});

test('非 children 表仍整行覆盖，并去掉 pending 标记', async () => {
  const cache = loadCache();
  const data = fullData();
  await cache.saveFull(1, data);

  await cache.applySync(1, syncResponse([{
    id: 7,
    value: 'old',
    localOnly: 'must disappear',
    _local: 'pending',
  }], 5, 'checkins'));

  const row = {
    id: 7,
    value: 'server',
    updated_epoch: 2,
    _local: 'pending',
  };
  await cache.applySync(1, syncResponse([row], 6, 'checkins'));

  const stored = await readStored(cache, 'checkins', [1, 7]);
  assert.deepEqual(stored, {
    id: 7,
    child_id: 1,
    value: 'server',
    updated_epoch: 2,
  });
  assert.equal(Object.hasOwn(stored, '_local'), false);
  assert.equal(Object.hasOwn(stored, 'localOnly'), false);
  assert.equal(row._local, 'pending');

  const snapshot = clone(await cache.getSnapshot(1));
  assert.deepEqual(snapshot.child, { ...data.child, child_id: 1 });
  assert.equal(snapshot.syncVersion, 6);
  assert.equal(snapshot.complete, true);
});

test('applySync 推进 meta.sync_version，并保留 complete 和其他元数据', async () => {
  const cache = loadCache();
  await cache.saveFull(1, fullData());
  const before = await readStored(cache, 'meta', 1);

  await cache.applySync(1, syncResponse([{
    id: 1,
    total_xp: 1120,
  }], 9));

  const after = await readStored(cache, 'meta', 1);
  assert.deepEqual(after, { ...before, sync_version: 9 });
  assert.equal(after.complete, true);

  const snapshot = clone(await cache.getSnapshot(1));
  assert.equal(snapshot.syncVersion, 9);
  assert.equal(snapshot.complete, true);
  assert.deepEqual(snapshot.gymStatus, before.gym_status);
  assert.deepEqual(snapshot.pvpStatus, before.pvp_status);
  assert.deepEqual(snapshot.quizToday, before.quiz_today);
  assert.equal(await cache.isComplete(1), true);
});

test('children 行的 JSON 文本列解析成数组再合并', async () => {
  const cache = loadCache();
  const data = fullData();
  data.child.titles = ['冠军'];
  data.child.stickers = ['★'];
  await cache.saveFull(1, data);

  await cache.applySync(1, syncResponse([{
    id: 1,
    child_id: 1,
    titles: '["冠军","新星"]',
    stickers: '["★","月"]',
    unlocked_moves: '["电光一闪"]',
    fairy_moves: '[]',
    total_xp: 1120,
  }]));

  const snapshot = clone(await cache.getSnapshot(1));
  assert.deepEqual(snapshot.child.titles, ['冠军', '新星']);
  assert.deepEqual(snapshot.child.stickers, ['★', '月']);
  assert.deepEqual(snapshot.child.unlocked_moves, ['电光一闪']);
  assert.deepEqual(snapshot.child.fairy_moves, []);
  assert.deepEqual(snapshot.child.sealedEggs, data.child.sealedEggs);
});

test('JSON 文本列解析失败或非数组时保留已存值', async () => {
  const cache = loadCache();
  const data = fullData();
  data.child.titles = ['冠军'];
  await cache.saveFull(1, data);

  await cache.applySync(1, syncResponse([{
    id: 1,
    child_id: 1,
    titles: 'not-json{{',
    stickers: '"just-a-string"',
  }]));

  const snapshot = clone(await cache.getSnapshot(1));
  assert.deepEqual(snapshot.child.titles, ['冠军']);
  assert.equal(snapshot.child.stickers, undefined);
});
