import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { MAX_ZOOM, MIN_ZOOM, nearestZoom, steppedZoom } from '../../src/ui/navigate.js';

test('a zoom is whole, or the half below 1', () => {
  assert.equal(nearestZoom(3.4), 3);
  assert.equal(nearestZoom(3.5), 4);
  assert.equal(nearestZoom(1.2), 1);
  assert.equal(nearestZoom(0.9), 1);
  assert.equal(nearestZoom(0.6), MIN_ZOOM);
  assert.equal(nearestZoom(0.1), MIN_ZOOM);
  assert.equal(nearestZoom(99), MAX_ZOOM);
});

test('a step from the half goes to 100%, and from 100% back to the half', () => {
  assert.equal(steppedZoom(MIN_ZOOM, 1), 1);
  assert.equal(steppedZoom(1, -1), MIN_ZOOM);
  assert.equal(steppedZoom(1, 1), 2);
  assert.equal(steppedZoom(5, -1), 4);
});

test('a step stops at either end', () => {
  assert.equal(steppedZoom(MIN_ZOOM, -1), MIN_ZOOM);
  assert.equal(steppedZoom(MAX_ZOOM, 1), MAX_ZOOM);
});

test('a canvas that fits the window whole has no half to go to', () => {
  assert.equal(nearestZoom(0.3, 1), 1);
  assert.equal(steppedZoom(1, -1, 1), 1);
  assert.equal(steppedZoom(2, -1, 1), 1);
  assert.equal(steppedZoom(1, -1, MIN_ZOOM), MIN_ZOOM);
});
