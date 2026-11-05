import { settleAt } from './actions.js';
import { bounds, fromHex } from '../model/sprite.js';
import { referenceOf } from '../model/reference.js';

// the editor's state when a project opens
export function startingState(project) {
  const animation = project.animations[0];
  const first = animation.directions[referenceOf(project)] ?? Object.values(animation.directions)[0];
  const box = bounds(first.frames[0].layers[0].sprite);

  return {
    project,
    at: settleAt({ project, at: { animation: animation.id, direction: referenceOf(project), frame: 0, layer: null } }),
    mode: 'edit',
    tool: 'pencil',
    color: fromHex('#df2321'),
    paintOver: null,
    paletteLock: false,
    cleanLines: true,
    symmetry: { on: false, axisSum: box ? box.left + box.right - 1 : project.canvas.width - 1 },
    zoom: 4,
    showGrid: true,
    showGuides: true,
    overlay: { direction: null, opacity: 0.4 },
    game: { size: 'match', zoom: 1, mirrored: false, runAcross: false },
    swapPreview: null,
    cursor: null,
    onion: false,
    viewFilter: 'colour',
    showPins: false,
    pinName: 'Head',
    selection: null,
    highlight: null,
    saveStatus: 'saved',
  };
}
