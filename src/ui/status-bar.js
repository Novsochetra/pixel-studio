import { node, replace } from './dom.js';
import { currentFrames, currentLayer, directionSprite } from './actions.js';
import { viewName } from '../model/kinds.js';
import { bounds, colorCounts } from '../model/sprite.js';
import { openCanvasSizeSheet } from './canvas-size-sheet.js';
import { hasKeyboard } from './platform-keys.js';

// the view, frame and layer being edited, in words
export function placeText(state) {
  const frames = currentFrames(state).length;
  const frame = Math.min(state.at.frame, frames - 1) + 1;

  return `${viewName(state.project, state.at.direction)} · frame ${frame} of ${frames} · ${currentLayer(state).name}`;
}

// where you are, what the art measures, and what is under the pointer
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
        { title: 'Change the canvas size', onclick: () => openCanvasSizeSheet(app) },
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
    node('span', {}, `${colorCounts(sprite).length} colours`),
    node('span', {}, cursor ? `x ${cursor.x}, y ${cursor.y} · ${cursor.color}` : ''),
    hasKeyboard() ? node('span.status-help', {}, 'Press ? for shortcuts') : null,
  );
}
