import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createSprite, getPixel, pack } from '../../src/model/sprite.js';
import { Stroke } from '../../src/editor/stroke.js';

const RED = pack(255, 0, 0);

// With Clean lines on, a drag that came back onto its own line put the corner it turned there
// back as it was before the stroke, punching a hole in the line it had drawn
test('a stroke coming back onto its own line leaves that line whole', () => {
  const sprite = createSprite(32, 32);
  const stroke = new Stroke(sprite, RED, { cleanLines: true, brush: { size: 1, shape: 'round' } });

  for (const [x, y] of [
    [2, 10],
    [20, 10],
    [20, 14],
    [10, 14],
    [10, 10],
    [14, 10],
  ]) {
    stroke.add(x, y);
  }

  // the first turn, at 20, is a corner cleaned away as any is
  const row = Array.from({ length: 18 }, (_, i) => getPixel(sprite, 2 + i, 10) === RED);

  assert.ok(
    row.every(Boolean),
    `row 10 from 2 to 19 is whole: ${row.map((on) => (on ? '#' : '.')).join('')}`,
  );
});
