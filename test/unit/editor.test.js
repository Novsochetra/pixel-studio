import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CLEAR, createSprite, fromHex, getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { colourSelection, moveSelected, rectSelection } from '../../src/editor/selection.js';
import { Stroke } from '../../src/editor/stroke.js';
import { addOutline, closeGaps, outlineColour, thinOutline } from '../../src/editor/outline.js';
import { shadeFamilies, shiftShade } from '../../src/palette/families.js';

const RED = pack(255, 0, 0);
const INK = pack(20, 4, 17);
const FILL = pack(220, 40, 40);

// a size×size block of color with its top left at [x0, y0]
function square(sprite, [x0, y0], size, color) {
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      setPixel(sprite, x, y, color);
    }
  }
}

test('moving a selection carries its pixels and leaves the gap clear', () => {
  const sprite = createSprite(8, 8);
  setPixel(sprite, 2, 2, RED);
  const moved = moveSelected(sprite, rectSelection({ width: 8, height: 8 }, [2, 2], [2, 2]), 3, 1);
  assert.equal(getPixel(sprite, 2, 2), 0);
  assert.equal(getPixel(sprite, 5, 3), RED);
  assert.equal(moved.cells[3 * 8 + 5], 1);
  assert.equal(
    colourSelection(sprite, 5, 3, false).cells.reduce((first, second) => first + second, 0),
    1,
  );
});

test('clean lines removes the L corner a diagonal stroke leaves', () => {
  const sprite = createSprite(8, 8);
  const stroke = new Stroke(sprite, RED, { cleanLines: true });
  stroke.add(1, 1);
  stroke.add(2, 1);
  stroke.add(2, 2);
  assert.equal(getPixel(sprite, 2, 1), 0);
  assert.equal(getPixel(sprite, 2, 2), RED);
});

test('outline tools: add, thin a doubled one, close a gap', () => {
  const sprite = createSprite(12, 12);
  square(sprite, [4, 4], 4, FILL);
  assert.equal(addOutline(sprite, INK), 16);
  assert.equal(outlineColour(sprite), INK);
  assert.equal(getPixel(sprite, 3, 5), INK);

  const doubled = createSprite(12, 12);
  square(doubled, [2, 2], 8, INK);
  square(doubled, [4, 4], 4, FILL);
  const thinned = thinOutline(doubled, INK);
  assert.ok(thinned > 0);
  assert.equal(getPixel(doubled, 2, 5), CLEAR, 'outer ring of the doubled side goes');
  assert.equal(getPixel(doubled, 3, 5), INK, 'inner ring stays');

  const gap = createSprite(12, 12);
  square(gap, [3, 3], 6, INK);
  square(gap, [4, 4], 4, FILL);
  setPixel(gap, 3, 5, FILL);
  setPixel(gap, 2, 5, CLEAR);
  assert.equal(closeGaps(gap, INK), 1);
  assert.equal(getPixel(gap, 3, 5), INK);
});

test('the light and dark brush steps along a shade family', () => {
  const reds = ['#850d19', '#b7101c', '#df2321'].map(fromHex);
  const families = shadeFamilies([...reds, fromHex('#283ca0'), fromHex('#ffffff')]);
  assert.equal(shiftShade(reds[1], families, 1), reds[2]);
  assert.equal(shiftShade(reds[1], families, -1), reds[0]);
  assert.equal(shiftShade(reds[2], families, 1), reds[2], 'the lightest stays');
});
