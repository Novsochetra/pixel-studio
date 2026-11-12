import { node, replace } from './dom.js';
import { currentFrames, currentLayer, directionSprite } from './actions.js';
import { viewName } from '../model/kinds.js';
import { bounds, colorCounts, getPixel, toHex } from '../model/sprite.js';
import { openCanvasSizeSheet } from './canvas-size-sheet.js';
import { hasKeyboard } from './platform-keys.js';

// the view, frame and layer being edited, in words
export function placeText(state) {
  const frames = currentFrames(state).length;
  const frame = Math.min(state.at.frame, frames - 1) + 1;

  return `${viewName(state.project, state.at.direction)} · frame ${frame} of ${frames} · ${currentLayer(state).name}`;
}

// read as it is said, not when the pointer last moved: after a click it named the colour that
// had been there
function colourUnder(state, { x, y }) {
  const color = getPixel(currentLayer(state).sprite, x, y);

  return color ? toHex(color) : 'transparent';
}

// where you are, what the art measures, and what is under the pointer
const coloursSaid = (count) => `${count} colour${count === 1 ? '' : 's'}`;

export function renderStatus(el, app) {
  const { state } = app.store;
  const sprite = directionSprite(state, state.at.direction);
  const box = bounds(sprite);
  const cursor = state.cursor;

  replace(
    el,
    node('span', {}, placeText(state)),
    node(
      'span',
      {},
      node(
        'button.status-link',
        // named, so the keys come back to it from the window it opens: the bar is drawn again
        // meanwhile
        {
          id: 'canvas-size-link',
          title: 'Change the canvas size',
          onclick: () => openCanvasSizeSheet(app),
        },
        `${sprite.width}×${sprite.height} canvas`,
      ),
    ),
    node(
      'span',
      {},
      box
        ? `sprite ${box.right - box.left}×${box.bottom - box.top}, rows ${box.top}–${box.bottom - 1}`
        : 'empty',
    ),
    node('span', {}, coloursSaid(colorCounts(sprite).length)),
    node('span', {}, cursor ? `x ${cursor.x}, y ${cursor.y} · ${colourUnder(state, cursor)}` : ''),
    hasKeyboard() ? node('span.status-help', {}, 'Press ? for shortcuts') : null,
  );
}
