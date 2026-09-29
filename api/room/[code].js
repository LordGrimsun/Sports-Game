// Ephemeral room store for signaling on Vercel Serverless
// WebRTC signaling is only required during initial handshake (1-10 seconds)
const rooms = new Map();

function cleanup() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.updatedAt > 30 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract 6-digit room code from Vercel dynamic param or URL
  const code = (req.query?.code || req.url?.match(/\/api\/room\/([^\/\?]+)/)?.[1] || '').trim();
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'bad room code' });
  }

  cleanup();

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    const forUser = req.query?.for;
    const after = parseInt(req.query?.after || '0', 10);

    const room = rooms.get(code);
    if (!room || !forUser) {
      return res.status(200).json({ messages: [], cursor: after || 0 });
    }

    const queue = room.recipients.get(forUser) || [];
    const newMessages = queue.filter(m => m.i > after);
    const cursor = queue.length > 0 ? queue[queue.length - 1].i : after;

    return res.status(200).json({ messages: newMessages, cursor });
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'invalid json' });
      }
    }

    const { to, from, type, payload } = body || {};
    if (!to || !from || !type) {
      return res.status(400).json({ error: 'missing fields' });
    }

    let room = rooms.get(code);
    if (!room) {
      room = { updatedAt: Date.now(), recipients: new Map() };
      rooms.set(code, room);
    }
    room.updatedAt = Date.now();

    let queue = room.recipients.get(to);
    if (!queue) {
      queue = [];
      room.recipients.set(to, queue);
    }

    const message = {
      from,
      type,
      payload,
      t: Date.now(),
      i: queue.length + 1
    };
    queue.push(message);

    if (queue.length > 100) {
      queue.shift();
    }

    return res.status(200).json({ ok: true, n: queue.length });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
