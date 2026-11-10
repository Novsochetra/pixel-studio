import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playLayout } from '../../src/views/play-layout.js';

test('with room, every view plays side by side at the zoom being edited at', () => {
  const layout = playLayout({ count: 4, width: 60, height: 100 }, { width: 1000, height: 400 }, 2);

  assert.deepEqual(layout, { columns: 4, scale: 2 });
});

test('views too wide for one row take two, when that draws them bigger', () => {
  const layout = playLayout({ count: 4, width: 100, height: 100 }, { width: 500, height: 600 }, 3);

  assert.deepEqual(layout, { columns: 2, scale: 2 });
});

test('art too big for the room is still whole pixels, in as many columns as fit across', () => {
  const layout = playLayout({ count: 3, width: 160, height: 160 }, { width: 360, height: 200 }, 2);

  assert.deepEqual(layout, { columns: 2, scale: 1 });
});

test('one view wider than the room keeps to one column', () => {
  const layout = playLayout({ count: 3, width: 400, height: 100 }, { width: 360, height: 900 }, 2);

  assert.deepEqual(layout, { columns: 1, scale: 1 });
});
