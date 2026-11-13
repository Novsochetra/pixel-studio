import { SESSION_COOKIE, cookiesOf } from '../http/cookies.js';
import { tokenHash } from './sessions.js';

// the account the request's session cookie signs in, or null
export async function currentUser(request, accounts) {
  const token = cookiesOf(request.headers)[SESSION_COOKIE];

  return token ? accounts.userOfSession(tokenHash(token)) : null;
}
