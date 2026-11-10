import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slidesFrom } from '../../src/ui/segmented-thumb.js';

const place = (x, more = {}) => ({ x, y: 2, width: 60, height: 26, across: 250, ...more });

test('a thumb slides from where the last one of that control stood', () => {
  assert.equal(slidesFrom(place(2), place(64)), true);
});

test('a thumb with no place before it, or already in place, does not slide', () => {
  assert.equal(slidesFrom(undefined, place(64)), false);
  assert.equal(slidesFrom(place(64), place(64)), false);
});

test('a thumb does not fly in from a control of another width or from another row', () => {
  assert.equal(slidesFrom(place(2, { across: 180 }), place(64)), false);
  assert.equal(slidesFrom(place(2, { y: 34 }), place(64)), false);
});
