import { commit } from './actions.js';
import { layersToMove } from './layer-move.js';
import { HANDLE_GAP, dragAngle, drawHandle, onKnob } from './turn-handle.js';
import {
  applyLayersTurn,
  layersHandle,
  liveLayersTurn,
  startLayersTurn,
} from '../editor/layers-turn.js';
import { isPosedBody } from '../model/body/body-kind.js';
import { tidyAngle } from '../model/body/handle.js';
import { cloneSprite } from '../model/sprite.js';

// a Body is turned by its parts, with the Pose tool
function layersToTurn(state) {
  if (state.tool !== 'move' || state.selection || state.frameDrag) {
    return [];
  }

  const shown = layersToMove(state).filter((layer) => layer.visible && layer.sprite);

  return shown.some(isPosedBody) ? [] : shown;
}

const handleOf = (state, scale) =>
  layersHandle(layersToTurn(state), state.layerTurn, {
    canvas: state.project.canvas,
    gap: HANDLE_GAP / scale,
  });

const turnOf = (state, layers) =>
  liveLayersTurn(state.layerTurn, layers) ?? startLayersTurn(layers);

export const canTurnLayers = (state) => Boolean(handleOf(state, state.zoom));

export const layersAngle = (state) =>
  liveLayersTurn(state.layerTurn, layersToTurn(state))?.angle ?? 0;

export const onLayersHandle = (app, point) => {
  const { state } = app.store;

  return onKnob(handleOf(state, state.zoom), point, state.zoom);
};

export function turnLayersDrag(app, start) {
  const { state } = app.store;
  const layers = layersToTurn(state);
  const turn = turnOf(state, layers);
  const startTurn = state.layerTurn;
  const before = layers.map((layer) => ({ layer, before: cloneSprite(layer.sprite) }));
  const angleAt = dragAngle(turn, start);

  return {
    move(point, event) {
      app.store.set({ layerTurn: applyLayersTurn(layers, turn, angleAt(point, event)) });
    },

    cancel() {
      before.forEach(({ layer, before: pixels }) => layer.sprite.pixels.set(pixels.pixels));
      app.store.set({ layerTurn: startTurn });
    },

    end() {
      if (app.history.record('Turn', before)) {
        app.saver.markLayers(layers.map((layer) => layer.id));
        app.store.touch('pixels');
      }
    },
  };
}

export function turnLayersTo(app, angle) {
  const { state } = app.store;
  const layers = layersToTurn(state);
  const turn = turnOf(state, layers);
  let layerTurn = state.layerTurn;

  if (turn) {
    commit(app, 'Turn', layers, () => {
      layerTurn = applyLayersTurn(layers, turn, tidyAngle(angle));
    });
    app.store.set({ layerTurn });
  }
}

export function drawLayersHandle(context, state, scale) {
  const handle = handleOf(state, scale);

  if (handle) {
    drawHandle(context, handle, scale);
  }
}
