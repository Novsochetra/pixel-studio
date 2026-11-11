import { toast } from './dom.js';
import { downloadName, fileSlug } from './file-name.js';
import { openMenu } from './menu.js';
import { directionSprite, directionsInUse } from './actions.js';
import { canvasToBlob, checkerPainter, spritePng } from '../io/images.js';
import { zipFiles } from '../io/zip.js';
import { saveFile } from './save-file.js';
import { viewsSideBySide } from './views-side-by-side.js';
import { projectFileText, readProjectFile } from '../store/project-file.js';
import { chooseFile } from './choose-file.js';
import { openExportSheet } from './export-sheet.js';
import { openChatgptSheet } from './prompt/prompt-sheet.js';
import { inWords } from '../model/told.js';
import { isSingleView, viewName } from '../model/kinds.js';
import { bounds } from '../model/sprite.js';

const slug = (text) => fileSlug(text, 'project');

async function saveView(app, scale, checker = false) {
  const { state } = app.store;
  const sprite = directionSprite(state, state.at.direction);
  const size = sprite.width * scale;
  const blob = await spritePng(sprite, scale, checker ? checkerPainter(scale * 2) : null);

  await saveFile(
    `${downloadName(state.project, state.at.direction)}-${size}${checker ? '-checker' : ''}.png`,
    blob,
  );
}

async function saveAllViews(app) {
  const { state } = app.store;
  const scale = state.project.canvas.scale;
  const files = [];

  for (const direction of directionsInUse(state)) {
    const sprite = directionSprite(state, direction);

    // a view with nothing drawn in it would be a blank picture in the zip
    if (!bounds(sprite)) {
      continue;
    }

    for (const factor of scale > 1 ? [1, scale] : [1]) {
      const suffix = sprite.width * factor;
      const blob = await spritePng(sprite, factor);

      files.push({
        name: `${downloadName(state.project, direction)}-${suffix}.png`,
        data: new Uint8Array(await blob.arrayBuffer()),
      });
    }
  }

  if (!files.length) {
    toast('Nothing is drawn in this frame yet: there is no picture to download.');

    return;
  }

  await saveFile(
    `${slug(state.project.name)}-${isSingleView(state.project) ? 'sizes' : 'views'}.zip`,
    zipFiles(files),
  );
}

async function saveSideBySide(app) {
  const { state } = app.store;
  const blob = await canvasToBlob(viewsSideBySide(state, state.project.canvas.scale));

  await saveFile(`${slug(state.project.name)}-views-side-by-side.png`, blob);
}

export async function saveProject(app) {
  const { project } = app.store.state;
  const text = projectFileText(project);

  await saveFile(`${slug(project.name)}.json`, new Blob([text], { type: 'application/json' }));
}

export function openProjectFile(app, onOpened = () => {}) {
  chooseFile(async (file) => {
    try {
      const project = await readProjectFile(await file.text());

      await app.addProject(project);
      onOpened();
      toast(
        `Opened ${project.name} as a project of its own. Switch projects from its name, top left.`,
      );
    } catch (error) {
      toast(inWords(error, 'This file could not be opened as a project.'));
    }
  }, '.json,application/json');
}

function menuItems(app) {
  const { state } = app.store;
  const scale = state.project.canvas.scale;
  const { width, height } = state.project.canvas;
  const label = viewName(state.project, state.at.direction);
  const big = `${width * scale}×${height * scale}`;
  // art with one view has no views to zip together or to set side by side
  const single = isSingleView(state.project);

  // Each says what kind of file it is: "Icon · 32×32 for editing" named the view, which a
  // newcomer does not know, and nowhere said PNG or GIF.
  const png = single ? 'PNG' : `${label} as PNG`;

  return [
    ['Sprite sheet and GIFs for the game…', async () => openExportSheet(app)],
    ['Prompt and reference for an AI image…', async () => openChatgptSheet(app)],
    null,
    [`${png} · ${width}×${height}, for editing`, () => saveView(app, 1)],
    ...(scale > 1 ? [[`${png} · ${big}, transparent`, () => saveView(app, scale)]] : []),
    [`${png} · ${big} on the checkerboard`, () => saveView(app, scale, true)],
    null,
    [single ? 'Both sizes · zip' : 'All views · zip with both sizes', () => saveAllViews(app)],
    ...(single
      ? []
      : [['All views side by side · PNG with guide lines', () => saveSideBySide(app)]]),
    null,
    ['Save project file, to keep editing (.json)', () => saveProject(app)],
    ['Open a project file…', () => openProjectFile(app)],
  ];
}

export function openDownloadMenu(app, anchor) {
  openMenu(anchor, menuItems(app), {
    align: 'right',
    onError: (error) => toast(inWords(error, 'The file could not be made. Try again in a moment.')),
  });
}
