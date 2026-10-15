const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('./routes/lib');

const DIR = path.join(DATA_DIR, 'toplikes');
const streams = new Map(); // token -> { token, username, settings, winners, updatedAt, running, lastEvent }

function ensureDir() {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) {}
}

function fileFor(token) {
  return path.join(DIR, token + '.json');
}

function loadAll() {
  ensureDir();
  if (!fs.existsSync(DIR)) return;
  let files = [];
  try { files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')); } catch (e) {}
  for (const f of files) {
    try {
      const token = f.replace(/\.json$/, '');
      const data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      if (data && data.token) {
        streams.set(token, { ...data, running: !!data.running, settings: data.settings || defaultSettings(), winners: data.winners || [] });
      }
    } catch (e) {}
  }
}

function persist(token, rec) {
  ensureDir();
  try {
    fs.writeFileSync(fileFor(token), JSON.stringify(rec, null, 2), 'utf8');
  } catch (e) {}
}

function defaultSettings() {
  return {
    topN: 3,
    title: '🔥 أكثر الأشخاص إعجابًا',
    titleColor: '#ffffff',
    itemBg: 'rgba(0,0,0,0.6)',
    textColor: '#ffffff',
    accentColor: '#E02519',
    avatarSize: 44,
    showCount: true,
    animation: 'slide',
    showTitle: true,
  };
}

function sanitizeSettings(s) {
  const d = defaultSettings();
  if (!s || typeof s !== 'object') return d;
  const out = { ...d };
  const num = (v, fb) => (/^\d+$/.test(v) ? parseInt(v, 10) : fb);
  const numF = (v, fb) => (isFinite(parseFloat(v)) ? parseFloat(v) : fb);
  out.topN = Math.max(1, Math.min(50, num(s.topN, d.topN)));
  if (typeof s.title === 'string') out.title = s.title;
  if (/^#[0-9a-fA-F]{6}$/.test(s.titleColor || '')) out.titleColor = s.titleColor;
  if (typeof s.itemBg === 'string') out.itemBg = s.itemBg;
  if (/^#[0-9a-fA-F]{6}$/.test(s.textColor || '')) out.textColor = s.textColor;
  if (/^#[0-9a-fA-F]{6}$/.test(s.accentColor || '')) out.accentColor = s.accentColor;
  out.avatarSize = numF(s.avatarSize, d.avatarSize);
  out.showCount = s.showCount === undefined ? d.showCount : !!s.showCount;
  if (typeof s.animation === 'string') out.animation = s.animation;
  out.showTitle = s.showTitle === undefined ? d.showTitle : !!s.showTitle;
  return out;
}

function tokenFor(username) {
  ensureDir();
  const existing = Array.from(streams.values()).find((r) => r.username === username);
  if (existing) return existing;
  const token = crypto.randomBytes(16).toString('hex');
  const rec = {
    token,
    username,
    running: false,
    winners: [],
    settings: defaultSettings(),
    updatedAt: Date.now(),
    lastEvent: null,
  };
  streams.set(token, rec);
  persist(token, rec);
  return rec;
}

function get(token) {
  return streams.get(token) || null;
}

function listStreams() {
  return Array.from(streams.values()).map((r) => ({
    token: r.token,
    username: r.username,
    running: !!r.running,
    updatedAt: r.updatedAt,
    winners: r.winners || [],
  }));
}

function updateSettings(token, settings) {
  const rec = get(token);
  if (!rec) return null;
  rec.settings = sanitizeSettings(settings);
  rec.updatedAt = Date.now();
  persist(token, rec);
  return rec;
}

function setRunning(token, running) {
  const rec = get(token);
  if (!rec) return null;
  rec.running = !!running;
  rec.updatedAt = Date.now();
  if (rec.running) rec.startedAt = rec.startedAt || Date.now();
  else rec.startedAt = null;
  persist(token, rec);
  return rec;
}

function reset(token, username) {
  const rec = get(token);
  if (rec) {
    rec.winners = [];
    rec.updatedAt = Date.now();
    persist(token, rec);
    return rec;
  }
  return tokenFor(username);
}

// Feed a live event into the matching stream (by username) and update winners.
function feedEvent(username, ev) {
  const key = String(username || '').toLowerCase();
  const rec = Array.from(streams.values()).find((r) => String(r.username || '').toLowerCase() === key);
  if (!rec) return;
  if (ev.type === 'reset') {
    rec.winners = [];
    rec.updatedAt = Date.now();
    persist(rec.token, rec);
    emit(rec, { type: 'state', token: rec.token, winners: rec.winners, running: rec.running });
    return;
  }
  if (ev.type === 'like') {
    const u = ev.uniqueId;
    const n = parseInt(ev.detail, 10) || 1;
    const winners = rec.winners || [];
    const existing = winners.find((w) => w.uniqueId === u);
    if (existing) {
      existing.count = (existing.count || 0) + n;
    } else {
      winners.push({
        uniqueId: u,
        nickname: ev.nickname || u,
        avatarUrl: ev.avatarUrl || null,
        count: n,
        rank: 0,
        ts: Date.now(),
      });
    }
    const topN = (rec.settings && rec.settings.topN) || 3;
    winners.sort((a, b) => b.count - a.count);
    winners.forEach((w, i) => { w.rank = i + 1; });
    rec.winners = winners.slice(0, topN);
    rec.updatedAt = Date.now();
    rec.lastEvent = { type: 'like', at: Date.now(), uniqueId: u };
    persist(rec.token, rec);
    emit(rec, { type: 'state', token: rec.token, winners: rec.winners, running: rec.running, lastEvent: rec.lastEvent });
  }
}

function emit(rec, payload) {
  try {
    const rt = require('./realtime');
    rt.broadcast(rec.token, payload);
  } catch (e) {}
}

function stats() {
  return { streams: listStreams(), wsClients: (require('./realtime').count ? require('./realtime').count() : 0) };
}

loadAll();

module.exports = {
  tokenFor,
  get,
  listStreams,
  updateSettings,
  setRunning,
  reset,
  feedEvent,
  stats,
};
