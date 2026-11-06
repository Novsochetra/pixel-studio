import { saveProjectList, upsertEntry } from '../store/projects.js';
import { savePortrait } from '../store/portraits.js';

// the projects list follows each save: names, kinds, which one is open
function saveIndex(app, project) {
  const changed = upsertEntry(app.index, project, app.keys.prefix);

  if (changed || app.index.current !== project.id || app.index.unreadable || app.index.unwritten) {
    app.index.current = project.id;
    app.index.unwritten = false;

    return saveProjectList(app.backend, app.index);
  }

  return null;
}

// After each save of the open project: the projects list, then the picture it shows of the
// project. The picture is only for show, so failing to write it never counts as a failed save.
export async function afterSave(app, project) {
  await saveIndex(app, project);

  try {
    app.portrait = await savePortrait(app.backend, app.keys, project, app.portrait);
  } catch {
    app.portrait = undefined;
  }
}
