import { node } from './dom.js';
import { openSheet } from './sheet.js';
import { keyNames } from './platform-keys.js';

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
      ['[  ]', 'Brush smaller, bigger'],
      ['S', 'Select and move'],
      ['W', 'Select a colour (Shift: everywhere)'],
      ['P', 'Pin a body part (Alt-click removes)'],
      ['V', 'Move the whole frame: drag or arrow keys (Shift: 10 px)'],
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
      ['Alt ←  →', 'Move the selected frame earlier or later'],
      ['Arrows, Home, End', 'In the frames: walk the frames and views; on a tab: the tabs'],
      ['Shift F10, right-click', 'A tab’s menu: rename, duplicate, delete'],
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
  const sheet = openSheet('Keyboard shortcuts', null, { wide: true });

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
            node('div.shortcut', {}, node('kbd', {}, keyNames(keys)), node('span', {}, what)),
          ),
        ),
      ),
    ),
    node('div.sheet-actions', {}, node('button.btn.primary', { onclick: sheet.close }, 'Done')),
  );
}
