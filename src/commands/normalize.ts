import { Plugin, rollup } from "rollup";
import { createDebugLogger, normalizeSpecifier } from "../utils/index.js";
import { dirname, extname, isAbsolute, relative, resolve as resolvePath } from "path";
import glob from "fast-glob";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore No types available for this plugin.
import shebang from "rollup-plugin-preserve-shebang";

import { pathToFileURL } from "url";
import { resolve } from "../loader/index.js";

/**
 * Get a Unix-like relative path from a URL.
 */
const toRelativeSpecifier = (fromURL: string, toURL: string) => {
  const DEBUG = createDebugLogger(toRelativeSpecifier);
  const relativePath = relative(fromURL, toURL);

  DEBUG.log("To relative specifier:", { fromURL, toURL, relativePath });

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
  DEBUG.log(
    "Rewriting import",
    { importStatement, specifierToReplace, specifierReplacement }
  );

  const [, specifier] = importStatement.split(/from|\(/);
  const rewrittenSource = 
    specifier
      .replace(specifierToReplace, specifierReplacement)
      .trim();

  return importStatement.replace(specifier, rewrittenSource);
};

/**
 * A Rollup plugin which rewrites all the imports in a chunk with the specifiers
 * resolved by the TSM loader.
 */
export const rewriteImportSpecifiersPlugin: () => Plugin = () => {
  const DEBUG = createDebugLogger(rewriteImportSpecifiersPlugin);
  DEBUG.log("Normalizing JS module specifiers.");

  return {
    name: "Rewrite imports",
    renderChunk: async (code, chunk, options) => {
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
          { entryPointURL, specifierToReplace, baseURL, importStatements }
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
 * Rewrite imports in the emitted JS to ESM-compliant paths.
 */
export const normalizeImportSpecifiers = async (files = "dist/**/*.js") => {
  const DEBUG = createDebugLogger(normalizeImportSpecifiers);
  const filesToNormalize = await glob(files);
  DEBUG.log("Normalizing import/require specifiers:", { filesToNormalize });

  for (let file of filesToNormalize) {
    file = resolvePath(file);

    const build = await rollup({
      input: file,
      plugins: [
        /**
         * Leave #!/usr/bin/env shebangs.
         */
        shebang(),
        /**
         * Used primarily for index.js resolution.
         */
        // nodeResolve(),
        /**
         * Rewrite import specifiers using the internal loader.
         */
        rewriteImportSpecifiersPlugin()
      ],
      /**
       * Mark all imports other than this entry point as external in order to
       * prevent Rollup from bundling named modules.
       */
      external: (id: string) => id !== file,
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