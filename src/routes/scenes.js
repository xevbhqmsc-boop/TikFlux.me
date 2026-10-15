const express = require('express');
const { readJson, writeJson } = require('./lib');

const router = express.Router();

router.get('/scenes/load', (req, res) => {
  const scene = String(req.query.scene || '1');
  const data = readJson('scenes.json', {});
  const rec = data[scene];
  res.json({
    layers: rec && rec.layers ? rec.layers : [],
    canvasWidth: rec && rec.canvasWidth ? rec.canvasWidth : 1920,
    canvasHeight: rec && rec.canvasHeight ? rec.canvasHeight : 1080,
    updatedAt: rec && rec.updatedAt ? rec.updatedAt : null,
  });
});

router.post('/scenes/save', (req, res) => {
  const { scene, layers, canvasWidth, canvasHeight } = req.body || {};
  const key = String(scene || '1');
  const data = readJson('scenes.json', {});
  data[key] = {
    layers: layers || [],
    canvasWidth: canvasWidth || 1920,
    canvasHeight: canvasHeight || 1080,
    updatedAt: Date.now(),
  };
  writeJson('scenes.json', data);
  res.json({ ok: true, scene: key });
});

module.exports = router;

