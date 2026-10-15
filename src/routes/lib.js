const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function readJson(file, fallback) {
  try {
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    const p = path.join(DATA_DIR, file);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function readConfig() {
  return readJson('config.json', {
    adminPassword: process.env.ADMIN_PASSWORD || '',
    siteName: 'tiklinux',
    primaryColor: '#E02519',
    secondaryColor: '#315B5F',
    tiktoolApiKey: '',
    overlaySettings: {},
    bgVideos: {}
  });
}

function getApiKey() {
  const c = readConfig();
  return (c.tiktoolApiKey || '').trim();
}

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

module.exports = { readJson, writeJson, readConfig, getApiKey, nowIso, nowMs, DATA_DIR };
