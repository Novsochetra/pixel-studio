import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { keptSelection } from '../../src/editor/selection-kept.js';
import { rectSelection } from '../../src/editor/selection.js';

const canvas = { width: 8, height: 8 };
const arm = rectSelection(canvas, [1, 1], [3, 4]);
const front = { animation: 'idle', direction: 'south', frame: 0, layer: null };

test('a selection stays as frames and layers change in the same view', () => {
  for (const to of [
    { ...front, frame: 1 },
    { ...front, layer: 'hair' },
  ]) {
    assert.equal(keptSelection(arm, { from: front, to, canvas }), arm);
  }
});

test('another view or animation is another drawing: the selection goes', () => {
  for (const to of [
    { ...front, direction: 'east' },
    { ...front, animation: 'run' },
  ]) {
    assert.equal(keptSelection(arm, { from: front, to, canvas }), null);
  }
});

test('a selection that no longer fits the canvas goes, and none stays none', () => {
  const smaller = { width: 4, height: 4 };

  assert.equal(keptSelection(arm, { from: front, to: front, canvas: smaller }), null);
  assert.equal(keptSelection(null, { from: front, to: { ...front, frame: 1 }, canvas }), null);
});
