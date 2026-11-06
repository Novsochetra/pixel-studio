import { strict as assert } from 'node:assert';
import { test } from 'node:test';

// the toasts these actions show, read back by the tests; elements are plain records
const toasts = [];
const element = () => {
  const el = { style: {}, text: '', setAttribute() {}, addEventListener() {}, remove() {} };

  el.append = (...children) => (el.text += children.join(''));

  return el;
};
globalThis.Node = class {};
globalThis.document = {
  querySelector: () => null,
  createElement: element,
  createTextNode: (text) => text,
  body: { append: (el) => toasts.push(el.text) },
};

const { History } = await import('../../src/editor/history.js');
const { allLayers } = await import('../../src/model/project.js');
const { cloneSprite, samePixels, setPixel, pack } = await import('../../src/model/sprite.js');
const { addDirection } = await import('../../src/model/structure.js');
const { copyFrameToViews } = await import('../../src/model/copy-frame.js');
const { startAnimation } = await import('../../src/model/animations.js');
const { normalizeProject } = await import('../../src/model/normalize.js');
const { bodyOf, isPosedBody } = await import('../../src/model/body/body-kind.js');
const { rigOf } = await import('../../src/model/body/body.js');
const { pieceMatrices, renderBody } = await import('../../src/model/body/rig.js');
const { replaceDirectionArt } = await import('../../src/ui/actions.js');
const { recolourLayers } = await import('../../src/ui/body/recolour.js');
const { handleSelectionKey } = await import('../../src/ui/selection-keys.js');
const { setPart } = await import('../../src/ui/body/pose-actions.js');
const { cutCharacter, opaqueCount } = await import('../unit/body-helpers.js');

function editing() {
  const made = cutCharacter();
  const { project, animation } = made;
  const at = { animation: animation.id, direction: 'south', frame: 0, layer: null };
  const state = { project, at, tool: 'pose', piece: null, selection: null };
  const findLayer = (id) =>
    [...allLayers(project)].find(({ layer }) => layer.id === id)?.layer ?? null;
  const app = {
    store: { state, set: (patch) => Object.assign(state, patch), touch() {} },
    history: new History(findLayer),
    saver: { markLayers() {}, markStructure() {} },
  };

  return { ...made, app, state, body: (frame = 0) => bodyOf(made.front.frames[frame]) };
}

// a cut was kept cell by cell, and written again for each animation started from it: the project's
// one saved document soon passed the 256 KiB claude.ai keeps in one
test('a character cut in five views with six animations saves as one small document', async () => {
  const { projectStructure } = await import('../../src/store/load.js');
  const { project, animation } = cutCharacter();

  for (const direction of ['south-east', 'east', 'north-east', 'north']) {
    addDirection(project, animation, direction, 'south');
  }

  for (let i = 0; i < 5; i++) {
    startAnimation(project, animation, { name: 'Run', frames: 6, start: 'pose' });
  }

  const text = JSON.stringify(projectStructure(project));
  const back = normalizeProject(JSON.parse(text));

  assert.ok(text.length < 64 * 1024, `${Math.round(text.length / 1024)} KiB`);
  assert.equal(rigOf(back.animations[5], 'east'), rigOf(back.animations[0], 'south'));
  assert.deepEqual(rigOf(back.animations[0], 'south'), rigOf(animation, 'south'));
});

// copied to a view not yet cut, the figure landed on that view's Body, where no cut could reach it
test('a frame copied to a view not yet cut puts the figure on its art, ready to cut', () => {
  const { project, animation, source, artKey } = cutCharacter();

  addDirection(project, animation, 'east');
  copyFrameToViews(project, animation, 'south', 0);

  const east = animation.directions.east.frames[0];
  const art = east.layers.find((layer) => layer.key === artKey);

  assert.equal(opaqueCount(art.sprite), opaqueCount(source));
  assert.equal(opaqueCount(bodyOf(east).sprite), 0);
});

// colours swapped on the frame's pixels and on the cut apart differed where a turn's smoothing
// depends on which colours are alike, so the next pose changed pixels nobody touched
test('after a swap that merges colours, a turned frame is exactly what its pose draws', () => {
  const { app, body, animation, project, rig } = editing();
  const [first, second] = rig.pieces.find((piece) => piece.id === 'torso').art.colours;
  const colours = new Set(rig.pieces.flatMap((piece) => piece.art.colours));
  const mapping = Object.fromEntries(
    [...colours].map((colour, i) => [colour, i % 2 ? first : second]),
  );

  setPart(
    app,
    rig.pieces.find((piece) => piece.id === 'upper-arm-l'),
    { angle: 30 },
  );
  setPart(
    app,
    rig.pieces.find((piece) => piece.id === 'thigh-l'),
    { angle: -20 },
  );
  recolourLayers(app, { label: 'Swap', layers: [body()], mapping, everywhere: true });

  const drawn = renderBody(rigOf(animation, 'south'), body().pose, project.canvas);

  assert.ok(samePixels(body().sprite, drawn));
});

// a part following itself had its own move counted twice, once a part following it came first
test('a part set to follow itself moves once, whatever the order of the parts', () => {
  const { rig } = cutCharacter();
  const [first, second] = rig.pieces;
  const pose = { x: 0, y: 0, parts: { [second.id]: { x: 5, y: 0, angle: 0 } } };
  const looped = [
    { ...first, parent: second.id },
    { ...second, parent: second.id },
  ];

  for (const pieces of [looped, [...looped].reverse()]) {
    assert.equal(pieceMatrices({ pieces }, pose).get(second.id).e, 5);
  }
});

// paste onto a posed Body was refused, then said it had pasted
test('a paste refused on a posed Body says so, and nothing else', () => {
  const { app, state, animation } = editing();

  state.at.layer = bodyOf(animation.directions.south.frames[0]).key;
  app.clipboard = [{ x: 1, y: 1, color: pack(0, 255, 0) }];
  toasts.length = 0;
  handleSelectionKey(app, { preventDefault() {} }, 'v', true);

  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /drawn from its parts/);
  assert.equal(state.selection, null);
});

// an image cleaned into a posed frame went under the Body, so the frame showed both figures
test('an image cleaned into a posed frame takes the place of the Body there; undo brings it back', () => {
  const { app, body, project, source } = editing();
  const picture = cloneSprite(source);

  setPixel(picture, 0, 0, pack(0, 255, 0));
  replaceDirectionArt(app, { direction: 'south', frame: 0 }, picture, 'Clean');

  assert.equal(opaqueCount(body().sprite), 0);
  assert.ok(!isPosedBody(body()));
  app.history.undo(project);
  assert.ok(isPosedBody(body()));
  assert.ok(samePixels(body().sprite, source));
});
