import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readServerConfig, withRailwayDefaults } from '../src/config.js';
import { migrate } from '../src/db/migrate.js';
import { createPgliteDatabase } from '../src/db/pglite.js';
import { startServer } from './helpers.js';

test('on Railway the server listens everywhere, behind its proxy, with https cookies', () => {
  const env = withRailwayDefaults({
    RAILWAY_ENVIRONMENT_ID: 'e1',
    DATABASE_URL: 'postgres://u:p@db:5432/railway',
  });
  const config = readServerConfig(env);

  assert.equal(config.host, '0.0.0.0');
  assert.ok(config.trustProxy && config.secureCookies);
});

test('on Railway with no Postgres it refuses to start, and never shows the URL', () => {
  assert.throws(
    () => withRailwayDefaults({ RAILWAY_ENVIRONMENT_ID: 'e1', DATABASE_URL: 'mysql://u:secret@x' }),
    (error) => /DATABASE_URL/.test(error.message) && !error.message.includes('secret'),
  );
});

test('migrations run once, and again find nothing to do', async () => {
  const database = await createPgliteDatabase();

  assert.deepEqual(await migrate(database), ['0001_accounts', '0002_documents']);
  assert.deepEqual(await migrate(database), []);
  await database.close();
});

test('the page is sent, its health said, and nothing outside its folder', async () => {
  const server = await startServer();
  const page = await fetch(`${server.base}/`);
  const health = await fetch(`${server.base}/api/health`);
  const outside = await fetch(`${server.base}/%2e%2e/package.json`);

  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.deepEqual(await health.json(), { ok: true });
  assert.equal(outside.status, 404);
  await server.close();
});
