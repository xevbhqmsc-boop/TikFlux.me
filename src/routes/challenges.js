const express = require('express');
const { readJson, writeJson } = require('./lib');

const router = express.Router();

const runtime = {
  status: {}, // per type: start|pause|reset
  scores: {},
  subathon: {},
};

// Challenge types that may emit to widgets. Since SPA/widgets poll, we keep
// latest control action in memory keyed by type.
function setControl(type, action, username) {
  runtime.status[type + ':' + (username || '')] = { type, action, username, at: Date.now() };
  if (type === 'scores' && action === 'reset') {
    runtime.scores = { team1: 0, team2: 0 };
  }
  if (type === 'subathon' && /^add_/.test(action)) {
    runtime.subathon.adjust = (runtime.subathon.adjust || 0) + (parseInt(action.split('_')[1], 10) || 0) * 60;
  }
  if (type === 'subathon' && /^sub_/.test(action)) {
    runtime.subathon.adjust = (runtime.subathon.adjust || 0) - (parseInt(action.split('_')[1], 10) || 0) * 60;
  }
}

router.get('/challenges/load', (req, res) => {
  const data = readJson('challenges.json', { username: '', settings: {}, scores: { team1: 0, team2: 0 } });
  res.json(data);
});

router.post('/challenges/save', (req, res) => {
  const body = req.body || {};
  const existing = readJson('challenges.json', { username: '', settings: {}, scores: { team1: 0, team2: 0 } });
  const merged = {
    username: body.username != null ? body.username : existing.username,
    settings: body.settings || existing.settings,
    scores: body.scores || existing.scores,
  };
  writeJson('challenges.json', merged);
  res.json({ ok: true });
});

router.post('/challenges/control', (req, res) => {
  const { type, action, username } = req.body || {};
  if (!type || !action) return res.status(400).json({ error: 'type & action required' });
  setControl(type, action, username);
  res.json({ ok: true, type, action, username });
});

router.get('/challenges/state', (req, res) => {
  res.json({ status: runtime.status, scores: runtime.scores, subathon: runtime.subathon });
});

module.exports = router;

