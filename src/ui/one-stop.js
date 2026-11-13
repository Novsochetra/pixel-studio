const STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

function moveIn(buttons, event) {
  const at = buttons.indexOf(event.target);
  const jumps = { Home: 0, End: buttons.length - 1 };
  const next =
    event.key in jumps
      ? jumps[event.key]
      : (at + STEPS[event.key] + buttons.length) % buttons.length;

  event.preventDefault();
  buttons[next].focus();
}

// A row of choices is one stop of the keys, as radio buttons are: its choice in hand takes Tab,
// and the arrows walk the others. Every swatch a stop, a swap's rows took 150 Tabs to cross.
export function oneStop(group) {
  const buttons = [...group.querySelectorAll('button')];
  const stop =
    buttons.find((button) => button.getAttribute('aria-pressed') === 'true') ?? buttons[0];

  buttons.forEach((button) => (button.tabIndex = button === stop ? 0 : -1));
  group.addEventListener('keydown', (event) => {
    if (event.key in STEPS || event.key === 'Home' || event.key === 'End') {
      moveIn(buttons, event);
    }
  });

  return group;
}
