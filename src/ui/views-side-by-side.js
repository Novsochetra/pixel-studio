import { cssVar, drawGuide, drawSprite } from './draw.js';
import { drawChecker } from './checker.js';
import { currentAnimation, directionSprite, directionsInUse } from './actions.js';
import { nearestDrawn } from '../model/nearest-drawn.js';
import { checkerPainter } from '../io/images.js';
import { viewName } from '../model/kinds.js';
import { applyMapping } from '../palette/palette.js';
import { VIEW_FILTERS } from '../views/filters.js';

const CAPTION = 30;
const GAP = 16;

// one view's column: its art on the checkerboard, under the guides
function drawView(context, state, view) {
  const { direction, scale, options } = view;
  const { width, height } = state.project.canvas;
  const sprite = directionSprite(state, direction, view.frame);
  const filter = VIEW_FILTERS[state.viewFilter ?? 'colour'];

  // files and the AI's reference sheet keep the original's green checkerboard; the screen uses
  // the app's own quiet one
  if (options.onScreen) {
    drawChecker(context, { width: width * scale, height: height * scale }, scale * 4);
  } else {
    checkerPainter(scale * 2)(context, width * scale, height * scale);
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
}

// A preview of a swap or a kit shows a view with nothing in the frame being edited at its
// nearest drawn frame, and says which: blank, it looked as if the kit had wiped that view.
function frameShown(state, direction, options) {
  const here = state.at.frame ?? 0;
  const frames = currentAnimation(state).directions[direction]?.frames ?? [];

  return options.nearest ? (nearestDrawn(frames, here) ?? here) : here;
}

function caption(state, direction, frame) {
  const name = viewName(state.project, direction).toUpperCase();

  return frame === (state.at.frame ?? 0) ? name : `${name} · FRAME ${frame + 1}`;
}

// Every view of the current animation side by side, with the guide lines across all of them.
// options: { mapping: colours to show swapped, onScreen: for a window, not a file, nearest: a
// view's nearest drawn frame where the one being edited is empty }
export function viewsSideBySide(state, scale, options = {}) {
  const directions = directionsInUse(state);
  const { width, height } = state.project.canvas;
  const canvas = document.createElement('canvas');

  // a picture, named for someone who cannot see it
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'The views side by side');
  canvas.width = directions.length * width * scale + (directions.length - 1) * GAP;
  canvas.height = height * scale + CAPTION;
  const context = canvas.getContext('2d');
  context.fillStyle = cssVar('--stage');
  context.fillRect(0, 0, canvas.width, canvas.height);

  const captions = [];

  directions.forEach((direction, i) => {
    const x = i * (width * scale + GAP);
    const frame = frameShown(state, direction, options);

    captions.push(caption(state, direction, frame).toLowerCase());

    context.save();
    context.translate(x, CAPTION);
    drawView(context, state, { direction, frame, scale, options, first: i === 0 });
    context.restore();
    context.font = '700 16px Silkscreen, ui-monospace, monospace';
    context.fillStyle = cssVar('--label');
    context.fillText(caption(state, direction, frame), x, 18, width * scale);
  });

  // what each view shows is drawn on the picture: said to someone who cannot see it too
  canvas.setAttribute('aria-label', `The views side by side: ${captions.join(', ')}`);

  return canvas;
}

// The views for a dialog: the biggest whole zoom that fits `room` px across (pixels stay square
// and sharp), never stretched past it.
export function viewsToFit(state, room, options = {}) {
  const count = directionsInUse(state).length;
  const scale = Math.max(
    1,
    Math.min(6, Math.floor((room - (count - 1) * GAP) / (count * state.project.canvas.width))),
  );
  const canvas = viewsSideBySide(state, scale, options);

  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';
  canvas.style.imageRendering = 'pixelated';

  return canvas;
}
