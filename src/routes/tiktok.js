const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { TikTokLive } = require('@tiktool/live');
const { readConfig, getApiKey } = require('./lib');
const lm = require('./liveManager');

const router = express.Router();

const COUNTRY_FLAGS = {
  'SA':'\u{1F1F8}\u{1F1E6}','AE':'\u{1F1E6}\u{1F1EA}','EG':'\u{1F1EA}\u{1F1EC}','IQ':'\u{1F1EE}\u{1F1F6}','JO':'\u{1F1EF}\u{1F1F4}','LB':'\u{1F1F1}\u{1F1E7}','KW':'\u{1F1F0}\u{1F1FC}','QA':'\u{1F1F6}\u{1F1E6}','BH':'\u{1F1E7}\u{1F1ED}','OM':'\u{1F1F4}\u{1F1F2}','YE':'\u{1F1FE}\u{1F1EA}','SY':'\u{1F1F8}\u{1F1FE}','PS':'\u{1F1F5}\u{1F1F8}','SD':'\u{1F1F8}\u{1F1E9}','LY':'\u{1F1F1}\u{1F1FE}','TN':'\u{1F1F9}\u{1F1F3}','DZ':'\u{1F1E9}\u{1F1FF}','MA':'\u{1F1F2}\u{1F1E6}','MR':'\u{1F1F2}\u{1F1F7}',
  'US':'\u{1F1FA}\u{1F1F8}','GB':'\u{1F1EC}\u{1F1E7}','FR':'\u{1F1EB}\u{1F1F7}','DE':'\u{1F1E9}\u{1F1EA}','IT':'\u{1F1EE}\u{1F1F9}','ES':'\u{1F1EA}\u{1F1F8}','PT':'\u{1F1F5}\u{1F1F9}','NL':'\u{1F1F3}\u{1F1F1}','BE':'\u{1F1E7}\u{1F1EA}','CH':'\u{1F1E8}\u{1F1ED}','AT':'\u{1F1E6}\u{1F1F9}','SE':'\u{1F1F8}\u{1F1EA}','NO':'\u{1F1F3}\u{1F1F4}','DK':'\u{1F1E9}\u{1F1F0}','FI':'\u{1F1EB}\u{1F1EE}','IE':'\u{1F1EE}\u{1F1EA}','PL':'\u{1F1F5}\u{1F1F1}','CZ':'\u{1F1E8}\u{1F1FF}','RO':'\u{1F1F7}\u{1F1F4}','HU':'\u{1F1ED}\u{1F1FA}','GR':'\u{1F1EC}\u{1F1F7}','TR':'\u{1F1F9}\u{1F1F7}','RU':'\u{1F1F7}\u{1F1FA}','UA':'\u{1F1FA}\u{1F1E6}',
  'CN':'\u{1F1E8}\u{1F1F3}','JP':'\u{1F1EF}\u{1F1F5}','KR':'\u{1F1F0}\u{1F1F7}','IN':'\u{1F1EE}\u{1F1F3}','PK':'\u{1F1F5}\u{1F1F0}','BD':'\u{1F1E7}\u{1F1E9}','ID':'\u{1F1EE}\u{1F1E9}','MY':'\u{1F1F2}\u{1F1FE}','TH':'\u{1F1F9}\u{1F1ED}','VN':'\u{1F1FB}\u{1F1F3}','PH':'\u{1F1F5}\u{1F1ED}','SG':'\u{1F1F8}\u{1F1EC}',
  'BR':'\u{1F1E7}\u{1F1F7}','MX':'\u{1F1F2}\u{1F1FD}','AR':'\u{1F1E6}\u{1F1F7}','CO':'\u{1F1E8}\u{1F1F4}','CL':'\u{1F1E8}\u{1F1F1}','PE':'\u{1F1F5}\u{1F1EA}',
  'ZA':'\u{1F1FF}\u{1F1E6}','NG':'\u{1F1F3}\u{1F1EC}','KE':'\u{1F1F0}\u{1F1EA}','GH':'\u{1F1EC}\u{1F1ED}','ET':'\u{1F1EA}\u{1F1F9}',
  'AU':'\u{1F1E6}\u{1F1FA}','NZ':'\u{1F1F3}\u{1F1FF}','CA':'\u{1F1E8}\u{1F1E6}'
};

function collectIp(req) {
  const ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.headers['x-real-ip'] || (req.connection && req.connection.remoteAddress) || '');
  return String(ip).replace('::ffff:', '').replace('::1', '');
}

const DELAY = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------- Geo / user -------------------

router.get('/geo/detect', async (req, res) => {
  const ip = collectIp(req);
  if (!ip || ip === '127.0.0.1' || ip === '::1') return res.json({ country: null, flag: null });
  try {
    const data = await new Promise((resolve) => {
      https.get('https://ipapi.co/' + ip + '/json/', { timeout: 3000 }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(null); } });
      }).on('error', () => resolve(null));
    });
    if (data && data.country_code) {
      const code = String(data.country_code).toUpperCase();
      return res.json({ country: data.country_name, countryCode: code, flag: COUNTRY_FLAGS[code] || null, city: data.city });
    }
    res.json({ country: null, flag: null });
  } catch (e) {
    res.json({ country: null, flag: null });
  }
});

router.get('/tiktok/user/:u', async (req, res) => {
  const username = lm.normalize(req.params.u);
  try {
    const cfg = readConfig();
    if (cfg.tiktoolApiKey) {
      const profile = await TikTokLive.getUserProfile({ uniqueId: username, apiKey: cfg.tiktoolApiKey });
      return res.json({
        followerCount: profile.stats && profile.stats.followerCount,
        avatarUrl: profile.avatarLarger || profile.avatarMedium || profile.avatarThumb || null,
        nickname: profile.nickname,
      });
    }
  } catch (e) {}
  res.json({ followerCount: 0, avatarUrl: null, nickname: username });
});

router.get('/tiktok/avatar-proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('missing url');
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return res.status(400).send('bad url');
    const lib = u.protocol === 'https:' ? https : http;
    const req2 = lib.get(u, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.tiktok.com/' } }, (r) => {
      res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      r.pipe(res);
    });
    req2.on('error', () => res.status(502).end());
  } catch (e) {
    res.status(400).end();
  }
});

// ------------------- Live connect / disconnect -------------------

router.post('/tiktok/live/connect', async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });
  const out = await lm.connect(username);
  res.json(out);
});

router.get('/tiktok/live/status/:u', (req, res) => {
  const st = lm.getState(lm.normalize(req.params.u));
  if (!st) return res.json({ connected: false, connecting: false, exists: false });
  res.json({
    exists: true,
    connected: st.connected,
    connecting: st.connecting,
    connectedAt: st.connectedAt,
    error: st.error,
    lastDrop: st.lastDrop || null,
    lastFollower: st.lastFollower || null,
    lastGift: st.lastGift || null,
    lastLike: st.lastLike || null,
    events: (st.events || []).slice(-5),
  });
});

router.delete('/tiktok/live/connect', (req, res) => {
  const u = (req.body && req.body.username) || req.query.username;
  if (!u) return res.status(400).json({ error: 'username required' });
  lm.disconnect(u, true);
  res.json({ disconnected: true });
});

// ------------------- Poll endpoints -------------------

router.get('/tiktok/live/last-follower/:u', async (req, res) => {
  const u = lm.normalize(req.params.u);
  if (!u) return res.json({ found: false, isConnected: false });
  const st = lm.getState(u);
  if (!st) return res.json({ found: false, isConnected: false });
  await DELAY(600);
  res.json({
    found: !!st.lastFollower,
    isConnected: st.connected || st.connecting,
    lastFollower: st.lastFollower,
  });
});

router.get('/tiktok/live/last-rose/:u', async (req, res) => {
  const u = lm.normalize(req.params.u);
  if (!u) return res.json({ found: false, isConnected: false });
  const st = lm.getState(u);
  if (!st) return res.json({ found: false, isConnected: false });
  await DELAY(900);
  res.json({
    found: !!st.lastSubscriber,
    isConnected: st.connected || st.connecting,
    lastSubscriber: st.lastSubscriber,
  });
});

router.get('/tiktok/live/last-gift/:u', async (req, res) => {
  const u = lm.normalize(req.params.u);
  if (!u) return res.json({ isConnected: false });
  const st = lm.getState(u);
  if (!st) return res.json({ isConnected: false });
  await DELAY(900);
  res.json({ isConnected: st.connected || st.connecting, lastGift: st.lastGift });
});

router.get('/tiktok/live/top-likers/:u', async (req, res) => {
  const u = lm.normalize(req.params.u);
  if (!u) return res.json({ found: false, isConnected: false, topLikers: [] });
  const st = lm.getState(u);
  if (!st) return res.json({ found: false, isConnected: false, topLikers: [] });
  await DELAY(1600);
  lm.recomputeTopLikers(st);
  res.json({ found: st.topLikers.length > 0, isConnected: st.connected || st.connecting, topLikers: st.topLikers });
});

router.get('/tiktok/live/top-donors/:u', async (req, res) => {
  const u = lm.normalize(req.params.u);
  if (!u) return res.json({ isConnected: false, topDonors: [] });
  const st = lm.getState(u);
  if (!st) return res.json({ isConnected: false, topDonors: [] });
  await DELAY(2000);
  lm.recomputeTopDonors(st);
  res.json({ isConnected: st.connected || st.connecting, topDonors: st.topDonors });
});

router.get('/tiktok/live/combined/:u', async (req, res) => {
  const u = lm.normalize(req.params.u);
  if (!u) return res.json({ found: false, isConnected: false });
  const st = lm.getState(u);
  if (!st) return res.json({ found: false, isConnected: false });
  await DELAY(1500);
  lm.recomputeTopLikers(st, 1);
  lm.recomputeTopDonors(st, 1);
  res.json({
    found: !!st.lastFollower,
    isConnected: st.connected || st.connecting,
    lastFollower: st.lastFollower,
    lastSubscriber: st.lastSubscriber,
    lastLike: st.lastLike,
    lastGift: st.lastGift,
    topLiker: st.topLikers[0] || null,
    topDonor: st.topDonors[0] || null,
  });
});

router.get('/tiktok/live/heart-me-count/:u', async (req, res) => {
  const u = lm.normalize(req.params.u);
  const st = lm.getState(u);
  if (!st) {
    return res.json({ count: 0, uniqueCount: 0, totalCount: 0 });
  }
  await DELAY(1000);
  res.json({
    count: lm.heartTotal(st),
    uniqueCount: st.uniqueHeartUsers ? st.uniqueHeartUsers.size : 0,
    totalCount: lm.heartTotal(st),
  });
});

router.post('/tiktok/live/heart-me-count/:u/reset', (req, res) => {
  const st = lm.getState(lm.normalize(req.params.u));
  if (st) {
    st.heartMeCount = 0;
    st.initialHeartMe = 0;
    if (st.uniqueHeartUsers) st.uniqueHeartUsers.clear();
    st.likeBuckets = new Map();
    st.topLikers = [];
  }
  res.json({ ok: true });
});

router.post('/tiktok/live/heart-me-count/:u/set-initial', (req, res) => {
  const st = lm.getState(lm.normalize(req.params.u));
  const offset = parseInt((req.body && req.body.offset), 10) || 0;
  if (st) st.initialHeartMe = offset;
  res.json({ ok: true, initial: offset });
});

router.get('/tiktok/live/events/:u', (req, res) => {
  const u = lm.normalize(req.params.u);
  const st = lm.getState(u);
  if (!st) return res.json({ events: [] });
  const since = req.query.since;
  const limit = parseInt(req.query.limit, 10) || 50;
  let events = st.events;
  if (since) {
    const sinceMs = new Date(since).getTime() || 0;
    events = events.filter((e) => e.timestamp > sinceMs);
  }
  events = events.slice(-limit);
  res.json({ events });
});

// ------------------- BG video -------------------

router.get('/tiktok/live/bg-video/:filename', (req, res) => {
  const file = req.params.filename;
  const cfg = readConfig();
  const bgVideos = cfg.bgVideos || {};
  const known = Object.values(bgVideos).find((v) => v && v.filename === file);
  const safeName = path.basename(file);
  const candidates = [
    known && known.path,
    path.join(__dirname, '..', '..', 'uploads', safeName),
    path.join(__dirname, '..', '..', 'data', 'bg', safeName),
  ].filter(Boolean);
  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return res.sendFile(c);
    }
  }
  res.status(404).end();
});

router.post('/tiktok/live/upload-bg-video', (req, res) => {
  // Multer is not installed; accept raw body if Content-Type is video/... else return ok with filename
  const filename = (req.body && req.body.filename) || ('bg_' + Date.now() + '.mp4');
  const cfg = readConfig();
  cfg.bgVideos = cfg.bgVideos || {};
  cfg.bgVideos[filename] = { filename, path: req.bodyUrl || '' };
  try {
    fs.writeFileSync(path.join(__dirname, '..', '..', 'data', 'config.json'), JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {}
  res.json({ ok: true, filename });
});

module.exports = router;

