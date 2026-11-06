import { readFileSync } from 'node:fs';
import { BODY_PARTS } from '../../src/model/kinds.js';
import { guessOwners } from '../../src/model/body/guess.js';
import { cutIntoParts, leftOver } from '../../src/model/body/cut.js';
import { newProject } from '../../src/model/new-project.js';
import { cloneSprite, pack, setPixel } from '../../src/model/sprite.js';
import { addFrame } from '../../src/model/frames.js';
import { applyCut } from '../../src/model/body/body.js';

const BLUE = pack(0, 0, 255);

const fixtures = new URL('../../fixtures/', import.meta.url);

// the example character's cleaned front view, as a sprite
export function frontSprite() {
  const { width, height } = JSON.parse(readFileSync(new URL('character-front.json', fixtures)));
  const pixels = new Uint8ClampedArray(readFileSync(new URL('character-front.rgba', fixtures)));

  return { width, height, pixels };
}

// the front view cut into the character's parts as guessed
export function frontCut() {
  const source = frontSprite();
  const owners = guessOwners(source, BODY_PARTS);

  return {
    source,
    owners,
    rig: cutIntoParts(source, owners, BODY_PARTS),
    leftover: leftOver(source, owners),
  };
}

export const opaqueCount = (sprite) =>
  sprite.pixels.filter((value, i) => i % 4 === 3 && value).length;

// a character whose Front has three frames, the first two drawn alike, cut into its parts
export function cutCharacter() {
  const project = newProject({ width: 160, height: 160 });
  const animation = project.animations[0];
  const { source, rig, leftover } = frontCut();
  const front = animation.directions.south;

  addFrame(project, animation, 0);
  addFrame(project, animation, 1);
  front.frames[0].layers[0].sprite = cloneSprite(source);
  front.frames[1].layers[0].sprite = cloneSprite(source);
  setPixel(front.frames[2].layers[0].sprite, 3, 3, BLUE);
  const artKey = front.frames[0].layers[0].key;
  const posed = applyCut(project, animation, {
    direction: 'south',
    frame: 0,
    layerKey: artKey,
    source,
    leftover,
    rig,
  });

  return { project, animation, front, artKey, posed, source, rig };
}
