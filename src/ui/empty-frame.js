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

// The next pose from the one before: a copy to change, or that pose faded behind to draw over.
// The copy comes first, and is the bar's main button: an animation's next frame is the last one
// changed, and at the bar's end it was cut off on every phone.
function fromPrevious(app, { direction, index }) {
  const name = `Start from frame ${index}`;
  const short = app.store.state.layout === 'compact';

  return [
    node(
      'button.btn.primary',
      { 'aria-label': name, onclick: () => startFromPrevious(app, direction, index) },
      icon('duplicate'),
      short ? `Copy frame ${index}` : name,
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

// The Pose tool's own bar says what an empty frame can do, and a selection's bar stands in the
// same place: the card waits until the selection is let go. A phone's open panel leaves a canvas
// so short that the card lay over a quarter of it, and its Pin bar stands where the card does;
// the frames' panel is where an empty frame is picked, so there the card stays, to say what the
// frame can be given.
function staysAway(app) {
  const { state } = app.store;

  return (
    state.tool === 'pose' ||
    Boolean(state.selection) ||
    Boolean(app.playback) ||
    (state.layout === 'compact' &&
      (!['frames', null].includes(state.panel ?? null) || state.tool === 'pin'))
  );
}

// Over an empty frame: what to do with it, so a new frame never looks like a dead end.
export function renderEmptyFrame(el, app) {
  const { state } = app.store;

  el.hidden = staysAway(app) || !isEmptyFrame(state);

  if (el.hidden) {
    return;
  }

  const { direction, frame: index } = state.at;
  const frames = currentAnimation(state).directions[direction].frames;
  const view = viewName(state.project, direction);
  const name = frames.length > 1 ? `Frame ${index + 1} of ${view}` : view;
  const previous = index > 0 && hasArt(frames[index - 1]);

  const short = state.layout === 'compact';

  replace(
    el,
    // on a phone the place over the canvas names the frame
    node('strong', {}, short ? 'Empty frame' : `${name} is empty`),
    previous ? fromPrevious(app, { direction, index }) : null,
    node(
      `button.btn${previous ? '' : '.primary'}`,
      {
        'aria-label': 'Image into this frame…',
        onclick: () => imageIntoFrame(app, direction, index),
      },
      icon('upload'),
      short ? 'Image…' : 'Image into this frame…',
    ),
    rigOf(currentAnimation(state), direction)
      ? node('button.btn', { onclick: () => poseHere(app) }, icon('pose'), 'Pose the parts')
      : null,
  );
}
