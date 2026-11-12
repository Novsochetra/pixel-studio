import { node, replace, toast } from '../dom.js';
import { openSheet } from '../sheet.js';
import { watchBelow, watchMore } from '../more-behind.js';
import { currentAnimation, currentLayer } from '../actions.js';
import { frameAt } from '../../model/project.js';
import { BODY_PARTS, viewName } from '../../model/kinds.js';
import { hasArt } from '../../model/frames.js';
import { planFromRig, planFromTemplate } from '../../model/body/cut-plan.js';
import { guessOwners } from '../../model/body/guess.js';
import { cutSource, leftoverLayer, rigOf } from '../../model/body/body.js';
import { cutCanvas } from './cut-canvas.js';
import { partsList } from './cut-list.js';
import { makeCut } from './cut-apply.js';
import { brushControls } from './cut-brush.js';
import { keepingFocus } from './cut-focus.js';
import { mayLeave, rememberPlan } from './cut-leave.js';
import { changing, undoButtons, watchCutKeys } from './cut-undo.js';
import { newSteps } from '../../model/body/cut-steps.js';

const isArt = (layer) => layer.kind === 'art' && hasArt({ layers: [layer] });

// the layer the parts are cut from: the one being edited if it has art, else the first that does
function cutFrom(state) {
  const chosen = currentLayer(state);

  return isArt(chosen) ? chosen : frameAt(state.project, state.at).layers.find(isArt);
}

// the part picked to paint first is the top one, first in the list, so it is in sight
const withTopPicked = (job) => ({ ...job, selected: job.plan.parts.length - 1 });

function newJob(app) {
  const { state } = app.store;
  const { direction, frame } = state.at;
  const rig = rigOf(currentAnimation(state), direction);
  const steps = newSteps();
  const place = { app, direction, frame, steps, tool: 'brush', brush: 2, erase: false };

  if (rig) {
    const plan = planFromRig(rig, state.project.canvas);

    return withTopPicked({ ...place, plan, source: plan.source, recut: true });
  }

  const layer = cutFrom(state);

  if (!layer) {
    return null;
  }

  const source = cutSource(frameAt(state.project, state.at), layer);
  const plan = planFromTemplate(source, BODY_PARTS);

  return withTopPicked({ ...place, plan, source, layer, recut: false });
}

// under the art, what the next stroke does: the list of parts may be scrolled away from it
function strokeSays(job) {
  if (job.erase) {
    return 'Unpaints whichever part it crosses';
  }

  return `Paints ${job.plan.parts[job.selected]?.name ?? 'a part'}`;
}

function hint(job) {
  const { state } = job.app.store;
  const frame = frameAt(state.project, { ...state.at, direction: job.direction, frame: job.frame });
  const stays = leftoverLayer(frame, job.layer?.key)?.name ?? 'the art';
  const unpainted = job.recut
    ? `Pixels left unpainted go back to ${stays} in this frame.`
    : `Pixels left unpainted stay on ${stays}.`;

  return `Paint each part, or loop it with the lasso; L and R are the picture's left and right. Drag a dot to move where a part turns. ${unpainted}`;
}

// the first guess again, from the proportions: with the parts it starts over, not with the window
function guessButton(job, change) {
  const guess = () =>
    change(() => {
      job.plan.owners = guessOwners(job.source, job.plan.parts);
      job.plan.parts.forEach((part) => (part.pivot = null));
    });

  return node(
    'button.btn.quiet',
    { onclick: guess, title: 'Guess the parts again from the proportions' },
    'Guess again',
  );
}

function actions(job) {
  // parts with pixels painted for them: a part removed takes its pixels out of the count
  const painted = [...job.plan.owners].filter((owner) => owner >= 0 && job.plan.parts[owner]);
  const count = new Set(painted).size;

  return [
    node('button.btn', { onclick: job.close }, 'Cancel'),
    node(
      'button.btn.primary',
      { onclick: () => makeCut(job), disabled: !count },
      `${job.recut ? 'Save the cut:' : 'Cut into'} ${count} ${count === 1 ? 'part' : 'parts'}`,
    ),
  ];
}

// the tools, the parts and the advice: the column that scrolls on a phone, beside the art on a desk
function drawSide(side, job, change) {
  const tools = brushControls(job, change);

  tools.prepend(undoButtons(job));
  replace(
    side,
    tools,
    partsList(job, change, guessButton(job, change)),
    node('p.hint', {}, hint(job)),
  );
  watchMore(side.querySelector('.cut-brush'));
  watchBelow(side);
  watchBelow(side.querySelector('[role="list"]'));
}

export function openCutSheet(app) {
  const job = newJob(app);

  if (!job) {
    toast('Nothing to cut in this frame yet: draw the view, or clean a picture into it, first.');

    return;
  }

  const view = viewName(app.store.state.project, job.direction);
  const title = job.recut ? `Edit the cut of ${view}` : `Cut ${view} into parts`;
  // the window's own last child, so its buttons stay at the foot while the parts scroll
  const foot = node('div.sheet-actions');
  const mayClose = () => mayLeave(job, foot);
  const stopKeys = watchCutKeys(job);
  const sheet = openSheet(title, stopKeys, { wide: true, focusField: false, mayClose });
  const side = node('div.cut-side');
  const paints = node('p.hint.cut-paints');
  const draw = () => {
    drawSide(side, job, change);
    paints.textContent = strokeSays(job);
    foot.classList.remove('asking');
    replace(foot, actions(job));
  };
  const render = () => keepingFocus(sheet.body, draw);
  const art = cutCanvas(job, render);
  const change = (edit) => changing(job, edit);

  job.redraw = () => {
    render();
    art.redraw();
  };
  job.close = sheet.close;
  rememberPlan(job);
  sheet.body.classList.add('cut-window');
  sheet.body.append(
    node('div.cut-layout', {}, node('div.cut-art', {}, art.canvas, paints), side),
    foot,
  );
  render();
}
