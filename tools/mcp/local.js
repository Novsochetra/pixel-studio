import { FILE_SHELF } from './file-shelf.js';
import { mcpAnswerer } from './protocol.js';
import { toolsFor } from './tools.js';
import { cleanTool } from './tools-files.js';

export const TOOLS = [...toolsFor(FILE_SHELF), cleanTool(FILE_SHELF)];

export const answer = mcpAnswerer({
  tools: TOOLS,
  instructions:
    'Tools for Pixel Clean Studio project files (.json, written by the studio’s "Save project file" and opened by "Open a project file…"). Start with describe_project; read_frame before and after set_pixels.',
});
