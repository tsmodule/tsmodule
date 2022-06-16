import { PACKAGE_ROOT } from "../../../constants";
import { specification, TsmoduleProjectType } from "../../../specification";

import glob from "fast-glob";

import { createShell } from "await-shell";
import { copyFile, mkdir } from "fs/promises";
import { resolve } from "path";

const getTemplateDir = (template: string) => {
  return resolve(PACKAGE_ROOT, `./templates/${template}`);
};

/**
 * Copy the given `files` from the given `template` into `targetDir`.
 */
export const copyTemplateFiles = async (
  template: string,
  /**
   * An array of globs or file paths to copy, relative to `targetDir`.
   */
  filePatterns: string[],
  /**
   * The directory to copy into.
   */
  targetDir: string
) => {
  const templatePath = getTemplateDir(template);
  const targetPath = resolve(targetDir);

  await mkdir(targetPath, { recursive: true });

  for (const filePattern of filePatterns) {
    const templateFiles = await glob(
      filePattern,
      {
        cwd: templatePath,
        absolute: true,
        dot: true,
      }
    );

    // eslint-disable-next-line no-console
    console.log(templateFiles);

    if (templateFiles.length) {
      for (const templateFile of templateFiles) {
        await copyFile(
          templateFile,
          resolve(targetPath, templateFile.replace(templatePath, ""))
        );
      }
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

// await copyTemplateFiles("default", ["**"], "./");