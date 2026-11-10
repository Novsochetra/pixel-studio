import { node, icon, replace } from './dom.js';
import { openDownloadMenu } from './downloads.js';
import { openVersionsSheet } from './versions-sheet.js';
import { openShortcuts } from './shortcuts.js';
import { canInstall, installApp } from './install-app.js';
import { openProjectsSheet } from './projects/projects-sheet.js';
import { saveText, undoRedo, viewFilter, zoomControls } from './toolbar-parts.js';
import { modesFor, moreButton, workspaceButton } from './toolbar-menu.js';

function workspaces(app) {
  const { state } = app.store;

  return node(
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
}

function projectButton(app) {
  return node(
    'button.wordmark',
    {
      title: 'Projects: switch, start a new one, line them up',
      onclick: () => openProjectsSheet(app),
    },
    node('span.wordmark-brand', {}, 'PIXEL CLEAN'),
    node('small', {}, `${app.store.state.project.name} ▾`),
  );
}

function installButton() {
  return node(
    'button.btn.quiet',
    {
      title: 'Install Pixel Clean: it opens in its own window and works with no network',
      'aria-label': 'Install app',
      onclick: installApp,
    },
    icon('plus'),
    node('span.btn-text', {}, 'Install'),
  );
}

const wideButtons = (app) => [
  canInstall() ? installButton() : null,
  node(
    'button.btn.quiet',
    { title: 'Saved versions', 'aria-label': 'History', onclick: () => openVersionsSheet(app) },
    icon('history'),
    node('span.btn-text', {}, 'History'),
  ),
  node(
    'button.btn.quiet',
    {
      title: 'Keyboard shortcuts (?)',
      'aria-label': 'Keyboard shortcuts',
      onclick: () => openShortcuts(app.store.state.project),
    },
    '?',
  ),
];

function downloadButton(app) {
  return node(
    'button.btn.primary.toolbar-download',
    {
      'aria-label': 'Download',
      title: 'Download: sprite sheets, PNGs, GIFs, the project file',
      onclick: (event) => openDownloadMenu(app, event.currentTarget),
    },
    icon('download'),
    node('span.btn-label', {}, 'Download'),
  );
}

// a narrower window keeps one row: what does not fit waits in the More menu
export function renderToolbar(el, app) {
  const { state } = app.store;
  const { layout } = state;

  // the browser's tab says whose work it holds
  document.title = `${state.project.name} · Pixel Clean Studio`;
  replace(
    el,
    projectButton(app),
    undoRedo(app),
    layout !== 'compact' ? workspaces(app) : null,
    layout !== 'compact' && state.mode === 'edit' ? zoomControls(app) : null,
    layout === 'wide' && state.mode !== 'game' ? viewFilter(app) : null,
    node('div.spacer'),
    node(
      'span.save-status',
      { 'data-state': state.saveStatus, title: saveText(state) },
      saveText(state),
    ),
    layout === 'compact' ? workspaceButton(app) : null,
    layout === 'wide' ? wideButtons(app) : moreButton(app),
    downloadButton(app),
  );
}
