#!/usr/bin/env node
/* eslint-disable no-console */

import chalk from "chalk";

import { Command } from "commander";
import { build } from "./commands/build";
import { create } from "./commands/create";
import { dev } from "./commands/dev";
import { execute } from "./commands/execute";
import { normalizeImportSpecifiers } from "./commands/normalize";

const { version } = PACKAGE_JSON;
const program = new Command();

program
  .name(chalk.bold(chalk.blueBright("tsmodule")))
  .description(chalk.blueBright("A tool for building TypeScript modules."))
  .version(String(version));

program
  .command("run", { isDefault: true })
  .argument("<file>", "The file to run.")
  .option("--d, --dev", "Enable development mode")
  .description("Run the given TS program, analogous to `node <file>`.")
  .action(execute);

program
  .command("dev")
  .description("Build and watch for changes.")
  .action(dev);

program
  .command("build")
  .option("--files <files>", "The files to build (default: all)")
  .option("-d, --dev", "Build development version")
  .option("-f, --fast", "Do not emit type declarations, only transform to JS")
  .description(
    "Builds TS files to output in dist/."
  )
  .action(build);

program
  .command("create <name>")
  .description("Create a new project.")
  .action(create);

program
  .command("normalize [files]")
  .description(
    "Rewrites import specifiers in files to ESM-compliant paths.\n" +
    "(default: dist/**/*.js)"
  )
  .action(async ({ files }) => {
    await normalizeImportSpecifiers(files);
  });

program.parse(process.argv);