import { constants, existsSync } from "fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "fs/promises";

import { dirname, extname, isAbsolute, resolve, resolve as resolvePath } from "path";
import { build as esbuild, transform, BuildOptions, Loader, TransformOptions, CommonOptions, Plugin, Format } from "esbuild";
import chalk from "chalk";
import { env } from "process";
import glob from "fast-glob";
import ora from "ora";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { createDebugLogger } from "debug-logging";
import { createShell } from "universal-shell";

import { getEmittedFile, getWorkingDirs } from "../../utils/cwd";
import { DEVELOPMENT_MODE, isJsOrTs, isTs, isTsxOrJsx } from "../../utils/resolve";
import { emitTsDeclarations } from "./lib/emitTsDeclarations";
import { getPackageJsonFile } from "../../utils/packageJson";
import { normalizeImportSpecifiers } from "../normalize";
import { readStdin } from "../../utils/stdin";
import { showProgress } from "../../utils/showProgress";
import { relativeExternsPlugin } from "../../specification/externs";
import { ESM_REQUIRE_SHIM, removeEsmShim } from "../../specification/removeEsmShim";

import { log } from "@tsmodule/log";

const REACT_IMPORTS = "import React from \"react\";\nimport ReactDOM from \"react-dom\";\n";

export const bannerLog = (msg: string) => {
  const logMsg = `  ${msg}  `;
  log(
    chalk.bgBlue(
      chalk.bold(chalk.white(logMsg)),
    ),
    [],
    {
      preLines: 1,
      postLines: 1,
    }
  );
};

export const bannerError = (msg: string) => {
  const logMsg = `  ${msg}  `;
  log(
    chalk.bgRed(
      chalk.bold(chalk.white(logMsg)),
    )
  );
};

const forceModuleTypeInDist = async (mode: Format = "esm") => {
  let distPkgJson;

  if (!existsSync("dist")) {
    await mkdir("dist");
  }

  if (existsSync("dist/package.json")) {
    distPkgJson = JSON.parse(await readFile("dist/package.json", "utf-8"));
  } else {
    distPkgJson = {};
  }

  switch (mode) {
    case "esm":
      distPkgJson.type = "module";
      break;

    case "cjs":
      distPkgJson.type = "commonjs";
      break;

    default:
      return false;
  }

  await writeFile(
    "dist/package.json",
    JSON.stringify(distPkgJson, null, 2)
  );

  return true;
};

const overwriteEntryPoint = (
  source: string,
  file: string,
  loader?: Loader
) => {
  file = resolvePath(file);
  const emittedFile = getEmittedFile(file);

  const config: BuildOptions = {
    stdin: {
      contents: source,
      sourcefile: file,
      resolveDir: dirname(file),
      loader,
    },

    outdir: undefined,
    outfile: emittedFile,
    splitting: false,
  };

  return config;
};

/**
 * Generate a Tailwind command that will build the given input stylesheet.
 * Add an import for standard styles.
 */
const buildCssEntryPoint = async (
  inputStyles: string,
  outputStyles: string,
  dev: boolean,
  // noStandardStyles: boolean,
) => {

  inputStyles = resolvePath(inputStyles);
  outputStyles = resolvePath(outputStyles);

  const twCmd = "yarn tailwindcss";
  const minify = dev ? "" : "--minify";
  const postcss = "--postcss postcss.config.cjs";

  const cmd = [twCmd, minify, postcss, `-i ${inputStyles}`, `-o ${outputStyles}`];

  if (existsSync(resolvePath(process.cwd(), "tailwind.config.cjs"))) {
    cmd.push("--config tailwind.config.cjs");
  }

  const shell = createShell({
    log: DEVELOPMENT_MODE,
    stdio: "ignore",
  });

  const cmdString = cmd.join(" ");
  const { code, stdout, stderr } = await shell.run(cmdString);
  if (code !== 0) {
    throw new Error(`Building CSS bundle exited with code ${code} for ${inputStyles}.\n\rTried running: ${cmdString}.\n\rError: ${stdout + stderr}`);
  }
};
export interface BuildArgs {
  input?: string;
  styles?: string;
  bundle?: boolean;
  standalone?: boolean;
  dev?: boolean;
  format?: Format;
  target?: string | string[];
  runtimeOnly?: boolean;
  jsOnly?: boolean;
  noWrite?: boolean;
  tsconfig?: string;
  // noStandardStyles?: boolean;
  stdin?: string;
  stdinFile?: string;
  external?: string[];
}

/**
 * Build TS to JS. This will contain incomplete specifiers like `./foo` which
 * could mean many things, all of which is handled by the loader which will
 * resolve them for us.
 */
export const build = async ({
  input = "src/**/*",
  styles = "src/components/index.css",
  target = "esnext",
  format = "esm",
  tsconfig = "tsconfig.json",
  dev = false,
  bundle = false,
  standalone = false,
  runtimeOnly = false,
  jsOnly = false,
  noWrite = false,
  stdin = undefined,
  stdinFile = undefined,
  external = [],
}: BuildArgs = {}) => {
  env.NODE_ENV = dev ? "development" : "production";
  const DEBUG = createDebugLogger(build);

  if (dev) {
    runtimeOnly = true;
  }

  if (standalone) {
    bundle = true;
  }

  const { cwd, srcDir, outDir } = getWorkingDirs();

  /**
   * Initialize build options, and inject PACKAGE_JSON for library builds.
   */
  const pkgJsonFile = await getPackageJsonFile();
  const pkgJson = JSON.parse(pkgJsonFile);

  const commonOptions: CommonOptions = {
    treeShaking: bundle,
    target,
    minify: !dev,
    /**
     * ESBuild upgrade blocked in order to preserve this override.
     *
     * @see https://github.com/evanw/esbuild/issues/2460
     */
    jsx: "transform",
    jsxFactory: "React.createElement",
    format,
    charset: "utf8",
    logLevel: dev ? "warning" : "error",
    define: {
      "process.env.NODE_ENV": dev ? JSON.stringify("development") : JSON.stringify("production"),
    },
  };

  const defaultExterns = ["esbuild", "*.png"];

  const plugins: Plugin[] = [];
  if (!standalone) {
    plugins.push(relativeExternsPlugin);
  }

  if (format === "cjs") {
    plugins.push(removeEsmShim);
  }

  let banner: BuildOptions["banner"] | undefined;
  if (bundle) {
    switch (format) {
      case "esm":
        banner = { "js": ESM_REQUIRE_SHIM };
        break;
    }
  }

  const buildOptions: BuildOptions = {
    ...commonOptions,
    tsconfig,
    bundle,
    splitting: format === "esm" && bundle && !stdin,
    absWorkingDir: cwd,
    outbase: "src",
    outdir: "dist",
    assetNames: "[name].js",
    format,
    target: "esnext",
    platform: pkgJson?.platform ?? "node",
    write: !noWrite,
    external: !bundle ? undefined : [...defaultExterns, ...external],
    banner,
    plugins,
  };

  DEBUG.log("Build options", buildOptions);

  let stdinSource = "";
  if (stdin) {
    DEBUG.log("Building file from stdin", { stdin, stdinFile, noWrite });

    if (!stdinFile) {
      log(chalk.red("ERROR: --stdin-file must be specified to emulate a file location when using stdin."));
      process.exit(1);
    }

    if (typeof stdin === "string" && stdin.length) {
      stdinSource = stdin;
    } else {
      stdinSource = await readStdin();
    }

    const transformOptions: TransformOptions = {
      ...commonOptions,
      sourcefile: stdinFile,
      loader: "tsx",
      banner: undefined,
      footer: undefined,
    };

    if (noWrite) {
      const build = await transform(stdinSource, transformOptions);
      return build.code;
    } else {
      const stdinBuildConfig = overwriteEntryPoint(stdinSource, stdinFile, "tsx");
      await showProgress(
        async () => await esbuild({
          ...buildOptions,
          ...stdinBuildConfig,
        }),
        {
          start: "Building stdin to dist/.",
          success: "Built stdin to dist/.",
          error: "Error building stdin to dist/.",
        }
      );

      log(chalk.grey("Use --no-write to print to stdout instead."));
      return;
    }
  }

  DEBUG.log("Building", { files: input, dev, runtimeOnly });
  bannerLog(`${chalk.bold("TS Module")} [${env.NODE_ENV}]`);

  /**
   * All files for the build. Ignore .d.ts files.
   */
  const allFiles =
    glob
      .sync(input, { cwd })
      .filter((file) => extname(file) !== ".d.ts")
      .map((file) => resolvePath(file));

  if (isAbsolute(input)) {
    /**
     * fast-glob won't pick up absolute filepaths on Windows. Windows sucks.
     */
    if (!allFiles.length) {
      allFiles.push(input);
    }

    const outfile =
      input
        .replace(srcDir, outDir)
        .replace(isTs, ".js")
        .replace(isTsxOrJsx, ".js");

    DEBUG.log("Cleaning emitted file:", { outfile });
    await rm(outfile, { force: true });
  } else {
    DEBUG.log("Cleaning old output:", { outDir });
    await rm(outDir, { force: true, recursive: true });
  }

  /**
   * TSX/JSX files to compile.
   */
  const tsxJsxInput =
    allFiles
      .filter((file) => isTsxOrJsx.test(file));

  DEBUG.log("Compiling TSX files:", { tsxJsxInput });
  const compilableTsxFiles = tsxJsxInput.filter((file) => !file.endsWith(".d.ts"));

  await showProgress(
    async () => await Promise.all(
      compilableTsxFiles.map(
        async (tsxFile) => {
          /**
          * Prepend the necessary createElement import to the TSX source.
          */
          const tsxFileContents = await readFile(tsxFile, "utf-8");
          const runtimeCode = REACT_IMPORTS + tsxFileContents;

          const tsxConfig = overwriteEntryPoint(runtimeCode, tsxFile, "tsx");
          await esbuild({
            ...buildOptions,
            ...tsxConfig,
          });
        }
      )
    ),
    {
      start: "Compiling TSX files.",
      success: "Compiled TSX files.",
      error: "Failed to compile TSX files.",
    }
  );

  /**
   * Compile TS files.
   */
  const tsJsInput =
    allFiles
      .filter((file) => isTs.test(file))
      .filter((file) => !isTsxOrJsx.test(file));

  DEBUG.log("Compiling TS files:", { tsJsInput });
  await showProgress(
    async () => await esbuild({
      ...buildOptions,
      entryPoints: tsJsInput.filter((file) => !file.endsWith(".d.ts")),
    }),
    {
      start: "Compiling TS/JS files.",
      success: "Compiled TS/JS files.",
      error: "Failed to compile TS/JS files.",
    },
  );

  /**
   * Non JS/TS files.
   */
  const nonTsJsInput = allFiles.filter((file) => !isJsOrTs.test(file));

  await showProgress(
    async () => {
      for (const file of nonTsJsInput) {
        const emittedFile = getEmittedFile(file);
        DEBUG.log("Copying non-source file:", { file, emittedFile });

        await mkdir(dirname(emittedFile), { recursive: true });
        await copyFile(file, emittedFile, constants.COPYFILE_FICLONE);
      }
    },
    {
      start: "Copying non-source files to dist/.",
      success: "Copied non-source files to dist/.",
      error: "Failed to copy non-source files to dist/.",
    },
  );

  /**
   * Rewrite import specifiers in emitted output.
   */
  if (!process.env.NO_REWRITES) {
    const emittedJs =
      input
        .replace(srcDir, outDir)
        .replace(/^(\.\/)?src\//, "dist/")
        .replace(isTs, ".js")
        .replace(isTsxOrJsx, ".js");

    DEBUG.log("Normalizing import specifiers in emitted JS.", { emittedJs });

    await showProgress(
      async () => await normalizeImportSpecifiers(
        emittedJs.endsWith(".js") ? emittedJs : `${emittedJs}.js`
      ),
      {
        start: "Normalizing import specifiers.",
        success: "Normalized import specifiers.",
        error: "Failed to normalize import specifiers.",
      }
    );

    await normalizeImportSpecifiers(
      emittedJs.endsWith(".js") ? emittedJs : `${emittedJs}.js`
    );
  }

  /**
   * Ensure that the dist/ package.json has { type: module }.
   *
   * @see https://github.com/vercel/next.js/pull/33637
   * @see https://github.com/timneutkens/next.js/blob/99dceb60faae6b00faed75db795ef24107934227/packages/next/build/index.ts#L537-L540
   */
  const rewrotePkgJson = await forceModuleTypeInDist(format);
  if (rewrotePkgJson) {
    ora({
      text: "Forced \"type\" package.json field in dist.",
      indent: 2,
    }).succeed();
  }

  if (runtimeOnly) {
    return;
  }

  /**
   * Build project styles.
   */
  if (!jsOnly) {
    if (existsSync(resolve(styles))) {
      DEBUG.log("Building styles for production.");
      const { style: bundleOutput = "./dist/bundle.css" } = pkgJson;

      /**
       * Build style bundle.
       */
      DEBUG.log("Building style bundle.", { bundleInput: styles, bundleOutput, dev });
      await showProgress(
        async () => await buildCssEntryPoint(
          styles,
          bundleOutput,
          dev,
          // noStandardStyles
        ),
        {
          start: "Bundling styles with Tailwind.",
          success: "Bundled styles with Tailwind.",
          error: "Failed to bundle styles.",
        },
      );

      /**
     * If using -b bundle mode, bundle copied styles in-place.
     */
      if (bundle) {
        DEBUG.log("Bundling all styles.");
        const cssFiles = glob.sync("dist/**/*.css");

        await showProgress(
          async () => await Promise.all(
            cssFiles.map(
              async (file) => await buildCssEntryPoint(
                file,
                file,
                dev,
                // noStandardStyles,
              )
            )
          ),
          {
            start: "Bundling emitted styles",
            success: `Bundled all styles to ${chalk.bold(bundleOutput)}.`,
            error: "Failed to bundle styles.",
          },
        );
      }
    } else {
      log();
      log(chalk.grey("Bundle styles not found for this project."));
      log("Checked: " + chalk.bold(styles));
      log();
    }
  }

  bannerLog("Running post-build setup.");

  await showProgress(
    async () => await emitTsDeclarations(),
    {
      start: "Generating type declarations.",
      success: `Generated declarations for ${allFiles.length} files.`,
      error: "Failed to generate type declarations.",
    },
  );

  log();
  log("Build complete.", ["green"]);
};

export const buildCommand = async (input?: string, options?: BuildArgs) => {
  return await build({
    input,
    ...options,
  });
};