import { toast } from './dom.js';
import { commit, currentAnimation, currentLayer, restructure } from './actions.js';
import { duplicateLayers, mergeLayers, removeLayers } from '../model/layer-pick.js';
import { frameAt } from '../model/project.js';

const frameOf = (state) => frameAt(state.project, state.at);

// What Clear, Duplicate and Delete say they act on: the layer in hand, or how many are picked
// together. With three picked, each took only the one being edited.
export const namedGroup = (group) => (group.length > 1 ? `${group.length} layers` : group[0].name);

export function clearLayers(app, group) {
  const drawn = group.filter((layer) => layer.kind !== 'reference');

  commit(app, group.length > 1 ? 'Clear layers' : 'Clear layer', drawn, () =>
    drawn.forEach((layer) => layer.sprite.pixels.fill(0)),
  );
}

export function duplicateGroup(app, group) {
  const keys = group.map((layer) => layer.key);

  restructure(app, group.length > 1 ? 'Duplicate layers' : 'Duplicate layer', (draft) => ({
    layer: duplicateLayers(frameOf(draft), keys).at(-1),
  }));
}

export function mergeGroup(app, group) {
  const keys = group.map((layer) => layer.key);

  restructure(app, `Merge ${group.length} layers`, (draft) => ({
    layer: mergeLayers(currentAnimation(draft), frameOf(draft), keys),
  }));
}

// the layer in hand afterwards: itself if it stayed, else the nearest that did, below it first
function inHandAfter(frame, before) {
  const stays = (key) => frame.layers.some((layer) => layer.key === key);

  return before.find(stays) ?? frame.layers.at(-1).key;
}

// a refused delete changes nothing, so it leaves no step to undo
export function deleteGroup(app, group) {
  const keys = group.map((layer) => layer.key);
  let refused = false;

  restructure(app, `Delete ${namedGroup(group)}`, (draft) => {
    const frame = frameOf(draft);
    const keysThen = frame.layers.map((layer) => layer.key);
    const at = keysThen.indexOf(currentLayer(draft).key);
    const before = [keysThen[at], ...keysThen.slice(0, at).reverse(), ...keysThen.slice(at + 1)];
    const gone = removeLayers(currentAnimation(draft), frame, keys);

    refused = gone.length < keys.length;

    return { layer: inHandAfter(frame, before) };
  });

  if (refused) {
    toast('A frame keeps at least one layer of art. Use Clear to empty it.');
  }
}
