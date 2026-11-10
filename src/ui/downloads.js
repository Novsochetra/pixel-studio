import { toast } from './dom.js';
import { downloadName, fileSlug } from './file-name.js';
import { openMenu } from './menu.js';
import { directionSprite, directionsInUse } from './actions.js';
import { canvasToBlob, checkerPainter, spritePng } from '../io/images.js';
import { zipFiles } from '../io/zip.js';
import { saveFile } from './save-file.js';
import { boardCanvas } from './board-canvas.js';
import { projectFileText, readProjectBundle } from '../store/project-file.js';
import { backgroundUrl } from './preview-background.js';
import { chooseFile } from './choose-file.js';
import { openExportSheet } from './export-sheet.js';
import { openChatgptSheet } from './prompt/prompt-sheet.js';
import { inWords } from '../model/told.js';
import { isSingleView, viewName } from '../model/kinds.js';

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

    for (const factor of scale > 1 ? [1, scale] : [1]) {
      const suffix = sprite.width * factor;
      const blob = await spritePng(sprite, factor);

      files.push({
        name: `${downloadName(state.project, direction)}-${suffix}.png`,
        data: new Uint8Array(await blob.arrayBuffer()),
      });
    }
  }

  await saveFile(
    `${slug(state.project.name)}-${isSingleView(state.project) ? 'sizes' : 'views'}.zip`,
    zipFiles(files),
  );
}

async function saveBoard(app) {
  const { state } = app.store;
  const blob = await canvasToBlob(
    boardCanvas(state, state.project.canvas.scale, { overlay: null, mapping: null }),
  );

  await saveFile(`${slug(state.project.name)}-views-board.png`, blob);
}

export async function saveProject(app) {
  const { project } = app.store.state;
  const text = projectFileText(project, await backgroundUrl(app));

  await saveFile(`${slug(project.name)}.json`, new Blob([text], { type: 'application/json' }));
}

export function openProjectFile(app, onOpened = () => {}) {
  chooseFile(async (file) => {
    try {
      const { project, background } = await readProjectBundle(await file.text());

      await app.addProject(project, background);
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
  // art with one view has no views to zip together and no Views board
  const single = isSingleView(state.project);

  return [
    ['Sprite sheet for the game…', async () => openExportSheet(app)],
    ['Prompt and reference for an AI image…', async () => openChatgptSheet(app)],
    null,
    [`${label} · ${width}×${height} for editing`, () => saveView(app, 1)],
    ...(scale > 1 ? [[`${label} · ${big}, transparent`, () => saveView(app, scale)]] : []),
    [`${label} · ${big} on the checkerboard`, () => saveView(app, scale, true)],
    null,
    [`${single ? label : 'All views'} · zip with both sizes`, () => saveAllViews(app)],
    ...(single ? [] : [['Views board · PNG with guide lines and marks', () => saveBoard(app)]]),
    null,
    ['Save project file (.json)', () => saveProject(app)],
    ['Open a project file…', () => openProjectFile(app)],
  ];
}

export function openDownloadMenu(app, anchor) {
  openMenu(anchor, menuItems(app), {
    align: 'right',
    onError: (error) => toast(inWords(error, 'The file could not be made. Try again in a moment.')),
  });
}
