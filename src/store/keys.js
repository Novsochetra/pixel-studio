// Where one project's documents live. The first project (saved before there were several) keeps
// the plain names; every later one has its own prefix.
export function keysFor(prefix = '') {
  return {
    prefix,
    project: `${prefix}project`,
    layer: (id) => `${prefix}layer-${id}`,
    versions: `${prefix}versions`,
    versionChunk: (id, n) => `${prefix}version-${id}-${n}`,
    background: `${prefix}background`,
  };
}

export const prefixFor = (projectId) => `p-${projectId}-`;
