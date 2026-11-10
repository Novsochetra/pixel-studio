// node('button.btn.primary', { onclick }, 'Save') builds an element; children may be strings,
// nodes, arrays or null.
export function node(selector, props = {}, ...children) {
  const [tag, ...classes] = selector.split('.');
  const el = document.createElement(tag || 'div');

  if (classes.length) {
    el.className = classes.join(' ');
  }

  for (const [key, value] of Object.entries(props ?? {})) {
    setProp(el, key, value);
  }

  append(el, children);

  return el;
}

const isUnset = (value) => value === undefined || value === null || value === false;

function setProp(el, key, value) {
  if (isUnset(value)) {
    return;
  }

  if (key.startsWith('on')) {
    el.addEventListener(key.slice(2), value);
  } else if (key === 'style' && typeof value === 'object') {
    Object.assign(el.style, value);
  } else if (key in el && !key.includes('-') && key !== 'list') {
    el[key] = value;
  } else {
    el.setAttribute(key, value === true ? '' : value);
  }
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (isUnset(child)) {
      continue;
    }

    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function replace(el, ...children) {
  el.replaceChildren();
  append(el, children);
}

const PATHS = {
  pencil: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3',
  eraser: 'M8 20h12M5 15l8-8 6 6-5 5H9l-4-3z',
  picker: 'M14 4l6 6-3 1-7 7H7v-3l7-7 0-4zM4 20l3-3',
  fill: 'M5 12l7-7 7 7-7 7-7-7zM19 15c0 0 2 2.5 2 4a2 2 0 01-4 0c0-1.5 2-4 2-4z',
  replace: 'M4 7h12l-3-3M20 17H8l3 3M7 4v0',
  flip: 'M12 3v18M9 6L4 18h5V6zM15 6l5 12h-5V6z',
  mirror: 'M12 3v18M7 8l-3 4 3 4M17 8l3 4-3 4',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-4',
  redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 000 10h4',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  grid: 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  character: 'M12 3a3 3 0 100 6 3 3 0 000-6zM8 21v-6l-2-3 3-2h6l3 2-2 3v6M10 21v-4M14 21v-4',
  object: 'M4 9l8-5 8 5v9l-8 4-8-4V9zM4 9l8 4 8-4M12 13v9',
  tile: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  effect: 'M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z',
  play: 'M7 4l13 8-13 8V4z',
  pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  onion: 'M9 6a6 6 0 100 12 6 6 0 000-12zM15 6a6 6 0 110 12',
  pin: 'M12 21s-6-5.6-6-11a6 6 0 0112 0c0 5.4-6 11-6 11zM12 8a2 2 0 100 4 2 2 0 000-4z',
  moveframe:
    'M12 3v18M3 12h18M12 3L9 6M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  movelayer:
    'M8 8h8v8H8zM12 2v3M12 2l-2 2M12 2l2 2M12 22v-3M12 22l-2-2M12 22l2-2M2 12h3M2 12l2-2M2 12l2 2M22 12h-3M22 12l-2-2M22 12l-2 2',
  duplicate: 'M9 9h11v11H9zM5 15V4h11',
  'merge-down': 'M6 4h12M12 4v12M8 12l4 4 4-4M5 20h14',
  picture: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 8.5h.01',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M6 15l6-6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  wand: 'M4 20L15 9M14 4v3M19 9h-3M17.5 5.5l-2 2M9 4l.5 1.5M20 14l-1.5-.5',
  shade: 'M12 3a9 9 0 100 18V3zM12 3a9 9 0 010 18',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  'eye-off':
    'M3 3l18 18M10.6 5.1A9.6 9.6 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.1M6.2 6.2C3.6 8 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 004.2 4.2',
  history: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 7v5l3 3',
  folder: 'M3 6h6l2 2h10v11H3V6z',
  search: 'M10.5 4a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM20 20l-4.8-4.8',
  outline: 'M7 3h10l4 4v10l-4 4H7l-4-4V7l4-4z',
  select: 'M4 4h3M10 4h4M17 4h3v3M20 10v4M20 17v3h-3M14 20h-4M7 20H4v-3M4 14v-4M4 7V4',
  lasso:
    'M12 4c4.4 0 8 2.2 8 5s-3.6 5-8 5-8-2.2-8-5 3.6-5 8-5zM7.5 13.2c-.8 1.4-.6 2.8.4 3.6s1.6 2.2.6 4.2',
  pose: 'M12 3a2 2 0 100 4 2 2 0 000-4zM12 8v6M12 10l-5 2M12 10l4-4M12 14l-3 7M12 14l4 6M16 6h.01',
  frames: 'M3 6h18v12H3zM8.5 6v12M15.5 6v12',
  brush:
    'M18 3l3 3-9.5 9.5-3-3L18 3zM7.5 13.5a3.2 3.2 0 013 3c0 2.6-2.2 4-6.5 4 1-1 1-2.2 1-3.6a3 3 0 012.5-3.4z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5',
  guides: 'M3 8h3M9 8h3M15 8h3M21 8h.01M3 16h3M9 16h3M15 16h3M21 16h.01',
  line: 'M5 19L19 5',
  rect: 'M4 6h16v12H4z',
  ellipse: 'M12 5c4.4 0 8 3.1 8 7s-3.6 7-8 7-8-3.1-8-7 3.6-7 8-7z',
  cut: 'M6 3a3 3 0 100 6 3 3 0 000-6zM6 15a3 3 0 100 6 3 3 0 000-6zM8.5 7.5L20 19M8.5 16.5L20 5',
};

export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', PATHS[name] ?? '');
  svg.append(path);

  return svg;
}

let toastTimer = null;

export function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = node('div.toast', { role: 'status' }, message);
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3200);
}
