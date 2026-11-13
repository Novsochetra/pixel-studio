import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { fromHex } from '../../src/model/sprite.js';
import { shadeRamps, shiftShade } from '../../src/palette/families.js';

// the example footballer's colours: Darker shades turned skin into shirt red, and lightening
// the shirt red turned it skin brown, as the reds and the browns were one ramp
const ART = [
  '#180411',
  '#df2321',
  '#f49348',
  '#b8502b',
  '#283ca0',
  '#2f2c6e',
  '#36224a',
  '#dfdae6',
  '#850d19',
  '#fcb94c',
  '#b7101c',
  '#8980ae',
  '#370e22',
  '#000000',
  '#191c5a',
  '#ffffff',
].map(fromHex);
const shade = (ramps, hex, step) => shiftShade(fromHex(hex), ramps, step);

test('the light and dark brush keeps skin in its ramp and the shirt in its own', () => {
  const ramps = shadeRamps(ART);
  const reds = ['#850d19', '#b7101c', '#df2321'].map(fromHex);
  const skin = ['#b8502b', '#f49348'].map(fromHex);

  assert.ok(skin.includes(shade(ramps, '#f49348', -1)), 'a skin highlight darkens to skin');
  assert.ok(!reds.includes(shade(ramps, '#b8502b', -1)), 'a skin shadow never turns red');
  assert.ok(reds.includes(shade(ramps, '#df2321', -1)), 'the shirt darkens to its own red');
  assert.ok(!skin.includes(shade(ramps, '#df2321', 1)), 'nor lightens to skin');
});

test('the ramps are the same whatever order the colours come in', () => {
  const sorted = (ramps) =>
    ramps
      .map((ramp) => ramp.join())
      .sort()
      .join('|');

  assert.equal(sorted(shadeRamps(ART)), sorted(shadeRamps([...ART].reverse())));
});
