import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStudioServer } from '../src/create-server.js';
import { migrate } from '../src/db/migrate.js';
import { createPgliteDatabase } from '../src/db/pglite.js';
import { createMemoryFiles } from '../src/files/memory-files.js';

// a page to send, as build/build.py writes one
function distFolder() {
  const root = mkdtempSync(join(tmpdir(), 'studio-dist-'));

  writeFileSync(join(root, 'index.html'), '<!doctype html><title>Pixel Clean</title>');

  return root;
}

// The server on a free port, over a fresh Postgres in memory, with layers' pictures in memory.
export async function startServer(options = {}) {
  const database = await createPgliteDatabase();
  const files = options.files === null ? null : createMemoryFiles();

  await migrate(database);
  const server = createStudioServer({
    database,
    files,
    distRoot: distFolder(),
    logError: () => {},
    ...options,
  });

  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;

  return {
    base,
    files,
    database,
    close: () => new Promise((done) => server.close(done)).then(() => database.close()),
  };
}

// a browser of its own: the cookie it was given goes with each request it sends after
export function visitor(base) {
  let cookie = '';

  return async (path, { method = 'GET', json, headers = {} } = {}) => {
    const answer = await fetch(base + path, {
      method,
      headers: {
        ...(json === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
    const set = answer.headers.get('set-cookie');

    if (set) {
      cookie = set.split(';')[0];
    }

    return { status: answer.status, json: await answer.json().catch(() => null), set };
  };
}
