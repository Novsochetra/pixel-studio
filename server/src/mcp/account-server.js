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

// A page open on the account follows each change a tool makes and shows it at once; a page with
// no way to the server (no network) still saves over it as it comes back.
const INSTRUCTIONS =
  'Tools for the projects saved in one Pixel Clean Studio account. Start with list_projects, then describe_project; read_frame before and after set_pixels. A studio signed in to this account with the project open shows each change at once, so the user can watch you draw. Draw in small steps (a part, an outline, a shade at a time) rather than one huge set_pixels, so they see it take shape. Each change is one step they can undo.';

export function accountServer(backend) {
  const shelf = accountShelf(backend);

  return { tools: [listTool(shelf), ...toolsFor(shelf)], instructions: INSTRUCTIONS };
}
