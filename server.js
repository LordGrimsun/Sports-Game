import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.hdr': 'application/octet-stream'
};

// Ephemeral room store for signaling
const rooms = new Map();

function cleanup() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.updatedAt > 30 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}

function handleApiRoom(req, res, pathname, searchParams) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const match = pathname.match(/^\/api\/room\/([^\/\?]+)/);
  const code = match ? match[1].trim() : '';

  if (!/^\d{6}$/.test(code)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'bad room code' }));
  }

  cleanup();

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    const forUser = searchParams.get('for');
    const after = parseInt(searchParams.get('after') || '0', 10);

    const room = rooms.get(code);
    if (!room || !forUser) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ messages: [], cursor: after || 0 }));
    }

    const queue = room.recipients.get(forUser) || [];
    const newMessages = queue.filter(m => m.i > after);
    const cursor = queue.length > 0 ? queue[queue.length - 1].i : after;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ messages: newMessages, cursor }));
  }

  if (req.method === 'POST') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'invalid json' }));
      }

      const { to, from, type, payload } = body || {};
      if (!to || !from || !type) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'missing fields' }));
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

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, n: queue.length }));
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'method not allowed' }));
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // API signaling route
  if (pathname.startsWith('/api/room/')) {
    return handleApiRoom(req, res, pathname, urlObj.searchParams);
  }

  // SPA join routes like /m/123456 or root
  if (pathname.startsWith('/m/') || pathname === '/' || pathname === '/join' || pathname === '/host') {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(indexPath).pipe(res);
  }

  // Static files
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA client-side routes
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(indexPath).pipe(res);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at:`);
  console.log(`- Local:   http://localhost:${PORT}`);
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`- Network: http://${iface.address}:${PORT}`);
      }
    }
  }
});
