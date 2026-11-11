const PRESETS = 'presets';

// the presets saved here: [{ id, label, kind, directionSet, startWith, canvas, parts, names, game,
// guides, palettes, exportSettings, referenceDirection, fps }]
const listIn = async (backend) => {
  const doc = await backend.read(PRESETS);

  return Array.isArray(doc?.list) ? doc.list : [];
};

export async function readPresets(backend) {
  try {
    return await listIn(backend);
  } catch {
    return [];
  }
}

// a list that could not be read is never written back, which would drop every preset in it
async function changePresets(backend, change) {
  const list = await listIn(backend);

  await backend.write(PRESETS, { list: change(list) });
}

const sameLabel = (first, second) => Boolean(first.label) && first.label === second.label;

export function savePreset(backend, preset) {
  // one preset to a name: saved again, it takes the place of the one before
  return changePresets(backend, (list) => [
    ...list.filter((entry) => entry.id !== preset.id && !sameLabel(entry, preset)),
    preset,
  ]);
}

export function deletePreset(backend, id) {
  return changePresets(backend, (list) => list.filter((entry) => entry.id !== id));
}
