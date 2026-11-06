import { KINDS } from './kinds.js';
import { BUILT_IN_PRESETS, blankPreset } from './presets.js';

// icons are named after kinds, but an icon's own picture is a star
const iconFor = (kind) => (kind === 'icon' ? 'star' : kind);

// every way to start: a blank project of each kind, then the game presets, built in and saved
export function startChoices(savedPresets) {
  const kinds = Object.entries(KINDS).map(([id, kind]) => ({
    id: `kind-${id}`,
    icon: iconFor(id),
    label: kind.label,
    about: kind.about,
    preset: blankPreset(id),
    saved: false,
  }));
  const presets = [...BUILT_IN_PRESETS, ...savedPresets].map((preset) => ({
    id: `preset-${preset.id}`,
    icon: iconFor(preset.kind),
    label: preset.label,
    about: `${KINDS[preset.kind]?.label ?? 'Character'} for ${preset.game?.name ?? 'your game'}`,
    preset,
    saved: savedPresets.includes(preset),
  }));

  return { kinds, presets };
}
