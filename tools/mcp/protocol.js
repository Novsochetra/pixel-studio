import { EDIT_TOOLS } from './tools-edit.js';
import { FILE_TOOLS } from './tools-files.js';
import { READ_TOOLS } from './tools-read.js';
import { argsProblem } from './check-args.js';

// The Model Context Protocol, as much of it as a server of tools needs: JSON-RPC 2.0 messages,
// one a line. Written out here so the server needs nothing installed.
export const TOOLS = [...READ_TOOLS, ...EDIT_TOOLS, ...FILE_TOOLS];

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER = { name: 'pixel-clean-studio', version: '1.0.0' };

// the version the client asked for when this server speaks it, else the newest it does
function initialize({ protocolVersion }) {
  return {
    protocolVersion: VERSIONS.includes(protocolVersion) ? protocolVersion : VERSIONS[0],
    capabilities: { tools: {} },
    serverInfo: SERVER,
    instructions:
      'Tools for Pixel Clean Studio project files (.json, written by the studio’s "Save project file" and opened by "Open a project file…"). Start with describe_project; read_frame before and after set_pixels.',
  };
}

const failed = (words) => ({ content: [{ type: 'text', text: words }], isError: true });

// A tool's own failures are sentences; the file system's and the language's are not, and are
// said in words: "ENOENT: no such file or directory" and "pixels.filter is not a function" were
// handed back as they were.
function saidOf(error) {
  if (error.code === 'ENOENT') {
    return `There is no file at ${error.path}.`;
  }

  if (error.code) {
    return `The file at ${error.path ?? 'that path'} could not be read or written.`;
  }

  return error instanceof TypeError || error instanceof RangeError
    ? 'That could not be done with these arguments: check them against the tool’s description.'
    : error.message;
}

// a tool that fails says why in words, as a result: the one calling can read it and try again
function call({ name, arguments: args = {} }) {
  const tool = TOOLS.find((each) => each.name === name);

  if (!tool) {
    return failed(`No tool is called ${name}.`);
  }

  const problem = argsProblem(tool, args);

  if (problem) {
    return failed(problem);
  }

  try {
    return { content: tool.run(args) };
  } catch (error) {
    return failed(saidOf(error));
  }
}

const METHODS = {
  initialize,
  ping: () => ({}),
  'tools/list': () => ({
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }),
  'tools/call': call,
};

// the answer to one message, or null for a notification, which is not answered
export function answer(message) {
  if (message.id === undefined) {
    return null;
  }

  const method = METHODS[message.method];

  if (!method) {
    return {
      jsonrpc: '2.0',
      id: message.id,
      error: { code: -32601, message: `Method not found: ${message.method}` },
    };
  }

  return { jsonrpc: '2.0', id: message.id, result: method(message.params ?? {}) };
}
