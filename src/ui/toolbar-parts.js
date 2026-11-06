import { node, icon } from './dom.js';
import { redo, undo } from './actions.js';

const SAVE_TEXT = {
  pending: 'Edited',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved',
};

export function saveText(state) {
  const where =
    { account: 'to your account', browser: 'in this browser', none: '' }[state.storage] ?? '';

  if (state.storage === 'none') {
    return 'Not saved: download a project file to keep your work';
  }

  return state.saveStatus === 'saved' ? `Saved ${where}` : (SAVE_TEXT[state.saveStatus] ?? '');
}

export function zoomControls(app) {
  const { state } = app.store;
  const setZoom = (zoom) => app.store.set({ zoom: Math.max(1, Math.min(24, zoom)) });

  return node(
    'div.group',
    {},
    node(
      'button.btn.quiet',
      { title: 'Zoom out (−)', 'aria-label': 'Zoom out', onclick: () => setZoom(state.zoom - 1) },
      icon('minus'),
    ),
    node('span.zoom-label', {}, `${state.zoom * 100}%`),
    node(
      'button.btn.quiet',
      { title: 'Zoom in (+)', 'aria-label': 'Zoom in', onclick: () => setZoom(state.zoom + 1) },
      icon('plus'),
    ),
    node(
      'button.btn.quiet',
      { title: 'Fit the canvas in the window', onclick: app.fitCanvas },
      'Fit',
    ),
    node(
      `button.btn.quiet${state.showGrid ? '.on' : ''}`,
      {
        title: 'Pixel grid',
        'aria-label': 'Pixel grid',
        'aria-pressed': String(state.showGrid),
        onclick: () => app.store.set({ showGrid: !state.showGrid }),
      },
      icon('grid'),
    ),
  );
}

const FILTERS = [
  ['colour', 'Colour', 'The art as it is'],
  ['silhouette', 'Silhouette', 'One flat shape: does the pose read?'],
  ['grey', 'Grey', 'Light and dark only: is there enough contrast?'],
];

export function viewFilter(app) {
  const { state } = app.store;

  return node(
    'div.segmented',
    { role: 'group', 'aria-label': 'Show the art as' },
    FILTERS.map(([id, label, title]) =>
      node(
        'button',
        {
          'aria-pressed': String(state.viewFilter === id),
          title,
          onclick: () => app.store.set({ viewFilter: id }),
        },
        label,
      ),
    ),
  );
}

export function undoRedo(app) {
  return node(
    'div.group',
    {},
    node(
      'button.btn.quiet',
      {
        title: 'Undo (⌘Z)',
        'aria-label': 'Undo',
        disabled: !app.history.canUndo,
        onclick: () => undo(app),
      },
      icon('undo'),
    ),
    node(
      'button.btn.quiet',
      {
        title: 'Redo (⇧⌘Z)',
        'aria-label': 'Redo',
        disabled: !app.history.canRedo,
        onclick: () => redo(app),
      },
      icon('redo'),
    ),
  );
}
