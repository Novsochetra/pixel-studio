// what a phone opens as a sheet, and the workspaces each belongs to: frames and the brush are for
// drawing
const PANELS = [
  { id: 'tools', label: 'Tools', iconName: 'pencil', modes: ['edit'] },
  { id: 'frames', label: 'Frames', iconName: 'frames', modes: ['edit'] },
  { id: 'colours', label: 'Colours', modes: ['edit', 'board'] },
  { id: 'brush', label: 'Brush', iconName: 'brush', modes: ['edit'] },
  { id: 'layers', label: 'Layers', iconName: 'layers', modes: ['edit', 'board'] },
  { id: 'outline', label: 'Outline', iconName: 'outline', modes: ['edit', 'board'] },
  { id: 'guides', label: 'Guides', iconName: 'guides', modes: ['edit', 'board'] },
];

export const panelsFor = (mode) => PANELS.filter((panel) => panel.modes.includes(mode));

// the panel that is open, if this workspace has it
export function openPanel(state) {
  const open =
    state.layout === 'compact' && panelsFor(state.mode).some((panel) => panel.id === state.panel);

  return open ? state.panel : null;
}
