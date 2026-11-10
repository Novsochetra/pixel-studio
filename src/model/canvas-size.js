import { createSprite } from './sprite.js';
import { poseBody } from './body/body.js';
import { isPosedBody } from './body/body-kind.js';

export const CANVAS_LIMITS = { min: 8, max: 512 };

// Where the art stays put when the canvas grows or shrinks: 0, 0.5 or 1 of the way across and
// down. { x: 0.5, y: 1 } keeps the feet where they stand and adds room above and at both sides.
export function canvasShift(from, to, anchor) {
  return [
    Math.round((to.width - from.width) * anchor.x),
    Math.round((to.height - from.height) * anchor.y),
  ];
}

// the sprite on a canvas of another size, moved by [dx, dy]; what falls outside is cut off
export function placedSprite(sprite, { width, height }, [dx, dy]) {
  const out = createSprite(width, height);
  const left = Math.max(0, -dx);
  const right = Math.min(sprite.width, width - dx);

  for (let y = Math.max(0, -dy); y < Math.min(sprite.height, height - dy) && left < right; y++) {
    const row = sprite.pixels.subarray(
      (y * sprite.width + left) * 4,
      (y * sprite.width + right) * 4,
    );

    out.pixels.set(row, ((y + dy) * width + left + dx) * 4);
  }

  return out;
}

function placeLayer(layer, rig, { canvas, shift }) {
  if (layer.sprite) {
    layer.sprite = placedSprite(layer.sprite, canvas, shift);
  }

  // a posed Body is drawn again from its parts, so a part that was off the old canvas shows
  if (isPosedBody(layer) && rig) {
    const pose = { ...layer.pose, x: layer.pose.x + shift[0], y: layer.pose.y + shift[1] };

    poseBody(layer, { rig, pose, canvas });
  }
}

function placeFrame(frame, rig, place) {
  const [dx, dy] = place.shift;

  frame.layers.forEach((layer) => placeLayer(layer, rig, place));
  frame.marks = frame.marks?.map((mark) => ({ ...mark, x: mark.x + dx, y: mark.y + dy }));
}

// A copy of the project on a canvas of another size: every layer, pin and guide line moves with
// the art, which stays put at the anchor. The project given is left as it was.
export function withCanvasSize(project, size, anchor) {
  const next = structuredClone(project);
  const canvas = { ...project.canvas, width: size.width, height: size.height };
  const shift = canvasShift(project.canvas, canvas, anchor);

  for (const animation of next.animations) {
    for (const entry of Object.values(animation.directions)) {
      entry.frames.forEach((frame) => placeFrame(frame, entry.rig, { canvas, shift }));
    }
  }

  next.canvas = canvas;
  next.guides = (next.guides ?? []).map((guide) => ({ ...guide, row: guide.row + shift[1] }));

  return next;
}
