// Layers picked together in the list, by key so a group carries to the next frame as the layer
// being edited does. An empty list means only the layer being edited is picked.

import { duplicateLayer, paintOver } from './layer-ops.js';
import { forgetCutsWithoutBody, removeLayer } from './structure.js';
import { isBody } from './body/body-kind.js';

const asGroup = (keys) => (keys.length > 1 ? keys : []);

export function groupOf(frame, active, picked) {
  const group = frame.layers.filter((layer) => picked.includes(layer.key));

  return group.includes(active) ? group : [active];
}

export function pickRange(frame, active, key) {
  const keys = frame.layers.map((layer) => layer.key);
  const from = keys.indexOf(active);
  const to = keys.indexOf(key);

  return asGroup(keys.slice(Math.min(from, to), Math.max(from, to) + 1));
}

export function togglePick(group, active, key) {
  if (!group.includes(key)) {
    return { layer: key, picked: [...group, key] };
  }

  const rest = group.filter((other) => other !== key);

  // something is always picked, so the last layer stays
  if (!rest.length) {
    return { layer: key, picked: [] };
  }

  return { layer: key === active ? rest.at(-1) : active, picked: asGroup(rest) };
}

// Where the editor is, and the layers picked together there: what undo and redo go back to. A
// step that changed the layer in hand left one layer picked where there had been three.
export const placeOf = (state) => ({ ...state.at, picked: state.pickedLayers });

// Moving off the group ends it, so coming back to one of its layers later picks only that layer.
export function keptPick(picked = [], key) {
  return picked.includes(key) ? picked : [];
}

// whether the frame still has a layer of art with these gone: it keeps at least one
export const leavesArt = (frame, keys) =>
  frame.layers.some((layer) => layer.kind === 'art' && !keys.includes(layer.key));

// every layer of the group that can go, goes: a frame keeps one layer of art
export function removeLayers(animation, frame, keys) {
  return keys.filter((key) => removeLayer(animation, frame, key));
}

export const duplicateLayers = (frame, keys) => keys.map((key) => duplicateLayer(frame, key));

const mergeable = (layer) =>
  layer.visible && layer.kind !== 'reference' && !isBody(layer) && Boolean(layer.sprite);

// The group as it can merge, or none of it: a hidden layer would come into view or drop out of
// it, a picture to trace is not art, and a Body is drawn from its parts.
export const mergeableLayers = (group) => (group.length > 1 && group.every(mergeable) ? group : []);

// The layers picked together become the lowest of them, painted as they show. Returns its key.
export function mergeLayers(animation, frame, keys) {
  const [lowest, ...above] = frame.layers.filter((layer) => keys.includes(layer.key));

  above.forEach((layer) => paintOver(lowest.sprite, layer.sprite));
  frame.layers = frame.layers.filter((layer) => !above.includes(layer));
  forgetCutsWithoutBody(animation);

  return lowest.key;
}
