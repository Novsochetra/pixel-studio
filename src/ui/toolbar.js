import { node, icon, replace } from './dom.js';
import { redo, undo } from './actions.js';
import { openDownloadMenu } from './downloads.js';
import { openVersionsSheet } from './versions-sheet.js';
import { openShortcuts } from './shortcuts.js';
import { openProjectsSheet } from './projects-sheet.js';
import { profileOf } from '../model/profiles.js';

// the preview is a football pitch for Naga Eleven projects, a plain scene for any other game
const modesFor = (project) => [
  ['edit', 'Edit'],
  ['board', 'Views board'],
  ['game', profileOf(project).preview === 'pitch' ? 'On the pitch' : 'Preview'],
];

const SAVE_TEXT = {
  pending: 'Edited',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved',
};

function saveText(state) {
  const where =
    { account: 'to your account', browser: 'in this browser', none: '' }[state.storage] ?? '';

  if (state.storage === 'none') {
    return 'Not saved: download a project file to keep your work';
  }

  return state.saveStatus === 'saved' ? `Saved ${where}` : (SAVE_TEXT[state.saveStatus] ?? '');
}

function zoomControls(app) {
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

function viewFilter(app) {
  const { state } = app.store;

  return node(
    'div.segmented',
    { role: 'group', 'aria-label': 'Show the art as' },
    [
      ['colour', 'Colour'],
      ['silhouette', 'Silhouette'],
      ['grey', 'Grey'],
    ].map(([id, label]) =>
      node(
        'button',
        {
          'aria-pressed': String(state.viewFilter === id),
          title:
            id === 'silhouette'
              ? 'One flat shape: does the pose read?'
              : id === 'grey'
                ? 'Light and dark only: is there enough contrast?'
                : 'The art as it is',
          onclick: () => app.store.set({ viewFilter: id }),
        },
        label,
      ),
    ),
  );
}

export function renderToolbar(el, app) {
  const { state } = app.store;
  const modes = node(
    'div.segmented',
    { role: 'group', 'aria-label': 'Workspace' },
    modesFor(state.project).map(([id, label]) =>
      node(
        'button',
        { 'aria-pressed': String(state.mode === id), onclick: () => app.store.set({ mode: id }) },
        label,
      ),
    ),
  );

  replace(
    el,
    node(
      'button.wordmark',
      { title: 'Projects: switch, start a new one, rename', onclick: () => openProjectsSheet(app) },
      'PIXEL CLEAN',
      node('small', {}, `${state.project.name} ▾`),
    ),
    node(
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
    ),
    modes,
    state.mode === 'edit' ? zoomControls(app) : null,
    state.mode !== 'game' ? viewFilter(app) : null,
    node('div.spacer'),
    node('span.save-status', { 'data-state': state.saveStatus }, saveText(state)),
    node(
      'button.btn.quiet',
      { title: 'Saved versions', onclick: () => openVersionsSheet(app) },
      icon('history'),
      'History',
    ),
    node(
      'button.btn.quiet',
      {
        title: 'Keyboard shortcuts (?)',
        'aria-label': 'Keyboard shortcuts',
        onclick: () => openShortcuts(),
      },
      '?',
    ),
    node(
      'button.btn.primary',
      { onclick: (event) => openDownloadMenu(app, event.currentTarget) },
      icon('download'),
      'Download',
    ),
  );
}
