<div align="center">
  <h1><code>@tsmodule/tsm</code></h1>
  <h3>TypeScript Module Loader and Compiler</h3>
</div>

## Features

* Fast (6ms to build this tool, minified and DCE'd)
* Supports `node <file>` usage
* Supports [ESM `--loader`](https://nodejs.org/api/esm.html#esm_loaders) usage

## Install

```shell
yarn add @tsmodule/tsm
```

## Usage

### Executing TypeScript directly

If this file is executable, it can be run directly with `./index.ts`. The
shebang line tells Node to use the tsm loader to parse the TypeScript source and
resolve imports.

```ts
#!/usr/bin/env tsm

const test: string = "hello world"
console.log(test);
```

### Building TypeScript modules to ESM

The `tsmodule` CLI can be used to build projects from TypeScript to ESM:

```shell
tsmodule build
```

The output is emitted in `dist/` and will contain only ESM-compliant import
specifiers as resolved by the tsm loader.

### Advanced

> **Note:** Refer to [`/docs/usage.md`](/docs/usage.md) for more information.

```sh
# use as `node` replacement
$ tsm server.ts
# or, equivalently
$ tsmodule server.ts

# forwards any `node` ENV or flags
$ NO_COLOR=1 tsm server.ts --trace-warnings

# use as `--require` hook
$ node --require tsm server.tsx
$ node -r tsm server.tsx

# use as `--loader` hook
$ node --loader tsm main.jsx
```

## How it works

`tsm` is effectively a proxy for `node --loader tsm [...]`. The tsm loader
allows ES module resolution to natively import from specifiers like `./thing ->
./thing.ts`, and uses esbuild to load TypeScript on-the-fly. 

`tsmodule build` uses this same loader to resolve import specifiers statically
ahead-of-time and turn transpiled TypeScript (which often contains incomplete
specifiers like `./a`) into spec-compliant ESM (`./a -> ./a.js`).

### Module configuration

All packages built with `tsmodule build` are ES modules. They should have
`"type": "module"` set in package.json and can use the `exports` field to
resolve conditional exports.

By default, tsconfig.json will be set up as follows:

```json
{
  "rootDir": "src/",
  "outDir": "dist/",
  // ...
}
```

And package.json similar to:

```json
{
  "files": ["dist/"],
  "exports": {
    "./package.json": "./package.json",
    "./": "./dist/index.js",
    "./*": "./dist/*/index.js"
  },
  // ...
}
```

Such that "index modules" at e.g. `src/test/index.ts` will be available at
`my-package/test`.  This has no restriction on internal imports between files,
only the default configuration for how downstream consumers can import from
module subpaths. 

## License

MIT © [C. Lewis](https://ctjlewis.com), [Luke Edwards](https://lukeed.com)
