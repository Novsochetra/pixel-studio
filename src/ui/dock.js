import { icon, node, replace } from './dom.js';
import { openPanel, panelsFor } from './panels.js';
import { panelHead } from './panel-sheet.js';
import { toHex } from '../model/sprite.js';

// the colour in hand shows on its tab, so it is in sight with every panel shut
const tabMark = (panel, state) =>
  panel.id === 'colours'
    ? node('span.dock-swatch', { style: { background: toHex(state.color) } })
    : icon(panel.iconName);

function tab(app, panel, open) {
  return node(
    'button.dock-tab',
    {
      'data-panel': panel.id,
      'aria-label': panel.label,
      'aria-pressed': String(open === panel.id),
      'aria-expanded': String(open === panel.id),
      onclick: () => app.store.set({ panel: open === panel.id ? null : panel.id }),
    },
    tabMark(panel, app.store.state),
    node('span', {}, panel.label),
  );
}

// Held upright, a phone has one bar at its foot, the tools', and beside it two round buttons:
// the colour, and this one for every other panel. It opens the one used last; the sheet's own
// row picks another.
function moreButton(app, panels, open) {
  const others = panels.filter((panel) => panel.id !== 'colours');
  const last = others.find((panel) => panel.id === app.lastPanel) ?? others[0];
  const shown = Boolean(open) && open !== 'colours';

  return node(
    'button.dock-more',
    {
      'aria-label': 'Panels',
      title: 'Frames, layers and settings',
      'aria-pressed': String(shown),
      'aria-expanded': String(shown),
      onclick: () => app.store.set({ panel: shown ? null : last.id }),
    },
    icon('sliders'),
  );
}

// On a phone the frames and the inspector's panels wait here, one open at a time over the bottom
// of the screen, so the canvas keeps the rest of it.
export function renderDock(el, app) {
  const { state } = app.store;
  const panels = state.layout === 'compact' ? panelsFor(state.mode) : [];
  const open = openPanel(state);
  const frame = el.closest('.app');

  el.hidden = !panels.length;

  if (open && open !== 'colours') {
    app.lastPanel = open;
  }

  // another panel opens at its top, not where the last one was scrolled to
  if (frame.dataset.panel !== (open ?? '')) {
    frame.dataset.panel = open ?? '';
    frame.querySelectorAll('.inspector, .inspector > .section').forEach((part) => {
      part.scrollTop = 0;
    });
  }

  replace(
    el,
    panels.map((panel) => tab(app, panel, open)),
    moreButton(app, panels, open),
  );
  // the top of each sheet, the frames' too, says which panel is open
  frame.querySelectorAll('.panel-grab').forEach((head) => replace(head, panelHead(app)));
}
