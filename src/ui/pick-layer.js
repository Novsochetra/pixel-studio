import { currentLayer, goTo } from './actions.js';
import { toast } from './dom.js';
import { poseTarget } from './body/pose-actions.js';
import { isPosedBody } from '../model/body/body-kind.js';
import { topLayerAt } from '../model/layer-ops.js';
import { frameAt } from '../model/project.js';
import { pieceAt } from '../model/body/rig.js';
import { CLEAR, getPixel } from '../model/sprite.js';

// on a Body, the part under the pointer too, so the Pencil is ready to draw on it
function pickPart(app, layer, point) {
  const { rig } = poseTarget(app.store.state);
  const piece = isPosedBody(layer) && rig ? pieceAt(rig, layer.pose, point) : null;

  app.store.set({ piece: piece?.id ?? null });

  return piece;
}

export function pickLayerAt(app, point) {
  const { state } = app.store;
  const layer = topLayerAt(frameAt(state.project, state.at), point);

  if (!layer) {
    return;
  }

  const changed = layer.key !== currentLayer(state).key;

  goTo(app, { layer: layer.key });

  const piece = pickPart(app, layer, point);

  if (changed) {
    toast(piece ? `${layer.name}: ${piece.name}` : `Layer: ${layer.name}`);
  }
}

// A layer picked in the panel stays picked while the press is on its own pixels, even under
// another layer. A hidden one stays too, so the tool can say why nothing moves.
export function pickLayerToDrag(app, point) {
  const layer = currentLayer(app.store.state);

  if (layer.visible && (!layer.sprite || getPixel(layer.sprite, ...point) === CLEAR)) {
    pickLayerAt(app, point);
  }
}
