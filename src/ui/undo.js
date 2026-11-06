import { changedLayers } from '../editor/history.js';
import { goToSettled, settleAt } from './actions.js';
import { toast } from './dom.js';

function afterHistory(app, step) {
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

  if (step.rigs.length || step.changes.some(({ poses }) => poses.before !== poses.after)) {
    app.saver.markStructure();
  }

  app.store.touch('pixels');
}

// says what went back or came again, as the canvas alone may not show it (a frame elsewhere)
function tellStep(step, done) {
  toast(step ? `${done}: ${step.label}` : `Nothing to ${done === 'Undone' ? 'undo' : 'redo'}`);
}

export function undo(app) {
  const step = app.history.undo(app.store.state.project);
  afterHistory(app, step);
  tellStep(step, 'Undone');
}

export function redo(app) {
  const step = app.history.redo(app.store.state.project);
  afterHistory(app, step);
  tellStep(step, 'Redone');
}
