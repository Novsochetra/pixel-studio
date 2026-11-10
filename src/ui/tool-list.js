import { forHands } from './platform-keys.js';
import { kindOf } from '../model/kinds.js';

// label: what the tool does, with its keys; touch: the same said to fingers, which have no Shift
// or Alt to hold and click nothing
const TOOLS = [
  { id: 'pencil', label: 'Pencil', key: 'b' },
  { id: 'eraser', label: 'Eraser', key: 'e' },
  {
    id: 'picker',
    label: 'Colour picker',
    key: 'i',
    touch: 'Colour picker: tap a colour of the art',
  },
  { id: 'fill', label: 'Fill', key: 'g' },
  {
    id: 'line',
    label: 'Line: drag from end to end (Shift: straight or diagonal)',
    key: 'n',
    touch: 'Line: drag from end to end',
  },
  {
    id: 'rect',
    label: 'Rectangle: drag corner to corner (Shift: a square)',
    key: 'u',
    touch: 'Rectangle: drag corner to corner',
  },
  {
    id: 'ellipse',
    label: 'Ellipse: drag corner to corner (Shift: a circle)',
    key: 'c',
    touch: 'Ellipse: drag corner to corner',
  },
  {
    id: 'replace',
    label: 'Replace colour',
    key: 'r',
    touch: 'Replace colour: tap the colour to change',
  },
  {
    id: 'shade',
    label: 'Light and dark brush (Shift: darker)',
    key: 'd',
    touch: 'Light brush: each colour it passes goes a shade lighter',
  },
  {
    id: 'select',
    label: 'Select and move: a click picks the layer under it',
    key: 's',
    touch: 'Select and move: drag a box, then drag it; a tap picks the layer under it',
  },
  {
    id: 'wand',
    label: 'Select a colour (Shift: everywhere)',
    key: 'w',
    touch: 'Select a colour: tap it',
  },
  {
    id: 'lasso',
    label:
      'Lasso: draw round a part to select it, drag inside to move it (Shift: add, Alt: take away)',
    key: 'l',
    touch: 'Lasso: draw round a part to select it, drag inside to move it',
  },
  {
    id: 'pin',
    label: 'Pin a body part (Alt-click removes it)',
    key: 'p',
    touch: 'Pin a body part: tap where it is',
  },
  {
    id: 'movelayer',
    label: 'Move this layer: drag it, or use the arrow keys',
    key: 't',
    touch: 'Move this layer: drag it',
  },
  {
    id: 'moveframe',
    label: 'Move the whole frame: drag it, or use the arrow keys',
    key: 'v',
    touch: 'Move the whole frame: drag it',
  },
  { id: 'pose', label: 'Pose the body parts: drag a part, or its handle to turn it', key: 'o' },
];

// what picking the tool says, to keys and a pointer or to fingers
export const toolSaid = (tool) => forHands(tool.label, tool.touch ?? tool.label);

// pins and body parts are for what stands on its feet; tiles, effects and icons have none
const STANDING_ONLY = new Set(['pin', 'pose']);

export function toolsFor(project) {
  return TOOLS.filter((tool) => !STANDING_ONLY.has(tool.id) || kindOf(project).place === 'feet');
}
