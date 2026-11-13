import { tokenHash } from '../accounts/sessions.js';
import { readJson } from '../http/read-json.js';
import { BASE_HEADERS, sendError, sendJson } from '../http/responses.js';
import { route } from '../router.js';
import { mcpAnswerer } from '../../../tools/mcp/protocol.js';
import { accountServer } from './account-server.js';

const BEARER = /^Bearer\s+(\S+)$/i;

const NO_KEY = {
  status: 401,
  message: 'Send the key the studio made for Claude Code (Projects, Account, Claude Code).',
  headers: { 'WWW-Authenticate': 'Bearer realm="pixel-clean-studio"' },
};

async function keyHolder(request, keys) {
  const given = BEARER.exec(request.headers.authorization ?? '')?.[1];

  return given ? keys.userOfKey(tokenHash(given)) : null;
}

const UNREACHABLE = 'Your saved work could not be reached just now. Try again in a moment.';

// The database's and the bucket's own words are for the server's log: a tool's caller is told
// a sentence, as a page is.
function accountBackend({ docs, logError }, userId) {
  const said =
    (work) =>
    async (...args) => {
      try {
        return await work(...args);
      } catch (error) {
        logError(error);
        throw new Error(UNREACHABLE);
      }
    };

  return {
    read: said((key) => docs.read(userId, key)),
    write: said((key, data) => docs.writeAll(userId, [[key, data]])),
    writeAll: said((entries) => docs.writeAll(userId, entries)),
    remove: said((key) => docs.remove(userId, key)),
  };
}

// one after another, as a batch's changes to one project would overwrite each other together
async function answersTo(messages, answer) {
  const replies = [];

  for (const message of messages) {
    replies.push(await answer(message));
  }

  return replies.filter(Boolean);
}

// MCP's Streamable HTTP, without its event streams: every message is answered as JSON at once,
// and what holds no request (a notification) is taken with 202.
async function mcp(request, response, deps) {
  const { keys } = deps;
  const user = await keyHolder(request, keys);
  const body = user && (await readJson(request));

  if (!user) {
    return sendError(response, NO_KEY);
  }

  if (!body.ok) {
    return sendError(response, body);
  }

  const answer = mcpAnswerer(accountServer(accountBackend(deps, user.id)));
  const replies = await answersTo([body.value].flat(), answer);

  if (!replies.length) {
    response.writeHead(202, BASE_HEADERS);

    return response.end();
  }

  return sendJson(response, { json: Array.isArray(body.value) ? replies : replies[0] });
}

// deps: { keys, docs, logError }
export const mcpRoutes = (deps) => [
  route('/mcp', { POST: (request, response) => mcp(request, response, deps) }),
];
