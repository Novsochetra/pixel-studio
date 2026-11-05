import { bounds, createSprite } from './sprite.js';

// Moving a whole frame: every layer together, with its pins. Art never falls off the canvas, so a
// move stops at the edge. A picture to trace may go off, as it never ships.
export function clampShift(frame, width, height, dx, dy) {
  const boxes = frame.layers.filter((layer) => layer.kind !== 'reference' && layer.sprite).map((layer) => bounds(layer.sprite)).filter(Boolean);

  if (!boxes.length) {
    return [dx, dy];
  }

  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.right));
  const bottom = Math.max(...boxes.map((box) => box.bottom));

  return [Math.max(-left, Math.min(width - right, dx)), Math.max(-top, Math.min(height - bottom, dy))];
}

function shifted(sprite, dx, dy) {
  const out = createSprite(sprite.width, sprite.height);

  for (let y = Math.max(0, -dy); y < Math.min(sprite.height, sprite.height - dy); y++) {
    const from = y * sprite.width;
    const start = Math.max(0, -dx);
    const end = Math.min(sprite.width, sprite.width - dx);
    out.pixels.set(sprite.pixels.subarray((from + start) * 4, (from + end) * 4), ((y + dy) * sprite.width + start + dx) * 4);
  }

  return out;
}

export function shiftFrame(frame, dx, dy) {
  for (const layer of frame.layers) {
    if (layer.sprite) {
      layer.sprite = shifted(layer.sprite, dx, dy);
    }
  }

  frame.marks = frame.marks?.map((mark) => ({ ...mark, x: mark.x + dx, y: mark.y + dy }));
}
