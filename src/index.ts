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
  .name(chalk.white(chalk.bold("tsmodule")))
  .usage(chalk.white(chalk.bold("<file | command> [options]")))
  .description(chalk.blueBright(
    "A tool for building TypeScript modules.\n\n" +
    `Run TS directly: ${chalk.bold("tsmodule src/index.ts")} \n` +
    `Use a command: ${chalk.bold("tsmodule build")}`
  ))
  .version(String(version));

program
  .command("dev")
  .description("Build and watch for changes.")
  .action(dev);

program
  .command("build")
  .option("--files <files>", "Files to build", "src/**/*")
  .option("--styles <styles>", "The styles to build", "src/styles/components/index.css")
  .option("-d, --dev", "Build development runtime")
  .option("-r, --runtime-only", "Do not emit type declarations, only build JS runtime")
  .description(
    "Builds TS files to output in dist/."
  )
  .action(build);

program
  .command("create <name>")
  .option("--react", "Create React component library with Next.js")
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

program
  .command("run", { isDefault: true })
  .argument("<file>", "The file to run.")
  .option("--d, --dev", "Enable development mode")
  .description("Run the given TS program, analogous to `node <file>`.")
  .action(execute);

program.parse(process.argv);