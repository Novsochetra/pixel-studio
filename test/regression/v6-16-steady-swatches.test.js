import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { steadyOrder } from '../../src/palette/steady-order.js';

// Sorted by how much each was used, the art's swatches changed places at every pose and stroke:
// the colour under the finger was another one the next time it was pressed.
test('the art’s colours keep their places as how much each is used changes', () => {
  const first = steadyOrder([], [1, 2, 3]);
  const posed = steadyOrder(first.seen, [3, 1, 2]);

  assert.deepEqual(first.shown, [1, 2, 3]);
  assert.deepEqual(posed.shown, [1, 2, 3]);
});

test('a colour new to the art joins at the end, and one gone and back takes its old place', () => {
  const first = steadyOrder([], [1, 2, 3]);
  const without = steadyOrder(first.seen, [3, 1, 4]);
  const back = steadyOrder(without.seen, [2, 4, 1, 3]);

  assert.deepEqual(without.shown, [1, 3, 4]);
  assert.deepEqual(back.shown, [1, 2, 3, 4]);
});
