import { node } from './dom.js';
import { openSheet } from './sheet.js';
import { keyNames } from './platform-keys.js';
import { hasBody } from '../model/kinds.js';

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
      ['S', 'Select and move: a click on art turns on Move for its layer'],
      ['W', 'Select a colour (Shift: everywhere)'],
      ['L', 'Lasso: draw round a part to select it, drag inside to move it'],
      ['Shift / Alt + lasso', 'Add to the selection / take away; a click is one pixel'],
      ['P', 'Pin a body part (Alt-click removes)'],
      ['T', 'Move: drag art for its layer, empty canvas for the whole frame'],
      ['T, then the handle', 'Turn the picked layers (Shift: steps of 15°)'],
      ['T, then arrows', 'Move the picked layers 1 px (Shift: 10 px)'],
      ['⌘click, Shift-click a layer', 'Pick more layers to move together; all = the whole frame'],
      ['O', 'Pose the body parts: drag a part, or its handle to turn it'],
      ['M', 'Symmetry on or off'],
      ['Shift F', 'Flip this layer left to right'],
    ],
  ],
  [
    'Selection',
    [
      ['Arrows', 'Nudge 1 px (Shift: 10 px)'],
      ['⌘C  ⌘X  ⌘V', 'Copy, cut, paste (works across frames)'],
      ['Delete', 'Erase the selection'],
      ['Esc, Enter', 'Let go'],
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
      ['Tap with two fingers, with three', 'Undo, redo on a touch screen'],
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

// pins and body parts are a character's: their keys do nothing for a chest, a tile or an icon
const BODY_KEYS = new Set(['P', 'O']);

const BODY_GROUP = 'Posing a part';

const forAll = (project) => !project || hasBody(project);

const rowsFor = (rows, project) =>
  forAll(project) ? rows : rows.filter(([keys]) => !BODY_KEYS.has(keys));

const groupsFor = (project) =>
  forAll(project) ? GROUPS : GROUPS.filter(([title]) => title !== BODY_GROUP);

export function openShortcuts(project = null) {
  const sheet = openSheet('Keyboard shortcuts', null, { wide: true });

  sheet.body.append(
    node(
      'div.shortcut-groups',
      {},
      groupsFor(project).map(([title, rows]) =>
        node(
          'div.shortcut-group',
          {},
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
