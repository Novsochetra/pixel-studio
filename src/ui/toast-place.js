const GAP_PX = 8;

// Over a window a message stands just above the window's buttons, however many rows they take:
// at a set height from the screen's foot it lay over them, and over the row above them when
// they wrapped to two on a phone.
export function aboveButtons(message) {
  const rows = document.querySelectorAll?.('.sheet .sheet-actions') ?? [];
  const actions = [...rows].filter((row) => row.offsetParent).at(-1);

  if (actions) {
    message.style.top = 'auto';
    message.style.bottom = `${window.innerHeight - actions.getBoundingClientRect().top + GAP_PX}px`;
  }
}
