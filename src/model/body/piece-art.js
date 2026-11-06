import { CLEAR, createSprite, getPixel, setPixel } from '../sprite.js';

// A part's art kept with the project as plain data: its box on the canvas, its colours, and its
// cells as runs of one colour's index (0 is clear), "0*12 3*2 4": saved projects strip sprites,
// and a cell each would soon pass what one saved document may hold.

function runsOf(indexes) {
  const runs = [];

  for (const index of indexes) {
    const last = runs.at(-1);

    if (last && last[0] === index) {
      last[1] += 1;
    } else {
      runs.push([index, 1]);
    }
  }

  return runs.map(([index, count]) => (count > 1 ? `${index}*${count}` : `${index}`)).join(' ');
}

function cellsOf(runs) {
  return runs.split(' ').flatMap((run) => {
    const [index, count = '1'] = run.split('*');

    return Array.from({ length: Number(count) }, () => Number(index));
  });
}

export function encodeArt(sprite, { x, y }) {
  const colours = [];
  const indexOf = new Map();
  const cells = [];

  for (let row = 0; row < sprite.height; row++) {
    for (let column = 0; column < sprite.width; column++) {
      const colour = getPixel(sprite, column, row);

      if (colour !== CLEAR && !indexOf.has(colour)) {
        colours.push(colour);
        indexOf.set(colour, colours.length);
      }

      cells.push(colour === CLEAR ? 0 : indexOf.get(colour));
    }
  }

  return { x, y, width: sprite.width, height: sprite.height, colours, cells: runsOf(cells) };
}

const decoded = new WeakMap();

// the art as a sprite of its own size, with where its top-left sits on the canvas
export function decodeArt(art) {
  if (!decoded.has(art)) {
    const sprite = createSprite(art.width, art.height);

    cellsOf(art.cells).forEach((cell, i) => {
      if (cell) {
        setPixel(sprite, i % art.width, Math.floor(i / art.width), art.colours[cell - 1]);
      }
    });
    decoded.set(art, { x: art.x, y: art.y, sprite });
  }

  return decoded.get(art);
}

// the same art in other colours: `mapping` is { colour: new colour }, as a colour swap gives
export function recolourArt(art, mapping) {
  const colours = art.colours.map((colour) => mapping[colour] ?? colour);

  return { ...art, colours };
}
