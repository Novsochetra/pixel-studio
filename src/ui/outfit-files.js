import { toast } from './dom.js';
import { changeStructure, directionSprite, directionsInUse } from './actions.js';
import { applyMapping } from '../palette/palette.js';
import { directionLabel, newId } from '../model/project.js';
import { spritePng } from '../io/images.js';
import { zipFiles } from '../io/zip.js';
import { saveFile } from './save-file.js';
import { fileSlug } from './file-name.js';

export const slug = (text) => fileSlug(text, 'outfit');

export async function downloadOutfit(state, mapping, name) {
  const files = [];

  for (const direction of directionsInUse(state)) {
    const sprite = applyMapping(directionSprite(state, direction), mapping);

    for (const scale of state.project.canvas.scale > 1 ? [1, state.project.canvas.scale] : [1]) {
      files.push({
        name: `${slug(name)}-${slug(directionLabel(direction))}-${sprite.width * scale}.png`,
        data: new Uint8Array(await (await spritePng(sprite, scale)).arrayBuffer()),
      });
    }
  }

  await saveFile(`${fileSlug(state.project.name, 'project')}-${slug(name)}.zip`, zipFiles(files));
}

// the outfit as a palette and mapping, to use later from Swap colours
export function keepAsSwap(app, mapping, name) {
  const { project } = app.store.state;
  const palette = { id: newId('p'), name, colors: [...new Set(Object.values(mapping))] };

  project.palettes.push(palette);
  project.mappings[palette.id] = { ...mapping };
  changeStructure(app, 'palettes');
  toast(`Kept as the "${name}" colour swap`);
}
