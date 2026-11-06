import { newId } from '../model/project.js';

const foldersOf = (index) => index.folders ?? [];

export function folderNamed(index, name) {
  return foldersOf(index).find((folder) => folder.name === name) ?? null;
}

// numbered, so two new folders are never mistaken for each other
export function freshFolderName(index, base = 'New folder') {
  let name = base;

  for (let count = 2; folderNamed(index, name); count++) {
    name = `${base} ${count}`;
  }

  return name;
}

export function addFolder(index, name = freshFolderName(index)) {
  const folder = { id: newId('d'), name };

  index.folders = [...foldersOf(index), folder];

  return folder;
}

export function renameFolder(index, id, name) {
  const folder = foldersOf(index).find((each) => each.id === id);

  if (folder && name.trim()) {
    folder.name = name.trim();
  }
}

// a folder only groups projects, so its projects outlive it
export function removeFolder(index, id) {
  index.folders = foldersOf(index).filter((folder) => folder.id !== id);

  for (const entry of index.list) {
    if (entry.folder === id) {
      delete entry.folder;
    }
  }
}

export function folderOf(index, projectId) {
  const folder = index.list.find((entry) => entry.id === projectId)?.folder;

  return foldersOf(index).some((each) => each.id === folder) ? folder : null;
}

export function moveToFolder(index, projectId, folderId) {
  const entry = index.list.find((each) => each.id === projectId);
  const known = foldersOf(index).some((folder) => folder.id === folderId);

  if (!entry) {
    return;
  }

  if (known) {
    entry.folder = folderId;
  } else {
    delete entry.folder;
  }
}

// a project whose folder is gone still shows, in none
export function byFolder(index) {
  const folders = foldersOf(index);
  const known = new Set(folders.map((folder) => folder.id));
  const groups = folders.map((folder) => ({
    folder,
    entries: index.list.filter((entry) => entry.folder === folder.id),
  }));

  return [
    ...groups,
    { folder: null, entries: index.list.filter((entry) => !known.has(entry.folder)) },
  ];
}
