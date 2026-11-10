import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { openPanel } from '../../src/ui/dock.js';

const state = (patch) => ({ layout: 'compact', mode: 'edit', panel: null, ...patch });

test('on a phone, the panel picked from the dock is the one open', () => {
  assert.equal(openPanel(state({ panel: 'layers' })), 'layers');
  assert.equal(openPanel(state({ panel: null })), null);
});

test('a wider window has no dock, so no panel of its own to open', () => {
  assert.equal(openPanel(state({ layout: 'wide', panel: 'layers' })), null);
  assert.equal(openPanel(state({ layout: 'medium', panel: 'frames' })), null);
});

test('frames and the brush are for drawing: the board and the preview have neither', () => {
  assert.equal(openPanel(state({ mode: 'board', panel: 'frames' })), null);
  assert.equal(openPanel(state({ mode: 'board', panel: 'brush' })), null);
  assert.equal(openPanel(state({ mode: 'board', panel: 'guides' })), 'guides');
  assert.equal(openPanel(state({ mode: 'game', panel: 'colours' })), null);
});
