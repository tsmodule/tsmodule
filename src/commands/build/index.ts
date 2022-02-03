import { build as esbuild, BuildOptions } from "esbuild";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { extname, resolve as resolvePath } from "path";
import chalk from "chalk";
import { env } from "process";
import fs from "fs/promises";
import glob from "fast-glob";
import ora from "ora";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { createDebugLogger, log } from "create-debug-logger";
import { isTs, isTsxOrJsx } from "../../utils";
import { emitTsDeclarations } from "./lib/emitTsDeclarations";
import { getPackageJsonFile } from "../../utils/pkgJson";
import { normalizeImportSpecifiers } from "../normalize";

export const bannerLog = (msg: string) => {
  log(
    chalk.bgBlue(chalk.white(`  ${msg}  `))
  );
};

/**
 * Build TS to JS. This will contain incomplete specifiers like `./foo` which
 * could mean many things, all of which is handled by the loader which will
 * resolve them for us.
 */
export const build = async ({ dev = false, fast = false }) => {
  if (dev) {
    env.NODE_ENV = "development";
  }

  const DEBUG = createDebugLogger(build);

  if (!dev) {
    bannerLog("Building for production.");
  }

  /**
   * Initialize build options, and inject PACKAGE_JSON for library builds.
   */
  const cwd = process.cwd();
  const pkgJsonFile = await getPackageJsonFile();
  const shared: BuildOptions = {
    absWorkingDir: cwd,
    outbase: "src",
    outdir: "dist",
    assetNames: "[name].js",
    logLevel: dev ? "debug" : "error",
    charset: "utf8",
    format: "esm",
    target: "esnext",
    minify: !dev,
    define: {
      PACKAGE_JSON: pkgJsonFile,
    },
  };

  /**
   * Clean old output.
   */
  const distDir = resolvePath(cwd, "dist");
  DEBUG.log("Cleaning old output:", { distDir });
  await fs.rm(distDir, { force: true, recursive: true });

  // eslint-disable-next-line no-console
  console.log();

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

  ora("Built TS files.").succeed();

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
      js: "import { createElement } from \"react\";\n",
    },
  });

  ora("Built TSX files.").succeed();

  if (process.env.NO_REWRITES) {
    return;
  }

  await normalizeImportSpecifiers();
  ora("Normalized import specifiers.").succeed();
  // eslint-disable-next-line no-console
  console.log();

  if (dev || fast) {
    return;
  }

  bannerLog("Running post-build setup.");

  log("Generating type declarations.\nThis might take a moment.");
  emitTsDeclarations(allFiles);
  ora(`Generated delcarations for ${allFiles.length} files.`).succeed();

  let distPkgJson;
  if (existsSync("dist/package.json")) {
    distPkgJson = JSON.parse(readFileSync("dist/package.json", "utf-8"));
  } else {
    distPkgJson = {};
  }

  distPkgJson.type = "module";
  writeFileSync("dist/package.json", JSON.stringify(distPkgJson, null, 2));

  ora("Forced \"type\": \"module\" in output.").succeed();
  log(chalk.green("Build complete."));
};