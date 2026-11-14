import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { wayToFetch } from '../../src/worker/offline.js';

const OWN = 'https://studio.example';
const get = (path) => ({ method: 'GET', url: `${OWN}${path}` });

// The offline worker kept a copy of every GET on the page's own site, and waited for the whole
// answer to keep it: the stream of changes never ends, so the page never heard a tool draw. It
// also kept the account's saved work and who was signed in, past a sign-out.
test('the server’s API is fetched as if the offline worker were not there', () => {
  assert.equal(wayToFetch(get('/api/changes'), OWN), null);
  assert.equal(wayToFetch(get('/api/docs/projects'), OWN), null);
  assert.equal(wayToFetch(get('/api/account'), OWN), null);
});

test('the page and its files are still kept for a visit with no network', () => {
  assert.equal(wayToFetch(get('/'), OWN), 'page');
  assert.equal(wayToFetch(get('/index.html'), OWN), 'page');
  assert.equal(wayToFetch(get('/repo/api-guide.html'), OWN), 'page');
});
