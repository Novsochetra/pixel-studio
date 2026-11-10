// what a swap did, said once it is done: a swap that found none of its colours says that
export function swapSaid({ changed, flattened, everywhere }) {
  if (!changed) {
    return 'No colour changed: none of the colours to swap is in the art.';
  }

  return everywhere
    ? 'Colours swapped across the whole character'
    : `Colours swapped in this frame${flattened ? ', its Body now plain pixels' : ''}`;
}
