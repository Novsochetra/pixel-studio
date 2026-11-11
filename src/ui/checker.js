import { cssVar } from './draw.js';

const tiles = new Map();

// two squares by two of the checkerboard, to be repeated
function tileOf(square, colors) {
  const key = `${square} ${colors}`;
  let tile = tiles.get(key);

  if (!tile) {
    tile = document.createElement('canvas');
    tile.width = square * 2;
    tile.height = square * 2;
    const context = tile.getContext('2d');

    colors.forEach((color, i) => {
      context.fillStyle = color;
      context.fillRect(i * square, 0, square, square);
      context.fillRect((1 - i) * square, square, square, square);
    });
    tiles.set(key, tile);
  }

  return tile;
}

function squareBySquare(context, { width, height }, square, colors) {
  for (let row = 0; row * square < height; row++) {
    for (let col = 0; col * square < width; col++) {
      context.fillStyle = colors[(row + col) % 2];
      context.fillRect(
        col * square,
        row * square,
        Math.min(square, width - col * square),
        Math.min(square, height - row * square),
      );
    }
  }
}

// The checkerboard behind clear pixels, at the context's origin. It is one tile repeated: drawn
// a square at a time, a large canvas zoomed out was tens of thousands of rectangles at every
// move of the pointer, and drawing lagged behind the hand. A square that is no whole number of
// pixels has no tile, and is drawn as it was.
export function drawChecker(context, { width, height }, square) {
  const colors = [cssVar('--checker-a'), cssVar('--checker-b')];

  if (!Number.isInteger(square)) {
    squareBySquare(context, { width, height }, square, colors);

    return;
  }

  context.save();
  context.imageSmoothingEnabled = false;
  context.fillStyle = context.createPattern(tileOf(square, colors), 'repeat');
  context.fillRect(0, 0, width, height);
  context.restore();
}
