import { Plugin as RollupPlugin, rollup } from "rollup";
import { dirname, extname, isAbsolute, relative, resolve as resolvePath } from "path";
import { build as esbuild, BuildOptions } from "esbuild";
import { readFile, rm } from "fs/promises";
import chalk from "chalk";
import glob from "fast-glob";
import { pathToFileURL } from "url";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore No types available for this plugin.
import shebang from "rollup-plugin-preserve-shebang";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { debugLog } from "../utils/log.js";
import { resolve } from "../loader/index.js";

/**
 * Remove `file://` prefix from a path if it exists.
 */
const forceUnixPath = (path: string) => {
  return path.replace("file://", "");
};

/**
 * Get a Unix-like relative path from a URL.
 */
const getRelativePath = (baseUrl: string, path: string) => {
  const relativePath = relative(baseUrl, forceUnixPath(path));
  return (
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
  debugLog({ importStatement, importToReplace, importReplacement });
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
  return {
    name: "Rewrite imports",
    renderChunk: async (code: string, chunk, options) => {
      for (const importedChunk of chunk.imports) {
        /**
         * If no absolute module ID, bail.
         */
        const input = chunk.facadeModuleId;
        if (!input) continue;
        /**
         * Just a named module. Skip.
         */
        if (!importedChunk.includes("/")) {
          debugLog(`- Skipping named module: ${importedChunk}`);
          continue;
        }

        if (extname(importedChunk)) {
          /**
           * Full import specifiers (are absolute and have file extensions) are
           * never rewritten.
           */
          if (isAbsolute(importedChunk)) {
            debugLog(`Ignoring absolute specifier: ${importedChunk}`);
            continue;
          }
          /**
           * Otherwise, just a package ending in `.js` or something, or some
           * other incomplete specifier that must be resolved.
           */
        }
        /**
         * The base directory from which all relative imports in this entry
         * are resolved.
         */
        const baseDir = dirname(input);
        let importToReplace = importedChunk;
        /**
         * Rewrite remaining absolute specifiers relative to baseDir for
         * replacement.
         */
        if (isAbsolute(importedChunk)) {
          debugLog(`Rewriting partial specifier: ${importedChunk}`);
          importToReplace = getRelativePath(baseDir, importedChunk);
        }
        debugLog({ importToReplace });
        /**
         * Read the matched import/require statements and replace them.
         */
        const importMatch = importPattern(importToReplace);
        const importStatements = code.match(importMatch) ?? [];
        /**
         * Attempt to replace the specifier for each import statement.
         */
        for (const importStatement of importStatements) {
          if (options.file) {
            const parentURL = pathToFileURL(resolvePath(input)).href;
            /**
             * Resolve the specifier to a module and URL using the internal
             * loader.
             */
            const resolvedImport = await resolve(
              importedChunk,
              {
                parentURL,
                conditions: [ "node", "import", "node-addons" ]
              },
              async (url) => await import(url),
            );
            debugLog({ resolvedImport });
            /**
             * Rewrite import identifiers for seamless CJS support. Ignore
             * dynamic imports.
             */
            if (resolvedImport.url) {
              const unixLikePath = resolvedImport.url.replace("file://", "");
              debugLog({ importedChunk, parentURL, unixLikePath });
              /**
               * The import statement with the unresolved import replaced with
               * its resolved specifier.
               */
              const rewrittenImport = rewriteImport(
                importStatement,
                importToReplace,
                getRelativePath(baseDir, unixLikePath),
              );
              /**
               * Replace the import in the code.
               */
              debugLog({ input, importStatement, rewrittenImport });
              code = code.replace(importStatement, rewrittenImport);
            }
          }
        }
      }
      
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
  try {
    if (production) {
      debugLog(chalk.grey("Building for production..."));
    }
    /**
     * Initialize build options, and inject PACKAGE_JSON for library builds.
     */
    const cwd = process.cwd();
    const pkgJsonFile = resolvePath(cwd, "package.json");
    const pkgJson = await readFile(pkgJsonFile, "utf-8");
    const shared: BuildOptions = {
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
    await rm(distDir, { force: true, recursive: true });
    /**
     * TS files to compile.
     */
    const tsFiles = await glob("src/**/*.ts", { cwd });
    await esbuild({
      ...shared,
      entryPoints: tsFiles.filter((file) => !file.endsWith(".d.ts")),
    });
    /**
     * TSX files to compile.
     */
    const tsxFiles = await glob("src/**/*.tsx", { cwd });
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
  const filesToOptimize = await glob("dist/**/*.js");
  await Promise.all(
    filesToOptimize.map(
      async (file) => {
        debugLog("Optimizing", file);
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
    )
  );
};