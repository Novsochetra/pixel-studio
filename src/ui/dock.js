import { icon, node, replace } from './dom.js';
import { toHex } from '../model/sprite.js';

// what the dock opens, and the workspaces each belongs to: frames and the brush are for drawing
const PANELS = [
  { id: 'frames', label: 'Frames', iconName: 'frames', modes: ['edit'] },
  { id: 'colours', label: 'Colours', modes: ['edit', 'board'] },
  { id: 'brush', label: 'Brush', iconName: 'brush', modes: ['edit'] },
  { id: 'layers', label: 'Layers', iconName: 'layers', modes: ['edit', 'board'] },
  { id: 'outline', label: 'Outline', iconName: 'outline', modes: ['edit', 'board'] },
  { id: 'guides', label: 'Guides', iconName: 'guides', modes: ['edit', 'board'] },
];

const panelsFor = (mode) => PANELS.filter((panel) => panel.modes.includes(mode));

// the panel that is open, if this workspace has it
export function openPanel(state) {
  const open =
    state.layout === 'compact' && panelsFor(state.mode).some((panel) => panel.id === state.panel);

  return open ? state.panel : null;
}

// the colour in hand shows on its tab, so it is in sight with every panel shut
const tabMark = (panel, state) =>
  panel.id === 'colours'
    ? node('span.dock-swatch', { style: { background: toHex(state.color) } })
    : icon(panel.iconName);

function tab(app, panel, open) {
  return node(
    'button.dock-tab',
    {
      'aria-pressed': String(open === panel.id),
      'aria-expanded': String(open === panel.id),
      onclick: () => app.store.set({ panel: open === panel.id ? null : panel.id }),
    },
    tabMark(panel, app.store.state),
    node('span', {}, panel.label),
  );
}

// On a phone the frames and the inspector's panels wait here, one open at a time over the bottom
// of the canvas, so the canvas keeps the screen.
export function renderDock(el, app) {
  const { state } = app.store;
  const panels = state.layout === 'compact' ? panelsFor(state.mode) : [];
  const open = openPanel(state);

  const frame = el.closest('.app');

  el.hidden = !panels.length;

  // another panel opens at its top, not where the last one was scrolled to
  if (frame.dataset.panel !== (open ?? '')) {
    frame.dataset.panel = open ?? '';
    frame.querySelector('.inspector').scrollTop = 0;
  }

  replace(
    el,
    panels.map((panel) => tab(app, panel, open)),
  );
}
