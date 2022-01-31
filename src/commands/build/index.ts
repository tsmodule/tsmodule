import { build as esbuild, BuildOptions } from "esbuild";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { extname, resolve as resolvePath } from "path";
import { readFile, rm } from "fs/promises";
import chalk from "chalk";
import glob from "fast-glob";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { bannerLog, createDebugLogger, isTs, isTsxOrJsx, log } from "../../utils";
import { emitTsDeclarations } from "./lib/emitTsDeclarations";
import { normalizeImportSpecifiers } from "../normalize";

/**
 * Build TS to JS. This will contain incomplete specifiers like `./foo` which
 * could mean many things, all of which is handled by the loader which will
 * resolve them for us.
 */
export const build = async (production = true) => {
  const DEBUG = createDebugLogger(build);

  if (production) {
    bannerLog("Building for production.");
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
   * All files for the build. Ignore .d.ts files.
   */
  const allFiles =
      glob
        .sync("src/**/*", { cwd })
        .filter((file) => extname(file) !== ".d.ts")
        .map((file) => resolvePath(file));
  /**
   * Compile TS files.
   */
  const tsFiles =
    allFiles
      .filter((file) => isTs.test(file))
      .filter((file) => !isTsxOrJsx.test(file));

  DEBUG.log("Compiling TS files:", { tsFiles });
  await esbuild({
    ...shared,
    entryPoints: tsFiles.filter((file) => !file.endsWith(".d.ts")),
  });

  /**
   * TSX files to compile.
   */
  const tsxFiles =
    allFiles
      .filter((file) => isTsxOrJsx.test(file));

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

  /**
   * Emit TypeScript declarations.
   */
  bannerLog("Generating TypeScript declarations.");
  log("This might take a moment.");

  emitTsDeclarations(allFiles);

  log(`Generated delcarations for ${allFiles.length} files.`);
  log("Forcing \"type\": \"module\" in output.");

  let distPkgJson;
  if (existsSync("dist/package.json")) {
    distPkgJson = JSON.parse(readFileSync("dist/package.json", "utf-8"));
  } else {
    distPkgJson = {};
  }

  distPkgJson.type = "module";
  writeFileSync("dist/package.json", JSON.stringify(distPkgJson, null, 2));

  log(chalk.green("✓ Build complete."));
};