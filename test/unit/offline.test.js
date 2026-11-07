import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { FONT_CACHE, cachesToDrop, wayToFetch } from '../../src/worker/offline.js';

const OWN = 'https://studio.example';
const get = (url) => ({ method: 'GET', url });

test('the page and its files are kept for offline, and only they', () => {
  assert.equal(wayToFetch(get(`${OWN}/index.html`), OWN), 'page');
  assert.equal(wayToFetch(get('https://other.example/a.png'), OWN), null);
  assert.equal(wayToFetch({ method: 'POST', url: `${OWN}/save` }, OWN), null);
});

test('the fonts are kept, from either of their hosts', () => {
  assert.equal(
    wayToFetch(get('https://fonts.googleapis.com/css2?family=Silkscreen'), OWN),
    'fonts',
  );
  assert.equal(wayToFetch(get('https://fonts.gstatic.com/s/silkscreen.woff2'), OWN), 'fonts');
});

test('a new build drops the old page, but not the fonts or the caches of other sites', () => {
  const names = ['pixel-clean-old', 'pixel-clean-new', FONT_CACHE, 'another-site'];

  assert.deepEqual(cachesToDrop(names, 'pixel-clean-new'), ['pixel-clean-old']);
});
