import { bounds, colorCounts } from './sprite.js';

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

const POSE_ROWS = 8;

// Whether the reference view holds a pose a picture can be matched to. A few pixels sketched
// there are none: matched to a line a pixel tall, a picture could not be cleaned at all, and the
// failure was put on the picture. Nor is a shape in one colour: matched to its colours, the
// picture came out a silhouette of it.
export function isPose(sprite) {
  const box = sprite ? bounds(sprite) : null;

  return Boolean(box) && box.bottom - box.top >= POSE_ROWS && colorCounts(sprite).length > 1;
}
