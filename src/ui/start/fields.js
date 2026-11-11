import { node } from '../dom.js';
import { DIRECTION_SETS } from '../../model/directions.js';
import { defaultName } from '../../model/presets.js';
import { isWholeBetween, wholeNumber } from '../../model/numbers.js';
import { numberInput } from '../number-input.js';
import { CANVAS_LIMITS } from '../../model/canvas-size.js';
import { fieldRow, listGroup } from '../list-group.js';

const SIZES = [16, 24, 32, 48, 64, 96, 128, 160];

const sizeOr = (text, usual) => wholeNumber(text.trim(), { ...CANVAS_LIMITS, fallback: usual });

// Empty takes the size the kind comes with; anything typed is a size a canvas can have. 0 and
// −5 were quietly made that size too, where 5 was refused: now each is told the same.
const sizeCanBe = (text) => !text.trim() || isWholeBetween(text, CANVAS_LIMITS);

function controls() {
  return {
    name: node('input.input', { id: 'project-name', 'aria-label': 'Name' }),
    width: numberInput({ id: 'project-width', label: 'Canvas width', ...CANVAS_LIMITS }),
    height: numberInput({ id: 'project-height', label: 'Canvas height', ...CANVAS_LIMITS }),
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

// why the sizes typed cannot be: said, where 5 was quietly made 8 and 99999 made 512
const sizeProblem = (sizes) =>
  sizes.every((size) => sizeCanBe(size.value))
    ? null
    : `Width and height are whole numbers of art pixels from ${CANVAS_LIMITS.min} to ${CANVAS_LIMITS.max}. Leave one empty for the size this kind comes with.`;

function laidOut({ name, width, height, scale }, sizes, directionsField) {
  return node(
    'div.start-fields',
    {},
    listGroup({}, fieldRow('Name', name)),
    listGroup(
      { title: 'Canvas, in art pixels' },
      fieldRow('Width', width),
      fieldRow('Height', height),
      node(
        'div.list-row.start-sizes',
        { role: 'group', 'aria-label': 'Common sizes' },
        sizes.buttons,
      ),
      fieldRow('Big copy scale', scale, {
        title: 'How many screen pixels each art pixel is in the big copy a download holds',
      }),
    ),
    directionsField,
  );
}

export function projectFields() {
  const { name, width, height, scale, directions } = controls();
  const directionsField = listGroup({}, fieldRow('Directions', directions));
  const sizes = sizeButtons(width, height);
  let usual = { width: 64, height: 64 };
  const el = laidOut({ name, width, height, scale }, sizes, directionsField);

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
    problem: () => sizeProblem([width, height]),
    read: () => ({
      name: name.value.trim() || name.placeholder,
      // a field left empty takes the size the kind picked comes with
      width: sizeOr(width.value, usual.width),
      height: sizeOr(height.value, usual.height),
      scale: wholeNumber(scale.value, { min: 1, max: 32 }),
      directionSet: directions.value,
    }),
  };
}
