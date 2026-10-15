const { TikTokLive } = require('@tiktool/live');
const { getApiKey } = require('./lib');

const SIGN_SERVER = 'https://api.tik.tools';

// Pre-flight: ask TikTool whether the room is actually live. Without this, the
// library connects to a stale/offline room_id and TikTok drops the WS within
// seconds (the classic "connects then disconnects" symptom on offline streams).
async function resolveRoomAlive(uniqueId, apiKey) {
  try {
    const resp = await fetch(`${SIGN_SERVER}/webcast/room_id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ unique_id: uniqueId }),
      signal: AbortSignal.timeout(12000),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.status_code === 0 && data.data) {
        return { ok: true, roomId: data.data.room_id, alive: !!data.data.alive, aliveStatus: data.data.alive_status || 'live' };
      }
      return { ok: false, roomId: null, alive: false, aliveStatus: (data && data.error) || 'unknown' };
    }
    return { ok: false, roomId: null, alive: false, aliveStatus: 'http_' + resp.status };
  } catch (e) {
    return { ok: false, roomId: null, alive: false, aliveStatus: 'resolve_error' };
  }
}

const clients = new Map(); // username -> { client, state, events[], ... }

function normalize(u) {
  return String(u || '').trim().replace(/^@/, '').toLowerCase();
}

function emptyState(username) {
  return {
    username: username.toLowerCase(),
    connected: false,
    connecting: false,
    connectedAt: null,
    error: null,
    lastFollower: null,   // {uniqueId,nickname,avatarUrl,timestamp}
    lastSubscriber: null, // rose / ahebni
    lastGift: null,       // {uniqueId,nickname,avatarUrl,giftName,giftPictureUrl,coinValue,repeatCount,coinTotal,timestamp}
    lastLike: null,       // {uniqueId,nickname,avatarUrl,count,timestamp}
    heartMeCount: 0,      // total hearts (likes) this session
    initialHeartMe: 0,    // offset added to displayed count
    uniqueHeartUsers: new Set(),
    topLikers: [],        // {uniqueId,nickname,avatarUrl,rank,count}
    likeBuckets: new Map(), // uniqueId -> count
    topDonors: [],        // {uniqueId,nickname,avatarUrl,coinTotal,rank}
    donorTotal: new Map(),  // uniqueId -> coins
    events: [],           // ring buffer event log
  };
}

function getOrCreate(username) {
  const key = normalize(username);
  if (!clients.has(key)) {
    clients.set(key, { ref: emptyState(key), client: null, destroyTimer: null });
  }
  return clients.get(key);
}

function avatarOf(user) {
  if (!user) return null;
  return user.avatarLargeUrl || user.profilePicture || null;
}

function pushEvent(state, ev) {
  state.events.push(ev);
  if (state.events.length > 500) state.events.splice(0, state.events.length - 500);
  try {
    const tl = require('../topLikes');
    tl.feedEvent(state.username, ev);
  } catch (e) {}
  try {
    const realtime = require('../realtime');
    realtime.broadcast(state.username, ev);
  } catch (e) {}
}

function heartTotal(state) {
  return state.initialHeartMe + state.heartMeCount;
}

function recomputeTopLikers(state, limit) {
  limit = limit || 20;
  const arr = Array.from(state.likeBuckets.entries())
    .map(([uniqueId, count]) => ({ uniqueId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  state.topLikers = arr.map((x, i) => ({
    uniqueId: x.uniqueId,
    nickname: state.likeNames && state.likeNames.get(x.uniqueId),
    avatarUrl: state.likeAvatars && state.likeAvatars.get(x.uniqueId),
    rank: i + 1,
    count: x.count,
  }));
  return state.topLikers;
}

function recomputeTopDonors(state, limit) {
  limit = limit || 20;
  const arr = Array.from(state.donorTotal.entries())
    .map(([uniqueId, coins]) => ({ uniqueId, coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, limit);
  state.topDonors = arr.map((x, i) => ({
    uniqueId: x.uniqueId,
    nickname: state.donorNames && state.donorNames.get(x.uniqueId),
    avatarUrl: state.donorAvatars && state.donorAvatars.get(x.uniqueId),
    coinTotal: x.coins,
    rank: i + 1,
  }));
  return state.topDonors;
}

function disconnect(username, intentional) {
  const key = normalize(username);
  const rec = clients.get(key);
  if (!rec) return;
  rec.ref.stopped = true;
  if (rec.ref.reconnectTimer) { clearTimeout(rec.ref.reconnectTimer); rec.ref.reconnectTimer = null; }
  if (rec.client) {
    try { rec.client.off && rec.client.removeAllListeners && rec.client.removeAllListeners(); } catch (e) {}
    try { rec.client.disconnect(); } catch (e) {}
  }
  rec.client = null;
  rec.ref.connected = false;
  rec.ref.connecting = false;
  if (intentional) {
    if (rec.destroyTimer) clearTimeout(rec.destroyTimer);
    rec.destroyTimer = setTimeout(() => {
      const r = clients.get(key);
      if (r && !r.ref.connected && !r.ref.connecting) clients.delete(key);
    }, 10 * 60 * 1000);
  }
}

// Build a brand-new TikTokLive client wired to all handlers, and connect.
// Returns the connected state object. On websocket drop we schedule an
// automatic reconnect so the UI does not stay stuck at "disconnected".
function buildClient(key, rec, apiKey) {
  const state = rec.ref;
  return new Promise((resolve) => {
    if (rec.destroyTimer) { clearTimeout(rec.destroyTimer); rec.destroyTimer = null; }
    if (rec.client) { try { rec.client.removeAllListeners && rec.client.removeAllListeners(); rec.client.disconnect(); } catch (e) {} }
    const client = new TikTokLive({
      uniqueId: key,
      apiKey,
      autoReconnect: true,
      maxReconnectAttempts: Infinity,
      heartbeatInterval: 10000,
      signServerUrl: 'https://api.tik.tools',
    });
    rec.client = client;

    if (!state.likeNames) state.likeNames = new Map();
    if (!state.likeAvatars) state.likeAvatars = new Map();
    if (!state.donorNames) state.donorNames = new Map();
    if (!state.donorAvatars) state.donorAvatars = new Map();

    client.on('connected', () => {
      console.log('[tik] CONNECTED', key);
      if (rec._libReconnectWatchdog) { clearTimeout(rec._libReconnectWatchdog); rec._libReconnectWatchdog = null; }
      if (state.reconnectTimer) { clearTimeout(state.reconnectTimer); state.reconnectTimer = null; }
      state.reconnectFails = 0;
      state.connecting = false;
      state.connected = true;
      state.error = null;
      state.connectedAt = Date.now();
    });
    client.on('disconnected', (code, reason) => {
      const reasonStr = String(reason || '');
      console.log('[tik] DISCONNECTED', key, 'code=' + code, 'reason=' + reasonStr.slice(0, 80));
      if (state.connected) state.lastDrop = { code, reason: reasonStr, at: Date.now() };
      state.connected = false;
      state.connecting = false;
      // The library has its own autoReconnect (maxReconnectAttempts: Infinity).
      // Do NOT call scheduleReconnect here — it would create a competing
      // reconnection that kills the library's own reconnect attempt.
      // Only fall back to manual reconnect if the library gives up
      // (which with Infinity it never should, but just in case):
      const timer = setTimeout(() => {
        if (!state.connected && !state.connecting && !state.stopped) {
          console.log('[tik] library reconnect may have failed, trying manual reconnect');
          scheduleReconnect(key, rec, apiKey, false);
        }
      }, 60000);
      if (rec._libReconnectWatchdog) clearTimeout(rec._libReconnectWatchdog);
      rec._libReconnectWatchdog = timer;
    });
    client.on('error', (err) => {
      const msg = (err && err.message) || String(err);
      console.log('[tik] ERROR', key, msg);
      state.error = msg;
      if (!state.connected && !state.connecting && !state.stopped) scheduleReconnect(key, rec, apiKey);
    });

    client.on('social', (e) => {
      const u = e.user;
      const rec2 = { uniqueId: u.uniqueId, nickname: u.nickname, avatarUrl: avatarOf(u), timestamp: Date.now() };
      if (e.action === 'follow' || e.action === 1) {
        state.lastFollower = rec2;
        pushEvent(state, { id: 'ev_' + Date.now(), type: 'follow', uniqueId: u.uniqueId, nickname: u.nickname, avatarUrl: avatarOf(u), detail: 'followed', timestamp: Date.now() });
      } else if (e.action === 'share' || e.action === 2) {
        pushEvent(state, { id: 'ev_' + Date.now(), type: 'share', uniqueId: u.uniqueId, nickname: u.nickname, avatarUrl: avatarOf(u), detail: 'shared', timestamp: Date.now() });
      }
    });

    client.on('member', (e) => {
      pushEvent(state, { id: 'ev_' + Date.now(), type: 'member', uniqueId: e.user.uniqueId, nickname: e.user.nickname, avatarUrl: avatarOf(e.user), detail: 'joined', timestamp: Date.now() });
    });

    client.on('subscribe', (e) => {
      const u = e.user;
      state.lastSubscriber = { uniqueId: u.uniqueId, nickname: u.nickname, avatarUrl: avatarOf(u), timestamp: Date.now() };
      pushEvent(state, { id: 'ev_' + Date.now(), type: 'rose', uniqueId: u.uniqueId, nickname: u.nickname, avatarUrl: avatarOf(u), detail: 'subscribe', timestamp: Date.now() });
    });

    client.on('like', (e) => {
      const u = e.user;
      const n = Number(e.likeCount) || 1;
      const prev = state.likeBuckets.get(u.uniqueId) || 0;
      state.likeBuckets.set(u.uniqueId, prev + n);
      state.likeNames.set(u.uniqueId, u.nickname);
      if (avatarOf(u)) state.likeAvatars.set(u.uniqueId, avatarOf(u));
      if (!state.uniqueHeartUsers.has(u.uniqueId)) state.uniqueHeartUsers.add(u.uniqueId);
      state.heartMeCount += n;
      state.lastLike = { uniqueId: u.uniqueId, nickname: u.nickname, avatarUrl: avatarOf(u), count: n, timestamp: Date.now() };
      recomputeTopLikers(state);
      pushEvent(state, { id: 'ev_' + Date.now(), type: 'like', uniqueId: u.uniqueId, nickname: u.nickname, avatarUrl: avatarOf(u), detail: n + '', timestamp: Date.now() });
    });

    client.on('gift', (e) => {
      const u = e.user;
      const diamonds = Number(e.diamondCount) || 0;
      const repeat = Number(e.repeatCount) || 1;
      const giftTotal = diamonds * repeat;
      const prevCoins = state.donorTotal.get(u.uniqueId) || 0;
      state.donorTotal.set(u.uniqueId, prevCoins + giftTotal);
      state.donorNames.set(u.uniqueId, u.nickname);
      if (avatarOf(u)) state.donorAvatars.set(u.uniqueId, avatarOf(u));
      state.lastGift = {
        uniqueId: u.uniqueId,
        nickname: u.nickname,
        avatarUrl: avatarOf(u),
        giftName: e.giftName || 'gift',
        giftPictureUrl: e.iconUrl || avatarOf(u) || null,
        coinValue: diamonds,
        repeatCount: repeat,
        coinTotal: giftTotal,
        timestamp: Date.now(),
      };
      recomputeTopDonors(state);
      pushEvent(state, { id: 'ev_' + Date.now(), type: 'gift', uniqueId: u.uniqueId, nickname: u.nickname, avatarUrl: avatarOf(u), detail: (e.giftName || 'gift') + ' x' + repeat, timestamp: Date.now() });
    });

    client.on('chat', (e) => {
      pushEvent(state, { id: 'ev_' + Date.now(), type: 'comment', uniqueId: e.user.uniqueId, nickname: e.user.nickname, avatarUrl: avatarOf(e.user), detail: e.comment || '', timestamp: Date.now() });
    });

    client.connect()
      .then(() => resolve({ connected: state.connected, connecting: state.connecting, username: key }))
      .catch((err) => {
        const msg = (err && err.message) || String(err);
        state.connecting = false;
        state.connected = false;
        state.error = msg;
        console.log('[tik] connect() THREW', key, msg);
        if (rec.client) { try { rec.client.disconnect(); } catch (e) {} }
        // If the failure is "not currently live" or "no session cookie", back off
        // and retry periodically in case the streamer goes live.
        scheduleReconnect(key, rec, apiKey, true);
        resolve({ connected: false, connecting: false, username: key, error: msg });
      });
  });
}

function scheduleReconnect(key, rec, apiKey, slow) {
  const state = rec.ref;
  // User explicitly disconnected → never auto-reconnect.
  if (state.stopped) return;
  if (state.reconnectTimer) return; // already scheduled
  const failCount = (state.reconnectFails || 0);
  state.reconnectFails = failCount + 1;
  const base = slow ? 30000 : 3000;
  const max = 120000;
  const delay = Math.min(base + failCount * 2000 + Math.floor(Math.random() * 3000), max);
  console.log('[tik] scheduleReconnect', key, 'in', delay, 'ms', '(attempt ' + state.reconnectFails + ')');
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    state.connecting = true;
    buildClient(key, rec, apiKey);
  }, delay);
}

async function connect(username) {
  const key = normalize(username);
  if (!key) throw new Error('username required');
  const rec = getOrCreate(key);
  const state = rec.ref;

  if (rec.client && state.connected) return { connected: true, already: true, username: key };
  if (state.connecting) return { connected: false, connecting: true, username: key };

  const apiKey = getApiKey();

  if (apiKey) {
    const room = await resolveRoomAlive(key, apiKey);
    if (room.ok && room.alive !== true) {
      state.connecting = false;
      state.connected = false;
      state.error = 'not_live';
      state.stopped = false;
      return { connected: false, connecting: false, username: key, notLive: true, aliveStatus: room.aliveStatus };
    }
  }

  state.connecting = true;
  state.error = null;
  state.stopped = false;
  return buildClient(key, rec, apiKey);
}

function getState(username) {
  const key = normalize(username);
  const rec = clients.get(key);
  if (!rec) return null;
  return rec.ref;
}

function listConnections() {
  const out = [];
  for (const [key, rec] of clients.entries()) {
    out.push({
      username: key,
      connected: rec.ref.connected,
      connecting: rec.ref.connecting,
      connectedAt: rec.ref.connectedAt,
      error: rec.ref.error,
    });
  }
  return out;
}

module.exports = {
  connect,
  disconnect,
  getState,
  getOrCreate,
  listConnections,
  heartTotal,
  recomputeTopLikers,
  recomputeTopDonors,
  normalize,
};
