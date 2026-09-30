import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
const orbisOrigin = String(process.env.ORBIS_API_URL ?? 'https://lib.thehowlingwhispers.com').replace(/\/$/, '');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function proxyOrbis(req, res, url) {
  if (!['GET', 'HEAD'].includes(req.method ?? 'GET')) return json(res, 405, { error: 'Fabula Orbis bridge is read-only in this pre-alpha.' });
  const upstreamPath = `${url.pathname.slice('/api/orbis'.length)}${url.search}`;
  if (!upstreamPath.startsWith('/v1/library/')) return json(res, 403, { error: 'Only the Orbis Library read API is exposed through this bridge.' });
  try {
    const upstream = await fetch(`${orbisOrigin}${upstreamPath}`, {
      method: req.method,
      headers: { accept: 'application/json', 'user-agent': 'HW-Fabula/0.3 pre-alpha' },
      redirect: 'follow',
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-fabula-orbis-origin': orbisOrigin,
    });
    if (req.method === 'HEAD') res.end();
    else res.end(body);
  } catch (error) {
    json(res, 502, { error: 'Fabula could not reach Orbis.', detail: error instanceof Error ? error.message : String(error) });
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname.startsWith('/api/orbis/')) return proxyOrbis(req, res, url);

  const requested = url.pathname === '/' ? '/web/index.html' : url.pathname;
  const safePath = normalize(requested).replace(/^([/\\])+/, '').replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(root, safePath);
  if (!filePath.startsWith(`${root}${sep}`) && filePath !== root) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`Fabula 0.3 pre-alpha running on http://localhost:${port}`);
  console.log(`Orbis read bridge: ${orbisOrigin}`);
});
