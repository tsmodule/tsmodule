import glob from "fast-glob";

import { copyFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { createDebugLogger } from "debug-logging";
import { createShell } from "universal-shell";

import { specification, TsmoduleProjectType } from "../../../specification";
import { INSTALL_ROOT } from "../../../constants";
import { setPackageJsonFields } from "../../../utils/packageJson";

const getTemplateDir = (template: string) => {
  return resolve(INSTALL_ROOT, `./templates/${template}`);
};

export interface ApplyTemplateParams {
  /**
   * The template to copy from.
   */
  template: TsmoduleProjectType;
  /**
   * The root directory of the target project. Defaults to `.`.
   */
  targetDir?: string;
}

/**
 * Copy all of the files for a given `template` into `targetDir`.
 */
export const copyTemplate = async ({
  template,
  targetDir = process.cwd()
}: ApplyTemplateParams) => {
  const shell = createShell({ log: false });
  const templatePath = getTemplateDir(template);
  const targetPath = resolve(targetDir);

  await mkdir(targetPath, { recursive: true });
  await shell.run({
    posix: `cp -rf ${templatePath}/. ${targetPath}`,
    win32: `xcopy /E /I /Q /Y ${templatePath}\\ ${targetPath}\\`,
  });
};

/**
 * Apply the file spec for the given `template` to `targetDir`.
 *
 * @param template The template to copy files from.
 * @param targetDir The directory to copy files into.
 */
export const applyTemplateFileSpec = async ({
  template,
  targetDir = process.cwd()
}: ApplyTemplateParams) => {
  const DEBUG = createDebugLogger(applyTemplateFileSpec);
  DEBUG.log("Copying template files", { template, targetDir });

  const templatePath = getTemplateDir(template);
  const targetPath = resolve(targetDir);

  await mkdir(targetPath, { recursive: true });

  // for (const filePattern of filePatterns) {
  const templateFiles = await glob(
    specification[template].files,
    {
      cwd: templatePath,
      // absolute: true,
      dot: true,
    }
  );

  if (templateFiles.length) {
    for (const templateFile of templateFiles) {
      const sourcePath = resolve(templatePath, templateFile);
      const replacementPath = resolve(targetPath, templateFile);
      DEBUG.log({ sourcePath, replacementPath });

      await mkdir(dirname(replacementPath), { recursive: true });
      await copyFile(sourcePath, replacementPath);
    }
  }
};

/**
 * Apply the package.json spec to the package.json in `targetDir`.
 *
 * @param template The project type to load the package.json spec for.
 * @param targetDir The target directory containing the package.json to rewrite.
 * @returns The updated package.json.
 */
export const applyPackageJsonSpec = async ({
  template,
  targetDir = process.cwd()
}: ApplyTemplateParams) => {
  const targetPath = resolve(targetDir);
  const packageJsonSpec = specification[template].packageJson;

  return await setPackageJsonFields(targetPath, packageJsonSpec);
};

export const applyDependenciesSpec = async ({
  template,
  targetDir = process.cwd()
}: ApplyTemplateParams) => {
  const shell = createShell({
    cwd: targetDir
  });

  const depsToInstall = specification[template].dependencies;
  const devDepsToInstall = specification[template].devDependencies;

  if (depsToInstall.length) {
    await shell.run(`yarn add ${depsToInstall.join(" ")}`);
  }

  if (devDepsToInstall.length) {
    await shell.run(`yarn add -D ${devDepsToInstall.join(" ")}`);
  }
};

export const applySpecification = async ({
  template,
  targetDir = process.cwd()
}: ApplyTemplateParams) => {
  const defaultSettings: ApplyTemplateParams = {
    template: "default",
    targetDir,
  };

  /**
   * Apply default spec first.
   */
  await applyTemplateFileSpec(defaultSettings);
  await applyPackageJsonSpec(defaultSettings);
  await applyDependenciesSpec(defaultSettings);

  /**
   * Apply template spec second, if applicable.
   */
  if (template !== "default") {
    const templateSettings: ApplyTemplateParams = {
      template,
      targetDir,
    };

    await applyTemplateFileSpec(templateSettings);
    await applyPackageJsonSpec(templateSettings);
    await applyDependenciesSpec(templateSettings);
  }
};
