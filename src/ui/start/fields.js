import { node } from '../dom.js';
import { DIRECTION_SETS } from '../../model/directions.js';
import { defaultName } from '../../model/presets.js';

const SIZES = [16, 24, 32, 48, 64, 96, 128, 160];

function numberInput(id, label, max) {
  return node('input.input.mono', {
    id,
    type: 'number',
    min: '1',
    max: String(max),
    'aria-label': label,
  });
}

function field(label, control) {
  return node('label.field', {}, node('span', {}, label), control);
}

const clamp = (input, min, max) =>
  Math.max(min, Math.min(max, Math.round(Number(input.value)) || min));

function controls() {
  return {
    name: node('input.input', { id: 'project-name', 'aria-label': 'Name' }),
    width: numberInput('project-width', 'Canvas width', 512),
    height: numberInput('project-height', 'Canvas height', 512),
    scale: numberInput('project-scale', 'Pixels per art pixel in the big copy', 32),
    directions: node(
      'select.input',
      { id: 'project-directions', 'aria-label': 'Directions' },
      Object.entries(DIRECTION_SETS)
        .filter(([, set]) => !set.hidden)
        .map(([id, set]) => node('option', { value: id }, set.label)),
    ),
  };
}

function sizeButtons(width, height) {
  const setSize = (size) => {
    width.value = String(size);
    height.value = String(size);
  };

  return SIZES.map((size) =>
    node('button.btn.quiet', { type: 'button', onclick: () => setSize(size) }, String(size)),
  );
}

// name, canvas size, big-copy scale and, for characters, which directions are drawn
export function projectFields() {
  const { name, width, height, scale, directions } = controls();
  const directionsField = field('Directions', directions);
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
    node(
      'div.start-sizes',
      { role: 'group', 'aria-label': 'Common sizes' },
      sizeButtons(width, height),
    ),
    directionsField,
  );

  return {
    el,
    fill(preset) {
      name.placeholder = defaultName(preset);
      width.value = String(preset.canvas.width);
      height.value = String(preset.canvas.height);
      scale.value = String(preset.canvas.scale);
      directions.value = preset.directionSet;
      directionsField.hidden = preset.kind !== 'character';
    },
    read: () => ({
      name: name.value.trim() || name.placeholder,
      width: clamp(width, 8, 512),
      height: clamp(height, 8, 512),
      scale: clamp(scale, 1, 32),
      directionSet: directions.value,
    }),
  };
}
