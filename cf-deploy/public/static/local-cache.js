/**
 * 打卡站客户端本地缓存：Cloudflare Worker + D1 + IndexedDB 单页应用。
 * 库名：sm-local；SCHEMA_VERSION=1。
 * 日期：2026-10-28。
 * 第 1 部分：共享脚手架、静默重建、全量保存、快照及题库读取、
 * 完整标志、待同步计数与按孩子清理；第 2 部分通过 Object.assign 合并 API。
 * 本文件使用浏览器全局脚本加载，不使用 ESM export。
 */

const DB_NAME = 'sm-local';
const SCHEMA_VERSION = 1;
const CHILD_STORES = ['checkins','quiz_attempts','encounters','wheel_chances','quiz_daily','ball_drops','ball_grants','battles','gym_battles','pokedex','sealed_eggs','child_notices','checkin_photos','quiz_diagnoses','oak_assessments','oak_draws','school_test_records','unit_tests','unit_test_draws'];
const GLOBAL_STORES = ['quiz_questions','settings'];
const KEY_PATHS = {
  children: 'child_id', quiz_questions: 'id', settings: 'key',
  pokedex: ['child_id','entry_key'],
  oak_assessments: ['child_id','question_id','date_shanghai'],
  meta: 'child_id', outbox: 'cmd_id', pending_photos: 'id',
};
const DEFAULT_KEY_PATH = ['child_id','id']; // 其余 17 个业务 store

const _STORE_NAMES = [
  'children',
  ...CHILD_STORES,
  ...GLOBAL_STORES,
  'meta',
  'outbox',
  'pending_photos',
];

let _dbp = null;
const _txCompletions = new WeakMap();

function _keyPathFor(store) {
  return KEY_PATHS[store] || DEFAULT_KEY_PATH;
}

// 所有 IDBRequest 均由此封装；不取消 error 的默认行为，保留事务自动回滚。
function _req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
      request.error || new Error('INDEXEDDB_REQUEST_FAILED')
    );
  });
}

async function _openOnce() {
  if (typeof indexedDB === 'undefined') {
    throw new Error('INDEXEDDB_UNAVAILABLE');
  }

  const request = indexedDB.open(DB_NAME, SCHEMA_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    const tx = request.transaction;

    // 22 个业务 store 与 3 个系统 store，使用约定的主键。
    for (const name of _STORE_NAMES) {
      const store = db.objectStoreNames.contains(name)
        ? tx.objectStore(name)
        : db.createObjectStore(name, { keyPath: _keyPathFor(name) });

      // children 已以 child_id 为主键；全局 store 不建立 by_child。
      // meta、outbox、pending_photos 和全部 CHILD_STORES 建立孩子索引。
      if (
        name !== 'children' &&
        !GLOBAL_STORES.includes(name) &&
        !store.indexNames.contains('by_child')
      ) {
        store.createIndex('by_child', 'child_id', { unique: false });
      }
    }
  };

  return _req(request);
}

async function _deleteDatabase() {
  if (typeof indexedDB === 'undefined') {
    throw new Error('INDEXEDDB_UNAVAILABLE');
  }
  await _req(indexedDB.deleteDatabase(DB_NAME));
}

function open() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('INDEXEDDB_UNAVAILABLE'));
  }
  if (_dbp) {
    return _dbp;
  }

  const promise = (async () => {
    let rebuilt = false;

    while (true) {
      let db;
      try {
        db = await _openOnce();
      } catch (error) {
        // 设计⑧B：较新客户端留下的高版本库，静默删库重建一次。
        if (!rebuilt && error && error.name === 'VersionError') {
          rebuilt = true;
          await _deleteDatabase();
          continue;
        }
        throw error;
      }

      const missing = _STORE_NAMES.some(
        (name) => !db.objectStoreNames.contains(name)
      );
      if (missing) {
        db.close();
        // 设计⑧B：同版本但缺少 store 的库也静默重建，不弹窗。
        if (rebuilt) {
          throw new Error('INDEXEDDB_SCHEMA_INCOMPLETE');
        }
        rebuilt = true;
        await _deleteDatabase();
        continue;
      }

      // 让其他页面升级或重建库；下次调用重新打开。
      db.onversionchange = () => {
        db.close();
        if (_dbp === promise) {
          _dbp = null;
        }
      };
      return db;
    }
  })();

  _dbp = promise;
  promise.catch(() => {
    if (_dbp === promise) {
      _dbp = null;
    }
  });
  return promise;
}

async function _tx(storeNames, mode) {
  const db = await open();
  const tx = db.transaction(storeNames, mode);

  // 请求成功不代表事务已经提交，立即登记终态监听，防止遗漏完成事件。
  const completion = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(
      tx.error || new Error('INDEXEDDB_TRANSACTION_ABORTED')
    );
    // 请求错误会冒泡到事务；最终结果由 complete/abort 决定。
    tx.onerror = () => {};
  });
  completion.catch(() => {});
  _txCompletions.set(tx, completion);
  return { db, tx };
}

function _all(store, indexName, keyRange) {
  const source = indexName ? store.index(indexName) : store;
  return _req(
    keyRange === undefined ? source.getAll() : source.getAll(keyRange)
  );
}

async function _withTransaction(storeNames, mode, work) {
  const { tx } = await _tx(storeNames, mode);
  const completion = _txCompletions.get(tx);
  try {
    const result = await work(tx);
    await completion;
    return result;
  } catch (error) {
    // 同步构造请求失败或异步请求失败，都必须回滚已排入的写入。
    try {
      tx.abort();
    } catch (_) {
      // 已完成或已中止的事务无需再次中止。
    }
    try {
      await completion;
    } catch (_) {
      // 保留触发本次失败的原始错误。
    }
    throw error;
  }
}

async function isComplete(childId) {
  return _withTransaction(['meta'], 'readonly', async (tx) => {
    const meta = await _req(tx.objectStore('meta').get(childId));
    return !!meta && meta.complete === true;
  });
}

async function saveFull(childId, data) {
  return _withTransaction(
    ['children', 'quiz_questions', 'pokedex', 'meta'],
    'readwrite',
    async (tx) => {
      const child = { ...data.child };
      if (child.child_id === undefined) {
        child.child_id = childId;
      }

      // 全量数据与完整标志在同一事务提交，任何一步失败均整体回滚。
      const writes = [_req(tx.objectStore('children').put(child))];
      const questions = tx.objectStore('quiz_questions');
      for (const question of data.questions ?? []) {
        writes.push(_req(questions.put(question)));
      }

      const pokedex = tx.objectStore('pokedex');
      for (const entry of data.pokedex ?? []) {
        writes.push(_req(pokedex.put({ ...entry, child_id: childId })));
      }

      writes.push(_req(tx.objectStore('meta').put({
        child_id: childId,
        sync_version: data.syncVersion ?? 0,
        complete: true,
        updated_at: Date.now(),
        gym_status: data.gymStatus ?? null,
        pvp_status: data.pvpStatus ?? null,
        quiz_today: data.quizToday ?? null,
      })));

      const results = await Promise.allSettled(writes);
      const error = results.find((result) => result.status === 'rejected');
      if (error) {
        throw error.reason;
      }
      return { ok: true };
    }
  );
}

async function getSnapshot(childId) {
  // 同一 readonly 事务保证孩子、图鉴及状态来自一致的快照。
  return _withTransaction(
    ['children', 'pokedex', 'meta'],
    'readonly',
    async (tx) => {
      const [child, pokedex, storedMeta] = await Promise.all([
        _req(tx.objectStore('children').get(childId)),
        _all(tx.objectStore('pokedex'), 'by_child', childId),
        _req(tx.objectStore('meta').get(childId)),
      ]);
      const meta = storedMeta ?? {};
      return {
        child: child ?? null,
        pokedex,
        gymStatus: meta.gym_status ?? null,
        pvpStatus: meta.pvp_status ?? null,
        quizToday: meta.quiz_today ?? null,
        syncVersion: meta.sync_version ?? 0,
        complete: !!meta.complete,
      };
    }
  );
}

async function getQuestions() {
  return _withTransaction(['quiz_questions'], 'readonly', (tx) =>
    _all(tx.objectStore('quiz_questions'))
  );
}

async function pendingCount(childId) {
  return _withTransaction(['outbox'], 'readonly', (tx) =>
    _req(tx.objectStore('outbox').index('by_child').count(childId))
  );
}

async function clearChild(childId) {
  // 设计⑦A：命令永不丢弃，故不触碰 outbox。
  // pending_photos 另行处理；题库和 settings 为全局数据，也不触碰。
  return _withTransaction(
    [...CHILD_STORES, 'children', 'meta'],
    'readwrite',
    async (tx) => {
      const results = await Promise.allSettled([
        ...CHILD_STORES.map(async (name) => {
          const store = tx.objectStore(name);
          // 索引 getAllKeys 返回主键，包括复合主键；只删当前孩子的行。
          const keys = await _req(store.index('by_child').getAllKeys(childId));
          const deleteResults = await Promise.allSettled(keys.map((key) => _req(store.delete(key))));
          const deleteError = deleteResults.find((result) => result.status === 'rejected');
          if (deleteError) {
            throw deleteError.reason;
          }
          return keys.length;
        }),
        ...['children', 'meta'].map(async (name) => {
          const store = tx.objectStore(name);
          const key = await _req(store.getKey(childId));
          if (key === undefined) {
            return 0;
          }
          await _req(store.delete(key));
          return 1;
        }),
      ]);

      const error = results.find((result) => result.status === 'rejected');
      if (error) {
        throw error.reason;
      }
      const counts = results.map((result) => result.value);

      return { deleted: counts.reduce((total, count) => total + count, 0) };
    }
  );
}

const LocalCache = { open, isComplete, saveFull, getSnapshot, getQuestions, pendingCount, clearChild };

/* ⑦A：命令永不丢弃、永不过期；业务预演由调用方完成，此处仅入队。 */
async function enqueue(childId, type, payload) {
  const cmd_id = _uuid();
  await _cachePart2Transaction(['outbox'], 'readwrite', async (tx) => {
    await _req(tx.objectStore('outbox').put({
      cmd_id,
      child_id: childId,
      type,
      payload,
      created_at: Date.now(),
      tries: 0,
      status: 'pending'
    }));
  });
  return cmd_id;
}

function _uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (_) {
      // 非安全上下文等情况下，回退到 Math.random 拼 UUID。
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : ((random & 3) | 8)).toString(16);
  });
}

/* 所有写操作等待事务提交；⑧B：失败时整体回滚，不能提前报告版本推进。 */
async function _cachePart2Transaction(storeNames, mode, work) {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable');
  }

  const { tx } = await _tx(storeNames, mode);
  const completed = new Promise((resolve, reject) => {
    tx.addEventListener('complete', () => resolve(), { once: true });
    tx.addEventListener('abort', () => {
      reject(tx.error || new Error('IndexedDB transaction aborted'));
    }, { once: true });
  });
  // 请求失败可能先于 await completed，立即安装处理器避免未处理拒绝。
  completed.catch(() => {});

  try {
    const result = await work(tx);
    await completed;
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch (_) {
      // 事务可能已经自动回滚或完成。
    }
    await completed.catch(() => {});
    throw error;
  }
}

function _cachePart2CreatedOrder(a, b) {
  return (Number(a.created_at) || 0) - (Number(b.created_at) || 0);
}

let _outboxFlushing = null;

/* 全局共享一次 flush，避免不同孩子同时同步时重复提交或回写已删除命令。 */
function flushOutbox(fetchFn) {
  if (_outboxFlushing) {
    return _outboxFlushing;
  }

  const promise = Promise.resolve().then(async () => {
    const commands = await _cachePart2Transaction(['outbox'], 'readonly', (tx) => {
      return _req(tx.objectStore('outbox').getAll());
    });
    commands.sort(_cachePart2CreatedOrder);

    const blockedChildren = new Set();
    let sent = 0;
    let failed = 0;

    for (const command of commands) {
      if (blockedChildren.has(command.child_id)) {
        continue;
      }

      let accepted = false;
      try {
        const response = await fetchFn('/api/commands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cmd_id: command.cmd_id,
            child_id: command.child_id,
            type: command.type,
            payload: command.payload
          })
        });
        if (response.ok) {
          const body = await response.json();
          accepted = Boolean(body && body.ok);
        }
      } catch (_) {
        accepted = false;
      }

      if (accepted) {
        // ⑦A：仅服务端明确确认成功后删除命令。
        await _cachePart2Transaction(['outbox'], 'readwrite', (tx) => {
          return _req(tx.objectStore('outbox').delete(command.cmd_id));
        });
        sent += 1;
      } else {
        // ⑦A：失败仅增加重试次数，永不删除；阻断同孩子后续命令以保序。
        await _cachePart2Transaction(['outbox'], 'readwrite', async (tx) => {
          const store = tx.objectStore('outbox');
          const current = await _req(store.get(command.cmd_id));
          if (current) {
            await _req(store.put({
              ...current,
              tries: (Number(current.tries) || 0) + 1
            }));
          }
        });
        blockedChildren.add(command.child_id);
        failed += 1;
      }
    }

    return { sent, failed };
  }).finally(() => {
    if (_outboxFlushing === promise) {
      _outboxFlushing = null;
    }
  });

  _outboxFlushing = promise;
  return promise;
}

/* 增量行与版本同事务提交；⑧B：任何步骤失败，版本和业务数据一起回滚。 */
async function applySync(childId, syncResp) {
  if (!syncResp || typeof syncResp !== 'object' ||
      !Object.prototype.hasOwnProperty.call(syncResp, 'version')) {
    throw new Error('Invalid sync response');
  }

  const changed = syncResp.changed || {};
  const deleted = syncResp.deleted || {};
  const allowed = new Set(['children', ...CHILD_STORES, ...GLOBAL_STORES]);
  const tables = [...new Set([
    ...Object.keys(changed),
    ...Object.keys(deleted)
  ])].filter((table) => allowed.has(table));

  await _cachePart2Transaction([...tables, 'meta'], 'readwrite', async (tx) => {
    for (const table of tables) {
      const store = tx.objectStore(table);

      if (Object.prototype.hasOwnProperty.call(changed, table)) {
        if (!Array.isArray(changed[table])) {
          throw new Error('Invalid changed rows for ' + table);
        }
        for (const source of changed[table]) {
          if (!source || typeof source !== 'object' || Array.isArray(source)) {
            throw new Error('Invalid sync row for ' + table);
          }
          const row = { ...source };
          const _kp = _keyPathFor(table);
          const _needsChild = _kp === 'child_id' || (Array.isArray(_kp) && _kp.indexOf('child_id') !== -1);
          if (row.child_id === undefined && _needsChild) {
            row.child_id = childId;
          }
          // 服务端整行覆盖预演行；回填确认后不保留本地 pending 标记。
          if (row._local === 'pending') {
            delete row._local;
          }
          // children 行是数据库原始行（无 sealedEggs／form／moves 等计算字段），
          // 不能整行覆盖 saveFull 存的 /api/child 完整对象，否则快照降级成子集、
          // goChild 读 k.sealedEggs.length 即崩。服务端字段优先（新鲜 DB 列），
          // 行里没有的计算字段从已存对象保留；lcRefreshAggregates 每次同步后都会
          // 重拉完整对象再存，保留的计算字段至多滞后一个同步周期。
          if (table === 'children') {
            // DB 的 titles／stickers／unlocked_moves／fairy_moves 列是 JSON 文本，
            // 直接合会把完整对象里的已解析数组覆盖成字符串（titles.map 即抛错）；
            // 先解析成数组再合，解析失败或结果非数组则丢弃该列、保留已存值。
            for (const key of ['titles', 'stickers', 'unlocked_moves', 'fairy_moves']) {
              if (typeof row[key] === 'string') {
                try { row[key] = JSON.parse(row[key]); } catch (_) { delete row[key]; continue; }
                if (!Array.isArray(row[key])) delete row[key];
              }
            }
            const existing = await _req(store.get(row.child_id));
            await _req(store.put(existing ? { ...existing, ...row } : row));
          } else {
            await _req(store.put(row));
          }
        }
      }

      if (Object.prototype.hasOwnProperty.call(deleted, table)) {
        if (!Array.isArray(deleted[table])) {
          throw new Error('Invalid deleted keys for ' + table);
        }
        const keyPath = _keyPathFor(table);
        for (const id of deleted[table]) {
          // 完整复合键直接使用；普通孩子业务表的标量 id 补齐 child_id。
          let key = id;
          if (Array.isArray(keyPath) && !Array.isArray(id)) {
            if (keyPath.length === 2 && keyPath[0] === 'child_id') {
              key = [childId, id];
            } else {
              throw new Error('Composite deletion key required for ' + table);
            }
          }
          await _req(store.delete(key));
        }
      }
    }

    const metaStore = tx.objectStore('meta');
    const previous = await _req(metaStore.get(childId));
    // 保留 complete、gym_status、pvp_status、quiz_today 及其他原有元数据。
    await _req(metaStore.put({
      ...(previous || {}),
      child_id: childId,
      sync_version: syncResp.version
    }));
  });

  return { ok: true, version: syncResp.version };
}

const _syncing = new Map();

/* 同一孩子共享同一个 Promise；先上传命令，再以已提交版本获取增量。 */
function syncNow(childId, fetchFn) {
  if (_syncing.has(childId)) {
    return _syncing.get(childId);
  }

  const promise = Promise.resolve().then(async () => {
    await flushOutbox(fetchFn);

    const meta = await _cachePart2Transaction(['meta'], 'readonly', (tx) => {
      return _req(tx.objectStore('meta').get(childId));
    });
    const version = meta && meta.sync_version !== undefined
      ? meta.sync_version
      : 0;
    const response = await fetchFn(
      '/api/sync?since=' + encodeURIComponent(String(version)) +
      '&child_id=' + encodeURIComponent(String(childId)),
      { method: 'GET' }
    );
    if (!response.ok) {
      // ⑧B：获取增量失败，不触碰本地版本。
      throw new Error('Sync request failed: ' + response.status);
    }

    return applySync(childId, await response.json());
  }).finally(() => {
    if (_syncing.get(childId) === promise) {
      _syncing.delete(childId);
    }
  });

  _syncing.set(childId, promise);
  return promise;
}

/* ④A：离线照片独立持久化，只有上传明确成功后才移除。 */
async function queuePhoto(childId, checkinLocalId, name, blob) {
  const id = _uuid();
  await _cachePart2Transaction(['pending_photos'], 'readwrite', (tx) => {
    return _req(tx.objectStore('pending_photos').put({
      id,
      child_id: childId,
      checkin_local_id: checkinLocalId,
      name,
      blob,
      created_at: Date.now()
    }));
  });
  return id;
}

async function _cachePart2PhotoBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123' + '456789+/';
  const chunks = [];
  let chunk = '';

  // 逐字节编码为标准 base64；不使用 FileReader 或大数组展开。
  for (let i = 0; i < bytes.length; i += 3) {
    const first = bytes[i];
    const hasSecond = i + 1 < bytes.length;
    const hasThird = i + 2 < bytes.length;
    const second = hasSecond ? bytes[i + 1] : 0;
    const third = hasThird ? bytes[i + 2] : 0;

    chunk += alphabet[first >> 2] +
      alphabet[((first & 3) << 4) | (second >> 4)] +
      (hasSecond ? alphabet[((second & 15) << 2) | (third >> 6)] : '=') +
      (hasThird ? alphabet[third & 63] : '=');

    if (chunk.length >= 16384) {
      chunks.push(chunk);
      chunk = '';
    }
  }
  if (chunk) {
    chunks.push(chunk);
  }
  return chunks.join('');
}

let _photosFlushing = null;

function flushPhotos(fetchFn) {
  if (_photosFlushing) {
    return _photosFlushing;
  }

  const promise = Promise.resolve().then(async () => {
    const photos = await _cachePart2Transaction(['pending_photos'], 'readonly', (tx) => {
      return _req(tx.objectStore('pending_photos').getAll());
    });
    photos.sort(_cachePart2CreatedOrder);

    const results = [];
    for (const photo of photos) {
      try {
        const data_b64 = await _cachePart2PhotoBase64(photo.blob);
        const response = await fetchFn('/api/photo/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: photo.child_id,
            checkin_id: photo.checkin_local_id,
            name: photo.name,
            data_b64
          })
        });
        if (!response.ok) {
          throw new Error('Photo upload failed: ' + response.status);
        }
        const body = await response.json();
        if (!body || !body.ok || !body.url) {
          throw new Error(
            body && body.error ? String(body.error) : 'Photo upload was not confirmed'
          );
        }

        // ④A：成功确认且带 url 才删除；本地删除失败仍保留以供重试。
        await _cachePart2Transaction(['pending_photos'], 'readwrite', (tx) => {
          return _req(tx.objectStore('pending_photos').delete(photo.id));
        });
        results.push({ id: photo.id, ok: true, url: body.url });
      } catch (error) {
        // ④A：单张失败不影响其他照片，失败记录保持持久化。
        results.push({
          id: photo.id,
          ok: false,
          error: error && error.message ? error.message : String(error)
        });
      }
    }
    return results;
  }).finally(() => {
    if (_photosFlushing === promise) {
      _photosFlushing = null;
    }
  });

  _photosFlushing = promise;
  return promise;
}

async function pendingPhotos(childId) {
  const photos = await _cachePart2Transaction(['pending_photos'], 'readonly', (tx) => {
    return _req(tx.objectStore('pending_photos').index('by_child').getAll(childId));
  });
  return photos.sort(_cachePart2CreatedOrder);
}

Object.assign(LocalCache, { enqueue, flushOutbox, applySync, syncNow, queuePhoto, flushPhotos, pendingPhotos });
if (typeof window !== 'undefined') { window.LocalCache = LocalCache; }
