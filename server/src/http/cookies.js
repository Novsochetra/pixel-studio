export const SESSION_COOKIE = 'studio_session';
export const SESSION_DAYS = 30;

export function cookiesOf(headers) {
  return Object.fromEntries(
    (headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name, value]) => name && value !== undefined)
      .map(([name, ...value]) => [name, decodeURIComponent(value.join('='))]),
  );
}

// HttpOnly, so no script of the page can read the token; SameSite=Lax, so another site's page
// cannot send it with a request of its own; Secure where the page is reached over https.
export function sessionCookie(token, { secure, maxAgeSeconds = SESSION_DAYS * 86400 }) {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export const clearedSessionCookie = ({ secure }) => sessionCookie('', { secure, maxAgeSeconds: 0 });
