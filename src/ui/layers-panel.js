import { node, replace } from './dom.js';
import { currentLayer, goTo, restructure } from './actions.js';
import { placeLayer } from '../model/layer-ops.js';
import { frameOf, layerBar } from './layer-bar.js';
import { layerRow } from './layer-row.js';
import { layersToMove } from './layer-move.js';
import { pictureStrength } from './trace-picture.js';
import { bindFrameDrag } from './frame-drag.js';
import { arrowsMoveArt } from './selection-keys.js';
import { forHands, hasKeyboard, keyNames } from './platform-keys.js';
import { listGroup, switchRow } from './list-group.js';

const ONE_LAYER_HINT = 'Add a layer for hair or a sword, to draw it without touching the rest.';

// where a key leads in the stack (0 is the bottom, drawn last in the list)
const leadsTo = (key, at, top) => ({ ArrowUp: at + 1, ArrowDown: at - 1, Home: top, End: 0 })[key];

// ↑ and ↓ pick the layer above or below, as in an image editor's list, and Home and End the top
// and the bottom one. With Alt they move the layer there: a drag was the only way to, and the
// keys had none. Home and End scrolled the panel from under the row instead.
function onListKey(app, event, stack) {
  // clicking a layer focuses its row, and the arrows must still move what the tool moves
  if (arrowsMoveArt(app.store.state)) {
    return;
  }

  const at = stack.findIndex((entry) => entry.key === currentLayer(app.store.state).key);
  const to = leadsTo(event.key, at, stack.length - 1);

  if (to === undefined || !stack[to]) {
    return;
  }

  event.preventDefault();

  if (event.altKey) {
    restructure(app, 'Move layer', (draft) => placeLayer(frameOf(draft), stack[at].key, to));
  } else {
    goTo(app, { layer: stack[to].key });
  }
}

// what holding ⌘ does to a click on a layer, for hands with no ⌘ to hold
const pickSeveral = (app) =>
  listGroup(
    {},
    switchRow(
      'Pick several',
      {
        id: 'pick-several',
        checked: app.store.state.pickSeveral,
        hint: keyNames(
          `Each layer ${forHands('clicked', 'tapped')} joins the others, to move or turn together${forHands(', as ⌘click does', '')}`,
        ),
      },
      (on) => app.store.set({ pickSeveral: on }),
    ),
  );

const PICKED_HINT = forHands(
  'Drag their art or use the arrow keys to move them, or the handle to turn them.',
  'With Move in hand, drag their art to move them, or the handle to turn them.',
);

// top first, as image editors list them; a drag puts a layer anywhere in the stack
function layerList(app, stack, active) {
  const group = layersToMove(app.store.state);
  const list = node(
    'div.view-list.layer-list',
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

// a finger's drag scrolls the list, so a layer is held before it is dragged: nothing said so
const HOLD_HINT = 'Hold a layer, then drag it, to move it up or down.';

// what a list of more than one layer has under it
const forSeveral = (app, picked) => [
  hasKeyboard() ? null : node('p.hint.for-fingers', {}, HOLD_HINT),
  pickSeveral(app),
  picked > 1 ? node('p.hint', {}, `${picked} layers picked. ${PICKED_HINT}`) : null,
];

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
    stack.length > 1 ? forSeveral(app, picked) : null,
    active.kind === 'reference' ? pictureStrength(app, active) : null,
    layerBar(app, active),
  );

  if (hadFocus) {
    el.querySelector('.layer-row[aria-current="true"]')?.focus();
  }
}
