import { TsmoduleSpecification } from "./types";

export const specification: TsmoduleSpecification = {
  default: {
    dependencies: [],
    devDependencies: [
      "@types/node",
      "@tsmodule/tsmodule",
      "@typescript-eslint/eslint-plugin",
      "@typescript-eslint/parser",
      "ava",
      "eslint",
      "typescript",
    ],
  },
  react: {
    dependencies: ["react@^17.0.2", "react-dom@^17.0.2"],
    devDependencies: [
      "next",

      "@types/react@^17.0.39",
      "@types/react-dom@^17.0.11",
      "@tsmodule/react",

      "eslint",
      "eslint-config-next",

      "tailwindcss",
      "autoprefixer",
      "cssnano",
      "postcss",
      "postcss-import",
    ],
  },
};

export * from "./types";