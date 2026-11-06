import { node, icon, replace } from './dom.js';
import { currentAnimation, hiddenArt } from './actions.js';
import { imageIntoFrame, startFromPrevious } from './frame-actions.js';
import { hasArt } from '../model/frames.js';
import { frameAt } from '../model/project.js';
import { viewName } from '../model/kinds.js';

function isEmptyFrame(state) {
  const frame = frameAt(state.project, state.at);

  return Boolean(frame) && !hasArt(frame) && !hiddenArt(state, state.at.direction).length;
}

// Over an empty frame: what to do with it, so a new frame never looks like a dead end.
export function renderEmptyFrame(el, app) {
  const { state } = app.store;
  el.hidden = state.mode !== 'edit' || Boolean(app.playback) || !isEmptyFrame(state);

  if (el.hidden) {
    return;
  }

  const { direction, frame: index } = state.at;
  const frames = currentAnimation(state).directions[direction].frames;
  const view = viewName(state.project, direction);
  const name = frames.length > 1 ? `Frame ${index + 1} of ${view}` : view;
  const previous = index > 0 && hasArt(frames[index - 1]);

  replace(
    el,
    node(
      'div',
      {},
      node('strong', {}, `${name} is empty`),
      node('div.hint', {}, 'Drop an AI image on the canvas, or draw on it.'),
    ),
    node(
      'button.btn.primary',
      { onclick: () => imageIntoFrame(app, direction, index) },
      icon('upload'),
      'Image into this frame…',
    ),
    previous
      ? node(
          'button.btn',
          { onclick: () => startFromPrevious(app, direction, index) },
          `Start from frame ${index}`,
        )
      : null,
  );
}
