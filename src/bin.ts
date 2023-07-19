#!/usr/bin/env node
/* eslint-disable no-console */

import chalk from "chalk";

import { Command } from "commander";
import { buildCommand } from "./commands/build";
import { convert } from "./commands/convert";
import { create } from "./commands/create";
import { dev } from "./commands/dev";
import { execute } from "./commands/execute";

import { tsmodulePackageJson } from "./constants";
import { normalizeImportSpecifiers } from "./commands/normalize";
import { programCatch } from "./utils/programCatch";

const { version } = await tsmodulePackageJson();
const program = new Command();

program
  .name(chalk.white(chalk.bold("tsmodule")))
  .usage(chalk.white(chalk.bold("<file | command> [options]")))
  .description(chalk.blueBright(
    "A toolkit for working with TypeScript ESM packages.\n\n" +
    `Run TS directly:\n${chalk.bold("tsmodule src/index.ts")} \n\n` +
    `Use a command:\n${chalk.bold("tsmodule build")}`
  ))
  .version(String(version));

program
  .command("dev")
  .description("Build and watch for changes.")
  .option("-f, --format <format>", "Output format (default: ESM).")
  .action(programCatch(dev));

program
  .command("build")
  .description("Builds TS files to output in dist/.")
  .argument("[files]", "Glob of entrypoints to compile.")
  .option("-d, --dev", "Build development runtime.")
  .option("-t, --target <target>", "ECMAScript featureset to target (default: ESNext).")
  .option("-f, --format <format>", "Output format (default: ESM).")
  .option("-b, --bundle", "Bundle external dependencies into entrypoints.")
  .option("-t, --tsconfig <file>", "Specify a custom tsconfig.json file.", "tsconfig.json")
  .option("-e, --external <external...>", "External dependencies to exclude from bundling.")
  .option("--binary", "Build binary executables from src/bin.ts.")
  .option("--standalone", "Bundle a standalone entry-points without any import statements (disables splitting).")
  .option("--splitting", "Split output into chunks. (default: true; disabled for --standalone)")
  .option("-r, --runtime-only", "Do not emit type declarations, only build JS runtime.")
  .option("-j, --js-only", "Do not build styles")
  .option("-s, --styles <styles>", "Specify stylesheet entrypoint.")
  .option("--stdin [source]", "Read from a string or stdin.")
  .option("--stdin-file [file]", "File path to mock for stdin.")
  .option("--no-write", "Return code from build() rather than write to disk.\nFor programmatic use alongside { stdin: ... }.")
  .option("--raw-process-env", "Do not overwrite process.env in output bundles (default: false).")
  .action(
    programCatch(buildCommand)
  );

program
  .command("create <name>")
  .option("--react", "Create React component library with Next.js")
  .description("Create a new project.")
  .action(programCatch(create));

program
  .command("convert")
  .description("Convert an existing project to a TS module.")
  .action(programCatch(convert));

program
  .command("normalize [files]")
  .description(
    "Rewrites import specifiers in files to ESM-compliant paths.\n" +
    "(default: dist/**/*.js)"
  )
  .action(
    programCatch(
      async ({ files }) => {
        await normalizeImportSpecifiers(files);
      }
    )
  );

program
  .command("execute", { isDefault: true, hidden: true })
  .argument("[file]", "The file to execute.")
  .option("--d, --dev", "Enable development mode")
  .description("Run the given TS program, analogous to `node <file>`.")
  .action(programCatch(async (file) => {
    if (!file) {
      return program.help();
    }

    return await execute();
  }));

program.parse(process.argv);

// const a: string = 42;