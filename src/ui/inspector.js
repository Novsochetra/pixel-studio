import { node } from './dom.js';
import { keepSetting, readSetting } from './remembered.js';
import { renderColourPanel, renderDrawingPanel } from './colour-panel.js';
import { renderGuidesPanel } from './guides-panel.js';
import { renderLayersPanel } from './layers-panel.js';
import { renderOutlinePanel } from './outline-panel.js';

const FOLDED = 'pixel-clean-folded';
// what is used on every visit stays open; the rest waits one click away
const FOLDED_AT_FIRST = ['outline', 'guides'];

function folding(folded) {
  return (title) => {
    const section = title.parentElement;
    const collapsed = section.dataset.collapsed !== 'true';

    section.dataset.collapsed = String(collapsed);
    collapsed ? folded.add(section.dataset.name) : folded.delete(section.dataset.name);
    keepSetting(FOLDED, [...folded]);
  };
}

function bindCollapsing(inspector, sections) {
  const folded = new Set(readSetting(FOLDED, FOLDED_AT_FIRST));
  const toggle = folding(folded);

  for (const [name, section] of Object.entries(sections)) {
    section.dataset.name = name;
    section.dataset.collapsed = String(folded.has(name));
  }

  inspector.addEventListener('click', (event) => {
    const title = event.target.closest('.section > h2');

    if (title && !event.target.closest('input, button, label, select')) {
      toggle(title);
    }
  });
  inspector.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.section > h2')) {
      event.preventDefault();
      toggle(event.target);
    }
  });
}

export function mountInspector(app) {
  const inspector = document.getElementById('inspector');
  const sections = {
    colours: node('section.section'),
    drawing: node('section.section'),
    layers: node('section.section'),
    outline: node('section.section'),
    guides: node('section.section'),
  };

  inspector.replaceChildren(...Object.values(sections));
  bindCollapsing(inspector, sections);

  return {
    colours: () => renderColourPanel(sections.colours, app),
    drawing: () => renderDrawingPanel(sections.drawing, app),
    layers: () => renderLayersPanel(sections.layers, app),
    outline: () => renderOutlinePanel(sections.outline, app),
    guides: () => renderGuidesPanel(sections.guides, app),
  };
}
