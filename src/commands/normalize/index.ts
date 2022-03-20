/**
 * @fileoverview
 * This module contains the logic for normalizing import specifiers. It must use
 * fully-specified filepaths here, since the bootstrap script will compile it
 * with esbuild and then use it to normalize emitted output.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { isAbsolute, resolve as resolvePath } from "path";
import glob from "fast-glob";
import { pathToFileURL } from "url";

import { createDebugLogger } from "create-debug-logger";
import { getRewrittenSpecifiers } from "./lib/typescriptApi.js";

/**
 * These are lazy hacks.
 */

export const EXPRESSION_BREAK = "[\n\r;]+";
export const EXPRESSION_CHAR = "[^\n\r;]*";
export const IMPORT_KEYWORD = "import *\{?";
export const IMPORT_CLAUSE = `(import${EXPRESSION_CHAR}(from)?)`;
export const DYNAMIC_IMPORT = `(import|require)${EXPRESSION_CHAR}\\(`;
export const EXPORT_CLAUSE = `(export${EXPRESSION_CHAR}from)`;

/**
 * These are reliable.
 */

export const IMPORT_STATEMENT = "(^|(?<=[\n\r;] *))(import)( )*(\{?)[^\n\r;]+(((from)[\n\r; *]+)|([\"'][\n\r;]))";
export const EXPORT_STATEMENT = "(^|(?<=[\n\r;] *))(export)( )*(\{?)[^\n\r;]+(((from)[\n\r; *]+)|([\"'][\n\r;]))";
export const IMPORT_OR_EXPORT_STATEMENT = "(^|(?<=[\n\r;] *))(import|export)( )*(\{?)[^\n\r;]+(((from)[\n\r; *]+)|([\"'][\n\r;]))";
export const IMPORT_SPECIFIER_IN_CLAUSE = "(?<=[\"\'])([^\n\r]+)(?=[\'\"])";

/**
 * Matches a complete import statement, including the import keyword, as well as
 * dynamic imports, requires, and export statements.
 */
export const generateImportPattern = (importSource: string) => {
  const escaped = importSource.replace(".", "\\.").replace("/", "\\/");
  const padded = `${EXPRESSION_CHAR}["']${escaped}["']${EXPRESSION_CHAR}`;

  return new RegExp(
    `(${IMPORT_CLAUSE}|${DYNAMIC_IMPORT}|${EXPORT_CLAUSE})${padded}`,
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

  const specifierPattern = new RegExp(IMPORT_SPECIFIER_IN_CLAUSE);
  const specifierMatch = importStatement.match(specifierPattern);
  if (!specifierMatch) {
    DEBUG.log("No specifier match", { importStatement, specifierPattern });
    throw new Error(`Could not identify specifier in import statement: ${importStatement}`);
  }

  const specifier = specifierMatch[0];
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

  const isSingleFile = isAbsolute(files) && existsSync(files);
  const filesToNormalize = isSingleFile ? [files] : glob.sync(files);

  DEBUG.log("Normalizing import/require specifiers:", { files, filesToNormalize });

  for (const file of filesToNormalize) {
    /**
     * If no absolute module ID, bail.
     */
    const resolvedEntryPoint = resolvePath(file);
    const entryPointURL = pathToFileURL(resolvedEntryPoint).href;

    const rewrites = getRewrittenSpecifiers(resolvedEntryPoint);
    if (!rewrites) return null;

    DEBUG.log("TypeScript API yielded specifiers to rewrite:", { rewrites });
    let code = readFileSync(resolvedEntryPoint, "utf8");

    DEBUG.group();
    for (const { specifierToReplace, specifierReplacement } of rewrites) {
      /**
        * Read the matched import/require statements and replace them.
        */
      const importPattern = generateImportPattern(specifierToReplace);
      const importStatements = code.match(importPattern) ?? [];
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
        writeFileSync(resolvedEntryPoint, code);

        DEBUG.log("Wrote output file.", { resolvedEntryPoint });
        DEBUG.groupEnd();
      }
    }
    DEBUG.groupEnd();
  }
};