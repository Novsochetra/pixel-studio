import { bounds, createSprite, unionBounds } from './sprite.js';

// A picture to trace may go off the canvas, as it never ships.
const staysOnCanvas = (layer) => layer.kind !== 'reference' && layer.sprite;

function artBox(layers) {
  return unionBounds(layers.filter(staysOnCanvas).map((layer) => bounds(layer.sprite)));
}

// Art never falls off the canvas, so a move stops at the edge.
function clampToCanvas(box, { width, height }, [dx, dy]) {
  if (!box) {
    return [dx, dy];
  }

  return [
    Math.max(-box.left, Math.min(width - box.right, dx)),
    Math.max(-box.top, Math.min(height - box.bottom, dy)),
  ];
}

export function clampShift(frame, canvas, shift) {
  return clampToCanvas(artBox(frame.layers), canvas, shift);
}

export function clampLayerShift(layer, canvas, shift) {
  return clampToCanvas(artBox([layer]), canvas, shift);
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

export function shiftLayer(layer, [dx, dy]) {
  if (layer.sprite) {
    layer.sprite = shifted(layer.sprite, [dx, dy]);
  }

  // the Body moves as a whole, so its next pose is drawn where it now stands
  if (layer.pose) {
    layer.pose = { ...layer.pose, x: layer.pose.x + dx, y: layer.pose.y + dy };
  }
}

// every layer and pin of the frame moves together
export function shiftFrame(frame, [dx, dy]) {
  frame.layers.forEach((layer) => shiftLayer(layer, [dx, dy]));
  frame.marks = frame.marks?.map((mark) => ({ ...mark, x: mark.x + dx, y: mark.y + dy }));
}
