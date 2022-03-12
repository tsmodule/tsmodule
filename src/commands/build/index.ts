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

import { getPackageJsonFile } from "../../utils/pkgJson";
import { getWorkingDirs } from "../../utils/cwd";
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
  const { srcDir, outDir } = getWorkingDirs();
  file = resolvePath(file);

  const config: BuildOptions = {
    stdin: {
      contents: source,
      sourcefile: file,
      resolveDir: dirname(file),
      loader,
    },
    outdir: undefined,
    outfile: file.replace(isJsOrTs, ".js").replace(srcDir, outDir)
  };

  return config;
};

/**
 * Build TS to JS. This will contain incomplete specifiers like `./foo` which
 * could mean many things, all of which is handled by the loader which will
 * resolve them for us.
 */
export const build = async ({
  files = "src/**/*",
  styles = "src/styles/components/index.css",
  bundle = false,
  dev = false,
  runtimeOnly = false,
  noWrite = false,
  stdin = "",
  stdinFile = "",
}) => {
  env.NODE_ENV = dev ? "development" : "production";
  const DEBUG = createDebugLogger(build);
  const shell = createShell();

  const { cwd, srcDir, outDir } = getWorkingDirs();

  /**
   * Initialize build options, and inject PACKAGE_JSON for library builds.
   */
  const pkgJsonFile = await getPackageJsonFile();
  const pkgJson = JSON.parse(pkgJsonFile);

  const commonOptions: CommonOptions = {
    treeShaking: bundle,
    logLevel: dev ? "warning" : "error",
    charset: "utf8",
    format: "esm",
    target: "esnext",
    minify: !dev,
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
    DEBUG.log("Building file from stdin", { stdin, stdinFile });

    if (!noWrite && !stdinFile) {
      log(chalk.red("ERROR: --stdin-file must be specified when using stdin in write mode."));
      process.exit(1);
    }

    if (typeof stdin === "string" && stdin.length) {
      stdinSource = stdin;
    } else {
      stdinSource= await readStdin();
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
      console.log({ build })
      return build.code;
    } else {
      const stdinBuildConfig = singleEntryPointConfig(stdinSource, stdinFile, "tsx");
      await esbuild({
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
          jsxFactory: "React.createElement",
        });
      }
    )
  );

  ora("Built TSX files.").succeed();

  /**
   * Non JS/TS files.
   */
  const nonJsTsFiles = allFiles.filter((file) => !isJsOrTs.test(file));

  DEBUG.log("Copying non-JS/TS files.", { allFiles, nonJsTsFiles });
  await Promise.all(
    nonJsTsFiles.map(async (file) => {
      const outfile =
        resolve(cwd, file)
          .replace(srcDir, outDir)
          .replace(isTs, ".js")
          .replace(isTsxOrJsx, ".js");

      DEBUG.log("Copying non-source file:", { file, outfile });

      mkdirSync(dirname(outfile), { recursive: true });

      writeFileSync(
        outfile,
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

  // eslint-disable-next-line no-console
  console.log();

  if (dev || runtimeOnly) {
    return;
  }

  if (existsSync(resolve(styles))) {
    DEBUG.log("Building styles for production.");
    const { style = "./dist/styles.css" } = pkgJson;

    const twCmd = "npx tailwindcss";
    const minify = dev ? "" : "-m";
    const postcss = "--postcss postcss.config.js";

    const cmd = [twCmd, minify, postcss, `-i ${styles}`, "-o", style];

    await shell.run(cmd.join(" "));
  } else {
    DEBUG.log("Styles not found.", { styles });
  }

  bannerLog("Running post-build setup.");

  log("Generating type declarations.\nThis might take a moment.");
  emitTsDeclarations(allFiles);
  ora(`Generated delcarations for ${allFiles.length} files.`).succeed();

  log(chalk.green("Build complete."));
};