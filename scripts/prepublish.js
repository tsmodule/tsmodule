import { createShell } from "await-shell";
import { testProductionBundle } from "./testProductionBundle.js";

const shell = createShell();

/**
 * Build the runtime bundle.
 */
await shell.run("yarn build -rb");

/**
 * Copy template files.
 */
await shell.run("cp -rf templates/ dist/templates/");

await testProductionBundle();