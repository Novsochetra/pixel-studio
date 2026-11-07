import { commit, currentLayer } from './actions.js';
import { cssVar } from './draw.js';
import { refusesPaint } from './body/body-lock.js';
import { applyTurn, liveTurn, startTurn, turnHandle } from '../editor/selection-turn.js';
import { angleOf, tidyAngle } from '../model/body/handle.js';
import { cloneSprite } from '../model/sprite.js';

const HANDLE_GAP = 14;
const HANDLE_REACH = 10;
const SNAP = 15;
const TOOLS_WITH_HANDLE = new Set(['select', 'lasso', 'wand']);

const handleOf = (state, zoom) =>
  turnHandle(state.selection, currentLayer(state).sprite, HANDLE_GAP / zoom);

function turnOf(state) {
  const { sprite } = currentLayer(state);

  return liveTurn(state.selection, sprite) ?? startTurn(sprite, state.selection);
}

export const selectionAngle = (state) =>
  liveTurn(state.selection, currentLayer(state).sprite)?.angle ?? 0;

export function onTurnHandle(app, [x, y]) {
  const { state } = app.store;

  if (!state.selection) {
    return false;
  }

  const handle = handleOf(state, state.zoom);
  const reach = Math.max(1.5, HANDLE_REACH / state.zoom);

  return Boolean(handle) && Math.hypot(x + 0.5 - handle.knob[0], y + 0.5 - handle.knob[1]) <= reach;
}

export function turnSelectionDrag(app, start) {
  const { state } = app.store;
  const layer = currentLayer(state);
  const turn = turnOf(state);

  if (!turn || refusesPaint([layer])) {
    return null;
  }

  const startSelection = state.selection;
  const before = cloneSprite(layer.sprite);
  const towards = ([x, y]) => angleOf([turn.centre.x, turn.centre.y], [x + 0.5, y + 0.5]);
  const from = towards(start);

  return {
    move(point, event) {
      const angle = tidyAngle(turn.angle + towards(point) - from, event?.shiftKey ? SNAP : 1);

      app.store.set({ selection: applyTurn(layer.sprite, turn, angle) });
    },
    cancel() {
      layer.sprite.pixels.set(before.pixels);
      app.store.set({ selection: startSelection });
    },
    end() {
      if (app.history.record('Turn', [{ layer, before }])) {
        app.saver.markLayers([layer.id]);
        app.store.touch('pixels');
      }
    },
  };
}

export function turnSelectionTo(app, angle) {
  const { state } = app.store;
  const layer = currentLayer(state);
  const turn = turnOf(state);
  let selection = state.selection;

  if (turn) {
    commit(app, 'Turn', [layer], () => {
      selection = applyTurn(layer.sprite, turn, tidyAngle(angle));
    });
    app.store.set({ selection });
  }
}

export function drawTurnHandle(context, state, scale) {
  const handle = TOOLS_WITH_HANDLE.has(state.tool) ? handleOf(state, scale) : null;

  if (!handle) {
    return;
  }

  const [from, to] = [handle.root, handle.knob].map(([x, y]) => [x * scale, y * scale]);

  context.save();
  context.lineWidth = 2;
  context.strokeStyle = cssVar('--tint');
  context.beginPath();
  context.moveTo(...from);
  context.lineTo(...to);
  context.stroke();
  context.beginPath();
  context.arc(...to, 7, 0, Math.PI * 2);
  context.fillStyle = cssVar('--tint');
  context.fill();
  context.strokeStyle = cssVar('--ink');
  context.stroke();
  context.restore();
}
