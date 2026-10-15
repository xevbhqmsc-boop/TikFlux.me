const express = require('express');

const router = express.Router();

// Streamlabs integration persisted in memory (no external OAuth credentials shipped).
// Endpoints match the frontend contract so /obs-donor and the admin Streamlabs UI
// function even without a configured Streamlabs app.

let connected = false;
let socketStatus = 'disconnected';
let primaryCurrency = 'USD';
let simTimer = null;
let lastDonor = null;
let topDonor = null;
let donorCount = 0;

const settings = {
  lastDonorConfig: {},
  topDonorConfig: {},
  syncEnabled: false,
};

const mockNames = ['Ahmad', 'Lina', 'Omar', 'Sara', 'Yousef', 'Nour', 'Khalid', 'Mona', 'Adam', 'Rima', 'Ziad', 'Huda'];
const mockMsgs = ['Keep it up!', 'Love the stream', 'GG', 'You are the best', 'Here is a gift', '', 'Amazing content'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function endSim() {
  if (simTimer) { clearInterval(simTimer); simTimer = null; }
}

function beginSim() {
  endSim();
  donorCount = 0;
  socketStatus = 'connected';
  const emit = () => {
    const amount = Math.floor(Math.random() * 80) + 2;
    const name = pick(mockNames);
    const donation = {
      name,
      amount,
      currency: primaryCurrency,
      message: pick(mockMsgs),
      createdAt: new Date().toISOString(),
    };
    lastDonor = donation;
    donorCount++;
    const prevTotal = topDonor ? topDonor.total : 0;
    topDonor = {
      name: topDonor && topDonor.name === name ? topDonor.name : name,
      total: prevTotal + amount,
      currency: primaryCurrency,
      donationCount: donorCount,
      identifiedBy: 'Simulator',
    };
  };
  emit();
  simTimer = setInterval(emit, 4000);
}

function requireAuth(req, res, next) { next(); }

router.get('/streamlabs/status', requireAuth, (req, res) => {
  res.json({ connected, socketStatus, primaryCurrency, displayName: 'tiklinux', donorCount });
});

router.get('/streamlabs/auth/url', requireAuth, (req, res) => {
  const base = (req.query.redirect || '') || '';
  const authUrl = 'https://streamlabs.com/api/v2.0/authorize?client_id=&redirect_uri=' + encodeURIComponent(base + '/streamlabs/callback') + '&scope=donations.read';
  res.json({ authUrl, connected });
});

router.get('/streamlabs/settings', requireAuth, (req, res) => {
  res.json(settings);
});

router.post('/streamlabs/settings', requireAuth, (req, res) => {
  Object.assign(settings, req.body || {});
  res.json({ ok: true, settings });
});

router.post('/streamlabs/sync', requireAuth, (req, res) => {
  connected = true;
  beginSim();
  res.json({ ok: true, connected: true, socketStatus: 'connected' });
});

router.post('/streamlabs/disconnect', requireAuth, (req, res) => {
  connected = false;
  socketStatus = 'disconnected';
  endSim();
  res.json({ ok: true });
});

router.post('/streamlabs/simulate', requireAuth, (req, res) => {
  if (!connected) { connected = true; beginSim(); }
  else if (!simTimer) beginSim();
  res.json({ ok: true, connected, socketStatus });
});

router.get('/streamlabs/donations', requireAuth, (req, res) => {
  res.json({
    lastDonor,
    totalDonations: donorCount,
    primaryCurrency,
  });
});

router.get('/streamlabs/live', (req, res) => {
  res.json({
    connected,
    socketStatus,
    lastDonor,
    topMonthlyDonor: topDonor,
    primaryCurrency,
    updatedAt: new Date().toISOString(),
  });
});

module.exports = router;

