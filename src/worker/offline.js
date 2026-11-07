export const FONT_CACHE = 'pixel-clean-fonts';

const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

// 'fonts', 'page', or null for what the browser should fetch as if the worker were not there
export function wayToFetch({ method, url }, ownOrigin) {
  const { hostname, origin } = new URL(url);

  if (method !== 'GET') {
    return null;
  }

  if (FONT_HOSTS.has(hostname)) {
    return 'fonts';
  }

  return origin === ownOrigin ? 'page' : null;
}

// only our own: a shared host (user.github.io) holds other sites' caches on the same origin
export function cachesToDrop(names, current) {
  return names.filter(
    (name) => name.startsWith('pixel-clean-') && name !== current && name !== FONT_CACHE,
  );
}
