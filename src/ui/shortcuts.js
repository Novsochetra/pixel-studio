import { node } from './dom.js';
import { openSheet } from './sheet.js';

const GROUPS = [
  [
    'Tools',
    [
      ['B', 'Pencil'],
      ['E', 'Eraser'],
      ['I or Alt-click', 'Pick a colour'],
      ['G', 'Fill'],
      ['R', 'Replace a colour everywhere'],
      ['D', 'Lighter shade (Shift: darker)'],
      ['S', 'Select and move'],
      ['W', 'Select a colour (Shift: everywhere)'],
      ['P', 'Pin a body part (Alt-click removes)'],
      ['M', 'Symmetry on or off'],
      ['Shift F', 'Flip the view'],
    ],
  ],
  [
    'Selection',
    [
      ['Arrows', 'Nudge 1 px (Shift: 10 px)'],
      ['⌘C  ⌘X  ⌘V', 'Copy, cut, paste (works across frames)'],
      ['Delete', 'Erase the selection'],
      ['Esc', 'Let go'],
      ['⌘A', 'Select everything'],
    ],
  ],
  [
    'Frames and view',
    [
      [',  .', 'Previous, next frame'],
      ['+  −', 'Zoom'],
      ['⌘ + scroll, pinch', 'Zoom around the pointer'],
      ['Space + drag, middle drag', 'Pan'],
      ['Two fingers', 'Pan and pinch on a touch screen'],
    ],
  ],
  [
    'Everything',
    [
      ['⌘Z', 'Undo (frames, layers and animations too)'],
      ['⇧⌘Z or ⌘Y', 'Redo'],
      ['?', 'This list'],
    ],
  ],
];

export function openShortcuts() {
  const sheet = openSheet('Keyboard shortcuts');
  sheet.body.append(
    node(
      'div.compare',
      { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' } },
      GROUPS.map(([title, rows]) =>
        node(
          'div',
          { style: { display: 'grid', gap: '6px', alignContent: 'start' } },
          node('h2.eyebrow', {}, title),
          rows.map(([keys, what]) =>
            node('div.shortcut', {}, node('kbd', {}, keys), node('span', {}, what)),
          ),
        ),
      ),
    ),
    node('div.sheet-actions', {}, node('button.btn.primary', { onclick: sheet.close }, 'Done')),
  );
}
