import { createSprite } from '../sprite.js';
import { IDENTITY, applyTo, compose, translation, turnAbout } from './affine.js';
import { decodeArt } from './piece-art.js';
import { drawPiece, sampler } from './place.js';

// A view cut into parts: rig.pieces, bottom one first, each { id, name, parent, pivot, art }.
// A pose says where they are in one frame: { x, y } moves the whole body, and parts[id] is
// { x, y, angle } for a part, moved and turned about its pivot, carrying the parts that follow it.

export const restPose = () => ({ x: 0, y: 0, parts: {} });

const STILL = { x: 0, y: 0, angle: 0 };

export const partPose = (pose, id) => pose.parts[id] ?? STILL;

// the middle of the pivot's pixel, which a turn goes round
export const pivotPoint = (piece) => ({ x: piece.pivot.x + 0.5, y: piece.pivot.y + 0.5 });

function ownMatrix(piece, pose) {
  const own = partPose(pose, piece.id);

  return compose(translation(own.x, own.y), turnAbout(pivotPoint(piece), own.angle));
}

// each part's map of the canvas: its parents' maps, then its own move and turn
export function pieceMatrices(rig, pose) {
  const byId = new Map(rig.pieces.map((piece) => [piece.id, piece]));
  const matrices = new Map();
  // seen: the parts on the way here, this one included
  const matrixOf = (piece, seen) => {
    if (!matrices.has(piece.id)) {
      const parent = byId.get(piece.parent);
      // a loop in who follows whom is cut where it closes, as if that part followed nothing
      const base =
        parent && !seen.has(parent.id)
          ? matrixOf(parent, new Set([...seen, parent.id]))
          : translation(pose.x, pose.y);

      matrices.set(piece.id, compose(base, ownMatrix(piece, pose)));
    }

    return matrices.get(piece.id);
  };

  rig.pieces.forEach((piece) => matrixOf(piece, new Set([piece.id])));

  return matrices;
}

export function renderBody(rig, pose, { width, height }) {
  const out = createSprite(width, height);
  const matrices = pieceMatrices(rig, pose);

  for (const piece of rig.pieces) {
    drawPiece(out, decodeArt(piece.art), matrices.get(piece.id));
  }

  return out;
}

// the part drawn at canvas pixel (x, y), the top one where parts overlap, or null
export function pieceAt(rig, pose, [x, y]) {
  const matrices = pieceMatrices(rig, pose);
  const top = [...rig.pieces]
    .reverse()
    .find((piece) => sampler(decodeArt(piece.art), matrices.get(piece.id))(x, y));

  return top ?? null;
}

// where a part's pivot is in the pose, and how far it is turned all told
export function pivotInPose(rig, pose, piece) {
  const matrix = pieceMatrices(rig, pose).get(piece.id) ?? IDENTITY;
  const { x, y } = pivotPoint(piece);
  const turned = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;

  return { point: applyTo(matrix, [x, y]), turned };
}

// the part's parents' map alone: how a drag on the canvas becomes a move of the part
export function parentMatrix(rig, pose, piece) {
  const parent = rig.pieces.find((other) => other.id === piece.parent);

  return parent ? pieceMatrices(rig, pose).get(parent.id) : translation(pose.x, pose.y);
}

export const pieceById = (rig, id) => rig?.pieces.find((piece) => piece.id === id) ?? null;
