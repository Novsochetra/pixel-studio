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
import { actionRow, fieldRow, listGroup, switchRow } from './list-group.js';

// `label` names the step in the history; `short` is the row's own word for it
const OPERATIONS = [
  {
    id: 'thin',
    label: 'Thin a doubled outline',
    short: 'Thin doubled lines',
    run: thinOutline,
    hint: 'Outer outline pixels that only back onto more outline',
  },
  {
    id: 'gaps',
    label: 'Close gaps in the outline',
    short: 'Close gaps',
    run: closeGaps,
    hint: 'Edge pixels between two outline pixels',
  },
  {
    id: 'add',
    label: 'Add an outline around everything',
    short: 'Add an outline',
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

  return fieldRow(
    'Colour',
    node(
      'select.list-select.mono',
      { id: 'outline-colour', 'aria-label': 'Outline colour', onchange: choose },
      characterColors(state).map((option) =>
        node('option', { value: String(option), selected: option === colour }, toHex(option)),
      ),
    ),
    { title: 'The outline’s colour, found on the edge of the art' },
  );
}

// An operation's row, with how many pixels it would change in this layer at its end; pointing at
// it shows them on the canvas. With every frame and view on, far more than these change.
function operationRow(app, operation, colour) {
  const { state } = app.store;
  const { count, points } =
    colour === null
      ? { count: 0, points: [] }
      : previewOutline(currentLayer(state).sprite, operation.run, colour);
  const highlight = (shown) => () => app.store.set({ highlight: shown });
  const run = () => {
    app.store.set({ highlight: null });
    apply(app, operation, colour);
  };

  return actionRow(operation.short, run, {
    // with every frame and view on far more than this layer's pixels change: no count is said
    value: state.outline.everywhere ? null : String(count),
    leads: false,
    'aria-label': `${operation.label} (${count} ${state.outline.everywhere ? 'in this layer' : 'here'})`,
    title: `${operation.hint}. Point at it to see them on the canvas.`,
    disabled: !count && !state.outline.everywhere,
    onmouseenter: highlight(points),
    onmouseleave: highlight(null),
    onfocus: highlight(points),
    onblur: highlight(null),
  });
}

function everywhereToggle(app) {
  const { state } = app.store;

  return switchRow(
    'Every frame and view',
    {
      id: 'outline-everywhere',
      checked: state.outline.everywhere,
      hint: 'Off: only the layer you are editing',
    },
    (everywhere) => {
      state.outline = { ...state.outline, everywhere };
      app.store.touch('outline');
    },
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
    listGroup({}, colourField(app, colour), everywhereToggle(app)),
    listGroup(
      {},
      OPERATIONS.map((operation) => operationRow(app, operation, colour)),
    ),
  );
}
