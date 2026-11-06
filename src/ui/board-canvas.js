import { cssVar, drawChecker, drawGuide, drawSprite } from './draw.js';
import { directionSprite, directionsInUse } from './actions.js';
import { drawMarks } from './markup.js';
import { checkerPainter } from '../io/images.js';
import { viewName } from '../model/kinds.js';
import { applyMapping } from '../palette/palette.js';
import { VIEW_FILTERS } from '../views/filters.js';

export const CAPTION = 30;

export const GAP = 16;

// one view's column: its art (and the overlay) on the checkerboard, the guides, the marks
function drawView(context, state, view) {
  const { direction, scale, ghost, options } = view;
  const { width, height } = state.project.canvas;
  const sprite = directionSprite(state, direction);
  const filter = VIEW_FILTERS[state.viewFilter ?? 'colour'];

  // files and the AI's reference sheet keep the original's green checkerboard; the screen uses
  // the app's own quiet one
  if (options.onScreen) {
    drawChecker(context, { width: width * scale, height: height * scale }, scale * 4);
  } else {
    checkerPainter(scale * 2)(context, width * scale, height * scale);
  }

  if (ghost && direction !== options.overlay.direction) {
    drawSprite(context, ghost, scale, options.overlay.opacity);
  }

  if (sprite) {
    drawSprite(
      context,
      filter(options.mapping ? applyMapping(sprite, options.mapping) : sprite),
      scale,
    );
  }

  state.project.guides.forEach((guide) =>
    drawGuide(context, guide, { width: width * scale, scale, label: view.first }),
  );

  if (options.marks) {
    drawMarks(context, state.project, direction, scale);
  }
}

// Every view of the current animation side by side, with the guide lines
// across all of them, your marks and, optionally, one view laid see-through over the others.
export function boardCanvas(state, scale, overrides = {}) {
  const options = {
    overlay: state.overlay,
    mapping: state.swapPreview,
    marks: true,
    onScreen: false,
    ...overrides,
  };
  const directions = directionsInUse(state);
  const { width, height } = state.project.canvas;
  const canvas = document.createElement('canvas');

  canvas.width = directions.length * width * scale + (directions.length - 1) * GAP;
  canvas.height = height * scale + CAPTION;
  const context = canvas.getContext('2d');
  context.fillStyle = cssVar('--stage');
  context.fillRect(0, 0, canvas.width, canvas.height);
  const ghost = options.overlay?.direction
    ? directionSprite(state, options.overlay.direction)
    : null;

  directions.forEach((direction, i) => {
    const x = i * (width * scale + GAP);

    context.save();
    context.translate(x, CAPTION);
    drawView(context, state, { direction, scale, ghost, options, first: i === 0 });
    context.restore();
    context.font = '700 16px Silkscreen, ui-monospace, monospace';
    context.fillStyle = cssVar('--label');
    context.fillText(viewName(state.project, direction).toUpperCase(), x, 18);
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
