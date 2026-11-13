import { actionRow, listGroup } from '../list-group.js';
import { moveProject } from './change-list.js';

const OFFERED = 8;

// An empty folder offers the projects to put in it, the latest first: it opened on a page of its
// own with none of them in sight, to drag there or to pick.
export function folderFill(job, place) {
  const { index, store } = job.app;
  const folder = index.folders.find((each) => each.id === place);
  const others = index.list
    .filter((entry) => (entry.folder ?? null) !== place)
    .sort((first, second) => (second.updatedAt ?? 0) - (first.updatedAt ?? 0))
    .slice(0, OFFERED);

  if (!folder || !others.length) {
    return null;
  }

  const nameOf = (entry) =>
    entry.id === store.state.project.id ? store.state.project.name : entry.name;

  return listGroup(
    { title: `Put a project in ${folder.name}` },
    others.map((entry) =>
      actionRow(
        nameOf(entry),
        () => moveProject(job, { id: entry.id, name: nameOf(entry) }, folder),
        {
          value: 'Move here',
          leads: false,
          'aria-label': `Move ${nameOf(entry)} to ${folder.name}`,
        },
      ),
    ),
  );
}
