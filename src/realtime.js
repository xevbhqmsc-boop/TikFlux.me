const { WebSocketServer } = require('ws');
const crypto = require('crypto');

let wss = null;

function attach(server) {
  if (wss) return wss;
  wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (socket, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token') || '';
    socket._room = token;
    socket._alive = true;
    socket.send(JSON.stringify({ type: 'hello', token, at: Date.now() }));
    socket.on('pong', () => { socket._alive = true; });
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg && msg.type) {
          if (msg.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong', at: Date.now() }));
          }
        }
      } catch (e) {}
    });
    socket.on('error', () => {});
  });

  const heartbeat = setInterval(() => {
    if (!wss) return;
    for (const client of wss.clients) {
      if (client.readyState !== 1) continue;
      if (client._alive === false) {
        try { client.ping(); } catch (e) {}
        client._alive2 = (client._alive2 || 0) + 1;
        if (client._alive2 > 2) {
          try { client.terminate(); } catch (e) {}
        }
        continue;
      }
      client._alive = false;
      try { client.ping(); } catch (e) {}
    }
  }, 30000);

  wss.on('close', () => { clearInterval(heartbeat); });

  return wss;
}

function broadcast(token, payload) {
  if (!wss) return;
  const data = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1 && (!token || client._room === token)) {
      try {
        client.send(data);
      } catch (e) {}
    }
  }
}

function count() {
  return wss ? wss.clients.size : 0;
}

module.exports = { attach, broadcast, count };
