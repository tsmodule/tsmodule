/* eslint-disable no-console */
import chalk from "chalk";
import ora from "ora";
import { shell } from "await-shell";

import { createTemplate } from "./lib/createTemplate";
import { rewritePkgJson } from "./lib/rewritePkgJson";

// @ts-ignore - Need to add initializeShell() to await-shell.
globalThis.SHELL_OPTIONS = {
  stdio: ["ignore", "ignore", "inherit"],
};

export const create = async (name: string) => {
  const spinner = ora(`Creating new module ${chalk.blueBright(name)}.`).start();

  await createTemplate("default", name);
  await rewritePkgJson(name);

  spinner.succeed("Project created.");

  /**
   * Install dependencies in the created directory.
   */
  process.chdir(name);
  const dependencies = ["@tsmodule/tsmodule"];

  spinner.start("Installing dependencies.");
  await shell(`yarn add -D ${dependencies.join(" ")}`);
  spinner.succeed("Dependencies installed.");

  spinner.start("Initializing git.");
  await shell("git init");
  spinner.succeed("Git initialized.");
};