import { node, replace, toast } from './dom.js';
import { allArtLayers, commit, currentLayer, directionSprite } from './actions.js';
import { isPosedBody } from '../model/body/body-kind.js';
import { refusesPaint } from './body/body-lock.js';
import {
  addOutline,
  closeGaps,
  outlineColour,
  previewOutline,
  thinOutline,
} from '../editor/outline.js';
import { toHex } from '../model/sprite.js';
import { characterColors } from './character-colours.js';

const OPERATIONS = [
  {
    id: 'thin',
    label: 'Thin a doubled outline',
    run: thinOutline,
    hint: 'Outer outline pixels that only back onto more outline',
  },
  {
    id: 'gaps',
    label: 'Close gaps in the outline',
    run: closeGaps,
    hint: 'Edge pixels between two outline pixels',
  },
  {
    id: 'add',
    label: 'Add an outline around everything',
    run: addOutline,
    hint: 'One pixel outside the whole shape',
  },
];

function apply(app, operation, colour) {
  const { state } = app.store;
  // across the character, frames posed from parts are left as their parts draw them
  const layers = state.outline.everywhere
    ? allArtLayers(state).filter((layer) => !isPosedBody(layer))
    : [currentLayer(state)];
  let count = 0;

  if (refusesPaint(layers)) {
    return;
  }

  commit(app, operation.label, layers, () =>
    layers.forEach((other) => {
      count += operation.run(other.sprite, colour);
    }),
  );
  toast(count ? `${operation.label}: ${count} pixels changed` : 'Nothing to change');
}

function colourField(app, colour) {
  const { state } = app.store;
  const choose = (event) => {
    state.outline = { ...state.outline, colour: Number(event.target.value) };
    app.store.touch('outline');
  };

  return node(
    'label.field',
    { for: 'outline-colour' },
    node('span', {}, 'Outline colour (found on the edge)'),
    node(
      'select.input.mono',
      { id: 'outline-colour', onchange: choose },
      characterColors(state).map((option) =>
        node('option', { value: String(option), selected: option === colour }, toHex(option)),
      ),
    ),
  );
}

// an operation's button, saying how many pixels it would change here; hovering shows them
function operationButton(app, operation, colour) {
  const { state } = app.store;
  const { count, points } =
    colour === null
      ? { count: 0, points: [] }
      : previewOutline(currentLayer(state).sprite, operation.run, colour);
  const highlight = (shown) => () => app.store.set({ highlight: shown });

  return node(
    'button.btn',
    {
      title: `${operation.hint}. Hover to see them on the canvas.`,
      disabled: !count && !state.outline.everywhere,
      onclick: () => {
        app.store.set({ highlight: null });
        apply(app, operation, colour);
      },
      onmouseenter: highlight(points),
      onmouseleave: highlight(null),
      onfocus: highlight(points),
      onblur: highlight(null),
    },
    // with every frame and view on, far more than these change: the count is this layer's
    `${operation.label} (${count} ${state.outline.everywhere ? 'in this layer' : 'here'})`,
  );
}

function everywhereToggle(app) {
  const { state } = app.store;
  const change = (event) => {
    state.outline = { ...state.outline, everywhere: event.target.checked };
    app.store.touch('outline');
  };

  return node(
    'label.toggle-row',
    { for: 'outline-everywhere' },
    node(
      'span',
      {},
      node('div', {}, 'Every frame and view'),
      node('div.hint', {}, 'Off: only the layer you are editing'),
    ),
    node('input.switch', {
      type: 'checkbox',
      role: 'switch',
      id: 'outline-everywhere',
      checked: state.outline.everywhere,
      onchange: change,
    }),
  );
}

export function renderOutlinePanel(el, app) {
  const { state } = app.store;
  const detected = outlineColour(directionSprite(state, state.at.direction));

  state.outline ??= { colour: null, everywhere: false };
  // a colour picked before stays only while the art still has it: the field lists the art's own
  const picked = characterColors(state).includes(state.outline.colour)
    ? state.outline.colour
    : null;
  const colour = picked ?? detected;

  replace(
    el,
    node('h2', { tabindex: '0' }, 'Outline'),
    colourField(app, colour),
    OPERATIONS.map((operation) => operationButton(app, operation, colour)),
    everywhereToggle(app),
  );
}
