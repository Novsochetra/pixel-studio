import { commitPose, currentLayer, goTo } from './actions.js';
import { toast } from './dom.js';
import { shiftCurrentFrame } from './frame-move.js';
import { clampLayersShift, shiftLayer } from '../model/frame-shift.js';
import { groupOf, pickRange, togglePick } from '../model/layer-pick.js';
import { frameAt } from '../model/project.js';

export function layersToMove(state) {
  return groupOf(frameAt(state.project, state.at), currentLayer(state), state.pickedLayers);
}

// a hidden layer stays where it is, as you would not see it move
function shownLayers(app) {
  const group = layersToMove(app.store.state);
  const shown = group.filter((layer) => layer.visible);

  if (!shown.length) {
    toast(`${group[0].name} is hidden, so you would not see it move. Show it in Layers first.`);
  } else if (shown.length < group.length) {
    toast('Hidden layers stay where they are. Show them in Layers to move them too.');
  }

  return shown;
}

function moveLayers(app, layers, shift) {
  const { project, at } = app.store.state;

  // every layer moving is the whole frame, so its pins go with it
  if (layers.length === frameAt(project, at).layers.length) {
    shiftCurrentFrame(app, shift);

    return;
  }

  const { canvas } = project;
  const [dx, dy] = clampLayersShift(layers, canvas, shift);
  const label = layers.length > 1 ? `Move ${layers.length} layers` : `Move ${layers[0].name}`;

  if (dx || dy) {
    commitPose(app, { label, layers }, () => {
      layers.forEach((layer) => shiftLayer(layer, [dx, dy]));
    });
  }
}

// a selection would keep the arrow keys on its pixels instead of on the layers just picked
function pickToMove(app, layer, picked) {
  goTo(app, { layer });
  app.store.set({ tool: 'move', selection: null, pickedLayers: picked });
}

export function pickLayerToMove(app, key) {
  pickToMove(app, key, []);
}

export function pickRangeToMove(app, key) {
  const { state } = app.store;
  const active = currentLayer(state).key;

  pickToMove(app, active, pickRange(frameAt(state.project, state.at), active, key));
}

export function togglePickToMove(app, key) {
  const { state } = app.store;
  const group = layersToMove(state).map((layer) => layer.key);
  const { layer, picked } = togglePick(group, currentLayer(state).key, key);

  pickToMove(app, layer, picked);
}

export function shiftPickedLayers(app, shift) {
  const layers = shownLayers(app);

  if (layers.length) {
    moveLayers(app, layers, shift);
  }
}

// the layers are drawn moved during the drag, and really move when they are let go
export function moveLayerDrag(app, start) {
  const layers = shownLayers(app);

  if (!layers.length) {
    return null;
  }

  const { canvas } = app.store.state.project;
  const keys = layers.map((layer) => layer.key);

  return {
    move([x, y]) {
      const [dx, dy] = clampLayersShift(layers, canvas, [x - start[0], y - start[1]]);

      app.store.set({ frameDrag: { x: dx, y: dy, layers: keys } });
    },

    end() {
      const drag = app.store.state.frameDrag;

      app.store.set({ frameDrag: null });

      if (drag) {
        moveLayers(app, layers, [drag.x, drag.y]);
      }
    },

    cancel() {
      app.store.set({ frameDrag: null });
    },
  };
}
