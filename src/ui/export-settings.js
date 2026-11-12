import { referenceSprite } from './actions.js';
import { artAnchor, fittedFrame } from '../export/anchor.js';
import { bounds } from '../model/sprite.js';
import { gameOf } from '../model/presets.js';
import { placementOf } from '../model/kinds.js';

// The point of the art that sits on the frame's anchor. For a character or an object, the
// reference pose's feet (or, with nothing drawn yet, where fresh feet would stand); an effect or an
// icon, the middle of the canvas; a tile, its corner.
export function referenceAnchor(state) {
  const { width, height } = state.project.canvas;
  const { place, ground } = placementOf(state.project);

  if (place !== 'feet') {
    return place === 'fill'
      ? { x: 0, y: 0 }
      : { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  }

  const ref = referenceSprite(state);

  return bounds(ref)
    ? artAnchor(ref)
    : { x: Math.floor(width / 2), y: Math.round(height * ground) };
}

export function characterHeight(state) {
  const ref = referenceSprite(state);
  const box = ref && bounds(ref);

  return box ? box.bottom - box.top : 0;
}

// a typed 0, a cleared field or a negative number would make an image that cannot exist
// twice the largest canvas: a frame of 100000 would ask for an image no browser can make, and
// the setting is kept with the project
const LARGEST_FRAME = 1024;

const within = (value, least) =>
  Math.min(LARGEST_FRAME, Math.max(least, Math.round(value) || least));

// the feet stand on a pixel of the frame: outside it, the art would be placed off the sheet
export function sane(settings) {
  const frameWidth = within(settings.frameWidth, 1);
  const frameHeight = within(settings.frameHeight, 1);

  return {
    ...settings,
    frameWidth,
    frameHeight,
    anchorX: Math.min(frameWidth - 1, within(settings.anchorX, 0)),
    anchorY: Math.min(frameHeight - 1, within(settings.anchorY, 0)),
  };
}

const FIT_NAMES = { fill: 'The tile', centre: 'The canvas' };

// "Fit the art" (for a tile or an icon, the canvas itself), the game's own frame when it has one,
// or custom
export function presetsFor(project) {
  const frame = gameOf(project).frame;

  return [
    ['fit', FIT_NAMES[placementOf(project).place] ?? 'Fit the art'],
    ...(frame ? [['game', frame.label]] : []),
    ['custom', 'Custom'],
  ];
}

export function presetSettings(state, preset) {
  const anchor = referenceAnchor(state);
  const { frame } = gameOf(state.project);
  const { width, height } = state.project.canvas;

  if (preset === 'game' && frame) {
    const { frameWidth, frameHeight, anchorX, anchorY } = frame;

    return { frameWidth, frameHeight, anchorX, anchorY, artAnchor: anchor };
  }

  if (placementOf(state.project).place === 'fill') {
    return { frameWidth: width, frameHeight: height, anchorX: 0, anchorY: 0, artAnchor: anchor };
  }

  // An icon or an effect is the canvas it is drawn on, its art where it was drawn: fitted to the
  // art, a full icon came out 35×34, off its middle, and a small one 31×16.
  if (placementOf(state.project).place === 'centre') {
    return {
      frameWidth: width,
      frameHeight: height,
      anchorX: anchor.x,
      anchorY: anchor.y,
      artAnchor: anchor,
    };
  }

  return { ...fittedFrame(state.project, state.project.animations, anchor), artAnchor: anchor };
}
