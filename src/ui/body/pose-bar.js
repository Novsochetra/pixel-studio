import { icon, node, replace } from '../dom.js';
import { watchMore } from '../more-behind.js';
import { partPose, pieceById } from '../../model/body/rig.js';
import { tidyAngle } from '../../model/body/handle.js';
import { viewName } from '../../model/kinds.js';
import { openCutSheet } from './cut-sheet.js';
import { drawsOnPart } from './part-draw.js';
import { poseHere, poseTarget, resetPose, setPart, turnIntoPixels } from './pose-actions.js';

const STEP = 15;

const button = (label, onclick, title = label) =>
  node('button.btn.quiet', { onclick, title }, label);

const cutButton = (app, label) =>
  node('button.btn.quiet', { onclick: () => openCutSheet(app) }, icon('cut'), label);

// a part picked is on the Body, so the Pencil draws on it whichever layer was being edited
const onBody = (app) => ({ ...app.store.state.at, layer: poseTarget(app.store.state).body.key });

function partPicker(app, rig, picked) {
  const pick = (event) => app.store.set({ piece: event.target.value || null, at: onBody(app) });

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
    button(
      'Draw on part',
      () => app.store.set({ tool: 'pencil', at: onBody(app) }),
      `Draw what is missing on ${piece.name}: it stays on the part, in every frame`,
    ),
  ];
}

function drawingBar(app, target) {
  const picked = pieceById(target.rig, app.store.state.piece);

  return [
    node('span', {}, 'Drawing on'),
    partPicker(app, target.rig, picked),
    node(
      'span.hint',
      {},
      picked ? 'It stays on this part, in every frame.' : 'Pick the part to draw on.',
    ),
    node('span.pose-gap'),
    button('Back to posing', () => app.store.set({ tool: 'pose' })),
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

// On a phone the bar is one row that scrolls: what to do comes first there, as after its reason
// the button was cut off by the screen's edge.
const doFirst = (state, said, does) => (state.layout === 'compact' ? [does, said] : [said, does]);

function plainBar(app, state) {
  return [
    ...doFirst(
      state,
      node('span', {}, `Frame ${state.at.frame + 1} is plain pixels.`),
      node('button.btn.primary', { onclick: () => poseHere(app) }, 'Pose the parts here'),
    ),
    cutButton(app, 'Edit the cut…'),
  ];
}

function uncutBar(app, state) {
  return doFirst(
    state,
    node('span', {}, `${viewName(state.project, state.at.direction)} is not cut into parts yet.`),
    node('button.btn.primary', { onclick: () => openCutSheet(app) }, 'Cut into parts…'),
  );
}

const showsBar = (state) =>
  state.mode === 'edit' && !state.selection && (state.tool === 'pose' || drawsOnPart(state));

// which bar is showing, and what it holds
function barFor(app, state) {
  const target = poseTarget(state);

  if (state.tool !== 'pose') {
    return ['drawing', drawingBar(app, target)];
  }

  if (!target.rig) {
    return ['uncut', uncutBar(app, state)];
  }

  return target.body?.pose
    ? [state.piece ? 'part' : 'posed', posedBar(app, target)]
    : ['plain', plainBar(app, state)];
}

// Above the canvas while the Pose tool is on: what posing can do in this frame.
export function renderPoseBar(el, app) {
  const { state } = app.store;

  el.hidden = !showsBar(state);

  if (el.hidden) {
    el.dataset.bar = '';
    replace(el);

    return;
  }

  const focused = el.contains(document.activeElement) ? document.activeElement.id : '';
  const [bar, controls] = barFor(app, state);

  replace(el, controls);

  // another bar starts at its first control: left where the last one was scrolled to, it opened
  // with its part picker off the screen
  if (el.dataset.bar !== bar) {
    el.dataset.bar = bar;
    el.scrollLeft = 0;
  }

  watchMore(el);

  // the part picker or angle being used keeps the keyboard when the bar is drawn again
  if (focused) {
    el.querySelector(`#${focused}`)?.focus();
  }
}
