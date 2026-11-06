import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { wholeNumber } from '../../src/model/numbers.js';

test('a number field gives a whole number within its range, or its fallback', () => {
  const fps = { min: 1, max: 30, fallback: 8 };

  assert.equal(wholeNumber('12', fps), 12);
  assert.equal(wholeNumber('12.6', fps), 13);
  assert.equal(wholeNumber('99', fps), 30);
  assert.equal(wholeNumber('-3', fps), 1);
  assert.equal(wholeNumber('', fps), 8);
  assert.equal(wholeNumber('fast', fps), 8);
  assert.equal(wholeNumber('', { min: 8, max: 512 }), 8);
});
