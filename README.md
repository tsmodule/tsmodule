<div align="center">
  <img src="assets/tsmodule.png">
  <h4>TypeScript Module Toolkit</h4>
</div>

---

### Quickly create TypeScript projects with **`tsmodule create`**

Supports React via TSX/JSX. Ready with zero config:

  - package.json scripts
  - ESLint + TypeScript configs
  - CI/CD with GitHub Actions

### Build TypeScript to pure ESM with **`tsmodule build`**

  - No more polyfilling to CJS or older featuresets
  - Use latest syntax in source, leave backporting to downstream consumers

### Run TypeScript directly with **`tsmodule <file>`**

  - Uses Node module loader to resolve TS at runtime
  - Executable TypeScript files with `#!/usr/bin/env tsmodule`

## Use Cases

Below are some example use cases of TS modules in practice.

### Generic TypeScript library

The most common type of library will be a TS module with generic TypeScript
exports in `src/**/index.ts`, e.g.
[`await-shell`](https://github.com/ctjlewis/await-shell), a Promise wrapper
around `child_process.spawn` that's used in tsmodule itself.

This library contains only one export at `src/index.ts`, a function called
`shell`. It has one test at `test/errors.test.ts`.

### Next.js component library

It's often necessary to compile libraries of TSX components to valid JS that can
be consumed by a bundler downstream.  This is handled by tsmodule out of the
box.

The following configuration can be used to export a library of TSX components in
`src/components/**/index.tsx` that is also consumed in a Next.js demo from pages
in `src/pages`:

- In `next.config.js`, allow for ESM externals (our exported components will be
  ESM):

    ```js
    { 
      experiments: { 
        esmExternals: true 
      } 
    }
    ```

- In package.json, configure the package to export from `dist/components`:

    ```json
    {
      "exports": {
        ".": "./dist/index.js",
        "./*": "./dist/components/*/index.js",
        "./styles": "./dist/styles/index.css",
        "./styles/*": "./dist/styles/*/index.css",
        "./package.json": "./package.json"
      },
    }
    ```

## Requirements

Because TS modules are pure ESM environments, **Node 16+** is required.

## Installation

Install `tsmodule` in your project (or globally) to run or build your module:

```shell
yarn add @tsmodule/tsmodule
```

You can build your TS module to ESM with the `build` CLI command:

```shell
tsmodule build
```

Source will be compiled from `src/` to `dist/` and will contain only
ESM-compliant import specifiers as resolved by the tsmodule loader. It can then
be executed with Node, e.g. `node dist/index.js`.

## Footnotes

### Module configuration

All packages built with `tsmodule build` are ES modules. `{ "type": "module" }`
is forced to minimize ambiguity.

`tsmodule build` also forces the following tsconfig.json values during the
type-check and declaration emit:

```json
{
  "rootDir": "src/",
  "outDir": "dist/",
}
```

And conditional exports in package.json will be configured like so, such that
"index modules" at e.g. `src/test/index.ts` will be available at
`my-package/test`:

```json
{
  "files": ["dist/"],
  "exports": {
    "./package.json": "./package.json",
    "./": "./dist/index.js",
    "./*": "./dist/*/index.js"
  },
}
```

This has no restriction on internal imports between files, only the default
configuration for how downstream consumers can import from module subpaths.

## License

MIT © [C. Lewis](https://ctjlewis.com)
