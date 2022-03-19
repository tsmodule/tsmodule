import { dirname, extname, isAbsolute, resolve, resolve as resolvePath } from "path";
import { build as esbuild, transform, BuildOptions, Loader, TransformOptions, CommonOptions } from "esbuild";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import chalk from "chalk";
import { env } from "process";
import glob from "fast-glob";
import ora from "ora";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { createDebugLogger, log } from "create-debug-logger";
import { isJsOrTs, isTs, isTsxOrJsx } from "../../utils/resolve";
import { createShell } from "await-shell";
import { emitTsDeclarations } from "./lib/emitTsDeclarations";
import { normalizeImportSpecifiers } from "../normalize";

import { getEmittedFile, getWorkingDirs } from "../../utils/cwd";
import { getPackageJsonFile } from "../../utils/pkgJson";
import { readStdin } from "../../utils/stdin";

const REACT_IMPORTS = "import React from \"react\";\nimport ReactDOM from \"react-dom\";\n";

export const bannerLog = (msg: string) => {
  const logMsg = `  ${msg}  `;
  log(
    chalk.bgBlue(
      chalk.bold(chalk.white(logMsg)),
    )
  );
};

const forceTypeModuleInDist = () => {
  let distPkgJson;
  if (existsSync("dist/package.json")) {
    distPkgJson = JSON.parse(readFileSync("dist/package.json", "utf-8"));
  } else {
    distPkgJson = {};
  }

  if (distPkgJson?.module === "module") {
    return true;
  }

  distPkgJson.type = "module";
  writeFileSync("dist/package.json", JSON.stringify(distPkgJson, null, 2));
};

const singleEntryPointConfig = (
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
    outfile: emittedFile
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
  noStandardStyles: boolean,
) => {

  inputStyles = resolvePath(inputStyles);
  outputStyles = resolvePath(outputStyles);

  const twCmd = "npx tailwindcss";
  const minify = dev ? "" : "-m";
  const postcss = "--postcss postcss.config.js";

  const inputCss = readFileSync(inputStyles, "utf-8");
  const header = "@import \"@tsmodule/react\";\n\n";
  const outputCss = noStandardStyles ? inputCss : `${header}${inputCss}`;

  const rewrittenInput = getEmittedFile(inputStyles);
  writeFileSync(rewrittenInput, outputCss);

  const cmd = [twCmd, minify, postcss, `-i ${rewrittenInput}`, "-o", outputStyles];
  const shell = createShell({
    log: false,
    stdio: "ignore",
  });

  await shell.run(cmd.join(" "));
};

interface BuildArgs {
  files?: string;
  styles?: string;
  bundle?: boolean;
  dev?: boolean;
  target?: string | string[];
  runtimeOnly?: boolean;
  noWrite?: boolean;
  noStandardStyles?: boolean;
  stdin?: string;
  stdinFile?: string;
}

/**
 * Build TS to JS. This will contain incomplete specifiers like `./foo` which
 * could mean many things, all of which is handled by the loader which will
 * resolve them for us.
 */
export const build = async ({
  files = "src/**/*",
  styles: bundleInput = "src/components/index.css",
  bundle = false,
  dev = false,
  target = "esnext",
  runtimeOnly = false,
  noWrite = false,
  noStandardStyles = false,
  stdin,
  stdinFile,
}: BuildArgs) => {
  env.NODE_ENV = dev ? "development" : "production";
  const DEBUG = createDebugLogger(build);

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
    jsx: "transform",
    jsxFactory: "React.createElement",
    format: "esm",
    charset: "utf8",
    logLevel: dev ? "warning" : "error",
    define: {
      PACKAGE_JSON: pkgJsonFile,
      "process.env.NODE_ENV": dev ? JSON.stringify("development") : JSON.stringify("production"),
    },
  };

  const buildOptions: BuildOptions = {
    ...commonOptions,
    bundle,
    absWorkingDir: cwd,
    outbase: "src",
    outdir: "dist",
    assetNames: "[name].js",
    format: "esm",
    target: "esnext",
    platform: pkgJson?.platform ?? "node",
    write: !noWrite,
  };

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
      const stdinBuildConfig = singleEntryPointConfig(stdinSource, stdinFile, "tsx");
      return await esbuild({
        ...buildOptions,
        ...stdinBuildConfig,
      });
    }
  }

  DEBUG.log("Building", { files, dev, runtimeOnly });
  bannerLog(`${chalk.bold("TS Module")} [${env.NODE_ENV}]`);

  /**
   * All files for the build. Ignore .d.ts files.
   */
  const allFiles =
    glob
      .sync(files, { cwd })
      .filter((file) => extname(file) !== ".d.ts")
      .map((file) => resolvePath(file));

  if (isAbsolute(files)) {
    /**
     * fast-glob won't pick up absolute filepaths on Windows. Windows sucks.
     */
    if (!allFiles.length) {
      allFiles.push(files);
    }

    const outfile =
      files
        .replace(srcDir, outDir)
        .replace(isTs, ".js")
        .replace(isTsxOrJsx, ".js");

    DEBUG.log("Cleaning emitted file:", { outfile });
    rmSync(outfile, { force: true });
  } else {
    DEBUG.log("Cleaning old output:", { outDir });
    rmSync(outDir, { force: true, recursive: true });
  }

  // eslint-disable-next-line no-console
  console.log();


  /**
   * TSX files to compile.
   */
  const tsxFiles =
    allFiles
      .filter((file) => isTsxOrJsx.test(file));

  DEBUG.log("Compiling TSX files:", { tsxFiles });
  const compilableTsxFiles = tsxFiles.filter((file) => !file.endsWith(".d.ts"));

  await Promise.all(
    compilableTsxFiles.map(
      async (tsxFile) => {
        /**
        * Prepend the necessary createElement import to the TSX source.
        */
        const tsxFileContents = readFileSync(tsxFile, "utf-8");
        const runtimeCode = REACT_IMPORTS + tsxFileContents;

        const jsxConfig = singleEntryPointConfig(runtimeCode, tsxFile, "tsx");
        await esbuild({
          ...buildOptions,
          ...jsxConfig,
        });
      }
    )
  );

  ora("Built TSX files.").succeed();


  /**
   * Compile TS files.
   */
  const tsFiles =
    allFiles
      .filter((file) => isTs.test(file))
      .filter((file) => !isTsxOrJsx.test(file));

  DEBUG.log("Compiling TS files:", { tsFiles });
  await esbuild({
    ...buildOptions,
    entryPoints: tsFiles.filter((file) => !file.endsWith(".d.ts")),
  });

  ora("Built TS files.").succeed();

  /**
   * Non JS/TS files.
   */
  const nonJsTsFiles = allFiles.filter((file) => !isJsOrTs.test(file));

  DEBUG.log("Copying non-JS/TS files.", { allFiles, nonJsTsFiles });
  await Promise.all(
    nonJsTsFiles.map(async (file) => {
      const emittedFile = getEmittedFile(file);
      DEBUG.log("Copying non-source file:", { file, emittedFile });

      mkdirSync(dirname(emittedFile), { recursive: true });
      writeFileSync(
        emittedFile,
        readFileSync(file),
        { encoding: "binary", flag: "w" }
      );
    })
  );

  /**
   * Rewrite import specifiers in emitted output.
   */
  if (!process.env.NO_REWRITES) {
    const emittedJs =
      files
        .replace(srcDir, outDir)
        .replace(/^(\.\/)?src\//, "dist/")
        .replace(isTs, ".js")
        .replace(isTsxOrJsx, ".js");

    DEBUG.log("Normalizing import specifiers in emitted JS.", { emittedJs });

    await normalizeImportSpecifiers(
      emittedJs.endsWith(".js") ? emittedJs : `${emittedJs}.js`
    );

    ora("Normalized import specifiers.").succeed();
  }

  /**
   * Ensure that the dist/ package.json has { type: module }.
   *
   * @see https://github.com/vercel/next.js/pull/33637
   * @see https://github.com/timneutkens/next.js/blob/99dceb60faae6b00faed75db795ef24107934227/packages/next/build/index.ts#L537-L540
   */
  const rewrotePkgJson = forceTypeModuleInDist();
  if (rewrotePkgJson) {
    ora("Forced \"type\": \"module\" in output.").succeed();
  }

  if (dev || runtimeOnly) {
    return;
  }

  /**
   * Build project styles.
   */
  if (existsSync(resolve(bundleInput))) {
    DEBUG.log("Building styles for production.");
    const { style: bundleOutput = "./dist/bundle.css" } = pkgJson;

    /**
     * Build style bundle.
     */
    DEBUG.log("Building style bundle.", { bundleInput, bundleOutput, dev, noStandardStyles });
    await buildCssEntryPoint(
      bundleInput,
      bundleOutput,
      dev,
      noStandardStyles
    );

    /**
     * If using -b bundle mode, bundle copied styles in-place.
     */
    if (bundle) {
      DEBUG.log("Bundling all styles.");
      const cssFiles = glob.sync("dist/**/*.css");

      const message = ora("Bundled emitted styles.").start();
      await Promise.all(
        cssFiles.map(
          async (file) => await buildCssEntryPoint(
            file,
            file,
            dev,
            noStandardStyles,
          )
        )
      );
      message.succeed();
    }

    ora(`Bundled all styles to ${chalk.bold(bundleOutput)}.`).succeed();
  } else {
    log(chalk.grey("Bundle styles not found for this projected. Checked:"), { styles: bundleInput });
  }

  bannerLog("Running post-build setup.");

  log("Generating type declarations.\nThis might take a moment.");
  emitTsDeclarations(allFiles);
  ora(`Generated delcarations for ${allFiles.length} files.`).succeed();

  log(chalk.green("Build complete."));
};