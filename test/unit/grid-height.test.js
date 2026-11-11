import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fittedGridHeight } from '../../src/ui/grid/grid-height.js';

test('a height that fits stays what was asked for', () => {
  assert.equal(fittedGridHeight(300, 800), 300);
});

test('the frames never get so small the tabs and a row do not fit', () => {
  assert.equal(fittedGridHeight(10, 800), 160);
});

test('the frames never take the room the canvas needs', () => {
  assert.equal(fittedGridHeight(790, 800), 680);
});

test('in a room too small for both, the frames still keep their least', () => {
  assert.equal(fittedGridHeight(300, 150), 160);
});

// the least zoom is 100%: with less room than that, the art's feet lay under the frames
test('the frames leave the room the canvas needs at its own size', () => {
  assert.equal(fittedGridHeight(790, 800, 176), 624);
});

test('a canvas taller than half the room does not keep the frames from growing', () => {
  assert.equal(fittedGridHeight(790, 800, 1040), 400);
});
