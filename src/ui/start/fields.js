import { node } from '../dom.js';
import { DIRECTION_SETS } from '../../model/directions.js';
import { defaultName } from '../../model/presets.js';
import { wholeNumber } from '../../model/numbers.js';
import { numberInput } from '../number-input.js';

const SIZES = [16, 24, 32, 48, 64, 96, 128, 160];

const sizeOr = (text, usual) =>
  wholeNumber(Number(text) > 0 ? text : '', { min: 8, max: 512, fallback: usual });

function field(label, control) {
  return node('label.field', {}, node('span', {}, label), control);
}

function controls() {
  return {
    name: node('input.input', { id: 'project-name', 'aria-label': 'Name' }),
    width: numberInput({ id: 'project-width', label: 'Canvas width', max: 512 }),
    height: numberInput({ id: 'project-height', label: 'Canvas height', max: 512 }),
    scale: numberInput({
      id: 'project-scale',
      label: 'Pixels per art pixel in the big copy',
      max: 32,
    }),
    directions: node(
      'select.input',
      { id: 'project-directions', 'aria-label': 'Directions' },
      Object.entries(DIRECTION_SETS)
        .filter(([, set]) => !set.hidden)
        .map(([id, set]) => node('option', { value: id }, set.label)),
    ),
  };
}

// square sizes as chips; the one the width and height make is marked
function sizeButtons(width, height) {
  const buttons = SIZES.map((size) =>
    node('button.btn.chip', { type: 'button', onclick: () => setSize(size) }, String(size)),
  );
  const mark = () =>
    buttons.forEach((button, i) => {
      const on = width.value === String(SIZES[i]) && height.value === String(SIZES[i]);
      button.setAttribute('aria-pressed', String(on));
    });
  const setSize = (size) => {
    width.value = String(size);
    height.value = String(size);
    mark();
  };

  width.addEventListener('input', mark);
  height.addEventListener('input', mark);

  return { buttons, mark };
}

export function projectFields() {
  const { name, width, height, scale, directions } = controls();
  const directionsField = field('Directions', directions);
  const sizes = sizeButtons(width, height);
  let usual = { width: 64, height: 64 };
  const el = node(
    'div.start-fields',
    {},
    field('Name', name),
    node(
      'div.start-row',
      {},
      field('Width (art pixels)', width),
      field('Height', height),
      field('Big copy scale', scale),
    ),
    node('div.start-sizes', { role: 'group', 'aria-label': 'Common sizes' }, sizes.buttons),
    directionsField,
  );

  return {
    el,
    fill(preset) {
      usual = preset.canvas;
      name.placeholder = defaultName(preset);
      width.value = String(preset.canvas.width);
      height.value = String(preset.canvas.height);
      sizes.mark();
      scale.value = String(preset.canvas.scale);
      directions.value = preset.directionSet;
      directionsField.hidden = preset.kind !== 'character';
    },
    read: () => ({
      name: name.value.trim() || name.placeholder,
      // a field left empty, or 0, takes the size the kind picked comes with
      width: sizeOr(width.value, usual.width),
      height: sizeOr(height.value, usual.height),
      scale: wholeNumber(scale.value, { min: 1, max: 32 }),
      directionSet: directions.value,
    }),
  };
}
