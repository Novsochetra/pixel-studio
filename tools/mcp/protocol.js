import { argsProblem } from './check-args.js';

// The Model Context Protocol, as much of it as a server of tools needs: JSON-RPC 2.0 messages.
// Written out here so the server needs nothing installed. Over stdio (server.js) or http
// (server/src/mcp/), the messages are the same.
const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER = { name: 'pixel-clean-studio', version: '1.0.0' };

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
async function call(tools, { name, arguments: args = {} }) {
  const tool = tools.find((each) => each.name === name);

  if (!tool) {
    return failed(`No tool is called ${name}.`);
  }

  const problem = argsProblem(tool, args);

  if (problem) {
    return failed(problem);
  }

  try {
    return { content: await tool.run(args) };
  } catch (error) {
    return failed(saidOf(error));
  }
}

function methodsOf({ tools, instructions }) {
  return {
    // the version the client asked for when this server speaks it, else the newest it does
    initialize: ({ protocolVersion }) => ({
      protocolVersion: VERSIONS.includes(protocolVersion) ? protocolVersion : VERSIONS[0],
      capabilities: { tools: {} },
      serverInfo: SERVER,
      instructions,
    }),
    ping: () => ({}),
    'tools/list': () => ({
      tools: tools.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
    }),
    'tools/call': (params) => call(tools, params),
  };
}

// answer(message): the answer to one message, or null for a notification, which is not answered
export function mcpAnswerer(server) {
  const methods = methodsOf(server);

  return async (message) => {
    if (message?.id === undefined) {
      return null;
    }

    const method = methods[message.method];

    if (!method) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32601, message: `Method not found: ${message.method}` },
      };
    }

    return { jsonrpc: '2.0', id: message.id, result: await method(message.params ?? {}) };
  };
}
