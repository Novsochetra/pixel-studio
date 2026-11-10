import { node } from '../dom.js';
import { characterHeight } from '../export-settings.js';
import { viewName } from '../../model/kinds.js';

const count = (number, word) => `${number} ${word}${number === 1 ? '' : 's'}`;

// what the sheet will be, and what is wrong with it, under its picture
export function summary(result, animation, state) {
  const { project } = state;
  const rows = result.rows.map((row) => viewName(project, row.direction)).join(', ');
  // the sheet's warnings name a view as the game's data does (south): here it is said as the
  // studio says it everywhere else (Front, or Icon)
  const said = (warning) =>
    result.rows.reduce(
      (text, row) =>
        text.replace(new RegExp(`^${row.direction}\\b`), viewName(project, row.direction)),
      warning,
    );
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
