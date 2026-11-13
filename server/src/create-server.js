import http from 'node:http';
import { accountRoutes } from './accounts/accounts-api.js';
import { createAccountsStore } from './accounts/accounts-store.js';
import { mcpKeyRoutes } from './accounts/mcp-key-api.js';
import { createMcpKeysStore } from './accounts/mcp-keys-store.js';
import { docsRoutes } from './docs/docs-api.js';
import { createDocsStore } from './docs/docs-store.js';
import { healthRoutes } from './health.js';
import { mcpRoutes } from './mcp/mcp-api.js';
import { sendError, sendMethodNotAllowed, sendServerError } from './http/responses.js';
import { chooseRoute } from './router.js';
import { createRateLimiter } from './security/rate-limit.js';
import { isFromOtherSite } from './security/request-origin.js';
import { createStaticFiles } from './static-files.js';

// ten tries a minute at signing in or up, from one address or for one email
const signInLimiter = () => createRateLimiter({ limit: 10, windowMs: 60000 });

function apiRoutes({ database, files, trustProxy, secureCookies, limiter, logError }) {
  const accounts = createAccountsStore(database);
  const docs = createDocsStore(database, files);
  const keys = createMcpKeysStore(database);

  return [
    ...healthRoutes({ database }),
    ...accountRoutes({ accounts, limiter, trustProxy, secure: secureCookies }),
    ...mcpKeyRoutes({ accounts, keys }),
    ...docsRoutes({ accounts, docs }),
    ...mcpRoutes({ keys, docs, logError }),
  ];
}

// The API sends no CORS headers, so another site's page can neither read its answers nor get a
// preflight past it; refusing other sites here also stops what a browser sends without asking.
async function dispatch({ request, response, routes, serveStatic }) {
  const { pathname } = new URL(request.url, 'http://studio');
  const chosen = chooseRoute(routes, { method: request.method, pathname });

  if (chosen.type === 'method-not-allowed') {
    return sendMethodNotAllowed(response, chosen.allow);
  }

  if (chosen.type === 'handler') {
    return isFromOtherSite(request.headers)
      ? sendError(response, { status: 403, message: 'Only the studio itself may call this.' })
      : chosen.handle(request, response, chosen.params);
  }

  return serveStatic(request, response, pathname);
}

// options: { database, files, distRoot, trustProxy, secureCookies, limiter, logError }
export function createStudioServer({ distRoot, logError = console.error, ...options }) {
  const routes = apiRoutes({ limiter: signInLimiter(), logError, ...options });
  const serveStatic = createStaticFiles(distRoot);

  return http.createServer((request, response) => {
    dispatch({ request, response, routes, serveStatic }).catch((error) => {
      logError(error);

      if (response.headersSent) {
        response.destroy();
      } else {
        sendServerError(response);
      }
    });
  });
}
