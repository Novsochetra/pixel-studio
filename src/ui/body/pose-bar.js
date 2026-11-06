import { icon, node, replace } from '../dom.js';
import { partPose, pieceById } from '../../model/body/rig.js';
import { tidyAngle } from '../../model/body/handle.js';
import { viewName } from '../../model/kinds.js';
import { openCutSheet } from './cut-sheet.js';
import { poseHere, poseTarget, resetPose, setPart, turnIntoPixels } from './pose-actions.js';

const STEP = 15;

const button = (label, onclick, title = label) =>
  node('button.btn.quiet', { onclick, title }, label);

const cutButton = (app, label) =>
  node('button.btn.quiet', { onclick: () => openCutSheet(app) }, icon('cut'), label);

function partPicker(app, rig, picked) {
  const pick = (event) => app.store.set({ piece: event.target.value || null });

  return node(
    'select.input',
    { id: 'pose-part', 'aria-label': 'Part to pose', onchange: pick },
    node('option', { value: '', selected: !picked }, 'Pick a part'),
    [...rig.pieces]
      .reverse()
      .map((piece) => node('option', { value: piece.id, selected: piece === picked }, piece.name)),
  );
}

function angleControls(app, piece, pose) {
  const angle = partPose(pose, piece.id).angle;
  const turnTo = (value) => setPart(app, piece, { angle: tidyAngle(value) });

  return [
    node(
      'button.btn.quiet.icon-only',
      { 'aria-label': `Turn ${piece.name} ${STEP}° left`, onclick: () => turnTo(angle - STEP) },
      '⟲',
    ),
    node(
      'label.pose-angle',
      { title: 'How far the part is turned, in degrees' },
      node('input.input.mono', {
        id: 'pose-angle',
        type: 'number',
        step: '1',
        value: String(angle),
        onchange: (event) => turnTo(Number(event.target.value) || 0),
      }),
      '°',
    ),
    node(
      'button.btn.quiet.icon-only',
      { 'aria-label': `Turn ${piece.name} ${STEP}° right`, onclick: () => turnTo(angle + STEP) },
      '⟳',
    ),
    button('Reset part', () => setPart(app, piece, null), `${piece.name} back as it was cut`),
  ];
}

function posedBar(app, target) {
  const picked = pieceById(target.rig, app.store.state.piece);

  return [
    partPicker(app, target.rig, picked),
    picked
      ? angleControls(app, picked, target.body.pose)
      : node('span.hint', {}, 'Drag a part to move it; its handle turns it.'),
    node('span.pose-gap'),
    button('Reset pose', () => resetPose(app), 'Every part back as it was cut'),
    button('Turn into pixels', () => turnIntoPixels(app), 'Paint on this frame by hand'),
    cutButton(app, 'Edit the cut…'),
  ];
}

function plainBar(app, state) {
  return [
    node('span', {}, `Frame ${state.at.frame + 1} is plain pixels.`),
    node('button.btn.primary', { onclick: () => poseHere(app) }, 'Pose the parts here'),
    cutButton(app, 'Edit the cut…'),
  ];
}

function uncutBar(app, state) {
  return [
    node('span', {}, `${viewName(state.project, state.at.direction)} is not cut into parts yet.`),
    node('button.btn.primary', { onclick: () => openCutSheet(app) }, 'Cut into parts…'),
  ];
}

// Above the canvas while the Pose tool is on: what posing can do in this frame.
export function renderPoseBar(el, app) {
  const { state } = app.store;

  el.hidden = state.mode !== 'edit' || state.tool !== 'pose' || Boolean(state.selection);

  if (el.hidden) {
    replace(el);

    return;
  }

  const target = poseTarget(state);
  const focused = el.contains(document.activeElement) ? document.activeElement.id : '';

  if (!target.rig) {
    replace(el, uncutBar(app, state));
  } else {
    replace(el, target.body?.pose ? posedBar(app, target) : plainBar(app, state));
  }

  // the part picker or angle being used keeps the keyboard when the bar is drawn again
  if (focused) {
    el.querySelector(`#${focused}`)?.focus();
  }
}
