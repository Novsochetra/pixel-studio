import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { coveredAtFoot } from '../../src/ui/keyboard-room.js';

test('the keyboard covers what the window has and the part in sight has not', () => {
  assert.equal(coveredAtFoot({ height: 508, offsetTop: 0 }, 844), 336);
});

test('a page Safari scrolled up from under the keys is covered by that much less', () => {
  assert.equal(coveredAtFoot({ height: 508, offsetTop: 100 }, 844), 236);
});

test('a browser’s own bars coming and going are no keyboard', () => {
  assert.equal(coveredAtFoot({ height: 780, offsetTop: 0 }, 844), 0);
  assert.equal(coveredAtFoot({ height: 844, offsetTop: 0 }, 844), 0);
});
