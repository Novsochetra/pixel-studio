import { cloneSprite, createSprite, samePixels } from '../sprite.js';
import { addLayer, layerStack } from '../structure.js';
import { recolourArt } from './piece-art.js';
import { renderBody, restPose } from './rig.js';
import { BODY_KIND, bodyOf } from './body-kind.js';

export const bodyKey = (animation) =>
  layerStack(animation).find((entry) => entry.kind === BODY_KIND)?.key ?? null;

export function rigOf(animation, direction) {
  return bodyKey(animation) ? (animation.directions[direction]?.rig ?? null) : null;
}

export function poseBody(layer, { rig, pose, canvas }) {
  layer.pose = pose;
  layer.sprite = renderBody(rig, pose, canvas);
}

function firstCut(entry, cut, { key, canvas }) {
  const posed = entry.frames.filter((frame, index) => {
    const layer = frame.layers.find((other) => other.key === cut.layerKey);

    return index === cut.frame || (layer?.sprite && samePixels(layer.sprite, cut.source));
  });

  for (const frame of posed) {
    frame.layers.find((layer) => layer.key === cut.layerKey).sprite = cloneSprite(cut.leftover);
    poseBody(
      frame.layers.find((layer) => layer.key === key),
      { rig: cut.rig, pose: restPose(), canvas },
    );
  }

  return posed.length;
}

function cutAgain(entry, rig, { key, canvas }) {
  const bodies = entry.frames
    .map((frame) => frame.layers.find((layer) => layer.key === key))
    .filter((layer) => layer?.pose);

  bodies.forEach((layer) => poseBody(layer, { rig, pose: layer.pose, canvas }));

  return bodies.length;
}

// cut: { direction, frame, layerKey, source, leftover, rig }. The first cut of a view takes the
// parts off the layer that was cut, in this frame and every frame drawn the same; a new cut of a
// view redraws the frames posed with the old one. Returns how many frames the Body now draws.
export function applyCut(project, animation, cut) {
  const key =
    bodyKey(animation) ??
    addLayer(project, animation, { name: 'Body', kind: BODY_KIND, above: cut.layerKey });
  const entry = animation.directions[cut.direction];
  const recut = Boolean(entry.rig);
  const place = { key, canvas: project.canvas };

  entry.rig = cut.rig;

  return recut ? cutAgain(entry, cut.rig, place) : firstCut(entry, cut, place);
}

// A picture cleaned into a posed frame takes the place of what the parts drew there.
export function clearPosedBody(frame, canvas) {
  const body = bodyOf(frame);

  if (body?.pose) {
    body.sprite = createSprite(canvas.width, canvas.height);
    delete body.pose;
  }
}

// a colour swap reaches the parts as well as the frames drawn from them
export function recolourRigs(project, mapping) {
  const changes = [];

  for (const animation of project.animations) {
    for (const [direction, entry] of Object.entries(animation.directions)) {
      if (entry.rig) {
        const pieces = entry.rig.pieces.map((piece) => ({
          ...piece,
          art: recolourArt(piece.art, mapping),
        }));

        changes.push({ animation: animation.id, direction, before: entry.rig, after: { pieces } });
      }
    }
  }

  return changes;
}
