import { bounds, getPixel } from '../model/sprite.js';
import { newId } from '../model/project.js';

export const GUIDE_RULES = {
  fixed: 'Just a line',
  top: 'Top of the art',
  bottom: 'Bottom of the art',
  'colour-top': 'Top of a colour',
};

export function newGuide(name, row, rule = 'fixed', colour = null) {
  return { id: newId('g'), name, row, rule, colour };
}

function colourTop(sprite, colour) {
  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      if (getPixel(sprite, x, y) === colour) {
        return y;
      }
    }
  }

  return null;
}

// the row where this view actually has what the guide marks, or null when there is nothing to check
export function measureGuide(sprite, guide) {
  const box = bounds(sprite);

  if (guide.rule === 'top') {
    return box ? box.top : null;
  }

  if (guide.rule === 'bottom') {
    return box ? box.bottom - 1 : null;
  }

  if (guide.rule === 'colour-top' && guide.colour !== null) {
    return colourTop(sprite, guide.colour);
  }

  return null;
}

// { state: 'none' | 'ok' | 'off' | 'missing', offset } for one view against one guide
export function checkGuide(sprite, guide) {
  if (guide.rule === 'fixed') {
    return { state: 'none', offset: 0 };
  }

  const row = measureGuide(sprite, guide);

  if (row === null) {
    return { state: 'missing', offset: 0 };
  }

  return row === guide.row ? { state: 'ok', offset: 0 } : { state: 'off', offset: row - guide.row };
}

export function describeCheck(check) {
  if (check.state === 'ok') {
    return 'On the line';
  }

  if (check.state === 'missing') {
    return 'Not in this view';
  }

  if (check.state === 'none') {
    return '';
  }

  const rows = Math.abs(check.offset) === 1 ? 'row' : 'rows';

  return `${Math.abs(check.offset)} ${rows} ${check.offset < 0 ? 'higher' : 'lower'}`;
}
