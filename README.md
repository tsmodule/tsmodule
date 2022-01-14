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

## License

MIT

© [C. Lewis](https://ctjlewis.com)

© [Luke Edwards](https://lukeed.com)
