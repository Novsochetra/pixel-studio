// A route answers one path, or a path under a prefix (`/api/docs/`, its rest the route's `rest`),
// with a handler for each method it takes.
export function route(path, handlers) {
  const prefix = path.endsWith('/') ? path : null;

  return {
    handlers,
    match: (pathname) => {
      if (prefix) {
        return pathname.startsWith(prefix) && pathname.length > prefix.length
          ? { rest: pathname.slice(prefix.length) }
          : null;
      }

      return pathname === path ? {} : null;
    },
  };
}

// the handler for the request, the methods the path takes when it takes others, or nothing
export function chooseRoute(routes, { method, pathname }) {
  for (const each of routes) {
    const params = each.match(pathname);

    if (params) {
      const handle = each.handlers[method === 'HEAD' ? 'GET' : method];

      return handle
        ? { type: 'handler', handle, params }
        : { type: 'method-not-allowed', allow: Object.keys(each.handlers) };
    }
  }

  return { type: 'none' };
}
