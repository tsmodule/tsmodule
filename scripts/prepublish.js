import { createShell } from "universal-shell";
import { testProductionBundle } from "./testProductionBundle.js";

const shell = createShell();

/**
 * Build the productions bundle.
 */
await shell.run("pnpm build");

/**
 * Run production bundle tests.
 */
await testProductionBundle();