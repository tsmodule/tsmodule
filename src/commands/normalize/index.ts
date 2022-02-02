/**
 * @fileoverview
 * This module contains the logic for normalizing import specifiers. It must use
 * fully-specified filepaths here, since the bootstrap script will compile it
 * with esbuild and then use it to normalize emitted output.
 */

import { readFile, writeFile } from "fs/promises";
import glob from "fast-glob";
import { pathToFileURL } from "url";
import { resolve as resolvePath } from "path";

import { getRewrittenSpecifiers } from "./lib/typescriptApi.js";
import { createDebugLogger } from "create-debug-logger";

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
 * Rewrite imports in the emitted JS to ESM-compliant paths.
 */
export const normalizeImportSpecifiers = async (files = "dist/**/*.js") => {
  const DEBUG = createDebugLogger(normalizeImportSpecifiers);
  const filesToNormalize = await glob(files, { cwd: process.cwd() });
  DEBUG.log("Normalizing import/require specifiers:", { filesToNormalize });

  for (const file of filesToNormalize) {
    /**
     * If no absolute module ID, bail.
     */
    const resolvedEntryPoint = resolvePath(file);
    const entryPointURL = pathToFileURL(resolvedEntryPoint).href;

    const rewrites = getRewrittenSpecifiers(resolvedEntryPoint);
    if (!rewrites) return null;
    DEBUG.log("TypeScript API yielded specifiers to rewrite:", { rewrites });

    let code = await readFile(resolvedEntryPoint, "utf8");
    DEBUG.group();
    for (const { specifierToReplace, specifierReplacement } of rewrites) {
      /**
        * Read the matched import/require statements and replace them.
        */
      const importMatch = generateImportPattern(specifierToReplace);
      const importStatements = code.match(importMatch) ?? [];
      DEBUG.log(
        "Replacing import statements.",
        {
          entryPointURL,
          specifierToReplace,
          specifierReplacement,
          importStatements,
          // code
        }
      );
      /**
       * Attempt to replace the specifier for each import statement.
       */
      for (const importStatement of importStatements) {
        DEBUG.group();
        /**
         * The import statement with the unresolved import replaced with
         * its resolved specifier.
         */
        const rewrittenImportStatement = rewriteImportStatement(
          importStatement,
          specifierToReplace,
          specifierReplacement,
        );
        /**
         * Replace the import in the code.
         */
        DEBUG.log(
          "Performing specifier rewrite.",
          { entryPointURL, importStatement, rewrittenImportStatement }
        );

        code = code.replace(importStatement, rewrittenImportStatement);
        await writeFile(resolvedEntryPoint, code);

        DEBUG.log("Wrote output file.", { resolvedEntryPoint });
        DEBUG.groupEnd();
      }
    }
    DEBUG.groupEnd();
  }
};