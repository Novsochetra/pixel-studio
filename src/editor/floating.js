import { CLEAR, getPixel, setPixel } from '../model/sprite.js';
import {
  clearSelected,
  liftPixels,
  selectionBox,
  stampPixels,
  transformPixels,
} from './selection.js';

const inside = (sprite, { x, y }) => x >= 0 && y >= 0 && x < sprite.width && y < sprite.height;

// A pasted piece floats over the art: the selection it makes remembers the piece and what the
// sprite had under it, so moving the piece puts that back and takes nothing else along. Without
// it a paste on top of its own original could not make a copy, and a move tore out whatever lay
// under the piece's clear corners.
export function floatPiece(sprite, piece) {
  const under = piece
    .filter((pixel) => inside(sprite, pixel))
    .map(({ x, y }) => ({ x, y, color: getPixel(sprite, x, y) }));

  return { ...stampPixels(sprite, piece, 0, 0), floating: { piece, under } };
}

// A piece copied from a larger canvas may lie outside this one, where it could not be seen or
// dragged: it is put in the middle. One that is inside, even in part of it, stays where it was.
export function pieceOnCanvas(piece, { width, height }) {
  if (piece.some((pixel) => inside({ width, height }, pixel))) {
    return piece;
  }

  const [xs, ys] = [piece.map(({ x }) => x), piece.map(({ y }) => y)];
  const [left, top] = [Math.min(...xs), Math.min(...ys)];
  const dx = Math.floor((width - (Math.max(...xs) - left + 1)) / 2) - left;
  const dy = Math.floor((height - (Math.max(...ys) - top + 1)) / 2) - top;

  return piece.map((pixel) => ({ ...pixel, x: pixel.x + dx, y: pixel.y + dy }));
}

export function moveFloating(sprite, selection, dx, dy) {
  const { piece, under } = selection.floating;

  under.forEach(({ x, y, color }) => setPixel(sprite, x, y, color));

  return floatPiece(
    sprite,
    piece.map((pixel) => ({ ...pixel, x: pixel.x + dx, y: pixel.y + dy })),
  );
}

// A selection that is moved or flipped is lifted off the art first, and floats from then on:
// what it passes over is put back behind it. Stamped down at each arrow key, it rubbed out
// everything on its way, and a pasted piece flipped tore a hole in what it lay on.
export function asFloating(sprite, selection) {
  if (selection.floating) {
    return selection;
  }

  const piece = liftPixels(sprite, selection);

  clearSelected(sprite, selection);

  return floatPiece(sprite, piece);
}

// lifted pixels stay on the canvas at their first move; a piece already floating may hang over
// its edge, as none of it is lost there
export function moveLifted(sprite, selection, [dx, dy]) {
  const lifted = asFloating(sprite, selection);
  const shift = selection.floating
    ? [dx, dy]
    : shiftOnCanvas(lifted.floating.piece, sprite, [dx, dy]);

  return moveFloating(sprite, lifted, ...shift);
}

export function flipSelection(sprite, selection, kind) {
  const box = selectionBox(selection);

  if (!box) {
    return selection;
  }

  const { piece, under } = asFloating(sprite, selection).floating;

  under.forEach(({ x, y, color }) => setPixel(sprite, x, y, color));

  return floatPiece(sprite, transformPixels(piece, kind, box));
}

// The selected pixels taken away. A floating piece goes, and what lay under it is back; any other
// selection leaves clear pixels behind.
export function eraseSelection(sprite, selection) {
  if (selection.floating) {
    selection.floating.under.forEach(({ x, y, color }) => setPixel(sprite, x, y, color));
  } else {
    clearSelected(sprite, selection);
  }
}

// How far lifted pixels may move without any of their art leaving the canvas: a nudge past the
// edge and back would otherwise have rubbed it out.
export function shiftOnCanvas(pixels, { width, height }, [dx, dy]) {
  const art = pixels.filter(({ color }) => color !== CLEAR);

  if (!art.length) {
    return [dx, dy];
  }

  const xs = art.map(({ x }) => x);
  const ys = art.map(({ y }) => y);
  const within = (shift, low, high) => Math.max(low, Math.min(high, shift));

  return [
    within(dx, -Math.min(...xs), width - 1 - Math.max(...xs)),
    within(dy, -Math.min(...ys), height - 1 - Math.max(...ys)),
  ];
}

// A floating piece painted on takes what was painted: its own copy, put back at the next move,
// threw strokes, an eraser's work and a swap's colours away. A clear cell of the piece, where
// the art under it shows, takes a colour only where it now differs from that art.
export function refloat(sprite, selection) {
  const { piece, under } = selection?.floating ?? {};

  if (!piece) {
    return selection;
  }

  const was = new Map(under.map(({ x, y, color }) => [`${x},${y}`, color]));
  let changed = false;
  const now = piece.map((pixel) => {
    const color = inside(sprite, pixel) ? getPixel(sprite, pixel.x, pixel.y) : pixel.color;
    const shows = pixel.color === CLEAR && color === was.get(`${pixel.x},${pixel.y}`);
    const kept = shows ? CLEAR : color;

    changed ||= kept !== pixel.color;

    return kept === pixel.color ? pixel : { ...pixel, color: kept };
  });

  return changed ? { ...selection, floating: { piece: now, under } } : selection;
}
