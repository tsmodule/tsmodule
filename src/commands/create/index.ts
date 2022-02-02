/* eslint-disable no-console */
import { cp, readFile, writeFile } from "fs/promises";
import { fileURLToPath, URL } from "url";
import chalk from "chalk";
import ora from "ora";
import { resolve } from "path";
import { shell } from "await-shell";

export const create = async (name: string) => {
  const cwd = process.cwd();
  const spinner = ora(`Creating new module ${chalk.blueBright(name)}.`).start();

  const templateURL = new URL("../../../template", import.meta.url);
  await cp(fileURLToPath(templateURL), resolve(cwd, name), { recursive: true });

  /**
   * Replace package name in package.json.
   */
  const packageJsonPath = resolve(cwd, name, "package.json");
  const packageJsonFile = await readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonFile);

  packageJson.name = name;
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  spinner.succeed("Project created.");
  spinner.start("Installing dependencies.");

  /**
   * Enter the project directory.
   */
  process.chdir(name);

  const dependencies = [
    "@tsmodule/tsmodule",
    "typescript",
    "ava",
    "eslint",
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
  ];

  // @ts-ignore - Need to add initializeShell() to await-shell.
  globalThis.SHELL_OPTIONS = {
    stdio: ["ignore", "ignore", "inherit"],
  };

  await shell(`yarn add -D ${dependencies.join(" ")}`);

  spinner.succeed("Dependencies installed.");
  spinner.start("Initializing git.");

  await shell("git init");

  spinner.succeed("Git initialized.");
};