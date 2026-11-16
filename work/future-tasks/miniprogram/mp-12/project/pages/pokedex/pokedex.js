const { getPokedex } = require('../../utils/api');

const BASE_URL = 'https://example.com';

function resolveImg(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) {
    return url;
  }
  if (url.charAt(0) === '/') {
    return BASE_URL + url;
  }
  return BASE_URL + '/' + url;
}

function padNo(no) {
  if (no === null || no === undefined || no === '') return '';
  const n = String(no);
  if (n.length === 1) return '00' + n;
  if (n.length === 2) return '0' + n;
  return n;
}

function resolveChildId() {
  const app = getApp();
  const gd = (app && app.globalData) || {};
  if (gd.childId) return gd.childId;
  if (gd.child && gd.child.id) return gd.child.id;
  const storedChild = wx.getStorageSync('child');
  if (storedChild && storedChild.id) return storedChild.id;
  return wx.getStorageSync('childId') || '';
}

function normalizeTypes(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.types) && entry.types.length > 0) {
    return entry.types.map(function (t) {
      return typeof t === 'object' && t ? (t.name || t.label || String(t)) : String(t);
    }).filter(Boolean);
  }
  if (entry.type) {
    if (Array.isArray(entry.type)) {
      return entry.type.map(String).filter(Boolean);
    }
    return [String(entry.type)];
  }
  return [];
}

function normalizeStats(stats) {
  if (!stats || typeof stats !== 'object') return [];
  const mappings = [
    { label: 'HP', keys: ['hp', 'HP'] },
    { label: '攻击', keys: ['atk', 'attack', '攻击'] },
    { label: '防御', keys: ['def', 'defense', '防御'] },
    { label: '特攻', keys: ['spa', 'spAtk', 'sp_atk', 'sp_attack', 'specialAttack', '特攻'] },
    { label: '特防', keys: ['spd', 'spDef', 'sp_def', 'sp_defense', 'specialDefense', '特防'] },
    { label: '速度', keys: ['spe', 'speed', '速度'] }
  ];
  const result = [];
  mappings.forEach(function (m) {
    for (let i = 0; i < m.keys.length; i++) {
      const k = m.keys[i];
      if (stats[k] !== undefined && stats[k] !== null) {
        result.push({ label: m.label, val: stats[k] });
        break;
      }
    }
  });
  return result;
}

function normalizeMoves(moves) {
  if (!Array.isArray(moves) || moves.length === 0) return [];
  return moves.map(function (m, idx) {
    if (typeof m === 'string') {
      return { index: idx, name: m, type: '', power: '-', learned: false };
    }
    return {
      index: idx,
      name: m.name || m.move || '未知招式',
      type: m.type || '',
      power: m.power !== undefined && m.power !== null ? m.power : '-',
      learned: !!m.learned
    };
  });
}

function normalizeEvo(evo) {
  if (!evo) return '';
  if (typeof evo === 'string') return evo;
  if (Array.isArray(evo)) {
    const names = evo.map(function (item) {
      if (!item) return '';
      if (typeof item === 'string') return item;
      return item.name || item.species || '';
    }).filter(Boolean);
    return names.join(' → ');
  }
  if (typeof evo === 'object') {
    const chainText = Array.isArray(evo.chain) ? normalizeEvo(evo.chain) : '';
    const branchText = Array.isArray(evo.branches) ? normalizeEvo(evo.branches) : '';
    if (chainText && branchText) return chainText + '（分支：' + branchText + '）';
    if (chainText) return chainText;
    if (branchText) return branchText;
    if (evo.name) return String(evo.name);
  }
  return '';
}

function formatDate(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.length >= 10 ? val.slice(0, 10) : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1);
      const day = String(d.getDate());
      return y + '-' + (m.length < 2 ? '0' + m : m) + '-' + (day.length < 2 ? '0' + day : day);
    }
  }
  return String(val);
}

function formatSource(source) {
  if (!source) return '';
  if (source === 'egg') return '孵化';
  return String(source);
}

function buildDetail(entry) {
  if (!entry || !entry.unlocked) return null;
  return {
    name: entry.name || '未知',
    noText: padNo(entry.no),
    imgUrl: resolveImg(entry.img),
    typeList: normalizeTypes(entry),
    statList: normalizeStats(entry.stats),
    moveList: normalizeMoves(entry.moves),
    evoText: normalizeEvo(entry.evo),
    obtainedText: formatDate(entry.obtainedAt)
  };
}

Page({
  data: {
    loading: false,
    loaded: false,
    errorMsg: '',
    progress: { owned: 0, total: 151, pct: 0 },
    level: 1,
    fragments: 0,
    currentLineLabel: '',
    mainLineForms: [],
    hasFriendship: false,
    friendship: 0,
    hearts: [false, false, false, false, false],
    dex151: [],
    collection: [],
    selected: null
  },

  onShow() {
    this.loadPokedex();
  },

  loadPokedex() {
    if (this.data.loading) return;
    const childId = resolveChildId();
    if (!childId) {
      this.setData({
        loading: false,
        errorMsg: '未找到孩子信息，请先选择或登录孩子账号'
      });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });

    getPokedex({ childId })
      .then((res) => {
        if (!res || res.ok === false) {
          this.setData({
            loading: false,
            errorMsg: (res && (res.error || res.message)) || '获取图鉴失败'
          });
          return;
        }

        const progress = res.progress || { owned: 0, total: 151, pct: 0 };
        const level = res.level !== undefined && res.level !== null ? res.level : 1;
        const fragments = res.fragments !== undefined && res.fragments !== null ? res.fragments : 0;
        const currentLine = res.currentLine || '';
        const rawLineEntries = Array.isArray(res.lineEntries) ? res.lineEntries : [];

        const mainLineRaw = rawLineEntries
          .filter(function (item) {
            return item && item.line === currentLine;
          })
          .sort(function (a, b) {
            return (a.formIdx || 0) - (b.formIdx || 0);
          });

        let currentLineLabel = '';
        let hasFriendship = false;
        let friendship = 0;
        let hearts = [false, false, false, false, false];

        const mainLineForms = mainLineRaw.map(function (item) {
          if (item.lineLabel && !currentLineLabel) {
            currentLineLabel = item.lineLabel;
          }
          const unlocked = !!item.unlocked;
          if (item.current && typeof item.friendship === 'number') {
            hasFriendship = true;
            friendship = item.friendship;
            hearts = [0, 1, 2, 3, 4].map(function (idx) {
              return friendship >= 51 * (idx + 1);
            });
          }
          return {
            key: item.key || ('form_' + item.formIdx),
            formIdx: item.formIdx,
            unlocked: unlocked,
            current: !!item.current,
            no: unlocked ? item.no : null,
            noText: unlocked ? padNo(item.no) : '',
            name: unlocked ? (item.name || '') : null,
            displayName: unlocked ? (item.name || '神秘的蛋') : '???',
            imgUrl: resolveImg(item.img),
            egg: item.egg || null,
            raw: unlocked ? item : null
          };
        });

        const rawDex = Array.isArray(res.dex151) ? res.dex151 : [];
        const dex151 = rawDex.map(function (item) {
          const unlocked = !!item.unlocked;
          return {
            no: item.no,
            noText: padNo(item.no),
            unlocked: unlocked,
            name: unlocked ? (item.name || '') : null,
            imgUrl: resolveImg(item.img),
            raw: unlocked ? item : null
          };
        });

        const rawCollection = Array.isArray(res.collection) ? res.collection : [];
        const collection = rawCollection.map(function (item) {
          return {
            key: item.key || ('col_' + item.no + '_' + item.name),
            no: item.no,
            noText: padNo(item.no),
            name: item.name || '',
            imgUrl: resolveImg(item.img),
            sourceText: formatSource(item.source),
            unlocked: true,
            raw: item
          };
        });

        this.setData({
          loading: false,
          loaded: true,
          errorMsg: '',
          progress,
          level,
          fragments,
          currentLineLabel,
          mainLineForms,
          hasFriendship,
          friendship,
          hearts,
          dex151,
          collection
        });
      })
      .catch((err) => {
        this.setData({
          loading: false,
          errorMsg: (err && err.message) || '网络请求失败，请重试'
        });
      });
  },

  onTapDexCell(e) {
    const idx = e.currentTarget.dataset.index;
    const item = this.data.dex151[idx];
    if (!item || !item.unlocked || !item.raw) return;
    const selected = buildDetail(item.raw);
    if (selected) {
      this.setData({ selected });
    }
  },

  onTapLineForm(e) {
    const idx = e.currentTarget.dataset.index;
    const item = this.data.mainLineForms[idx];
    if (!item || !item.unlocked || !item.raw) return;
    // Only open detail modal for species forms (egg has no stats/no)
    if (item.formIdx === 0 && !item.raw.no && !item.raw.stats) return;
    const selected = buildDetail(item.raw);
    if (selected) {
      this.setData({ selected });
    }
  },

  onTapCollectionItem(e) {
    const idx = e.currentTarget.dataset.index;
    const item = this.data.collection[idx];
    if (!item || !item.raw) return;
    const selected = buildDetail(item.raw);
    if (selected) {
      this.setData({ selected });
    }
  },

  closeDetail() {
    this.setData({ selected: null });
  },

  noop() {}
});
