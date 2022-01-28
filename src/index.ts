#!/usr/bin/env tsm
/* eslint-disable no-console */

import { Command } from "commander";
import { build } from "./commands/build.js";
import { execute } from "./commands/execute.js";
import { normalizeImportSpecifiers } from "./commands/normalize.js";

const program = new Command();

program
  .command("execute <file>", { isDefault: true })
  .description("Run the given TS program, analogous to `node <file>`.")
  .action(execute);

program
  .command("build")
  .option("-d, --dev", "Build development version (default: production)")
  .description(
    "Builds TS files to output in dist/. (default: src/**/*.{ts,tsx})"
  )
  .action(async ({ dev }) => await build(!dev));

program
  .command("normalize [files]")
  .description(
    "Rewrites import specifiers in files to ESM-compliant paths.\n" +
    "(default: dist/**/*.js)"
  )
  .action(async ({ files }) => {
    await normalizeImportSpecifiers(files);
  });

program
  .command("version")
  .description("Print the current version.")
  .action(() => {
    if (typeof PACKAGE_JSON === "undefined") {
      console.log("Cannot read version in development mode.");
    } else {
      console.log(`v${PACKAGE_JSON.version}`);
    }
  });

program.parse(process.argv);