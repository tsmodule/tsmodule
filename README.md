<div align="center">
  <h1><code>@tsmodule/tsm</code></h1>
  <h3>TypeScript Module Loader and Compiler</h3>
</div>

## Features

* **Run** TypeScript files directly
  * Uses Node's experimental module loader
* **Build** to pure ES Module output
  * Fast (6ms to build this tool, minified and DCE'd)
  * Pure, spec-compliant ESM output
* Supports `node <file>` usage
* Supports [ESM `--loader`](https://nodejs.org/api/esm.html#esm_loaders) usage

## Requirements

Because TSM packages are pure ESM environments, only  **Node 16+** is supported.

## Usage

`tsm` can be used to run TypeScript directly, and the CLI can be used to build
your project to fully-resolved ESM.

Install tsm in your project (or globally) to run or build your module:

```shell
yarn add @tsmodule/tsm
```

### Building TypeScript modules

You can build your TypeScript module to ESM with the `build` CLI command:

```shell
tsm build
```

Source will be compiled from `src/` to `dist/` and will contain only
ESM-compliant import specifiers as resolved by the tsm loader. This ESM output
will *not* contain incomplete specifiers like `./path/to/module` (no file
extension) and can be executed directly via `node dist/index.js`.

### Executing TypeScript directly

Provided they're executable (via `chmod +x file.ts`), TypeScript files can be
executed directly (via `./index.ts`) with the `#!/usr/bin/env tsm` shebang
present:

```ts
#!/usr/bin/env tsm

const test: string = "hello world"
console.log(test);
```

Shell:

```shell
$ ./file.ts

# hello world
```

### Advanced usage

```sh
# use as `node` replacement
$ tsm server.ts

# forwards any `node` ENV or flags
$ NO_COLOR=1 tsm server.ts --trace-warnings

# use as `--require` hook
$ node --require @tsmodule/tsm server.tsx
$ node -r @tsmodule/tsm server.tsx

# use as `--loader` hook
$ node --loader @tsmodule/tsm main.jsx
```

## How it works

`tsm` is effectively a proxy for `node --loader @tsmodule/tsm [...]`. The tsm loader
allows ES module resolution to natively import from specifiers like `./thing ->
./thing.ts`, and uses esbuild to load TypeScript on-the-fly. 

`tsm build` uses this same loader to resolve import specifiers statically
ahead-of-time and turn transpiled TypeScript (which often contains incomplete
specifiers like `./a`) into spec-compliant ESM (`./a -> ./a.js`).

### Module configuration

All packages built with `tsm build` are ES modules. They should have
`"type": "module"` set in package.json and can use the `exports` field to
resolve conditional exports.

`tsm build` forces the following tsconfig.json values:

```json
{
  "rootDir": "src/",
  "outDir": "dist/",
}
```

By default, package.json will be configured like so:

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

Such that "index modules" at e.g. `src/test/index.ts` will be available at
`my-package/test`.  This has no restriction on internal imports between files,
only the default configuration for how downstream consumers can import from
module subpaths.

## Footnotes

- `const x = require(...)` statements in imported modules will be
  forward-polyfilled to backwards-compatible `const { default: x } = await
  import(...)` statements by the loader.

  This has no runtime effect, and is simply a way to support legacy CJS
  `require` statements by transforming them into equivalent dynamic ESM imports.

## License

MIT © [C. Lewis](https://ctjlewis.com), [Luke Edwards](https://lukeed.com)
