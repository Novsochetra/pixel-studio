import { fillMissingSprites } from './session.js';
import { sampleProject } from './sample.js';
import { loadProject } from '../store/load.js';
import { keysFor, prefixFor } from '../store/keys.js';
import { newId } from '../model/project.js';

// the open one first, then the rest of the list, then work saved before projects existed (its
// documents have no prefix)
function candidates(index) {
  const current = index.list.filter((entry) => entry.id === index.current);
  const rest = index.list.filter((entry) => entry.id !== index.current);
  const legacy = index.list.some((entry) => entry.prefix === '') ? [] : [{ id: null, prefix: '' }];

  return [...current, ...rest, ...legacy];
}

// The project the page opens with. The sample only takes the plain document names when nothing at
// all is saved; whenever saved work could not be read, it gets documents of its own, so editing
// it can never write over that work.
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

  const sample = fillMissingSprites(await sampleProject());
  const safe = failed || index.list.length > 0;

  if (safe) {
    sample.id = newId('p');
  }

  return { project: sample, prefix: safe ? prefixFor(sample.id) : '', save: 'on-change', failed };
}
