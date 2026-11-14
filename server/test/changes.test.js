import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import { setTimeout } from 'node:timers';
import { startServer } from './helpers.js';
import { claude, keyOf, signedUp } from './mcp-helpers.js';

let server;

before(async () => {
  server = await startServer();
});
after(() => server.close());

async function cookieOf(email) {
  const answer = await fetch(`${server.base}/api/account/signin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'pixels-forever' }),
  });

  return answer.headers.get('set-cookie').split(';')[0];
}

async function follow(cookie, method = 'POST') {
  const stop = new globalThis.AbortController();
  const answer = await fetch(`${server.base}/api/changes`, {
    method,
    headers: { cookie },
    signal: stop.signal,
  });
  const reader = answer.body.getReader();
  let heard = '';

  const next = async () => {
    while (!/data: .*\n\n/.test(heard)) {
      const { value, done } = await reader.read();

      if (done) {
        return null;
      }

      heard += Buffer.from(value).toString();
    }

    const start = heard.indexOf('data: ') + 'data: '.length;
    const end = heard.indexOf('\n\n', start);
    const change = JSON.parse(heard.slice(start, end));

    heard = heard.slice(end + 2);

    return change;
  };

  return { status: answer.status, type: answer.headers.get('content-type'), next, stop };
}

test('a page signed in hears each change a tool makes to its account', async () => {
  const email = 'watches@example.com';
  const tools = claude(server, await keyOf(await signedUp(server, email)));
  const page = await follow(await cookieOf(email));

  assert.equal(page.status, 200);
  assert.match(page.type, /text\/event-stream/);

  await tools.tool('new_project', { name: 'Hero', kind: 'icon', width: 8, height: 8 });
  const made = await page.next();

  assert.equal(made.by, 'tool');
  assert.ok(made.keys.includes('projects'));
  assert.ok(made.keys.some((key) => key.endsWith('-project')));

  await tools.tool('set_pixels', { project: 'Hero', rows: ['a'], palette: { a: '#ff0000' } });
  const drawn = await page.next();

  assert.ok(
    drawn.keys.some((key) => /-layer-/.test(key)),
    'the layer drawn on is named',
  );
  page.stop.abort();
});

test('the stream is the same asked with GET, as curl would', async () => {
  const email = 'curl@example.com';
  const tools = claude(server, await keyOf(await signedUp(server, email)));
  const page = await follow(await cookieOf(email), 'GET');

  await tools.tool('new_project', { name: 'Axe', kind: 'icon' });
  assert.ok((await page.next()).keys.includes('projects'));
  page.stop.abort();
});

test('a tool that only reads tells no page', async () => {
  const email = 'reads@example.com';
  const tools = claude(server, await keyOf(await signedUp(server, email)));
  const page = await follow(await cookieOf(email));

  await tools.tool('list_projects');
  await tools.tool('new_project', { name: 'Sword', kind: 'icon' });

  // the first change heard is the project made: the list read before it sent nothing
  assert.ok((await page.next()).keys.includes('projects'));
  page.stop.abort();
});

test('another account’s page hears nothing of it', async () => {
  await signedUp(server, 'someone@example.com');
  const page = await follow(await cookieOf('someone@example.com'));
  const tools = claude(server, await keyOf(await signedUp(server, 'busy@example.com')));

  await tools.tool('new_project', { name: 'Shield', kind: 'icon' });
  const heard = await Promise.race([
    page.next(),
    new Promise((done) => setTimeout(() => done('nothing'), 300)),
  ]);

  assert.equal(heard, 'nothing');
  page.stop.abort();
});

test('no page follows an account it is not signed in to', async () => {
  const answer = await fetch(`${server.base}/api/changes`, { method: 'POST' });

  assert.equal(answer.status, 401);
});
