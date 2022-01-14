<!-- <div align="center">
  <img src="logo.png" alt="tsm" width="200" />
</div>

<div align="center">
  <a href="https://npmjs.org/package/tsm">
    <img src="https://badgen.net/npm/v/tsm" alt="version" />
  </a>
  <a href="https://github.com/lukeed/tsm/actions">
    <img src="https://github.com/lukeed/tsm/workflows/CI/badge.svg" alt="CI" />
  </a>
  <a href="https://npmjs.org/package/tsm">
    <img src="https://badgen.net/npm/dm/tsm" alt="downloads" />
  </a>
  <a href="https://packagephobia.now.sh/result?p=tsm">
    <img src="https://badgen.net/packagephobia/publish/tsm" alt="publish size" />
  </a>
</div> -->

<div align="center">
  <h1><code>@tsmodule/tsm</code></h1>
  <h3>TypeScript Module Loader</h3>
</div>

## Features

* Supports `node <file>` usage
* Supports [ESM `--loader`](https://nodejs.org/api/esm.html#esm_loaders) usage<sup>†</sup>
* Supports [`--require` hook](https://nodejs.org/api/cli.html#cli_r_require_module) usage

> <sup>†</sup> The ESM Loader API is still **experimental** and will change in the future.

## Install

```shell
yarn add @tsmodule/tsm
```

## Usage

### Executing TS files directly

If this file is executable, it can be run directly with `./index.ts`.

```ts
#!/usr/bin/env tsm

const test: string = "hello world"
console.log(test);
```

### Building ESM modules from TS

The `tsmodule` CLI can be used to build projects from TS to ESM:

```shell
tsmodule build
```

### Advanced

> **Note:** Refer to [`/docs/usage.md`](/docs/usage.md) for more information.

```sh
# use as `node` replacement
$ tsm server.ts

# forwards any `node` ENV or flags
$ NO_COLOR=1 tsm server.ts --trace-warnings

# use as `--require` hook
$ node --require tsm server.tsx
$ node -r tsm server.tsx

# use as `--loader` hook
$ node --loader tsm main.jsx
```

## License

MIT

© [C. Lewis](https://ctjlewis.com)
© [Luke Edwards](https://lukeed.com)
