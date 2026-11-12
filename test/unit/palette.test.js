import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fromHex } from '../../src/model/sprite.js';
import { kitMapping, outfitRamps, sharedColours } from '../../src/palette/kits.js';
import { rampOf } from '../../src/palette/ramp.js';

const GAME = JSON.parse(readFileSync(new URL('../../build/game-kits.json', import.meta.url)));

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
  assert.equal(
    mapping[fromHex('#283ca0')],
    fromHex(kit.shorts[2]),
    'a one-colour part takes the base shade',
  );
  assert.deepEqual(
    sharedColours([
      { id: 'shirt', colours: [1, 2] },
      { id: 'socks', colours: [2] },
    ]),
    [2],
  );
});

test('the ramp maker matches the game: Cambodia home shirt', () => {
  assert.deepEqual(rampOf('#d0262e'), GAME.kits.cambodia.home.shirt);
  const ramps = outfitRamps(
    [
      { id: 'cape', colours: [] },
      { id: 'boots', colours: [] },
    ],
    { cape: '#d0262e' },
  );
  assert.deepEqual(Object.keys(ramps), ['cape']);
  assert.equal(ramps.cape.length, 4);
});

test('every starter palette has eight colours, dark to light, as a project palette', async () => {
  const { STARTER_PALETTES } = await import('../../src/art/starter-palettes.js');
  const { paletteFromHexCodes } = await import('../../src/palette/palette.js');
  const { unpack } = await import('../../src/model/sprite.js');
  const lightness = (color) =>
    unpack(color)
      .slice(0, 3)
      .reduce((sum, channel) => sum + channel, 0);

  for (const starter of STARTER_PALETTES) {
    const palette = paletteFromHexCodes(starter.name, starter.colors);
    const light = palette.colors.map(lightness);

    assert.equal(palette.colors.length, 8, starter.name);
    assert.ok(palette.id && palette.name === starter.name);
    assert.deepEqual(
      light,
      [...light].sort((first, second) => first - second),
      starter.name,
    );
  }
});

test('a first guess at the parts: one per family of shades, named by its hue', async () => {
  const { partsFromColours } = await import('../../src/palette/colour-parts.js');
  const colours = ['#850d19', '#df2321', '#283ca0', '#3c5ad8', '#fcb94c', '#121214', '#e0e0e0'];
  const parts = partsFromColours(colours.map(fromHex));

  assert.deepEqual(
    parts.map((part) => [part.name, part.colours.length]),
    [
      ['Reds', 2],
      ['Blues', 2],
      ['Oranges', 1],
      ['Greys', 2],
    ],
  );
  assert.equal(new Set(parts.flatMap((part) => part.colours)).size, colours.length);
});

// a GIMP palette was named after its file ("test"), not after its own Name: line
test('a GIMP palette is named as it names itself', async () => {
  const { paletteFileName } = await import('../../src/palette/palette.js');
  const gpl = 'GIMP Palette\nName: Forest night\nColumns: 4\n#\n 10  20  30\tDark\n';

  assert.equal(paletteFileName(gpl), 'Forest night');
  assert.equal(paletteFileName('#112233 #445566'), null);
});
