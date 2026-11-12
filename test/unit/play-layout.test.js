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
test('art too big for the room at a whole pixel plays smaller, every view in sight', () => {
  const layout = playLayout({ count: 3, width: 160, height: 160 }, { width: 360, height: 200 }, 2);

  assert.deepEqual(layout, { columns: 3, scale: 0.625 });
});

test('a phone’s room with a sheet up shows four views that fill their canvas', () => {
  const views = { count: 4, width: 160, height: 160 };
  const room = { width: 288, height: 200 };
  const { columns, scale } = playLayout(views, room, 1);
  const rows = Math.ceil(views.count / columns);

  assert.ok(scale >= 0.125 && scale < 1);
  assert.ok(columns * views.width * scale + 16 * (columns - 1) <= room.width, 'across the room');
  assert.ok(rows * (views.height * scale + 22) + 16 * (rows - 1) <= room.height, 'and down it');
});

// four views of 32 pixels played at one pixel each, smaller than a frame's thumbnail
test('small art in a small room plays between whole pixels rather than at one', () => {
  const one = playLayout({ count: 4, width: 32, height: 32 }, { width: 288, height: 60 }, 6);
  const two = playLayout({ count: 4, width: 32, height: 32 }, { width: 288, height: 200 }, 6);

  assert.deepEqual(one, { columns: 4, scale: 1 });
  assert.deepEqual(two, { columns: 3, scale: 2 }, 'two rows draw them bigger');
  assert.deepEqual(
    playLayout({ count: 4, width: 32, height: 32 }, { width: 288, height: 80 }, 6),
    { columns: 4, scale: 1.5 },
    'a row and a half of room is a pixel and a half',
  );
});

test('a view wider than the room is still shown whole', () => {
  const views = { count: 4, width: 320, height: 64 };
  const { columns, scale } = playLayout(views, { width: 288, height: 200 }, 1);

  assert.ok(columns * views.width * scale + 16 * (columns - 1) <= 288);
});
