import { cssVar } from '../draw.js';
import { drawSelection } from '../stage-marks.js';
import { createSprite } from '../../model/sprite.js';
import { decodeArt } from '../../model/body/piece-art.js';
import { drawPiece } from '../../model/body/place.js';
import { handleOf } from '../../model/body/handle.js';
import { pieceById, pieceMatrices, pivotInPose } from '../../model/body/rig.js';
import { handleGap } from './pose-tool.js';
import { poseTarget } from './pose-actions.js';

// the picked part's pixels, as a selection's cells, for its outline
function partCells(target, piece) {
  const { width, height } = target.canvas;
  const alone = createSprite(width, height);
  const matrix = pieceMatrices(target.rig, target.body.pose).get(piece.id);

  drawPiece(alone, decodeArt(piece.art), matrix);
  const cells = new Uint8Array(width * height).map((_, i) => alone.pixels[i * 4 + 3]);

  return { width, height, cells };
}

function dot(context, [x, y], { radius, fill }) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  context.stroke();
}

function drawHandle(context, target, piece, scale) {
  const { pivot, knob } = handleOf(target.rig, target.body.pose, piece, handleGap(scale));
  const [from, to] = [pivot, knob].map(([x, y]) => [x * scale, y * scale]);

  context.strokeStyle = cssVar('--tint');
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(...from);
  context.lineTo(...to);
  context.stroke();
  context.strokeStyle = cssVar('--ink');
  dot(context, to, { radius: 7, fill: cssVar('--tint') });
}

// While posing: every part's pivot, the picked part outlined, and its handle to turn it.
export function drawPoseMarks(context, state, scale) {
  const target = poseTarget(state);

  if (!target.rig || !target.body?.pose) {
    return;
  }

  const picked = pieceById(target.rig, state.piece);

  context.save();

  if (picked) {
    drawSelection(context, partCells(target, picked), scale);
  }

  context.lineWidth = 1.5;
  context.strokeStyle = cssVar('--ink');

  for (const piece of target.rig.pieces) {
    const [x, y] = pivotInPose(target.rig, target.body.pose, piece).point;
    const fill = piece === picked ? cssVar('--tint') : cssVar('--chrome-raised');

    dot(context, [x * scale, y * scale], { radius: piece === picked ? 5 : 3.5, fill });
  }

  if (picked) {
    drawHandle(context, target, picked, scale);
  }

  context.restore();
}
