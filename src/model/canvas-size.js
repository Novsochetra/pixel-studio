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

// a view's cut on the new canvas: every part's art and pivot move with the rest of the art
function movedRig(rig, [dx, dy]) {
  return {
    ...rig,
    pieces: rig.pieces.map((piece) => ({
      ...piece,
      pivot: { x: piece.pivot.x + dx, y: piece.pivot.y + dy },
      art: { ...piece.art, x: piece.art.x + dx, y: piece.art.y + dy },
    })),
  };
}

// Animations share their views' cuts, one object each: each is moved once, and stays shared.
function rigMover(shift) {
  const moved = new Map();

  return (rig) => {
    if (rig && !moved.has(rig)) {
      moved.set(rig, movedRig(rig, shift));
    }

    return rig ? moved.get(rig) : rig;
  };
}

function placeLayer(layer, rig, { canvas, shift }) {
  if (layer.sprite) {
    layer.sprite = placedSprite(layer.sprite, canvas, shift);
  }

  // a posed Body is drawn again from its moved parts, so a part that was off the old canvas
  // shows, and the next pose made from the cut lines up with this one
  if (isPosedBody(layer) && rig) {
    poseBody(layer, { rig, pose: layer.pose, canvas });
  }
}

function placeFrame(frame, rig, place) {
  const [dx, dy] = place.shift;

  frame.layers.forEach((layer) => placeLayer(layer, rig, place));
  frame.marks = frame.marks?.map((mark) => ({ ...mark, x: mark.x + dx, y: mark.y + dy }));
}

// the marks and notes drawn on the Views board are in art pixels, so they move with the art
function movedMarkup(markup, [dx, dy]) {
  if (!markup) {
    return markup;
  }

  return {
    ...markup,
    strokes: markup.strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map(([x, y]) => [x + dx, y + dy]),
    })),
    notes: markup.notes.map((note) => ({ ...note, x: note.x + dx, y: note.y + dy })),
  };
}

// A copy of the project on a canvas of another size: every layer, pin and guide line moves with
// the art, which stays put at the anchor. The project given is left as it was.
export function withCanvasSize(project, size, anchor) {
  const next = structuredClone(project);
  const canvas = { ...project.canvas, width: size.width, height: size.height };
  const shift = canvasShift(project.canvas, canvas, anchor);

  const moveRig = rigMover(shift);

  for (const animation of next.animations) {
    for (const entry of Object.values(animation.directions)) {
      if (entry.rig) {
        entry.rig = moveRig(entry.rig);
      }

      entry.frames.forEach((frame) => placeFrame(frame, entry.rig, { canvas, shift }));
    }
  }

  next.canvas = canvas;
  next.markup = movedMarkup(next.markup, shift);
  // a line the smaller canvas has no row for stands at its nearest edge, where it can be moved
  next.guides = (next.guides ?? []).map((guide) => ({
    ...guide,
    row: Math.max(0, Math.min(canvas.height - 1, guide.row + shift[1])),
  }));

  return next;
}
