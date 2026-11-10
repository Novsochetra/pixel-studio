import { changedLayers } from '../editor/snapshots.js';
import { goToSettled, settleAt } from './actions.js';
import { toast } from './dom.js';
import { swapProject } from './session.js';
import { allLayers, frameAt } from '../model/project.js';

// frames, layers or animations put back, or made again
function afterStructure(app, step, back) {
  // either side may hold layers the other lacks, so compare both ways
  app.saver.markLayers([
    ...changedLayers(step.before, step.after),
    ...changedLayers(step.after, step.before),
  ]);
  app.saver.markNewLayers(app.store.state.project);
  app.saver.markStructure();
  // back to the frame, layer and animation the step was made from, or on to where it led:
  // the art came back, but the editor stayed on whatever was next to it
  const place = step.place?.[back ? 'before' : 'after'] ?? app.store.state.at;

  goToSettled(app, settleAt({ ...app.store.state, at: place }));
  app.store.touch('animations');
}

// A step drawn in another frame or view is put back or made again there, out of sight: the
// editor goes to it. A step that reached the frame being edited too is seen where it is.
function showChanged(app, step) {
  const { state } = app.store;
  const changed = new Set(step.changes.map(({ id }) => id));
  const inSight = frameAt(state.project, state.at).layers.some((layer) => changed.has(layer.id));
  const found = inSight
    ? null
    : [...allLayers(state.project)].find(({ layer }) => changed.has(layer.id));

  if (found) {
    const at = {
      animation: found.animation.id,
      direction: found.direction,
      frame: found.frameIndex,
      layer: found.layer.key,
    };

    goToSettled(app, settleAt({ ...state, at }));
  }
}

// a step that moved the selection: back with the pixels on undo, and on redo to where it stood
// when the step was undone
function moveSelection(app, step, back) {
  if (back) {
    step.selection.after = app.store.state.selection;
  }

  app.store.set({ selection: step.selection[back ? 'before' : 'after'] ?? null });
}

// a canvas of another size or a version gone back to: the project it took the place of is put
// back whole, or put in its place again, with what the editor showed with it
function afterProject(app, step, back) {
  const side = back ? 'before' : 'after';

  const [was, now] = [step.before.canvas, step.after.canvas];

  swapProject(app, step[side]);
  app.store.set(step.view?.[side] ?? {});
  app.store.touch('project');

  // a canvas of another size is fitted to the window again; the same size keeps its zoom
  if (was.width !== now.width || was.height !== now.height) {
    app.fitCanvas?.();
  }
}

function afterHistory(app, step, back) {
  if (!step) {
    return;
  }

  if (step.kind === 'project') {
    afterProject(app, step, back);

    return;
  }

  if (step.kind === 'structure') {
    afterStructure(app, step, back);

    return;
  }

  if (step.kind === 'setting') {
    app.saver.markStructure();
    app.store.touch('project');

    return;
  }

  app.saver.markLayers(step.changes.map(({ id }) => id));
  showChanged(app, step);

  if (step.selection) {
    moveSelection(app, step, back);
  }

  if (step.rigs.length || step.changes.some(({ poses }) => poses.before !== poses.after)) {
    app.saver.markStructure();
  }

  app.store.touch('pixels');
}

// says what went back or came again, as the canvas alone may not show it (a frame elsewhere)
function tellStep(step, done) {
  toast(step ? `${done}: ${step.label}` : `Nothing to ${done === 'Undone' ? 'undo' : 'redo'}`);
}

// Undo in the middle of a stroke would swap the layer's pixels from under the tool drawing on
// them: the step waits until the pointer lets go.
const midDrag = (app) => {
  if (app.dragging) {
    toast('Let go of the canvas first');
  }

  return Boolean(app.dragging);
};

export function undo(app) {
  if (midDrag(app)) {
    return;
  }

  const step = app.history.undo(app.store.state.project);
  afterHistory(app, step, true);
  tellStep(step, 'Undone');
}

export function redo(app) {
  if (midDrag(app)) {
    return;
  }

  const step = app.history.redo(app.store.state.project);
  afterHistory(app, step, false);
  tellStep(step, 'Redone');
}
