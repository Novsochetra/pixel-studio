// h('button.btn.primary', { onclick }, 'Save') builds an element; children may be strings,
// nodes, arrays or null.
export function node(selector, props = {}, ...children) {
  const [tag, ...classes] = selector.split('.');
  const el = document.createElement(tag || 'div');

  if (classes.length) {
    el.className = classes.join(' ');
  }

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || value === false) {
      continue;
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

  append(el, children);

  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) {
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
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  wand: 'M4 20L15 9M14 4v3M19 9h-3M17.5 5.5l-2 2M9 4l.5 1.5M20 14l-1.5-.5',
  shade: 'M12 3a9 9 0 100 18V3zM12 3a9 9 0 010 18',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  'eye-off':
    'M3 3l18 18M10.6 5.1A9.6 9.6 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.1M6.2 6.2C3.6 8 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 004.2 4.2',
  history: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 7v5l3 3',
  outline: 'M7 3h10l4 4v10l-4 4H7l-4-4V7l4-4z',
  select: 'M4 4h3M10 4h4M17 4h3v3M20 10v4M20 17v3h-3M14 20h-4M7 20H4v-3M4 14v-4M4 7V4',
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
