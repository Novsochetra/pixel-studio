import { commit, currentLayer } from './actions.js';
import { refusesPaint } from './body/body-lock.js';
import { HANDLE_GAP, dragAngle, drawHandle, onKnob } from './turn-handle.js';
import { applyTurn, liveTurn, startTurn, turnHandle } from '../editor/selection-turn.js';
import { tidyAngle } from '../model/body/handle.js';
import { cloneSprite } from '../model/sprite.js';

const TOOLS_WITH_HANDLE = new Set(['select', 'lasso', 'wand', 'move']);

const handleOf = (state, zoom) =>
  turnHandle(state.selection, currentLayer(state).sprite, HANDLE_GAP / zoom);

function turnOf(state) {
  const { sprite } = currentLayer(state);

  return liveTurn(state.selection, sprite) ?? startTurn(sprite, state.selection);
}

export const selectionAngle = (state) =>
  liveTurn(state.selection, currentLayer(state).sprite)?.angle ?? 0;

export function onTurnHandle(app, point) {
  const { state } = app.store;

  return Boolean(state.selection) && onKnob(handleOf(state, state.zoom), point, state.zoom);
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
  const angleAt = dragAngle(turn, start);

  return {
    move(point, event) {
      app.store.set({ selection: applyTurn(layer.sprite, turn, angleAt(point, event)) });
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

  if (handle) {
    drawHandle(context, handle, scale);
  }
}
