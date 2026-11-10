import { node, replace } from '../dom.js';
import { openSheet } from '../sheet.js';
import { readSetting, keepSetting } from '../remembered.js';
import { currentRow } from './current-row.js';
import { browseBar } from './browse-bar.js';
import { folderList } from './folder-list.js';
import { projectGrid } from './project-grid.js';
import { startSection, whereNewGoes } from './start-section.js';
import { changeList } from './change-list.js';
import { castPictures } from './cast-pictures.js';
import { openLineUp } from './line-up-sheet.js';
import { EVERY_PROJECT, knownPlace } from '../../store/browse.js';
import { addFolder, folderOf } from '../../store/folders.js';

const SORT_KEY = 'pixel-clean-projects-sort';

// the place open last in this visit, so a game's folder stays open while its projects are switched
let lastPlace = null;

function startingView(index) {
  const place = lastPlace ?? folderOf(index, index.current) ?? EVERY_PROJECT;

  return { place: knownPlace(index, place), sort: readSetting(SORT_KEY, 'recent'), query: '' };
}

function drawing(job, { current, browser, body }) {
  const show = () => {
    job.view.place = knownPlace(job.app.index, job.view.place);
    lastPlace = job.view.place;
    replace(browser, folderList(job), projectGrid(job));
    // on a phone the folders are one row that scrolls: the open one may be past its edge
    browser
      .querySelector('.folder-name-field, .place[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

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
      replace(current, currentRow(job));
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
    newFolder: () => job.renameFolder(changeList(job, (index) => addFolder(index)).id),
  };
}

function newProjectOpener(body) {
  return () => {
    const section = body.querySelector('.start-section');

    if (section) {
      section.open = true;
      section.scrollIntoView({ block: 'start', behavior: 'smooth' });
      section.querySelector('[role="radio"][tabindex="0"]')?.focus({ preventScroll: true });
    }
  };
}

// New project, drawn again when the presets it offers change: open if it was
async function showStart(job, body) {
  const section = await startSection(job);
  const before = body.querySelector('.start-section');

  if (before) {
    section.open = before.open;
    before.replaceWith(section);
  } else {
    body.append(section);
  }
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

  Object.assign(job, drawing(job, { ...parts, body: sheet.body }), browsing(job, sheet.body), {
    startNew: newProjectOpener(sheet.body),
    // one sheet at a time: two open sheets would both close on one Escape
    lineUp: (entries) => {
      sheet.close();
      openLineUp(job.pictures.cast(entries));
    },
  });
  sheet.body.classList.add('projects-sheet');
  sheet.body.append(parts.current, browseBar(job), parts.browser);
  job.redraw();
  job.showStart = () => showStart(job, sheet.body);
  job.showStart();

  // with many projects, finding one by name is the quickest way in; a phone's keyboard would
  // cover the list, so the search takes focus only with a pointer
  if (matchMedia('(pointer: fine)').matches) {
    queueMicrotask(() => sheet.body.querySelector('.projects-search')?.focus());
  }
}
