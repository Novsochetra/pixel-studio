import { editTools } from './tools-edit.js';
import { readTools } from './tools-read.js';
import { sheetTool } from './tools-files.js';

// The tools every shelf has. A shelf is where projects are kept: files on this machine
// (file-shelf.js), or an account's saved work on the studio's server (server/src/mcp/).
export const toolsFor = (shelf) => [...readTools(shelf), ...editTools(shelf), sheetTool(shelf)];
