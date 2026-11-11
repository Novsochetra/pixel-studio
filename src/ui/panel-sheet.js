import { node } from './dom.js';
import { openPanel, panelsFor } from './panels.js';
import { pullToClose } from './sheet-pull.js';

function panelTabs(app) {
  const { state } = app.store;
  const open = openPanel(state);

  return node(
    'div.segmented.panel-tabs',
    { role: 'group', 'aria-label': 'Panel' },
    panelsFor(state.mode).map((panel) =>
      node(
        'button',
        {
          'aria-pressed': String(panel.id === open),
          onclick: () => app.store.set({ panel: panel.id }),
        },
        panel.label,
      ),
    ),
  );
}

// On a phone a panel is a sheet at the screen's foot. At its top: the row that names it and
// picks another, and a way out a thumb finds without knowing the sheet can be pulled down. The
// panels' names were a second bar under the tools before; here they come and go with the sheet.
export function panelHead(app) {
  return [
    panelTabs(app),
    node(
      'button.btn.quiet.panel-close',
      { 'aria-label': 'Close this panel', onclick: () => app.store.set({ panel: null }) },
      '×',
    ),
  ];
}

export const panelGrab = (app) => node('div.panel-grab', {}, panelHead(app));

// pulled down by its bar, the panel shuts as a window does
export function pullsShut(panel, app) {
  pullToClose({
    head: panel,
    body: panel,
    grips: (event) => Boolean(event.target.closest('.panel-grab')),
    close: () => {
      // the panel is kept for the next time it opens: it must not open where it was pulled to
      panel.style.translate = '';
      app.store.set({ panel: null });
    },
  });
}
