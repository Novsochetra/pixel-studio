import { cssVar, drawGuide, drawSprite } from './draw.js';
import { directionSprite, directionsInUse } from './actions.js';
import { drawMarks } from './markup.js';
import { checkerPainter } from '../io/images.js';
import { directionLabel } from '../model/project.js';
import { applyMapping } from '../palette/palette.js';
import { VIEW_FILTERS } from '../views/filters.js';

export const CAPTION = 30;

export const GAP = 16;

// Every view of the current animation side by side on the green checkerboard, with the guide
// lines across all of them, your marks and, optionally, one view laid see-through over the others.
export function boardCanvas(
  state,
  scale,
  { overlay = state.overlay, mapping = state.swapPreview, marks = true } = {},
) {
  const directions = directionsInUse(state);
  const { width, height } = state.project.canvas;
  const canvas = document.createElement('canvas');
  canvas.width = directions.length * width * scale + (directions.length - 1) * GAP;
  canvas.height = height * scale + CAPTION;
  const context = canvas.getContext('2d');
  context.fillStyle = cssVar('--stage') || '#2a2a2d';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const ghost = overlay?.direction ? directionSprite(state, overlay.direction) : null;

  directions.forEach((direction, i) => {
    const x = i * (width * scale + GAP);
    const sprite = directionSprite(state, direction);
    context.save();
    context.translate(x, CAPTION);
    checkerPainter(scale * 2)(context, width * scale, height * scale);

    if (ghost && direction !== overlay.direction) {
      drawSprite(context, ghost, 0, 0, scale, overlay.opacity);
    }

    if (sprite) {
      drawSprite(
        context,
        VIEW_FILTERS[state.viewFilter ?? 'colour'](
          mapping ? applyMapping(sprite, mapping) : sprite,
        ),
        0,
        0,
        scale,
      );
    }

    state.project.guides.forEach((guide) =>
      drawGuide(context, guide, 0, 0, width * scale, scale, i === 0),
    );

    if (marks) {
      drawMarks(context, state.project, direction, scale);
    }

    context.restore();
    context.font = '700 11px Silkscreen, ui-monospace, monospace';
    context.fillStyle = cssVar('--label') || '#ffffff';
    context.fillText(directionLabel(direction).toUpperCase(), x, 18);
  });

  return canvas;
}

// which view and art pixel a point on the board falls on, or null in a gap or the captions
export function boardPoint(state, scale, canvas, event) {
  const box = canvas.getBoundingClientRect();
  const px = ((event.clientX - box.left) / box.width) * canvas.width;
  const py = ((event.clientY - box.top) / box.height) * canvas.height;
  const { width, height } = state.project.canvas;
  const index = Math.floor(px / (width * scale + GAP));
  const x = Math.floor((px - index * (width * scale + GAP)) / scale);
  const y = Math.floor((py - CAPTION) / scale);
  const direction = directionsInUse(state)[index];

  return direction && x >= 0 && x < width && y >= 0 && y < height ? { direction, x, y } : null;
}

// The board for a dialog: the biggest whole zoom that fits `room` px across (pixels stay square
// and sharp), never stretched past it.
export function boardPreview(state, room, options = {}) {
  const count = directionsInUse(state).length;
  const scale = Math.max(
    1,
    Math.min(6, Math.floor((room - (count - 1) * GAP) / (count * state.project.canvas.width))),
  );
  const canvas = boardCanvas(state, scale, options);
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';
  canvas.style.imageRendering = 'pixelated';

  return canvas;
}
