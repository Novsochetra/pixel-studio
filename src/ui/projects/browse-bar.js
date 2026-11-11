import { icon, node } from '../dom.js';
import { openProjectFile } from '../downloads.js';

const SORTS = [
  ['recent', 'Recent', 'The latest changed first'],
  ['name', 'A–Z', 'By name'],
];

function searchField(job) {
  const field = node('input.input.projects-search', {
    type: 'search',
    placeholder: 'Search projects and folders',
    'aria-label': 'Search projects',
    oninput: () => job.search(field.value),
    // the window closes on Escape, so one that empties a search goes no further
    onkeydown: (event) => {
      if (event.key === 'Escape' && field.value) {
        event.preventDefault();
        event.stopPropagation();
        job.clearSearch();
      }
    },
  });

  return node('label.projects-find', {}, icon('search'), field);
}

function sortChoice(job) {
  const pick = (event, sort) => {
    for (const button of event.currentTarget.parentElement.children) {
      button.setAttribute('aria-pressed', String(button === event.currentTarget));
    }

    job.sortBy(sort);
  };

  return node(
    'div.segmented',
    { 'aria-label': 'Sort projects' },
    SORTS.map(([sort, label, title]) =>
      node(
        'button',
        {
          title,
          'aria-pressed': String(job.view.sort === sort),
          onclick: (event) => pick(event, sort),
        },
        label,
      ),
    ),
  );
}

export function browseBar(job) {
  return node(
    'div.browse-bar',
    {},
    searchField(job),
    sortChoice(job),
    node(
      'button.btn.quiet',
      { onclick: () => openProjectFile(job.app, job.close) },
      icon('upload'),
      'Open a project file…',
    ),
  );
}
