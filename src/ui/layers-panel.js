import { node, replace } from './dom.js';
import { currentLayer, goTo, restructure } from './actions.js';
import { placeLayer } from '../model/layer-ops.js';
import { frameOf, layerBar } from './layer-bar.js';
import { layerRow } from './layer-row.js';
import { layersToMove } from './layer-move.js';
import { pictureStrength } from './trace-picture.js';
import { bindFrameDrag } from './frame-drag.js';
import { arrowsMoveArt } from './selection-keys.js';
import { forHands, keyNames } from './platform-keys.js';
import { toggle } from './toggle-row.js';

const ONE_LAYER_HINT =
  'Like sheets of glass stacked in this frame: add one for hair or a sword to draw it without touching the rest. Duplicate the frame to take its layers along.';

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

// what holding ⌘ does to a click on a layer, for hands with no ⌘ to hold
const pickSeveral = (app) =>
  toggle(
    {
      id: 'pick-several',
      label: 'Pick several',
      hint: keyNames(
        `Each layer ${forHands('clicked', 'tapped')} joins the others, to move or turn together${forHands(', as ⌘click does', '')}`,
      ),
    },
    app.store.state.pickSeveral,
    (on) => app.store.set({ pickSeveral: on }),
  );

const PICKED_HINT = forHands(
  'Drag their art or use the arrow keys to move them, or the handle to turn them.',
  'With Move in hand, drag their art to move them, or the handle to turn them.',
);

// top first, as image editors list them; a drag puts a layer anywhere in the stack
function layerList(app, stack, active) {
  const group = layersToMove(app.store.state);
  const list = node(
    'div.view-list',
    {
      role: 'listbox',
      'aria-label': 'Layers, top first',
      'aria-multiselectable': 'true',
      onkeydown: (event) => onListKey(app, event, stack),
    },
    [...stack]
      .reverse()
      .map((entry) =>
        layerRow(app, entry, { active: entry.key === active.key, picked: group.includes(entry) }),
      ),
  );
  const top = stack.length - 1;

  bindFrameDrag(
    list,
    '.layer-row',
    (from, to) =>
      restructure(app, 'Move layer', (draft) => {
        placeLayer(frameOf(draft), stack[top - from].key, top - to);
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

  const stack = frameOf(state).layers;
  const active = currentLayer(state);
  const picked = layersToMove(state).length;
  // The row itself: a control inside it (its eye) keeps the keys where it stood, as any control
  // of the page does. Sent to the row, a second Enter on the eye did nothing.
  const hadFocus = Boolean(document.activeElement?.matches?.('.layer-row'));

  replace(
    el,
    node('h2', { tabindex: '0' }, 'Layers'),
    stack.length < 2 ? node('p.hint', {}, ONE_LAYER_HINT) : null,
    layerList(app, stack, active),
    stack.length > 1 ? pickSeveral(app) : null,
    picked > 1 ? node('p.hint', {}, `${picked} layers picked. ${PICKED_HINT}`) : null,
    active.kind === 'reference' ? pictureStrength(app, active) : null,
    layerBar(app, active),
  );

  if (hadFocus) {
    el.querySelector('.layer-row[aria-current="true"]')?.focus();
  }
}
