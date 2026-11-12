import { commitPose, currentLayer, goTo } from './actions.js';
import { toast } from './dom.js';
import { saysNoRoom, shiftCurrentFrame } from './frame-move.js';
import { PAINTING } from './tools-paint.js';
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
  } else {
    saysNoRoom({ x: 0, y: 0 }, shift[0] || shift[1]);
  }
}

// a selection would keep the arrow keys on its pixels instead of on the layers just picked
function pickToMove(app, layer, picked) {
  goTo(app, { layer });
  app.store.set({ tool: 'move', selection: null, pickedLayers: picked });
}

// Pose and Pin act on the frame, whichever layer is picked: the tool stays as a drawing one does
const STAYS = new Set([...PAINTING, 'picker', 'pose', 'pin']);

// A layer picked in the list, alone. With a tool that draws in hand it is the layer to draw on,
// and the tool stays; with one that moves pixels, a drag is about to move something, and it
// should be this layer: Move is in hand.
export function pickLayer(app, key) {
  const { tool } = app.store.state;

  goTo(app, { layer: key });
  app.store.set({ tool: STAYS.has(tool) ? tool : 'move', selection: null, pickedLayers: [] });
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

const SAME_RUN_MS = 1000;

// Key after key, the layers nudged are one move to undo, as a selection's nudges are: three
// presses were three steps back. A run is of the same layers.
export function shiftPickedLayers(app, shift) {
  const layers = shownLayers(app);
  const keys = layers.map((layer) => layer.key).join();
  const last = app.layersNudged ?? { keys: null, at: -Infinity };
  const inRun = last.keys === keys && performance.now() - last.at < SAME_RUN_MS;
  const steps = app.history.done.length;

  if (!layers.length) {
    return;
  }

  moveLayers(app, layers, shift);

  if (inRun && app.history.done.length > steps) {
    app.history.joinLast();
  }

  app.layersNudged = { keys, at: performance.now() };
}

// the layers are drawn moved during the drag, and really move when they are let go
export function moveLayerDrag(app, start) {
  const layers = shownLayers(app);

  if (!layers.length) {
    return null;
  }

  const { canvas } = app.store.state.project;
  const keys = layers.map((layer) => layer.key);
  let wanted = false;

  return {
    move([x, y]) {
      const [dx, dy] = clampLayersShift(layers, canvas, [x - start[0], y - start[1]]);

      wanted ||= x !== start[0] || y !== start[1];
      app.store.set({ frameDrag: { x: dx, y: dy, layers: keys } });
    },

    end() {
      const drag = app.store.state.frameDrag;

      app.store.set({ frameDrag: null });
      saysNoRoom(drag, wanted);

      if (drag) {
        moveLayers(app, layers, [drag.x, drag.y]);
      }
    },

    cancel() {
      app.store.set({ frameDrag: null });
    },
  };
}
