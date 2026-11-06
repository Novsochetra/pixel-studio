import { components, floodFromBorder } from './regions.js';
import { medianColor } from './numeric.js';

function spriteColors(cells) {
  const seen = new Map();

  for (let i = 0; i < cells.bg.length; i++) {
    if (!cells.bg[i]) {
      const color = [cells.colors[i * 3], cells.colors[i * 3 + 1], cells.colors[i * 3 + 2]];

      seen.set(color.join(), color);
    }
  }

  return [...seen.values()];
}

function holeShade(cells, hole) {
  const pixels = [];

  hole.forEach((inside, i) => {
    if (inside) {
      pixels.push([cells.colors[i * 3], cells.colors[i * 3 + 1], cells.colors[i * 3 + 2]]);
    }
  });

  return { shade: medianColor(pixels), size: pixels.length };
}

// Background reached from the border, plus enclosed background: a region of at least `holeMin`
// cells (a gap under an arm), or a small one whose colour the sprite never uses (a magenta gap
// by a hand). A small one in a sprite colour is detail, like an eye highlight as white as a
// checker square.
export function transparentCells(cells, holeMin, tolerance) {
  const { width, height, bg } = cells;
  const clear = floodFromBorder(bg, width, height);
  const sprite = spriteColors(cells);
  const enclosed = bg.map((value, i) => (value && !clear[i] ? 1 : 0));

  for (const hole of components(enclosed, width, height)) {
    const { shade, size } = holeShade(cells, hole);
    const distances = sprite.map(
      (colour) =>
        Math.abs(colour[0] - shade[0]) +
        Math.abs(colour[1] - shade[1]) +
        Math.abs(colour[2] - shade[2]),
    );
    const unused = !sprite.length || Math.min(...distances) > 2 * tolerance;

    if (size >= holeMin || unused) {
      hole.forEach((inside, i) => {
        if (inside) {
          clear[i] = 1;
        }
      });
    }
  }

  return clear;
}
