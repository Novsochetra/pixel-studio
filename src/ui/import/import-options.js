import { node } from '../dom.js';
import { told } from '../../model/told.js';
import { fieldRow, listGroup } from '../list-group.js';

function sizeChoice(keepScale) {
  return node(
    'select.input',
    { id: 'import-size', 'aria-label': 'Size' },
    node('option', { value: 'match', selected: !keepScale }, 'Match the reference’s height'),
    node('option', { value: 'keep', selected: keepScale }, 'Keep its own pixel size'),
  );
}

const TALLEST = 512;
// one size, or a width and a height, of an art pixel in the picture's own pixels: "7.18x9.19"
const GRID = /^(\d+(\.\d+)?)(\s*[x×]\s*(\d+(\.\d+)?))?$/i;

// the height to clean to, null for the cleaner's own: what is typed must be a height art can have
function heightAsked(text) {
  if (!text.trim()) {
    return null;
  }

  const height = Math.round(Number(text));

  if (!(height >= 8 && height <= TALLEST)) {
    throw told(`Height is a number of art pixels from 8 to ${TALLEST}, or empty for Auto.`);
  }

  return height;
}

function gridAsked(text) {
  const sizes = text.trim().match(GRID);

  if (!text.trim()) {
    return null;
  }

  if (!sizes || [sizes[1], sizes[4] ?? sizes[1]].some((size) => !(size >= 1 && size <= 64))) {
    throw told('Grid size is one art pixel in picture pixels, like 7.18x9.19, from 1 to 64.');
  }

  // the cleaner reads a plain x between the two
  return text.trim().replace(/\s*[x×]\s*/i, 'x');
}

// a height typed is asked for outright: it wins over keeping the picture's own pixel size, which
// otherwise left what was typed unused without a word
export const keepsOwnSize = (size, height) => size === 'keep' && height === null;

// What can be tuned before cleaning again: how tall, the grid if the guess was wrong, and (when
// matching a reference) whether to take its height or keep the picture's own pixel size.
export function optionFields({ matching, keepScale, onChange, onEnter }) {
  const height = node('input.input.mono', {
    type: 'number',
    min: '8',
    placeholder: 'Auto',
    id: 'import-height',
    'aria-label': 'Height in art pixels',
  });
  const cell = node('input.input.mono', {
    // an example, not a value found: beside a report of the grid it read as the one detected
    placeholder: 'Auto (or e.g. 6x6)',
    id: 'import-cell',
    'aria-label': 'Grid size',
  });
  const size = matching ? sizeChoice(keepScale) : null;
  const read = () => {
    const asked = heightAsked(height.value);

    return {
      height: asked,
      cell: gridAsked(cell.value),
      keepScale: keepsOwnSize(size?.value, asked),
    };
  };

  const el = listGroup(
    { note: 'Left as Auto, the cleaner finds both. Change one if the result looks wrong.' },
    size ? fieldRow('Size', size) : null,
    fieldRow('Height, in art pixels', height),
    fieldRow('Grid size', cell, {
      title: 'One art pixel in the picture’s own pixels, if the guess looks wrong',
    }),
  );

  el.addEventListener('input', onChange);
  el.addEventListener('change', onChange);
  el.addEventListener('keydown', (event) => event.key === 'Enter' && onEnter());

  return { read, el };
}
