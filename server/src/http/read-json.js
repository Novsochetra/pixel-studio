// A save's documents together, its layers' pictures among them: a 512 by 512 layer is well under
// a megabyte as a PNG, and a save of many layers at once stays under this.
export const MAX_BODY_BYTES = 32 * 1024 * 1024;

const JSON_TYPE = /^application\/json\s*(;|$)/i;

const refusal = (status, message) => ({ ok: false, status, message });

// Node's parser stops a body at its Content-Length, so a declared length that fits caps what is
// read. A chunked body has none, and the studio's page always sends one.
function headersProblem(headers, maxBytes) {
  if (!JSON_TYPE.test(headers['content-type'] ?? '')) {
    return refusal(415, 'Send it as JSON.');
  }

  if (headers['content-length'] === undefined) {
    return refusal(411, 'Send a Content-Length.');
  }

  return Number(headers['content-length']) > maxBytes ? refusal(413, 'That is too much.') : null;
}

async function readText(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

export async function readJson(request, maxBytes = MAX_BODY_BYTES) {
  const problem = headersProblem(request.headers, maxBytes);

  if (problem) {
    return problem;
  }

  try {
    return { ok: true, value: JSON.parse(await readText(request)) };
  } catch {
    return refusal(400, 'That is not valid JSON.');
  }
}
