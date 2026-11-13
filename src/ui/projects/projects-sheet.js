import { node, replace } from '../dom.js';
import { openSheet } from '../sheet.js';
import { keepFocus } from '../keep-focus.js';
import { tabSaysChange } from '../field-keys.js';
import { readSetting, keepSetting } from '../remembered.js';
import { thisProject } from './this-project.js';
import { browseBar } from './browse-bar.js';
import { folderList } from './folder-list.js';
import { projectList } from './project-list.js';
import { startSection, whereNewGoes } from './start-section.js';
import { changeList } from './change-list.js';
import { castPictures } from './cast-pictures.js';
import { openLineUp } from './line-up-sheet.js';
import { projectPages } from './project-pages.js';
import { EVERY_PROJECT, knownPlace } from '../../store/browse.js';
import { addFolder, folderOf } from '../../store/folders.js';
import { accountGroup } from '../account/account-group.js';

const SORT_KEY = 'pixel-clean-projects-sort';

// the place open last in this visit, so a game's folder stays open while its projects are switched
let lastPlace = null;

function startingView(index) {
  const place = lastPlace ?? folderOf(index, index.current) ?? EVERY_PROJECT;

  return { place: knownPlace(index, place), sort: readSetting(SORT_KEY, 'recent'), query: '' };
}

// On a phone the folders are one row that scrolls: the open one may be past its edge. Only the
// list is scrolled: scrollIntoView moved the window it is in too, and cut off the window's top.
function keepInSight(place) {
  const list = place?.closest('.folder-list');

  if (!list) {
    return;
  }

  const [item, frame] = [place.getBoundingClientRect(), list.getBoundingClientRect()];

  if (item.left < frame.left || item.right > frame.right) {
    list.scrollLeft += item.left - frame.left - (frame.width - item.width) / 2;
  }

  if (item.top < frame.top || item.bottom > frame.bottom) {
    list.scrollTop += item.top - frame.top - (frame.height - item.height) / 2;
  }
}

function drawing(job, { current, browser, body }) {
  const show = () => {
    job.view.place = knownPlace(job.app.index, job.view.place);
    lastPlace = job.view.place;
    // a folder picked with the keys keeps them, in the list as it is drawn again
    keepFocus(browser, () => replace(browser, folderList(job), projectList(job)));
    keepInSight(browser.querySelector('.folder-name-field, .place[aria-current="true"]'));

    const where = body.querySelector('.start-where');

    if (where) {
      where.textContent = whereNewGoes(job);
    }

    if (job.renaming) {
      job.renaming = null;
      browser.querySelector('.place-rename')?.click();
    }
  };

  return {
    show,
    redraw: () => {
      keepFocus(current, () => replace(current, thisProject(job)));
      show();
    },
  };
}

function browsing(job, body) {
  const field = () => body.querySelector('.projects-search');

  return {
    goTo: (place) => {
      Object.assign(job.view, { place, query: '' });
      field().value = '';
      job.show();
    },
    search: (query) => {
      job.view.query = query;
      job.show();
    },
    clearSearch: () => job.goTo(job.view.place),
    sortBy: (sort) => {
      job.view.sort = sort;
      keepSetting(SORT_KEY, sort);
      job.show();
    },
    renameFolder: (id) => {
      job.renaming = id;
      job.goTo(id);
    },
    newFolder: () => {
      job.fresh = changeList(job, (index) => addFolder(index)).id;
      job.renameFolder(job.fresh);
    },
  };
}

// New project, drawn again when the presets it offers change. Opened, it is the page in sight:
// the page is turned to by opening it.
async function showStart(job, book) {
  const section = await startSection(job);

  section.addEventListener('toggle', () => section.open && book.goTo('new'));
  section.open = !book.pages.new.hidden;
  book.pages.new.replaceChildren(section);
}

export function openProjectsSheet(app) {
  const sheet = openSheet('Projects', null, { wide: true });
  const parts = { current: node('div.projects-current'), browser: node('div.projects-browser') };
  const job = {
    app,
    close: sheet.close,
    pictures: castPictures(app),
    view: startingView(app.index),
  };

  // the new project's form is open on its own page and shut off it
  const book = projectPages(
    { all: [browseBar(job), parts.browser, accountGroup(app)], this: [parts.current] },
    (page) => {
      const section = sheet.body.querySelector('.start-section');

      if (section) {
        section.open = page === 'new';
      }
    },
  );

  Object.assign(job, drawing(job, { ...parts, body: sheet.body }), browsing(job, sheet.body), {
    // over this window, which Escape there comes back to; one of the cast picked shuts both
    lineUp: (entries) => openLineUp(job.pictures.cast(entries), sheet.close),
  });
  // the project's name typed, then Tab: said at the key, so Tab goes on from the page drawn again
  tabSaysChange(parts.current);
  sheet.body.classList.add('projects-sheet');
  sheet.body.append(book.nav, ...Object.values(book.pages));
  job.redraw();
  job.showStart = () => showStart(job, book);
  job.turnTo = book.goTo;
  job.showStart();

  // with many projects, finding one by name is the quickest way in; a phone's keyboard would
  // cover the list, so the search takes focus only with a pointer
  if (matchMedia('(pointer: fine)').matches) {
    queueMicrotask(() => sheet.body.querySelector('.projects-search')?.focus());
  }
}
