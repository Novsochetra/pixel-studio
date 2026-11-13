import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { sendBody, sendNotFound } from './http/responses.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

// The page is checked for a new one on every visit (and its offline worker, which keeps a copy),
// so a deploy reaches everyone at their next visit; its pictures are kept a day.
const cacheOf = (path) =>
  ['.html', '.js', '.webmanifest'].includes(extname(path)) ? 'no-cache' : 'public, max-age=86400';

// the file under the root a request names, or null for one outside it or of a kind not sent
function fileOf(root, pathname) {
  const name = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const path = normalize(join(root, name));

  return path.startsWith(root.endsWith(sep) ? root : root + sep) && TYPES[extname(path)]
    ? path
    : null;
}

// The built page (dist/, from build/build.py) and what goes with it: the manifest, the icons and
// the offline worker.
export function createStaticFiles(root) {
  return async (request, response, pathname) => {
    const path = fileOf(root, pathname);
    const body = path && (await readFile(path).catch(() => null));

    if (!body) {
      return sendNotFound(response);
    }

    sendBody(response, {
      status: 200,
      contentType: TYPES[extname(path)],
      body,
      headers: { 'Cache-Control': cacheOf(path) },
    });
  };
}
