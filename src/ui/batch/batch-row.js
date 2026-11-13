import { node } from '../dom.js';
import { frameCount, hasArt } from '../../model/frames.js';
import { viewName } from '../../model/kinds.js';

function viewPicker(item, project, animation) {
  return node(
    'select.input',
    {
      'aria-label': `View for ${item.file.name}`,
      onchange: (event) => {
        item.direction = event.target.value;
      },
    },
    Object.keys(animation.directions).map((other) =>
      node(
        'option',
        { value: other, selected: item.direction === other },
        viewName(project, other),
      ),
    ),
  );
}

// A frame that holds art says so: put there, the cleaned picture took the place of what was
// drawn, and nothing in the row had said it would.
function frameWords(animation, direction, index) {
  const frame = animation.directions[direction]?.frames[index];

  return frame && hasArt(frame) ? `Frame ${index + 1} · replaces its art` : `Frame ${index + 1}`;
}

function framePicker(item, animation) {
  const frames = Array.from({ length: frameCount(animation) }, (_, i) =>
    node(
      'option',
      { value: String(i), selected: item.placement === String(i) },
      frameWords(animation, item.direction, i),
    ),
  );

  return node(
    'select.input',
    {
      'aria-label': `Where ${item.file.name} goes`,
      onchange: (event) => {
        item.placement = event.target.value;
      },
    },
    frames,
    node('option', { value: 'new', selected: item.placement === 'new' }, 'A new frame'),
  );
}

// one image: its picture, which view and frame it goes into, how cleaning went, the result
export function batchRow(item, project, animation) {
  const views = Object.keys(animation.directions).length;

  return node(
    'div.batch-row',
    {},
    node('img', { src: item.url, alt: item.file.name }),
    node(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '6px' } },
      node('div.view-name', {}, item.file.name),
      node(
        'div.group',
        { style: { gap: '6px', flexWrap: 'wrap' } },
        views > 1 ? viewPicker(item, project, animation) : null,
        framePicker(item, animation),
      ),
      item.status,
    ),
    item.result ?? node('div'),
  );
}
