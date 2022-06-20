import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";

export type PackageJsonSettings = {
  [key: string]: string | number | boolean | object;
};

/**
 * Read the package.json file contents from a given `targetDir`.
 *
 * @param targetDir The directory to read the package.json file from.
 * @returns The loaded package.json file, as a string.
 */
export const getPackageJsonFile = async (targetDir = process.cwd()) => {
  const pkgJsonFile = resolve(targetDir, "package.json");
  return await readFile(pkgJsonFile, "utf-8");
};

/**
 * Read the package.json object from a given `targetDir`.
 * @param targetDir The directory to read the package.json from.
 * @returns The loaded package.json file, as an object.
 */
export const getPackageJson = async (targetDir = process.cwd()) => {
  const pkgJsonFile = await getPackageJsonFile(targetDir);
  return JSON.parse(pkgJsonFile);
};

/**
 * Rewrite the fields for the package.json in `targetDir`.
 *
 * @param targetDir The directory to write the package.json file to.
 * @param settings The settings to write to the package.json file.
 * @returns The updated package.json.
 */
export const setPackageJsonFields = async (
  targetDir = process.cwd(),
  settings: PackageJsonSettings,
) => {
  const packageJsonPath = resolve(targetDir, "package.json");
  const packageJson = await getPackageJson(targetDir);
  /**
   * Apply given settings.
   */
  Object.assign(packageJson, settings);
  /**
   * Write the updated package.json file.
   */
  await writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2),
    "utf-8"
  );

  return packageJson;
};