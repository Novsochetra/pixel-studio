import { toast } from '../dom.js';
import { openProject } from '../session.js';
import { portraitUrl, readPortrait } from '../../store/portraits.js';
import { inWords } from '../../model/told.js';

// The open project's picture is made from the screen, so it is never behind its last save. It is
// made once for each project opened while the window is up, as a search draws the list per key.
export function castPictures(app) {
  const read = new Map();
  let made = { project: null, url: null };
  const of = (entry) => {
    if (!read.has(entry.id)) {
      read.set(entry.id, readPortrait(app.backend, entry.prefix));
    }

    return read.get(entry.id);
  };
  const ofOpen = () => {
    const { project } = app.store.state;

    if (made.project !== project) {
      made = { project, url: portraitUrl(project) };
    }

    return made.url;
  };
  const open = (entry) => () =>
    openProject(app, entry).then(
      () => toast(`Opened ${entry.name}`),
      (error) => toast(inWords(error, `${entry.name} could not be opened. Try again in a moment.`)),
    );
  const cast = (entries = app.index.list) => {
    const { project } = app.store.state;

    return entries.map((entry) =>
      entry.id === project.id
        ? { name: project.name, url: Promise.resolve(ofOpen()), open: null }
        : { name: entry.name, url: of(entry), open: open(entry) },
    );
  };

  return { of, ofOpen, cast };
}
