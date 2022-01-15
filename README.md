<div align="center">
  <h1><code>@tsmodule/tsm</code></h1>
  <h3>TypeScript Module Loader and Compiler</h3>
</div>

## Features

* Fast (6ms to build this tool, minified and DCE'd)
* Supports `node <file>` usage
* Supports [ESM `--loader`](https://nodejs.org/api/esm.html#esm_loaders) usage

## Usage

The `tsm` env can be used to make a TypeScript file executable (directly and/or
with Node), and the `tsm` CLI can be used to build your project to
fully-resolved ESM.

First, install tsm into your project:

```shell
yarn add @tsmodule/tsm
```

### Executing TypeScript directly

TypeScript files can be executed directly (e.g. `./index.ts`, if executable) or
run by Node (e.g. `node index.ts`) with the `#!/usr/bin/env tsm` shebang
present.

```ts
#!/usr/bin/env tsm

const test: string = "hello world"
console.log(test);
```

### Building TypeScript modules

You can build the project from `src/` to `dist/` with the `build` CLI command:

```shell
tsm build
```

The output will contain only ESM-compliant import specifiers as resolved by the
tsm loader and can be executed directly via `node dist/index.js`.

### Advanced usage

> **Note:** Refer to [`/docs/usage.md`](/docs/usage.md) for more information.

```sh
# use as `node` replacement
$ tsm server.ts
# or, equivalently
$ tsm server.ts

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
  // ...
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
  // ...
}
```

Such that "index modules" at e.g. `src/test/index.ts` will be available at
`my-package/test`.  This has no restriction on internal imports between files,
only the default configuration for how downstream consumers can import from
module subpaths. 

## License

MIT © [C. Lewis](https://ctjlewis.com), [Luke Edwards](https://lukeed.com)
