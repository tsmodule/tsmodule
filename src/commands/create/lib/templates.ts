import { specification, TsmoduleProjectType } from "../../../specification";
import { PACKAGE_ROOT } from "../../../constants";

import glob from "fast-glob";

import { copyFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { createDebugLogger } from "create-debug-logger";
import { createShell } from "await-shell";

const getTemplateDir = (template: string) => {
  return resolve(PACKAGE_ROOT, `./templates/${template}`);
};

/**
 * Copy the specified files from the given `template` into `targetDir`.
 */
export const copyTemplateFiles = async (
  template: TsmoduleProjectType,
  /**
   * The directory to copy into.
   */
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
 * Copy the files for a given `template` into `targetDir`.
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

// await copyTemplateFiles("default", "../new-project");