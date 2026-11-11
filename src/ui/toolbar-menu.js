import { icon, node } from './dom.js';
import { openMenu } from './menu.js';
import { openVersionsSheet } from './versions-sheet.js';
import { openCanvasSizeSheet } from './canvas-size-sheet.js';
import { openShortcuts } from './shortcuts.js';
import { canInstall, installApp } from './install-app.js';
import { FILTERS } from './toolbar-parts.js';
import { hasKeyboard } from './platform-keys.js';
import { paste } from './selection-keys.js';
import { gameOf } from '../model/presets.js';
import { isSingleView } from '../model/kinds.js';

// the board compares views, so only kinds with several have one; the preview is the pitch for a
// game played on one
export const modesFor = (project) =>
  [
    ['edit', 'Edit'],
    isSingleView(project) ? null : ['board', 'Views board'],
    ['game', gameOf(project).background === 'pitch' ? 'On the pitch' : 'Preview'],
  ].filter(Boolean);

// a phone's bar has room for one word of the workspace's name
const SHORT_NAMES = { 'Views board': 'Board', 'On the pitch': 'Pitch' };

const workspaceEntries = (app) =>
  modesFor(app.store.state.project).map(([id, label]) => [
    label,
    () => app.store.set({ mode: id }),
    { checked: app.store.state.mode === id },
  ]);

// with no keyboard this is the only way to paste; Copy is on the selection's own bar
const pasteEntry = (app) => ['Paste', () => paste(app), { disabled: !app.clipboard?.length }];

function canvasEntries(app) {
  const { showGrid } = app.store.state;

  return [
    pasteEntry(app),
    ['Fit the canvas', () => app.fitCanvas()],
    ['Pixel grid', () => app.store.set({ showGrid: !showGrid }), { checked: showGrid }],
  ];
}

// A tablet held wide has the desk's bar and no keys: Paste was nowhere on it, while the message
// at Copy said to look in this menu.
function editEntries(app) {
  const { layout, mode } = app.store.state;

  if (mode !== 'edit') {
    return [];
  }

  if (layout === 'compact') {
    return canvasEntries(app);
  }

  return hasKeyboard() ? [] : [pasteEntry(app)];
}

const filterEntries = (app) =>
  FILTERS.map(([id, label, title]) => [
    `Show as: ${label}`,
    () => app.store.set({ viewFilter: id }),
    { checked: app.store.state.viewFilter === id, title },
  ]);

// on a phone the workspaces are one button, named for the one that is open
export function workspaceButton(app) {
  const { state } = app.store;
  const [, label] = modesFor(state.project).find(([id]) => id === state.mode);

  return node(
    'button.btn.workspace-pick',
    {
      title: 'Workspace: edit, compare the views, preview in a scene',
      'aria-label': `Workspace: ${label}`,
      'aria-haspopup': 'menu',
      onclick: (event) => openMenu(event.currentTarget, workspaceEntries(app), { align: 'right' }),
    },
    node('span', {}, SHORT_NAMES[label] ?? label),
    icon('chevron-down'),
  );
}

// what the toolbar has no room for: null between two groups draws a line
function moreEntries(app) {
  const { state } = app.store;
  const groups = [
    editEntries(app),
    state.mode !== 'game' ? filterEntries(app) : [],
    [
      ['Canvas size…', () => openCanvasSizeSheet(app)],
      ['History: saved versions…', () => openVersionsSheet(app)],
      hasKeyboard() ? ['Keyboard shortcuts', () => openShortcuts(app.store.state.project)] : null,
      canInstall() ? ['Install app', () => installApp()] : null,
    ].filter(Boolean),
  ];

  return groups
    .filter((group) => group.length)
    .flatMap((group) => [null, ...group])
    .slice(1);
}

export function moreButton(app) {
  return node(
    'button.btn.quiet.icon-only.toolbar-more',
    {
      title: 'View, versions and more',
      'aria-label': 'More',
      'aria-haspopup': 'menu',
      onclick: (event) => openMenu(event.currentTarget, moreEntries(app), { align: 'right' }),
    },
    icon('more'),
  );
}
