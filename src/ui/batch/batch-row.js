import { node } from '../dom.js';
import { frameCount } from '../../model/frames.js';
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

function framePicker(item, animation) {
  const frames = Array.from({ length: frameCount(animation) }, (_, i) =>
    node('option', { value: String(i), selected: item.placement === String(i) }, `Frame ${i + 1}`),
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
