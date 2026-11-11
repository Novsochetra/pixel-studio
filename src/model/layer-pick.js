// Layers picked together in the list, by key so a group carries to the next frame as the layer
// being edited does. An empty list means only the layer being edited is picked.

import { duplicateLayer } from './layer-ops.js';
import { removeLayer } from './structure.js';

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

// Moving off the group ends it, so coming back to one of its layers later picks only that layer.
export function keptPick(picked = [], key) {
  return picked.includes(key) ? picked : [];
}

// every layer of the group that can go, goes: a frame keeps one layer of art
export function removeLayers(animation, frame, keys) {
  return keys.filter((key) => removeLayer(animation, frame, key));
}

export const duplicateLayers = (frame, keys) => keys.map((key) => duplicateLayer(frame, key));
