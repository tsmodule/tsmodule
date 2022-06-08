#!/usr/bin/env node
/* eslint-disable no-console */

import chalk from "chalk";

import { Command } from "commander";
import { build } from "./commands/build";
import { create } from "./commands/create";
import { dev } from "./commands/dev";
import { execute } from "./commands/execute";
import { localPackageJson } from "./constants";
import { normalizeImportSpecifiers } from "./commands/normalize";

import { newCommand, NewCommandTypes } from "./commands/new";
import { ship, ShipTypes } from "./commands/ship";

const { version } = await localPackageJson();
const program = new Command();

program
  .name(chalk.blue(chalk.bold("tsmodule")))
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
  .description("Builds TS files to output in dist/.")
  .option("-i, --input <files>", "Entrypoints to compile.")
  .option("-j, --js-only", "Do not build styles")
  .option("-s, --styles <styles>", "Specify stylesheet entrypoint.")
  .option("-t, --target <target>", "ECMAScript featureset to target.")
  .option("-b, --bundle", "Bundle dependencies into entrypoints.")
  .option("-d, --dev", "Build development runtime.")
  .option("-r, --runtime-only", "Do not emit type declarations, only build JS runtime.")
  .option("--stdin [source]", "Read from a string or stdin.")
  .option("--stdin-file [file]", "File path to mock for stdin.")
  .option("--no-write", "Return code from build() rather than write to disk.\nFor programmatic use alongside { stdin: ... }.")
  .action(async (options) => {
    await build(options);
  });

program
  .command("create <name>")
  .description("Create a new project.")
  .option("--react", "Create React component library with Next.js")
  .action(create);

program
  .command("new")
  .description("Create a new feature, fix, or refactor.")
  .action(newCommand);

program
  .command("ship")
  .description(
    "Ship a new feature to a branch.\n" +
    "(usage: tsmodule ship development)"
  )
  .argument("[branch]", ShipTypes.join(" | "), "development")
  .usage("production")
  .action(ship);

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

export * from "./commands";
export * from "./types";