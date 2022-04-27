import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

export const dependencies = {
  default: [],
  react: ["@tsmodule/react", "react", "react-dom"],
};

export const devDependencies = {
  default: [
    "@types/node",
    "ava",
    "eslint",
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser"
  ],
  react: [
    "next",

    "@types/node",
    "@types/react@^17.0.0",
    "@types/react-dom@^17.0.0",

    "eslint",
    "eslint-config-next",

    "tailwindcss",
    "autoprefixer",
    "cssnano",
    "postcss",
    "postcss-import",
  ],
};

export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const localPackageJson = async () => {
  const pkgJson = await readFile(
    resolve(PACKAGE_ROOT, "package.json"),
    "utf-8"
  );

  return JSON.parse(pkgJson);
};