import { CLEAR, cloneSprite, getPixel, setPixel } from './sprite.js';
import { newId } from './project.js';
import { framesOf, layerStack } from './structure.js';

const indexIn = (frame, key) => frame.layers.findIndex((layer) => layer.key === key);

// a copy of the layer just above it, in every frame, to change without losing the original
export function duplicateLayer(animation, key) {
  const copyKey = newId('k');

  for (const frame of framesOf(animation)) {
    const at = indexIn(frame, key);
    const layer = frame.layers[at];
    const copy = {
      ...layer,
      id: newId('l'),
      key: copyKey,
      name: `${layer.name} copy`,
      sprite: layer.sprite ? cloneSprite(layer.sprite) : null,
    };
    frame.layers.splice(at + 1, 0, copy);
  }

  return copyKey;
}

// the layer below, if the art can go down onto it: a picture to trace never takes art
export function layerBelow(animation, key) {
  const stack = layerStack(animation);
  const below = stack[stack.findIndex((entry) => entry.key === key) - 1];

  return below &&
    below.kind !== 'reference' &&
    stack.find((entry) => entry.key === key).kind !== 'reference'
    ? below
    : null;
}

function paintOver(lower, upper) {
  for (let y = 0; y < upper.height; y++) {
    for (let x = 0; x < upper.width; x++) {
      const color = getPixel(upper, x, y);

      if (color !== CLEAR) {
        setPixel(lower, x, y, color);
      }
    }
  }
}

// The layer's art painted onto the layer below in every frame, then the layer gone: two become
// one, as it shows. Returns the key of the layer that is left, or null when there is none below.
export function mergeDown(animation, key) {
  const below = layerBelow(animation, key);

  if (!below) {
    return null;
  }

  for (const frame of framesOf(animation)) {
    const at = indexIn(frame, key);
    const [upper, lower] = [frame.layers[at], frame.layers[at - 1]];

    if (upper.sprite && lower.sprite) {
      paintOver(lower.sprite, upper.sprite);
    }

    frame.layers.splice(at, 1);
  }

  return below.key;
}

// the layer moved to `to` in the stack (0 is the bottom), in every frame alike
export function placeLayer(animation, key, to) {
  for (const frame of framesOf(animation)) {
    const [layer] = frame.layers.splice(indexIn(frame, key), 1);
    frame.layers.splice(Math.max(0, Math.min(frame.layers.length, to)), 0, layer);
  }
}
