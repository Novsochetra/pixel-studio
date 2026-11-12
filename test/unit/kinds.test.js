import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { KINDS, isSingleView, numberedName, placementOf, viewName } from '../../src/model/kinds.js';
import {
  NAGA_ELEVEN,
  blankPreset,
  defaultName,
  describeEntry,
  describeProject,
  gameOf,
} from '../../src/model/presets.js';
import { newProject } from '../../src/model/new-project.js';
import { presetFromProject } from '../../src/model/preset-from-project.js';
import { DIRECTION_SETS } from '../../src/model/directions.js';

test('each kind starts with its own canvas, views and first animation', () => {
  for (const [id, kind] of Object.entries(KINDS)) {
    const project = newProject({ kind: id });

    assert.equal(project.kind, id);
    assert.equal(project.canvas.width, kind.size);
    // an animation starts as the kind's first; art left unnamed is numbered, not called Coin
    assert.equal(
      project.animations[0].name,
      kind.itemName === 'animation' ? kind.names[0] : numberedName(kind.itemName, 1),
    );
    assert.equal(project.name, defaultName(blankPreset(id)));
    const views = Object.keys(project.animations[0].directions);
    assert.deepEqual(views, id === 'character' ? ['south', 'east', 'north'] : ['south']);
  }
});

test('a one-view kind names its view after itself, a character after the direction', () => {
  const tile = newProject({ kind: 'tile' });
  const hero = newProject({ kind: 'character' });

  assert.equal(isSingleView(tile), true);
  assert.equal(viewName(tile, 'south'), 'Tile');
  assert.equal(viewName(hero, 'east'), 'Side');
  assert.deepEqual(placementOf(tile), { place: 'fill', ground: null });
  assert.deepEqual(placementOf(hero), { place: 'feet', ground: 0.8 });
});

test('a one-view kind cannot be given directions', () => {
  const effect = newProject({ kind: 'effect', directionSet: 'eight' });

  assert.equal(effect.directionSet, 'single');
  const hero = newProject({ kind: 'character', directionSet: 'single' });
  assert.equal(hero.directionSet, 'four');
  assert.ok(!Object.values(DIRECTION_SETS).every((set) => set.hidden));
});

test('the Naga Eleven preset copies its game into the project, which then stands alone', () => {
  const project = newProject({ preset: NAGA_ELEVEN, name: 'Striker' });

  assert.equal(gameOf(project).frame.frameWidth, 64);
  assert.deepEqual(
    project.parts.map((part) => part.name),
    NAGA_ELEVEN.parts,
  );
  project.game.frame.frameWidth = 1;
  assert.equal(
    NAGA_ELEVEN.game.frame.frameWidth,
    64,
    'changing the project leaves the preset alone',
  );
  assert.equal(describeProject(project), 'Character for Naga Eleven');
  assert.equal(describeProject(newProject({ kind: 'tile' })), 'Tiles');
});

test('a project saved as a preset starts new ones with its setup but none of its pixels', () => {
  const source = newProject({ preset: NAGA_ELEVEN, name: 'Keeper' });

  source.animations[0].name = 'Dive';
  const preset = presetFromProject(source);
  const made = newProject({ preset });
  assert.equal(made.kind, 'character');
  assert.equal(made.directionSet, 'naga');
  assert.equal(made.animations[0].name, 'Dive');
  assert.deepEqual(made.game, source.game);
  assert.ok(!JSON.stringify(preset).includes('pixels'));
});

test('list entries from before kinds are still described', () => {
  assert.equal(describeEntry({ profile: 'generic' }), 'Character');
  assert.equal(describeEntry({ profile: 'naga-eleven' }), 'Character for Naga Eleven');
  assert.equal(describeEntry({ about: 'Tiles' }), 'Tiles');
});

test('a new project starts with the line its kind stands on, or a preset its own guides', async () => {
  const character = newProject({ kind: 'character', width: 64, height: 50 });
  const object = newProject({ kind: 'object', width: 32, height: 40 });
  const preset = { ...character, guides: [{ id: 'g', name: 'Eyes', row: 9, rule: 'fixed' }] };

  assert.deepEqual(
    character.guides.map((guide) => [guide.name, guide.row]),
    [['Feet', 40]],
  );
  assert.deepEqual(
    object.guides.map((guide) => [guide.name, guide.row]),
    [['Ground', 36]],
  );
  assert.deepEqual(newProject({ kind: 'tile' }).guides, []);
  assert.deepEqual(newProject({ preset }).guides, preset.guides);
});

test('every kind is offered to start from, then the presets, the saved ones marked', async () => {
  const { startChoices } = await import('../../src/model/start-choices.js');
  const saved = { id: 'mine', label: 'Mine', kind: 'icon', game: { name: 'Quest' } };
  const { kinds, presets } = startChoices([saved]);

  assert.deepEqual(
    kinds.map((choice) => choice.label),
    ['Character', 'Object', 'Tiles', 'Effect', 'Icon'],
  );
  assert.equal(kinds.at(-1).icon, 'star');
  assert.deepEqual(
    presets.map((choice) => [choice.label, choice.about, choice.saved]),
    [
      ['Naga Eleven', 'Character for Naga Eleven', false],
      ['Mine', 'Icon for Quest', true],
    ],
  );
});
