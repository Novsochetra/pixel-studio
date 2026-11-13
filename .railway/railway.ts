import { defineRailway, github, project, service } from 'railway/iac';

// Railway never reads this file during a deploy: `railway config apply` sends it, so run that after
// changing it (docs/deploy-railway.md).
export const partial = 'pixel-studio';

export default defineRailway(() => {
  const studio = service('pixel-studio', {
    source: github('Novsochetra/pixel-studio', { branch: 'main', checkSuites: false }),
    // the page is built by Python as well as Node, which the Dockerfile has and Railpack does not
    build: { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile', watchPatterns: null },
    preDeploy: 'node server/src/db/migrate-cli.js',
    start: 'node server/src/main.js',
    healthcheck: '/api/health',
    healthcheckTimeout: 120,
    // one copy: the sign-in rate limit lives in the server's memory
    replicas: { 'asia-southeast1-eqsg3a': 1 },
    deploy: { drainingSeconds: 15 },
  });

  return project('Pixel Studio', {
    // The dashboard keeps the variables, the database password and the AWS keys among them.
    // @ts-expect-error -- variables is missing from ProjectDefinition in the railway SDK
    variables: { managed: false },
    resources: [studio],
  });
});
