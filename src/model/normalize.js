import { newId } from './project.js';
import { legacyGame, validDirectionSet } from './presets.js';

function normalizeLayers(project) {
  for (const animation of project.animations) {
    animation.fps ??= 8;

    for (const entry of Object.values(animation.directions)) {
      entry.frames.forEach((frame) => {
        frame.layers.forEach((layer, i) => {
          layer.key ??= `layer${i}`;
          layer.kind ??= 'art';
          layer.visible ??= true;
          layer.opacity ??= 1;
        });
      });
    }
  }
}

// kit parts were once fixed to a football kit ({ shirt: [colours], … }): now any named parts
function normalizeParts(project) {
  if (!project.parts) {
    const old = project.kitParts ?? {};
    const names = project.game.teamKits ? ['Shirt', 'Shorts', 'Socks', 'Trim'] : [];

    project.parts = names.map((name) => ({
      id: name.toLowerCase(),
      name,
      colours: old[name.toLowerCase()] ?? [],
    }));
  }

  delete project.kitParts;
  project.outfits ??= [];
}

// Projects saved by earlier versions keep what they are and gain any fields added since. Those
// from before kinds were characters, and those from before presets were made for Naga Eleven.
export function normalizeProject(project) {
  project.id ??= newId('p');
  project.kind ??= 'character';
  project.game ??= legacyGame(project.profile);
  delete project.profile;
  project.directionSet = validDirectionSet(project.directionSet ?? 'naga', project.kind);
  normalizeLayers(project);
  normalizeParts(project);
  normalizeSettings(project);

  return project;
}

function normalizeSettings(project) {
  project.palettes ??= [];
  project.mappings = Array.isArray(project.mappings) || !project.mappings ? {} : project.mappings;
  project.guides ??= [];
  project.exportSettings ??= null;
  project.preview ??= null;
}
