import { CLEAR, colorCounts, fromHex, getPixel, setPixel, toHex } from '../../src/model/sprite.js';

// A sprite as rows of letters, one letter a colour, for a reader that takes text better than
// pictures: "." is a clear pixel, and the legend says which colour each letter is.
const MARKS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function asText(sprite) {
  const colours = colorCounts(sprite).map(({ color }) => color);

  if (colours.length > MARKS.length) {
    throw new Error(
      `${colours.length} colours are more than text has letters for: read this frame as an image.`,
    );
  }

  const markOf = new Map(colours.map((color, i) => [color, MARKS[i]]));
  const rows = Array.from({ length: sprite.height }, (_, y) =>
    Array.from({ length: sprite.width }, (__, x) => markOf.get(getPixel(sprite, x, y)) ?? '.').join(
      '',
    ),
  );

  return { palette: Object.fromEntries(colours.map((color, i) => [MARKS[i], toHex(color)])), rows };
}

function colourOfHex(hex) {
  const colour = fromHex(String(hex));

  if (colour === null) {
    throw new Error(`"${hex}" is not a colour: write it as #rrggbb.`);
  }

  return colour;
}

function colourOf(mark, palette) {
  if (mark === '.') {
    return CLEAR;
  }

  if (!palette?.[mark]) {
    throw new Error(`"${mark}" is in the rows and not in the palette. "." is clear, " " is kept.`);
  }

  return colourOfHex(palette[mark]);
}

// rows as asText gives them, drawn from `at`: a space leaves the pixel there as it is
export function paintRows(sprite, { rows, palette, at = { x: 0, y: 0 } }) {
  let changed = 0;

  rows.forEach((row, y) =>
    [...row].forEach((mark, x) => {
      if (mark !== ' ' && setPixel(sprite, at.x + x, at.y + y, colourOf(mark, palette))) {
        changed += 1;
      }
    }),
  );

  return changed;
}

// pixels: [{ x, y, color }], color a hex code or null for clear
export function paintPixels(sprite, pixels) {
  return pixels.filter(({ x, y, color }) =>
    setPixel(sprite, x, y, color ? colourOfHex(color) : CLEAR),
  ).length;
}

// whole pixels made larger, so a small sprite can be looked at
export function enlarged(sprite, longSide = 384) {
  const scale = Math.max(1, Math.floor(longSide / Math.max(sprite.width, sprite.height)));
  const [width, height] = [sprite.width * scale, sprite.height * scale];
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const from = Math.floor(i / width / scale) * sprite.width + Math.floor((i % width) / scale);

    pixels.set(sprite.pixels.subarray(from * 4, from * 4 + 4), i * 4);
  }

  return { width, height, pixels };
}

const outside = ({ width, height }, { x, y }) => x < 0 || y < 0 || x >= width || y >= height;

// the pixels asked for that fall off the canvas: left out, they were left out without a word
export function leftOut(sprite, { pixels = [], rows = [], at = { x: 0, y: 0 } }) {
  const marks = rows.flatMap((row, y) =>
    [...row].flatMap((mark, x) => (mark === ' ' ? [] : [{ x: at.x + x, y: at.y + y }])),
  );

  return [...pixels, ...marks].filter((point) => outside(sprite, point)).length;
}
