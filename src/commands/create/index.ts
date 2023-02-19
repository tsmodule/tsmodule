/* eslint-disable no-console */
import chalk from "chalk";
import ora from "ora";

import { createShell } from "universal-shell";
import { resolve } from "path";

import { applyDependenciesSpec, applyPackageJsonSpec, applySpecification, ApplyTemplateParams, copyTemplate } from "./lib/templates";
import { setPackageJsonFields } from "../../utils/packageJson";

export const create = async (name: string, { react = false }) => {
  const template = react ? "react" : "default";
  const spinner = ora({
    text: `Creating new module ${chalk.blueBright(name)}.`,
    indent: 2,
  }).start();
  /**
   * Always copy default template.
   */
  await copyTemplate({ template: "default", targetDir: name });
  await setPackageJsonFields(
    resolve(process.cwd(), name),
    {
      "name": name,
    }
  );
  /**
   * For non-default template, copy template files on top.
   */
  if (template !== "default") {
    await copyTemplate({ template, targetDir: name, });
  }

  spinner.succeed("Project created.");

  await applySpecification({ template, targetDir: name });
  spinner.succeed("Dependencies installed.");

  const shell = createShell({
    cwd: resolve(name),
    stdio: ["ignore", "ignore", "inherit"],
  });

  await shell.run("git init");
  spinner.succeed("Set up as Git repository.");
};