import { fillMissingSprites } from './session.js';
import { loadProject } from '../store/load.js';
import { keysFor } from '../store/keys.js';

// the open one first, then the rest of the list, then work saved before projects existed (its
// documents have no prefix)
function candidates(index) {
  const current = index.list.filter((entry) => entry.id === index.current);
  const rest = index.list.filter((entry) => entry.id !== index.current);
  const legacy = index.list.some((entry) => entry.prefix === '') ? [] : [{ id: null, prefix: '' }];

  return [...current, ...rest, ...legacy];
}

// The project the page opens with: the one open last time, else any other listed, else work saved
// before projects existed. None when nothing is saved (or nothing could be read): the start
// screen shows instead, and every project made there gets documents of its own.
export async function firstProject(backend, index) {
  let failed = index.unreadable === true;

  for (const entry of candidates(index)) {
    try {
      const project = await loadProject(backend, keysFor(entry.prefix));

      if (project) {
        // saved before projects had ids: keep the one the list knows, or a fixed one, so the
        // project is the same entry on every visit
        project.id ??= entry.id ?? 'first-project';

        return { project: fillMissingSprites(project), prefix: entry.prefix, save: 'nothing' };
      }

      failed ||= entry.id !== null;
    } catch {
      failed = true;
    }
  }

  return { project: null, failed };
}
