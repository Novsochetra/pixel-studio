import { node, toast } from '../dom.js';
import { openProject } from '../session.js';
import { portraitUrl, readPortrait } from '../../store/portraits.js';

// a project's picture, or an empty box while it has none
export const projectPicture = (url) =>
  url ? node('img.project-picture', { src: url, alt: '' }) : node('span.project-picture');

// a picture still being read: an empty box until it arrives
export function laterPicture(reading) {
  const box = projectPicture(null);

  reading.then((url) => url && box.replaceWith(projectPicture(url)));

  return box;
}

// The projects' pictures, each read once while the projects list is open. The open project's is
// made from what is on screen, so it is never behind.
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

  // every project, in the list's order, with its picture and a way to open it
  const cast = () => {
    const { project } = app.store.state;

    return app.index.list.map((entry) =>
      entry.id === project.id
        ? { name: project.name, url: Promise.resolve(portraitUrl(project)), open: null }
        : { name: entry.name, url: of(entry), open: open(entry) },
    );
  };

  return { of, cast };
}
