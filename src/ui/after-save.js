import { saveProjectList, upsertEntry } from '../store/projects.js';
import { savePortrait } from '../store/portraits.js';

function saveIndex(app, project) {
  const changed = upsertEntry(app.index, project, app.keys.prefix);

  if (changed || app.index.current !== project.id || app.index.unreadable || app.index.unwritten) {
    app.index.current = project.id;
    app.index.unwritten = false;

    return saveProjectList(app.backend, app.index);
  }

  return null;
}

// the picture is only for show: failing to write it is no failed save
export async function afterSave(app, project) {
  await saveIndex(app, project);
  app.otherTabs?.saved(project.id);

  try {
    app.portrait = await savePortrait(app.backend, app.keys, project, app.portrait);
  } catch {
    app.portrait = undefined;
  }
}
