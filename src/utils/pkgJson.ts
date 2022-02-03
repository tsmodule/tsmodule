import { promises as fs } from "fs";
import { resolve } from "path";

export const getPackageJsonFile = async () => {
  const cwd = process.cwd();
  const pkgJsonFile = resolve(cwd, "package.json");
  return await fs.readFile(pkgJsonFile, "utf-8");
};