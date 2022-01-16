import { dirname, extname, isAbsolute, relative, resolve as resolvePath } from "path";
import { build as esbuild, BuildOptions } from "esbuild";
import { readFile, rm } from "fs/promises";
import { Plugin as RollupPlugin } from "rollup";
import chalk from "chalk";
import glob from "fast-glob";
import {  pathToFileURL } from "url";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { createDebugLogger, normalizeSpecifier, log } from "../utils/index.js";
import { normalizeImportSpecifiers } from "./normalize.js";
import { resolve } from "../loader/index.js";

/**
 * Get a Unix-like relative path from a URL.
 */
const toRelativeSpecifier = (fromURL: string, toURL: string) => {
  const relativePath = relative(fromURL, toURL);
  return normalizeSpecifier(
    relativePath.startsWith(".")
      ? relativePath
      : `./${relativePath}`
  );
};

/**
 * Matches a complete import statement, including the import keyword, as well as
 * dynamic imports, requires, and export statements.
 */
export const generateImportPattern = (importSource: string) => {
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
export const rewriteImportStatement = (
  importStatement: string,
  specifierToReplace: string,
  specifierReplacement: string,
) => {
  const DEBUG = createDebugLogger(rewriteImportStatement);
  DEBUG.log("Rewriting import", {
    importStatement, specifierToReplace, specifierReplacement
  });

  const [, sourcePart] = importStatement.split(/from|\(/);
  const rewrittenSource = 
    sourcePart
      .replace(specifierToReplace, specifierReplacement)
      .trim();

  return importStatement.replace(sourcePart, rewrittenSource);
};

/**
 * A Rollup plugin which rewrites all the imports in a chunk with the specifiers
 * resolved by the TSM loader.
 */
export const rewriteImportSpecifiersPlugin: () => RollupPlugin = () => {
  const DEBUG = createDebugLogger(rewriteImportSpecifiersPlugin);
  DEBUG.log("Normalizing JS module specifiers.");

  return {
    name: "Rewrite imports",
    renderChunk: async (code: string, chunk, options) => {
      DEBUG.group();
      for (const moduleSpecifier of chunk.imports) {
        /**
         * If no absolute module ID, bail.
         */
        if (!chunk.facadeModuleId) continue;
        const resolvedEntryPoint = resolvePath(chunk.facadeModuleId);
        const entryPointURL = pathToFileURL(resolvedEntryPoint).href;
        DEBUG.log(
          "Resolving specifier from entry point:",
          { entryPointURL, moduleSpecifier }
        );
        /**
         * Just a named module. Skip.
         */
        if (!moduleSpecifier.startsWith(".") && !isAbsolute(moduleSpecifier)) {
          DEBUG.log("Skipping named module:", { moduleSpecifier });
          continue;
        }

        if (extname(moduleSpecifier)) {
          /**
           * Full import specifiers (are absolute and have file extensions) are
           * never rewritten.
           */
          if (isAbsolute(moduleSpecifier)) {
            DEBUG.log("Skipping absolute specifier:", { moduleSpecifier });
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
        let specifierToReplace = moduleSpecifier;
        /**
         * Rewrite remaining absolute specifiers relative to baseURL for
         * replacement.
         */
        if (isAbsolute(moduleSpecifier)) {
          const moduleURL = pathToFileURL(moduleSpecifier).href;
          DEBUG.log(
            "Rewriting partial specifier:",
            { moduleSpecifier, moduleURL, baseURL  }
          );
          specifierToReplace = toRelativeSpecifier(baseURL, moduleURL);
        }
        /**
         * Normalize the import paths (for Windows support).
         */
        specifierToReplace = normalizeSpecifier(specifierToReplace);
        /**
         * Read the matched import/require statements and replace them.
         */
        const importMatch = generateImportPattern(specifierToReplace);
        const importStatements = code.match(importMatch) ?? [];
        DEBUG.log(
          "Replacing import statements.",
          { baseURL, specifierToReplace, importStatements }
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
            const resolvedModule = await resolve(
              moduleSpecifier,
              {
                parentURL: entryPointURL,
                conditions: [ "node", "import", "node-addons" ]
              },
              async (url) => await import(url),
            );
            DEBUG.log(
              "Resolved import with TSM resolve().",
              { resolvedModule }
            );
            /**
             * Rewrite the specifier to the resolved URL.
             */
            const resolvedModuleURL = resolvedModule.url;
            if (resolvedModuleURL) {
              DEBUG.log(
                "Rewriting import statement.",
                { moduleSpecifier, entryPointURL, resolvedModuleURL, baseURL }
              );
              /**
               * The import statement with the unresolved import replaced with
               * its resolved specifier.
               */
              const rewrittenImportStatement = rewriteImportStatement(
                importStatement,
                specifierToReplace,
                toRelativeSpecifier(baseURL, resolvedModule.url),
              );
              /**
               * Replace the import in the code.
               */
              DEBUG.log(
                "Performing specifier rewrite.",
                { entryPointURL, importStatement, rewrittenImportStatement }
              );
              code = code.replace(importStatement, rewrittenImportStatement);
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
export const build = async (production = true) => {
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
    DEBUG.log("Cleaning old output:", { distDir });
    await rm(distDir, { force: true, recursive: true });
    /**
     * All TS files for the build. Ignore .d.ts files.
     */
    const allTs = 
      glob
        .sync("src/**/*.{ts,tsx}", { cwd })
        .filter((file) => extname(file) !== ".d.ts");
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
      jsxFactory: "_jsx",
      banner: {
        js: "import {jsx as _jsx} from 'react/jsx-runtime.js';\n",
      },
    });
    /**
     * Run the post-build process and resolve import specifiers in output.
     */
    await normalizeImportSpecifiers();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
};