import { cloneSprite, samePixels } from '../model/sprite.js';

function snapshotFrame(frame) {
  return {
    ...frame,
    marks: frame.marks?.map((mark) => ({ ...mark })),
    layers: frame.layers.map((layer) => ({
      ...layer,
      sprite: layer.sprite && cloneSprite(layer.sprite),
    })),
  };
}

// A copy of every animation, pixels included, so a frame, layer or animation change can be undone.
export function snapshotAnimations(animations) {
  return animations.map((animation) => ({
    ...animation,
    directions: Object.fromEntries(
      Object.entries(animation.directions).map(([direction, entry]) => [
        direction,
        { ...entry, frames: entry.frames.map(snapshotFrame) },
      ]),
    ),
  }));
}

function layerPixels(animations) {
  const frames = animations.flatMap((animation) =>
    Object.values(animation.directions).flatMap((entry) => entry.frames),
  );

  return new Map(
    frames.flatMap((frame) => frame.layers.map((layer) => [layer.id, layer.sprite?.pixels])),
  );
}

// ids of layers whose pixels differ between two sets of animations, or that only one has
export function changedLayers(before, after) {
  const first = layerPixels(before);
  const second = layerPixels(after);
  const ids = [];

  for (const [id, pixels] of second) {
    const old = first.get(id);

    if (
      !old ||
      !pixels ||
      old.length !== pixels.length ||
      old.some((value, i) => value !== pixels[i])
    ) {
      ids.push(id);
    }
  }

  return ids;
}

function layerChange({ layer, before, poseBefore }) {
  return {
    id: layer.id,
    before,
    after: cloneSprite(layer.sprite),
    poses: { before: poseBefore, after: layer.pose },
  };
}

function setPose(layer, pose) {
  if (pose) {
    layer.pose = pose;
  } else {
    delete layer.pose;
  }
}

function setRig(project, change, side) {
  const animation = project.animations.find((candidate) => candidate.id === change.animation);
  const entry = animation?.directions[change.direction];

  if (entry) {
    entry.rig = change[side];
  }
}

// Undo steps are pixel changes to some layers (found again by id, so a step still works after
// frames or layers were rebuilt), a change to the animations themselves, or a project setting.
export class History {
  constructor(findLayer, limit = 120) {
    this.findLayer = findLayer;
    this.limit = limit;
    this.done = [];
    this.undone = [];
  }

  push(step) {
    this.done.push(step);
    this.done.splice(0, Math.max(0, this.done.length - this.limit));
    this.undone = [];
  }

  // Record the layers' state after a change, given their state before it: { layer, before } with
  // before its pixels, and poseBefore when a Body's pose may have changed too. rigs are the cuts
  // the change reached: { animation, direction, before, after }.
  record(label, changes, rigs = []) {
    const real = changes
      .map((change) => ({ poseBefore: change.layer.pose, ...change }))
      .filter(({ layer, before, poseBefore }) => {
        return !samePixels(before, layer.sprite) || poseBefore !== layer.pose;
      });

    if (!real.length && !rigs.length) {
      return false;
    }

    this.push({ label, kind: 'pixels', changes: real.map(layerChange), rigs });

    return true;
  }

  recordStructure(label, before, project) {
    this.push({ label, kind: 'structure', before, after: snapshotAnimations(project.animations) });
  }

  // one of the project's own settings (which view is the reference), before and after
  recordSetting(label, key, before, after) {
    this.push({ label, kind: 'setting', key, before, after });
  }

  apply(step, side, project) {
    if (step.kind === 'structure') {
      project.animations = snapshotAnimations(step[side]);

      return;
    }

    if (step.kind === 'setting') {
      project[step.key] = step[side];

      return;
    }

    for (const change of step.changes) {
      const layer = this.findLayer(change.id);

      if (layer) {
        layer.sprite = cloneSprite(change[side]);
        setPose(layer, change.poses[side]);
      }
    }

    step.rigs?.forEach((rig) => setRig(project, rig, side));
  }

  undo(project) {
    const step = this.done.pop();

    if (step) {
      this.apply(step, 'before', project);
      this.undone.push(step);
    }

    return step ?? null;
  }

  redo(project) {
    const step = this.undone.pop();

    if (step) {
      this.apply(step, 'after', project);
      this.done.push(step);
    }

    return step ?? null;
  }

  get canUndo() {
    return this.done.length > 0;
  }

  get canRedo() {
    return this.undone.length > 0;
  }

  get nextUndo() {
    return this.done.at(-1)?.label ?? null;
  }
}
