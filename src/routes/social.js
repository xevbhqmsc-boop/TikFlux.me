const express = require('express');
const { readJson, writeJson } = require('./lib');

const router = express.Router();

router.post('/social-rotator/save', (req, res) => {
  const settings = req.body || {};
  const existing = readJson('social-rotator.json', {});
  const merged = { ...existing, ...settings, updatedAt: Date.now() };
  writeJson('social-rotator.json', merged);
  res.json({ ok: true });
});

router.get('/social-rotator/settings', (req, res) => {
  const data = readJson('social-rotator.json', {});
  // normalize displayDuration (legacy key) into duration
  if (data.displayDuration && data.duration == null) data.duration = data.displayDuration;
  res.json(data);
});

module.exports = router;

