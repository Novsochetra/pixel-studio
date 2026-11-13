import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import { startServer, visitor } from './helpers.js';

let server;

before(async () => {
  server = await startServer();
});
after(() => server.close());

async function signedUp(email) {
  const browser = visitor(server.base);

  await browser('/api/account/signup', {
    method: 'POST',
    json: { email, password: 'pixels-forever' },
  });

  return browser;
}

// one red pixel, as the studio keeps a layer: a PNG data URL
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==';

test('a document is written, read back and removed', async () => {
  const browser = await signedUp('docs@example.com');

  assert.deepEqual((await browser('/api/docs/projects')).json, { data: null });
  await browser('/api/docs/projects', { method: 'PUT', json: { data: { list: [1, 2] } } });
  assert.deepEqual((await browser('/api/docs/projects')).json, { data: { list: [1, 2] } });
  await browser('/api/docs/projects', { method: 'DELETE' });
  assert.deepEqual((await browser('/api/docs/projects')).json, { data: null });
});

test('a layer’s picture goes to the bucket, and comes back as it went', async () => {
  const browser = await signedUp('layers@example.com');

  await browser('/api/docs', {
    method: 'POST',
    json: {
      entries: [
        ['p-a-layer-l1', { png: PNG }],
        ['p-a-project', { json: '{}' }],
      ],
    },
  });
  const [row] = (
    await server.database.query("SELECT data, file_key FROM documents WHERE key = 'p-a-layer-l1'")
  ).rows;

  assert.equal(row.data.png, null, 'the picture is not in the database');
  assert.ok(server.files.keys().includes(row.file_key), 'it is in the bucket');
  assert.match(row.file_key, /^users\/\d+\/p-a-layer-l1\.png$/);
  assert.equal((await browser('/api/docs/p-a-layer-l1')).json.data.png, PNG);

  await browser('/api/docs/p-a-layer-l1', { method: 'DELETE' });
  assert.ok(!server.files.keys().includes(row.file_key), 'and leaves it when the layer does');
});

test('saved work is its owner’s alone', async () => {
  const owner = await signedUp('owner@example.com');
  const other = await signedUp('other@example.com');
  const nobody = visitor(server.base);

  await owner('/api/docs/presets', { method: 'PUT', json: { data: { mine: true } } });

  assert.deepEqual((await other('/api/docs/presets')).json, { data: null });
  assert.equal((await nobody('/api/docs/presets')).status, 401);
});

test('a name that is no document’s, and a batch that is no list, are refused', async () => {
  const browser = await signedUp('names@example.com');

  assert.equal((await browser('/api/docs/..%2Fsecrets')).status, 400);
  assert.equal(
    (await browser('/api/docs', { method: 'POST', json: { entries: { a: 1 } } })).status,
    400,
  );
});
