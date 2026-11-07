import { commitPose, currentLayer } from '../actions.js';
import { toast } from '../dom.js';
import { paintOptions } from '../tools-paint.js';
import { floodFill } from '../../editor/paint.js';
import { Stroke } from '../../editor/stroke.js';
import { CLEAR, cloneSprite } from '../../model/sprite.js';
import { isPosedBody } from '../../model/body/body-kind.js';
import { poseBody } from '../../model/body/body.js';
import {
  changedPixels,
  paintedArt,
  posedBodies,
  usesOfRig,
  withPieceArt,
} from '../../model/body/part-paint.js';
import { pieceById, pieceMatrices, renderBody, renderPiece } from '../../model/body/rig.js';
import { refusesPaint } from './body-lock.js';
import { poseTarget } from './pose-actions.js';

const DRAWS_ON_PART = new Set(['pencil', 'eraser', 'fill']);

export function drawsOnPart(state) {
  return DRAWS_ON_PART.has(state.tool) && isPosedBody(currentLayer(state));
}

function drawTarget(state) {
  const target = poseTarget(state);
  const piece = pieceById(target.rig, state.piece);

  return { ...target, piece, matrix: pieceMatrices(target.rig, target.body.pose).get(piece?.id) };
}

function keepArt(app, target, { art, label }) {
  const { rig, piece, canvas } = target;
  const uses = usesOfRig(app.store.state.project, rig);
  const next = withPieceArt(rig, piece.id, art);
  const layers = posedBodies(uses);
  const rigs = uses.map(({ animation, direction }) => ({
    animation,
    direction,
    before: rig,
    after: next,
  }));

  commitPose(app, { label, layers, rigs }, () => {
    uses.forEach(({ entry }) => (entry.rig = next));
    layers.forEach((layer) => poseBody(layer, { rig: next, pose: layer.pose, canvas }));
  });
}

function partStroke(app, point, color) {
  const { state } = app.store;
  const target = drawTarget(state);
  const { rig, body, piece, canvas, matrix } = target;
  const alone = renderPiece(rig, body.pose, piece, canvas);
  const line = new Stroke(alone, color, paintOptions(state, color));
  const shownBefore = body.sprite;
  const changes = () => changedPixels(line.before, alone);
  const art = () => paintedArt(piece.art, matrix, changes());
  // from the part as it now is, so a pixel drawn under another part is under it at once
  const show = () => {
    body.sprite = renderBody(withPieceArt(rig, piece.id, art()), body.pose, canvas);
    app.store.touch('stroke');
  };

  line.add(...point);
  show();

  return {
    move(next) {
      line.add(...next);
      show();
    },
    cancel() {
      body.sprite = shownBefore;
      app.store.touch('stroke');
    },
    end() {
      const label = `${color === CLEAR ? 'Erase on' : 'Draw on'} ${piece.name}`;
      const kept = changes().length ? art() : null;

      body.sprite = shownBefore;

      if (kept) {
        keepArt(app, target, { art: kept, label });
      }
    },
  };
}

// on the part alone, a fill outside it would flood the whole canvas
function partFill(app, point) {
  const { state } = app.store;
  const target = drawTarget(state);
  const filled = cloneSprite(target.body.sprite);

  floodFill(filled, point, state.color, paintOptions(state));
  const changes = changedPixels(target.body.sprite, filled);

  if (changes.length) {
    const art = paintedArt(target.piece.art, target.matrix, changes);

    keepArt(app, target, { art, label: `Fill on ${target.piece.name}` });
  }

  return null;
}

const ON_PART = {
  pencil: (app, point) => partStroke(app, point, app.store.state.color),
  eraser: (app, point) => partStroke(app, point, CLEAR),
  fill: partFill,
};

export function startOnPart(app, point) {
  const { state } = app.store;
  const piece = pieceById(poseTarget(state).rig, state.piece);

  if (!piece) {
    refusesPaint([currentLayer(state)]);

    return null;
  }

  if (!ON_PART[state.tool]) {
    toast(`To draw on ${piece.name}, use the Pencil, the Eraser or Fill.`);

    return null;
  }

  return ON_PART[state.tool](app, point);
}
