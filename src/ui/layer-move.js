import { commitPose, currentLayer, goTo } from './actions.js';
import { toast } from './dom.js';
import { clampLayerShift, shiftLayer } from '../model/frame-shift.js';

function shownLayer(app) {
  const layer = currentLayer(app.store.state);

  if (layer.visible) {
    return layer;
  }

  toast(`${layer.name} is hidden, so you would not see it move. Show it in Layers first.`);

  return null;
}

function moveLayer(app, layer, shift) {
  const { canvas } = app.store.state.project;
  const [dx, dy] = clampLayerShift(layer, canvas, shift);

  if (dx || dy) {
    commitPose(app, { label: `Move ${layer.name}`, layers: [layer] }, () => {
      shiftLayer(layer, [dx, dy]);
    });
  }
}

// a selection would keep the arrow keys on its pixels instead of on the layer just picked
export function pickLayerToMove(app, key) {
  goTo(app, { layer: key });
  app.store.set({ tool: 'movelayer', selection: null });
}

export function shiftCurrentLayer(app, shift) {
  const layer = shownLayer(app);

  if (layer) {
    moveLayer(app, layer, shift);
  }
}

// the layer is drawn moved during the drag, and really moves when it is let go
export function moveLayerDrag(app, start) {
  const layer = shownLayer(app);

  if (!layer) {
    return null;
  }

  const { canvas } = app.store.state.project;

  return {
    move([x, y]) {
      const [dx, dy] = clampLayerShift(layer, canvas, [x - start[0], y - start[1]]);

      app.store.set({ frameDrag: { x: dx, y: dy, layer: layer.key } });
    },

    end() {
      const drag = app.store.state.frameDrag;

      app.store.set({ frameDrag: null });

      if (drag) {
        moveLayer(app, layer, [drag.x, drag.y]);
      }
    },

    cancel() {
      app.store.set({ frameDrag: null });
    },
  };
}
