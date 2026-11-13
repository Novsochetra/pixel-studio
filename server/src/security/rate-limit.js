const SWEEP_AT_KEYS = 1000;

export function createRateLimiter({ limit, windowMs, now = Date.now }) {
  const hits = new Map();

  function sweep(time) {
    for (const [key, times] of hits) {
      if (times.at(-1) <= time - windowMs) {
        hits.delete(key);
      }
    }
  }

  return function allow(key) {
    const time = now();

    if (hits.size >= SWEEP_AT_KEYS) {
      sweep(time);
    }

    const recent = (hits.get(key) ?? []).filter((at) => at > time - windowMs);
    const allowed = recent.length < limit;

    if (allowed) {
      recent.push(time);
    }

    hits.set(key, recent);

    return allowed;
  };
}

// Railway's edge proxy appends the address it saw to X-Forwarded-For, so with one trusted hop the
// last entry is who reached it; the entries before it are whatever the visitor sent.
export function clientAddressOf(request, { trustProxy }) {
  const forwarded = trustProxy ? request.headers['x-forwarded-for'] : undefined;
  const last = forwarded?.split(',').at(-1)?.trim();

  return last || request.socket.remoteAddress || 'unknown';
}
