import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CLEAR, createSprite, getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { decodeArt, encodeArt } from '../../src/model/body/piece-art.js';
import { IDENTITY, turnAbout } from '../../src/model/body/affine.js';
import {
  changedPixels,
  paintedArt,
  posedBodies,
  usesOfRig,
  withPieceArt,
} from '../../src/model/body/part-paint.js';
import { renderBody, renderPiece, restPose } from '../../src/model/body/rig.js';
import { planFromRig } from '../../src/model/body/cut-plan.js';
import { cutCharacter } from './body-helpers.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);
const CANVAS = { width: 40, height: 40 };

function block({ x, y, width, height }, colour = RED) {
  const sprite = createSprite(width, height);

  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      setPixel(sprite, column, row, colour);
    }
  }

  return encodeArt(sprite, { x, y });
}

const rigOfOne = (art, pivot = { x: 20, y: 20 }) => ({
  pieces: [{ id: 'arm', name: 'Arm', parent: null, pivot, art }],
});

const turned = (angle) => ({ ...restPose(), parts: { arm: { x: 0, y: 0, angle } } });

test('changedPixels finds what a stroke changed, erased pixels too', () => {
  const before = createSprite(3, 3);
  const after = createSprite(3, 3);

  setPixel(before, 0, 0, RED);
  setPixel(after, 2, 1, BLUE);

  assert.deepEqual(changedPixels(before, after), [
    { x: 0, y: 0, colour: CLEAR },
    { x: 2, y: 1, colour: BLUE },
  ]);
});

test('drawing at rest puts the pixel on the part, growing its box', () => {
  const art = block({ x: 10, y: 10, width: 2, height: 2 });
  const painted = paintedArt(art, IDENTITY, [{ x: 7, y: 13, colour: BLUE }]);
  const { x, y, sprite } = decodeArt(painted);

  assert.deepEqual([x, y, sprite.width, sprite.height], [7, 10, 5, 4]);
  assert.equal(getPixel(sprite, 0, 3), BLUE);
  assert.equal(getPixel(sprite, 3, 0), RED);
});

test('what is drawn on a part turned a quarter shows where it was drawn, and turns with it', () => {
  const art = block({ x: 20, y: 18, width: 10, height: 4 });
  const quarter = turnAbout({ x: 20.5, y: 20.5 }, 90);
  const painted = rigOfOne(paintedArt(art, quarter, [{ x: 20, y: 32, colour: BLUE }]));

  assert.equal(getPixel(renderBody(painted, turned(90), CANVAS), 20, 32), BLUE);
  assert.equal(getPixel(renderBody(painted, restPose(), CANVAS), 32, 20), BLUE);
});

test('what is drawn at any turn shows as drawn, and leaves no holes at rest', () => {
  for (const angle of [15, 30, 45, 60, 110, -35]) {
    const art = block({ x: 20, y: 18, width: 8, height: 5 });
    const pivot = { x: 20.5, y: 20.5 };
    const matrix = turnAbout(pivot, angle);
    const patch = [];

    for (let y = 2; y < 9; y++) {
      for (let x = 2; x < 9; x++) {
        patch.push({ x, y, colour: BLUE });
      }
    }

    const rig = rigOfOne(paintedArt(art, matrix, patch));
    const shown = renderBody(rig, turned(angle), CANVAS);
    const missed = patch.filter(({ x, y }) => getPixel(shown, x, y) !== BLUE);

    // Scale2x rounds a sharp corner: only a corner of the block may go
    assert.ok(missed.length <= 2, `at ${angle}° ${missed.length} pixels of a block do not show`);

    const { sprite } = decodeArt(rig.pieces[0].art);
    const holes = changedPixels(createSprite(sprite.width, sprite.height), sprite).filter(
      ({ x, y, colour }) =>
        colour !== BLUE &&
        [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].every(([nx, ny]) => getPixel(sprite, nx, ny) === BLUE),
    );

    assert.deepEqual(holes, [], `at ${angle}° no pinhole is left in what was drawn`);
  }
});

test('a line drawn at a turn mostly shows as drawn, and joins up', () => {
  const art = block({ x: 20, y: 18, width: 8, height: 5 });
  const matrix = turnAbout({ x: 20.5, y: 20.5 }, 30);
  const line = Array.from({ length: 12 }, (_, i) => ({ x: 3 + i, y: 6, colour: BLUE }));
  const shown = renderBody(rigOfOne(paintedArt(art, matrix, line)), turned(30), CANVAS);
  const kept = line.filter(({ x, y }) => getPixel(shown, x, y) === BLUE);

  assert.ok(kept.length >= 10, `${kept.length} of 12 pixels of a thin line show`);
});

test('erasing takes pixels off the part, and all of them leaves it empty and not lost', () => {
  const art = block({ x: 10, y: 10, width: 2, height: 1 });
  const one = paintedArt(art, IDENTITY, [{ x: 10, y: 10, colour: CLEAR }]);

  assert.deepEqual([decodeArt(one).x, decodeArt(one).sprite.width], [11, 1]);

  const none = paintedArt(one, IDENTITY, [{ x: 11, y: 10, colour: CLEAR }]);
  const rig = rigOfOne(none);

  assert.equal(getPixel(decodeArt(none).sprite, 0, 0), CLEAR);
  assert.equal(
    renderPiece(rig, restPose(), rig.pieces[0], CANVAS).pixels.some(Boolean),
    false,
    'an empty part draws nothing',
  );
});

test('a cut is found everywhere it is used, with the bodies drawn from it', () => {
  const { project, animation, front, rig } = cutCharacter();
  const copy = { ...animation, id: 'copy', directions: { south: { ...front } } };

  project.animations.push(copy);
  const uses = usesOfRig(project, rig);

  assert.deepEqual(
    uses.map(({ animation: id }) => id),
    [animation.id, 'copy'],
  );
  assert.equal(posedBodies(uses).length, 4, 'two frames posed in each animation');
});

test('withPieceArt changes one part and leaves the old cut as it was', () => {
  const art = block({ x: 1, y: 1, width: 1, height: 1 });
  const rig = rigOfOne(art);
  const next = withPieceArt(rig, 'arm', block({ x: 2, y: 2, width: 1, height: 1 }));

  assert.equal(rig.pieces[0].art, art);
  assert.notEqual(next.pieces[0].art, art);
  assert.equal(next.pieces[0].name, 'Arm');
});

test('Edit the cut leaves out what a part holds past the canvas, not wrapping it to the next row', () => {
  const art = block({ x: 38, y: 5, width: 4, height: 1 });
  const { owners } = planFromRig(rigOfOne(art), CANVAS);
  const owned = [...owners.keys()].filter((i) => owners[i] === 0);

  assert.deepEqual(owned, [5 * 40 + 38, 5 * 40 + 39]);
});
