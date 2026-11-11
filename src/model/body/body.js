import { cloneSprite, createSprite, samePixels } from '../sprite.js';
import { framesOf } from '../structure.js';
import { newId, newLayer } from '../project.js';
import { recolourArt } from './piece-art.js';
import { renderBody, restPose } from './rig.js';
import { BODY_KIND, bodyOf } from './body-kind.js';
import { paintOver } from '../layer-ops.js';

const anyBody = (animation) => framesOf(animation).map(bodyOf).find(Boolean) ?? null;

export const bodyKey = (animation) => anyBody(animation)?.key ?? null;

export function rigOf(animation, direction) {
  return bodyKey(animation) ? (animation.directions[direction]?.rig ?? null) : null;
}

export function poseBody(layer, { rig, pose, canvas }) {
  layer.pose = pose;
  layer.sprite = renderBody(rig, pose, canvas);
}

// What a cut of this frame is made from: the layer cut, with what was drawn on a Body not cut
// yet over it. A first cut gives every view a Body, and one not cut yet can be drawn on: left
// out of the cut, those pixels were thrown away, or hidden under the parts.
export function cutSource(frame, layer) {
  const source = cloneSprite(layer.sprite);
  const body = bodyOf(frame);

  if (body?.sprite && !body.pose) {
    paintOver(source, body.sprite);
  }

  return source;
}

// the layer that takes what no part holds: the one cut, or for a view cut before, its art
export const leftoverLayer = (frame, layerKey) =>
  frame.layers.find((layer) => layer.key === layerKey) ??
  frame.layers.find((layer) => layer.kind === 'art');

// cut.art: the layer as it was cut, without the Body's own pixels, to find the frames drawn alike
function firstCut(entry, cut, { key, canvas }) {
  const alike = (frame) => {
    const layer = frame.layers.find((other) => other.key === cut.layerKey);

    return Boolean(layer?.sprite) && samePixels(layer.sprite, cut.art ?? cut.source);
  };
  const posed = entry.frames.filter((frame, index) => index === cut.frame || alike(frame));

  for (const frame of posed) {
    const art = frame.layers.find((layer) => layer.key === cut.layerKey);
    const body = frame.layers.find((layer) => layer.key === key);

    art.sprite = cloneSprite(cut.leftover);

    // another frame's Body may have pixels of its own, which this cut was not made from: they
    // go under the parts, onto the layer that was cut
    if (frame !== entry.frames[cut.frame] && body.sprite && !body.pose) {
      paintOver(art.sprite, body.sprite);
    }

    poseBody(body, { rig: cut.rig, pose: restPose(), canvas });
  }

  return posed.length;
}

// A part removed, or pixels unpainted, leave the parts: in the frame being edited they go back
// to the art under the Body, where they stood when the view was cut. They were dropped instead.
function cutAgain(entry, cut, { key, canvas }) {
  const bodies = entry.frames
    .map((frame) => frame.layers.find((layer) => layer.key === key))
    .filter((layer) => layer?.pose);
  const art = leftoverLayer(entry.frames[cut.frame]);

  bodies.forEach((layer) => poseBody(layer, { rig: cut.rig, pose: layer.pose, canvas }));

  if (art && cut.leftover) {
    paintOver(art.sprite, cut.leftover);
  }

  return bodies.length;
}

function putBody(frame, { name, key, canvas, above }) {
  const at = frame.layers.findIndex((layer) => layer.key === above);
  const layer = newLayer(canvas.width, canvas.height, { name, key, kind: BODY_KIND });

  frame.layers.splice(at < 0 ? frame.layers.length : at + 1, 0, layer);

  return layer;
}

export function restoreBody(project, animation, frame) {
  const { name, key } = anyBody(animation);

  return putBody(frame, { name, key, canvas: project.canvas });
}

// a cut poses any frame, so each has a Body, even one whose Body was deleted
function bodyInEveryFrame(project, animation, above) {
  const { name, key } = anyBody(animation) ?? { name: 'Body', key: newId('k') };

  for (const frame of framesOf(animation)) {
    if (!bodyOf(frame)) {
      putBody(frame, { name, key, canvas: project.canvas, above });
    }
  }

  return key;
}

// cut: { direction, frame, layerKey, source, art, leftover, rig }. The first cut of a view takes
// the parts off the layer that was cut, in this frame and every frame drawn the same; a new cut
// of a view redraws the frames posed with the old one. Returns how many frames the Body now draws.
export function applyCut(project, animation, cut) {
  const key = bodyInEveryFrame(project, animation, cut.layerKey);
  const entry = animation.directions[cut.direction];
  const recut = Boolean(entry.rig);
  const place = { key, canvas: project.canvas };

  entry.rig = cut.rig;

  return recut ? cutAgain(entry, cut, place) : firstCut(entry, cut, place);
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
