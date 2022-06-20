import glob from "fast-glob";

import { copyFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { createDebugLogger } from "create-debug-logger";
import { createShell } from "await-shell";

import { specification, TsmoduleProjectType } from "../../../specification";
import { PACKAGE_ROOT } from "../../../constants";
import { setPackageJsonFields } from "../../../utils/packageJson";

const getTemplateDir = (template: string) => {
  return resolve(PACKAGE_ROOT, `./templates/${template}`);
};

/**
 * Copy all of the files for a given `template` into `targetDir`.
 */
export const copyTemplate = async (
  template: TsmoduleProjectType,
  targetDir: string
) => {
  const shell = createShell();
  const templatePath = getTemplateDir(template);
  const targetPath = resolve(targetDir);

  await mkdir(targetPath, { recursive: true });
  await shell.run({
    posix: `cp -rf ${templatePath}/. ${targetPath}`,
    win32: `xcopy /E /I /Q /Y ${templatePath}\\ ${targetPath}\\`,
  });
};

/**
 * Copy the specified files from the given `template` into `targetDir`.
 *
 * @param template The template to copy files from.
 * @param targetDir The directory to copy files into.
 */
export const copyTemplateFiles = async (
  template: TsmoduleProjectType,
  targetDir: string
) => {
  const DEBUG = createDebugLogger(copyTemplateFiles);
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
 * Set fields for the package.json in `targetDir`.
 *
 * @param template The project type to load the package.json spec for.
 * @param targetDir The target directory containing the package.json to rewrite.
 * @returns The updated package.json.
 */
export const applyPackageJsonSpec = async (
  template: TsmoduleProjectType,
  targetDir: string
) => {
  const targetPath = resolve(targetDir);
  const packageJsonSpec = specification[template].packageJson;

  return await setPackageJsonFields(targetPath, packageJsonSpec);
};

// await copyTemplateFiles("default", "../new-project");