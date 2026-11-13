import { existsSync } from 'node:fs';
import { readProject, writeProject } from './project-files.js';

const PATH = {
  type: 'string',
  description: 'Path of the project file, as the studio’s "Save project file" writes it (.json).',
};

export const FILE_SHELF = {
  ref: { name: 'path', spec: PATH },
  savesFiles: true,
  madeWhere: 'file the studio can open ("Open a project file…")',
  makeArgs: {
    properties: { path: PATH, overwrite: { type: 'boolean' } },
    required: ['path'],
  },

  read: async ({ path }) => readProject(path),

  write: async ({ path }, project) => writeProject(path, project),

  async make({ path, overwrite = false }, project) {
    if (existsSync(path) && !overwrite) {
      throw new Error(`${path} is there already. Pass overwrite: true to start it again.`);
    }

    writeProject(path, project);

    return `at ${path}`;
  },
};
