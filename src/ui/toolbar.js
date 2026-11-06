import { node, icon, replace } from './dom.js';
import { openDownloadMenu } from './downloads.js';
import { openVersionsSheet } from './versions-sheet.js';
import { openShortcuts } from './shortcuts.js';
import { openProjectsSheet } from './projects/projects-sheet.js';
import { saveText, undoRedo, viewFilter, zoomControls } from './toolbar-parts.js';
import { gameOf } from '../model/presets.js';
import { isSingleView } from '../model/kinds.js';

// the board compares views, so only kinds with several have one; the preview is the pitch for a
// game played on one
const modesFor = (project) =>
  [
    ['edit', 'Edit'],
    isSingleView(project) ? null : ['board', 'Views board'],
    ['game', gameOf(project).background === 'pitch' ? 'On the pitch' : 'Preview'],
  ].filter(Boolean);

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
    { title: 'Projects: switch, start a new one, rename', onclick: () => openProjectsSheet(app) },
    'PIXEL CLEAN',
    node('small', {}, `${app.store.state.project.name} ▾`),
  );
}

function endButtons(app) {
  return [
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
        onclick: openShortcuts,
      },
      '?',
    ),
    node(
      'button.btn.primary',
      { onclick: (event) => openDownloadMenu(app, event.currentTarget) },
      icon('download'),
      'Download',
    ),
  ];
}

export function renderToolbar(el, app) {
  const { state } = app.store;

  replace(
    el,
    projectButton(app),
    undoRedo(app),
    workspaces(app),
    state.mode === 'edit' ? zoomControls(app) : null,
    state.mode !== 'game' ? viewFilter(app) : null,
    node('div.spacer'),
    node(
      'span.save-status',
      { 'data-state': state.saveStatus, title: saveText(state) },
      saveText(state),
    ),
    endButtons(app),
  );
}
