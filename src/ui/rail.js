import { node, icon, replace, toast } from './dom.js';
import { toolsFor } from './tools.js';
import { flipCurrent } from './actions.js';

// a finger has no pointer to hover for a tool's name: picking the tool says what it does
function pickTool(app, tool) {
  app.store.set({ tool: tool.id, mode: 'edit' });

  if (app.store.state.layout === 'compact') {
    toast(tool.label);
  }
}

function toolButton(app, tool) {
  const { state } = app.store;

  return node(
    `button.btn.quiet${state.tool === tool.id ? '.on' : ''}`,
    {
      title: `${tool.label} (${tool.key.toUpperCase()})`,
      'data-key': tool.key.toUpperCase(),
      'aria-label': tool.label,
      'aria-pressed': String(state.tool === tool.id),
      onclick: () => pickTool(app, tool),
    },
    icon(tool.id),
  );
}

function viewButtons(app) {
  const { state } = app.store;

  return [
    node(
      `button.btn.quiet${state.symmetry.on ? '.on' : ''}`,
      {
        title: 'Symmetry: draw one half, the other mirrors (M)',
        'aria-label': 'Symmetry',
        'aria-pressed': String(state.symmetry.on),
        onclick: () => app.store.set({ symmetry: { ...state.symmetry, on: !state.symmetry.on } }),
      },
      icon('mirror'),
    ),
    node(
      'button.btn.quiet',
      {
        title: 'Flip this view left to right',
        'aria-label': 'Flip view',
        onclick: () => flipCurrent(app),
      },
      icon('flip'),
    ),
  ];
}

export function renderRail(el, app) {
  const { state } = app.store;
  const tools = toolsFor(state.project).map((tool) => toolButton(app, tool));

  replace(el, tools, node('hr'), viewButtons(app));

  // A tool picked from elsewhere (a layer's row, a key) may be past the edge of a phone's strip.
  // Only a change of tool moves the strip: Symmetry, at its far end, stays under the finger.
  if (state.layout === 'compact' && el.dataset.tool !== state.tool) {
    el.querySelector('[aria-pressed="true"]')?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
    });
  }

  el.dataset.tool = state.tool;
}
