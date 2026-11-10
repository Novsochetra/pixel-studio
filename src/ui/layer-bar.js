import { icon, node, toast } from './dom.js';
import { commit, currentAnimation, restructure } from './actions.js';
import { addLayer, canRemoveLayer, removeLayer } from '../model/structure.js';
import { duplicateLayer, layerBelow, layerBeside, mergeDown } from '../model/layer-ops.js';
import { frameAt } from '../model/project.js';
import { renameRow } from './layer-row.js';
import { addPicture } from './trace-picture.js';

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

// a refused delete changes nothing, so it leaves no step to undo
function deleteLayer(app, active) {
  if (!canRemoveLayer(frameOf(app.store.state), active.key)) {
    toast('A frame keeps at least one layer of art. Use Clear to empty it.');

    return;
  }

  restructure(app, `Delete ${active.name}`, (draft) => {
    const frame = frameOf(draft);
    const layer = layerBeside(frame, active.key);

    removeLayer(currentAnimation(draft), frame, active.key);

    return { layer };
  });
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

// the words the actions wear on a phone, none where a pointer can hover for them
const wordsFor = (app) =>
  app.store.state.layout === 'compact'
    ? {
        picture: 'Trace',
        rename: 'Rename',
        duplicate: 'Duplicate',
        merge: 'Merge down',
        clear: 'Clear',
        trash: 'Delete',
      }
    : {};

function layerActions(app, active) {
  return {
    duplicate: () =>
      restructure(app, 'Duplicate layer', (draft) => ({
        layer: duplicateLayer(frameOf(draft), active.key),
      })),
    merge: () =>
      restructure(app, 'Merge down', (draft) => ({
        layer: mergeDown(currentAnimation(draft), frameOf(draft), active.key),
      })),
    clear: () => commit(app, 'Clear layer', [active], () => active.sprite.pixels.fill(0)),
  };
}

// what changes the layer in hand: its name (on a phone), a copy, a merge
function changeTools(app, active, words) {
  const { duplicate, merge } = layerActions(app, active);

  return node(
    'div.layer-tools',
    {},
    // a double-click on the name renames it too: a way a finger does not find
    words.rename
      ? tool('pencil', `Rename ${active.name}`, () => renameRow(app, active), {
          said: words.rename,
        })
      : null,
    tool('duplicate', 'Duplicate layer', duplicate, { said: words.duplicate }),
    tool('merge-down', 'Merge down into the layer below', merge, {
      disabled: !layerBelow(frameOf(app.store.state), active.key),
      said: words.merge,
    }),
  );
}

function removeTools(app, active, words) {
  const { clear } = layerActions(app, active);

  return node(
    'div.layer-tools.end',
    {},
    tool('eraser', `Clear ${active.name} in this frame`, clear, {
      disabled: active.kind === 'reference',
      said: words.clear,
    }),
    tool('trash', `Delete ${active.name}`, () => deleteLayer(app, active), {
      title: `Delete ${active.name} from this frame`,
      said: words.trash,
    }),
  );
}

// grouped as an image editor's: add, then change, then (apart, at the end) take away
export function layerBar(app, active) {
  const words = wordsFor(app);

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
    changeTools(app, active, words),
    removeTools(app, active, words),
  );
}
