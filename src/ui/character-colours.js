import { artSprite, directionsInUse } from './actions.js';
import { colorCounts } from '../model/sprite.js';

// every colour the character uses, across its views, most used first
export function characterColors(state) {
  const totals = new Map();

  for (const direction of directionsInUse(state)) {
    const sprite = artSprite(state, direction);

    for (const { color, count } of sprite ? colorCounts(sprite) : []) {
      totals.set(color, (totals.get(color) ?? 0) + count);
    }
  }

  return [...totals.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([color]) => color);
}
