import { CLEAR, getPixel } from '../sprite.js';
import { newId } from '../project.js';
import { decodeArt } from './piece-art.js';
import { guessOwners } from './guess.js';
import { defaultPivot } from './pivots.js';
import { renderBody, restPose } from './rig.js';

// What the cut sheet edits before anything is cut: the parts, bottom first ({ id, name, parent,
// pivot }, pivot null until one is placed), and owners, each canvas pixel's place in the list.

export function planFromTemplate(source, template) {
  const parts = template.map((part) => ({ ...part, pivot: null }));

  return { parts, owners: guessOwners(source, parts) };
}

// a view cut before, ready to cut again: each pixel belongs to the part drawn on top of it at rest
export function planFromRig(rig, canvas) {
  const owners = new Int16Array(canvas.width * canvas.height).fill(-1);

  rig.pieces.forEach((piece, index) => {
    const { x, y, sprite } = decodeArt(piece.art);

    for (let row = 0; row < sprite.height; row++) {
      for (let column = 0; column < sprite.width; column++) {
        if (getPixel(sprite, column, row) !== CLEAR) {
          owners[(y + row) * canvas.width + x + column] = index;
        }
      }
    }
  });

  return {
    parts: rig.pieces.map(({ id, name, parent, pivot }) => ({ id, name, parent, pivot })),
    owners,
    source: renderBody(rig, restPose(), canvas),
  };
}

// a square brush of `size` art pixels gives the art under it to part `index` (-1: to none)
export function paintOwners(plan, { source, point, size, index }) {
  const start = [point[0] - Math.floor((size - 1) / 2), point[1] - Math.floor((size - 1) / 2)];

  for (let y = start[1]; y < start[1] + size; y++) {
    for (let x = start[0]; x < start[0] + size; x++) {
      if (getPixel(source, x, y) !== CLEAR) {
        plan.owners[y * source.width + x] = index;
      }
    }
  }
}

export function partSizes(plan) {
  const sizes = plan.parts.map(() => 0);

  plan.owners.forEach((owner) => {
    if (owner >= 0) {
      sizes[owner] += 1;
    }
  });

  return sizes;
}

// every part's pivot: the one placed, or where it would go by default
export function pivotsOf(plan, size) {
  const indexOf = new Map(plan.parts.map((part, index) => [part.id, index]));

  return plan.parts.map(
    (part, index) =>
      part.pivot ??
      defaultPivot(plan.owners, size, { index, parentIndex: indexOf.get(part.parent) }),
  );
}

// the parts that follow `id`, near and far: none of them can be what it follows
export function followersOf(plan, id) {
  const found = new Set();
  let added = true;

  while (added) {
    added = false;

    for (const part of plan.parts) {
      if ((part.parent === id || found.has(part.parent)) && !found.has(part.id)) {
        found.add(part.id);
        added = true;
      }
    }
  }

  return found;
}

function remap(plan, newIndexOf) {
  plan.owners = plan.owners.map((owner) => (owner >= 0 ? newIndexOf(owner) : owner));
}

// a part one place up (step 1) or down (-1) in the drawing order, its pixels going with it
export function movePart(plan, index, step) {
  const other = index + step;

  if (other < 0 || other >= plan.parts.length) {
    return index;
  }

  [plan.parts[index], plan.parts[other]] = [plan.parts[other], plan.parts[index]];
  remap(plan, (owner) => ({ [index]: other, [other]: index })[owner] ?? owner);

  return other;
}

// a part taken out: its pixels belong to none, the parts that followed it follow its parent
export function removePart(plan, index) {
  const [gone] = plan.parts.splice(index, 1);

  plan.parts.forEach((part) => {
    if (part.parent === gone.id) {
      part.parent = gone.parent;
    }
  });
  remap(plan, (owner) => {
    if (owner === index) {
      return -1;
    }

    return owner > index ? owner - 1 : owner;
  });
}

// a new part on top, following `parent`; returns its place
export function addPart(plan, { name, parent }) {
  plan.parts.push({ id: newId('part'), name, parent, pivot: null });

  return plan.parts.length - 1;
}
