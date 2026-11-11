import { node } from '../dom.js';

const PAGES = [
  ['all', 'All projects'],
  ['this', 'This project'],
  ['new', 'New project'],
];

// The window is three pages, one in sight at a time: every project, the one that is open, and a
// new one. All three on one sheet, the open project's buttons, the search, the folders, the
// cards and the new project's form were more than anyone could take in at a glance.
// parts: { all, this, new }, what each page holds; onTurn(id) is told the page now in sight
export function projectPages(parts, onTurn = () => {}) {
  const pages = Object.fromEntries(
    PAGES.map(([id]) => [
      id,
      node('div.projects-page', { 'data-page': id, hidden: id !== 'all' }, parts[id]),
    ]),
  );
  const tabs = PAGES.map(([id, label]) =>
    node('button', { 'aria-pressed': String(id === 'all'), onclick: () => goTo(id) }, label),
  );

  function goTo(shown) {
    PAGES.forEach(([id], i) => {
      pages[id].hidden = id !== shown;
      tabs[i].setAttribute('aria-pressed', String(id === shown));
    });
    onTurn(shown);
  }

  return {
    nav: node('div.segmented.projects-nav', { role: 'group', 'aria-label': 'Projects' }, tabs),
    pages,
    goTo,
  };
}
