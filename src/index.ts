#!/usr/bin/env node
/* eslint-disable no-console */

import chalk from "chalk";

import { Command } from "commander";
import { build } from "./commands/build";
import { create } from "./commands/create";
import { dev } from "./commands/dev";
import { execute } from "./commands/execute";
import { convert } from "./commands/convert";

import { localPackageJson } from "./constants";
import { normalizeImportSpecifiers } from "./commands/normalize";

const { version } = await localPackageJson();
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
  .option("--react", "Create React component library with Next.js")
  .description("Create a new project.")
  .action(create);

program
  .command("convert")
  .description("Convert an existing project to a TS module.")
  .action(convert);

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
export * from "./specification";
export * from "./types";