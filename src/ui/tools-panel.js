import { icon, node, replace, toast } from './dom.js';
import { toolName, toolSaid, toolsFor } from './tool-list.js';

function tile(app, tool) {
  const pick = () => {
    // picked, the tool is for the canvas: the sheet gets out of its way
    app.store.set({ tool: tool.id, panel: null });
    toast(toolSaid(tool));
  };

  return node(
    'button.tool-tile',
    { 'aria-pressed': String(app.store.state.tool === tool.id), onclick: pick },
    icon(tool.id),
    node('span', {}, toolName(tool)),
  );
}

// Every tool with its name, on a phone: its bar shows five of them at a time as bare pictures,
// and the far ones were a blind swipe away.
export function renderToolsPanel(el, app) {
  const { project } = app.store.state;

  replace(
    el,
    node('h2', {}, 'Tools'),
    node(
      'div.tool-grid',
      { role: 'group', 'aria-label': 'Tools' },
      toolsFor(project).map((tool) => tile(app, tool)),
    ),
  );
}
