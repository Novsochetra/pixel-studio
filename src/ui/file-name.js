import { isSingleView } from '../model/kinds.js';
import { directionLabel } from '../model/project.js';

// A name as part of a file's name: lower case, its letters and digits of any script kept, the
// rest as hyphens. A name with neither ("!!!") gets the fallback, so no file is called ".json".
export function fileSlug(text, fallback = 'untitled') {
  const slug = String(text ?? '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');

  return slug || fallback;
}

// what a downloaded picture of one view is called: art with one view names no view
export function downloadName(project, direction) {
  const name = fileSlug(project.name, 'project');

  return isSingleView(project) ? name : `${name}-${fileSlug(directionLabel(direction), 'view')}`;
}
