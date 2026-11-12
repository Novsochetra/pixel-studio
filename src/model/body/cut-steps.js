const KEPT = 40;

export const planCopy = (plan) => ({
  ...plan,
  parts: structuredClone(plan.parts),
  owners: plan.owners.slice(),
});

const same = (one, other) =>
  JSON.stringify(one.parts) === JSON.stringify(other.parts) &&
  one.owners.length === other.owners.length &&
  one.owners.every((owner, i) => owner === other.owners[i]);

// The plan as it stood before each change made in the cut window. Nothing painted there is a
// step of the editor's until the cut is made, so the window takes its own changes back: a
// stroke gone wrong could only be painted over again, or the whole window given up.
export const newSteps = () => ({ back: [], on: [] });

// `before` is the plan copied before a change; it is a step if the change changed anything
export function keepStep(steps, before, plan) {
  if (same(before, plan)) {
    return false;
  }

  steps.back.push(before);
  steps.back.splice(0, steps.back.length - KEPT);
  steps.on.length = 0;

  return true;
}

// the plan to go on with: the one a step earlier, or the same one when there is none
export function stepBack(steps, plan) {
  const earlier = steps.back.pop();

  if (earlier) {
    steps.on.push(plan);
  }

  return earlier ?? plan;
}

export function stepOn(steps, plan) {
  const later = steps.on.pop();

  if (later) {
    steps.back.push(plan);
  }

  return later ?? plan;
}
