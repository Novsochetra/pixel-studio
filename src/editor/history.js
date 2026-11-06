import { cloneSprite, samePixels } from '../model/sprite.js';

// A copy of every animation, pixels included, so a frame, layer or animation change can be undone.
export function snapshotAnimations(animations) {
  return animations.map((animation) => ({
    ...animation,
    directions: Object.fromEntries(
      Object.entries(animation.directions).map(([direction, entry]) => [
        direction,
        {
          ...entry,
          frames: entry.frames.map((frame) => ({
            ...frame,
            marks: frame.marks?.map((mark) => ({ ...mark })),
            layers: frame.layers.map((layer) => ({
              ...layer,
              sprite: layer.sprite && cloneSprite(layer.sprite),
            })),
          })),
        },
      ]),
    ),
  }));
}

function layerPixels(animations) {
  const pixels = new Map();

  for (const animation of animations) {
    for (const entry of Object.values(animation.directions)) {
      for (const frame of entry.frames) {
        for (const layer of frame.layers) {
          pixels.set(layer.id, layer.sprite?.pixels);
        }
      }
    }
  }

  return pixels;
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

// Undo steps are pixel changes to some layers (found again by id, so a step still works after
// frames or layers were rebuilt) or a change to the animations themselves.
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

  // record the layers' state after a change, given their state before it
  record(label, changes) {
    const real = changes.filter(({ layer, before }) => !samePixels(before, layer.sprite));

    if (!real.length) {
      return false;
    }

    this.push({
      label,
      kind: 'pixels',
      changes: real.map(({ layer, before }) => ({
        id: layer.id,
        before,
        after: cloneSprite(layer.sprite),
      })),
    });

    return true;
  }

  recordStructure(label, before, project) {
    this.push({ label, kind: 'structure', before, after: snapshotAnimations(project.animations) });
  }

  apply(step, side, project) {
    if (step.kind === 'structure') {
      project.animations = snapshotAnimations(step[side]);

      return;
    }

    for (const change of step.changes) {
      const layer = this.findLayer(change.id);

      if (layer) {
        layer.sprite = cloneSprite(change[side]);
      }
    }
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
