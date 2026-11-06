// A search looks through every project, whatever place is open: among many folders, finding a
// project should not need knowing where it is.
export const EVERY_PROJECT = 'all';
export const NO_FOLDER = 'none';

const foldersOf = (index) => index.folders ?? [];

const byName = (first, second) =>
  first.name.localeCompare(second.name, undefined, { numeric: true, sensitivity: 'base' });

const ORDERS = {
  recent: (first, second) => (second.updatedAt ?? 0) - (first.updatedAt ?? 0),
  name: byName,
};

const wordsOf = (query) => query.toLowerCase().split(/\s+/).filter(Boolean);

const hasEvery = (text, words) => words.every((word) => text.toLowerCase().includes(word));

export function foldersByName(index) {
  return [...foldersOf(index)].sort(byName);
}

// the place remembered from before may be a folder deleted since
export function knownPlace(index, place) {
  if (place === EVERY_PROJECT || place === NO_FOLDER) {
    return place;
  }

  return foldersOf(index).some((folder) => folder.id === place) ? place : EVERY_PROJECT;
}

function folderNames(index) {
  return new Map(foldersOf(index).map((folder) => [folder.id, folder.name]));
}

function inPlace(entry, place, names) {
  if (place === EVERY_PROJECT) {
    return true;
  }

  return place === NO_FOLDER ? !names.has(entry.folder) : entry.folder === place;
}

function matches(entry, words, names) {
  return hasEvery(`${entry.name} ${entry.about ?? ''} ${names.get(entry.folder) ?? ''}`, words);
}

export function projectsIn(index, { place = EVERY_PROJECT, query = '', sort = 'recent' } = {}) {
  const words = wordsOf(query);
  const names = folderNames(index);
  const shown = index.list.filter((entry) =>
    words.length ? matches(entry, words, names) : inPlace(entry, place, names),
  );

  return shown.sort(ORDERS[sort] ?? ORDERS.recent);
}

export function foldersMatching(index, query) {
  const words = wordsOf(query);

  if (!words.length) {
    return foldersByName(index);
  }

  const holding = new Set(projectsIn(index, { query }).map((entry) => entry.folder));

  return foldersByName(index).filter(
    (folder) => holding.has(folder.id) || hasEvery(folder.name, words),
  );
}

export function countsByPlace(index) {
  const names = folderNames(index);
  const counts = new Map([
    [EVERY_PROJECT, index.list.length],
    [NO_FOLDER, 0],
    ...[...names.keys()].map((id) => [id, 0]),
  ]);

  for (const entry of index.list) {
    const place = names.has(entry.folder) ? entry.folder : NO_FOLDER;

    counts.set(place, counts.get(place) + 1);
  }

  return counts;
}
