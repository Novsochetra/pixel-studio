import { CLEAR, getPixel, setPixel } from '../model/sprite.js';
import { clearSelected, stampPixels } from './selection.js';

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

export function moveFloating(sprite, selection, dx, dy) {
  const { piece, under } = selection.floating;

  under.forEach(({ x, y, color }) => setPixel(sprite, x, y, color));

  return floatPiece(
    sprite,
    piece.map((pixel) => ({ ...pixel, x: pixel.x + dx, y: pixel.y + dy })),
  );
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
