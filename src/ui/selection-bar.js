import { node, replace, toast } from './dom.js';
import { commit, commitSelected, currentLayer } from './actions.js';
import { liftPixels, selectionBox, transformSelected } from '../editor/selection.js';
import { eraseSelection } from '../editor/floating.js';
import { hasKeyboard, keyNames } from './platform-keys.js';
import { selectionAngle, turnSelectionTo } from './selection-turn.js';
import { modeControls, syncModes } from './selection-modes.js';

const ACTIONS = [
  ['flip-x', 'Flip ↔', 'Flip the selection left to right'],
  ['flip-y', 'Flip ↕', 'Flip the selection upside down'],
  ['rotate-ccw', '⟲ 90°', 'Turn the selection a quarter left'],
  ['rotate-cw', '⟳ 90°', 'Turn the selection a quarter right'],
];

function transform(app, kind, label) {
  const layer = currentLayer(app.store.state);
  let selection = app.store.state.selection;

  commitSelected(app, label, [layer], () => {
    selection = transformSelected(layer.sprite, selection, kind);
  });
  app.store.set({ selection });
}

function copySelected(app) {
  const { state } = app.store;

  app.clipboard = liftPixels(currentLayer(state).sprite, state.selection);
  toast(
    hasKeyboard()
      ? keyNames('Copied. Paste it in any frame with ⌘V.')
      : 'Copied. Paste is in the More menu, in any frame.',
  );
}

function eraseSelected(app) {
  const { state } = app.store;
  const layer = currentLayer(state);

  commit(app, 'Delete', [layer], () => eraseSelection(layer.sprite, state.selection));
}

function angleField(app) {
  return node(
    'label.pose-angle',
    { title: 'How far the selection is turned, in degrees: or drag the handle above it' },
    node('input.input.mono', {
      id: 'selection-angle',
      type: 'number',
      step: '1',
      'aria-label': 'Selection angle',
      value: String(selectionAngle(app.store.state)),
      // what was typed is shown as the angle it came to: 1000 is 80 short of three turns
      onchange: (event) => {
        turnSelectionTo(app, Number(event.target.value) || 0);
        event.target.value = String(selectionAngle(app.store.state));
      },
      // Enter and Esc give the keys back to the editor: left in the field, undo and the tools'
      // keys were typed into it, and Esc let nothing go
      onkeydown: (event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.stopPropagation();
          event.target.blur();
        }
      },
    }),
    '°',
  );
}

const button = (title, onclick, label) => node('button.btn.quiet', { title, onclick }, label);

// On a phone the bar lies over one end of the canvas: the end the selection is not in, so it
// never hides the pixels it acts on. A selection all over the canvas leaves it by the thumb.
export function barSide(box, canvas) {
  return (box.top + box.bottom) / 2 > canvas.height * 0.55 ? 'top' : 'bottom';
}

// not while it is dragged: the bar would jump from under the finger's way
function placeBar(el, app) {
  const { selection, project } = app.store.state;
  const box = selectionBox(selection);

  if (box && !app.dragging) {
    el.dataset.side = barSide(box, project.canvas);
  }
}

// where the bar is one row that scrolls, whether more of it waits behind Done
function markMore(el) {
  el.dataset.more = String(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
}

// Shown over the canvas while something is selected: turn, flip, copy, delete, let go.
export function renderSelectionBar(el, app) {
  el.hidden = !app.store.state.selection;

  if (el.hidden) {
    // with the selection let go, the next loop starts a new one
    app.store.state.lassoMode = 'new';
    replace(el);

    return;
  }

  placeBar(el, app);

  const angle = el.querySelector('#selection-angle');

  // Already showing: only the angle is brought up to date. Drawn again, the button being
  // clicked as the angle field lost focus would be gone before the click landed.
  if (angle) {
    if (document.activeElement !== angle) {
      angle.value = String(selectionAngle(app.store.state));
    }

    syncModes(el, app);
    markMore(el);

    return;
  }

  replace(
    el,
    angleField(app),
    ACTIONS.map(([kind, label, title]) =>
      button(title, () => transform(app, kind, title.split(' the')[0]), label),
    ),
    button(keyNames('Copy (⌘C); paste in any frame with ⌘V'), () => copySelected(app), 'Copy'),
    button('Erase the selected pixels (Delete)', () => eraseSelected(app), 'Delete'),
    modeControls(app),
    node(
      'button.btn.primary.selection-done',
      { title: 'Let go of the selection (Esc)', onclick: () => app.store.set({ selection: null }) },
      'Done',
    ),
  );
  syncModes(el, app);
  el.onscroll = () => markMore(el);
  markMore(el);
}
