import { AccessToken } from 'livekit-server-sdk';

/**
 * POST body: `{ "room": string, "identity": string }`
 * Response: `{ "token": string }`
 *
 * Netlify: set `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in site env (never in VITE_*).
 */
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'LIVEKIT_API_KEY / LIVEKIT_API_SECRET not set' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const room = typeof body.room === 'string' ? body.room : '';
  const identity = typeof body.identity === 'string' ? body.identity : '';
  if (!room || !identity) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'room and identity required' }),
    };
  }

  const token = new AccessToken(apiKey, apiSecret, { identity });
  token.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
  });

  const jwt = await token.toJwt();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: jwt }),
  };
};
