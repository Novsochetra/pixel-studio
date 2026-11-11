import { icon, node } from './dom.js';
import { currentAnimation, restructure } from './actions.js';
import {
  clearLayers,
  deleteGroup,
  duplicateGroup,
  mergeGroup,
  namedGroup,
} from './layer-group-actions.js';
import { layersToMove } from './layer-move.js';
import { addLayer } from '../model/structure.js';
import { layerBelow, mergeDown } from '../model/layer-ops.js';
import { mergeableLayers } from '../model/layer-pick.js';
import { frameAt } from '../model/project.js';
import { renameRow } from './layer-row.js';
import { addPicture } from './trace-picture.js';
import { hasKeyboard } from './platform-keys.js';

export const frameOf = (state) => frameAt(state.project, state.at);

// the first number free, as one deleted from the middle leaves a gap
function freeLayerName(frame) {
  const taken = new Set(frame.layers.map((layer) => layer.name));
  let number = frame.layers.length + 1;

  while (taken.has(`Layer ${number}`)) {
    number += 1;
  }

  return `Layer ${number}`;
}

// the new layer's name is ready to type, as an image editor has it
function newLayer(app, active) {
  const name = freeLayerName(frameOf(app.store.state));
  let key = null;
  restructure(app, 'New layer', (draft) => {
    key = addLayer(draft.project, frameOf(draft), { name, above: active.key });

    return { layer: key };
  });
  renameRow(app, { key, name });
}

// An icon button; its name shows on hover and is read out. A phone has no hover: there the
// button says what it does, in a word (`said`).
function tool(iconName, name, onclick, { disabled = false, title = name, said = null } = {}) {
  return node(
    `button.btn.quiet${said ? '' : '.icon-only'}`,
    { onclick, title, 'aria-label': name, disabled },
    icon(iconName),
    said,
  );
}

// the words the actions wear under fingers, none where a pointer can hover for them
const wordsFor = (app) =>
  app.store.state.layout === 'compact' || !hasKeyboard()
    ? {
        picture: 'Trace',
        rename: 'Rename',
        duplicate: 'Duplicate',
        merge: 'Merge down',
        clear: 'Clear',
        trash: 'Delete',
      }
    : {};

const mergeDownFrom = (app, active) =>
  restructure(app, 'Merge down', (draft) => ({
    layer: mergeDown(currentAnimation(draft), frameOf(draft), active.key),
  }));

// the layer in hand goes down onto the one below; several picked together become one
function mergeTool(app, { active, group }, words) {
  if (group.length > 1) {
    const can = mergeableLayers(group).length > 0;

    return tool('merge-down', `Merge ${namedGroup(group)} into one`, () => mergeGroup(app, group), {
      disabled: !can,
      title: can ? undefined : 'Only layers of art that are shown merge: show them all first',
      said: words.merge && 'Merge',
    });
  }

  return tool('merge-down', 'Merge down into the layer below', () => mergeDownFrom(app, active), {
    disabled: !layerBelow(frameOf(app.store.state), active.key),
    said: words.merge,
  });
}

// what changes the layers picked: a name (on a phone), a copy, a merge of the one in hand
function changeTools(app, { active, group }, words) {
  const many = group.length > 1;

  return node(
    'div.layer-tools',
    {},
    // a double-click on the name renames it too: a way a finger does not find
    words.rename
      ? tool('pencil', `Rename ${active.name}`, () => renameRow(app, active), {
          said: words.rename,
        })
      : null,
    tool(
      'duplicate',
      many ? `Duplicate ${namedGroup(group)}` : 'Duplicate layer',
      () => duplicateGroup(app, group),
      { said: words.duplicate },
    ),
    mergeTool(app, { active, group }, words),
  );
}

function removeTools(app, group, words) {
  const named = namedGroup(group);

  return node(
    'div.layer-tools.end',
    {},
    tool('eraser', `Clear ${named} in this frame`, () => clearLayers(app, group), {
      disabled: group.every((layer) => layer.kind === 'reference'),
      said: words.clear,
    }),
    tool('trash', `Delete ${named}`, () => deleteGroup(app, group), {
      title: `Delete ${named} from this frame`,
      said: words.trash,
    }),
  );
}

// grouped as an image editor's: add, then change, then (apart, at the end) take away
export function layerBar(app, active) {
  const words = wordsFor(app);
  const group = layersToMove(app.store.state);

  return node(
    'div.layer-bar',
    { role: 'toolbar', 'aria-label': 'Layer actions' },
    node(
      'div.layer-tools',
      {},
      node(
        'button.btn.quiet',
        { onclick: () => newLayer(app, active), title: 'New layer above this one, in this frame' },
        icon('plus'),
        'New layer',
      ),
      tool('picture', 'Add a picture to trace', () => addPicture(app), {
        title: 'Add a picture to trace in this frame: shown faded under your art, never downloaded',
        said: words.picture,
      }),
    ),
    changeTools(app, { active, group }, words),
    removeTools(app, group, words),
  );
}
