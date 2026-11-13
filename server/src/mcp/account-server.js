import { schema, text } from '../../../tools/mcp/answers.js';
import { toolsFor } from '../../../tools/mcp/tools.js';
import { accountShelf } from './account-shelf.js';

const day = (time) => new Date(time).toISOString().slice(0, 10);

function listSaid({ list, folders }) {
  const folderName = (id) => folders.find((folder) => folder.id === id)?.name;
  const lines = [...list]
    .sort((first, second) => (second.updatedAt ?? 0) - (first.updatedAt ?? 0))
    .map((entry) => {
      const folder = folderName(entry.folder);

      return `${entry.name}: ${entry.about}, changed ${day(entry.updatedAt ?? 0)}${folder ? `, in ${folder}` : ''}`;
    });

  return lines.join('\n') || 'No projects yet. Make one with new_project, or in the studio.';
}

const listTool = (shelf) => ({
  name: 'list_projects',
  description:
    'The projects saved in this Pixel Clean Studio account, the last changed first: each one’s name, what it is and when it changed. Call this first.',
  inputSchema: schema({}, []),
  run: async () => [text(listSaid(await shelf.list()))],
});

// The page reads a project from the server as it opens it, and saves the whole of it as it is
// edited: a tab with the project open saves over what a tool changed.
const INSTRUCTIONS =
  'Tools for the projects saved in one Pixel Clean Studio account. Start with list_projects, then describe_project; read_frame before and after set_pixels. The studio shows a change the next time the project is opened: tell the user to close the project in the studio while you edit it, or the studio saves over your change.';

export function accountServer(backend) {
  const shelf = accountShelf(backend);

  return { tools: [listTool(shelf), ...toolsFor(shelf)], instructions: INSTRUCTIONS };
}
