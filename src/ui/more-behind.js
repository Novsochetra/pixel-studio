// whether more of a row waits past its right edge
export function markMore(row) {
  row.dataset.more = String(row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
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
