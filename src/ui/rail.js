import { node, icon, replace } from './dom.js';
import { toolsFor } from './tools.js';
import { flipCurrent } from './actions.js';

export function renderRail(el, app) {
  const { state } = app.store;
  const toolButtons = toolsFor(state.project).map((tool) =>
    node(
      `button.btn.quiet${state.tool === tool.id ? '.on' : ''}`,
      {
        title: `${tool.label} (${tool.key.toUpperCase()})`,
        'data-key': tool.key.toUpperCase(),
        'aria-label': tool.label,
        'aria-pressed': String(state.tool === tool.id),
        onclick: () => app.store.set({ tool: tool.id, mode: 'edit' }),
      },
      icon(tool.id),
    ),
  );

  replace(
    el,
    toolButtons,
    node('hr'),
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
  );
}
