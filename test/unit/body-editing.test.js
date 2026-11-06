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
const { cloneSprite, getPixel, pack, samePixels, setPixel } =
  await import('../../src/model/sprite.js');
const { bodyOf, isPosedBody } = await import('../../src/model/body/body-kind.js');
const { bodyKey, rigOf } = await import('../../src/model/body/body.js');
const { commit, replaceDirectionArt } = await import('../../src/ui/actions.js');
const { startFromPrevious } = await import('../../src/ui/frame-actions.js');
const { recolourLayers } = await import('../../src/ui/body/recolour.js');
const { setPart } = await import('../../src/ui/body/pose-actions.js');
const { handlePoseKey } = await import('../../src/ui/body/pose-keys.js');
const { cutCharacter } = await import('./body-helpers.js');

const GREEN = pack(0, 255, 0);

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

const hasColour = (sprite, colour) =>
  Array.from({ length: sprite.width * sprite.height }).some(
    (_, i) => getPixel(sprite, i % sprite.width, Math.floor(i / sprite.width)) === colour,
  );

const key = (name, shiftKey = false) => [{ shiftKey, preventDefault() {} }, name];

test('painting on a Body drawn from its parts is refused, and says how to pose it instead', () => {
  const { app, body } = editing();
  const before = cloneSprite(body().sprite);

  toasts.length = 0;
  const done = commit(app, 'Pencil', [body()], () => setPixel(body().sprite, 1, 1, GREEN));

  assert.equal(done, null);
  assert.ok(samePixels(body().sprite, before));
  assert.match(toasts[0], /Body is drawn from its parts/);
});

test('Start from frame N brings the Body with its pose, and undo takes both back', () => {
  const { app, body, state, rig } = editing();
  const restOfFrame1 = body(1).pose;

  setPart(
    app,
    rig.pieces.find((piece) => piece.id === 'head'),
    { angle: 30 },
  );
  state.at.frame = 1;
  startFromPrevious(app, 'south', 1);

  assert.equal(body(1).pose, body(0).pose);
  assert.ok(samePixels(body(1).sprite, body(0).sprite));

  app.history.undo(state.project);
  assert.equal(body(1).pose, restOfFrame1);
});

test('a picture cleaned into a frame goes onto the art, never onto the Body', () => {
  const { app, body, front, state, animation, artKey } = editing();
  const picture = cloneSprite(body().sprite);

  setPixel(picture, 0, 0, GREEN);
  state.at.layer = bodyKey(animation);
  replaceDirectionArt(app, { direction: 'south', frame: 0 }, picture, 'Clean');

  const art = front.frames[0].layers.find((layer) => layer.key === artKey);

  assert.equal(getPixel(art.sprite, 0, 0), GREEN);
  assert.notEqual(getPixel(body().sprite, 0, 0), GREEN);
});

test('new colours everywhere reach the cut, so the next pose keeps them; undo puts them back', () => {
  const { app, body, animation, project, rig } = editing();
  const shirt = rig.pieces.find((piece) => piece.id === 'torso').art.colours[0];
  const mapping = { [shirt]: GREEN };

  recolourLayers(app, { label: 'Swap', layers: [body()], mapping, everywhere: true });
  assert.ok(rigOf(animation, 'south').pieces.some((piece) => piece.art.colours.includes(GREEN)));

  setPart(app, rig.pieces[0], { angle: 10 });
  assert.ok(hasColour(body().sprite, GREEN), 'posed again, the Body keeps the new colour');

  app.history.undo(project);
  app.history.undo(project);
  assert.equal(rigOf(animation, 'south'), rig);
});

test("new colours in one frame only leave that frame's Body as plain pixels", () => {
  const { app, body } = editing();

  const flattened = recolourLayers(app, {
    label: 'Swap',
    layers: [body()],
    mapping: {},
    everywhere: false,
  });

  assert.equal(flattened, true);
  assert.ok(!isPosedBody(body()));
});

test('with a part picked, the arrows move it, [ and ] turn it, and Esc lets go', () => {
  const { app, body, state } = editing();

  state.piece = 'head';
  assert.ok(handlePoseKey(app, ...key('arrowleft')));
  assert.equal(body().pose.parts.head.x, -1);
  assert.ok(handlePoseKey(app, ...key(']')));
  assert.equal(body().pose.parts.head.angle, 5);
  assert.ok(handlePoseKey(app, ...key('{', true)));
  assert.equal(body().pose.parts.head.angle, 4);
  assert.ok(handlePoseKey(app, ...key('escape')));
  assert.equal(state.piece, null);
  assert.equal(handlePoseKey(app, ...key('arrowleft')), false, 'with none picked, keys go on');
});
