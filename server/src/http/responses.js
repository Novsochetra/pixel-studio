export const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

// Node drops the body of a HEAD response on its own, so callers can always pass one.
export function sendBody(response, { status, contentType, body, headers = {} }) {
  response.writeHead(status, {
    ...BASE_HEADERS,
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  response.end(body);
}

export function sendJson(response, { status = 200, json, headers }) {
  sendBody(response, {
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(json),
    headers,
  });
}

// what went wrong, said in a sentence the page can show as it is
export const sendError = (response, { status, message, headers }) =>
  sendJson(response, { status, json: { error: message }, headers });

export const sendNotFound = (response) =>
  sendError(response, { status: 404, message: 'Nothing is here.' });

export const sendMethodNotAllowed = (response, allow) =>
  sendError(response, {
    status: 405,
    message: 'That cannot be done here.',
    headers: { Allow: allow.join(', ') },
  });

export const sendServerError = (response) =>
  sendError(response, { status: 500, message: 'Something went wrong. Try again in a moment.' });
