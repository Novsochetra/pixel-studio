import { node, icon, replace, toast } from './dom.js';
import { toolName, toolSaid, toolsFor } from './tool-list.js';
import { forHands } from './platform-keys.js';
import { flipCurrent } from './actions.js';
import { watchBelow } from './more-behind.js';

// a finger has no pointer to hover for a tool's name: picking the tool says what it does
function pickTool(app, tool) {
  app.store.set({ tool: tool.id });

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
      'aria-label': toolName(tool),
      'aria-description': toolSaid(tool) === toolName(tool) ? null : toolSaid(tool),
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

// At the end of a phone's bar, where the tools go on out of sight: every tool with its name.
// The stylesheet shows it only there.
const allTools = (app) =>
  node(
    'button.btn.quiet.rail-all',
    {
      'aria-label': 'All tools',
      title: 'Every tool, with its name',
      onclick: () => app.store.set({ panel: 'tools' }),
    },
    icon('grid'),
  );

const toolInSight = (el) =>
  el.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });

// A turn of the phone lays the strip the other way, and the tool in hand was left past its edge
// with nothing marked: it is brought back in sight as the window changes size.
function watchTurns(el) {
  if (el.dataset.watched) {
    return;
  }

  el.dataset.watched = 'true';
  window.addEventListener('resize', () => {
    if (document.documentElement.dataset.layout === 'compact') {
      toolInSight(el);
    }
  });
}

export function renderRail(el, app) {
  const { state } = app.store;
  const tools = toolsFor(state.project).map((tool) => toolButton(app, tool));

  replace(el, tools, node('hr'), viewButtons(app), allTools(app));

  // A tool picked from elsewhere (a layer's row, a key) may be past the edge of a phone's strip.
  // Only a change of tool moves the strip: Symmetry, at its far end, stays under the finger.
  if (state.layout === 'compact' && el.dataset.tool !== state.tool) {
    toolInSight(el);
  }

  el.dataset.tool = state.tool;
  watchTurns(el);
  watchBelow(el);
}
