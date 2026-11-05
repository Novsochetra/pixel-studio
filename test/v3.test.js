import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createSprite, fromHex, getPixel, pack, setPixel, CLEAR } from '../src/model/sprite.js';
import { kitMapping, outfitRamps, sharedColours } from '../src/palette/kits.js';
import { rampOf } from '../src/palette/ramp.js';
import { addOutline, closeGaps, thinOutline, outlineColour } from '../src/editor/outline.js';
import { shadeFamilies, shiftShade } from '../src/palette/families.js';

const GAME = JSON.parse(readFileSync(new URL('../build/game-kits.json', import.meta.url)));
const INK = pack(20, 4, 17);
const FILL = pack(220, 40, 40);

test('a kit recolours each part shade for shade, darkest to darkest', () => {
  const parts = [
    { id: 'shirt', name: 'Shirt', colours: ['#850d19', '#b7101c', '#df2321'].map(fromHex) },
    { id: 'shorts', name: 'Shorts', colours: [fromHex('#283ca0')] },
    { id: 'socks', name: 'Socks', colours: [] },
  ];
  const kit = GAME.kits.cambodia.away;
  const mapping = kitMapping(parts, kit);
  assert.equal(mapping[fromHex('#850d19')], fromHex(kit.shirt[0]));
  assert.equal(mapping[fromHex('#df2321')], fromHex(kit.shirt[3]));
  assert.equal(mapping[fromHex('#283ca0')], fromHex(kit.shorts[2]), 'a one-colour part takes the base shade');
  assert.deepEqual(sharedColours([{ id: 'shirt', colours: [1, 2] }, { id: 'socks', colours: [2] }]), [2]);
});

test('the ramp maker matches the game: Cambodia home shirt', () => {
  assert.deepEqual(rampOf('#d0262e'), GAME.kits.cambodia.home.shirt);
  const ramps = outfitRamps([{ id: 'cape', colours: [] }, { id: 'boots', colours: [] }], { cape: '#d0262e' });
  assert.deepEqual(Object.keys(ramps), ['cape']);
  assert.equal(ramps.cape.length, 4);
});

function square(sprite, x0, y0, size, color) {
  for (let y = y0; y < y0 + size; y++) for (let x = x0; x < x0 + size; x++) setPixel(sprite, x, y, color);
}

test('outline tools: add, thin a doubled one, close a gap', () => {
  const sprite = createSprite(12, 12);
  square(sprite, 4, 4, 4, FILL);
  assert.equal(addOutline(sprite, INK), 16);
  assert.equal(outlineColour(sprite), INK);
  assert.equal(getPixel(sprite, 3, 5), INK);

  const doubled = createSprite(12, 12);
  square(doubled, 2, 2, 8, INK);
  square(doubled, 4, 4, 4, FILL);
  const thinned = thinOutline(doubled, INK);
  assert.ok(thinned > 0);
  assert.equal(getPixel(doubled, 2, 5), CLEAR, 'outer ring of the doubled side goes');
  assert.equal(getPixel(doubled, 3, 5), INK, 'inner ring stays');

  const gap = createSprite(12, 12);
  square(gap, 3, 3, 6, INK);
  square(gap, 4, 4, 4, FILL);
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
