import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createSprite, pack, setPixel } from '../../src/model/sprite.js';
import { partBox, viewBox } from '../../src/ui/body/cut-view.js';

const PHONE = { innerWidth: 390, innerHeight: 844 };

test('zoomed to a part, the window shows the part and a little round it, larger', () => {
  const art = createSprite(64, 64);
  const owners = new Int16Array(64 * 64).fill(-1);

  for (let y = 10; y < 60; y++) {
    setPixel(art, 30, y, pack(0, 0, 0, 255));
    owners[y * 64 + 30] = y < 20 ? 0 : 1;
  }

  const hand = partBox(owners, art, 0);
  const whole = viewBox(art, PHONE);
  const close = viewBox(art, PHONE, hand);

  assert.deepEqual(hand, { left: 22, top: 6, right: 40, bottom: 24 });
  assert.ok(close.scale > whole.scale, `${close.scale} over ${whole.scale}`);
  assert.equal(partBox(owners, art, 2), null);
});
