import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createSprite, getPixel, pack, setPixel, CLEAR } from '../../src/model/sprite.js';
import { shrinkInto, shrunkSize } from '../../src/model/sprite-shrink.js';

const RED = pack(255, 0, 0);

function shrunk(sprite, step) {
  const { width, height } = shrunkSize(sprite, step);

  return shrinkInto(sprite, step, createSprite(width, height));
}

// drawn at a quarter by leaving pixels out, a line on a row that was left out was not drawn
test('a line one pixel thick is still a line in a sprite made smaller', () => {
  const sprite = createSprite(16, 16);

  for (let x = 0; x < 16; x++) {
    setPixel(sprite, x, 6, RED);
  }

  const quarter = shrunk(sprite, 4);

  assert.deepEqual([quarter.width, quarter.height], [4, 4]);

  for (let x = 0; x < 4; x++) {
    assert.equal(getPixel(quarter, x, 1), RED, 'the row the line is in');
    assert.equal(getPixel(quarter, x, 0), CLEAR);
    assert.equal(getPixel(quarter, x, 2), CLEAR);
  }
});

test('a sprite whose size is not a multiple of the step keeps its last pixels', () => {
  const sprite = createSprite(5, 3);

  setPixel(sprite, 4, 2, RED);
  const half = shrunk(sprite, 2);

  assert.deepEqual([half.width, half.height], [3, 2]);
  assert.equal(getPixel(half, 2, 1), RED);
});
