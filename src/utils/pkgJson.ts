import fs from "graceful-fs";
import { resolve } from "path";

export const getPackageJsonFile = async () => {
  const cwd = process.cwd();
  const pkgJsonFile = resolve(cwd, "package.json");
  return fs.readFileSync(pkgJsonFile, "utf-8");
};