/**
 * TikFlux Desktop - Unified Server
 * Combines static file serving, API endpoints, and TikTok LIVE service
 */

const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { URL } = require('url');

// === Configuration ===
const PORT = parseInt(process.env.PORT || '3000', 10);

// --- tiny .env loader (no external dependency) ---
function loadEnvFile(file) {
  try {
    if (!fs.existsSync(file)) return;
    const txt = fs.readFileSync(file, 'utf-8');
    txt.split(/\r?\n/).forEach((line) => {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) return;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    });
  } catch (e) { console.warn('[ENV] could not read', file, e.message); }
}

function resolveExistingDir(envValue, candidates) {
  const list = [];
  if (envValue) list.push(envValue);
  candidates.forEach((c) => list.push(c));
  for (const c of list) {
    try { if (c && fs.existsSync(c)) return path.resolve(c); } catch (e) {}
  }
  return path.resolve(list[list.length - 1]);
}

// APP_DATA = the web assets this server serves. For the packaged desktop app the
// Electron main process passes APP_DATA/USER_DATA. When running from source we
// fall back to a sibling folder, then to this folder, and we log what we picked.
const APP_DATA = resolveExistingDir(process.env.APP_DATA, [path.join(__dirname, '..', 'tikoverlay.live'), __dirname]);
const USER_DATA = resolveExistingDir(process.env.USER_DATA, [path.join(__dirname, '..', 'data'), path.join(__dirname, 'data')]);

try { fs.mkdirSync(USER_DATA, { recursive: true }); } catch (e) {}
loadEnvFile(path.join(USER_DATA, '.env'));
loadEnvFile(path.join(process.cwd(), '.env'));

// Mock mode keeps the UI usable when TikTok / the signing service is unreachable,
// but it is ALWAYS flagged (mock:true, transport:'mock', mockReason + a visible
// badge in the UI) and it NEVER writes to disk. Set ALLOW_MOCK=0 to disable it.
const ALLOW_MOCK = process.env.ALLOW_MOCK === '0' ? false : true;
const SIGN_SERVER = process.env.TIKTOOL_SIGN_SERVER || 'https://api.tik.tools';
const CONNECT_TIMEOUT_MS = parseInt(process.env.CONNECT_TIMEOUT_MS || '30000', 10);

const SUPPORTERS_FILE = path.join(USER_DATA, 'supporters_data.json');
const ALERT_CATALOG_FILE = path.join(APP_DATA, 'alert_catalog.json');

// === Real on-disk storage (atomic writes) ===
const SETTINGS_FILE = path.join(USER_DATA, 'widget-settings.json');
const PROFILE_FILE = path.join(USER_DATA, 'profile.json');
const _saveTimers = new Map();

function readJsonFile(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);
  } catch (e) {
    console.error('[DATA] read failed:', file, e.message);
    return fallback;
  }
}

function writeJsonFileSync(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, file);
    return true;
  } catch (e) {
    console.error('[DATA] write failed:', file, e.message);
    return false;
  }
}

// Debounced write: the in-memory store stays the source of truth while we type,
// but everything lands on disk so settings/actions survive a restart.
function scheduleWrite(file, getData, delayMs) {
  const prev = _saveTimers.get(file);
  if (prev) clearTimeout(prev);
  _saveTimers.set(file, setTimeout(() => {
    _saveTimers.delete(file);
    writeJsonFileSync(file, getData());
  }, typeof delayMs === 'number' ? delayMs : 400));
}

// === Express App ===
const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// === Local video uploads for Actions / alerts ===
// The Actions bundle asks /api/actions/upload-video/sign for a presigned PUT.
// Previously that route fell through to the catch-all ({ok:true}) so the bundle
// reported "Sign failed: 200". We now issue a same-origin token and accept the
// PUT ourselves, storing the file under USER_DATA (never in the web root).
const VIDEO_UPLOAD_DIR = path.join(USER_DATA, 'uploads', 'videos');
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const VIDEO_EXT_MIME = {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.m4p': 'video/mp4',
  '.3gp': 'video/3gpp', '.webm': 'video/webm', '.ogv': 'video/ogg',
  '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
  '.gif': 'image/gif', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif',
  '.bmp': 'image/bmp',
};
const VIDEO_MIME_EXT = {
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv',
  'video/quicktime': 'mov', 'video/x-matroska': 'mkv', 'video/3gpp': '3gp',
  'image/gif': 'gif', 'image/webp': 'webp', 'image/png': 'png',
  'image/jpeg': 'jpg', 'image/avif': 'avif', 'image/bmp': 'bmp',
};
const VIDEO_TOKEN_RE = /^[a-f0-9]{32}\.(mp4|m4v|m4p|3gp|webm|ogv|mov|mkv|gif|webp|png|jpe?g|avif|bmp)$/i;
try { fs.mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true }); } catch (e) {
  console.warn('[UPLOAD] could not create video upload dir:', e.message);
}

function uploadBase(req) {
  const rawProto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = String(rawProto).split(',')[0].trim() || 'http';
  const host = String(rawHost).split(',')[0].trim();
  return host ? proto + '://' + host : '';
}
function videoMetaPath(token) { return path.join(VIDEO_UPLOAD_DIR, token + '.json'); }
function videoFilePath(token) { return path.join(VIDEO_UPLOAD_DIR, token); }
function cleanVideoTemp(token) {
  try { fs.unlinkSync(videoFilePath(token) + '.part'); } catch (e) {}
}
function videoUploadError(res, status, message) {
  return res.status(status).json({ ok: false, success: false, error: message, message: message });
}

app.post('/api/actions/upload-video/sign', (req, res) => {
  const body = req.body || {};
  const size = Number(body.size);
  if (!Number.isFinite(size) || size < 0) {
    return videoUploadError(res, 400, 'حجم الفيديو غير صالح');
  }
  if (size > VIDEO_MAX_BYTES) {
    return videoUploadError(res, 413, 'حجم الفيديو كبير جدًا (الحد الأقصى 50 ميجابايت)');
  }
  const filename = String(body.filename || 'video.mp4').slice(0, 200);
  const contentType = String(body.contentType || '').split(';')[0].trim().toLowerCase();
  let ext = VIDEO_MIME_EXT[contentType] || path.extname(filename).toLowerCase().replace(/^\./, '');
  if (!VIDEO_EXT_MIME['.' + ext]) ext = 'mp4';
  const token = crypto.randomBytes(16).toString('hex') + '.' + ext;
  const meta = {
    token: token,
    filename: filename,
    contentType: VIDEO_EXT_MIME['.' + ext],
    size: size,
    status: 'pending',
    createdAt: Date.now(),
  };
  try {
    fs.mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(videoMetaPath(token), JSON.stringify(meta));
  } catch (e) {
    console.error('[UPLOAD] sign failed:', e.message);
    return videoUploadError(res, 500, 'تعذّر تجهيز الرفع');
  }
  const base = uploadBase(req);
  return res.json({
    ok: true,
    success: true,
    uploadUrl: base + '/api/uploads/videos/' + encodeURIComponent(token),
    videoUrl: base + '/uploads/videos/' + encodeURIComponent(token),
    videoFilename: filename,
    video_filename: filename,
    videoR2Key: token,
  });
});

app.put('/api/uploads/videos/:token', (req, res) => {
  const token = req.params.token;
  if (!VIDEO_TOKEN_RE.test(token)) return videoUploadError(res, 400, 'رمز الرفع غير صالح');
  let meta;
  try { meta = JSON.parse(fs.readFileSync(videoMetaPath(token), 'utf8')); }
  catch (e) { return videoUploadError(res, 404, 'انتهت صلاحية رمز الرفع'); }

  const limit = Math.min(Number(meta.size) || VIDEO_MAX_BYTES, VIDEO_MAX_BYTES);
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > limit) {
    cleanVideoTemp(token);
    return videoUploadError(res, 413, 'حجم الفيديو كبير جدًا (الحد الأقصى 50 ميجابايت)');
  }

  const tmpFile = videoFilePath(token) + '.part';
  let received = 0;
  let done = false;
  const out = fs.createWriteStream(tmpFile);
  const fail = (status, message) => {
    if (done) return;
    done = true;
    try { out.destroy(); } catch (e) {}
    cleanVideoTemp(token);
    videoUploadError(res, status, message);
  };

  out.on('error', () => fail(500, 'تعذّر حفظ الفيديو'));
  req.on('data', (chunk) => {
    if (done) return;
    received += chunk.length;
    if (received > limit) {
      done = true;
      try { out.destroy(); } catch (e) {}
      cleanVideoTemp(token);
      videoUploadError(res, 413, 'حجم الفيديو كبير جدًا (الحد الأقصى 50 ميجابايت)');
      res.once('finish', () => { try { req.destroy(); } catch (e) {} });
      return;
    }
    if (!out.write(chunk)) req.pause();
  });
  out.on('drain', () => req.resume());
  req.on('aborted', () => fail(499, 'تم إلغاء الرفع'));
  req.on('error', () => fail(500, 'خطأ أثناء الرفع'));
  req.on('end', () => { if (!done) out.end(); });
  out.on('finish', () => {
    if (done) return;
    done = true;
    try {
      fs.renameSync(tmpFile, videoFilePath(token));
      meta.status = 'done';
      meta.size = received;
      meta.uploadedAt = Date.now();
      fs.writeFileSync(videoMetaPath(token), JSON.stringify(meta));
      return res.json({ ok: true, success: true, url: '/uploads/videos/' + token });
    } catch (e) {
      cleanVideoTemp(token);
      console.error('[UPLOAD] finish failed:', e.message);
      return videoUploadError(res, 500, 'تعذّر إنهاء الرفع');
    }
  });
});

app.get('/uploads/videos/:token', (req, res) => {
  const token = req.params.token;
  if (!VIDEO_TOKEN_RE.test(token)) return res.status(400).end();
  const file = videoFilePath(token);
  if (!fs.existsSync(file)) return res.status(404).end();
  const stat = fs.statSync(file);
  if (!stat.isFile()) return res.status(404).end();

  const mime = VIDEO_EXT_MIME[path.extname(token).toLowerCase()] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const range = req.headers.range;
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (match) {
    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= stat.size) {
      res.setHeader('Content-Range', 'bytes */' + stat.size);
      return res.status(416).end();
    }
    end = Math.min(end, stat.size - 1);
    res.status(206);
    res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + stat.size);
    res.setHeader('Content-Length', end - start + 1);
    return fs.createReadStream(file, { start: start, end: end }).pipe(res);
  }
  res.setHeader('Content-Length', stat.size);
  return fs.createReadStream(file).pipe(res);
});

// The Actions bundle rewrites library alert previews to this same-origin path
// (${API_URL}/api/alert-library/previews/:id/video). Proxy the catalog URL so
// the advanced-settings video preview works just like a locally uploaded one.
app.get('/api/alert-library/previews/:id/video', async (req, res) => {
  const id = String(req.params.id || '');
  const catalog = readJsonFile(ALERT_CATALOG_FILE, {});
  const items = Array.isArray(catalog) ? catalog : (catalog.items || []);
  const alert = items.find((a) => a && String(a.id) === id);
  if (!alert || !alert.preview_url) return res.status(404).end();

  const headers = {};
  if (req.headers.range) headers.Range = String(req.headers.range);
  try {
    const upstream = await fetch(alert.preview_url, {
      headers: headers,
      signal: AbortSignal.timeout(20000),
    });
    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (!upstream.body) return res.end();
    return Readable.fromWeb(upstream.body).pipe(res);
  } catch (e) {
    console.warn('[ALERT PREVIEW] proxy failed:', id, e.message);
    if (!res.headersSent) res.status(502).end();
    else res.end();
  }
});

app.get('/api/alert-library/previews/:id/thumb.jpg', async (req, res) => {
  const id = String(req.params.id || '');
  const catalog = readJsonFile(ALERT_CATALOG_FILE, {});
  const items = Array.isArray(catalog) ? catalog : (catalog.items || []);
  const alert = items.find((a) => a && String(a.id) === id);
  if (!alert || !alert.thumbnail_url) return res.status(404).end();
  try {
    const upstream = await fetch(alert.thumbnail_url, { signal: AbortSignal.timeout(20000) });
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (!upstream.body) return res.end();
    return Readable.fromWeb(upstream.body).pipe(res);
  } catch (e) {
    if (!res.headersSent) res.status(502).end();
    else res.end();
  }
});

// === TikTok stream endpoints (registered BEFORE the /api/* catch-all and static
// middleware so the frontend's /stream/* calls are not swallowed by the 404/ok fallbacks) ===
//
// These endpoints NEVER report success before TikTok confirms it:
//   * POST /stream/connect answers { state:'connecting' } and the real outcome is
//     pushed over the WebSocket as a stream-state-updated event (connected|failed).
//     Pass { wait:true } to block until the real outcome is known instead.
//   * A rejected attempt answers with an HTTP error code + a machine readable
//     reason (NOT_LIVE, USER_NOT_FOUND, connect_timeout, auth_error, sdk_missing).
//   * Mock mode is only ever reported together with mock:true + mockReason.
async function handleConnectRequest(req, res) {
  const body = req.body || {};
  const uniqueId = String(body.uniqueId == null ? '' : body.uniqueId).trim().replace(/^@+/, '');
  if (!uniqueId) {
    return res.status(400).json({ ok: false, success: false, state: 'failed', reason: 'INVALID_UNIQUE_ID', error: 'uniqueId required' });
  }
  const opts = {
    allowMock: typeof body.allowMock === 'boolean' ? body.allowMock : undefined,
    wait: body.wait === true,
  };
  try {
    const result = await connectToTikTok(uniqueId, opts);
    if (result && result.success === false) {
      const code = result.reason === 'INVALID_UNIQUE_ID' ? 400 : 502;
      return res.status(code).json(result);
    }
    if (result && result.warning) res.setHeader('X-TikFlux-Warning', String(result.warning).slice(0, 300));
    return res.json(result);
  } catch (e) {
    console.error('[STREAM] connect handler failed:', e);
    return res.status(500).json({ ok: false, success: false, state: 'failed', reason: 'connect_error', error: e.message });
  }
}

app.get('/stream/status', (req, res) => res.json(getStatus()));
app.get('/api/status', (req, res) => res.json(getStatus()));
app.post('/stream/connect', handleConnectRequest);
app.post('/api/connect', handleConnectRequest);
app.post('/stream/disconnect', (req, res) => res.json(disconnectFromTikTok((req.body && req.body.reason) || 'user_disconnect')));
app.post('/api/disconnect', (req, res) => res.json(disconnectFromTikTok((req.body && req.body.reason) || 'user_disconnect')));

// === Dashboard session registry ===
// The dashboard registers a session and sends heartbeats so the server knows
// which dashboard tab is currently active. Without these routes the frontend
// logs "Dashboard registration failed" (404) on every load.
let activeDashboardSessionId = null;
let activeDashboardSessionTs = 0;

function touchDashboardSession(sessionId) {
  // If no active session exists (e.g. the server restarted) adopt the requester,
  // matching the frontend's "reclaim session via heartbeat" behaviour.
  if (sessionId && !activeDashboardSessionId) {
    activeDashboardSessionId = sessionId;
    activeDashboardSessionTs = Date.now();
  }
}

function dashboardSessionPayload(sessionId) {
  const isActive = !sessionId || sessionId === activeDashboardSessionId;
  return {
    ok: true,
    success: true,
    sessionId: sessionId || activeDashboardSessionId,
    activeSessionId: activeDashboardSessionId,
    isCurrentSessionActive: isActive,
    ts: activeDashboardSessionTs,
  };
}

app.post('/dashboard/session/start', (req, res) => {
  const sessionId = (req.body && req.body.sessionId) || null;
  if (sessionId) {
    activeDashboardSessionId = sessionId;
    activeDashboardSessionTs = Date.now();
  }
  res.json(dashboardSessionPayload(sessionId));
});

app.post('/dashboard/session/heartbeat', (req, res) => {
  const sessionId = (req.body && req.body.sessionId) || null;
  touchDashboardSession(sessionId);
  res.json(dashboardSessionPayload(sessionId));
});

app.get('/dashboard/session/status', (req, res) => {
  const sessionId = req.query.sessionId || null;
  touchDashboardSession(sessionId);
  res.json(dashboardSessionPayload(sessionId));
});

app.post('/dashboard/session/end', (req, res) => {
  const sessionId = (req.body && req.body.sessionId) || null;
  if (sessionId && sessionId === activeDashboardSessionId) {
    activeDashboardSessionId = null;
    activeDashboardSessionTs = 0;
  }
  res.json({ ok: true, success: true });
});

// === Data Store ===
const widgetSettingsStore = {};
const latestEventsStore = {};
const actionScreens = new Map();
const WIDGET_SETTINGS_KEYS = new Set([
  'top_likes', 'top_gifters', 'social-rotator', 'latest-events',
  'like-overlay', 'follow-overlay', 'like-goal', 'follow-goal',
  'gift-goal', 'donation-goal', 'heart-me-goal',
]);

// --- Restore everything we previously persisted (real storage, not just RAM) ---
const profileStore = readJsonFile(PROFILE_FILE, {});
(function restorePersistedSettings() {
  const saved = readJsonFile(SETTINGS_FILE, null);
  if (saved && typeof saved === 'object') {
    Object.keys(saved).forEach((k) => { widgetSettingsStore[k] = saved[k]; });
  }
  console.log('[DATA] settings restored: ' + Object.keys(widgetSettingsStore).length + ' key(s) from ' + SETTINGS_FILE);
})();

function persistSettings() {
  scheduleWrite(SETTINGS_FILE, () => widgetSettingsStore);
}

function persistProfile(patch) {
  Object.assign(profileStore, patch, { updatedAt: Date.now() });
  writeJsonFileSync(PROFILE_FILE, profileStore);
  return profileStore;
}

const SPA_ROUTES = new Set([
  'top-likes', 'top-gifters', 'overlays', 'goals', 'actions',
  'donation-alerts', 'tts', 'chat', 'bot-chat', 'music-player',
  'supporters-leaderboard', 'social-media', 'challenges',
  'link-scenes', 'latest-events', 'stats', 'account', 'app',
  'store', 'alert-store',
  'features', 'pricing', 'guides', 'faq', 'terms', 'privacy',
]);

function normalizeSupporter(row) {
  if (!row || typeof row !== 'object') return row;
  const username = row.supporter_username || row.uniqueId || row.name || '';
  return {
    id: row.id || ('sup_' + String(username).toLowerCase().replace(/[^a-z0-9]/gi, '_')),
    supporter_username: String(username),
    nickname: row.nickname || row.name || String(username),
    avatar: row.avatar || '',
    total_diamonds: Number(row.total_diamonds ?? row.diamonds ?? 0) || 0,
    timestamp: row.timestamp || Math.floor(Date.now() / 1000),
  };
}

function loadSupporters() {
  try {
    if (fs.existsSync(SUPPORTERS_FILE)) {
      const data = fs.readFileSync(SUPPORTERS_FILE, 'utf-8');
      // Remove BOM if present
      const clean = data.charCodeAt(0) === 0xFEFF ? data.slice(1) : data;
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        return parsed
          .map(normalizeSupporter)
          .filter((x) => x && (x.supporter_username || x.nickname))
          .sort((a, b) => b.total_diamonds - a.total_diamonds);
      }
    }
  } catch (e) {
    console.error('[DATA] Error loading supporters:', e.message);
  }
  return [];
}

function saveSupporters(data) {
  fs.writeFileSync(SUPPORTERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function loadAlertCatalog() {
  try {
    if (fs.existsSync(ALERT_CATALOG_FILE)) {
      return JSON.parse(fs.readFileSync(ALERT_CATALOG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[DATA] Error loading alerts:', e.message);
  }
  return [];
}

// === API Routes ===

// Config endpoint
app.get('/config', (req, res) => {
  res.json({
    supabaseUrl: 'https://placeholder.supabase.co',
    supabaseAnonKey: 'placeholder-key',
    apiUrl: `http://localhost:${PORT}`,
    edgeWsUrl: 'ws://localhost:8090/ws',
    paypalClientId: '',
    paypalMode: 'sandbox',
    paypalPlanIds: {},
  });
});

// Session/Auth
app.get('/api/session', (req, res) => {
  res.json({
    ok: true,
    session: {
      authenticated: true,
      user: { id: '550e8400-e29b-41d4-a716-446655440000', email: 'local@tikflux.local' }
    }
  });
});

app.get('/api/subscriptions/status', (req, res) => {
  res.json({
    ok: true,
    hasActiveSubscription: true,
    subscription: { id: 'local', plan: 'pro', status: 'active' }
  });
});

app.get('/api/user/profile', (req, res) => {
  res.json({
    ok: true,
    user: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'local@tikflux.local',
      user_metadata: { name: 'TikFlux User' },
      tiktok_unique_id: profileStore.tiktok_unique_id || null
    },
    tiktok_unique_id: profileStore.tiktok_unique_id || null
  });
});

// Real persistence for the linked TikTok username (survives reloads/restarts).
app.put('/api/user/profile', (req, res) => {
  const body = req.body || {};
  const patch = {};
  if (typeof body.tiktok_unique_id === 'string') {
    patch.tiktok_unique_id = body.tiktok_unique_id.trim().replace(/^@+/, '') || null;
  }
  if (typeof body.display_name === 'string') patch.display_name = body.display_name;
  if (!Object.keys(patch).length) {
    return res.json({ ok: true, success: true, saved: false, tiktok_unique_id: profileStore.tiktok_unique_id || null });
  }
  persistProfile(patch);
  console.log('[DATA] profile saved →', PROFILE_FILE, JSON.stringify(patch));
  res.json({ ok: true, success: true, saved: true, tiktok_unique_id: profileStore.tiktok_unique_id || null });
});

app.get('/api/ban-status', (req, res) => {
  res.json({ ok: true, banned: false });
});

// Widget settings
app.get('/api/widget/settings', (req, res) => {
  const key = req.query.widget;
  if (key && WIDGET_SETTINGS_KEYS.has(key)) {
    res.json({ ok: true, success: true, key, settings: widgetSettingsStore[key] || {} });
  } else {
    res.json({ ok: true, success: true, settings: {} });
  }
});

app.get('/api/widget/settings/:key', (req, res) => {
  const key = req.params.key;
  res.json({ ok: true, success: true, key, settings: widgetSettingsStore[key] || {} });
});

app.post('/api/widget/settings', (req, res) => {
  const key = req.body.widget || req.body.key;
  if (key) {
    widgetSettingsStore[key] = req.body;
    persistSettings();
    res.json({ ok: true, success: true, key, persisted: true });
  } else {
    res.json({ ok: true, success: true });
  }
});

app.post('/api/widget/settings/:key', (req, res) => {
  widgetSettingsStore[req.params.key] = req.body;
  persistSettings();
  res.json({ ok: true, success: true, key: req.params.key, persisted: true });
});

// Goal progress
app.get('/api/widget/goal-progress', (req, res) => {
  res.json({ ok: true, progress: widgetSettingsStore._goal_progress || {} });
});

app.get('/api/goal-progress', (req, res) => {
  res.json({ ok: true, progress: widgetSettingsStore._goal_progress || {} });
});

app.post('/api/widget/goal-progress', (req, res) => {
  widgetSettingsStore._goal_progress = req.body;
  persistSettings();
  res.json({ ok: true, persisted: true });
});

app.post('/api/goal-progress', (req, res) => {
  widgetSettingsStore._goal_progress = req.body;
  persistSettings();
  res.json({ ok: true, persisted: true });
});

app.post('/api/widget/goal-reset', (req, res) => {
  widgetSettingsStore._goal_progress = {};
  persistSettings();
  res.json({ ok: true, persisted: true });
});

// Supporters leaderboard
app.get('/api/supporters-leaderboard', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit || '20', 10) || 20);
  const search = String(req.query.search || '').trim().toLowerCase();
  let all = loadSupporters();
  if (search) {
    all = all.filter((s) =>
      (s.nickname || '').toLowerCase().includes(search) ||
      (s.supporter_username || '').toLowerCase().includes(search)
    );
  }
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);
  res.json({ ok: true, supporters: items, page, totalPages, totalCount: total });
});

app.get('/api/supporters-leaderboard/all', (req, res) => {
  res.json(loadSupporters());
});

app.post('/api/supporters-leaderboard', (req, res) => {
  const body = req.body || {};
  const username = String(body.username || '').trim();
  if (!username) return res.status(400).json({ error: 'username required' });
  const data = loadSupporters();
  if (data.some((x) => String(x.supporter_username || '').toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'already exists' });
  }
  const supporter = {
    id: 'sup_' + username.toLowerCase().replace(/[^a-z0-9]/gi, '_'),
    supporter_username: username,
    nickname: String(body.nickname || '').trim() || username,
    avatar: body.avatar || '',
    total_diamonds: Number(body.total_diamonds) || 0,
    timestamp: Math.floor(Date.now() / 1000),
  };
  data.push(supporter);
  saveSupporters(data);
  res.json({ ok: true, supporter });
});

app.patch('/api/supporters-leaderboard/:id', (req, res) => {
  const data = loadSupporters();
  const s = data.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  s.total_diamonds = Math.max(0, (Number(s.total_diamonds) || 0) + (Number(req.body && req.body.delta) || 0));
  saveSupporters(data);
  res.json({ ok: true, supporter: s, total_diamonds: s.total_diamonds });
});

app.delete('/api/supporters-leaderboard', (req, res) => {
  saveSupporters([]);
  res.json({ ok: true });
});

app.delete('/api/supporters-leaderboard/all', (req, res) => {
  saveSupporters([]);
  res.json({ ok: true });
});

app.delete('/api/supporters-leaderboard/:id', (req, res) => {
  const data = loadSupporters().filter((s) => s.id !== req.params.id);
  saveSupporters(data);
  res.json({ ok: true });
});

// Alert Library
app.get('/api/alert-library', (req, res) => {
  const category = req.query.category;
  let alerts = loadAlertCatalog();
  if (category && category !== 'all') {
    alerts = alerts.filter(a => a.category === category);
  }
  res.json(alerts);
});

app.get('/api/alert-library/store/owned', (req, res) => {
  const alerts = loadAlertCatalog();
  const owned = alerts.filter(a => a.is_owned).map(a => a.id);
  res.json({ ok: true, owned });
});

app.get('/api/alert-library/store/orders', (req, res) => {
  res.json({ ok: true, orders: [] });
});

app.post('/api/alert-library/attach', (req, res) => {
  const alertId = req.body.alertId;
  const alerts = loadAlertCatalog();
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    res.json({
      ok: true, attached: true, alertId,
      library_alert_id: alertId,
      video_filename: alert.name || 'Alert',
      duration_seconds: alert.duration_seconds || 5,
      preview_url: alert.preview_url || '',
      thumbnail_url: alert.thumbnail_url || '',
      name: alert.name || ''
    });
  } else {
    res.json({ ok: true, attached: true, alertId, library_alert_id: alertId });
  }
});

// Actions dashboard — same-origin responses so the view never crashes on a missing API
app.get('/api/internal/actions-dashboard-bundle', (req, res) => {
  const readJson = (name) => {
    try {
      const p = path.join(USER_DATA, name);
      return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
    } catch (e) { return []; }
  };
  const actions = readJson('actions.json');
  const groups = readJson('action_groups.json');
  res.json({
    success: true,
    actions: Array.isArray(actions) ? actions : [],
    groups: Array.isArray(groups) ? groups : [],
    alertsMasterEnabled: true,
    source: 'local'
  });
});

app.get('/api/actions/screens-status/:uid', (req, res) => {
  const uid = req.params.uid;
  res.json({
    ok: true,
    screens: [1, 2, 3, 4, 5].map(n => {
      const key = uid + ':' + n;
      const ts = actionScreens.get(key);
      return { screen: n, online: !!ts, lastSeen: ts || null };
    })
  });
});

app.get('/api/dashboard/country-lookups', (req, res) => {
  res.json({ ok: true, entries: [] });
});

// Test events
app.post('/api/widget/test-event/latest-event', (req, res) => {
  const { uid, eventType } = req.body || {};
  const durationMs = Number((req.body || {}).durationMs) || 5000;
  if (eventType) {
    pushLatestEvent(eventType, { uniqueId: 'test_user', nickname: 'مستخدم تجريبي', avatar: '/assets/img/avatar1.png' }, { isTest: true, durationMs });
  }
  res.json({ ok: true, success: true });
});
app.post('/api/widget/test-event/latest-supporter', (req, res) => {
  const durationMs = Number((req.body || {}).durationMs) || 5000;
  broadcast('latest_supporter_update', { supporter: { uniqueId: 'test_user', nickname: 'داعم تجريبي', avatar: '/assets/img/avatar1.png', amount: 100, currency: 'USD' }, isTest: true, durationMs, ts: Date.now() });
  res.json({ ok: true, success: true });
});
app.get('/api/widget/test-event/:id', (req, res) => res.json({ ok: true, success: true }));

// Latest events settings
app.get('/api/widget/latest-events/settings', (req, res) => {
  res.json({ ok: true, settings: {} });
});

// Initial data
const LATEST_EVENT_WIDGET_MAP = { latest_like: 'like', latest_follow: 'follow', latest_share: 'share', latest_gift: 'gift', latest_join: 'join', latest_subscribe: 'subscribe' };
app.get('/api/widget/initial-data/:id/:widget', (req, res) => {
  const type = LATEST_EVENT_WIDGET_MAP[req.params.widget];
  res.json({ ok: true, data: (type && latestEventsStore[type] && latestEventsStore[type].event) || null });
});
app.get('/api/widget/initial-data/:id', (req, res) => {
  res.json({ ok: true, data: null });
});

// Catch-all API
app.all('/api/*', (req, res) => {
  res.json({ ok: true, success: true });
});

// === Avatar Proxy ===
app.get('/proxy/avatar', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'missing url parameter' });
  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://www.tiktok.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
      }
    });
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (e) {
    res.status(502).type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="22" fill="#333"/></svg>');
  }
});

// === Static Files ===
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.map': 'application/json',
  '.txt': 'text/plain',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.path).replace(/^\/+/, '');
  
  if (!urlPath || urlPath === '.') urlPath = 'goals.html';
  
  const fullPath = path.join(APP_DATA, urlPath);
  const normalized = path.normalize(fullPath);
  
  if (!normalized.startsWith(APP_DATA)) {
    return res.status(403).end();
  }

  // Check if file exists
  if (fs.existsSync(normalized) && fs.statSync(normalized).isFile()) {
    const ext = path.extname(normalized).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    fs.createReadStream(normalized).pipe(res);
    return;
  }

  // Special standalone pages (before SPA fallback)
  const segments = urlPath.split('/');
  const SPECIAL_PAGES = { 'store': 'store.html', 'donation-alerts': 'donation-alerts.html', 'actions': 'actions.html' };
  if (SPECIAL_PAGES[segments[0]]) {
    const specialPath = path.join(APP_DATA, SPECIAL_PAGES[segments[0]]);
    if (fs.existsSync(specialPath)) {
      res.setHeader('Content-Type', 'text/html');
      fs.createReadStream(specialPath).pipe(res);
      return;
    }
  }

  // SPA routes fallback
  if (SPA_ROUTES.has(urlPath) || SPA_ROUTES.has(urlPath.split('/')[0])) {
    const goalsPath = path.join(APP_DATA, 'goals.html');
    if (fs.existsSync(goalsPath)) {
      res.setHeader('Content-Type', 'text/html');
      fs.createReadStream(goalsPath).pipe(res);
      return;
    }
  }

  res.status(404).end();
}

// A copied Actions screen link carries the selected alert and its settings in
// the query string. Serve the legacy overlay with an additive layer that plays
// that alert, so OBS/TikTok LIVE Studio sees the video and the saved overlay.
const ALERT_SCREEN_PATCH = `
<script>
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  if (params.get('tf') !== '1') return;
  var cfg = {};
  try { cfg = JSON.parse(params.get('cfg') || '{}') || {}; } catch (e) {}
  function param(k, d) { return String(params.get(k) || d || ''); }
  function num(k, d) { var n = Number(cfg[k]); return isFinite(n) ? n : d; }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function color(v, d) { v = String(v || ''); return /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : d; }
  function font(v) { v = String(v || ''); return /^[\\w\\s,'-]+$/.test(v) ? v : "'Thmanyah Sans', sans-serif"; }

  var oldStage = document.getElementById('stage');
  if (oldStage) oldStage.style.display = 'none';
  var oldBadge = document.getElementById('badge');
  if (oldBadge) oldBadge.style.display = 'none';
  var legacyWrap = document.querySelector('.wrap');
  if (legacyWrap) legacyWrap.style.display = 'none';

  var root = document.createElement('div');
  root.id = 'tfAlertRoot';
  root.style.cssText = 'position:fixed;inset:0;overflow:hidden;background:transparent;opacity:0;transition:opacity .18s ease;pointer-events:none;';
  document.body.appendChild(root);

  var canvas = document.createElement('div');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:top left;';
  function fit() {
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    canvas.style.transform = 'scale(' + scale + ')';
  }
  fit();
  window.addEventListener('resize', fit);
  root.appendChild(canvas);

  var video = document.createElement('video');
  video.src = param('v');
  video.autoplay = true;
  video.loop = true;
  video.playsInline = true;
  video.muted = false;
  video.volume = clamp(num('volume', 80) / 100, 0, 1);
  video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
  canvas.appendChild(video);

  var size = clamp(num('avatarSize', 150), 80, 300);
  var shape = String(cfg.avatarShape || 'circle').toLowerCase();
  var factor = shape === 'diamond' ? 1.55 : (shape === 'rounded' || shape === 'hexagon' ? 1.4 : 340 / 320);
  var wrapSize = Math.round(size * factor);
  var radius = shape === 'rounded' ? '22%' : (shape === 'circle' ? '50%' : '0');
  var frame = color(cfg.borderColor, '#00aeff');
  var clip = shape === 'hexagon' ? 'polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0% 50%)' : (shape === 'diamond' ? 'polygon(50% 0,100% 50%,50% 100%,0 50%)' : 'none');

  var avatarLayer = document.createElement('div');
  avatarLayer.style.cssText = 'position:absolute;z-index:2;left:' + (50 + num('avatarPosX', 0)) + '%;top:' + (50 + num('avatarPosY', -34)) + '%;transform:translate(-50%,-50%);text-align:center;display:' + (cfg.showAvatar === false ? 'none' : 'block') + ';';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:' + wrapSize + 'px;height:' + wrapSize + 'px;border:3px solid ' + esc(frame) + ';box-sizing:border-box;box-shadow:0 0 30px ' + esc(frame) + ',inset 0 0 18px rgba(0,174,255,.25);background:rgba(4,12,26,.5);display:flex;align-items:center;justify-content:center;clip-path:' + clip + ';border-radius:' + radius + ';';
  var avatarImg = document.createElement('img');
  avatarImg.src = param('a', '/assets/img/avatar1.png');
  avatarImg.onerror = function () { this.onerror = null; this.src = '/assets/img/avatar1.png'; };
  avatarImg.style.cssText = 'width:' + size + 'px;height:' + size + 'px;object-fit:cover;border-radius:' + radius + ';display:block;' + (shape === 'diamond' ? 'transform:rotate(-45deg) scale(.72);' : '');
  wrap.appendChild(avatarImg);
  avatarLayer.appendChild(wrap);
  canvas.appendChild(avatarLayer);

  var textLayer = document.createElement('div');
  textLayer.style.cssText = 'position:absolute;z-index:3;left:' + (50 + num('textPosX', 0)) + '%;top:' + (50 + num('textPosY', 12)) + '%;transform:translate(-50%,-50%);width:1100px;text-align:center;';
  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'color:' + esc(color(cfg.nameColor, '#00aeff')) + ';font-size:' + num('nameFontSize', 28) + 'px;font-weight:800;line-height:1.1;text-shadow:0 0 18px rgba(0,174,255,.6);display:' + (cfg.showName === false ? 'none' : 'block') + ';font-family:' + esc(font(cfg.nameFontFamily)) + ';';
  nameEl.textContent = param('n', 'مستخدم تجريبي');
  var messageEl = document.createElement('div');
  messageEl.style.cssText = 'color:' + esc(color(cfg.messageColor, '#ffffff')) + ';font-size:' + num('messageFontSize', 22) + 'px;font-weight:700;margin-top:10px;line-height:1.35;font-family:' + esc(font(cfg.messageFontFamily)) + ';text-shadow:0 2px 10px rgba(0,0,0,.75);';
  messageEl.textContent = param('m');
  var giftWrap = document.createElement('div');
  giftWrap.style.cssText = 'margin-top:12px;display:' + (cfg.showGift === false ? 'none' : 'inline-block') + ';';
  var giftImg = document.createElement('img');
  giftImg.src = param('g', '/assets/img/tx-logo.png');
  giftImg.onerror = function () { this.onerror = null; this.src = '/assets/img/tx-logo.png'; };
  giftImg.style.cssText = 'width:64px;height:64px;object-fit:contain;border-radius:50%;box-shadow:0 0 18px rgba(0,174,255,.5);';
  giftWrap.appendChild(giftImg);
  textLayer.appendChild(nameEl);
  textLayer.appendChild(messageEl);
  textLayer.appendChild(giftWrap);
  canvas.appendChild(textLayer);

  var hideTimer = null;
  function play(name, text, avatar, duration) {
    if (name) nameEl.textContent = name;
    if (text) messageEl.textContent = text;
    if (avatar) avatarImg.src = avatar;
    root.style.opacity = '1';
    try { video.currentTime = 0; } catch (e) {}
    var started = video.play();
    if (started && started.catch) started.catch(function () {
      video.muted = true;
      var retry = video.play();
      if (retry && retry.catch) retry.catch(function () {});
    });
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      root.style.opacity = '0';
      try { video.pause(); } catch (e) {}
    }, clamp(Number(duration) || num('duration', 5), 1, 120) * 1000);
  }
  play(param('n', 'مستخدم تجريبي'), param('m'), param('a'), num('duration', 5));

  var KNOWN = { gift: 1, like: 1, follow: 1, share: 1, subscribe: 1, join: 1, chat: 1,
    member_join_overlay_update: 1, gift_overlay_update: 1, follow_overlay_update: 1,
    subscribe_overlay_update: 1 };
  var EVENT_KEYS = { gift: 'gift', like: 'like', follow: 'follow', share: 'share',
    subscribe: 'subscribe', join: 'join', chat: 'chat', comment: 'chat', member_join: 'join' };
  function connect() {
    var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
    var ws;
    try { ws = new WebSocket(proto + location.host + '/ws'); } catch (e) { return; }
    ws.onopen = function () {
      ws.send(JSON.stringify({ type: 'subscribe', streamerId: param('uid'), clientType: 'action-screen', screen: num('screen', 1) }));
    };
    ws.onmessage = function (msg) {
      var packet;
      try { packet = JSON.parse(msg.data); } catch (e) { return; }
      if (!packet || packet.type === 'pong' || packet.type === 'connected' || packet.type === 'subscribed') return;
      var data = packet.data || packet;
      var key = EVENT_KEYS[packet.type] || EVENT_KEYS[data.eventType] || (KNOWN[packet.type] ? packet.type : '');
      if (!KNOWN[key]) return;
      var user = data.user || data;
      var name = user.nickname || user.uniqueId || user.username || data.username || '';
      var text = '';
      if (key === 'gift') {
        var gift = data.gift || {};
        text = (gift.name || gift.giftName || 'هدية') + (gift.diamondCount ? ' · ' + gift.diamondCount + ' عملة' : '');
      } else if (key === 'like') text = 'أرسل ' + (data.likeCount || 1) + ' لايك';
      else if (key === 'chat') text = data.comment || data.message || '';
      else if (key === 'share') text = 'شارك البث';
      else if (key === 'subscribe') text = 'اشتراك في القناة';
      else if (key === 'join') text = 'انضم إلى البث';
      play(name, param('m', text), user.avatar || user.profilePicture || param('a'), num('duration', 5));
    };
    ws.onclose = function () { setTimeout(connect, 3000); };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }
  connect();
})();
<\/script>`;

function sendAlertScreenPage(relPath, res) {
  const file = path.join(APP_DATA, relPath);
  if (!fs.existsSync(file)) return res.status(404).end();
  const html = fs.readFileSync(file, 'utf8').replace(/<\/body>/i, ALERT_SCREEN_PATCH + '</body>');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
app.get('/overlay/actions.html', (req, res) => sendAlertScreenPage('overlay/actions.html', res));
app.get('/widgets/action-alert-console/index.html', (req, res) => sendAlertScreenPage('widgets/action-alert-console/index.html', res));

// Serve static files
app.use(serveStatic);

// === HTTP Server + WebSocket ===
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// WebSocket handling (from tiktok-service)
let TikLiveConnection;
try {
  const sdk = require('@tiktool/live');
  TikLiveConnection = sdk.TikTokLive || sdk.default;
  if (TikLiveConnection) console.log('[SDK] Loaded @tiktool/live');
} catch (e) {
  console.warn('[WARN] @tiktool/live not installed, mock mode:', e.message);
  TikLiveConnection = null;
}

// ============================================================================
// === TikTok LIVE connection core ============================================
// ============================================================================
// This is the ONLY place that decides whether we are connected. Nothing in this
// file may report success before TikTok itself confirms the connection.
//
// Real state machine (exposed to the UI through /stream/status + the WebSocket):
//   disconnected -> connecting -> connected
//                              \-> failed      (with a machine readable reason)
// Mock (deliberately flagged) is `connected` + mock:true + transport:'mock'.
// ----------------------------------------------------------------------------

const LOG_FILE = path.join(USER_DATA, 'events.log');

let stateRevision = 0;
let connection = null;
let currentStreamerId = null;
let connState = 'disconnected';   // disconnected | connecting | connected | failed
let connReason = null;            // NOT_LIVE | USER_NOT_FOUND | connect_timeout | auth_error | ...
let connError = null;             // technical message (never shown as "success")
let connStage = 'idle';           // idle | preflight | handshake | live | failed | mock
let connMessage = null;           // human readable status line for the UI
let mockActive = false;
let mockReason = null;
let mockInterval = null;
let streamerInfo = null;          // { uniqueId, nickname, avatar, roomId }
let connectedAt = null;
let lastEventAt = null;
let lastDisconnectReason = null;
let connectAttempt = null;        // in-flight attempt (used to de-duplicate clicks)
let preflightRoom = null;         // result of the "is this room live?" pre-flight
let connNickname = null;
let connAvatar = null;
const eventCounts = { like: 0, gift: 0, chat: 0, follow: 0, share: 0, join: 0, subscribe: 0 };

// --- API key resolution -----------------------------------------------------
// Priority: environment -> project data/config.json -> USER_DATA/config.json ->
// optional built-in fallback supplied via TIKTOOL_BUILTIN_API_KEY. Only the
// source name + a masked key are ever exposed; the raw key never leaves this
// process.
let _apiKeyCache = null;

function apiKeyCandidates() {
  if (_apiKeyCache) return _apiKeyCache;
  const list = [];
  const add = (source, value) => {
    const v = String(value == null ? '' : value).trim();
    if (!v) return;
    if (list.some((x) => x.value === v)) return;
    list.push({ source, value: v });
  };
  add('env:TIKTOOL_API_KEY', process.env.TIKTOOL_API_KEY);
  try {
    const p = path.join(__dirname, 'data', 'config.json');
    if (fs.existsSync(p)) add('data/config.json', JSON.parse(fs.readFileSync(p, 'utf8')).tiktoolApiKey);
  } catch (e) {}
  try {
    const p = path.join(USER_DATA, 'config.json');
    if (fs.existsSync(p)) add('USER_DATA/config.json', JSON.parse(fs.readFileSync(p, 'utf8')).tiktoolApiKey);
  } catch (e) {}
  add('builtin', process.env.TIKTOOL_BUILTIN_API_KEY);
  _apiKeyCache = list;
  return list;
}

function maskKey(k) {
  const s = String(k || '');
  if (s.length < 12) return '(key)';
  return s.slice(0, 7) + '...' + s.slice(-4);
}

function isAuthLike(text) {
  const s = String(text || '').toLowerCase();
  return s.includes('401') || s.includes('403') || s.includes('invalid api') ||
    s.includes('invalid_api') || s.includes('invalid key') || s.includes('api key') ||
    s.includes('apikey') || s.includes('unauthor') || s.includes('forbidden') ||
    s.includes('auth_error') || s.includes('quota');
}

// Pre-flight: ask the sign server whether the room is actually live. Without it
// the library happily connects to a stale room_id and TikTok drops the socket
// within seconds -- the classic "connects then disconnects" symptom.
async function resolveRoomAlive(uniqueId, apiKey) {
  try {
    const resp = await fetch(SIGN_SERVER + '/webcast/room_id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ unique_id: uniqueId }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      const err = (data && (data.error || data.message)) || ('http_' + resp.status);
      return {
        ok: false, roomId: null, alive: null, httpStatus: resp.status,
        aliveStatus: String(err), apiError: String(err),
        upgradeUrl: (data && data.upgrade_url) || null,
      };
    }
    if (data && Array.isArray(data) && data[0]) {
      return { ok: true, roomId: data[0].room_id || null, alive: data[0].alive !== false, aliveStatus: data[0].alive_status || 'live' };
    }
    if (data && data.status_code === 0 && data.data) {
      return { ok: true, roomId: data.data.room_id || null, alive: data.data.alive !== false, aliveStatus: data.data.alive_status || 'live' };
    }
    const err = (data && (data.error || data.message)) || 'unknown';
    return { ok: false, roomId: null, alive: null, httpStatus: resp.status, aliveStatus: String(err), apiError: String(err) };
  } catch (e) {
    return { ok: false, roomId: null, alive: null, aliveStatus: 'resolve_error: ' + e.message, apiError: e.message };
  }
}

// The signing service (api.tik.tools) can fail for three very different reasons.
// 'license' is the important one: every key is refused because the plan/trial is
// over, so no amount of key rotation will ever produce a real connection.
function classifySignFailure(room) {
  const s = String((room && (room.apiError || room.aliveStatus)) || '');
  if (/evaluation period ended|upgrade at|subscription|plan expired|payment required|quota exceeded|trial/i.test(s)) return 'license';
  if (isAuthLike(s) || (room && room.httpStatus === 401) || (room && room.httpStatus === 403)) return 'auth';
  return 'network';
}

function classifyConnectError(msg) {
  const s = String(msg || '');
  if (/connect_timeout/i.test(s)) return 'connect_timeout';
  if (/4404|not\s*live|offline|room\s*not\s*(live|found)|not_live/i.test(s)) return 'NOT_LIVE';
  if (/4402|user\s*not\s*found|USER_NOT_FOUND/i.test(s)) return 'USER_NOT_FOUND';
  if (isAuthLike(s)) return 'auth_error';
  return 'connect_error';
}

// Single point where the connection state changes + is broadcast.
function setConnectionState(state, reason, error, extra) {
  connState = state;
  connReason = reason || null;
  connError = error || null;
  const x = extra || {};
  if (x.stage) connStage = x.stage;
  if (x.message !== undefined) connMessage = x.message;
  const payload = {
    state,
    reason: connReason,
    error: connError,
    uniqueId: currentStreamerId,
    mock: mockActive,
    mockReason: mockReason,
    stage: connStage,
    message: connMessage,
    transport: mockActive ? 'mock' : (state === 'connected' ? 'live' : null),
    streamer: streamerInfo,
  };
  broadcastStreamState(state, currentStreamerId, payload);
  broadcast('connection_status', Object.assign({ connected: state === 'connected' }, payload));
  return payload;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect_timeout after ' + ms + 'ms')), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

function teardownSilently() {
  if (mockInterval) { clearInterval(mockInterval); mockInterval = null; }
  if (connection) {
    try { if (connection.removeAllListeners) connection.removeAllListeners(); } catch (e) {}
    try { connection.disconnect(); } catch (e) {}
    connection = null;
  }
  mockActive = false;
  mockReason = null;
}

// A real failure. Mock is used ONLY because the operator allowed it, it is always
// flagged, and it never touches the disk.
function failOrMock(uniqueId, allowMock, reason, message) {
  if (allowMock && reason !== 'INVALID_UNIQUE_ID') {
    mockActive = true;
    mockReason = reason;
    startMockMode(uniqueId);
    setConnectionState('connected', null, null, {
      stage: 'mock',
      message: 'MOCK MODE - no real TikTok connection (' + reason + '). ' + (message ? message + ' ' : '') + 'Everything shown is fake and is never saved.',
    });
    logEvent('mock_mode', { uniqueId, reason, message: message || null });
    console.warn('[MOCK] @' + uniqueId + ' real connect failed (' + reason + ') and ALLOW_MOCK=1 -> MOCK MODE. Nothing is real.');
    return { ok: true, success: true, state: 'connected', mock: true, mockReason: reason, reason, uniqueId, warning: message || reason };
  }
  teardownSilently();
  setConnectionState('failed', reason, message || reason, { stage: 'failed', message: message || reason });
  logEvent('connect_failed', { uniqueId, reason, message: message || null });
  console.warn('[LIVE] connect FAILED for @' + uniqueId + ': ' + reason + ' - ' + (message || ''));
  return { ok: false, success: false, state: 'failed', reason, error: message || reason, uniqueId, mock: false };
}

// Called ONLY from a real 'connected' event raised by the TikTok client.
function onConfirmedConnected(uniqueId) {
  mockActive = false;
  mockReason = null;
  connectedAt = Date.now();
  connStage = 'live';
  connReason = null;
  connError = null;
  streamerInfo = {
    uniqueId,
    nickname: connNickname || uniqueId,
    avatar: connAvatar || '',
    roomId: (preflightRoom && preflightRoom.roomId) || null,
  };
  setConnectionState('connected', null, null, { stage: 'live', message: 'Connected to @' + uniqueId + ' (confirmed by TikTok)' });
  try { persistProfile({ tiktok_unique_id: uniqueId, connectedAt: connectedAt }); } catch (e) {}
  logEvent('connected', { uniqueId, roomId: streamerInfo.roomId });
}

function attachLiveHandlers(uniqueId) {
  const bump = (k) => { eventCounts[k] = (eventCounts[k] || 0) + 1; lastEventAt = Date.now(); };

  connection.on('connected', () => { onConfirmedConnected(uniqueId); });

  connection.on('disconnected', (code, reason) => {
    if (mockActive) return;
    const r = String(reason || '');
    connStage = 'idle';
    setConnectionState('disconnected', r || 'STREAM_END', null, {
      stage: 'idle',
      message: 'Live connection dropped' + (code ? ' (code ' + code + ')' : '') + (r ? ': ' + r : ''),
    });
    logEvent('disconnected', { uniqueId, code: code || null, reason: r.slice(0, 200) });
  });

  connection.on('error', (err) => {
    const msg = (err && err.message) || String(err);
    connError = msg;
    logEvent('error', { uniqueId, message: msg });
    console.error('[LIVE] error @' + uniqueId + ': ' + msg);
  });

  connection.on('like', (data) => {
    const user = data.user || data;
    bump('like');
    updateLikeLeaderboard(user, data.likeCount || data.like_count || 1);
    broadcast('like', { user: rewriteAvatars(user), likeCount: data.likeCount || 1, total: data.totalLikeCount || 0 });
    pushLatestEvent('like', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: getUserAvatar(user), likeCount: data.likeCount || 1 });
    broadcastLeaderboard();
  });

  connection.on('chat', (data) => { bump('chat'); broadcast('chat', rewriteAvatars(data)); });

  connection.on('social', (data) => {
    const action = data.action || data.type;
    const user = data.user || data;
    if (action === 'follow' || action === 2) {
      bump('follow');
      broadcast('follow_overlay_update', rewriteAvatars(data));
      pushLatestEvent('follow', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: getUserAvatar(user) });
    } else if (action === 'share' || action === 3) {
      bump('share');
      broadcast('share_overlay_update', rewriteAvatars(data));
      pushLatestEvent('share', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: getUserAvatar(user) });
    }
  });

  connection.on('gift', (data) => {
    const user = data.user || data.sender || data;
    const diamonds = data.diamondCount || data.diamond_count || 0;
    const repeatCount = data.repeatCount || data.repeat_count || 1;
    const totalDiamonds = diamonds * repeatCount;
    bump('gift');
    updateGiftLeaderboard(user, totalDiamonds);
    upsertSupporter(user, totalDiamonds);
    broadcast('gift_overlay_update', rewriteAvatars(data));
    pushLatestEvent('gift', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: getUserAvatar(user), giftName: (data.gift && (data.gift.name || data.gift.nameInLocalized)) || 'Gift', diamondCount: totalDiamonds });
    broadcastLeaderboard();
  });

  connection.on('subscribe', (data) => {
    bump('subscribe');
    broadcast('subscribe_overlay_update', rewriteAvatars(data));
    pushLatestEvent('subscribe', { uniqueId: (data.user || data).uniqueId, nickname: (data.user || data).nickname, avatar: getUserAvatar(data.user || data) });
  });

  connection.on('member', (data) => {
    const action = data.action || data.type;
    const user = data.user || data;
    if (action === 'join' || action === 1) {
      bump('join');
      broadcast('member_join_overlay_update', rewriteAvatars(data));
      pushLatestEvent('join', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: getUserAvatar(user) });
    }
  });

  connection.on('roomUserSeq', (data) => broadcastToAll('room_viewers_update', rewriteAvatars(data)));

  connection.on('roomInfo', (data) => {
    try {
      const info = data || {};
      if (info.owner) {
        connNickname = info.owner.nickname || connNickname;
        connAvatar = getUserAvatar(info.owner) || connAvatar;
      }
      broadcastToAll('room_info_update', rewriteAvatars(info));
    } catch (e) {}
  });
}

// One real handshake with one API key. Returns { outcome, value } where outcome
// is 'done' (definitive result) or 'auth_error' (the key itself was refused).
// `signIssue`/`signDetail` come from the pre-flight so a dead signing service is
// reported as such instead of as a vague "session cookie" failure.
async function attemptHandshake(uniqueId, allowMock, cand, signIssue, signDetail) {
  const key = cand.value;

  setConnectionState('connecting', 'recovery_pending', null, {
    stage: 'handshake',
    message: 'Opening the TikTok LIVE socket for @' + uniqueId + '... (key: ' + cand.source + ')',
  });

  function failureReason(msg) {
    if (signIssue === 'license') return 'SIGN_LICENSE_EXPIRED';
    return classifyConnectError(msg);
  }
  function failureMessage(msg) {
    if (signIssue === 'license') {
      return 'The TikTok signing service (api.tik.tools) refused every request: ' + signDetail + ' (underlying error: ' + msg + ')';
    }
    return msg;
  }

  try {
    connection = new TikLiveConnection({
      uniqueId: uniqueId,
      apiKey: key,
      autoReconnect: true,
      maxReconnectAttempts: Infinity,
      heartbeatInterval: 10000,
      signServerUrl: SIGN_SERVER,
    });
  } catch (e) {
    connection = null;
    return { outcome: 'done', value: failOrMock(uniqueId, allowMock, failureReason(e.message), failureMessage('Could not create the TikTok client: ' + e.message)) };
  }

  attachLiveHandlers(uniqueId);

  try {
    await withTimeout(connection.connect(), CONNECT_TIMEOUT_MS);
  } catch (e) {
    const msg = (e && e.message) || String(e);
    const reason = failureReason(msg);
    teardownSilently();
    if (reason === 'auth_error') {
      console.warn('[LIVE] API key from ' + cand.source + ' rejected: ' + msg);
      return { outcome: 'auth_error', value: null };
    }
    return { outcome: 'done', value: failOrMock(uniqueId, allowMock, reason, failureMessage(msg)) };
  }

  onConfirmedConnected(uniqueId);
  return { outcome: 'done', value: { ok: true, success: true, state: 'connected', uniqueId: uniqueId, mock: false, streamer: streamerInfo } };
}

async function runConnectAttempt(uniqueId, allowMock) {
  if (!TikLiveConnection) {
    return failOrMock(uniqueId, allowMock, 'sdk_missing', 'The @tiktool/live SDK is not installed on this server');
  }
  const candidates = apiKeyCandidates();
  if (!candidates.length) {
    return failOrMock(uniqueId, allowMock, 'no_api_key', 'No TikTool API key configured (TIKTOOL_API_KEY)');
  }

  // --- Pre-flight with the primary key -------------------------------------
  // Tells us two things: is the room actually live, and is the signing service
  // still usable? Both are answers we must not guess.
  const primary = candidates[0];
  setConnectionState('connecting', 'recovery_pending', null, {
    stage: 'preflight',
    message: 'Checking that @' + uniqueId + ' is live... (key: ' + primary.source + ')',
  });
  const room = await resolveRoomAlive(uniqueId, primary.value);
  console.log('[LIVE] preflight @' + uniqueId + ' key=' + primary.source + ' ' + maskKey(primary.value) + ' -> ' + JSON.stringify(room));

  let signIssue = null;
  let signDetail = '';
  if (room.ok) {
    preflightRoom = room;
    if (room.alive === false) {
      return failOrMock(uniqueId, allowMock, 'NOT_LIVE', '@' + uniqueId + ' is not live right now (' + room.aliveStatus + ')');
    }
  } else {
    signIssue = classifySignFailure(room);
    signDetail = room.aliveStatus || 'unknown';
    console.warn('[LIVE] preflight problem: ' + signIssue + ' - ' + signDetail);
  }

  // A license problem hits every key identically, so rotating is pointless.
  const list = signIssue === 'license' ? [primary] : candidates;

  // --- Real handshake ------------------------------------------------------
  let last = null;
  for (let i = 0; i < list.length; i++) {
    const res = await attemptHandshake(uniqueId, allowMock, list[i], signIssue, signDetail);
    if (res.outcome !== 'auth_error') {
      const value = res.value;
      if (value && signIssue) value.signIssue = signIssue;
      return value;
    }
    last = res.value;
  }

  if (signIssue === 'license') {
    return failOrMock(uniqueId, allowMock, 'SIGN_LICENSE_EXPIRED', 'The TikTok signing service (api.tik.tools) refused every request: ' + signDetail);
  }
  return last || failOrMock(uniqueId, allowMock, 'auth_error', 'The TikTool API key was rejected by the signing server');
}

async function connectToTikTok(uniqueId, opts) {
  const o = opts || {};
  const id = String(uniqueId == null ? '' : uniqueId).trim().replace(/^@+/, '');
  const allowMock = typeof o.allowMock === 'boolean' ? o.allowMock : ALLOW_MOCK;

  if (!id) {
    return { ok: false, success: false, state: 'failed', reason: 'INVALID_UNIQUE_ID', error: 'uniqueId required', uniqueId: null };
  }
  if (!/^[A-Za-z0-9._]{2,32}$/.test(id)) {
    return { ok: false, success: false, state: 'failed', reason: 'INVALID_UNIQUE_ID', error: 'Invalid TikTok username: ' + id, uniqueId: id };
  }

  if (connState === 'connected' && currentStreamerId === id && connection) {
    return { ok: true, success: true, alreadyConnected: true, state: 'connected', uniqueId: id, mock: mockActive, streamer: streamerInfo };
  }
  if (connState === 'connecting' && currentStreamerId === id && connectAttempt) {
    if (o.wait) return await connectAttempt.promise;
    return { ok: true, success: true, state: 'connecting', uniqueId: id, mock: false };
  }

  teardownSilently();
  if (connectAttempt) connectAttempt = null;

  currentStreamerId = id;
  connError = null;
  connReason = null;
  connMessage = null;
  connStage = 'preflight';
  mockActive = false;
  mockReason = null;
  streamerInfo = null;
  connectedAt = null;
  preflightRoom = null;
  connNickname = null;
  connAvatar = null;
  lastDisconnectReason = null;
  resetAllStreamData();

  const attempt = { uniqueId: id, startedAt: Date.now(), allowMock: allowMock, promise: null };
  connectAttempt = attempt;

  setConnectionState('connecting', 'recovery_pending', null, { stage: 'preflight', message: 'Connecting to @' + id + '...' });

  const promise = runConnectAttempt(id, allowMock)
    .catch((e) => {
      console.error('[LIVE] connect attempt crashed:', e);
      return failOrMock(id, allowMock, 'connect_error', (e && e.message) ? e.message : String(e));
    })
    .finally(() => { if (connectAttempt === attempt) connectAttempt = null; });

  attempt.promise = promise;

  if (o.wait) return await promise;
  return { ok: true, success: true, state: 'connecting', uniqueId: id, mock: false };
}

function disconnectFromTikTok(reason) {
  const r = reason || 'user_disconnect';
  teardownSilently();
  if (connectAttempt) connectAttempt = null;
  lastDisconnectReason = r;
  currentStreamerId = null;
  streamerInfo = null;
  connectedAt = null;
  connStage = 'idle';
  setConnectionState('disconnected', r, null, { stage: 'idle', message: 'Disconnected' });
  logEvent('disconnect', { reason: r });
  return { ok: true, success: true, state: 'disconnected', reason: r, mock: false };
}

function getStatus() {
  const key = apiKeyCandidates()[0];
  return {
    ok: true,
    state: connState,
    connected: connState === 'connected',
    connecting: connState === 'connecting',
    failed: connState === 'failed',
    mock: mockActive,
    transport: mockActive ? 'mock' : (connState === 'connected' ? 'live' : null),
    mockReason: mockReason,
    reason: connReason,
    error: connError,
    stage: connStage,
    message: connMessage,
    uniqueId: currentStreamerId,
    streamerId: currentStreamerId,
    streamer: streamerInfo,
    connectedAt: connectedAt,
    lastEventAt: lastEventAt,
    lastDisconnectReason: lastDisconnectReason,
    eventCounts: eventCounts,
    stateRevision: stateRevision,
    sdkAvailable: !!TikLiveConnection,
    allowMock: ALLOW_MOCK,
    apiKeySource: key ? key.source : null,
    apiKeyMasked: key ? maskKey(key.value) : null,
    serverTime: Date.now(),
    sessions: sessions.size,
    totalClients: [...sessions.values()].reduce((sum, s) => sum + s.size, 0),
    likeLeaderboardSize: likeLeaderboard.size,
    giftLeaderboardSize: giftLeaderboard.size,
  };
}

// --- Mock mode (flagged everywhere, never persisted) ------------------------
const mockNames = ['User_Alpha', 'TikTokFan92', 'LiveViewer_X', 'StreamFan42', 'DanceLover88'];

function generateMockUser() {
  const name = mockNames[Math.floor(Math.random() * mockNames.length)] + Math.floor(Math.random() * 1000);
  return { uniqueId: name.toLowerCase().replace(/[^a-z0-9]/g, ''), nickname: name, avatar: '' };
}

function startMockMode(uniqueId) {
  if (mockInterval) clearInterval(mockInterval);
  console.warn('[MOCK] MOCK MODE ACTIVE for @' + uniqueId + ' - every event below is FAKE and is NEVER written to disk.');
  mockInterval = setInterval(() => {
    lastEventAt = Date.now();
    const rand = Math.random();
    const user = generateMockUser();
    const tag = { isMock: true };
    if (rand < 0.3) {
      const count = Math.floor(Math.random() * 50) + 1;
      updateLikeLeaderboard(user, count);
      broadcast('like', { user: user, likeCount: count, total: Math.floor(Math.random() * 10000), mock: true });
      pushLatestEvent('like', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: user.avatar }, tag);
      broadcastLeaderboard();
    } else if (rand < 0.45) {
      broadcast('chat', { user: user, comment: ['Hello!', 'Love this!', 'Amazing!'][Math.floor(Math.random() * 3)], mock: true });
    } else if (rand < 0.6) {
      broadcast('follow_overlay_update', { user: user, mock: true });
      pushLatestEvent('follow', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: user.avatar }, tag);
    } else if (rand < 0.7) {
      broadcast('share_overlay_update', { user: user, mock: true });
      pushLatestEvent('share', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: user.avatar }, tag);
    } else if (rand < 0.8) {
      const diamonds = Math.floor(Math.random() * 100) + 1;
      updateGiftLeaderboard(user, diamonds);
      // Deliberately NOT calling upsertSupporter(): a mock gift must never
      // pollute the real supporters leaderboard that is written to disk.
      broadcast('gift_overlay_update', { user: user, gift: { name: 'Rose', diamondCount: diamonds, count: 1 }, mock: true });
      pushLatestEvent('gift', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: user.avatar, giftName: 'Rose', diamondCount: diamonds }, tag);
      broadcastLeaderboard();
    } else if (rand < 0.9) {
      broadcast('member_join_overlay_update', { user: user, mock: true });
      pushLatestEvent('join', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: user.avatar }, tag);
    } else {
      broadcast('subscribe_overlay_update', { user: user, mock: true });
      pushLatestEvent('subscribe', { uniqueId: user.uniqueId, nickname: user.nickname, avatar: user.avatar }, tag);
    }
  }, 2000 + Math.floor(Math.random() * 3000));
}

const sessions = new Map();
const likeLeaderboard = new Map();
const giftLeaderboard = new Map();

const avatarFields = ['avatar', 'avatarLargeUrl', 'avatarThumbUrl', 'avatarMediumUrl', 'profilePictureUrl', 'profilePicture', 'avatarUrl', 'roomAvatar'];

function logEvent(type, data) {
  const entry = `[${new Date().toISOString()}] ${type}: ${JSON.stringify(data)}\n`;
  try { fs.appendFileSync(LOG_FILE, entry); } catch (e) {}
  console.log(`[EVENT] ${type}`, JSON.stringify(data).slice(0, 200));
}

function getUserAvatar(user) {
  if (!user) return null;
  if (user.profilePicture) {
    if (typeof user.profilePicture === 'string') return user.profilePicture;
    if (user.profilePicture.url) return user.profilePicture.url;
  }
  for (const field of avatarFields) {
    if (user[field] && typeof user[field] === 'string') return user[field];
  }
  return null;
}

function proxyAvatarUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('tiktokcdn') || url.includes('byteimg')) {
    return `http://localhost:${PORT}/proxy/avatar?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function rewriteAvatars(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => rewriteAvatars(item));
  const result = { ...obj };
  for (const field of avatarFields) {
    if (result[field]) {
      if (typeof result[field] === 'string') result[field] = proxyAvatarUrl(result[field]);
      else if (typeof result[field] === 'object') {
        if (result[field].url) result[field].url = proxyAvatarUrl(result[field].url);
        result[field] = rewriteAvatars(result[field]);
      }
    }
  }
  if (result.user) result.user = rewriteAvatars(result.user);
  if (result.sender) result.sender = rewriteAvatars(result.sender);
  if (result.gift) result.gift = rewriteAvatars(result.gift);
  return result;
}

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data: rewriteAvatars(data), ts: Date.now() });
  sessions.forEach((clientSet) => {
    clientSet.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(msg); } catch (e) {}
      }
    });
  });
}

function broadcastToAll(type, data) { broadcast(type, data); }

function broadcastActionScreens() {
  broadcast('action_screens_status', {
    screens: [1, 2, 3, 4, 5].map(n => ({
      screen: n,
      online: [...actionScreens.keys()].some(k => k.endsWith(':' + n))
    }))
  });
}

// === Latest Events (آخر الأحداث) ===
function pushLatestEvent(eventType, eventData, extra) {
  const payload = { eventType, event: rewriteAvatars(eventData), ts: Date.now(), ...(extra || {}) };
  if (!payload.isTest) latestEventsStore[eventType] = payload;
  broadcast('latest_event_update', payload);
  return payload;
}

function broadcastStreamState(state, uniqueId, extra) {
  stateRevision++;
  const payload = Object.assign({
    state, stateRevision, generation: 1, updatedAt: Date.now(), timestamp: Date.now(),
    uniqueId: uniqueId || currentStreamerId, connected: state === 'connected'
  }, extra || {});
  broadcast('stream-state-updated', payload);
  return payload;
}

function broadcastLeaderboard() {
  const top10Likes = [...likeLeaderboard.values()].sort((a, b) => b.score - a.score).slice(0, 10);
  const top50Gifts = [...giftLeaderboard.values()].sort((a, b) => b.score - a.score).slice(0, 50);
  const combined = new Map();
  for (const e of top10Likes) combined.set(e.uniqueId, { ...e, likeScore: e.score, giftScore: 0 });
  for (const e of top50Gifts) {
    if (combined.has(e.uniqueId)) combined.get(e.uniqueId).giftScore = e.score;
    else combined.set(e.uniqueId, { ...e, likeScore: 0, giftScore: e.score });
  }
  const top3 = [...combined.values()].sort((a, b) => (b.likeScore + b.giftScore) - (a.likeScore + a.giftScore)).slice(0, 3);
  broadcastToAll('top_likes_update', { top10: top10Likes });
  broadcastToAll('top_gifters_update', { top50: top50Gifts });
  broadcastToAll('leaderboard_update', { topLikes: top10Likes, topGifts: top50Gifts, topCombined: top3 });
  broadcastToAll('top_rankers_update', { top3 });
}

function updateLikeLeaderboard(user, likeCount) {
  if (!user?.uniqueId) return;
  const entry = likeLeaderboard.get(user.uniqueId) || { uniqueId: user.uniqueId, nickname: user.nickname || user.uniqueId, avatar: getUserAvatar(user), score: 0 };
  entry.score += likeCount || 1;
  if (user.nickname) entry.nickname = user.nickname;
  const avatar = getUserAvatar(user);
  if (avatar) entry.avatar = avatar;
  likeLeaderboard.set(user.uniqueId, entry);
}

function updateGiftLeaderboard(user, diamondCount) {
  if (!user?.uniqueId) return;
  const entry = giftLeaderboard.get(user.uniqueId) || { uniqueId: user.uniqueId, nickname: user.nickname || user.uniqueId, avatar: getUserAvatar(user), score: 0 };
  entry.score += diamondCount || 0;
  if (user.nickname) entry.nickname = user.nickname;
  const avatar = getUserAvatar(user);
  if (avatar) entry.avatar = avatar;
  giftLeaderboard.set(user.uniqueId, entry);
}

// Persist a real gift event into the supporters leaderboard (تصنيف الداعمين)
function upsertSupporter(user, totalDiamonds) {
  // Mock mode must NEVER reach the real supporters leaderboard on disk.
  if (mockActive) return;
  if (!user || (!user.uniqueId && !user.nickname)) return;
  const key = String(user.uniqueId || user.nickname);
  const data = loadSupporters();
  let row = data.find((x) => String(x.supporter_username || '').toLowerCase() === key.toLowerCase());
  if (!row) {
    row = {
      id: 'sup_' + key.toLowerCase().replace(/[^a-z0-9]/gi, '_'),
      supporter_username: key,
      nickname: user.nickname || key,
      avatar: proxyAvatarUrl(getUserAvatar(user)) || '',
      total_diamonds: 0,
      timestamp: Math.floor(Date.now() / 1000),
    };
    data.push(row);
  }
  row.total_diamonds = (Number(row.total_diamonds) || 0) + (Number(totalDiamonds) || 0);
  if (user.nickname) row.nickname = user.nickname;
  const av = proxyAvatarUrl(getUserAvatar(user));
  if (av) row.avatar = av;
  data.sort((a, b) => (Number(b.total_diamonds) || 0) - (Number(a.total_diamonds) || 0));
  saveSupporters(data);
  broadcastToAll('supporters_update', { supporters: data.slice(0, 50), ts: Date.now() });
}

// Reset every stream-scoped store when switching to a new username (كل شيء يبدأ من جديد)
function resetAllStreamData() {
  Object.keys(latestEventsStore).forEach((k) => delete latestEventsStore[k]);
  likeLeaderboard.clear();
  giftLeaderboard.clear();
  try { saveSupporters([]); } catch (e) {}
  broadcastToAll('latest_events_reset', { ts: Date.now() });
  broadcastToAll('top_likes_reset', { message: 'Switched user - reset' });
  broadcastToAll('top_gifters_reset', { message: 'Switched user - reset' });
  broadcastToAll('top_rankers_reset', { top3: [] });
  broadcastToAll('leaderboard_update', { topLikes: [], topGifts: [], topCombined: [] });
  broadcastToAll('supporters_reset', { ts: Date.now() });
  console.log('[DATA] Stream data reset for user change');
}

function resetLikeLeaderboard() {
  likeLeaderboard.clear();
  broadcastToAll('top_likes_reset', { message: 'Leaderboard reset' });
}

// (the TikTok LIVE connection core lives with the WebSocket wiring above)
// /api/status, /api/connect and /api/disconnect are registered at the top of this file.
app.post('/api/leaderboard/reset', (req, res) => {
  resetLikeLeaderboard();
  res.json({ success: true });
});

// WebSocket
server.on('upgrade', (request, socket, head) => {
  const parsedUrl = new URL(request.url, `http://localhost:${PORT}`);
  if (parsedUrl.pathname !== '/ws') { socket.destroy(); return; }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
  sessions.get(sessionId).add(ws);

  ws.send(JSON.stringify({ type: 'connected', data: { sessionId, status: getStatus() }, ts: Date.now() }));
  // Always push the true current state (including mock:true + its reason) so a
  // freshly opened tab can never be misled about the connection.
  try {
    const st = getStatus();
    ws.send(JSON.stringify({ type: 'connection_status', data: st, ts: Date.now() }));
    ws.send(JSON.stringify(Object.assign({ type: 'stream-state-updated', stateRevision, generation: 1, updatedAt: Date.now(), timestamp: Date.now() }, st)));
  } catch (e) {}

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe' || msg.action === 'subscribe') {
        ws.streamerId = msg.streamerId;
        if (msg.clientType === 'action-screen' || msg.clientType === 'action-console') {
          const n = Math.min(5, Math.max(1, Number(msg.screen) || 1));
          ws.actionScreenKey = String(msg.streamerId || '') + ':' + n;
          actionScreens.set(ws.actionScreenKey, Date.now());
          broadcastActionScreens();
        }
        ws.send(JSON.stringify({ type: 'subscribed', streamerId: msg.streamerId, ts: Date.now() }));
        const st = getStatus();
        ws.send(JSON.stringify(Object.assign({
          type: 'stream-state-updated', stateRevision, generation: 1,
          updatedAt: Date.now(), timestamp: Date.now(), ts: Date.now()
        }, st)));
        ws.send(JSON.stringify(Object.assign({ type: 'connection_status', ts: Date.now() }, st)));
      } else if (msg.type === 'ping' || msg.action === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      } else if (msg.type === 'dashboard-register' || msg.type === 'dashboard_register') {
        ws.send(JSON.stringify({ type: 'SESSION_ACTIVE', sessionId: msg.sessionId, ts: Date.now() }));
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    const clientSet = sessions.get(sessionId);
    if (clientSet) { clientSet.delete(ws); if (clientSet.size === 0) sessions.delete(sessionId); }
    if (ws.actionScreenKey) {
      actionScreens.delete(ws.actionScreenKey);
      broadcastActionScreens();
    }
  });
});

// === Start Server ===
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error('');
    console.error('[FATAL] Port ' + PORT + ' is already in use by another process.');
    console.error('        Stop the other process, or run this server on another port:');
    console.error('        PowerShell:  $env:PORT=3100; node server.js');
    console.error('        CMD:         set PORT=3100 && node server.js');
    console.error('        Find the owner:  netstat -ano | findstr :' + PORT);
    console.error('');
  } else {
    console.error('[FATAL] server error:', err);
  }
  logEvent('server_error', { code: err && err.code, message: err && err.message });
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  TikFlux Desktop Server`);
  console.log(`  Port: ${PORT}`);
  console.log(`  App Data: ${APP_DATA}`);
  console.log(`  User Data: ${USER_DATA}`);
  console.log(`  Settings file: ${SETTINGS_FILE}`);
  console.log(`  Profile file:  ${PROFILE_FILE}`);
  console.log(`  TikTok SDK: ${TikLiveConnection ? 'loaded' : 'MISSING (real connections impossible)'}`);
  const _k = apiKeyCandidates()[0];
  console.log(`  TikTool key: ${_k ? _k.source + ' ' + maskKey(_k.value) : 'none'}`);
  console.log(`  Mock fallback: ${ALLOW_MOCK ? 'ENABLED (always flagged, never persisted)' : 'disabled'}`);
  console.log(`========================================\n`);
  logEvent('server_start', { port: PORT, appData: APP_DATA });

  // Periodic leaderboard broadcast
  setInterval(() => {
    if (connState === 'connected' && (likeLeaderboard.size > 0 || giftLeaderboard.size > 0)) {
      broadcastLeaderboard();
    }
  }, 10000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  disconnectFromTikTok();
  wss.clients.forEach(c => c.close());
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL]', err);
  logEvent('uncaught_exception', { message: err.message, stack: err.stack });
});
