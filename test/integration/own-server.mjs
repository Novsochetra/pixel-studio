import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};

async function answer(folder, request, response) {
  const { pathname } = new URL(request.url, 'http://localhost');
  const file = pathname.endsWith('/') ? `${pathname}index.html` : pathname;

  try {
    const body = await readFile(`${folder}${file}`);

    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
}

// A server of the flow's own for the built page, which the flow can stop: the one way to have no
// network that is the same in every browser. Playwright's own switch stands in front of WebKit's
// service worker, so a page loaded with it on never reaches the worker.
export async function ownServer(folder = 'dist') {
  const server = createServer((request, response) => answer(folder, request, response));

  await new Promise((resolve) => {
    server.listen(0, 'localhost', resolve);
  });

  return {
    address: `http://localhost:${server.address().port}/`,
    stop: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}
