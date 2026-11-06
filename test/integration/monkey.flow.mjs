// Every button on a desktop screen, for each kind of project, without a page error.
import { openStudio } from './harness.mjs';
import { monkey } from './monkey.mjs';

const studio = await openStudio();
await monkey(studio);
await studio.finish();
