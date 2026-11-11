import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { openPanel } from '../../src/ui/panels.js';

const state = (patch) => ({ layout: 'compact', panel: null, ...patch });

test('on a phone, the panel picked from the dock is the one open', () => {
  assert.equal(openPanel(state({ panel: 'layers' })), 'layers');
  assert.equal(openPanel(state({ panel: null })), null);
});

test('a wider window has no dock, so no panel of its own to open', () => {
  assert.equal(openPanel(state({ layout: 'wide', panel: 'layers' })), null);
  assert.equal(openPanel(state({ layout: 'medium', panel: 'frames' })), null);
});

test('a panel the phone does not have is not open', () => {
  assert.equal(openPanel(state({ panel: 'scene' })), null);
});
