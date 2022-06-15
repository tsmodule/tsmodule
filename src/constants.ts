import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const localPackageJson = async () => {
  const pkgJson = await readFile(
    resolve(PACKAGE_ROOT, "package.json"),
    "utf-8"
  );

  return JSON.parse(pkgJson);
};