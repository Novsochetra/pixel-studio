import { node } from './dom.js';
import { openSheet } from './sheet.js';
import { keyNames } from './platform-keys.js';
import { kindOf } from '../model/kinds.js';

const GROUPS = [
  [
    'Tools',
    [
      ['B', 'Pencil'],
      ['E', 'Eraser'],
      ['I or Alt-click', 'Colour picker'],
      ['G', 'Fill'],
      ['N  U  C', 'Line, rectangle, ellipse (Shift: straight, square, circle)'],
      ['R', 'Replace colour: every pixel of the one clicked'],
      ['D', 'Light and dark brush (Shift: darker)'],
      ['[  ]', 'Brush smaller, bigger'],
      ['S', 'Select and move: a click picks the layer under it'],
      ['W', 'Select a colour (Shift: everywhere)'],
      ['L', 'Lasso: draw round a part to select it, drag inside to move it'],
      ['Shift / Alt + lasso', 'Add to the selection / take away; a click is one pixel'],
      ['P', 'Pin a body part (Alt-click removes)'],
      ['T', 'Move this layer: drag or arrow keys (Shift: 10 px)'],
      ['V', 'Move the whole frame: drag or arrow keys (Shift: 10 px)'],
      ['O', 'Pose the body parts: drag a part, or its handle to turn it'],
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
    'Posing a part',
    [
      ['Arrows', 'Move it 1 px (Shift: 10 px)'],
      ['[  ]', 'Turn it 5° (Shift: 1°)'],
      ['Shift + drag', 'Turn it (Shift on the handle: steps of 15°)'],
      ['Esc', 'Let go of it'],
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
      ['⌘scroll, or pinch', 'Zoom around the pointer'],
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

// pins and body parts are for what stands on its feet: their keys do nothing for a tile or an icon
const STANDING_KEYS = new Set(['P', 'O']);

const rowsFor = (rows, project) =>
  !project || kindOf(project).place === 'feet'
    ? rows
    : rows.filter(([keys]) => !STANDING_KEYS.has(keys));

export function openShortcuts(project = null) {
  const sheet = openSheet('Keyboard shortcuts', null, { wide: true });

  sheet.body.append(
    node(
      'div.compare',
      { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' } },
      GROUPS.map(([title, rows]) =>
        node(
          'div',
          { style: { display: 'grid', gap: '6px', alignContent: 'start' } },
          node('h2.eyebrow', {}, title),
          rowsFor(rows, project).map(([keys, what]) =>
            node('div.shortcut', {}, node('kbd', {}, keyNames(keys)), node('span', {}, what)),
          ),
        ),
      ),
    ),
    node('div.sheet-actions', {}, node('button.btn.primary', { onclick: sheet.close }, 'Done')),
  );
}
