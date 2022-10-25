import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

export const INSTALL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const tsmodulePackageJson = async () => {
  const pkgJson = await readFile(
    resolve(INSTALL_ROOT, "package.json"),
    "utf-8"
  );

  return JSON.parse(pkgJson);
};