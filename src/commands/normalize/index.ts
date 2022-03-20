/**
 * @fileoverview
 * This module contains the logic for normalizing import specifiers. It must use
 * fully-specified filepaths here, since the bootstrap script will compile it
 * with esbuild and then use it to normalize emitted output.
 */

import { existsSync } from "fs";
import { writeFile } from "fs/promises";

import { isAbsolute, resolve as resolvePath } from "path";
import glob from "fast-glob";

import { createDebugLogger } from "create-debug-logger";
import { rewriteStatements } from "./lib/typescriptApi.js";

export const IMPORT_STATEMENT = "(^|(?<=[\n\r;] *))(import) *(\{?)[^\n\r;]+(((from)[\n\r; *]+)|([\"'][\n\r;]))";
export const EXPORT_STATEMENT = "(^|(?<=[\n\r;] *))(export) *(\{?)[^\n\r;]+(((from)[\n\r; *]+)|([\"'][\n\r;]))";
export const IMPORT_OR_EXPORT_STATEMENT = "(^|(?<=[\n\r;] *))(import|export) *(\{?)[^\n\r;]+(((from)[\n\r; *]+)|([\"'][\n\r;]))";
export const IMPORT_SPECIFIER_IN_CLAUSE = "(?<=[\"\'])([^\n\r]+)(?=[\'\"])";

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
    const normalized = await rewriteStatements(resolvedEntryPoint);
    DEBUG.log("Normalizing", { file, normalized });
    await writeFile(resolvedEntryPoint, normalized, { flag: "w", encoding: "utf-8" });
  }

  DEBUG.log("Normalized", { filesToNormalize });
};