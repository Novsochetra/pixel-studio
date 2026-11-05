import { artSprite, directionsInUse } from './actions.js';
import { colorCounts } from '../model/sprite.js';

function coloursOfFrame(state, frameIndex) {
  const totals = new Map();

  for (const direction of directionsInUse(state)) {
    const sprite = artSprite(state, direction, frameIndex);

    for (const { color, count } of sprite ? colorCounts(sprite) : []) {
      totals.set(color, (totals.get(color) ?? 0) + count);
    }
  }

  return totals;
}

// every colour the character uses, across its views, most used first; a new empty frame still has
// the character's colours: those of the animation's first frame
export function characterColors(state) {
  const here = coloursOfFrame(state, state.at.frame ?? 0);
  const totals = here.size ? here : coloursOfFrame(state, 0);

  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color);
}
