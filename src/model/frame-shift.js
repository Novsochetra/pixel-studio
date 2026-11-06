import { bounds, createSprite, unionBounds } from './sprite.js';

function artBox(frame) {
  return unionBounds(
    frame.layers
      .filter((layer) => layer.kind !== 'reference' && layer.sprite)
      .map((layer) => bounds(layer.sprite)),
  );
}

// Art never falls off the canvas, so a move stops at the edge. A picture to trace may go off, as
// it never ships.
export function clampShift(frame, { width, height }, [dx, dy]) {
  const box = artBox(frame);

  if (!box) {
    return [dx, dy];
  }

  return [
    Math.max(-box.left, Math.min(width - box.right, dx)),
    Math.max(-box.top, Math.min(height - box.bottom, dy)),
  ];
}

function shifted(sprite, [dx, dy]) {
  const out = createSprite(sprite.width, sprite.height);
  const start = Math.max(0, -dx);
  const end = Math.min(sprite.width, sprite.width - dx);

  for (let y = Math.max(0, -dy); y < Math.min(sprite.height, sprite.height - dy); y++) {
    const row = y * sprite.width;
    const target = ((y + dy) * sprite.width + start + dx) * 4;

    out.pixels.set(sprite.pixels.subarray((row + start) * 4, (row + end) * 4), target);
  }

  return out;
}

// every layer and pin of the frame moves together
export function shiftFrame(frame, [dx, dy]) {
  for (const layer of frame.layers) {
    if (layer.sprite) {
      layer.sprite = shifted(layer.sprite, [dx, dy]);
    }

    // the Body moves as a whole, so its next pose is drawn where it now stands
    if (layer.pose) {
      layer.pose = { ...layer.pose, x: layer.pose.x + dx, y: layer.pose.y + dy };
    }
  }

  frame.marks = frame.marks?.map((mark) => ({ ...mark, x: mark.x + dx, y: mark.y + dy }));
}
