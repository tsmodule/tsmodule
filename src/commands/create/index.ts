/* eslint-disable no-console */
import chalk from "chalk";
import ora from "ora";

import { createShell } from "universal-shell";
import { resolve } from "path";

import { applyDependenciesSpec, applyPackageJsonSpec, ApplyTemplateParams, copyTemplate } from "./lib/templates";
import { setPackageJsonFields } from "../../utils/packageJson";

export const create = async (name: string, { react = false }) => {
  const spinner = ora({
    text: `Creating new module ${chalk.blueBright(name)}.`,
    indent: 2,
  }).start();
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
  await applyDependenciesSpec({
    template: "default",
    targetDir: name,
  });

  if (react) {
    await applyDependenciesSpec({
      template: "react",
      targetDir: name,
    });
  }

  spinner.succeed("Dependencies installed.");

  const shell = createShell({
    cwd: resolve(name),
    stdio: ["ignore", "ignore", "inherit"],
  });

  await shell.run("git init");

  spinner.succeed("Set up as Git repository.");
};