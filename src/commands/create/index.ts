/* eslint-disable no-console */
import { fileURLToPath, URL } from "url";
import chalk from "chalk";
import fs from "fs/promises";
import ora from "ora";
import { resolve } from "path";
import { shell } from "await-shell";
import { copy } from "fs-extra";

export const create = async (name: string) => {
  const cwd = process.cwd();
  const spinner = ora(`Creating new module ${chalk.blueBright(name)}.`).start();

  const templateURL = new URL("../../../template", import.meta.url);
  await copy(fileURLToPath(templateURL), resolve(cwd, name));
  // await shell(`cp -R ${fileURLToPath(templateURL)} ${resolve(cwd, name)}`);

  /**
   * Replace package name in package.json.
   */
  const packageJsonPath = resolve(cwd, name, "package.json");
  const packageJsonFile = await fs.readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonFile);

  packageJson.name = name;
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  spinner.succeed("Project created.");

  /**
   * Enter the project directory.
   */
  process.chdir(name);
  const dependencies = ["@tsmodule/tsmodule"];

  // @ts-ignore - Need to add initializeShell() to await-shell.
  globalThis.SHELL_OPTIONS = {
    stdio: ["ignore", "ignore", "inherit"],
  };

  spinner.start("Installing dependencies.");
  await shell(`yarn add -D ${dependencies.join(" ")}`);
  spinner.succeed("Dependencies installed.");

  spinner.start("Initializing git.");
  await shell("git init");
  spinner.succeed("Git initialized.");
};