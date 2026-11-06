import { referenceSprite } from './actions.js';
import { GAME_FRAME } from '../export/sheet.js';
import { artAnchor, fittedFrame } from '../export/anchor.js';
import { bounds } from '../model/sprite.js';
import { profileOf } from '../model/profiles.js';

// The reference pose decides where the feet stand in every frame. With no reference drawn yet,
// the feet go where a fresh one would: centred, a fifth of the way up.
export function referenceAnchor(state) {
  const ref = referenceSprite(state);
  const { width, height } = state.project.canvas;

  return ref && bounds(ref)
    ? artAnchor(ref)
    : { x: Math.floor(width / 2), y: Math.round(height * 0.8) };
}

export function characterHeight(state) {
  const ref = referenceSprite(state);
  const box = ref && bounds(ref);

  return box ? box.bottom - box.top : 0;
}

// a typed 0, a cleared field or a negative number would make an image that cannot exist
export function sane(settings) {
  return {
    ...settings,
    frameWidth: Math.max(1, Math.round(settings.frameWidth) || 1),
    frameHeight: Math.max(1, Math.round(settings.frameHeight) || 1),
    anchorX: Math.max(0, Math.round(settings.anchorX) || 0),
    anchorY: Math.max(0, Math.round(settings.anchorY) || 0),
  };
}

export function presetsFor(project) {
  return [
    ['fit', 'Fit the art'],
    ...(profileOf(project).gamePack ? [['game', 'Naga Eleven today (64×62)']] : []),
    ['custom', 'Custom'],
  ];
}

export function presetSettings(state, preset) {
  const anchor = referenceAnchor(state);

  if (preset === 'game' && profileOf(state.project).gamePack) {
    return { ...GAME_FRAME, artAnchor: anchor };
  }

  return { ...fittedFrame(state.project, state.project.animations, anchor), artAnchor: anchor };
}
