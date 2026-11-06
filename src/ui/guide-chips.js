import { node } from './dom.js';
import { directionSprite, directionsInUse } from './actions.js';
import { checkGuide, describeCheck } from '../views/guides.js';
import { viewName } from '../model/kinds.js';

// how far off each view is from a guide; views that all say the same say it once
export function guideChips(state, guide) {
  const found = directionsInUse(state).map((direction) => {
    const sprite = directionSprite(state, direction);

    return { direction, check: sprite ? checkGuide(sprite, guide) : { state: 'missing' } };
  });
  const words = found.map(({ check }) => describeCheck(check));

  if (found.length > 1 && words.every((word) => word === words[0])) {
    return node('span.chip', { 'data-state': found[0].check.state }, `All views: ${words[0]}`);
  }

  return found.map(({ direction, check }, i) =>
    node(
      'span.chip',
      { 'data-state': check.state },
      `${viewName(state.project, direction)}: ${words[i]}`,
    ),
  );
}
