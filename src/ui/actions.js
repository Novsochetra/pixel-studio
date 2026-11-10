import { cloneSprite, flipHorizontal } from '../model/sprite.js';
import { allLayers, frameAt, layerAt } from '../model/project.js';
import { compositeFrame } from '../model/composite.js';
import { changedLayers, snapshotAnimations } from '../editor/history.js';
import { referenceOf } from '../model/reference.js';
import { refusesPaint } from './body/body-lock.js';
import { keptSelection } from '../editor/selection-kept.js';
import { bodyOf, isBody } from '../model/body/body-kind.js';
import { clearPosedBody } from '../model/body/body.js';
import { keptPick } from '../model/layer-pick.js';

export function currentAnimation(state) {
  return (
    state.project.animations.find((animation) => animation.id === state.at.animation) ??
    state.project.animations[0]
  );
}

export function currentLayer(state) {
  return layerAt(state.project, state.at);
}

export function directionsInUse(state) {
  return Object.keys(currentAnimation(state).directions);
}

// the art of one direction at the current frame, its visible art layers stacked
export function directionSprite(state, direction, frameIndex = state.at.frame ?? 0, options = {}) {
  const frame = frameAt(state.project, { ...state.at, direction, frame: frameIndex });

  return frame
    ? compositeFrame(frame, state.project.canvas.width, state.project.canvas.height, options)
    : null;
}

// the art of a view counting hidden layers: what cleaning matches and the colours come from
export function artSprite(state, direction, frameIndex = state.at.frame ?? 0) {
  return directionSprite(state, direction, frameIndex, { includeHidden: true });
}

// art layers of this frame of the view that are hidden but have something drawn on them
export function hiddenArt(state, direction) {
  const frame = frameAt(state.project, { ...state.at, direction });

  return (frame?.layers ?? []).filter(
    (layer) =>
      layer.kind !== 'reference' &&
      !layer.visible &&
      layer.sprite?.pixels.some((value, i) => i % 4 === 3 && value),
  );
}

export function currentFrames(state) {
  return currentAnimation(state).directions[state.at.direction]?.frames ?? [];
}

// every art layer of the whole character, every animation and frame
export function allArtLayers(state) {
  return [...allLayers(state.project)]
    .map(({ layer }) => layer)
    .filter((layer) => layer.kind !== 'reference');
}

// the pose every view is matched to: the reference view's first frame of the first animation
export function referenceSprite(state) {
  const direction = referenceOf(state.project);
  const frame = state.project.animations.find((animation) => animation.directions[direction])
    ?.directions[direction].frames[0];

  return frame
    ? compositeFrame(frame, state.project.canvas.width, state.project.canvas.height, {
        includeHidden: true,
      })
    : null;
}

// Change some layers as one undoable step, then save and redraw. Returns whether anything
// changed, or null when painting there was refused.
export function commit(app, label, layers, mutate) {
  if (refusesPaint(layers)) {
    return null;
  }

  return commitPose(app, { label, layers }, mutate);
}

// as commit, where a Body's pose may change with its pixels; rigs are cuts that change too
// ({ animation, direction, before, after }), set by `mutate`
export function commitPose(app, { label, layers, rigs = [] }, mutate) {
  const before = layers.map((layer) => ({
    layer,
    before: cloneSprite(layer.sprite),
    poseBefore: layer.pose,
  }));

  mutate();

  if (!app.history.record(label, before, rigs)) {
    return false;
  }

  app.saver.markLayers(layers.map((layer) => layer.id));

  // a pose and a cut are kept with the project's structure, not its pixels
  if (rigs.length || layers.some(isBody)) {
    app.saver.markStructure();
  }

  app.store.touch('pixels');

  return true;
}

// After frames, layers or animations change, the place being edited may no longer exist: keep
// the animation, direction, frame and layer the closest ones that do.
export function settleAt(state) {
  const animation = currentAnimation(state);
  const directions = Object.keys(animation.directions);
  const direction = directions.includes(state.at.direction) ? state.at.direction : directions[0];
  const frames = animation.directions[direction].frames;
  const frame = Math.max(0, Math.min(state.at.frame ?? 0, frames.length - 1));

  // a frame without the layer edits its first; the next frame that has it picks it up again
  return { animation: animation.id, direction, frame, layer: state.at.layer };
}

// An undoable change to frames, layers or animations: `mutate` returns where to go after it.
export function restructure(app, label, mutate) {
  const { state } = app.store;
  const before = snapshotAnimations(state.project.animations);
  const at = mutate(state) ?? state.at;

  app.history.recordStructure(label, before, state.project);
  app.saver.markLayers(changedLayers(before, state.project.animations));
  app.saver.markNewLayers(state.project);
  app.saver.markStructure();
  goToSettled(app, settleAt({ ...state, at: { ...state.at, ...at } }));
  app.store.touch('animations');
}

// to a place that exists after a change, the selection kept if it is still the same drawing
export function goToSettled(app, at) {
  const { state } = app.store;
  const selection = keptSelection(state.selection, {
    from: state.at,
    to: at,
    canvas: state.project.canvas,
  });

  app.store.set({ at, selection, pickedLayers: keptPick(state.pickedLayers, at.layer) });
}

export function flipCurrent(app) {
  const layer = currentLayer(app.store.state);

  commit(app, 'Flip', [layer], () => {
    layer.sprite = flipHorizontal(layer.sprite);
  });
}

// a cleaned image into one frame of a view ({ direction, frame }): onto the layer being edited,
// unless that is a picture to trace, which never reaches a download, or the Body, which is posed
export function replaceDirectionArt(app, { direction, frame }, sprite, label) {
  const at = { ...app.store.state.at, direction, frame };
  const chosen = layerAt(app.store.state.project, at);
  const { project } = app.store.state;
  const shown = frameAt(project, at);
  const layer = chosen.kind === 'art' ? chosen : shown.layers.find((other) => other.kind === 'art');
  const layers = [layer, bodyOf(shown)].filter(Boolean);

  commitPose(app, { label, layers }, () => {
    layer.sprite = cloneSprite(sprite);
    clearPosedBody(shown, project.canvas);
  });
}

// to another animation, view, frame or layer ({ animation, direction, frame, layer })
export function goTo(app, place) {
  const { state } = app.store;

  goToSettled(app, settleAt({ ...state, at: { ...state.at, ...place } }));
}

export const selectDirection = (app, direction) => goTo(app, { direction });

export const selectFrame = (app, frame) => goTo(app, { frame });

export function changeStructure(app, what = 'structure') {
  app.saver.markStructure();
  app.store.touch(what);
}
