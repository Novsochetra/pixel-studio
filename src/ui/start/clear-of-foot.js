const AIR_PX = 12;

// Create stays at the form's foot, over what scrolls under it. Safari brings a field the keys
// move to only just into view, under that bar (the stylesheet's scroll-padding is not read for
// it there): a name was typed half out of sight. The field is scrolled clear of the bar.
export function clearOfFoot(form) {
  form.addEventListener('focusin', ({ target }) => {
    const foot = form.querySelector('.sheet-actions');
    const scroller = form.closest('.start-screen, .sheet');

    if (!foot || !scroller || foot.contains(target)) {
      return;
    }

    const under = target.getBoundingClientRect().bottom + AIR_PX - foot.getBoundingClientRect().top;

    if (under > 0) {
      scroller.scrollTop += under;
    }
  });
}
