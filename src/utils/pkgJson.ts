import { readFile } from "fs/promises";
import { resolve } from "path";

export const getPackageJsonFile = async () => {
  const cwd = process.cwd();
  const pkgJsonFile = resolve(cwd, "package.json");
  return await readFile(pkgJsonFile, "utf-8");
};

export const getPackageJson = async () => {
  const pkgJsonFile = await getPackageJsonFile();
  return JSON.parse(pkgJsonFile);
};