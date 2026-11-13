import { freeName } from '../../../src/model/free-name.js';
import { prefixFor } from '../../../src/store/keys.js';
import { listProject, readProjectDocs, readProjectList, writeProjectDocs } from './project-docs.js';

const PROJECT = {
  type: 'string',
  description: 'The project’s name, as list_projects gives it, or its id.',
};

const same = (first, second) => String(first).toLowerCase() === String(second).toLowerCase();

async function entryNamed(backend, name) {
  const { list } = await readProjectList(backend);
  // "Hero" and "hero" may both be projects: the name as written is the one, then either
  const found =
    list.find((entry) => entry.id === name || entry.name === name) ??
    list.find((entry) => same(entry.name, name));

  if (found) {
    return found;
  }

  throw new Error(
    list.length
      ? `No project "${name}". This account has ${list.map((entry) => `"${entry.name}"`).join(', ')}.`
      : 'This account has no projects yet. Make one with new_project.',
  );
}

// one for each request, so what it has seen is that request's alone
export function accountShelf(backend) {
  const seen = new Map();

  return {
    ref: { name: 'project', spec: PROJECT },
    savesFiles: false,
    madeWhere: 'in your account, listed in the studio’s Projects',
    makeArgs: { properties: {}, required: [] },

    list: () => readProjectList(backend),

    async read({ project }) {
      const { prefix } = await entryNamed(backend, project);

      return readProjectDocs(backend, { prefix, seen });
    },

    async write({ project }, changed) {
      const { prefix } = await entryNamed(backend, project);

      await writeProjectDocs(backend, changed, { prefix, seen });
      await listProject(backend, changed, prefix);
    },

    async make(_where, project) {
      const { list } = await readProjectList(backend);
      const prefix = prefixFor(project.id);

      project.name = freeName(
        project.name,
        list.map((entry) => entry.name),
      );
      await writeProjectDocs(backend, project, { prefix, seen: new Map() });
      await listProject(backend, project, prefix);

      return 'in your account: it is in the studio’s Projects';
    },
  };
}
