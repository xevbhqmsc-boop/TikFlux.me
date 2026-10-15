const express = require('express');
const crypto = require('crypto');
const { readJson, writeJson } = require('./lib');

const router = express.Router();

const ACTIVE_WINDOW = 15 * 1000; // an active viewer = heartbeat within last 15s

function load() {
  return readJson('stats.json', { visits: [], heartbeats: [] });
}

function save(data) {
  return writeJson('stats.json', data);
}

router.get('/stats', (req, res) => {
  const data = load();
  const now = Date.now();
  const visits = (data.visits || []).filter((v) => now - v < 4 * 60 * 60 * 1000);
  const hb = (data.heartbeats || []).filter((h) => now - h.timestamp < ACTIVE_WINDOW);
  const activeNow = new Set(hb.map((h) => h.sid)).size;
  const totalVisitors = new Set(visits.map((v) => v.sid)).size;
  res.json({ totalVisitors, activeNow });
});

router.post('/stats/visit', (req, res) => {
  const data = load();
  const sid = (req.body && req.body.sid) || crypto.randomUUID();
  data.visits = data.visits || [];
  data.visits = data.visits.filter((v) => v.sid !== sid);
  data.visits.push({ sid, timestamp: Date.now() });
  if (data.visits.length > 5000) data.visits.splice(0, data.visits.length - 5000);
  save(data);
  res.json({ sid });
});

router.post('/stats/heartbeat', (req, res) => {
  const data = load();
  const b = req.body || {};
  const sid = b.sid || crypto.randomUUID();
  data.heartbeats = data.heartbeats || [];
  data.heartbeats.push({ sid, overlay: b.overlay || '', username: b.username || '', timestamp: Date.now() });
  if (data.heartbeats.length > 10000) data.heartbeats.splice(0, data.heartbeats.length - 10000);
  save(data);
  res.json({ ok: true, sid });
});

module.exports = router;

