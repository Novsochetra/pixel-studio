const KEY = 'pixel-clean-left-unsaved';

// the browser's own store, or null where a private window or a blocked one has none to give
export function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// A save begun as the page is left may never land: a tab that is closed, or an app put away on
// a phone, is gone before the store answers. What that save would write is kept here first, in
// the one store a page can write to at once, and put into the saved work on the next visit.
// `storage` is browserStorage(): one that is missing, full or refused keeps nothing, and the
// save begun is all there is, as before.
export function keepLeftUnsaved(storage, { kind, docs }) {
  if (!docs.length) {
    return;
  }

  try {
    storage?.setItem(KEY, JSON.stringify({ kind, at: Date.now(), docs }));
  } catch {
    dropLeftUnsaved(storage);
  }
}

export function dropLeftUnsaved(storage) {
  try {
    storage?.removeItem(KEY);
  } catch {
    // nothing was kept there either
  }
}

function read(storage) {
  try {
    const kept = JSON.parse(storage?.getItem(KEY) ?? 'null');

    return Array.isArray(kept?.docs) ? kept : null;
  } catch {
    return null;
  }
}

// whether the saved work already holds a save as new as what was kept: the save begun on the
// way out did land, or another tab has saved the project since
async function alreadySaved(backend, kept) {
  const project = kept.docs.find(([, data]) => typeof data?.json === 'string');
  const stored = project ? await backend.read(project[0]) : null;

  return !project || (stored?.savedAt ?? 0) >= kept.at;
}

// Resolves to whether work left unsaved was put back. It is for the backend it was kept from:
// what was drawn signed out is not written into an account's work.
export async function restoreLeftUnsaved(storage, backend) {
  const kept = read(storage);

  if (!kept || kept.kind !== backend.kind || (await alreadySaved(backend, kept))) {
    dropLeftUnsaved(storage);

    return false;
  }

  for (const [key, data] of kept.docs) {
    await backend.write(key, data);
  }

  dropLeftUnsaved(storage);

  return true;
}
