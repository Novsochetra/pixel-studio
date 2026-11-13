import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { answer } from '../protocol.js';

const folder = mkdtempSync(join(tmpdir(), 'pixel-studio-mcp-checks-'));
const path = join(folder, 'hero.json');
let nextId = 1;

function call(name, args) {
  const { result } = answer({
    jsonrpc: '2.0',
    id: nextId++,
    method: 'tools/call',
    params: { name, arguments: args },
  });

  return {
    failed: Boolean(result.isError),
    said: result.content.map((part) => part.text).join('\n'),
  };
}

// a size the studio cannot open, and a kind it does not know, made files all the same
test('new_project refuses sizes and kinds the studio cannot open', () => {
  const huge = call('new_project', { path, width: 5000, height: 0 });
  const odd = call('new_project', { path, kind: 'spaceship' });

  assert.ok(huge.failed && /width should be from 8 to 512/.test(huge.said), huge.said);
  assert.ok(odd.failed && /kind should be one of/.test(odd.said), odd.said);
  assert.ok(!existsSync(path), 'and writes nothing');
});

// an exception's own words came back as they were: ENOENT, "pixels.filter is not a function"
test('what goes wrong is said in sentences', () => {
  const said = [
    call('describe_project', { path: join(folder, 'none.json') }),
    call('describe_project', {}),
    call('describe_project', null),
    call('describe_project', { path, colour: 'red' }),
  ].map((result) => result.said);

  assert.match(said[0], /^There is no file at /);
  assert.match(said[1], /needs path/);
  assert.match(said[2], /takes its arguments as an object/);
  assert.match(said[3], /takes no colour/);
  writeFileSync(join(folder, 'notes.json'), 'not json');
  assert.match(
    call('describe_project', { path: join(folder, 'notes.json') }).said,
    /is not a Pixel Clean Studio project file/,
  );
});

test('set_pixels says what fell off the canvas, and add_layer numbers a name taken', () => {
  call('new_project', { path, width: 16, height: 16 });

  const drawn = call('set_pixels', {
    path,
    pixels: [
      { x: 1, y: 1, color: '#ff0000' },
      { x: 99, y: 1, color: '#ff0000' },
    ],
  });
  const wrong = call('set_pixels', { path, pixels: { x: 1 } });

  assert.match(drawn.said, /^1 pixel changed .*1 outside the 16×16 canvas were left out/);
  assert.ok(wrong.failed && /pixels should be a list/.test(wrong.said), wrong.said);
  call('add_layer', { path, name: 'Hat' });
  assert.match(call('add_layer', { path, name: 'Hat' }).said, /^Hat 2 is the top layer/);
  assert.match(call('describe_project', { path }).said, /1 frame;/);
});
