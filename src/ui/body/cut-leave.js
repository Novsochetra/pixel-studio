import { askDelete } from '../ask-delete.js';

const fingerprint = (plan) => JSON.stringify([plan.parts, [...plan.owners]]);

export function rememberPlan(job) {
  job.opened = fingerprint(job.plan);
}

export const corrected = (job) => fingerprint(job.plan) !== job.opened;

// What is painted here is no step until the cut is made, so undo could not bring it back: the
// window asks before it closes on corrections.
export function mayLeave(job, foot) {
  if (job.done || !corrected(job)) {
    return true;
  }

  if (!foot.classList.contains('asking')) {
    // "Keep" alone could be the changes or the window: the answers say which
    askDelete(foot, {
      question: 'Close without cutting? What you changed here goes.',
      word: 'Close without cutting',
      keep: 'Go on cutting',
      onDelete: () => {
        job.done = true;
        job.close();
      },
    });
  }

  return false;
}
