import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fittedGridHeight } from '../../src/ui/grid/grid-height.js';

test('a height that fits stays what was asked for', () => {
  assert.equal(fittedGridHeight(300, 800), 300);
});

test('the frames never get so small the tabs and a row do not fit', () => {
  assert.equal(fittedGridHeight(10, 800), 120);
});

test('the frames never take the room the canvas needs', () => {
  assert.equal(fittedGridHeight(790, 800), 680);
});

test('in a room too small for both, the frames still keep their least', () => {
  assert.equal(fittedGridHeight(300, 150), 120);
});
