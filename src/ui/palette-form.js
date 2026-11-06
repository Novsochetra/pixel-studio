import { node, toast } from './dom.js';
import { newId } from '../model/project.js';
import { paletteFromPixels, parsePaletteText } from '../palette/palette.js';
import { decodeSprite } from '../io/images.js';
import { EXAMPLE_HEX_CODES } from '../art/editor-colours.js';

async function colorsFromFile(file) {
  if (file.type.startsWith('image/')) {
    return paletteFromPixels(await decodeSprite(file));
  }

  return parsePaletteText(await file.text());
}

function fileInput(add) {
  return node('input', {
    type: 'file',
    accept: '.hex,.gpl,.txt,image/*',
    hidden: true,
    onchange: async (event) => {
      const chosen = event.target.files[0];

      if (chosen) {
        add(await colorsFromFile(chosen).catch(() => []), chosen.name.replace(/\.[^.]+$/, ''));
      }
    },
  });
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
    if (!colors.length) {
      toast(
        `No colours found. Paste hex codes like ${EXAMPLE_HEX_CODES.split(' ').at(-1)}, or open a .hex, .gpl or image file.`,
      );

      return;
    }

    onAdd({ id: newId('p'), name: name.value.trim() || fallbackName, colors });
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
