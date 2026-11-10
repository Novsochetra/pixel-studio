import { node, icon, replace } from './dom.js';
import { currentAnimation, hiddenArt } from './actions.js';
import { imageIntoFrame, startFromPrevious } from './frame-actions.js';
import { hasArt } from '../model/frames.js';
import { frameAt } from '../model/project.js';
import { viewName } from '../model/kinds.js';
import { rigOf } from '../model/body/body.js';
import { poseHere } from './body/pose-actions.js';

function isEmptyFrame(state) {
  const frame = frameAt(state.project, state.at);

  return Boolean(frame) && !hasArt(frame) && !hiddenArt(state, state.at.direction).length;
}

// the next pose from the one before: a copy to change, or that pose faded behind to draw over
function fromPrevious(app, { direction, index }) {
  return [
    node(
      'button.btn',
      { onclick: () => startFromPrevious(app, direction, index) },
      `Start from frame ${index}`,
    ),
    app.store.state.onion
      ? null
      : node(
          'button.btn.quiet',
          {
            title: 'Onion skin: the frames before and after show faded behind this one',
            onclick: () => app.store.set({ onion: true }),
          },
          `Show frame ${index} faded`,
        ),
  ];
}

// Over an empty frame: what to do with it, so a new frame never looks like a dead end.
export function renderEmptyFrame(el, app) {
  const { state } = app.store;

  // the Pose tool's own bar says what an empty frame can do
  // and a selection's bar stands in the same place: the card waits until the selection is let go
  el.hidden =
    state.mode !== 'edit' ||
    state.tool === 'pose' ||
    Boolean(state.selection) ||
    Boolean(app.playback) ||
    !isEmptyFrame(state);

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
    rigOf(currentAnimation(state), direction)
      ? node('button.btn', { onclick: () => poseHere(app) }, icon('pose'), 'Pose the parts')
      : null,
    previous ? fromPrevious(app, { direction, index }) : null,
  );
}
