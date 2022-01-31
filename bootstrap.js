/* eslint-disable no-console */
import { build as esbuild } from "esbuild";
import glob from "fast-glob";

const BOOTSTRAP_FILES = glob.sync("src/**/*.ts");

console.log("BOOTSTRAP: Building with esbuild...");

await esbuild({
  format: "esm",
  entryPoints: BOOTSTRAP_FILES.filter((file) => !file.endsWith(".d.ts")),
  outdir: "dist",
  assetNames: "[name].js",
});

console.log("BOOTSTRAP: Normalizing import specifiers...");

const { normalizeImportSpecifiers } = await import("./dist/commands/normalize/index.js");
await normalizeImportSpecifiers();

console.log("BOOTSTRAP: Done.");
