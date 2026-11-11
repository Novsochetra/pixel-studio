// what a phone opens as a sheet
export const PANELS = [
  { id: 'tools', label: 'Tools', iconName: 'pencil' },
  { id: 'frames', label: 'Frames', iconName: 'frames' },
  { id: 'colours', label: 'Colours' },
  { id: 'brush', label: 'Brush', iconName: 'brush' },
  { id: 'layers', label: 'Layers', iconName: 'layers' },
  { id: 'outline', label: 'Outline', iconName: 'outline' },
  { id: 'guides', label: 'Guides', iconName: 'guides' },
];

// the panel that is open, on a phone
export function openPanel(state) {
  const open = state.layout === 'compact' && PANELS.some((panel) => panel.id === state.panel);

  return open ? state.panel : null;
}
