import { node, replace } from './dom.js';
import { currentFrames, currentLayer, directionSprite } from './actions.js';
import { viewName } from '../model/kinds.js';
import { bounds, colorCounts } from '../model/sprite.js';

const HELP =
  'Alt-click picks a colour · ⌘Z undo · B E I G R S W tools · M symmetry · , . frames · arrows nudge a selection';

// where you are, what the art measures, and what is under the pointer
export function renderStatus(el, app) {
  const { state } = app.store;
  const sprite = directionSprite(state, state.at.direction);
  const box = bounds(sprite);
  const cursor = state.cursor;
  const frames = currentFrames(state).length;
  const frame = Math.min(state.at.frame, frames - 1) + 1;

  replace(
    el,
    node(
      'span',
      {},
      `${viewName(state.project, state.at.direction)} · frame ${frame} of ${frames} · ${currentLayer(state).name}`,
    ),
    node('span', {}, `${sprite.width}×${sprite.height} canvas`),
    node(
      'span',
      {},
      box
        ? `sprite ${box.right - box.left}×${box.bottom - box.top}, rows ${box.top}–${box.bottom - 1}`
        : 'empty',
    ),
    node('span', {}, `${colorCounts(sprite).length} colours`),
    node('span', {}, cursor ? `x ${cursor.x}, y ${cursor.y} · ${cursor.color}` : ''),
    node('span', {}, HELP),
  );
}
