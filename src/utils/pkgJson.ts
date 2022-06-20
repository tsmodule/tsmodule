import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";

export type PackageJsonSettings = {
  [key: string]: string | number | boolean | object;
};

export const getPackageJsonFile = async (cwd = process.cwd()) => {
  const pkgJsonFile = resolve(cwd, "package.json");
  return await readFile(pkgJsonFile, "utf-8");
};

export const getPackageJson = async (cwd = process.cwd()) => {
  const pkgJsonFile = await getPackageJsonFile(cwd);
  return JSON.parse(pkgJsonFile);
};

export const writePackageJson = async (
  packageJson: PackageJsonSettings,
  cwd = process.cwd()
) => {
  const pkgJsonFile = resolve(cwd, "package.json");
  await writeFile(
    pkgJsonFile,
    JSON.stringify(packageJson, null, 2),
    "utf-8"
  );
};

export const rewritePackageJson = async (
  cwd = process.cwd(),
  settings: PackageJsonSettings,
) => {
  const packageJson = await getPackageJson(cwd);

  Object.assign(packageJson, settings);
  await writePackageJson(packageJson, cwd);
};