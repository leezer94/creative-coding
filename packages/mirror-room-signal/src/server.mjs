/**
 * Minimal WebRTC signaling relay: one host + one guest per sessionId.
 * Binds 0.0.0.0 so phones on the same LAN can connect to the Mac's IP.
 */
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.MIRROR_ROOM_SIGNAL_PORT ?? 8787);

/** @typedef {{ host?: import('ws').WebSocket, guest?: import('ws').WebSocket }} Room */

/** @type {Map<string, Room>} */
const rooms = new Map();

function getRoom(sessionId) {
  let r = rooms.get(sessionId);
  if (!r) {
    r = {};
    rooms.set(sessionId, r);
  }
  return r;
}

function safeSend(ws, obj) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function notifyPeerJoined(room, role) {
  if (role === 'host' && room.guest) {
    safeSend(room.host, { type: 'peer-joined', role: 'guest' });
  }
  if (role === 'guest' && room.host) {
    safeSend(room.host, { type: 'peer-joined', role: 'guest' });
  }
}

/**
 * @param {import('ws').WebSocket} ws
 */
function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return;
  }
  const sessionId = msg.sessionId;
  if (!sessionId || typeof sessionId !== 'string') {
    return;
  }
  const room = getRoom(sessionId);

  if (msg.type === 'hello-host') {
    if (room.host && room.host !== ws) {
      try {
        room.host.close(4000, 'replaced');
      } catch {
        /* ignore */
      }
    }
    room.host = ws;
    ws._mirrorRoomRole = 'host';
    ws._mirrorRoomSessionId = sessionId;
    notifyPeerJoined(room, 'host');
    return;
  }

  if (msg.type === 'hello-guest') {
    if (room.guest && room.guest !== ws) {
      try {
        room.guest.close(4000, 'replaced');
      } catch {
        /* ignore */
      }
    }
    room.guest = ws;
    ws._mirrorRoomRole = 'guest';
    ws._mirrorRoomSessionId = sessionId;
    notifyPeerJoined(room, 'guest');
    return;
  }

  if (msg.type === 'offer' && room.guest && ws === room.host) {
    safeSend(room.guest, { type: 'offer', sessionId, sdp: msg.sdp });
    return;
  }

  if (msg.type === 'answer' && room.host && ws === room.guest) {
    safeSend(room.host, { type: 'answer', sessionId, sdp: msg.sdp });
    return;
  }

  if (msg.type === 'ice-candidate') {
    if (ws === room.host && room.guest) {
      safeSend(room.guest, { type: 'ice-candidate', sessionId, candidate: msg.candidate });
    } else if (ws === room.guest && room.host) {
      safeSend(room.host, { type: 'ice-candidate', sessionId, candidate: msg.candidate });
    }
  }
}

const wss = new WebSocketServer({ host: '0.0.0.0', port: PORT });

wss.on('connection', (ws) => {
  ws.on('message', (data) => handleMessage(ws, data));
  ws.on('close', () => {
    const sessionId = ws._mirrorRoomSessionId;
    const role = ws._mirrorRoomRole;
    if (!sessionId || !role) return;
    const room = rooms.get(sessionId);
    if (!room) return;
    if (role === 'host' && room.host === ws) {
      room.host = undefined;
      if (room.guest) {
        safeSend(room.guest, { type: 'peer-left', role: 'host' });
      }
    }
    if (role === 'guest' && room.guest === ws) {
      room.guest = undefined;
      if (room.host) {
        safeSend(room.host, { type: 'peer-left', role: 'guest' });
      }
    }
    if (!room.host && !room.guest) {
      rooms.delete(sessionId);
    }
  });
});

console.log(`mirror-room-signal listening on ws://0.0.0.0:${PORT}`);
