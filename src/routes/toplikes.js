const express = require('express');
const tl = require('../topLikes');

const router = express.Router();

// ---- Public (session data already exposes token), overlay + UI read ----
router.get('/toplikes/streams', (req, res) => {
  res.json({ streams: tl.listStreams() });
});

router.get('/toplikes/stream/:token', (req, res) => {
  const rec = tl.get(req.params.token);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json({ stream: rec });
});

// ---- Admin-only mutations ----
router.post('/toplikes/streams', (req, res) => {
  const { username } = req.body || {};
  if (!username || !String(username).trim()) return res.status(400).json({ error: 'username required' });
  const rec = tl.tokenFor(String(username).trim().replace(/^@/, '').toLowerCase());
  res.json({ stream: { token: rec.token, username: rec.username, running: rec.running, winners: rec.winners } });
});

router.put('/toplikes/stream/:token/settings', (req, res) => {
  const rec = tl.updateSettings(req.params.token, (req.body && req.body.settings) || {});
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json({ stream: rec });
});

router.post('/toplikes/stream/:token/control', (req, res) => {
  const { command } = req.body || {};
  const rec = tl.get(req.params.token);
  if (!rec) return res.status(404).json({ error: 'not found' });
  if (command === 'start') tl.setRunning(rec.token, true);
  else if (command === 'stop') tl.setRunning(rec.token, false);
  else if (command === 'reset') tl.reset(rec.token);
  else return res.status(400).json({ error: 'unknown command' });
  res.json({ stream: tl.get(rec.token) });
});

module.exports = router;
