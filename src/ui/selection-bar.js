import { node, replace } from './dom.js';
import { commit, currentLayer } from './actions.js';
import { clearSelected, liftPixels, transformSelected } from '../editor/selection.js';
import { keyNames } from './platform-keys.js';

const ACTIONS = [
  ['flip-x', 'Flip ↔', 'Flip the selection left to right'],
  ['flip-y', 'Flip ↕', 'Flip the selection upside down'],
  ['rotate-ccw', '⟲ 90°', 'Turn the selection a quarter left'],
  ['rotate-cw', '⟳ 90°', 'Turn the selection a quarter right'],
];

function transform(app, kind, label) {
  const layer = currentLayer(app.store.state);
  let selection = app.store.state.selection;

  commit(app, label, [layer], () => {
    selection = transformSelected(layer.sprite, selection, kind);
  });
  app.store.set({ selection });
}

function copySelected(app) {
  const { state } = app.store;

  app.clipboard = liftPixels(currentLayer(state).sprite, state.selection);
}

function eraseSelected(app) {
  const { state } = app.store;
  const layer = currentLayer(state);

  commit(app, 'Delete', [layer], () => clearSelected(layer.sprite, state.selection));
}

const button = (title, onclick, label) => node('button.btn.quiet', { title, onclick }, label);

// Shown over the canvas while something is selected: turn, flip, copy, delete, let go.
export function renderSelectionBar(el, app) {
  el.hidden = !app.store.state.selection;

  if (el.hidden) {
    replace(el);

    return;
  }

  replace(
    el,
    ACTIONS.map(([kind, label, title]) =>
      button(title, () => transform(app, kind, title.split(' the')[0]), label),
    ),
    button(keyNames('Copy (⌘C); paste in any frame with ⌘V'), () => copySelected(app), 'Copy'),
    button('Erase the selected pixels (Delete)', () => eraseSelected(app), 'Delete'),
    button('Let go of the selection (Esc)', () => app.store.set({ selection: null }), 'Done'),
  );
}
