import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { lassoSelection } from '../../src/editor/lasso-select.js';

const canvas = { width: 10, height: 10 };
const count = (selection) => selection.cells.reduce((sum, on) => sum + on, 0);
const has = (selection, [x, y]) => Boolean(selection.cells[y * 10 + x]);

test('a lasso holds the pixels inside its loop and those its line went over', () => {
  const square = lassoSelection(canvas, [
    [2, 2],
    [6, 2],
    [6, 6],
    [2, 6],
  ]);

  assert.equal(count(square), 25);
  assert.ok(has(square, [4, 4]));
  assert.ok(has(square, [2, 6]), 'the line closing the loop counts');
  assert.ok(!has(square, [7, 4]));
});

test('a loop of any shape holds only what is inside it', () => {
  const triangle = lassoSelection(canvas, [
    [1, 1],
    [8, 1],
    [1, 8],
  ]);

  assert.ok(has(triangle, [2, 2]));
  assert.ok(!has(triangle, [7, 7]), 'a corner outside the slant');
});

test('a click that never moved holds nothing, and a loop off the canvas stops at its edge', () => {
  assert.equal(lassoSelection(canvas, [[3, 3]]), null);

  const past = lassoSelection(canvas, [
    [-5, -5],
    [4, -5],
    [4, 4],
    [-5, 4],
  ]);

  assert.equal(count(past), 25);
});
