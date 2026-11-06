import { toast } from '../dom.js';
import { openProject } from '../session.js';
import { portraitUrl, readPortrait } from '../../store/portraits.js';

// the open project's picture is made from the screen, so it is never behind its last save
export function castPictures(app) {
  const read = new Map();
  const of = (entry) => {
    if (!read.has(entry.id)) {
      read.set(entry.id, readPortrait(app.backend, entry.prefix));
    }

    return read.get(entry.id);
  };
  const open = (entry) => () =>
    openProject(app, entry).then(
      () => toast(`Opened ${entry.name}`),
      (error) => toast(error.message),
    );
  const cast = (entries = app.index.list) => {
    const { project } = app.store.state;

    return entries.map((entry) =>
      entry.id === project.id
        ? { name: project.name, url: Promise.resolve(portraitUrl(project)), open: null }
        : { name: entry.name, url: of(entry), open: open(entry) },
    );
  };

  return { of, cast };
}
