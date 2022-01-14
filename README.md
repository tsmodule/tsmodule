<div align="center">
  <h1><code>@tsmodule/tsm</code></h1>
  <h3>TypeScript Module Loader</h3>
</div>

## Features

* Fast (6ms to build this tool, minified and DCE'd)
* Supports `node <file>` usage
* Supports [ESM `--loader`](https://nodejs.org/api/esm.html#esm_loaders) usage<sup>†</sup>
* Supports [`--require`
  hook](https://nodejs.org/api/cli.html#cli_r_require_module) usage

> <sup>†</sup> The ESM Loader API is still **experimental** and will change in the future.

## Install

```shell
yarn add @tsmodule/tsm
```

## Usage

### Executing TypeScript directly

If this file is executable, it can be run directly with `./index.ts`.

```ts
#!/usr/bin/env tsm

const test: string = "hello world"
console.log(test);
```

### Building TypeScript modules to ESM

The `tsmodule` CLI can be used to build projects from TS to ESM:

```shell
tsmodule build
```

The output is emitted in `dist/` and will contain only ESM-compliant import
specifiers.

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

## License

MIT

© [C. Lewis](https://ctjlewis.com)

© [Luke Edwards](https://lukeed.com)
