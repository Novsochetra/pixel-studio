import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import { startServer } from './helpers.js';
import { claude, keyOf, signedUp } from './mcp-helpers.js';

let server;

before(async () => {
  server = await startServer();
});
after(() => server.close());

test('a project is made, drawn on and read back as the studio saves it', async () => {
  const browser = await signedUp(server, 'draws@example.com');
  const tools = claude(server, await keyOf(browser));

  assert.match(
    (await tools.tool('new_project', { name: 'Hero', kind: 'icon', width: 8, height: 8 })).said,
    /Made Hero: icon, 8×8/,
  );
  assert.match(
    (await tools.tool('new_project', { name: 'Hero', kind: 'icon' })).said,
    /Made Hero 2: /,
  );
  assert.match(
    (
      await tools.tool('set_pixels', {
        project: 'HERO',
        rows: ['ab'],
        palette: { a: '#ff0000', b: '#00ff00' },
      })
    ).said,
    /2 pixels changed/,
  );
  assert.match(
    (await tools.tool('read_frame', { project: 'Hero', as: 'text' })).said,
    /\nab\.{6}\n/,
  );

  const { list } = (await browser('/api/docs/projects')).json.data;
  const hero = list.find((entry) => entry.name === 'Hero');
  const stored = (await browser(`/api/docs/${hero.prefix}project`)).json.data;

  assert.equal(list.length, 2);
  assert.equal(JSON.parse(stored.json).name, 'Hero', 'the studio reads it as it reads its own');
  assert.ok(
    server.files
      .keys()
      .some((key) =>
        key.endsWith(
          `${hero.prefix}layer-${JSON.parse(stored.json).animations[0].directions.south.frames[0].layers.at(-1).id}.png`,
        ),
      ),
  );
});

test('the sheet comes back as a picture, and a project not there is named among those that are', async () => {
  const browser = await signedUp(server, 'sheets@example.com');
  const tools = claude(server, await keyOf(browser));

  await tools.tool('new_project', { name: 'Coin', kind: 'icon', width: 8, height: 8 });
  await tools.tool('add_frame', { project: 'Coin' });

  const sheet = await tools.tool('export_sheet', { project: 'Coin' });
  const missing = await tools.tool('describe_project', { project: 'Sword' });

  assert.match(sheet.said, /2 frames across/);
  assert.equal(sheet.content.at(-1).type, 'image');
  assert.ok(missing.failed && /No project "Sword".*"Coin"/.test(missing.said), missing.said);
  assert.ok(
    (await tools.tool('export_sheet', { project: 'Coin', out: '/tmp/x.png' })).failed,
    'no file is written on the server',
  );
  assert.ok(
    (await tools.tool('clean_image', { project: 'Coin', image: '/etc/passwd' })).failed,
    'nor read from it',
  );
});

test('each key reaches its own account’s work alone', async () => {
  const mine = claude(server, await keyOf(await signedUp(server, 'mine@example.com')));
  const theirs = claude(server, await keyOf(await signedUp(server, 'theirs@example.com')));

  await mine.tool('new_project', { name: 'Secret', kind: 'icon' });

  assert.ok((await theirs.tool('describe_project', { project: 'Secret' })).failed);
  assert.match((await theirs.tool('list_projects')).said, /No projects yet/);
});

test('a notification is taken with 202, and a batch is answered as one', async () => {
  const tools = claude(server, await keyOf(await signedUp(server, 'batch@example.com')));
  const notified = await tools.post({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const batch = await tools.post([
    { jsonrpc: '2.0', id: 1, method: 'ping' },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  ]);

  assert.equal(notified.status, 202);
  assert.deepEqual(
    batch.json.map((reply) => reply.id),
    [1, 2],
  );
  assert.ok(batch.json[1].result.tools.some((tool) => tool.name === 'list_projects'));
});

test('a bucket that fails is said in a sentence, not in its own words', async (context) => {
  const broken = await startServer({
    files: { put: async () => Promise.reject(new Error('NoSuchBucket: pixel-secret-bucket')) },
  });

  context.after(() => broken.close());

  const tools = claude(broken, await keyOf(await signedUp(broken, 'broken@example.com')));
  const made = await tools.tool('new_project', { name: 'Gem', kind: 'icon' });

  assert.ok(made.failed);
  assert.match(made.said, /could not be reached just now/);
  assert.doesNotMatch(made.said, /pixel-secret-bucket/);
});
