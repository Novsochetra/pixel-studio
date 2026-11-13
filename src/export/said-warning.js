import { viewName } from '../model/kinds.js';

// the sheet's warnings name a view as the game's data does (south): to a person it is said as
// the studio says it everywhere else (Front, or Icon)
export const saidWarning = (project, result, warning) =>
  result.rows.reduce(
    (text, row) =>
      text.replace(new RegExp(`^${row.direction}\\b`), viewName(project, row.direction)),
    warning,
  );
