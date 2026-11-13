import { icon, node, replace } from '../dom.js';
import { watchMore } from '../more-behind.js';
import { pieceById } from '../../model/body/rig.js';
import { viewName } from '../../model/kinds.js';
import { openCutSheet } from './cut-sheet.js';
import { drawsOnPart } from './part-draw.js';
import { poseMore } from './pose-more.js';
import { poseHere, poseTarget, resetPose, turnIntoPixels } from './pose-actions.js';
import { angleControls, drawOnPart, partPicker, resetPart } from './pose-part-controls.js';

const button = (label, onclick, title = label) =>
  node('button.btn.quiet', { onclick, title }, label);

const cutButton = (app, label) =>
  node('button.btn.quiet', { onclick: () => openCutSheet(app) }, icon('cut'), label);

function drawingBar(app, target) {
  const picked = pieceById(target.rig, app.store.state.piece);

  const hint = node(
    'span.hint',
    {},
    picked ? 'It stays on this part, in every frame.' : 'Pick the part to draw on.',
  );
  const back = button('Back to posing', () => app.store.set({ tool: 'pose' }));

  return [
    node('span', {}, 'Drawing on'),
    partPicker(app, target.rig, picked),
    ...doFirst(app.store.state, hint, back),
  ];
}

function posedBar(app, target) {
  const picked = pieceById(target.rig, app.store.state.piece);
  const controls = picked
    ? angleControls(app, picked, target.body.pose)
    : [node('span.hint', {}, 'Drag a part to move it; its handle turns it.')];

  if (app.store.state.layout === 'compact') {
    return [
      partPicker(app, target.rig, picked),
      ...(picked ? controls : []),
      poseMore(app, picked),
    ];
  }

  return [
    partPicker(app, target.rig, picked),
    ...controls,
    picked ? drawOnPart(app, picked) : null,
    picked ? resetPart(app, picked) : null,
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
      node('span', {}, `Frame ${state.at.frame + 1} is not posed.`),
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

const showsBar = (state) => !state.selection && (state.tool === 'pose' || drawsOnPart(state));

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
