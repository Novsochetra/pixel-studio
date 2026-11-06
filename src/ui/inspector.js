import { node } from './dom.js';
import { renderColourPanel } from './colour-panel.js';
import { renderGuidesPanel } from './guides-panel.js';
import { renderLayersPanel } from './layers-panel.js';
import { renderOutlinePanel } from './outline-panel.js';

const FOLDED = 'pixel-clean-folded';

function readFolded() {
  try {
    return JSON.parse(localStorage.getItem(FOLDED) ?? '[]');
  } catch {
    return [];
  }
}

// a click on a section's title folds it away; which are folded is remembered in this browser
function bindCollapsing(inspector, sections) {
  const folded = new Set(readFolded());

  for (const [name, section] of Object.entries(sections)) {
    section.dataset.name = name;
    section.dataset.collapsed = String(folded.has(name));
  }

  inspector.addEventListener('click', (event) => {
    const title = event.target.closest('.section > h2');

    if (!title || event.target.closest('input, button, label, select')) {
      return;
    }

    const section = title.parentElement;
    const now = section.dataset.collapsed !== 'true';
    section.dataset.collapsed = String(now);
    now ? folded.add(section.dataset.name) : folded.delete(section.dataset.name);

    try {
      localStorage.setItem(FOLDED, JSON.stringify([...folded]));
    } catch {
      // nothing to remember it in: it stays folded for this visit
    }
  });
}

// The panels on the right, each folding away on a click on its title. Returns a drawer for each.
export function mountInspector(app) {
  const inspector = document.getElementById('inspector');
  const sections = {
    layers: node('section.section'),
    colours: node('section.section'),
    outline: node('section.section'),
    guides: node('section.section'),
  };
  inspector.replaceChildren(...Object.values(sections));
  bindCollapsing(inspector, sections);

  return {
    layers: () => renderLayersPanel(sections.layers, app),
    colours: () => renderColourPanel(sections.colours, app),
    outline: () => renderOutlinePanel(sections.outline, app),
    guides: () => renderGuidesPanel(sections.guides, app),
  };
}
