import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { selectAlong } from '../../src/editor/select-pixels.js';

const canvas = { width: 8, height: 8 };
const one = { size: 1, shape: 'square' };
const selected = (selection) =>
  [...(selection?.cells ?? [])].flatMap((on, i) => (on ? [[i % 8, Math.floor(i / 8)]] : []));

test('a drag selects each pixel it passes over, adding to what was selected', () => {
  const first = selectAlong(null, { canvas, brush: one }, { from: [1, 1], to: [3, 1] });
  const both = selectAlong(first, { canvas, brush: one }, { from: [5, 5], to: [5, 5] });

  assert.deepEqual(selected(first), [
    [1, 1],
    [2, 1],
    [3, 1],
  ]);
  assert.equal(selected(both).length, 4);
});

test('with Shift a drag lets pixels go, and nothing left is no selection', () => {
  const line = selectAlong(null, { canvas, brush: one }, { from: [1, 1], to: [3, 1] });
  const fewer = selectAlong(
    line,
    { canvas, brush: one },
    { from: [1, 1], to: [1, 1], remove: true },
  );
  const none = selectAlong(
    fewer,
    { canvas, brush: one },
    { from: [2, 1], to: [3, 1], remove: true },
  );

  assert.equal(selected(fewer).length, 2);
  assert.equal(none, null);
});

test('a bigger brush selects as much as it would paint, and never past the canvas', () => {
  const square = selectAlong(
    null,
    { canvas, brush: { size: 3, shape: 'square' } },
    { from: [0, 0], to: [0, 0] },
  );

  assert.deepEqual(selected(square), [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]);
});
