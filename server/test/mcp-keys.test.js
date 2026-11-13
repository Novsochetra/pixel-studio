import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import { createAccountsStore } from '../src/accounts/accounts-store.js';
import { hashPassword } from '../src/accounts/passwords.js';
import { startServer, visitor } from './helpers.js';
import { claude, keyOf, signedUp } from './mcp-helpers.js';

let server;

before(async () => {
  server = await startServer();
});
after(() => server.close());

test('a key is made for a signed-in account alone, and shown once', async () => {
  const browser = await signedUp(server, 'key@example.com');
  const stranger = visitor(server.base);

  assert.equal((await stranger('/api/account/mcp-key', { method: 'POST' })).status, 401);
  assert.deepEqual((await browser('/api/account/mcp-key')).json, { key: null });

  const secret = await keyOf(browser);
  const about = (await browser('/api/account/mcp-key')).json.key;

  assert.match(secret, /^psk_[\w-]{40,}$/);
  assert.ok(about.createdAt && about.secret === undefined, 'only the hash is kept');
  assert.equal((await claude(server, secret).tool('list_projects')).failed, false);
  assert.ok((await browser('/api/account/mcp-key')).json.key.lastUsedAt, 'its use is noted');
});

test('/mcp refuses a request with no key, a wrong one, a replaced one or one turned off', async () => {
  const browser = await signedUp(server, 'turned-off@example.com');
  const first = await keyOf(browser);
  const second = await keyOf(browser);
  const ping = { jsonrpc: '2.0', id: 1, method: 'ping' };

  assert.equal((await claude(server, 'psk_wrong').post(ping)).status, 401);
  assert.equal((await claude(server, first).post(ping)).status, 401, 'a new key stops the last');
  assert.equal((await claude(server, second).post(ping)).status, 200);
  await browser('/api/account/mcp-key', { method: 'DELETE' });
  assert.equal((await claude(server, second).post(ping)).status, 401);

  const bare = await fetch(`${server.base}/mcp`, { method: 'POST', body: '{}' });

  assert.equal(bare.status, 401);
  assert.match(bare.headers.get('www-authenticate'), /^Bearer/);
});

test('a new password turns the key off', async () => {
  const browser = await signedUp(server, 'reset@example.com');
  const secret = await keyOf(browser);

  await createAccountsStore(server.database).setPassword(
    'reset@example.com',
    await hashPassword('another-password'),
  );
  assert.equal(
    (await claude(server, secret).post({ jsonrpc: '2.0', id: 1, method: 'ping' })).status,
    401,
  );
});
