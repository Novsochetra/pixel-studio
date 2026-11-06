import { KINDS } from '../../model/kinds.js';
import { BUILT_IN_PRESETS, blankPreset } from '../../model/presets.js';
import { newGuide } from '../../views/guides.js';

// every way to start: a blank project of each kind, then the game presets, built in and saved
export function startChoices(savedPresets) {
  const kinds = Object.entries(KINDS).map(([id, kind]) => ({
    id: `kind-${id}`,
    icon: id === 'icon' ? 'star' : id,
    label: kind.label,
    about: kind.about,
    preset: blankPreset(id),
    saved: false,
  }));
  const presets = [...BUILT_IN_PRESETS, ...savedPresets].map((preset) => ({
    id: `preset-${preset.id}`,
    icon: preset.kind === 'icon' ? 'star' : preset.kind,
    label: preset.label,
    about: `${KINDS[preset.kind]?.label ?? 'Character'} for ${preset.game?.name ?? 'your game'}`,
    preset,
    saved: savedPresets.includes(preset),
  }));

  return { kinds, presets };
}

// the line a new project's art stands on, so every view and frame ends at the same row
export function startingGuides(preset, height) {
  if (preset.guides?.length) {
    return structuredClone(preset.guides);
  }

  const ground = KINDS[preset.kind]?.ground;

  if (!ground) {
    return [];
  }

  return [
    newGuide(preset.kind === 'object' ? 'Ground' : 'Feet', Math.round(height * ground), 'bottom'),
  ];
}
