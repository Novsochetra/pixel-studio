import { cloneSprite, flipHorizontal } from '../model/sprite.js';
import { allLayers, frameAt, layerAt } from '../model/project.js';
import { compositeFrame } from '../model/composite.js';
import { changedLayers, snapshotAnimations } from '../editor/history.js';
import { referenceOf } from '../model/reference.js';
import { clampShift, shiftFrame } from '../model/frame-shift.js';

export function currentAnimation(state) {
  return state.project.animations.find((a) => a.id === state.at.animation) ?? state.project.animations[0];
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

  return frame ? compositeFrame(frame, state.project.canvas.width, state.project.canvas.height, options) : null;
}

// the art of a view counting hidden layers: what cleaning matches and the colours come from
export function artSprite(state, direction, frameIndex = state.at.frame ?? 0) {
  return directionSprite(state, direction, frameIndex, { includeHidden: true });
}

// art layers of this frame of the view that are hidden but have something drawn on them
export function hiddenArt(state, direction) {
  const frame = frameAt(state.project, { ...state.at, direction });

  return (frame?.layers ?? []).filter((layer) => layer.kind !== 'reference' && !layer.visible && layer.sprite?.pixels.some((v, i) => i % 4 === 3 && v));
}

export function currentFrames(state) {
  return currentAnimation(state).directions[state.at.direction]?.frames ?? [];
}

// every art layer of the whole character, every animation and frame
export function allArtLayers(state) {
  return [...allLayers(state.project)].map(({ layer }) => layer).filter((layer) => layer.kind !== 'reference');
}

// the pose every view is matched to: the reference view's first frame of the first animation
export function referenceSprite(state) {
  const direction = referenceOf(state.project);
  const frame = state.project.animations.find((a) => a.directions[direction])?.directions[direction].frames[0];

  return frame ? compositeFrame(frame, state.project.canvas.width, state.project.canvas.height, { includeHidden: true }) : null;
}

// Change some layers as one undoable step, then save and redraw.
export function commit(app, label, layers, mutate) {
  const before = layers.map((layer) => ({ layer, before: cloneSprite(layer.sprite) }));
  mutate();

  if (app.history.record(label, before)) {
    app.saver.markLayers(layers.map((layer) => layer.id));
    app.store.touch('pixels');
  }
}

// After frames, layers or animations change, the place being edited may no longer exist: keep
// the animation, direction, frame and layer the closest ones that do.
export function settleAt(state) {
  const animation = currentAnimation(state);
  const directions = Object.keys(animation.directions);
  const direction = directions.includes(state.at.direction) ? state.at.direction : directions[0];
  const frames = animation.directions[direction].frames;
  const frame = Math.max(0, Math.min(state.at.frame ?? 0, frames.length - 1));
  const layer = frames[frame].layers.some((l) => l.key === state.at.layer) ? state.at.layer : null;

  return { animation: animation.id, direction, frame, layer };
}

function afterHistory(app, step) {
  if (!step) {
    return;
  }

  if (step.kind === 'structure') {
    // either side may hold layers the other lacks, so compare both ways
    app.saver.markLayers([...changedLayers(step.before, step.after), ...changedLayers(step.after, step.before)]);
    app.saver.markNewLayers(app.store.state.project);
    app.saver.markStructure();
    app.store.set({ at: settleAt(app.store.state), selection: null });
    app.store.touch('animations');

    return;
  }

  app.saver.markLayers(step.changes.map(({ id }) => id));
  app.store.touch('pixels');
}

export function undo(app) {
  afterHistory(app, app.history.undo(app.store.state.project));
}

export function redo(app) {
  afterHistory(app, app.history.redo(app.store.state.project));
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
  app.store.set({ at: settleAt({ ...state, at: { ...state.at, ...at } }), selection: null });
  app.store.touch('animations');
}

// the open frame moved, stopping at the canvas edge; one undo step
export function shiftCurrentFrame(app, dx, dy) {
  const { project, at } = app.store.state;
  const [x, y] = clampShift(frameAt(project, at), project.canvas.width, project.canvas.height, dx, dy);

  if (x || y) {
    restructure(app, 'Move frame', (state) => {
      shiftFrame(frameAt(state.project, state.at), x, y);
    });
  }
}

export function flipCurrent(app) {
  const layer = currentLayer(app.store.state);
  commit(app, 'Flip', [layer], () => {
    layer.sprite = flipHorizontal(layer.sprite);
  });
}

// a cleaned image into one frame of a view: onto the layer being edited, unless that is a picture
// to trace, which never reaches a download
export function replaceDirectionArt(app, direction, sprite, label, frame = app.store.state.at.frame) {
  const at = { ...app.store.state.at, direction, frame };
  const chosen = layerAt(app.store.state.project, at);
  const layer = chosen.kind === 'reference' ? layerAt(app.store.state.project, { ...at, layer: null }) : chosen;
  commit(app, label, [layer], () => {
    layer.sprite = cloneSprite(sprite);
  });
}

export function selectDirection(app, direction) {
  app.store.set({ at: { ...app.store.state.at, direction }, selection: null });
}

export function selectFrame(app, frame) {
  app.store.set({ at: { ...app.store.state.at, frame }, selection: null });
}

export function changeStructure(app, what = 'structure') {
  app.saver.markStructure();
  app.store.touch(what);
}
