import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { heldTrue, shapePoints } from '../../src/editor/shapes.js';

// the shape as rows of text, '#' where it has a pixel
function drawn(kind, to, options) {
  const rows = Array.from({ length: to[1] + 1 }, () => Array(to[0] + 1).fill('.'));

  for (const [x, y] of shapePoints(kind, [0, 0], to, options)) {
    rows[y][x] = '#';
  }

  return rows.map((row) => row.join(''));
}

test('a line runs from one end to the other, one pixel a step', () => {
  assert.deepEqual(drawn('line', [4, 2]), ['#....', '.##..', '...##']);
});

test('a rectangle is its four sides, or all of it when filled', () => {
  assert.deepEqual(drawn('rect', [4, 3]), ['#####', '#...#', '#...#', '#####']);
  assert.deepEqual(drawn('rect', [2, 1], { filled: true }), ['###', '###']);
});

test('a shape is the same whichever corner the drag starts from', () => {
  const sorted = (points) => points.map(String).sort();

  assert.deepEqual(
    sorted(shapePoints('ellipse', [9, 6], [2, 1])),
    sorted(shapePoints('ellipse', [2, 1], [9, 6])),
  );
});

test('an ellipse fills its box, thin all the way round', () => {
  assert.deepEqual(drawn('ellipse', [7, 7]), [
    '..####..',
    '.#....#.',
    '#......#',
    '#......#',
    '#......#',
    '#......#',
    '.#....#.',
    '..####..',
  ]);
});

test('a filled ellipse has no holes and the same edge as its outline', () => {
  assert.deepEqual(drawn('ellipse', [4, 4], { filled: true }), [
    '.###.',
    '#####',
    '#####',
    '#####',
    '.###.',
  ]);

  const outline = new Set(shapePoints('ellipse', [0, 0], [10, 6]).map(String));
  const filled = new Set(shapePoints('ellipse', [0, 0], [10, 6], { filled: true }).map(String));

  assert.ok([...outline].every((point) => filled.has(point)));
});

test('the smallest shapes are still drawn', () => {
  assert.deepEqual(drawn('ellipse', [0, 0]), ['#']);
  assert.deepEqual(drawn('rect', [0, 0]), ['#']);
  assert.deepEqual(drawn('ellipse', [0, 3]), ['#', '#', '#', '#']);
});

// rounding both sides up left a tall, 2-pixel-wide oval with one pixel at its top and bottom
test('an ellipse is the same left and right, however thin', () => {
  for (const to of [
    [1, 9],
    [2, 11],
    [6, 3],
    [11, 4],
  ]) {
    for (const row of drawn('ellipse', to)) {
      assert.equal(row, [...row].reverse().join(''), `${to}: ${row}`);
    }
  }
});

test('held true, a drag along one row or column still makes a square', () => {
  assert.deepEqual(heldTrue('rect', [2, 2], [9, 2]), [9, 9]);
  assert.deepEqual(heldTrue('ellipse', [2, 2], [2, 7]), [7, 7]);
});

test('held true, a line snaps to flat, upright or diagonal and a box to a square', () => {
  assert.deepEqual(heldTrue('line', [0, 0], [10, 2]), [10, 0]);
  assert.deepEqual(heldTrue('line', [0, 0], [1, 9]), [0, 9]);
  assert.deepEqual(heldTrue('line', [0, 0], [7, 5]), [7, 7]);
  assert.deepEqual(heldTrue('rect', [2, 2], [9, -1]), [9, -5]);
  assert.deepEqual(heldTrue('ellipse', [5, 5], [1, 2]), [1, 1]);
});
