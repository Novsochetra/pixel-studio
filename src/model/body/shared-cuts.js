// Animations copied, or started from a pose, share their views' cuts: one object each. Written out
// as text, a cut is written once, numbered, and later uses name its number ({ sameCut: n }), so a
// character with many animations still fits in one saved document.

export function writeCutsOnce() {
  const written = new Map();

  return (key, value) => {
    if (key !== 'rig' || !value || typeof value !== 'object') {
      return value;
    }

    if (written.has(value)) {
      return { sameCut: written.get(value) };
    }

    written.set(value, written.size);

    return { ...value, cut: written.size - 1 };
  };
}

function joined(rig, cuts) {
  if (rig.sameCut !== undefined) {
    return cuts[rig.sameCut];
  }

  const { cut, ...own } = rig;

  if (cut !== undefined) {
    cuts[cut] = own;
  }

  return own;
}

// read back: every use of a cut is that one cut again
export function joinCuts(project) {
  const cuts = [];

  for (const animation of project.animations ?? []) {
    for (const entry of Object.values(animation.directions ?? {})) {
      if (entry.rig) {
        entry.rig = joined(entry.rig, cuts);
      }
    }
  }

  return project;
}
