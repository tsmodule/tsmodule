import { Plugin as RollupPlugin, rollup } from "rollup";
import { dirname, extname, isAbsolute, relative, resolve as resolvePath } from "path";
import { build as esbuild, BuildOptions } from "esbuild";
import { readFile, rm } from "fs/promises";
import chalk from "chalk";
import glob from "fast-glob";
import {  pathToFileURL } from "url";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore No types available for this plugin.
import shebang from "rollup-plugin-preserve-shebang";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { createDebugLogger, forceUnixPath, log } from "../utils/index.js";
import { resolve } from "../loader/index.js";

/**
 * Get a Unix-like relative path from a URL.
 */
const getRelativePath = (fromURL: string, toURL: string) => {
  const relativePath = relative(fromURL, toURL);
  return forceUnixPath(
    relativePath.startsWith(".")
      ? relativePath
      : `./${relativePath}`
  );
};

/**
 * Matches a complete import statement, including the import keyword, as well as
 * dynamic imports and requires.
 */
export const importPattern = (importSource: string) => {
  const exprBreak = "[^\n\r;]*";
  const escaped = importSource.replace(".", "\\.").replace("/", "\\/");
  const padded = `${exprBreak}["']${escaped}["']${exprBreak}`;

  const importFrom = `(import${exprBreak}from)`;
  const dynamicImport = `(import|require)${exprBreak}\\(`;
  const exportFrom = `(export${exprBreak}from)`;
  return new RegExp(
    `(${importFrom}|${dynamicImport}|${exportFrom})${padded}`,
    "g",
  );
};

/**
 * Rewrite an import/export/require statement.
 */
export const rewriteImport = (
  importStatement: string,
  importToReplace: string,
  importReplacement: string,
) => {
  const DEBUG = createDebugLogger(rewriteImport);
  DEBUG.log("Rewriting import", {
    importStatement, importToReplace, importReplacement
  });

  const [, sourcePart] = importStatement.split(/from|\(/);
  const rewrittenSource = sourcePart
    .replace(importToReplace, importReplacement)
    .trim();

  return importStatement.replace(sourcePart, rewrittenSource);
};

/**
 * A Rollup plugin which rewrites all the imports in a chunk with the specifiers
 * resolved by the TSM loader.
 */
export const rewriteImports: () => RollupPlugin = () => {
  const DEBUG = createDebugLogger(rewriteImports);
  DEBUG.log("Rewriting imports in emitted JS.");

  return {
    name: "Rewrite imports",
    renderChunk: async (code: string, chunk, options) => {
      DEBUG.group();
      for (const importedChunk of chunk.imports) {
        /**
         * If no absolute module ID, bail.
         */
        if (!chunk.facadeModuleId) continue;
        const resolvedEntryPoint = resolvePath(chunk.facadeModuleId);
        const entryPointURL = pathToFileURL(resolvedEntryPoint).href;
        DEBUG.log(
          "Resolving specifier from entry point.",
          { entryPointURL, importedChunk }
        );
        /**
         * Just a named module. Skip.
         */
        if (!importedChunk.startsWith(".") && !isAbsolute(importedChunk)) {
          DEBUG.log("Skipping named module.", { importedChunk });
          continue;
        }

        if (extname(importedChunk)) {
          /**
           * Full import specifiers (are absolute and have file extensions) are
           * never rewritten.
           */
          if (isAbsolute(importedChunk)) {
            DEBUG.log("Skipping absolute specifier.", { importedChunk });
            continue;
          }
          /**
           * Otherwise, just a package ending in `.js` or something, or some
           * other incomplete specifier that must be resolved.
           */
        }
        /**
         * A URL from which all relative imports in this entry are resolved.
         */
        const baseURL = dirname(entryPointURL);
        let importToReplace = importedChunk;
        /**
         * Rewrite remaining absolute specifiers relative to baseURL for
         * replacement.
         */
        if (isAbsolute(importedChunk)) {
          const importedFileURL = pathToFileURL(importedChunk).href;
          DEBUG.log(
            "Rewriting partial specifier",
            { importedChunk, importedFileURL, baseURL  }
          );
          importToReplace = getRelativePath(baseURL, importedFileURL);
        }
        /**
         * Normalize the import paths (for Windows support).
         */
        importToReplace = forceUnixPath(importToReplace);
        /**
         * Read the matched import/require statements and replace them.
         */
        const importMatch = importPattern(importToReplace);
        const importStatements = code.match(importMatch) ?? [];
        DEBUG.log(
          "Replacing import statements.",
          { baseURL, importToReplace, importStatements }
        );
        /**
         * Attempt to replace the specifier for each import statement.
         */
        for (const importStatement of importStatements) {
          DEBUG.group();
          if (options.file) {
            /**
             * Resolve the specifier to a module and URL using the internal
             * loader.
             */
            const resolvedImport = await resolve(
              importedChunk,
              {
                parentURL: entryPointURL,
                conditions: [ "node", "import", "node-addons" ]
              },
              async (url) => await import(url),
            );
            DEBUG.log(
              "Resolved import with TSM resolve().",
              { resolvedImport }
            );
            /**
             * Rewrite the specifier to the resolved URL.
             */
            const resolvedImportURL = resolvedImport.url;
            if (resolvedImportURL) {
              DEBUG.log(
                "Rewriting import statement.",
                { importedChunk, entryPointURL, resolvedImportURL, baseURL }
              );
              /**
               * The import statement with the unresolved import replaced with
               * its resolved specifier.
               */
              const rewrittenImport = rewriteImport(
                importStatement,
                importToReplace,
                getRelativePath(baseURL, resolvedImport.url),
              );
              /**
               * Replace the import in the code.
               */
              DEBUG.log(
                "Performing specifier rewrite.",
                { entryPointURL, importStatement, rewrittenImport }
              );
              code = code.replace(importStatement, rewrittenImport);
            }
          }
          DEBUG.groupEnd();
        }
      }
      DEBUG.groupEnd();

      return {
        code,
        sourcemap: false,
      };
    },
  };
};
/**
 * Build TS to JS. This will contain incomplete specifiers like `./foo` which
 * could mean many things, all of which is handled by the loader which will
 * resolve them for us.
 */
export const build = async (production = false) => {
  const DEBUG = createDebugLogger(build);
  try {
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
      outbase: "src",
      outdir: "dist",
      assetNames: "[name].js",
      logLevel: production ? "info" : "debug",
      charset: "utf8",
      target: "es2021",
      minify: production,
      define: {
        PACKAGE_JSON: pkgJson,
      },
    };
    /**
     * Clean old output.
     */
    const distDir = resolvePath(cwd, "dist");
    DEBUG.log("Cleaning old output.", { distDir });
    await rm(distDir, { force: true, recursive: true });
    /**
     * TS files to compile.
     */
    const tsFiles = await glob("src/**/*.ts", { cwd });
    DEBUG.log("Compiling TS files.", { tsFiles });
    await esbuild({
      ...shared,
      entryPoints: tsFiles.filter((file) => !file.endsWith(".d.ts")),
    });
    /**
     * TSX files to compile.
     */
    const tsxFiles = await glob("src/**/*.tsx", { cwd });
    DEBUG.log("Compiling TSX files.", { tsxFiles });
    await esbuild({
      ...shared,
      entryPoints: tsxFiles.filter((file) => !file.endsWith(".d.ts")),
      jsxFactory: "_jsx",
      banner: {
        js: "import {jsx as _jsx} from 'react/jsx-runtime.js';\n",
      },
    });
    /**
     * Run the post-build process and resolve import specifiers in output.
     */
    await postBuild();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
};

/**
 * Finally, rewrite imports in the emitted JS to ESM-compliant paths.
 */
export const postBuild = async () => {
  const DEBUG = createDebugLogger(postBuild);
  const filesToOptimize = await glob("dist/**/*.js");
  DEBUG.log("Optimizing emitted JS.", { filesToOptimize });

  for (const file of filesToOptimize) {
    DEBUG.log("Optimizing file.", { file });

    const build = await rollup({
      input: file,
      /**
       * Mark all imports other than this entry point as external (do not
       * bundle).
       */
      external: (id: string) => id !== file,
      plugins: [
        /**
         * Leave #!/usr/bin/env shebangs.
         */
        shebang(),
        /**
         * Rewrite import specifiers using the internal loader.
         */
        rewriteImports()
      ],
      /**
       * Suppress warnings about empty modules.
       */
      onwarn: () => void 0,
    });
    /**
     * Write the spec-compliant ES module output.
     */
    await build.write({
      file,
      format: "esm",
    });
  }
};