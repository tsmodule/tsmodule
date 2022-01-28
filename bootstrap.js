import { build as esbuild } from "esbuild";

const BOOTSTRAP_FILES = [
  "src/commands/build.ts",
  "src/commands/normalize.ts",
  "src/loader/index.ts",
  "src/utils/index.ts",
  "src/utils/typescriptApi.ts",
];

await esbuild({
  format: "esm",
  entryPoints: BOOTSTRAP_FILES.filter((file) => !file.endsWith(".d.ts")),
  outdir: "dist",
  assetNames: "[name].js",
});

const { build } = await import("./dist/commands/build.js");
await build();