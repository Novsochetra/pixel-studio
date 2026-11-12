import { node } from '../dom.js';
import { actionRow, listGroup } from '../list-group.js';
import { addPalette, reduceButton, starterPalettes } from './swap-parts.js';

// a group whose one row holds controls of its own (the chips, the form), as wide as the group
const holding = (header, content) =>
  listGroup(header, node('div.list-row.holds-controls', {}, content));

// Swap colours with no palette yet: three ways to one, as grouped rows like every other window's.
// It was a paragraph over loose buttons.
export function paletteStart(job) {
  const fromArt = reduceButton(job);

  return [
    listGroup(
      { title: 'A palette to swap to', note: 'Its colours stand in for the art’s, one for one.' },
      actionRow('8 of the art’s own colours', () => fromArt.click(), {
        'aria-label': 'Make an 8-colour palette from the art',
        leads: false,
      }),
    ),
    holding({ title: 'Or start from one of these' }, starterPalettes(job)),
    holding(
      { title: 'Or your own', note: 'Paste hex codes, or open a .hex, .gpl or image file.' },
      addPalette(job),
    ),
  ];
}
