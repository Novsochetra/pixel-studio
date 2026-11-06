const PRESETS = 'presets';

// the presets saved here: [{ id, label, kind, directionSet, startWith, canvas, parts, names, game,
// guides, palettes, exportSettings, preview, referenceDirection, fps }]
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

export function savePreset(backend, preset) {
  return changePresets(backend, (list) => [
    ...list.filter((entry) => entry.id !== preset.id),
    preset,
  ]);
}

export function deletePreset(backend, id) {
  return changePresets(backend, (list) => list.filter((entry) => entry.id !== id));
}
