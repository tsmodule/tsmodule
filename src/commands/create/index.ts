/* eslint-disable no-console */
import chalk from "chalk";
import { createShell } from "await-shell";
import ora from "ora";

import { dependencies, devDependencies } from "../../constants";
import { copyTemplate } from "./lib/copyTemplate";
import { rewritePkgJson } from "./lib/rewritePkgJson";

// @ts-ignore - Need to add initializeShell() to await-shell.
globalThis.SHELL_OPTIONS = {
  stdio: ["ignore", "ignore", "inherit"],
};

export const create = async (name: string, { react = false }) => {
  const shell = createShell();
  const spinner = ora(`Creating new module ${chalk.blueBright(name)}.`).start();

  /**
   * Always copy default template.
   */
  await copyTemplate("default", name);

  /**
   * Copy other template files as needed.
   */
  if (react) {
    await copyTemplate("react", name);
  }

  await rewritePkgJson(name);

  spinner.succeed("Project created.");

  /**
   * Install dependencies in the created directory.
   */
  process.chdir(name);

  const depsToInstall: string[] = [];
  const devDepsToInstall: string[] = [
    "@tsmodule/tsmodule",
  ];

  if (react) {
    depsToInstall.push(...dependencies.react);
    devDepsToInstall.push(...devDependencies.react);
  } else {
    devDepsToInstall.push(...devDependencies.default);
  }

  if (depsToInstall.length) {
    await shell.run(`yarn add ${depsToInstall.join(" ")}`);
  }

  if (devDepsToInstall.length) {
    await shell.run(`yarn add -D ${devDepsToInstall.join(" ")}`);
  }

  spinner.succeed("Dependencies installed.");

  await shell.run("git init");

  spinner.succeed("Git initialized.");
};