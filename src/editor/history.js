import { cloneSprite, samePixels } from '../model/sprite.js';
import { sameAnimations, snapshotAnimations } from './snapshots.js';
import { joinSteps } from './history-join.js';

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

  // returns whether anything changed: a frame moved onto itself is no step to undo
  recordStructure(label, before, project) {
    const after = snapshotAnimations(project.animations);

    if (sameAnimations(before, after)) {
      return false;
    }

    this.push({ label, kind: 'structure', before, after });

    return true;
  }

  // one of the project's own settings (which view is the reference), before and after
  recordSetting(label, key, before, after) {
    this.push({ label, kind: 'setting', key, before, after });
  }

  // A whole project in the place of the open one (a canvas of another size, a version gone back
  // to): before and after are the two projects, and view what the editor showed with each. The
  // page swaps them itself, as each has saved work of its own to write.
  recordProject(label, { before, after }, view = null) {
    this.push({ label, kind: 'project', before, after, view });
  }

  apply(step, side, project) {
    if (step.kind === 'project') {
      return;
    }

    if (step.kind === 'structure') {
      project.animations = snapshotAnimations(step[side]);

      return;
    }

    if (step.kind === 'setting') {
      project[step.key] = structuredClone(step[side]);

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
    step.also?.forEach((setting) => {
      project[setting.key] = structuredClone(setting[side]);
    });
  }

  // A setting the step just recorded changed too (guides that follow a colour swapped): undone
  // and made again with it, as one step. Two steps, one undo left the guides on a colour the
  // art no longer had.
  alsoSetting(key, before, after) {
    const step = this.done.at(-1);

    if (step) {
      step.also = [...(step.also ?? []), { key, before, after }];
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

  // the step just recorded moved the editor to another frame, layer or animation: undo goes back
  // to where it was made from, and redo to where it led
  keepPlace(before, after) {
    const step = this.done.at(-1);

    if (step) {
      step.place = { before, after };
    }
  }

  // the step just recorded moved the selection too: undo puts it back where it was
  keepSelection(before) {
    const step = this.done.at(-1);

    if (step) {
      step.selection = { before };
    }
  }

  // A run of the same small step (a nudge by the arrows, key after key) is one step to undo:
  // the newest joins the one before it. Resolves to whether it did.
  joinLast() {
    const [first, second] = this.done.slice(-2);

    return joinSteps(first, second) && Boolean(this.done.pop());
  }

  get nextUndo() {
    return this.done.at(-1)?.label ?? null;
  }

  // The project the steps act on. Read again from saved work (`reread`) it is another object
  // than the one the steps knew, so a step that swaps whole projects is pointed at this one where
  // it held that one: undo went no further back than a canvas size once another project had
  // been looked at.
  openOn(project, reread = false) {
    const swaps = [...this.done, ...this.undone].filter((step) => step.kind === 'project');

    for (const step of reread ? swaps : []) {
      step.before = step.before === this.open ? project : step.before;
      step.after = step.after === this.open ? project : step.after;
    }

    this.open = project;
  }
}
