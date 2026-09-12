const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

// Local: http://127.0.0.1:3000
// Online: set PORT/ HOST automatically on most hosts, and configure FRONTEND_ORIGIN.
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const FILES = path.join(DATA, 'files');
const MAX_UPLOAD = 10 * 1024 * 1024;

// Change these in your hosting provider's environment variables before publishing.
const isProduction = process.env.NODE_ENV === 'production';
const rustPassword = process.env.RUST_PASSWORD || (isProduction ? null : 'God');
const fgPassword = process.env.FG_PASSWORD || (isProduction ? null : 'FG');
if (isProduction && (!rustPassword || !fgPassword)) {
  console.error('RUST_PASSWORD and FG_PASSWORD must be set in production.');
  process.exit(1);
}
const USERS = {
  Rust: { password: rustPassword, role: 'editor' },
  FG: { password: fgPassword, role: 'viewer' }
};

// GitHub Pages -> backend is cross-origin, so CORS must allow the exact site origin.
// Example: https://yourname.github.io
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
const SESSIONS = new Map();

for (const dir of [DATA, FILES, path.join(FILES, 'goku'), path.join(FILES, 'sonic')]) {
  fs.mkdirSync(dir, { recursive: true });
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  const allowed = FRONTEND_ORIGIN && origin === FRONTEND_ORIGIN ? origin : null;
  return allowed ? {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
  } : {};
}

function send(res, status, body, headers = {}) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  res.writeHead(status, { 'Content-Length': data.length, ...headers });
  res.end(data);
}
function json(res, status, body, headers = {}) {
  send(res, status, body, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
}
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(x => {
    const i = x.indexOf('=');
    return [x.slice(0, i).trim(), decodeURIComponent(x.slice(i + 1).trim())];
  }));
}
function session(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return SESSIONS.get(auth.slice(7));
  const id = parseCookies(req).rustos_session;
  return id ? SESSIONS.get(id) : undefined;
}
function safePart(s) { return path.basename(String(s)); }
function filePath(character, name) {
  if (!['goku', 'sonic'].includes(character)) throw new Error('Invalid character');
  return path.join(FILES, character, safePart(name));
}
function mime(name) {
  const ext = path.extname(name).toLowerCase();
  return ({
    '.txt': 'text/plain', '.md': 'text/markdown', '.log': 'text/plain', '.csv': 'text/csv',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml'
  })[ext] || 'application/octet-stream';
}
function requireAuth(req, res) {
  const s = session(req);
  if (!s) { json(res, 401, { error: 'Not signed in' }); return null; }
  return s;
}
function requireEditor(req, res) {
  const s = requireAuth(req, res);
  if (!s) return null;
  if (s.role !== 'editor') { json(res, 403, { error: 'Read-only account' }); return null; }
  return s;
}
function body(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_UPLOAD) {
        reject(new Error('Request too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function multipart(buffer, boundary) {
  if (!boundary) throw new Error('Missing multipart boundary');
  const parts = buffer.toString('binary').split('--' + boundary);
  for (const p of parts) {
    const i = p.indexOf('\r\n\r\n');
    if (i < 0) continue;
    const head = p.slice(0, i);
    const m = head.match(/filename="([^"]+)"/i);
    if (m) {
      let data = p.slice(i + 4);
      data = data.replace(/\r\n--?$/, '');
      return { name: Buffer.from(m[1], 'binary').toString(), data: Buffer.from(data, 'binary') };
    }
  }
  throw new Error('No file supplied');
}
function cookieHeader(id, maxAge) {
  return `rustos_session=${id || ''}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
function publicSession(id) {
  return id;
}

const server = http.createServer(async (req, res) => {
  const common = corsHeaders(req);
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '', common);

    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const headers = { ...common };

    if (req.method === 'GET' && u.pathname === '/api/health') {
      return json(res, 200, { ok: true, service: 'RustOS' }, headers);
    }

    if (req.method === 'GET' && u.pathname === '/api/me') {
      const s = session(req);
      if (!s) return json(res, 401, { error: 'Not signed in' }, headers);
      return json(res, 200, { user: s.user, role: s.role }, headers);
    }

    if (req.method === 'POST' && u.pathname === '/api/login') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      const user = USERS[b.username];
      if (!user || user.password !== b.password) return json(res, 401, { error: 'Invalid account or password' }, headers);
      const sid = crypto.randomBytes(32).toString('hex');
      SESSIONS.set(sid, { user: b.username, role: user.role, createdAt: Date.now() });
      headers['Set-Cookie'] = cookieHeader(sid, 28800);
      return json(res, 200, { ok: true, user: b.username, role: user.role, token: publicSession(sid) }, headers);
    }

    if (req.method === 'POST' && u.pathname === '/api/logout') {
      const auth = req.headers.authorization || '';
      const sid = auth.startsWith('Bearer ') ? auth.slice(7) : parseCookies(req).rustos_session;
      if (sid) SESSIONS.delete(sid);
      headers['Set-Cookie'] = cookieHeader('', 0);
      return json(res, 200, { ok: true }, headers);
    }

    if (u.pathname === '/api/files' && req.method === 'GET') {
      const s = requireAuth(req, res); if (!s) return;
      const c = u.searchParams.get('character');
      if (!['goku', 'sonic'].includes(c)) return json(res, 400, { error: 'Invalid character' }, headers);
      const dir = path.join(FILES, c);
      const files = fs.readdirSync(dir, { withFileTypes: true }).filter(x => x.isFile()).map(x => {
        const n = x.name, st = fs.statSync(path.join(dir, n));
        return { name: n, size: st.size, mime: mime(n), modified: st.mtimeMs };
      });
      return json(res, 200, { files }, headers);
    }

    const match = u.pathname.match(/^\/api\/files\/([^/]+)(?:\/(.+))?$/);
    if (match) {
      const c = decodeURIComponent(match[1]);
      const n = match[2] && decodeURIComponent(match[2]);
      if (req.method === 'GET') {
        const s = requireAuth(req, res); if (!s) return;
        if (!n) return json(res, 400, { error: 'Filename required' }, headers);
        const fp = filePath(c, n);
        if (!fs.existsSync(fp)) return json(res, 404, { error: 'File not found' }, headers);
        return send(res, 200, fs.readFileSync(fp), { ...headers, 'Content-Type': mime(n), 'Cache-Control': 'no-cache' });
      }

      const s = requireEditor(req, res); if (!s) return;
      if (req.method === 'POST') {
        const ct = req.headers['content-type'] || '';
        if (!ct.startsWith('multipart/form-data')) return json(res, 415, { error: 'Use multipart/form-data' }, headers);
        const matchBoundary = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        const boundary = matchBoundary && (matchBoundary[1] || matchBoundary[2]);
        const p = multipart(await body(req), boundary);
        if (!/^[a-zA-Z0-9 _.-]+\.(txt|md|log|csv|png|jpg|jpeg|gif|webp|svg)$/i.test(p.name)) return json(res, 400, { error: 'Unsupported filename' }, headers);
        fs.writeFileSync(filePath(c, p.name), p.data);
        return json(res, 200, { ok: true, name: p.name }, headers);
      }
      if (req.method === 'PUT') {
        if (!n) return json(res, 400, { error: 'Filename required' }, headers);
        const b = JSON.parse((await body(req)).toString() || '{}');
        if (typeof b.content !== 'string') return json(res, 400, { error: 'content must be text' }, headers);
        const fp = filePath(c, n);
        if (!fs.existsSync(fp)) return json(res, 404, { error: 'File not found' }, headers);
        fs.writeFileSync(fp, b.content, 'utf8');
        return json(res, 200, { ok: true }, headers);
      }
    }

    // Serve the frontend locally. GitHub Pages serves RustOS.html itself.
    if (req.method === 'GET' && u.pathname === '/') {
      return send(res, 200, fs.readFileSync(path.join(ROOT, 'RustOS.html')), { ...headers, 'Content-Type': 'text/html; charset=utf-8' });
    }
    if (req.method === 'GET') {
      const rel = path.normalize(u.pathname).replace(/^([.][.][\\/])+/, '');
      const fp = path.join(ROOT, rel);
      if (fp.startsWith(ROOT) && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
        return send(res, 200, fs.readFileSync(fp), { ...headers, 'Content-Type': mime(fp) });
      }
    }
    return json(res, 404, { error: 'Not found' }, headers);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: e.message || 'Server error' }, common);
  }
});

server.listen(PORT, HOST, () => console.log(`RustOS backend running on ${HOST}:${PORT}`));
