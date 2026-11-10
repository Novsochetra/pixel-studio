import { node } from './dom.js';
import { forHands } from './platform-keys.js';
import { currentLayer } from './actions.js';
import { colourSelection } from '../editor/selection.js';

// What Shift and Alt do to a selection, as buttons on its bar: fingers have no keys to hold.
// The Lasso's next loop adds to the selection or takes away from it; Select a colour reaches
// every pixel of the colour, not only the ones that touch.
const MODES = [
  ['add', 'Add', 'The next loop adds to the selection', ' (or hold Shift)'],
  ['remove', 'Take away', 'The next loop takes away from the selection', ' (or hold Alt)'],
];

function modeButton(app, [mode, label, title, keys]) {
  return node(
    'button.btn.quiet',
    {
      title: forHands(title + keys, title),
      'data-mode': mode,
      'aria-pressed': 'false',
      // for the next loop only; pressed again before it, that loop starts a new selection
      onclick: () =>
        app.store.set({ lassoMode: app.store.state.lassoMode === mode ? 'new' : mode }),
    },
    label,
  );
}

function selectEverywhere(app) {
  const { state } = app.store;
  const { cells, width } = state.selection;
  const first = cells.findIndex(Boolean);

  if (first >= 0) {
    const sprite = currentLayer(state).sprite;

    app.store.set({
      selection: colourSelection(sprite, first % width, Math.floor(first / width), true),
    });
  }
}

export function modeControls(app) {
  return [
    ...MODES.map((mode) => modeButton(app, mode)),
    node(
      'button.btn.quiet',
      {
        title: forHands(
          'Select every pixel of this colour, wherever it is (or Shift-click)',
          'Select every pixel of this colour, wherever it is',
        ),
        'data-mode': 'everywhere',
        onclick: () => selectEverywhere(app),
      },
      'Everywhere',
    ),
  ];
}

// each shows with the tool it is for, and Add or Take away wears which of them is on
export function syncModes(el, app) {
  const { tool, lassoMode } = app.store.state;

  for (const button of el.querySelectorAll('[data-mode]')) {
    const { mode } = button.dataset;
    const on = mode === lassoMode;

    button.hidden = tool !== (mode === 'everywhere' ? 'wand' : 'lasso');
    button.classList.toggle('on', on);

    if (mode !== 'everywhere') {
      button.setAttribute('aria-pressed', String(on));
    }
  }
}
