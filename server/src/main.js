import { readServerConfig, withRailwayDefaults } from './config.js';
import { createStudioServer } from './create-server.js';
import { openDatabase } from './db/open-database.js';
import { openFiles } from './files/open-files.js';
import { DIST_ROOT } from './paths.js';

const env = withRailwayDefaults(process.env);
const config = readServerConfig(env);
const { database, description } = await openDatabase(config);
const { files, description: filesDescription } = openFiles(env);
const server = createStudioServer({ ...config, database, files, distRoot: DIST_ROOT });

server.listen(config.port, config.host, () => {
  console.log(`Pixel Studio running at http://localhost:${server.address().port}/`);
  console.log(description);
  console.log(filesDescription);
});

// Railway sends SIGTERM before it stops an old deploy: finish the requests under way, then let the
// database go.
function shutDown() {
  server.close(() => database.close());
  server.endStreams();
  server.closeIdleConnections();
}

process.once('SIGTERM', shutDown);
process.once('SIGINT', shutDown);
