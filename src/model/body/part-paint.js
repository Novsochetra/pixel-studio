import { CLEAR, bounds, createSprite, getPixel, setPixel } from '../sprite.js';
import { applyTo, invert } from './affine.js';
import { bodyOf, isPosedBody } from './body-kind.js';
import { decodeArt, encodeArt } from './piece-art.js';

// Drawn into the part's art, not the frame's pixels, so the part keeps it in every frame and turn.

export function changedPixels(before, after) {
  const changes = [];

  for (let y = 0; y < after.height; y++) {
    for (let x = 0; x < after.width; x++) {
      const colour = getPixel(after, x, y);

      if (colour !== getPixel(before, x, y)) {
        changes.push({ x, y, colour });
      }
    }
  }

  return changes;
}

const wholeCell = (point) => point.map(Math.floor);

function cellsBox(cells) {
  const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };

  for (const { x, y } of cells) {
    box.left = Math.min(box.left, x);
    box.top = Math.min(box.top, y);
    box.right = Math.max(box.right, x + 1);
    box.bottom = Math.max(box.bottom, y + 1);
  }

  return box;
}

// A turned grid does not line up with the canvas's. The cell under each drawn pixel makes the pixel
// show at this turn; each cell whose middle lies in a drawn pixel leaves no pinholes at other turns.
function paintedCells(matrix, changes) {
  const back = invert(matrix);
  const colours = new Map(changes.map(({ x, y, colour }) => [`${x},${y}`, colour]));
  const cells = new Map();

  for (const { x, y, colour } of changes) {
    const [cellX, cellY] = wholeCell(applyTo(back, [x + 0.5, y + 0.5]));

    cells.set(`${cellX},${cellY}`, { x: cellX, y: cellY, colour });
  }

  const box = cellsBox(cells.values());

  for (let y = box.top - 1; y <= box.bottom; y++) {
    for (let x = box.left - 1; x <= box.right; x++) {
      const [canvasX, canvasY] = wholeCell(applyTo(matrix, [x + 0.5, y + 0.5]));
      const colour = colours.get(`${canvasX},${canvasY}`);

      if (colour !== undefined) {
        cells.set(`${x},${y}`, { x, y, colour });
      }
    }
  }

  return [...cells.values()];
}

function trimmed(sprite, { x, y }) {
  const box = bounds(sprite);

  if (!box) {
    return encodeArt(createSprite(1, 1), { x, y });
  }

  const out = createSprite(box.right - box.left, box.bottom - box.top);

  for (let row = 0; row < out.height; row++) {
    for (let column = 0; column < out.width; column++) {
      setPixel(out, column, row, getPixel(sprite, box.left + column, box.top + row));
    }
  }

  return encodeArt(out, { x: x + box.left, y: y + box.top });
}

export function paintedArt(art, matrix, changes) {
  const { x, y, sprite } = decodeArt(art);
  const cells = paintedCells(matrix, changes);
  const drawn = cells.filter(({ colour }) => colour !== CLEAR);
  const box = cellsBox([{ x, y }, { x: x + sprite.width - 1, y: y + sprite.height - 1 }, ...drawn]);
  const out = createSprite(box.right - box.left, box.bottom - box.top);

  for (let row = 0; row < sprite.height; row++) {
    for (let column = 0; column < sprite.width; column++) {
      setPixel(out, x - box.left + column, y - box.top + row, getPixel(sprite, column, row));
    }
  }

  cells.forEach((cell) => setPixel(out, cell.x - box.left, cell.y - box.top, cell.colour));

  return trimmed(out, { x: box.left, y: box.top });
}

export function withPieceArt(rig, id, art) {
  return {
    ...rig,
    pieces: rig.pieces.map((piece) => (piece.id === id ? { ...piece, art } : piece)),
  };
}

// an animation copied from another shares its cut, the one object
export function usesOfRig(project, rig) {
  return project.animations.flatMap((animation) =>
    Object.entries(animation.directions)
      .filter(([, entry]) => entry.rig === rig)
      .map(([direction, entry]) => ({ animation: animation.id, direction, entry })),
  );
}

export function posedBodies(uses) {
  return uses.flatMap(({ entry }) => entry.frames.map(bodyOf).filter(isPosedBody));
}
