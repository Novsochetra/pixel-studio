const PRESETS = 'presets';

// the presets saved here: [{ id, label, kind, directionSet, startWith, canvas, parts, names, game,
// guides }]
export async function readPresets(backend) {
  try {
    const doc = await backend.read(PRESETS);

    return Array.isArray(doc?.list) ? doc.list : [];
  } catch {
    return [];
  }
}

export async function savePreset(backend, preset) {
  const list = (await readPresets(backend)).filter((entry) => entry.id !== preset.id);
  await backend.write(PRESETS, { list: [...list, preset] });
}

export async function deletePreset(backend, id) {
  const list = await readPresets(backend);
  await backend.write(PRESETS, { list: list.filter((entry) => entry.id !== id) });
}
