import { node, icon, replace, toast } from './dom.js';
import { toolSaid, toolsFor } from './tool-list.js';
import { forHands } from './platform-keys.js';
import { flipCurrent } from './actions.js';

// a finger has no pointer to hover for a tool's name: picking the tool says what it does
function pickTool(app, tool) {
  app.store.set({ tool: tool.id, mode: 'edit' });

  if (app.store.state.layout === 'compact') {
    toast(toolSaid(tool));
  }
}

function toolButton(app, tool) {
  const { state } = app.store;

  return node(
    `button.btn.quiet${state.tool === tool.id ? '.on' : ''}`,
    {
      title: forHands(`${tool.label} (${tool.key.toUpperCase()})`, toolSaid(tool)),
      'data-key': tool.key.toUpperCase(),
      'aria-label': toolSaid(tool),
      'aria-pressed': String(state.tool === tool.id),
      onclick: () => pickTool(app, tool),
    },
    icon(tool.id),
  );
}

// on a phone the two say what they did: a bare picture has no name to hover for
function says(app, text) {
  if (app.store.state.layout === 'compact') {
    toast(text);
  }
}

function setSymmetry(app, on) {
  app.store.set({ symmetry: { ...app.store.state.symmetry, on } });
  says(app, on ? 'Symmetry: draw one half, the other side mirrors' : 'Symmetry off');
}

function flipView(app) {
  flipCurrent(app);
  says(app, 'Flipped left to right: this layer, in this frame. Undo puts it back.');
}

function viewButtons(app) {
  const { on } = app.store.state.symmetry;

  return [
    node(
      `button.btn.quiet${on ? '.on' : ''}`,
      {
        title: forHands(
          'Symmetry: draw one half, the other mirrors (M)',
          'Symmetry: draw one half, the other mirrors',
        ),
        'aria-label': 'Symmetry',
        'aria-pressed': String(on),
        onclick: () => setSymmetry(app, !on),
      },
      icon('mirror'),
    ),
    node(
      'button.btn.quiet',
      {
        title: forHands(
          'Flip this layer left to right, in this frame (Shift F)',
          'Flip this layer left to right, in this frame',
        ),
        'aria-label': 'Flip layer',
        onclick: () => flipView(app),
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
