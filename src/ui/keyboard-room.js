// keys cover a third of a phone's screen or more; a browser's own bars coming and going, far less
const KEYS_FROM_PX = 120;

// How much of the window's foot is out of sight: the on-screen keyboard's height, while it is
// up. `viewport` is the browser's visualViewport, the part of the page that can be seen.
export function coveredAtFoot(viewport, windowHeight) {
  const covered = Math.round(windowHeight - viewport.height - viewport.offsetTop);

  return covered >= KEYS_FROM_PX ? covered : 0;
}

// The on-screen keyboard lies over the foot of a phone's screen, and tells the page nothing but
// the part of it still in sight. What it covers is kept as --keyboard on the page's root, so a
// window at the screen's foot stands above the keys with its buttons (70-responsive.css): under
// them, a name was typed into a field no one could see. As the keys go the page is put back
// where it stood, as Safari leaves it scrolled up from under them.
export function watchKeyboard() {
  const viewport = window.visualViewport;
  const root = document.documentElement;
  let up = 0;

  const tell = () => {
    const covered = coveredAtFoot(viewport, window.innerHeight);

    if (up && !covered) {
      window.scrollTo(0, 0);
    }

    up = covered;
    root.style.setProperty('--keyboard', `${covered}px`);
    root.dataset.keys = covered ? 'up' : '';

    // the window is shorter now: the field being typed in stays in sight inside it
    if (covered) {
      document.activeElement?.scrollIntoView?.({ block: 'nearest' });
    }
  };

  viewport?.addEventListener('resize', tell);
  viewport?.addEventListener('scroll', tell);
}
