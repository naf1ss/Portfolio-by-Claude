#!/usr/bin/env node
/**
 * A local server that answers like GitHub Pages: clean addresses (/gallery serves gallery.html, / serves
 * index.html) and 404.html for anything missing. Used by the phone check, and for previewing the site:
 *
 *   npm run serve            http://localhost:8000
 *   npm run serve -- 8765    another port
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json',
  '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };

const isFile = (file) => fs.existsSync(file) && fs.statSync(file).isFile();

/** The file an address is served from, in GitHub Pages' order, or null; never a file outside the site. */
function resolveFile(root, pathname) {
  const target = path.join(root, decodeURIComponent(pathname));
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  const candidates = pathname.endsWith('/') ? [path.join(target, 'index.html')] : [target, `${target}.html`, path.join(target, 'index.html')];
  return candidates.find(isFile) || null;
}

function createServer(root = ROOT) {
  return http.createServer((request, response) => {
    const found = resolveFile(root, new URL(request.url, 'http://local').pathname);
    const file = found || path.join(root, '404.html');
    if (!isFile(file)) return response.writeHead(404).end();
    response.writeHead(found ? 200 : 404, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
}

/** Starts a server on `port` (0 picks a free one) and resolves with it once it is listening. */
function serve(port = 0, root = ROOT) {
  const server = createServer(root);
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (require.main === module) {
  const port = Number(process.argv[2]) || 8000;
  serve(port).then(() => console.log(`Serving the site at http://localhost:${port}/`));
}

module.exports = { resolveFile, createServer, serve };
