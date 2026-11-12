import { node, toast } from './dom.js';
import { newId } from '../model/project.js';
import { paletteFileName, paletteFromPixels, parsePaletteText } from '../palette/palette.js';
import { decodeSprite } from '../io/images.js';
import { EXAMPLE_HEX_CODES } from '../art/editor-colours.js';

// the colours a file holds, and the name it gives itself (a GIMP palette's Name: line), if any
async function colorsFromFile(file) {
  if (file.type.startsWith('image/')) {
    return { colors: paletteFromPixels(await decodeSprite(file)), name: null };
  }

  const text = await file.text();

  return { colors: parsePaletteText(text), name: paletteFileName(text) };
}

function fileInput(add) {
  return node('input', {
    type: 'file',
    accept: '.hex,.gpl,.txt,image/*',
    hidden: true,
    onchange: async (event) => {
      const chosen = event.target.files[0];

      if (chosen) {
        const read = await colorsFromFile(chosen).catch(() => ({ colors: [], name: null }));

        add(read.colors, read.name ?? chosen.name.replace(/\.[^.]+$/, ''));
      }
    },
  });
}

const NONE_FOUND = `No colours found. Paste hex codes like ${EXAMPLE_HEX_CODES.split(' ').at(-1)}, or open a .hex, .gpl or image file.`;

// whether there are colours to add: says so when there are none, and takes that back when a
// later try has some
function anyFound(colors) {
  if (!colors.length) {
    toast(NONE_FOUND);
  } else {
    document.querySelector('.toast')?.remove();
  }

  return colors.length > 0;
}

// Paste hex codes or open a .hex, .gpl, .txt or palette image; calls onAdd({ id, name, colors }).
export function paletteForm(onAdd) {
  const name = node('input.input', {
    placeholder: 'Palette name',
    id: 'palette-name',
    'aria-label': 'Palette name',
  });
  const text = node('textarea.input.mono', {
    rows: 3,
    placeholder: `${EXAMPLE_HEX_CODES} …`,
    id: 'palette-text',
    'aria-label': 'Hex codes',
  });
  const add = (colors, fallbackName) => {
    if (anyFound(colors)) {
      onAdd({ id: newId('p'), name: name.value.trim() || fallbackName, colors });
    }
  };
  const file = fileInput(add);

  return node(
    'div',
    { style: { display: 'grid', gap: '8px' } },
    name,
    text,
    node(
      'div.group',
      { style: { gap: '6px' } },
      node(
        'button.btn',
        { onclick: () => add(parsePaletteText(text.value), 'My palette') },
        'Add pasted colours',
      ),
      node('button.btn', { onclick: () => file.click() }, 'Open a palette file…'),
      file,
    ),
  );
}
