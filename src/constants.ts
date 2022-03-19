import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

export const dependencies = {
  default: [],
  react: ["@tsmodule/react", "react", "react-dom"],
};

export const devDependencies = {
  default: ["@types/node"],
  react: [
    "next",

    "@types/react",
    "@types/react-dom",

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