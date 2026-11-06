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

// the art's colours when the open frame has none: its animation's first frame, else the first
// frame of any animation, so a new empty frame or animation still offers them to draw with
function fallbackColours(state) {
  const animations = [state.at.animation, ...state.project.animations.map(({ id }) => id)];

  for (const animation of animations) {
    const totals = coloursOfFrame({ ...state, at: { ...state.at, animation } }, 0);

    if (totals.size) {
      return totals;
    }
  }

  return new Map();
}

// every colour the art uses across its views, with how many pixels, most used first
export function characterCounts(state) {
  const here = coloursOfFrame(state, state.at.frame ?? 0);
  const totals = here.size ? here : fallbackColours(state);

  return [...totals.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([color, count]) => ({ color, count }));
}

export function characterColors(state) {
  return characterCounts(state).map(({ color }) => color);
}
