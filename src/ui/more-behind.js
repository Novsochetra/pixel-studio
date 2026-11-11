// whether more of a row waits past its right edge, and before its left one
export function markMore(row) {
  row.dataset.more = String(row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
  row.dataset.before = String(row.scrollLeft > 1);
}

function alongWith(row) {
  return (event) => {
    const turnsOnly = !event.deltaX && !event.ctrlKey && !event.metaKey;

    if (turnsOnly && row.scrollWidth > row.clientWidth) {
      row.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  };
}

// A row that scrolls sideways is marked while more waits past its edge. A mouse's wheel only
// turns up and down, so over the row it moves along it: without that the far end of a bar was
// out of a mouse's reach.
export function watchMore(row) {
  row.onscroll = () => markMore(row);
  row.onwheel = alongWith(row);
  markMore(row);
}

// a list that scrolls down is marked while more of it waits below, for the strip at its foot
export function watchBelow(list) {
  const mark = () => {
    list.dataset.below = String(list.scrollTop + list.clientHeight < list.scrollHeight - 1);
  };

  list.onscroll = mark;
  mark();
}
