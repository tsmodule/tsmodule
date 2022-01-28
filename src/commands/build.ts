import { build as esbuild, BuildOptions } from "esbuild";
import { extname, resolve as resolvePath } from "path";
import { readFile, rm } from "fs/promises";
import chalk from "chalk";
import glob from "fast-glob";
import ora from "ora";

import ts from "typescript";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { bannerLog, createDebugLogger, isTs, isTsxOrJsx, log } from "../utils/index.js";
import { compilerHost, TS_CONFIG } from "../utils/typescriptApi.js";
import { normalizeImportSpecifiers } from "./normalize.js";

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
  const program = ts.createProgram(
    allFiles,
    {
      ...TS_CONFIG,
      declaration: true,
      noEmit: false,
      emitDeclarationOnly: true,
    },
  );

  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start ?? 0
      );
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      DEBUG.log(chalk.red(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`));
    } else {
      DEBUG.log(chalk.red(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")));
    }
  });

  log(`Generated delcarations for ${allFiles.length} files.`);
  log(chalk.green("✓ Build complete."));
};