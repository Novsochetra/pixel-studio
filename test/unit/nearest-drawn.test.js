import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newFrame } from '../../src/model/project.js';
import { pack, setPixel } from '../../src/model/sprite.js';
import { nearestDrawn } from '../../src/model/nearest-drawn.js';

const drawnFrame = (drawn) => {
  const frame = newFrame(4, 4);

  if (drawn) {
    setPixel(frame.layers[0].sprite, 1, 1, pack(255, 0, 0, 255));
  }

  return frame;
};

test('the nearest frame with art: itself, the one before first, then the one after', () => {
  const frames = [true, false, false, true].map(drawnFrame);

  assert.equal(nearestDrawn(frames, 0), 0);
  assert.equal(nearestDrawn(frames, 1), 0);
  assert.equal(nearestDrawn(frames, 2), 3);
  assert.equal(nearestDrawn([false, false].map(drawnFrame), 1), null);
});
