import { forHands } from './platform-keys.js';
import { hasBody } from '../model/kinds.js';

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
    touch: 'Line: drag from end to end. Even shapes, in Brush, keeps it straight',
  },
  {
    id: 'rect',
    label: 'Rectangle: drag corner to corner (Shift: a square)',
    key: 'u',
    touch: 'Rectangle: drag corner to corner. Even shapes, in Brush, makes squares',
  },
  {
    id: 'ellipse',
    label: 'Ellipse: drag corner to corner (Shift: a circle)',
    key: 'c',
    touch: 'Ellipse: drag corner to corner. Even shapes, in Brush, makes circles',
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
    touch:
      'Light and dark brush: each colour it passes goes a shade lighter, or darker with Darker shades in Brush',
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
    touch: 'Select a colour: tap it. Everywhere, on its bar, takes every pixel of it',
  },
  {
    id: 'lasso',
    label:
      'Lasso: draw round a part to select it, drag inside to move it (Shift: add, Alt: take away)',
    key: 'l',
    touch:
      'Lasso: draw round a part to select it, drag inside to move it. Add and Take away are on its bar',
  },
  {
    id: 'pin',
    label: 'Pin a body part (Alt-click removes it)',
    key: 'p',
    touch: 'Pin a body part: pick the part on the bar over the canvas, then tap where it is',
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

// pins and body parts are a character's; objects, tiles, effects and icons have none
const BODY_ONLY = new Set(['pin', 'pose']);

export function toolsFor(project) {
  return TOOLS.filter((tool) => !BODY_ONLY.has(tool.id) || hasBody(project));
}
