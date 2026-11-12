import { node, icon, replace, toast } from './dom.js';
import { openDownloadMenu } from './downloads.js';
import { openVersionsSheet } from './versions-sheet.js';
import { openShortcuts } from './shortcuts.js';
import { canInstall, installApp } from './install-app.js';
import { openProjectsSheet } from './projects/projects-sheet.js';
import { saveText, undoRedo, viewFilter, zoomControls } from './toolbar-parts.js';
import { moreButton } from './toolbar-menu.js';
import { hasKeyboard } from './platform-keys.js';
import { paste } from './selection-keys.js';

function projectButton(app) {
  return node(
    'button.wordmark',
    {
      // named, so the keys come back to it when the project's name changed in the window
      id: 'projects-button',
      title: 'Projects: switch, start a new one, line them up',
      onclick: () => openProjectsSheet(app),
    },
    node('span.wordmark-brand', {}, 'PIXEL CLEAN'),
    node(
      'span.wordmark-project',
      {},
      node('small', {}, app.store.state.project.name),
      icon('chevron-down'),
    ),
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

// the widest bar has no More menu: a tablet that wide, with no keys, pastes from the bar
const pasteButton = (app) =>
  !hasKeyboard() && app.clipboard?.length
    ? node(
        'button.btn.quiet',
        { title: 'Paste what was copied, in this frame', onclick: () => paste(app) },
        'Paste',
      )
    : null;

const wideButtons = (app) => [
  pasteButton(app),
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

// A narrow bar shows the words as a dot, and a finger has no pointer to hover it for them: a tap
// says them.
const saveStatus = (state) =>
  node(
    'span.save-status',
    {
      'data-state': state.saveStatus,
      title: saveText(state),
      onclick: () => toast(saveText(state)),
    },
    saveText(state),
  );

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
    layout !== 'compact' ? zoomControls(app) : null,
    layout === 'wide' ? viewFilter(app) : null,
    node('div.spacer'),
    saveStatus(state),
    layout === 'wide' ? wideButtons(app) : moreButton(app),
    downloadButton(app),
  );
}
