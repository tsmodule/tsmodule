import { TsModuleProjectConfig, TsmoduleSpecification } from "./types";

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
    "exports": {
      "./package.json": "./package.json",
      ".": "./dist/index.js",
      "./*": "./dist/*/index.js"
    },
    /**
     * Apply build, dev, lint, test, and publish scripts.
     */
    "scripts": {
      "dev": "tsmodule dev",
      "build": "tsmodule build",
      "test": "ava",
      "pretest": "tsmodule build --runtime-only",
      "prepublishOnly": "yarn build && yarn test",
      "lint": "eslint src --fix",
    },
    /**
     * Set Ava config for testing.
     */
    "ava": {
      "timeout": "10m",
      "files": [
        "test/**/*.test.ts"
      ],
      "extensions": {
        "ts": "module"
      },
      "nodeArguments": [
        "--no-warnings",
        "--loader=@tsmodule/tsmodule/loader"
      ]
    },
  },
  /**
   * Standardize TSConfig and ESLint.
   */
  "files": [
    "tsconfig.json",
    ".eslintrc",
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
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
    "ava",
    "eslint",
    /**
     * Ensure TSC is available for .d.ts generation.
     */
    "typescript",
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
        "./package.json": "./package.json",
        ".": "./dist/index.js",
        "./styles": "./dist/bundle.css",
        "./styles/*": "./dist/components/*/index.css",
        "./*": "./dist/components/*/index.js",
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
        "pretest": "tsmodule build --runtime-only",
        "test": "ava",
        "prepublishOnly": "yarn export && yarn test"
      },
      /**
       * Lock React types to v17.
       */
      "resolutions": {
        "@types/react": "^17.0.38",
        "@types/react-dom": "^17.0.11"
      },
    },
    /**
     * Ensure Next, PostCSS, and Tailwind configs are available.
     */
    "files": [
      ".eslintrc",
      "next-env.d.ts",
      "next.config.js",
      "postcss.config.js",
      "tailwind.config.js",
    ],
    "dependencies": ["react@^17.0.2", "react-dom@^17.0.2"],
    "devDependencies": [
      ...defaultSettings.devDependencies,
      /**
       * React TS typings.
       */
      "@types/react@^17.0.39",
      "@types/react-dom@^17.0.11",
      /**
       * ESLint for Next.
       */
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