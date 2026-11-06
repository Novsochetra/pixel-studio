import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CLEAR, createSprite, getPixel, pack } from '../../src/model/sprite.js';
import { brushOffsets, resizeBrush } from '../../src/editor/brush.js';
import { brushPixels } from '../../src/editor/paint.js';
import { Stroke } from '../../src/editor/stroke.js';

const RED = pack(255, 0, 0);

const sorted = (points) =>
  [...points].sort((first, second) => first[1] - second[1] || first[0] - second[0]);

// how many pixels wide each row of the brush is, top to bottom
function rowWidths(offsets) {
  const rows = new Map();

  for (const [, dy] of offsets) {
    rows.set(dy, (rows.get(dy) ?? 0) + 1);
  }

  return [...rows.entries()]
    .sort((first, second) => first[0] - second[0])
    .map(([, width]) => width);
}

function painted(sprite) {
  const points = [];

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      if (getPixel(sprite, x, y) !== CLEAR) {
        points.push([x, y]);
      }
    }
  }

  return points;
}

test('a one-pixel brush paints only the pixel under the pointer, whatever its shape', () => {
  assert.deepEqual(brushOffsets({ size: 1, shape: 'round' }), [[0, 0]]);
  assert.deepEqual(brushOffsets({ size: 1, shape: 'square' }), [[0, 0]]);
});

test('a square brush covers size × size, an even size leaning up and to the left', () => {
  assert.deepEqual(sorted(brushOffsets({ size: 2, shape: 'square' })), [
    [-1, -1],
    [0, -1],
    [-1, 0],
    [0, 0],
  ]);
  assert.equal(brushOffsets({ size: 3, shape: 'square' }).length, 9);
  assert.equal(brushOffsets({ size: 8, shape: 'square' }).length, 64);
});

test('round brushes are the circles pixel artists draw', () => {
  const widths = (size) => rowWidths(brushOffsets({ size, shape: 'round' }));

  assert.deepEqual(widths(2), [2, 2]);
  assert.deepEqual(widths(3), [1, 3, 1]);
  assert.deepEqual(widths(4), [2, 4, 4, 2]);
  assert.deepEqual(widths(5), [3, 5, 5, 5, 3]);
  assert.deepEqual(widths(6), [4, 6, 6, 6, 6, 4]);
  assert.deepEqual(widths(7), [3, 5, 7, 7, 7, 5, 3]);
  assert.deepEqual(widths(8), [4, 6, 8, 8, 8, 8, 6, 4]);
});

test('a round brush is the same turned on its side', () => {
  for (let size = 1; size <= 8; size++) {
    const offsets = brushOffsets({ size, shape: 'round' });
    const turned = offsets.map(([dx, dy]) => [dy, dx]);

    assert.deepEqual(sorted(turned), sorted(offsets), `size ${size}`);
  }
});

test('the brush grows and shrinks one pixel at a time, from 1 to 8', () => {
  assert.deepEqual(resizeBrush({ size: 3, shape: 'round' }, 1), { size: 4, shape: 'round' });
  assert.equal(resizeBrush({ size: 8, shape: 'round' }, 1).size, 8);
  assert.equal(resizeBrush({ size: 1, shape: 'square' }, -1).size, 1);
});

test('symmetry mirrors the whole brush', () => {
  const options = { brush: { size: 2, shape: 'square' }, symmetry: { on: true, axisSum: 7 } };

  assert.deepEqual(sorted(brushPixels([1, 1], options)), [
    [0, 0],
    [1, 0],
    [6, 0],
    [7, 0],
    [0, 1],
    [1, 1],
    [6, 1],
    [7, 1],
  ]);
});

test('a stroke with a 3-pixel brush paints a band three pixels tall', () => {
  const sprite = createSprite(12, 9);
  const stroke = new Stroke(sprite, RED, { brush: { size: 3, shape: 'square' } });

  stroke.add(2, 4);
  stroke.add(8, 4);

  const points = painted(sprite);

  assert.equal(points.length, 9 * 3);
  assert.ok(points.every(([x, y]) => x >= 1 && x <= 9 && y >= 3 && y <= 5));
});

test('clean lines leaves a thick stroke alone: its corners are not doubled pixels', () => {
  const draw = (cleanLines) => {
    const sprite = createSprite(12, 12);
    const stroke = new Stroke(sprite, RED, { cleanLines, brush: { size: 3, shape: 'round' } });

    for (const [x, y] of [
      [3, 3],
      [4, 3],
      [4, 4],
      [5, 4],
      [5, 5],
      [6, 5],
    ]) {
      stroke.add(x, y);
    }

    return painted(sprite);
  };

  assert.deepEqual(draw(true), draw(false));
});

test('a brush at the edge paints only what is on the canvas', () => {
  const sprite = createSprite(6, 6);
  const stroke = new Stroke(sprite, RED, { brush: { size: 5, shape: 'square' } });

  stroke.add(0, 0);

  assert.equal(painted(sprite).length, 9);
});
