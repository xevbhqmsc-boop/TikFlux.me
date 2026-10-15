/* ============================================================================
 * TikFlux — Connection honesty badge
 * ----------------------------------------------------------------------------
 * A tiny, self-contained overlay that shows the REAL connection state reported
 * by the backend (`/stream/status` + `/api/status`) and by the live WebSocket.
 *
 * Why this exists: the dashboard already renders "connected" from its own local
 * handshake, but it has no way to show that the data is MOCK data. This module
 * never invents a state — it only mirrors what the server says, and it makes
 * mock mode impossible to miss.
 *
 * It renders nothing brand-new in the normal connected case (a small green dot),
 * so the existing design is preserved.
 * ========================================================================== */
(function () {
  'use strict';

  if (window.__tikfluxConnectionBadge) return;
  window.__tikfluxConnectionBadge = true;

  var API = (function () {
    try {
      if (window.ENV_CONFIG && window.ENV_CONFIG.API_URL) return String(window.ENV_CONFIG.API_URL).replace(/\/$/, '');
    } catch (e) {}
    return window.location.origin;
  })();

  var WS_URL = (function () {
    try {
      if (window.ENV_CONFIG && window.ENV_CONFIG.EDGE_WS_URL) return window.ENV_CONFIG.EDGE_WS_URL;
    } catch (e) {}
    return API.replace(/^http/, 'ws') + '/ws';
  })();

  var COLORS = {
    connected: '#2dd4bf',
    connecting: '#38bdf8',
    disconnected: '#64748b',
    failed: '#f44336',
    mock: '#f59e0b'
  };

  var TEXT = {
    connected: '\u0645\u062a\u0635\u0644',
    connecting: '\u062c\u0627\u0631\u064d \u0627\u0644\u0627\u062a\u0635\u0627\u0644',
    disconnected: '\u063a\u064a\u0631 \u0645\u062a\u0635\u0644',
    failed: '\u0641\u0634\u0644 \u0627\u0644\u0627\u062a\u0635\u0627\u0644',
    mock: '\u0628\u064a\u0627\u0646\u0627\u062a \u062a\u062c\u0631\u064a\u0628\u064a\u0629'
  };

  var REASON_TEXT = {
    NOT_LIVE: '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u063a\u064a\u0631 \u0645\u0628\u0627\u0634\u0631 \u0627\u0644\u0622\u0646',
    USER_NOT_FOUND: '\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u0645',
    connect_timeout: '\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062a\u0635\u0627\u0644',
    auth_error: '\u0645\u0641\u062a\u0627\u062d \u0627\u0644\u062e\u062f\u0645\u0629 \u0645\u0631\u0641\u0648\u0636',
    sdk_missing: '\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u063a\u064a\u0631 \u0645\u062b\u0628\u062a\u0629',
    no_api_key: '\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0641\u062a\u0627\u062d \u062e\u062f\u0645\u0629',
    INVALID_UNIQUE_ID: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d',
    user_disconnect: '\u062a\u0645 \u0642\u0637\u0639 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u0637\u0644\u0628\u0643'
  };

  var el = null;
  var dot = null;
  var label = null;
  var sub = null;
  var last = null;

  function ensureUi() {
    if (el && document.body.contains(el)) return;
    el = document.createElement('div');
    el.id = 'tikfluxConnectionBadge';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = [
      'position:fixed',
      'right:14px',
      'bottom:14px',
      'z-index:2147483000',
      'display:none',
      'align-items:center',
      'gap:8px',
      'padding:7px 12px',
      'border-radius:999px',
      'border:1px solid rgba(30,58,95,.9)',
      'background:rgba(5,13,26,.92)',
      'backdrop-filter:blur(8px)',
      'color:#e2e8f0',
      'font:12px/1.4 system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif',
      'direction:rtl',
      'box-shadow:0 6px 20px rgba(0,0,0,.45)',
      'pointer-events:none',
      'max-width:min(420px,80vw)',
      'user-select:none'
    ].join(';');

    dot = document.createElement('span');
    dot.style.cssText = 'width:9px;height:9px;border-radius:50%;flex:0 0 auto;background:#64748b';

    var box = document.createElement('span');
    box.style.cssText = 'display:flex;flex-direction:column;gap:1px;min-width:0';

    label = document.createElement('span');
    label.style.cssText = 'font-weight:600;white-space:nowrap';

    sub = document.createElement('span');
    sub.style.cssText = 'opacity:.72;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';

    box.appendChild(label);
    box.appendChild(sub);
    el.appendChild(dot);
    el.appendChild(box);
    document.body.appendChild(el);
  }

  function render(st) {
    if (!st) return;
    ensureUi();

    var state = st.state || (st.connected ? 'connected' : 'disconnected');
    var isMock = st.mock === true;
    var reason = st.reason || (isMock ? st.mockReason : null);

    var key = isMock ? 'mock' : state;
    var color = COLORS[key] || COLORS.disconnected;

    // The badge is only shown when something is worth telling the user:
    // mock data, an in-flight connect, a failure or a dropped connection.
    // A healthy real connection stays as a small dot so the design is untouched.
    var show = true;

    var main = TEXT[key] || state;
    var detail = '';

    if (isMock) {
      main = '\u26a0\ufe0f ' + TEXT.mock;
      detail = '\u0644\u0627 \u064a\u0648\u062c\u062f \u0627\u062a\u0635\u0627\u0644 \u062d\u0642\u064a\u0642\u064a \u0628\u0640 TikTok (' + (reason || 'mock') + ')';
    } else if (state === 'connected') {
      main = TEXT.connected;
      detail = st.uniqueId ? '@' + st.uniqueId : '';
      if (st.transport === 'live') detail = (detail ? detail + ' \u00b7 ' : '') + '\u0627\u062a\u0635\u0627\u0644 \u062d\u0642\u064a\u0642\u064a';
    } else if (state === 'connecting') {
      detail = st.uniqueId ? '@' + st.uniqueId : '';
      if (st.stage) detail = (detail ? detail + ' \u00b7 ' : '') + st.stage;
    } else if (state === 'failed') {
      detail = REASON_TEXT[reason] || reason || '';
    } else if (state === 'disconnected') {
      detail = REASON_TEXT[reason] || '';
      if (!detail && reason) detail = String(reason).slice(0, 60);
    }

    var text = main + '|' + detail + '|' + color;
    if (text === last) return;
    last = text;

    dot.style.background = color;
    dot.style.boxShadow = '0 0 0 3px ' + hexA(color, 0.18);
    label.textContent = main;
    sub.textContent = detail;
    el.style.borderColor = hexA(color, 0.55);
    el.style.display = show ? 'inline-flex' : 'none';

    if (isMock || state === 'failed') {
      dot.style.animation = 'none';
      label.style.color = color;
    } else {
      label.style.color = '#e2e8f0';
    }
  }

  function hexA(hex, a) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return 'rgba(100,116,139,' + a + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function applyStatus(st) {
    if (!st || typeof st !== 'object') return;
    render(st);
    try {
      window.__tikfluxStatus = st;
      document.dispatchEvent(new CustomEvent('tikflux:status', { detail: st }));
    } catch (e) {}
  }

  function poll() {
    fetch(API + '/stream/status', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (st) { applyStatus(st); })
      .catch(function () {});
  }

  var ws = null;
  var wsTimer = null;

  function connectWs() {
    if (wsTimer) { clearTimeout(wsTimer); wsTimer = null; }
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      wsTimer = setTimeout(connectWs, 5000);
      return;
    }
    ws.onopen = function () {
      try { ws.send(JSON.stringify({ type: 'subscribe', channels: ['stream-state-updated', 'connection_status'] })); } catch (e) {}
      poll();
    };
    ws.onmessage = function (ev) {
      var msg = null;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (!msg) return;
      var d = msg.data || msg;
      if (msg.type === 'stream-state-updated' || msg.type === 'connection_status' ||
          d.state || typeof d.connected === 'boolean' || typeof d.mock === 'boolean') {
        if (d && (d.state || typeof d.connected === 'boolean')) applyStatus(d);
      }
    };
    ws.onclose = function () { wsTimer = setTimeout(connectWs, 3000); };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }

  function boot() {
    ensureUi();
    poll();
    connectWs();
    setInterval(poll, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
