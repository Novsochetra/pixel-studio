import { node } from '../dom.js';

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
    throw new Error(`Height is a number of art pixels from 8 to ${TALLEST}, or empty for Auto.`);
  }

  return height;
}

function gridAsked(text) {
  const sizes = text.trim().match(GRID);

  if (!text.trim()) {
    return null;
  }

  if (!sizes || [sizes[1], sizes[4] ?? sizes[1]].some((size) => !(size >= 1 && size <= 64))) {
    throw new Error('Grid size is one art pixel in picture pixels, like 7.18x9.19, from 1 to 64.');
  }

  // the cleaner reads a plain x between the two
  return text.trim().replace(/\s*[x×]\s*/i, 'x');
}

// What can be tuned before cleaning again: how tall, the grid if the guess was wrong, and (when
// matching a reference) whether to take its height or keep the picture's own pixel size.
export function optionFields({ matching, keepScale }) {
  const height = node('input.input.mono', {
    type: 'number',
    min: '8',
    placeholder: 'Auto',
    id: 'import-height',
    'aria-label': 'Height in art pixels',
  });
  const cell = node('input.input.mono', {
    placeholder: 'Auto, or 7.18x9.19',
    id: 'import-cell',
    'aria-label': 'Grid size',
  });
  const size = matching ? sizeChoice(keepScale) : null;
  const read = () => ({
    height: heightAsked(height.value),
    cell: gridAsked(cell.value),
    keepScale: size ? size.value === 'keep' : false,
  });

  return {
    read,
    el: node(
      'div.compare',
      {},
      size ? node('label.field', {}, node('span', {}, 'Size'), size) : null,
      node('label.field', {}, node('span', {}, 'Height (art pixels)'), height),
      node('label.field', {}, node('span', {}, 'Grid size, if the guess looks wrong'), cell),
    ),
  };
}
