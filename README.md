<div align="center">
  <img src="tsmodule.png">
  <h1>TypeScript Module Toolkit</h1>
</div>

tsmodule is a toolkit for developing **standardized, pure ESM TypeScript
modules** that target any platform. 

**Table of contents**

<!-- toc -->

- [Installation](#installation)
  * [Requirements (global)](#requirements-global)
  * [Existing projects](#existing-projects)
  * [New projects](#new-projects)
- [Purpose](#purpose)
  * [Create ESM packages using TypeScript](#create-esm-packages-using-typescript)
  * [Develop projects in real-time](#develop-projects-in-real-time)
  * [Build to optimized ES modules](#build-to-optimized-es-modules)
  * [Optimize NPM dependencies with `-b, --bundle`](#optimize-npm-dependencies-with--b---bundle)
  * [Run TypeScript directly](#run-typescript-directly)
- [Use Cases](#use-cases)
  * [Generic TypeScript library](#generic-typescript-library)
  * [React component library (using Next.js)](#react-component-library-using-nextjs)
- [Footnotes](#footnotes)
  * [Module configuration](#module-configuration)
    + [Index exports](#index-exports)
    + [Package.json export](#packagejson-export)
- [License](#license)

<!-- tocstop -->

## Installation

### Requirements (global)

- Node v14+ (for ESM support)
- Yarn (for `resolutions` package.json field)

### Existing projects

To convert an existing project (and install standardized package.json settings,
dependencies, and config files), run this in your project directory:

```bash
tsmodule convert
```

<sub>You will need to move all TS source files to `src/` if they are not there
already. Ensure you read the [module
configuration notes](#module-configuration) regarding "index exports" as it
relates to importing downstream.</sub>

### New projects

Create a new package with:

```
tsmodule create [--react] project-name
```

## Purpose

### Create ESM packages using TypeScript

`tsmodule create` exists to bootstrap a Node or React project in as little time
as possible. The created packages are modular, and `tsmodule create --react`
will create a modular Next.js project with [importable components and styles](#react-component-library-using-nextjs).

Ready out of the box:

  - package.json scripts
  - TypeScript, ESLint configs (Tailwind, PostCSS for React)
  - CI/CD with GitHub Actions

### Develop projects in real-time

Build in dev mode and watch for changes:

```
tsmodule dev
```

### Build to optimized ES modules

Production builds are minified ESM, with support for `my-package/a/b/c` path
resolution (see [Module configuration](#module-configuration) below).

```
tsmodule build [--bundle]
```

**All projects:**

  - Emit pure ESM, no polyfilling to CJS
  - Emit ESNext by default, no polyfilling to older feature sets

**React projects created with `create --react`:**

  - Bundle CSS by default
  - Use Tailwind by default

### Optimize NPM dependencies with `build --bundle`

With `-b, --bundle` mode, all entry points are compiled "in-place" and runtime NPM dependencies will generally not be needed as they will be inlined. If you build in bundle mode, you can move your dependencies to devDependencies, as the only thing that will be needed to run any/all compiled-in-place entry point(s) in your module are the bundles themselves.

TSModule itself builds with `-b, --bundle` flag, and requires only three runtime NPM dependencies:

1. `esbuild`, which does the heavy lifting for the build process, does not allow itself to be bundled;
2. `typescript`, so TSModule can use the built `tsc` binary to generate `.d.ts`
   type declarations during builds; and
3. `pkg`, for building binaries with `build --binary` (a specific standalone
   bundle mode).

<sub>Note: Bundling every entry point in place may not be what you want, i.e. if you
only have a single entrypoint. In these cases, `tsmodule build -b src/index.ts`
is more appropriate.</sub>

### Build executable binaries with `build --binary`

Uses Vercel's [`pkg`](https://github.com/vercel/pkg) to build binaries from
`src/bin.ts`.

<sub>**IMPORTANT:** This requires coercing to CJS, which is not possible if your
program uses top-level await. For now, replace with async closures and monitor
[this issue](https://github.com/vercel/pkg/issues/1291) for updates on full ESM
support.</sub>

### Run TypeScript directly

```
tsmodule file.ts
```

  - Uses Node module loader to resolve TS at runtime
  - Executable TypeScript files with `#!/usr/bin/env tsmodule`

## Use Cases

Below are some example use cases of TS modules in practice.

### Generic TypeScript library

The most common type of library will be a TS module with generic TypeScript
exports in `src/**/index.ts`, e.g.
[`universal-shell`](https://github.com/ctjlewis/universal-shell), a Promise wrapper
around `child_process.spawn` that's used in tsmodule itself.

This library contains only one export, at `src/index.ts` (a function called
`shell`), but you could import e.g. `import { test } from "my-package/path/to/export"` by exporting that identifier at `src/path/to/export/index.ts`.

### React component library (using Next.js)

`tsmodule create --react` creates a TS module which is also a Next app; pages are in `src/pages`, and components are in `src/components`. Tailwind, PostCSS, and `postcss-import` are all supported by default.

CSS will be bundled from `src/components/index.css` and exported at `my-package/styles`, which the package.json `style` field also points to (for `postcss-import` support), so that components packages are modular.


  ```json
  {
    "style": "./dist/bundle.css",
    "exports": {
      ".": "./dist/index.js",
      "./*": "./dist/components/*/index.js",
      "./styles": "./dist/bundle.css",
      "./styles/*": "./dist/components/*/index.css",
      "./package.json": "./package.json"
    },
  }
  ```

To use a component downstream, import the styles into the page, e.g.:

```tsx
// src/pages/_app.tsx
import "my-package/styles";
```

Or in CSS (resolved by `postcss-import` using `"style"` field in package.json):

```css
@import "my-package";
```

And render your component:

```tsx
// src/pages/test.tsx
import { MyComponent } from "my-package";

export default function TestPage() {
  return (
    <MyComponent />
  );
}
```

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

#### Index exports

Conditional exports in package.json are configured such that "index
exports" are available at a subpath. For example:

```
src/a/b/c/index.ts
```

Will be available downstream via:

```ts
import { c } from "your-package/a/b/c"
```

**Notes:**

- Index exports are the only entry points available for import, are ones located
at `src/**/index.ts(x?)`.<sup>1</sup>

- The default package entry point for `your-package` is `src/index.ts`.

<sub><sup>1</sup> This has no restriction on internal imports between files,
which can import from each other freely, including at runtime.
However, consumers of your package will only be able to import from index
exports as shown.<sub>

#### Package.json export

For information on why the `"./package.json": "./package.json"` export is
specified, see [#1](https://github.com/tsmodule/tsmodule/issues/1#issuecomment-1065500448).

## License

MIT © [C. Lewis](https://ctjlewis.com)