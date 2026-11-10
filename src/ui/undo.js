import { changedLayers } from '../editor/snapshots.js';
import { goToSettled, settleAt } from './actions.js';
import { toast } from './dom.js';

function afterHistory(app, step, back) {
  if (!step) {
    return;
  }

  if (step.kind === 'structure') {
    // either side may hold layers the other lacks, so compare both ways
    app.saver.markLayers([
      ...changedLayers(step.before, step.after),
      ...changedLayers(step.after, step.before),
    ]);
    app.saver.markNewLayers(app.store.state.project);
    app.saver.markStructure();
    goToSettled(app, settleAt(app.store.state));
    app.store.touch('animations');

    return;
  }

  if (step.kind === 'setting') {
    app.saver.markStructure();
    app.store.touch('project');

    return;
  }

  app.saver.markLayers(step.changes.map(({ id }) => id));

  // a step that moved the selection: back with the pixels on undo; on redo it is let go, as
  // where it went is not kept
  if (step.selection) {
    app.store.set({ selection: back ? step.selection.before : null });
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
