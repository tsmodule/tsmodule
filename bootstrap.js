/* eslint-disable no-console */
import { build as esbuild } from "esbuild";
import glob from "fast-glob";
import { resolve } from "path";
import { rm } from "fs/promises";

// process.env.NODE_ENV = "production";

/**
 * Clean dist.
 */
await rm(resolve(process.cwd(), "dist"), { recursive: true, force: true });

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
