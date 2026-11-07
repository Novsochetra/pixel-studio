import { icon, node, replace, toast } from './dom.js';
import { commit, currentAnimation, currentLayer, goTo, restructure } from './actions.js';
import { addLayer, layerStack, removeLayer } from '../model/structure.js';
import { duplicateLayer, layerBelow, mergeDown, placeLayer } from '../model/layer-ops.js';
import { layerRow, startRename } from './layer-row.js';
import { addPicture, pictureStrength } from './trace-picture.js';
import { bindFrameDrag } from './frame-drag.js';
import { arrowsMoveArt } from './selection-keys.js';

const ONE_LAYER_HINT =
  'Like sheets of glass stacked in every frame: add one for hair or a sword to draw it without touching the rest.';

// the new layer's name is ready to type, as an image editor has it
function newLayer(app, active) {
  const name = `Layer ${layerStack(currentAnimation(app.store.state)).length + 1}`;
  let key = null;
  restructure(app, 'New layer', (draft) => {
    key = addLayer(draft.project, currentAnimation(draft), { name, above: active.key });

    return { layer: key };
  });
  const label = document.querySelector(`.layer-row[data-key="${key}"] .layer-name`);

  if (label) {
    startRename(app, { key, name }, label);
  }
}

function deleteLayer(app, active) {
  restructure(app, `Delete ${active.name}`, (draft) => {
    if (!removeLayer(currentAnimation(draft), active.key)) {
      toast('Keep at least one layer of art.');
    }
  });
}

// an icon button; its name shows on hover and is read out
function tool(iconName, name, onclick, { disabled = false, title = name } = {}) {
  return node(
    'button.btn.quiet.icon-only',
    { onclick, title, 'aria-label': name, disabled },
    icon(iconName),
  );
}

function layerActions(app, active) {
  return {
    duplicate: () =>
      restructure(app, 'Duplicate layer', (draft) => ({
        layer: duplicateLayer(currentAnimation(draft), active.key),
      })),
    merge: () =>
      restructure(app, 'Merge down', (draft) => ({
        layer: mergeDown(currentAnimation(draft), active.key),
      })),
    clear: () => commit(app, 'Clear layer', [active], () => active.sprite.pixels.fill(0)),
  };
}

// grouped as an image editor's: add, then change, then (apart, at the end) take away
function layerBar(app, active) {
  const animation = currentAnimation(app.store.state);
  const { duplicate, merge, clear } = layerActions(app, active);

  return node(
    'div.layer-bar',
    { role: 'toolbar', 'aria-label': 'Layer actions' },
    node(
      'div.layer-tools',
      {},
      node(
        'button.btn.quiet',
        { onclick: () => newLayer(app, active), title: 'New layer above this one' },
        icon('plus'),
        'New layer',
      ),
      tool('picture', 'Add a picture to trace', () => addPicture(app), {
        title: 'Add a picture to trace: shown faded under your art, never in a download',
      }),
    ),
    node(
      'div.layer-tools',
      {},
      tool('duplicate', 'Duplicate layer', duplicate),
      tool(
        'merge-down',
        'Merge down into the layer below',
        merge,
        !layerBelow(animation, active.key),
      ),
    ),
    node(
      'div.layer-tools.end',
      {},
      tool('eraser', `Clear ${active.name} in this frame`, clear, {
        disabled: active.kind === 'reference',
      }),
      tool('trash', `Delete ${active.name}`, () => deleteLayer(app, active)),
    ),
  );
}

// ↑ and ↓ pick the layer above or below, as in an image editor's list
function onListKey(app, event, stack) {
  // clicking a layer focuses its row, and the arrows must still move what the tool moves
  if (arrowsMoveArt(app.store.state)) {
    return;
  }

  const step = { ArrowUp: 1, ArrowDown: -1 }[event.key];
  const at = stack.findIndex((entry) => entry.key === currentLayer(app.store.state).key);
  const next = stack[at + (step ?? 0)];

  if (step && next) {
    event.preventDefault();
    goTo(app, { layer: next.key });
  }
}

// top first, as image editors list them; a drag puts a layer anywhere in the stack
function layerList(app, stack, active) {
  const list = node(
    'div.view-list',
    {
      role: 'listbox',
      'aria-label': 'Layers, top first',
      onkeydown: (event) => onListKey(app, event, stack),
    },
    [...stack].reverse().map((entry) => layerRow(app, entry, entry.key === active.key)),
  );
  const top = stack.length - 1;

  bindFrameDrag(
    list,
    '.layer-row',
    (from, to) =>
      restructure(app, 'Move layer', (draft) => {
        placeLayer(currentAnimation(draft), stack[top - from].key, top - to);
      }),
    { axis: 'y' },
  );

  return list;
}

export function renderLayersPanel(el, app) {
  const { state } = app.store;

  // a layer name being typed is never drawn over
  if (el.querySelector('.layer-rename')) {
    return;
  }

  const stack = layerStack(currentAnimation(state));
  const active = currentLayer(state);
  const hadFocus = Boolean(document.activeElement?.closest?.('.layer-row'));

  replace(
    el,
    node('h2', { tabindex: '0' }, 'Layers'),
    stack.length < 2 ? node('p.hint', {}, ONE_LAYER_HINT) : null,
    layerList(app, stack, active),
    active.kind === 'reference' ? pictureStrength(app, active) : null,
    layerBar(app, active),
  );

  if (hadFocus) {
    el.querySelector('.layer-row[aria-selected="true"]')?.focus();
  }
}
