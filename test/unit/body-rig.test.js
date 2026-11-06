import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createSprite, getPixel, pack, samePixels, setPixel } from '../../src/model/sprite.js';
import { applyTo, compose, invert, turnAbout } from '../../src/model/body/affine.js';
import { decodeArt, encodeArt, recolourArt } from '../../src/model/body/piece-art.js';
import { scale2x } from '../../src/model/body/scale2x.js';
import { pieceAt, pivotInPose, renderBody, restPose } from '../../src/model/body/rig.js';
import { BODY_PARTS } from '../../src/model/kinds.js';
import { frontCut, frontSprite, opaqueCount } from './body-helpers.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);
const CANVAS = { width: 160, height: 160 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual}`);
const posed = (parts, shift = [0, 0]) => ({ x: shift[0], y: shift[1], parts });
const piece = (rig, id) => rig.pieces.find((candidate) => candidate.id === id);

test('a turn goes clockwise about its point, and the inverse brings a point back', () => {
  const quarter = turnAbout({ x: 10, y: 10 }, 90);
  const [x, y] = applyTo(quarter, [20, 10]);

  assert.deepEqual([x, y], [10, 20]);

  const both = compose(turnAbout({ x: 3, y: 4 }, 33), turnAbout({ x: -2, y: 7 }, 12));
  const [backX, backY] = applyTo(invert(both), applyTo(both, [5, 9]));

  near(backX, 5);
  near(backY, 9);
});

test('part art is kept as plain data and read back pixel for pixel, in other colours too', () => {
  const sprite = createSprite(3, 2);

  setPixel(sprite, 0, 0, RED);
  setPixel(sprite, 2, 1, BLUE);
  const art = JSON.parse(JSON.stringify(encodeArt(sprite, { x: 7, y: 9 })));
  const back = decodeArt(art);

  assert.deepEqual([back.x, back.y], [7, 9]);
  assert.ok(samePixels(back.sprite, sprite));
  assert.equal(getPixel(decodeArt(recolourArt(art, { [RED]: BLUE })).sprite, 0, 0), BLUE);
});

test('Scale2x rounds a diagonal step instead of doubling its corner', () => {
  const sprite = createSprite(2, 2);

  setPixel(sprite, 0, 0, RED);
  setPixel(sprite, 1, 0, RED);
  setPixel(sprite, 0, 1, RED);
  const big = scale2x(sprite);

  assert.equal(getPixel(big, 2, 2), RED, 'the inner corner fills in');
  assert.equal(getPixel(big, 3, 3), 0, 'the outer corner stays clear');
});

test('the guess gives every pixel of the example character to a part', () => {
  const { owners, leftover, source } = frontCut();
  const opaque = opaqueCount(source);
  const owned = [...owners].filter((owner) => owner >= 0).length;

  assert.equal(owned, opaque);
  assert.equal(opaqueCount(leftover), 0);
});

test('the guess finds the head at the top, the feet at the bottom, the arms beside the body', () => {
  const { owners, source } = frontCut();
  const ownerAt = (x, y) => BODY_PARTS[owners[y * source.width + x]]?.id;

  assert.equal(ownerAt(80, 40), 'head');
  assert.equal(ownerAt(80, 75), 'torso');
  assert.equal(ownerAt(65, 123), 'foot-l');
  assert.equal(ownerAt(95, 123), 'foot-r');
  assert.equal(ownerAt(58, 88), 'lower-arm-l');
  assert.equal(ownerAt(100, 88), 'lower-arm-r');
});

test('at rest, the parts draw exactly the picture they were cut from', () => {
  const { rig, source } = frontCut();

  assert.equal(rig.pieces.length, BODY_PARTS.length);
  assert.ok(samePixels(renderBody(rig, restPose(), CANVAS), source));
});

test('a part reaches under the one above it, so turning that one leaves no hole', () => {
  const { rig, owners, source } = frontCut();
  const torso = decodeArt(piece(rig, 'torso').art);
  const torsoIndex = BODY_PARTS.findIndex((part) => part.id === 'torso');
  const cutTorso = [...owners].filter((owner) => owner === torsoIndex).length;

  assert.ok(opaqueCount(torso.sprite) > cutTorso, 'the torso has more than its own pixels');
  assert.ok(samePixels(renderBody(rig, restPose(), CANVAS), source), 'which the arms cover');
});

test('moving a part moves the parts that follow it, and nothing else', () => {
  const { rig } = frontCut();
  const rest = renderBody(rig, restPose(), CANVAS);
  const moved = renderBody(rig, posed({ 'thigh-l': { x: -3, y: 0, angle: 0 } }), CANVAS);
  const foot = pivotInPose(
    rig,
    posed({ 'thigh-l': { x: -3, y: 0, angle: 0 } }),
    piece(rig, 'foot-l'),
  );
  const footAtRest = pivotInPose(rig, restPose(), piece(rig, 'foot-l'));

  assert.equal(foot.point[0], footAtRest.point[0] - 3, 'the foot came along');
  assert.equal(getPixel(moved, 80, 40), getPixel(rest, 80, 40), 'the head stayed');
});

test('a quarter turn moves whole pixels, keeping every colour and count', () => {
  const { rig } = frontCut();
  const arm = piece(rig, 'lower-arm-l');
  const alone = { pieces: [{ ...arm, parent: null }] };
  const turned = renderBody(alone, posed({ [arm.id]: { x: 0, y: 0, angle: 90 } }), CANVAS);

  assert.equal(opaqueCount(turned), opaqueCount(decodeArt(arm.art).sprite));
});

test("any other turn keeps to the art's own colours, with no blended pixels", () => {
  const { rig } = frontCut();
  const colours = new Set(rig.pieces.flatMap((each) => each.art.colours));
  const turned = renderBody(rig, posed({ 'upper-arm-l': { x: 0, y: 0, angle: 33 } }), CANVAS);

  for (let i = 0; i < turned.pixels.length; i += 4) {
    if (turned.pixels[i + 3]) {
      const colour = getPixel(turned, (i / 4) % 160, Math.floor(i / 4 / 160));

      assert.ok(colours.has(colour), 'a colour the parts have');
    }
  }
});

test('the whole body moves with the pose, and a click finds the top part', () => {
  const { rig } = frontCut();
  const source = frontSprite();
  const shifted = renderBody(rig, posed({}, [2, 1]), CANVAS);

  assert.equal(getPixel(shifted, 82, 41), getPixel(source, 80, 40));
  assert.equal(pieceAt(rig, restPose(), [80, 40]).id, 'head');
  assert.equal(pieceAt(rig, restPose(), [1, 1]), null);
});
