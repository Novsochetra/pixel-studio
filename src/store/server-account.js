// The studio's own server (server/), when it is the one sending the page: who is signed in there.
// Served from anywhere else (claude.ai, a folder of files) there is no such server, and the page
// keeps its work as it always has.
const WAIT_MS = 8000;

const send = (path, options = {}) =>
  fetch(path, {
    credentials: 'same-origin',
    signal: AbortSignal.timeout(WAIT_MS),
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    ...options,
  });

// { user } signed in, { user: null } on the server and signed out, or null with no server
export async function accountOnServer() {
  try {
    const answer = await send('/api/account');
    const said = answer.ok ? await answer.json() : null;

    return said?.studio === true ? { user: said.user ?? null } : null;
  } catch {
    return null;
  }
}

const UNREACHABLE = 'The server could not be reached. Try again in a moment.';

// what the server said went wrong, in its own words, or ours where it said none
export async function refusalOf(answer) {
  const said = await answer.json().catch(() => null);

  return new Error(said?.error ?? UNREACHABLE);
}

// `how`: 'signin' or 'signup'. The account signed in, or an error saying why not.
export async function enter(how, { email, password }) {
  const answer = await send(`/api/account/${how}`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).catch(() => null);

  if (!answer) {
    throw new Error(UNREACHABLE);
  }

  if (!answer.ok) {
    throw await refusalOf(answer);
  }

  return (await answer.json()).user;
}

export const signOut = () => send('/api/account/signout', { method: 'POST', body: '{}' });
