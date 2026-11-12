const idsOf = (step) =>
  step.changes
    .map((change) => change.id)
    .sort()
    .join(' ');

// two steps that may be one: pixel changes under one label, to the same layers, with no cut moved
const joins = (first, second) =>
  [first, second].every((step) => step?.kind === 'pixels' && !step.rigs?.length) &&
  first.label === second.label &&
  idsOf(first) === idsOf(second);

// Makes `first` lead to where `second` led, when the two may be one step. Resolves to whether
// it did: the caller lets go of `second`.
export function joinSteps(first, second) {
  if (!joins(first, second)) {
    return false;
  }

  for (const change of first.changes) {
    const later = second.changes.find((other) => other.id === change.id);

    change.after = later.after;
    change.poses = { before: change.poses.before, after: later.poses.after };
  }

  return true;
}
