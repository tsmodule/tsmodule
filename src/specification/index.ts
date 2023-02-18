import { TsModuleProjectConfig, TsmoduleSpecification } from "./types";

/**
 * Default conditional exports for a TS Module.
 */
const defaultExportSettings = {
  /**
   * The `package.json` export is specified for compatibility with Metro and
   * React Native bundlers which will fail to resolve the module if it is
   * not exported when the `exports` field is defined.
   *
   * @see https://github.com/tsmodule/tsmodule/issues/1
   */
  "./package.json": "./package.json",
  /**
   * The module index at `my-package`.
   */
  ".": "./dist/index.js",
  /**
   * All other index exports at `my-package/a/b/c`.
   */
  "./*": "./dist/*/index.js"
};

/**
 * Default configuration is always applied to a project first.
 */
const defaultSettings: TsModuleProjectConfig = {
  packageJson: {
    /**
     * TS modules are ESM packages.
     */
    "type": "module",
    /**
     * By default, they target Node.
     */
    "platform": "node",
    /**
     * Only support Node 14+.
     */
    "engines": {
      "node": ">=14"
    },
    /**
     * They emit types at the runtime index.
     */
    "types": "dist/index.d.ts",
    /**
     * They package all files in dist/.
     */
    "files": ["dist"],
    /**
     * And they emulate CJS-like submodule resolution.
     *
     * @example
     * ```ts
     * import { test } from  "my-package/a/b/c";
     * // resolves to dist/a/b/c.index.js
     * // source code at src/a/b/c/index.ts
     * ```
     */
    "exports": defaultExportSettings,
    /**
     * Apply build, dev, lint, test, and publish scripts.
     */
    "scripts": {
      "dev": "tsmodule dev",
      "build": "tsmodule build",
      "pretest": "yarn build",
      "test": "ava",
      "prepublishOnly": "yarn test",
      "lint": "eslint src --fix",
    },
  },
  /**
   * Standardize TSConfig and ESLint.
   */
  "files": [
    ".github/**",
    ".eslintrc.yml",
    ".gitignore",
    "tsconfig.json",
    "LICENSE",
    "ava.config.mjs",
  ],
  /**
   * A Node program will not need any runtime deps by default.
   */
  "dependencies": [],
  /**
   * It will need types, plus build/lint/test deps.
   */
  "devDependencies": [
    "@types/node",
    "@tsmodule/tsmodule",
    "ava",
    /**
     * Ensure TSC is available for .d.ts generation.
     */
    "typescript",
    /**
     * ESLint deps.
     */
    "eslint@^8.0.1",
    "eslint-config-standard-with-typescript@latest",
    "@typescript-eslint/eslint-plugin@^5.0.0",
    "eslint-plugin-import@^2.25.2",
    "eslint-plugin-n@^15.0.0",
    "eslint-plugin-promise@^6.0.0",
  ],
};

/**
 * Standardized configuration settings for all tsmodule project types.
 */
export const specification: TsmoduleSpecification = {
  default: defaultSettings,
  react: {
    /**
     * Next-specific package.json settings.
     */
    packageJson: {
      ...defaultSettings.packageJson,
      /**
       * Target browser.
       */
      "platform": "browser",
      /**
       * PostCSS-specific package.json support. Import with `@import
       * "my-package"`.
       */
      "style": "dist/bundle.css",
      /**
       * Export styles and components.
       */
      "exports": {
        ...defaultExportSettings,
        "./*": "./dist/components/*/index.js",
        "./styles": "./dist/bundle.css",
        "./styles/*": "./dist/components/*/index.css",
      },
      /**
       * React-specific build scripts.
       */
      "scripts": {
        "export": "tsmodule build",
        "dev": "next dev",
        "build": "next build",
        "start": "next start",
        "lint": "next lint --fix",
        "pretest": "yarn build",
        "test": "ava",
        "prepublishOnly": "yarn test && yarn export"
      },
      /**
       * Lock React types to v17.
       */
      // "resolutions": {
      //   "@types/react": "^17.0.38",
      //   "@types/react-dom": "^17.0.11"
      // },
    },
    /**
     * Ensure Next, PostCSS, and Tailwind configs are available.
     */
    "files": [
      ".github/**",
      ".gitignore",
      "next-env.d.ts",
      "next.config.js",
      "postcss.config.cjs",
      "tailwind.config.cjs",
    ],
    "dependencies": [
      "react@^18.2.0",
      "react-dom@^18.2.0"
    ],
    "devDependencies": [
      ...defaultSettings.devDependencies,
      /**
       * React TS typings.
       */
      "@types/react@^18.0.23",
      "@types/react-dom@^18.0.7",
      /**
       * Next-specific ESLint config.
       */
      "eslint-plugin-react@latest",
      "eslint-config-next",
      /**
       * Build-time dependencies.
       */
      "@tsmodule/react",
      "next",
      "tailwindcss",
      "autoprefixer",
      "cssnano",
      "postcss",
      "postcss-import",
    ],
  },
};

export * from "./types";