import { node } from '../dom.js';
import { characterHeight } from '../export-settings.js';
import { saidWarning } from '../../export/said-warning.js';
import { viewName } from '../../model/kinds.js';

const count = (number, word) => `${number} ${word}${number === 1 ? '' : 's'}`;

// what the sheet will be, and what is wrong with it, under its picture
export function summary(result, animation, state) {
  const { project } = state;
  const rows = result.rows.map((row) => viewName(project, row.direction)).join(', ');
  const said = (warning) => saidWarning(project, result, warning);
  const outside = result.warnings.some((warning) => warning.includes('outside'));

  return [
    node(
      'p.hint',
      {},
      `${count(result.frames, 'frame')} × ${count(result.rows.length, 'row')} (${rows}) · ${result.sheet.width}×${result.sheet.height} px · ${animation.fps} fps`,
    ),
    outside
      ? node(
          'p.hint',
          {},
          `Some art does not fit this frame; the reference art is ${characterHeight(state)} px tall. "Fit the art" makes a frame that holds it.`,
        )
      : null,
    result.warnings.length ? node('pre.report', {}, result.warnings.map(said).join('\n')) : null,
  ];
}
