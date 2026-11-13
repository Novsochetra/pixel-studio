import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { syncedBackend } from '../../src/store/synced-backend.js';
import { waitingKeys } from '../../src/store/waiting-keys.js';

function storeOf() {
  const kept = new Map();

  return {
    kept,
    read: async (key) => kept.get(key) ?? null,
    write: async (key, data) => void kept.set(key, data),
    writeAll: async (entries) => entries.forEach(([key, data]) => kept.set(key, data)),
    remove: async (key) => void kept.delete(key),
  };
}

// a server that can be cut off, as a phone in a tunnel
function serverOf() {
  const store = storeOf();
  const server = { kept: store.kept, down: false };
  const reached =
    (call) =>
    async (...args) => {
      if (server.down) {
        throw new Error('offline');
      }

      return call(...args);
    };

  for (const name of ['read', 'write', 'writeAll', 'remove']) {
    server[name] = reached(store[name]);
  }

  return server;
}

function storageOf() {
  const kept = new Map();

  return { getItem: (key) => kept.get(key) ?? null, setItem: (key, value) => kept.set(key, value) };
}

function synced(storage = storageOf()) {
  const server = serverOf();
  const local = storeOf();
  const backend = syncedBackend({
    owner: { id: '7' },
    kind: 'server:7',
    server,
    local,
    waiting: waitingKeys(storage, '7'),
  });
  const aways = [];

  backend.onAway = (away) => aways.push(away);

  return { backend, server, local, aways, storage };
}

test('a change goes to both this browser and the server', async () => {
  const { backend, server, local } = synced();

  await backend.writeAll([['project', { a: 1 }]]);

  assert.deepEqual(server.kept.get('project'), { a: 1 });
  assert.deepEqual(local.kept.get('project'), { a: 1 });
});

test('a change made offline waits, is read from here, and is sent when the server answers', async () => {
  const { backend, server, aways } = synced();

  await backend.write('project', { a: 1 });
  server.down = true;
  await backend.write('project', { a: 2 });
  await backend.remove('layer-1');

  assert.deepEqual(aways, [true], 'the toolbar is told the server is away');
  assert.deepEqual(await backend.read('project'), { a: 2 }, 'not the server’s older copy');

  server.kept.set('layer-1', { png: 'old' });
  server.down = false;
  await backend.sendWaiting();

  assert.deepEqual(server.kept.get('project'), { a: 2 });
  assert.ok(!server.kept.has('layer-1'), 'what went offline goes there too');
  assert.deepEqual(aways, [true, false]);
});

test('what waits is still waiting on the next visit', async () => {
  const storage = storageOf();
  const first = synced(storage);

  first.server.down = true;
  await first.backend.write('presets', { list: [] });

  const next = synced(storage);

  next.local.kept.set('presets', { list: [] });
  await next.backend.sendWaiting();
  assert.deepEqual(next.server.kept.get('presets'), { list: [] });
});

test('with no server, the copy in this browser is read', async () => {
  const { backend, server, local } = synced();

  local.kept.set('projects', { list: ['Hero'] });
  server.down = true;

  assert.deepEqual(await backend.read('projects'), { list: ['Hero'] });
});

test('the server’s copy is read, and kept here for a visit with no network', async () => {
  const { backend, server, local } = synced();

  server.kept.set('projects', { list: ['From another device'] });

  assert.deepEqual(await backend.read('projects'), { list: ['From another device'] });
  assert.deepEqual(local.kept.get('projects'), { list: ['From another device'] });
});
