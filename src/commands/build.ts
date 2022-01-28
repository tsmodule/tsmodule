import { build as esbuild, BuildOptions } from "esbuild";
import { extname, resolve as resolvePath } from "path";
import { readFile, rm } from "fs/promises";
import chalk from "chalk";
import glob from "fast-glob";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { createDebugLogger, log } from "../utils/index.js";
import { normalizeImportSpecifiers } from "./normalize.js";

/**
 * Build TS to JS. This will contain incomplete specifiers like `./foo` which
 * could mean many things, all of which is handled by the loader which will
 * resolve them for us.
 */
export const build = async (production = true) => {
  const DEBUG = createDebugLogger(build);

  if (production) {
    log(chalk.grey("Building for production..."));
  }
  /**
   * Initialize build options, and inject PACKAGE_JSON for library builds.
   */
  const cwd = process.cwd();
  const pkgJsonFile = resolvePath(cwd, "package.json");
  const pkgJson = await readFile(pkgJsonFile, "utf-8");
  const shared: BuildOptions = {
    absWorkingDir: cwd,
    outbase: "src",
    outdir: "dist",
    assetNames: "[name].js",
    logLevel: production ? "info" : "debug",
    charset: "utf8",
    format: "esm",
    target: "esnext",
    minify: production,
    define: {
      PACKAGE_JSON: pkgJson,
    },
  };
    /**
     * Clean old output.
     */
  const distDir = resolvePath(cwd, "dist");
  DEBUG.log("Cleaning old output:", { distDir });
  await rm(distDir, { force: true, recursive: true });
  /**
     * All TS files for the build. Ignore .d.ts files.
     */
  const allTs =
      glob
        .sync("src/**/*.{ts,tsx}", { cwd })
        .filter((file) => extname(file) !== ".d.ts")
        .map((file) => resolvePath(file));
    /**
     * Compile TS files.
     */
  const tsFiles = allTs.filter((file) => extname(file) === ".ts");
  DEBUG.log("Compiling TS files:", { tsFiles });
  await esbuild({
    ...shared,
    entryPoints: tsFiles.filter((file) => !file.endsWith(".d.ts")),
  });
  /**
     * TSX files to compile.
     */
  const tsxFiles = allTs.filter((file) => extname(file) === ".tsx");
  DEBUG.log("Compiling TSX files:", { tsxFiles });
  await esbuild({
    ...shared,
    entryPoints: tsxFiles.filter((file) => !file.endsWith(".d.ts")),
    jsxFactory: "createElement",
    banner: {
      js: "import { createElement } from 'react';\n",
    },
  });
  /**
   * Run the post-build process and resolve import specifiers in output.
   */
  if (!process.env.NO_REWRITES) {
    await normalizeImportSpecifiers();
  }
};