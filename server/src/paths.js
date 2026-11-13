import { fileURLToPath } from 'node:url';

// the page build/build.py writes, which the server sends as it is
export const DIST_ROOT = fileURLToPath(new URL('../../dist/', import.meta.url));
