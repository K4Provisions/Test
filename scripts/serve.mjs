// Tiny static file server with no dependencies.
// Usage: node scripts/serve.mjs [folder] [--port 3000]
// Honors the PORT and HOST environment variables that hosting and import tools set.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const root = resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port') || 'site');
const port = Number(process.env.PORT || (portFlag >= 0 ? args[portFlag + 1] : 0) || 3000);
const host = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
};

async function fileFor(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  let path = join(root, clean);
  if (path !== root && !path.startsWith(root + sep)) return null; // block ../ escapes
  try {
    const s = await stat(path);
    if (s.isDirectory()) path = join(path, 'index.html');
    await stat(path);
    return path;
  } catch {
    // allow extensionless URLs like /contact
    if (!extname(path)) {
      try { await stat(path + '.html'); return path + '.html'; } catch { /* fall through */ }
    }
    return null;
  }
}

createServer(async (req, res) => {
  try {
    const path = await fileFor(req.url || '/');
    if (!path) {
      const notFound = await readFile(join(root, '404.html')).catch(() => Buffer.from('Not found'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(notFound);
      return;
    }
    const body = await readFile(path);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
    console.error(err);
  }
}).listen(port, host, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
