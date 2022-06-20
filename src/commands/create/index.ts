/* eslint-disable no-console */
import chalk from "chalk";
import { createShell } from "await-shell";
import ora from "ora";
import { resolve } from "path";

import { applyPackageJsonSpec, ApplyTemplateParams, copyTemplate } from "./lib/templates";
import { setPackageJsonFields } from "../../utils/packageJson";
import { specification } from "../../specification";

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
  const defaultSettings: ApplyTemplateParams = {
    template: "default",
    targetDir: name
  };
  await copyTemplate(defaultSettings);
  await applyPackageJsonSpec(defaultSettings);
  /**
   * Copy other template files as needed.
   */
  if (react) {
    const reactSettings: ApplyTemplateParams = {
      template: "react",
      targetDir: name
    };
    await copyTemplate(reactSettings);
    await applyPackageJsonSpec(reactSettings);
  }

  await setPackageJsonFields(
    resolve(process.cwd(), name),
    {
      "name": name,
    }
  );

  spinner.succeed("Project created.");

  /**
   * Install dependencies in the created directory.
   */
  process.chdir(name);

  const depsToInstall = [...specification.default.dependencies];
  const devDepsToInstall = [...specification.default.devDependencies];

  if (react) {
    depsToInstall.push(...specification.react.dependencies);
    devDepsToInstall.push(...specification.react.devDependencies);
  }

  if (depsToInstall.length) {
    await shell.run(`yarn add ${depsToInstall.join(" ")}`);
  }

  if (devDepsToInstall.length) {
    await shell.run(`yarn add -D ${devDepsToInstall.join(" ")}`);
  }

  spinner.succeed("Dependencies installed.");
  await shell.run("git init");
  spinner.succeed("Set up as Git repository.");
};