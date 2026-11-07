import { CLEAR, getPixel, setPixel } from './sprite.js';
import { newId } from './project.js';
import { copyOfLayer, forgetCutsWithoutBody } from './structure.js';
import { isBody, withoutPose } from './body/body-kind.js';

const indexIn = (frame, key) => frame.layers.findIndex((layer) => layer.key === key);

// a picture to trace is not art, and a hidden layer cannot be what was clicked
export function topLayerAt(frame, [x, y]) {
  return (
    frame.layers.findLast(
      (layer) =>
        layer.visible &&
        layer.kind !== 'reference' &&
        layer.sprite &&
        getPixel(layer.sprite, x, y) !== CLEAR,
    ) ?? null
  );
}

// a copy of the layer just above it, to change without losing the original
export function duplicateLayer(frame, key) {
  const at = indexIn(frame, key);
  const layer = frame.layers[at];
  // a copy of the Body is plain art: the parts draw only the Body itself
  const original = isBody(layer) ? { ...withoutPose(layer), kind: 'art' } : layer;
  const copy = { ...copyOfLayer(original), key: newId('k'), name: `${layer.name} copy` };

  frame.layers.splice(at + 1, 0, copy);

  return copy.key;
}

// the layer below, if the art can go down onto it: a picture to trace never takes art, and a
// hidden layer would come back into view or stay out of it, which is not how the two show
export function layerBelow(frame, key) {
  const at = indexIn(frame, key);
  const [below, layer] = [frame.layers[at - 1], frame.layers[at]];

  return below &&
    below.kind !== 'reference' &&
    !isBody(below) &&
    layer.kind !== 'reference' &&
    below.visible &&
    layer.visible
    ? below
    : null;
}

// upper's pixels over lower's, as the two layers show
export function paintOver(lower, upper) {
  for (let y = 0; y < upper.height; y++) {
    for (let x = 0; x < upper.width; x++) {
      const color = getPixel(upper, x, y);

      if (color !== CLEAR) {
        setPixel(lower, x, y, color);
      }
    }
  }
}

// The layer's art painted onto the layer below, then the layer gone: two become one, as it shows.
// Returns the key of the layer that is left, or null when there is none to merge onto.
export function mergeDown(animation, frame, key) {
  const below = layerBelow(frame, key);

  if (!below) {
    return null;
  }

  const at = indexIn(frame, key);
  const [upper] = frame.layers.splice(at, 1);

  if (upper.sprite && below.sprite) {
    paintOver(below.sprite, upper.sprite);
  }

  forgetCutsWithoutBody(animation);

  return below.key;
}

// the layer moved to `to` in the frame's stack (0 is the bottom)
export function placeLayer(frame, key, to) {
  const [layer] = frame.layers.splice(indexIn(frame, key), 1);

  frame.layers.splice(Math.max(0, Math.min(frame.layers.length, to)), 0, layer);
}

export function layerBeside(frame, key) {
  const at = indexIn(frame, key);

  return frame.layers[at - 1]?.key ?? frame.layers[at + 1]?.key ?? null;
}
