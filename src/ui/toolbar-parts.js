import { node, icon } from './dom.js';
import { redo, undo } from './undo.js';
import { keyNames } from './platform-keys.js';

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

const ZOOM = { least: 1, most: 24 };

// one step closer or further: a button that stops at the end of what the canvas can zoom to
function zoomStep(app, { step, name, keys, iconName }) {
  const zoom = app.store.state.zoom + step;

  return node(
    'button.btn.quiet',
    {
      title: `${name} (${keys})`,
      'aria-label': name,
      disabled: zoom < ZOOM.least || zoom > ZOOM.most,
      onclick: () => app.store.set({ zoom }),
    },
    icon(iconName),
  );
}

export function zoomControls(app) {
  const { state } = app.store;

  return node(
    'div.group',
    {},
    zoomStep(app, { step: -1, name: 'Zoom out', keys: '−', iconName: 'minus' }),
    node('span.zoom-label', {}, `${state.zoom * 100}%`),
    zoomStep(app, { step: 1, name: 'Zoom in', keys: '+', iconName: 'plus' }),
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

export const FILTERS = [
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
        title: keyNames('Undo (⌘Z)'),
        'aria-label': 'Undo',
        disabled: !app.history.canUndo,
        onclick: () => undo(app),
      },
      icon('undo'),
    ),
    node(
      'button.btn.quiet',
      {
        title: keyNames('Redo (⇧⌘Z)'),
        'aria-label': 'Redo',
        disabled: !app.history.canRedo,
        onclick: () => redo(app),
      },
      icon('redo'),
    ),
  );
}
