import { clearInterval, setInterval } from 'node:timers';
import { currentUser } from '../accounts/current-user.js';
import { BASE_HEADERS, sendError } from '../http/responses.js';
import { route } from '../router.js';

// Railway's proxy closes a request that says nothing for a minute
const KEEP_ALIVE_MS = 25000;

const STREAM_HEADERS = {
  ...BASE_HEADERS,
  'Content-Type': 'text/event-stream; charset=utf-8',
  Connection: 'keep-alive',
  // a proxy that holds the stream back to send it whole would send nothing until it ends
  'X-Accel-Buffering': 'no',
};

async function stream(request, response, { accounts, changes }) {
  const user = await currentUser(request, accounts);

  if (!user) {
    return sendError(response, { status: 401, message: 'Sign in to follow your saved work.' });
  }

  response.writeHead(200, STREAM_HEADERS);
  response.write('retry: 3000\n\n');

  const keepAlive = setInterval(() => response.write(': still here\n\n'), KEEP_ALIVE_MS);
  const stop = changes.listen(user.id, (change) => {
    if (change) {
      response.write(`data: ${JSON.stringify(change)}\n\n`);

      return;
    }

    response.end();
  });

  request.on('close', () => {
    clearInterval(keepAlive);
    stop();
  });
}

// deps: { accounts, changes }. The page asks with POST, which no offline worker keeps a copy of
// (src/store/server-changes.js); GET is for a person following it with curl.
export function changesRoutes(deps) {
  const follow = (request, response) => stream(request, response, deps);

  return [route('/api/changes', { GET: follow, POST: follow })];
}
