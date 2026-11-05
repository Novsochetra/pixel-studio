// Talks to the cleaning worker, whose bundled source the build puts in CLEAN_WORKER_SOURCE.

let worker = null;
let nextId = 0;
const waiting = new Map();

function startWorker() {
  if (worker) {
    return worker;
  }

  const url = URL.createObjectURL(new Blob([globalThis.CLEAN_WORKER_SOURCE], { type: 'text/javascript' }));
  worker = new Worker(url);
  worker.onmessage = (event) => {
    const { id, result, error } = event.data;
    const pending = waiting.get(id);
    waiting.delete(id);

    if (error) {
      pending?.reject(new Error(error));
    } else {
      pending?.resolve(result);
    }
  };

  return worker;
}

const plain = ({ width, height, data, pixels }) => ({ width, height, data: new Uint8Array(data ?? pixels) });

// image: decoded ChatGPT picture; reference: the front sprite. Resolves { width, height, pixels, report }.
export function cleanImage(image, reference, options = {}) {
  return new Promise((resolve, reject) => {
    nextId += 1;
    waiting.set(nextId, { resolve, reject });
    startWorker().postMessage({ id: nextId, image: plain(image), reference: plain(reference), options });
  });
}
