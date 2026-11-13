import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { decodePng, encodePng } from '../png.js';
import { TOOLS, answer } from '../local.js';

const folder = mkdtempSync(join(tmpdir(), 'pixel-studio-mcp-'));
const path = join(folder, 'hero.json');
let nextId = 1;

async function call(name, args) {
  const { result } = await answer({
    jsonrpc: '2.0',
    id: nextId++,
    method: 'tools/call',
    params: { name, arguments: args },
  });

  return result;
}

const wordsOf = (result) =>
  result.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');

test('a PNG written is read back pixel for pixel', async () => {
  const sprite = { width: 3, height: 2, pixels: new Uint8ClampedArray(24) };

  sprite.pixels.set([255, 0, 0, 255, 0, 255, 0, 128], 4);

  const { width, height, data } = decodePng(encodePng(sprite));

  assert.deepEqual([width, height], [3, 2]);
  assert.deepEqual([...data], [...sprite.pixels]);
});

test('a PNG another program wrote is read', async () => {
  const { width, height, data } = decodePng(
    readFileSync(new URL('../../../test/images/front.png', import.meta.url)),
  );

  assert.ok(width > 100 && height > 100);
  assert.equal(data.length, width * height * 4);
  assert.ok(data.some((value) => value > 0));
});

test('the server says what it speaks and lists its tools', async () => {
  const { result } = await answer({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-03-26' },
  });
  const listed = (await answer({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).result.tools;

  assert.equal(result.protocolVersion, '2025-03-26');
  assert.ok(result.capabilities.tools);
  assert.equal(listed.length, TOOLS.length);
  assert.ok(listed.every((tool) => tool.description && tool.inputSchema.type === 'object'));
});

test('a notification is not answered, and a method not known says so', async () => {
  assert.equal(await answer({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.equal(
    (await answer({ jsonrpc: '2.0', id: 9, method: 'resources/list' })).error.code,
    -32601,
  );
});

test('a project is made, drawn on and read back', async () => {
  assert.match(
    wordsOf(await call('new_project', { path, name: 'Hero', kind: 'icon', width: 8, height: 8 })),
    /Made Hero: icon, 8×8/,
  );
  assert.ok(
    (await call('new_project', { path })).isError,
    'a file there already is not written over',
  );

  const drawn = await call('set_pixels', {
    path,
    rows: ['ab', '.a'],
    palette: { a: '#ff0000', b: '#0000ff' },
    at: { x: 1, y: 1 },
    pixels: [{ x: 7, y: 7, color: '#00ff00' }],
  });

  assert.match(wordsOf(drawn), /4 pixels changed/);

  const read = await call('read_frame', { path, as: 'text' });
  const rows = wordsOf(read).split('\n').slice(2);

  assert.match(wordsOf(read), /a=#ff0000/);
  assert.equal(rows[1], '.ab.....');
  assert.equal(rows[2], '..a.....');
  assert.equal(rows[7].at(-1), 'c');
  assert.equal((await call('read_frame', { path })).content[1].type, 'image');
});

test('what cannot be done is said in words, not thrown', async () => {
  const bad = await call('set_pixels', { path, pixels: [{ x: 0, y: 0, color: 'red' }] });

  assert.ok(bad.isError);
  assert.match(wordsOf(bad), /not a colour/);
  assert.match(wordsOf(await call('read_frame', { path, frame: 5 })), /No frame 5/);
  assert.ok((await call('fly', {})).isError);
});

test('frames, layers and animations are added, and a sheet is saved', async () => {
  const out = join(folder, 'idle.png');

  assert.match(wordsOf(await call('add_frame', { path, copy: true })), /new frame 2/);
  assert.match(wordsOf(await call('add_layer', { path, frame: 2, name: 'Shine' })), /Shine/);
  assert.match(
    wordsOf(await call('add_animation', { path, name: 'Spin', frames: 3 })),
    /Made Spin/,
  );
  assert.match(wordsOf(await call('describe_project', { path })), /Spin, 8 fps/);
  assert.match(wordsOf(await call('export_sheet', { path, out })), /2 frames across/);

  const sheet = decodePng(readFileSync(out));

  assert.deepEqual([sheet.width, sheet.height], [16, 8]);
});

test('an AI picture is cleaned onto a frame as true pixels', async () => {
  const hero = join(folder, 'cleaned.json');

  await call('new_project', {
    path: hero,
    name: 'Cleaned',
    kind: 'character',
    width: 160,
    height: 160,
  });

  const image = new URL('../../../test/images/front.png', import.meta.url).pathname;
  const cleaned = await call('clean_image', { path: hero, image });

  assert.ok(!cleaned.isError, wordsOf(cleaned));
  assert.match(wordsOf(cleaned), /Cleaned onto/);
  assert.match(wordsOf(await call('describe_project', { path: hero })), /#[0-9a-f]{6} ×\d+/);
});

test('the server answers a line with a line', async () => {
  const server = spawn('node', [new URL('../server.js', import.meta.url).pathname]);
  const said = new Promise((done) => server.stdout.once('data', (data) => done(String(data))));

  server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })}\n`);

  assert.deepEqual(JSON.parse(await said), { jsonrpc: '2.0', id: 1, result: {} });
  server.kill();
});
