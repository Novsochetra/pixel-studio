import { clearedSessionCookie, cookiesOf, SESSION_COOKIE, sessionCookie } from '../http/cookies.js';
import { readJson } from '../http/read-json.js';
import { sendError, sendJson } from '../http/responses.js';
import { route } from '../router.js';
import { clientAddressOf } from '../security/rate-limit.js';
import { accountProblem, emailOf } from './account-checks.js';
import { currentUser } from './current-user.js';
import { hashPassword, passwordMatches } from './passwords.js';
import { newSessionToken, sessionEnds, tokenHash } from './sessions.js';

const SIGN_IN_FAILED = 'That email and password do not match an account.';
const TOO_MANY = 'Too many tries. Wait a minute, then try again.';

async function signedIn(response, { accounts, secure }, user) {
  const token = newSessionToken();

  await accounts.startSession(user.id, tokenHash(token), sessionEnds());
  sendJson(response, {
    json: { user: { email: user.email } },
    headers: { 'Set-Cookie': sessionCookie(token, { secure }) },
  });
}

// the email and password sent, read and checked; or null, with the refusal sent
async function credentials(request, response, deps) {
  const body = await readJson(request, 4096);

  if (!body.ok) {
    sendError(response, body);

    return null;
  }

  const email = emailOf(body.value?.email);
  const password = String(body.value?.password ?? '');
  const tries = [clientAddressOf(request, deps), email];

  // by address and by email: one address trying many accounts, or many addresses one account
  if (!tries.every((key) => deps.limiter(key))) {
    sendError(response, { status: 429, message: TOO_MANY });

    return null;
  }

  return { email, password };
}

async function signUp(request, response, deps) {
  const given = await credentials(request, response, deps);
  const problem = given && accountProblem(given);

  if (!given || problem) {
    return problem ? sendError(response, { status: 400, message: problem }) : undefined;
  }

  const id = await deps.accounts.create(given.email, await hashPassword(given.password));

  return id
    ? signedIn(response, deps, { id, email: given.email })
    : sendError(response, { status: 409, message: 'That email has an account. Sign in instead.' });
}

async function signIn(request, response, deps) {
  const given = await credentials(request, response, deps);
  const account = given && (await deps.accounts.byEmail(given.email));
  const matches = account && (await passwordMatches(given.password, account.hash));

  if (!given) {
    return undefined;
  }

  // the same answer for an email with no account: it does not tell who has one
  return matches
    ? signedIn(response, deps, account)
    : sendError(response, { status: 401, message: SIGN_IN_FAILED });
}

async function signOut(request, response, { accounts, secure }) {
  const token = cookiesOf(request.headers)[SESSION_COOKIE];

  if (token) {
    await accounts.endSession(tokenHash(token));
  }

  sendJson(response, { json: {}, headers: { 'Set-Cookie': clearedSessionCookie({ secure }) } });
}

// Nobody signed in is an answer, not a failure: a browser logs every 401 as an error. `studio`
// tells the page this is the studio's own server, not another host's page at that address.
async function whoIsIn(request, response, { accounts }) {
  const user = await currentUser(request, accounts);

  sendJson(response, {
    json: { studio: true, user: user ? { email: user.email, id: user.id } : null },
  });
}

// deps: { accounts, limiter, trustProxy, secure }
export function accountRoutes(deps) {
  const bound = (handle) => (request, response) => handle(request, response, deps);

  return [
    route('/api/account', { GET: bound(whoIsIn) }),
    route('/api/account/signup', { POST: bound(signUp) }),
    route('/api/account/signin', { POST: bound(signIn) }),
    route('/api/account/signout', { POST: bound(signOut) }),
  ];
}
