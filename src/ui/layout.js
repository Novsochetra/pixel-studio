// a phone held either way, or a small tablet upright
const COMPACT_WINDOW = '(max-width: 860px), (max-height: 520px) and (max-width: 960px)';
const MEDIUM_WINDOW = '(max-width: 1320px)';
const listeners = new Set();

// How much room the window gives: 'compact' (a phone, a small tablet: the panels wait in the
// dock), 'medium' (the toolbar folds its rarer buttons into a menu) or 'wide'.
export function layoutSize() {
  if (matchMedia(COMPACT_WINDOW).matches) {
    return 'compact';
  }

  return matchMedia(MEDIUM_WINDOW).matches ? 'medium' : 'wide';
}

export function onLayoutChange(listener) {
  listeners.add(listener);
}

// the stylesheets read the size from the page's root, so they and the bars never disagree
export function watchLayout() {
  const apply = () => {
    document.documentElement.dataset.layout = layoutSize();
    listeners.forEach((listener) => listener(layoutSize()));
  };

  for (const query of [COMPACT_WINDOW, MEDIUM_WINDOW]) {
    matchMedia(query).addEventListener('change', apply);
  }

  apply();
}
