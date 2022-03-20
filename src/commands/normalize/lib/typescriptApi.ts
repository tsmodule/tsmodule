import { existsSync } from "fs";
import { readFile } from "fs/promises";

import { IMPORT_OR_EXPORT_STATEMENT, IMPORT_SPECIFIER_IN_CLAUSE } from "../index.js";
import { dirname, normalize, posix as pathPosix, resolve } from "path";
import { createDebugLogger } from "create-debug-logger";

const fileExtensions = [".js", ".mjs", ".jsx", ".json", ".ts", ".mts", ".tsx"];

const typescriptResolve = async (specifier: string, entryPoint: string) => {
  const resolvedDirectory = dirname(normalize(entryPoint));
  const resolvedPath = forcePosixPath(resolve(resolvedDirectory, specifier));
  const reducedPath = resolvedPath.replace(pathPosix.extname(resolvedPath), "");

  for (const fileExtension of fileExtensions) {
    const dotTsFile = `${reducedPath}${fileExtension}`;
    const indexDotTsFile = `${reducedPath}/index${fileExtension}`;

    if (existsSync(dotTsFile)) {
      return dotTsFile;
    }

    if (existsSync(indexDotTsFile)) {
      return indexDotTsFile;
    }
  }
};

const forcePosixPath = (path: string) => path.replace(/\\/g, "/");

/**
 * Get a POSIX-like ESM relative path from one file to another.
 */
const getEsmRelativeSpecifier = (from: string, to: string) => {

  from = forcePosixPath(from);
  to = forcePosixPath(to);

  const relativePath = pathPosix.relative(pathPosix.dirname(from), to);
  const specifier = !relativePath.startsWith(".") ? `./${relativePath}` : relativePath;
  return specifier;
};

/**
 * Load the given module and resolve specifiers in its import statements,
 * replacing them.
 *
 * @returns The module's source code with all specifiers replaced.
 */
export const rewriteStatements = async (modulePath: string) => {
  const DEBUG = createDebugLogger(rewriteStatements);
  DEBUG.log("Getting rewritten specifiers:", { modulePath });
  modulePath = forcePosixPath(modulePath);

  // const rewrittenStatements: StatementReplacement[]  = [];
  const importExportRegex = new RegExp(IMPORT_OR_EXPORT_STATEMENT, "g");

  let code = await readFile(modulePath, "utf8");
  const importStatements = code.match(importExportRegex);
  DEBUG.log("Found import statements:", { importStatements });

  if (importStatements) {
    for (const importStatement of importStatements) {
      const specifierPattern = new RegExp(IMPORT_SPECIFIER_IN_CLAUSE);
      const specifierMatch = importStatement.match(specifierPattern);
      if (!specifierMatch) {
        DEBUG.log("No specifier match", { importStatement, specifierPattern });
        throw new Error(`Could not identify specifier in import statement: ${importStatement}`);
      }

      const specifier = specifierMatch[0];
      DEBUG.log("Found specifier:", { specifier });

      /**,
       * If this is a non-relative specifier, or it has a file extension, do
       * try to resolve it.
       */
      if (!specifier.startsWith(".") || pathPosix.extname(specifier)) {
        continue;
      }

      const resolvedSpecifier = await typescriptResolve(specifier, modulePath);
      if (!resolvedSpecifier) {
        throw new Error(`Could not resolve specifier "${specifier}" from "${modulePath}"`);
      }

      DEBUG.log("Resolved specifier:", { resolvedSpecifier });

      const specifierReplacement = getEsmRelativeSpecifier(
        modulePath,
        resolvedSpecifier
      );

      DEBUG.log("Specifier replacement:", { specifierReplacement });

      const importStatementReplacement = importStatement.replace(
        specifier,
        specifierReplacement
      );

      DEBUG.log("Import statement replacement:", { importStatementReplacement });

      code = code.replace(importStatement, importStatementReplacement);
    }
  }

  return code;
};