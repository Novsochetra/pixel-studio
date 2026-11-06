import { node } from '../dom.js';

function sizeChoice(keepScale) {
  return node(
    'select.input',
    { id: 'import-size', 'aria-label': 'Size' },
    node('option', { value: 'match', selected: !keepScale }, 'Match the reference’s height'),
    node('option', { value: 'keep', selected: keepScale }, 'Keep its own pixel size'),
  );
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
    height: Number(height.value) || null,
    cell: cell.value.trim() || null,
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
