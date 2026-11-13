// Browsers set Sec-Fetch-Site and Origin themselves and page scripts cannot change them, so these
// tell a call from the studio's own page apart from one another website makes in its visitor's
// browser with the visitor's cookie. A script outside a browser has no visitor's cookie to send.
const OTHER_SITE_FETCHES = new Set(['same-site', 'cross-site']);

function hostOf(origin) {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

export function isFromOtherSite(headers) {
  if (OTHER_SITE_FETCHES.has(headers['sec-fetch-site'])) {
    return true;
  }

  return headers.origin !== undefined && hostOf(headers.origin) !== headers.host;
}
