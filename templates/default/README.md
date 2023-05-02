# `tsmodule` library

This is a [`tsmodule`](https://github.com/tsmodule/tsmodule) library. By
default, it is assumed to be a Node program, but this can be adjusted via the
`platform` field in package.json.

### Develop

Rebuild on changes with `tsmodule dev` or the `pnpm dev` script:

```bash
pnpm dev
# calls `tsmodule dev`
```

### Export and publish

To export your component library, use `tsmodule build` or the `pnpm build`
script:

```bash
pnpm build
# calls `tsmodule build`
```

You can then publish to NPM:

```bash
pnpm publish
```

#### Importing from your library

All index exports, e.g. `src/example/index.tsx` will be available downstream
via `import ... from "my-library/example"`.