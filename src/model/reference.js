// The view every other is matched to. Once no animation draws the chosen one any more, the first
// animation's first view stands in, so cleaning still has a reference; the choice itself is kept,
// so undoing the removal brings it straight back.
export function referenceOf(project) {
  const chosen = project.referenceDirection;

  if (project.animations.some((animation) => animation.directions[chosen])) {
    return chosen;
  }

  return Object.keys(project.animations[0]?.directions ?? {})[0] ?? chosen;
}
