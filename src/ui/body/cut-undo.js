import { icon, node } from '../dom.js';
import { keepStep, planCopy, stepBack, stepOn } from '../../model/body/cut-steps.js';

function go(job, step) {
  job.plan = step(job.steps, job.plan);
  job.selected = Math.max(0, Math.min(job.selected, job.plan.parts.length - 1));
  job.redraw();
}

export function undoButtons(job) {
  const button = (name, step, waiting) =>
    node(
      'button.btn.quiet.icon-only',
      {
        'aria-label': name,
        title: `${name} what was changed in this window`,
        disabled: !waiting,
        onclick: () => go(job, step),
      },
      icon(name.toLowerCase()),
    );

  return node(
    'div.group.cut-undo',
    {},
    button('Undo', stepBack, job.steps.back.length),
    button('Redo', stepOn, job.steps.on.length),
  );
}

const inField = (event) => event.target.matches?.('input, textarea, select');

// The editor's undo is behind the window, and waits while a window is open: here the keys take
// back what was painted in the window. In a name's field they stay the field's own.
export function watchCutKeys(job) {
  const onKey = (event) => {
    const key = event.key.toLowerCase();
    const steps = (event.metaKey || event.ctrlKey) && !inField(event);

    if (steps && (key === 'z' || key === 'y')) {
      event.preventDefault();
      go(job, key === 'y' || event.shiftKey ? stepOn : stepBack);
    }
  };

  document.addEventListener('keydown', onKey);

  return () => document.removeEventListener('keydown', onKey);
}

// a change made by the window's controls: a step when it changed the plan
export function changing(job, edit) {
  const before = planCopy(job.plan);

  edit();
  keepStep(job.steps, before, job.plan);
  job.redraw();
}
