import { characterHeight } from './export-settings.js';
import { buildSheet } from '../export/sheet.js';
import { gamePack } from '../export/game-pack.js';
import { asepriteJson, directionFrames, frameFiles, viewFileName } from '../export/formats.js';
import { encodeGif } from '../io/gif.js';
import { spritePng } from '../io/images.js';
import { zipFiles } from '../io/zip.js';
import { saveFile } from './save-file.js';
import { fileSlug } from './file-name.js';
import { saidWarning } from './export/export-summary.js';

const encoder = new TextEncoder();
// a download says whose it is: sprite-sheets.zip from two projects were told apart by nothing
const named = (state) => fileSlug(state.project.name, 'project');

const warningsOf = (results, project) =>
  results.flatMap((result) =>
    result.warnings.map((warning) => `${result.name}: ${saidWarning(project, result, warning)}`),
  );

const pngBytes = async (sprite, scale = 1) =>
  new Uint8Array(await (await spritePng(sprite, scale)).arrayBuffer());

function upscale(sprite, scale) {
  const out = {
    width: sprite.width * scale,
    height: sprite.height * scale,
    pixels: new Uint8ClampedArray(sprite.width * scale * sprite.height * scale * 4),
  };

  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const from = (Math.floor(y / scale) * sprite.width + Math.floor(x / scale)) * 4;

      out.pixels.set(sprite.pixels.subarray(from, from + 4), (y * out.width + x) * 4);
    }
  }

  return out;
}

// every animation's sheet at Naga Eleven's paths, plus the SPRITES manifest for the game
export async function saveGamePack(state, settings) {
  const pack = gamePack(state.project, settings, characterHeight(state));
  const files = [];

  for (const sheet of pack.sheets) {
    files.push({ name: sheet.path, data: await pngBytes(sheet.sprite) });
  }

  for (const text of pack.texts) {
    files.push({ name: text.path, data: encoder.encode(text.text) });
  }

  await saveFile('naga-eleven-sprites.zip', zipFiles(files));

  return pack.warnings;
}

// each animation as a sheet with its Aseprite-style JSON beside it
export async function saveSheetsWithJson(state, settings) {
  const files = [];
  const results = state.project.animations.map((animation) =>
    buildSheet(state.project, animation, settings),
  );

  for (const [i, result] of results.entries()) {
    const animation = state.project.animations[i];

    files.push({ name: `${result.name}.png`, data: await pngBytes(result.sheet) });
    files.push({
      name: `${result.name}.json`,
      data: encoder.encode(
        JSON.stringify(asepriteJson(result, settings, animation, `${result.name}.png`), null, 2),
      ),
    });
  }

  await saveFile(`${named(state)}-sprite-sheets.zip`, zipFiles(files));

  return warningsOf(results, state.project);
}

export async function saveFrames(state, settings) {
  const files = [];
  const results = state.project.animations.map((animation) =>
    buildSheet(state.project, animation, settings),
  );

  for (const result of results) {
    for (const file of frameFiles(result, settings)) {
      files.push({ name: file.path, data: await pngBytes(file.sprite) });
    }
  }

  await saveFile(`${named(state)}-frames.zip`, zipFiles(files));

  return warningsOf(results, state.project);
}

// one looping GIF per animation and direction, big enough to watch
export async function saveGifs(state, settings) {
  const scale = state.project.canvas.scale;
  const files = [];
  const results = state.project.animations.map((animation) =>
    buildSheet(state.project, animation, settings),
  );

  for (const [i, result] of results.entries()) {
    const delay = 1000 / state.project.animations[i].fps;

    for (const { direction, frames } of directionFrames(result, settings)) {
      files.push({
        name: `${viewFileName(result, direction, '-')}.gif`,
        data: encodeGif(
          frames.map((frame) => upscale(frame, scale)),
          delay,
        ),
      });
    }
  }

  await saveFile(`${named(state)}-animations-gif.zip`, zipFiles(files));

  return warningsOf(results, state.project);
}
