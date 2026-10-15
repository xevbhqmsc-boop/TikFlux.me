const express = require('express');
const { readConfig, writeJson } = require('./lib');
const lm = require('./liveManager');

const router = express.Router();

function requireAuth(req, res, next) { next(); }

router.get('/admin/dashboard', (req, res) => {
  const users = lm.listConnections().map((c) => ({
    username: c.username,
    isConnected: c.connected,
    connectedAt: c.connectedAt,
  }));
  const connected = users.filter((u) => u.isConnected).length;
  res.json({
    users,
    stats: {
      totalUsers: users.length,
      connected: connected,
      activeNow: connected,
      totalEvents: 0,
    },
  });
});

router.get('/admin/tiktool-key', (req, res) => {
  const cfg = readConfig();
  const apiKey = cfg.tiktoolApiKey || '';
  res.json({ configured: !!apiKey, apiKey });
});

router.post('/admin/tiktool-key', (req, res) => {
  const apiKey = (req.body && req.body.apiKey || '').trim();
  const cfg = readConfig();
  cfg.tiktoolApiKey = apiKey;
  writeJson('config.json', cfg);
  res.json({ success: true });
});

router.put('/admin/tiktool-key', (req, res) => {
  const apiKey = (req.body && req.body.apiKey || '').trim();
  const cfg = readConfig();
  cfg.tiktoolApiKey = apiKey;
  writeJson('config.json', cfg);
  res.json({ success: true });
});

module.exports = router;
module.exports.requireAuth = (req, res, next) => next();
module.exports.checkAuth = () => true;
module.exports.TOKEN_STORE = {};

