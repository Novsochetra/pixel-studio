import { node } from './dom.js';
import { panelGrab, pullsShut } from './panel-sheet.js';
import { keepSetting, readSetting } from './remembered.js';
import { keepFocus } from './keep-focus.js';
import { renderColourPanel, renderDrawingPanel } from './colour-panel.js';
import { renderGuidesPanel } from './guides-panel.js';
import { renderLayersPanel } from './layers-panel.js';
import { renderOutlinePanel } from './outline-panel.js';
import { renderToolsPanel } from './tools-panel.js';

const FOLDED = 'pixel-clean-folded';
// what is used on every visit stays open; the rest waits one click away
const FOLDED_AT_FIRST = ['outline', 'guides'];

// on a phone the dock opens and shuts a panel: its title folds nothing
const foldsFromTitle = () => document.documentElement.dataset.layout !== 'compact';

// The fold plays out, the section's height led from where it was to where it will be: shut at
// once, its rows vanished and the sections under it jumped up.
function playFold(section, change) {
  const from = section.offsetHeight;

  change();

  const to = section.offsetHeight;
  const done = (event) => {
    if (!event || (event.target === section && event.propertyName === 'height')) {
      section.removeEventListener('transitionend', done);
      section.classList.remove('folding');
      section.style.height = '';
    }
  };

  section.classList.add('folding');
  section.style.height = `${from}px`;

  // nothing moves for someone who asked for less motion, and then no transition ends
  if (from === to || parseFloat(getComputedStyle(section).transitionDuration) === 0) {
    done();

    return;
  }

  section.addEventListener('transitionend', done);
  // read between the two heights, or the browser sees only the last
  void section.offsetHeight;
  section.style.height = `${to}px`;
}

function folding(folded, redraw) {
  return (title) => {
    if (!foldsFromTitle()) {
      return;
    }

    const section = title.parentElement;
    const collapsed = section.dataset.collapsed !== 'true';

    playFold(section, () => {
      section.dataset.collapsed = String(collapsed);
      // a section may draw its rows only while it is open (outline-panel.js)
      redraw(section.dataset.name);
    });
    collapsed ? folded.add(section.dataset.name) : folded.delete(section.dataset.name);
    keepSetting(FOLDED, [...folded]);
  };
}

function bindCollapsing(inspector, sections, redraw) {
  const folded = new Set(readSetting(FOLDED, FOLDED_AT_FIRST));
  const toggle = folding(folded, redraw);

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
    tools: node('section.section'),
    colours: node('section.section'),
    drawing: node('section.section'),
    layers: node('section.section'),
    outline: node('section.section'),
    guides: node('section.section'),
  };

  inspector.replaceChildren(panelGrab(app), ...Object.values(sections));
  pullsShut(inspector, app);

  const panels = {
    tools: renderToolsPanel,
    colours: renderColourPanel,
    drawing: renderDrawingPanel,
    layers: renderLayersPanel,
    outline: renderOutlinePanel,
    guides: renderGuidesPanel,
  };
  // each panel draws its own title: here it is told that it folds, and whether it is open
  const drawn = (name) => () => {
    panels[name](sections[name], app);

    const title = sections[name].querySelector(':scope > h2');

    // only where a title folds its section is it said to be a button: on a phone, where the dock
    // opens a panel, a screen reader named a button that did nothing
    if (title && foldsFromTitle()) {
      title.setAttribute('role', 'button');
      title.setAttribute('aria-expanded', String(sections[name].dataset.collapsed !== 'true'));
    }
  };

  bindCollapsing(inspector, sections, (name) => keepFocus(inspector, drawn(name)));

  return Object.fromEntries(Object.keys(panels).map((name) => [name, drawn(name)]));
}
