import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { createSprite, pack, setPixel } from '../../src/model/sprite.js';
import { promptText } from '../../src/export/prompt.js';

const RED = pack(255, 0, 0);

function standing(project) {
  const sprite = createSprite(project.canvas.width, project.canvas.height);

  for (let y = 10; y < 50; y++) {
    setPixel(sprite, 30, y, RED);
  }

  return sprite;
}

const ask = (project, extra = {}) => ({
  animation: 'Walk',
  direction: 'east',
  task: 'view',
  pose: '',
  reference: standing(project),
  colours: [RED],
  marked: false,
  ...extra,
});

test('a view is asked for by its words, at the reference height and colours', () => {
  const project = newProject({ kind: 'character' });
  const text = promptText(project, ask(project));

  assert.ok(text.startsWith('Draw the side view, facing right of the same character'));
  assert.ok(text.includes('Exactly 40 pixels tall'));
  assert.ok(text.includes('Use only these 1 colours: #ff0000.'));
  assert.ok(!text.includes('Pose:'));
});

test('a frame names its animation and carries the pose; marks are pointed out', () => {
  const project = newProject({ kind: 'character' });
  const text = promptText(
    project,
    ask(project, { task: 'frame', pose: ' knee up ', marked: true }),
  );

  assert.ok(text.includes('the next frame of the "Walk" animation, side view'));
  assert.ok(text.endsWith('Pose: knee up'));
  assert.ok(text.includes('The red marks and notes on the sheet show what to change.'));
});

test('a tile is asked for seamless, and another of a kind in the same style', () => {
  const project = newProject({ kind: 'tile' });
  const tile = promptText(project, ask(project, { task: 'frame' }));
  const more = promptText(project, ask(project, { task: 'more' }));

  assert.ok(tile.includes('the next frame of the "Walk" animation of the same tile'));
  assert.ok(tile.includes('It must be seamless'));
  assert.ok(more.startsWith('Draw another tile in the same style'));
});

test('an effect is asked for centred, with room around it', () => {
  const project = newProject({ kind: 'effect' });

  assert.ok(
    promptText(project, ask(project, { task: 'frame' })).includes('Centred, no wider than 46'),
  );
});
