import { sendError, sendJson } from './http/responses.js';
import { route } from './router.js';

// Railway sends a deploy traffic once this answers: it reads the tables, so a database that is
// down or was never migrated keeps the visitors on the server before.
export const healthRoutes = ({ database }) => [
  route('/api/health', {
    GET: async (_request, response) => {
      try {
        await database.query('SELECT 1 FROM users LIMIT 1');
        await database.query('SELECT 1 FROM documents LIMIT 1');
        sendJson(response, { json: { ok: true } });
      } catch {
        sendError(response, { status: 503, message: 'The database cannot be reached.' });
      }
    },
  }),
];
