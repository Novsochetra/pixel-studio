import {
  CLEAR,
  cloneSprite,
  createSprite,
  getPixel,
  pack,
  samePixels,
  setPixel,
} from '../model/sprite.js';
import { turnAbout } from '../model/body/affine.js';
import { drawPiece } from '../model/body/place.js';
import { clearSelected, selectionBox } from './selection.js';

const SHAPE = pack(255, 255, 255);

function cutOut(selection, box, colourAt) {
  const sprite = createSprite(box.right - box.left + 1, box.bottom - box.top + 1);

  selection.cells.forEach((on, i) => {
    if (on) {
      const [x, y] = [i % selection.width, Math.floor(i / selection.width)];

      setPixel(sprite, x - box.left, y - box.top, colourAt(x, y));
    }
  });

  return { x: box.left, y: box.top, sprite };
}

// The art without the selection, and the selection's own colours. A piece floating over the art
// is turned as the piece it is: taken from the sprite, it took what lay under it along.
function lifted(sprite, selection) {
  const base = cloneSprite(sprite);
  const { floating } = selection;

  if (!floating) {
    clearSelected(base, selection);

    return { base, colourAt: (x, y) => getPixel(sprite, x, y) };
  }

  const colours = new Map(floating.piece.map(({ x, y, color }) => [`${x},${y}`, color]));

  floating.under.forEach(({ x, y, color }) => setPixel(base, x, y, color));

  return { base, colourAt: (x, y) => colours.get(`${x},${y}`) ?? CLEAR };
}

// Each turn is drawn from the first pixels: turned pixels turned again would wear away.
export function startTurn(sprite, selection) {
  const box = selectionBox(selection);

  if (!box) {
    return null;
  }

  const { base, colourAt } = lifted(sprite, selection);

  return {
    base,
    box,
    art: cutOut(selection, box, colourAt),
    shape: cutOut(selection, box, () => SHAPE),
    centre: { x: (box.left + box.right + 1) / 2, y: (box.top + box.bottom + 1) / 2 },
    angle: 0,
  };
}

// A box holding clear pixels turns as a box, so the shape is turned as well as the art. The art
// is counted too, as RotSprite may round the two differently.
function turnedCells(sprite, turn, matrix) {
  const shape = createSprite(sprite.width, sprite.height);

  drawPiece(shape, turn.shape, matrix);

  return new Uint8Array(sprite.width * sprite.height).map((_, i) => {
    const [x, y] = [i % sprite.width, Math.floor(i / sprite.width)];
    const moved = getPixel(sprite, x, y) !== getPixel(turn.base, x, y);

    return moved || getPixel(shape, x, y) !== CLEAR ? 1 : 0;
  });
}

// what is turned floats over the art it was lifted from: moved on, it leaves that art whole
function floatingOf(sprite, turn, { cells, matrix }) {
  const art = createSprite(sprite.width, sprite.height);
  const [piece, under] = [[], []];

  drawPiece(art, turn.art, matrix);
  cells.forEach((on, i) => {
    if (on) {
      const [x, y] = [i % sprite.width, Math.floor(i / sprite.width)];

      piece.push({ x, y, color: getPixel(art, x, y) });
      under.push({ x, y, color: getPixel(turn.base, x, y) });
    }
  });

  return { piece, under };
}

export function applyTurn(sprite, turn, angle) {
  const matrix = turnAbout(turn.centre, angle);

  sprite.pixels.set(turn.base.pixels);
  drawPiece(sprite, turn.art, matrix);

  const cells = turnedCells(sprite, turn, matrix);

  return {
    width: sprite.width,
    height: sprite.height,
    cells,
    turn: { ...turn, angle, shown: cloneSprite(sprite) },
    floating: floatingOf(sprite, turn, { cells, matrix }),
  };
}

// a turn goes on only over the pixels it left: an edit, an undo or another frame ends it
export function liveTurn(selection, sprite) {
  const turn = selection?.turn;

  return turn && samePixels(turn.shown, sprite) ? turn : null;
}

const inside = (value, size) => Math.max(0.5, Math.min(size - 0.5, value));

// near an edge the handle stays on the canvas, or it could not be reached
export function handleAround(box, angle, { canvas, gap }) {
  const centre = [(box.left + box.right + 1) / 2, (box.top + box.bottom + 1) / 2];
  const radians = (angle * Math.PI) / 180;
  const edge = (box.bottom - box.top + 1) / 2;
  const along = (reach) => [
    centre[0] + Math.sin(radians) * reach,
    centre[1] - Math.cos(radians) * reach,
  ];
  const [knobX, knobY] = along(edge + gap);

  return {
    centre,
    root: along(edge),
    knob: [inside(knobX, canvas.width), inside(knobY, canvas.height)],
  };
}

export function turnHandle(selection, sprite, gap) {
  const turn = liveTurn(selection, sprite);
  const box = turn?.box ?? selectionBox(selection);

  return box ? handleAround(box, turn?.angle ?? 0, { canvas: sprite, gap }) : null;
}
