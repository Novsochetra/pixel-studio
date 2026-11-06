import { node, replace } from './dom.js';
import { commit, currentLayer } from './actions.js';
import { clearSelected, liftPixels, transformSelected } from '../editor/selection.js';

const ACTIONS = [
  ['flip-x', 'Flip ↔', 'Flip the selection left to right'],
  ['flip-y', 'Flip ↕', 'Flip the selection upside down'],
  ['rotate-ccw', '⟲ 90°', 'Turn the selection a quarter left'],
  ['rotate-cw', '⟳ 90°', 'Turn the selection a quarter right'],
];

// Shown over the canvas while something is selected: turn, flip, copy, delete, let go.
export function renderSelectionBar(el, app) {
  const { state } = app.store;

  if (!state.selection) {
    replace(el);
    el.hidden = true;

    return;
  }

  const layer = currentLayer(state);
  const transform = (kind, label) => {
    let selection = state.selection;
    commit(app, label, [layer], () => {
      selection = transformSelected(layer.sprite, selection, kind);
    });
    app.store.set({ selection });
  };
  el.hidden = false;
  replace(
    el,
    ACTIONS.map(([kind, label, title]) =>
      node(
        'button.btn.quiet',
        { title, onclick: () => transform(kind, title.split(' the')[0]) },
        label,
      ),
    ),
    node(
      'button.btn.quiet',
      {
        title: 'Copy (⌘C); paste in any frame with ⌘V',
        onclick: () => {
          app.clipboard = liftPixels(layer.sprite, state.selection);
        },
      },
      'Copy',
    ),
    node(
      'button.btn.quiet',
      {
        title: 'Erase the selected pixels (Delete)',
        onclick: () =>
          commit(app, 'Delete', [layer], () => clearSelected(layer.sprite, state.selection)),
      },
      'Delete',
    ),
    node(
      'button.btn.quiet',
      { title: 'Let go of the selection (Esc)', onclick: () => app.store.set({ selection: null }) },
      'Done',
    ),
  );
}
