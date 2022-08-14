import { createShell } from "await-shell";
import { testProductionBundle } from "./testProductionBundle.js";

const shell = createShell();

/**
 * Build the productions bundle.
 */
await shell.run("yarn build -b");

/**
 * Ship template files in dist/.
 */
await shell.run("cp -rf templates/ dist/templates/");

/**
 * Run production bundle tests.
 */
await testProductionBundle();