import { createShell } from "universal-shell";
import { testProductionBundle } from "./testProductionBundle.js";

const shell = createShell();

/**
 * Build the productions bundle.
 */
await shell.run("yarn build -b");

/**
 * Run production bundle tests.
 */
await testProductionBundle();