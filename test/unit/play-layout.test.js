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

// at one whole pixel the views stood in a column, all but the first under a phone's sheet
test('art too big for the room at a whole pixel plays at a half, every view in sight', () => {
  const layout = playLayout({ count: 3, width: 160, height: 160 }, { width: 360, height: 200 }, 2);

  assert.deepEqual(layout, { columns: 3, scale: 0.5 });
});

test('a phone’s room with a sheet up shows four wide views at a half', () => {
  const layout = playLayout({ count: 4, width: 140, height: 90 }, { width: 304, height: 200 }, 1);

  assert.equal(layout.scale, 0.5);
  assert.ok(layout.columns >= 2, 'in rows that fit the room');
});

test('art too big even at a half keeps whole pixels, in the columns that fit across', () => {
  const layout = playLayout({ count: 3, width: 400, height: 400 }, { width: 360, height: 200 }, 2);

  assert.deepEqual(layout, { columns: 1, scale: 1 });
});
