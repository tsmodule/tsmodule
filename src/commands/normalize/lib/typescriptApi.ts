import { IMPORT_OR_EXPORT_STATEMENT, IMPORT_SPECIFIER_IN_CLAUSE } from "../index.js";
import { existsSync, readFileSync } from "fs";
import { createDebugLogger } from "create-debug-logger";
import { posix as pathPosix } from "path";

const fileExtensions = [".js", ".mjs", ".jsx", ".json", ".ts", ".mts", ".tsx"];
const typescriptResolve = (specifier: string, entryPoint: string) => {

  const resolvedDirectory = pathPosix.dirname(entryPoint);
  const resolvedPath = pathPosix.resolve(resolvedDirectory, specifier);
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

interface SpecifierReplacement {
  specifierToReplace: string;
  specifierReplacement: string;
}

/**
 * Get the rewritten specifiers for a given module. Import/export specifiers
 * will be resolved ahead-of-time by the TypeScript compiler and returned.
 */
export const getRewrittenSpecifiers = (modulePath: string) => {
  const DEBUG = createDebugLogger(getRewrittenSpecifiers);
  DEBUG.log("Getting rewritten specifiers:", { modulePath });
  modulePath = forcePosixPath(modulePath);

  const rewrittenSpecifiers: SpecifierReplacement[]  = [];
  const importExportRegex = new RegExp(IMPORT_OR_EXPORT_STATEMENT, "g");

  const code = readFileSync(modulePath, "utf8");
  const importStatements = code.match(importExportRegex);

  if (importStatements) {
    for (const importStatement of importStatements) {
      const specifierPattern = new RegExp(IMPORT_SPECIFIER_IN_CLAUSE);
      const specifierMatch = importStatement.match(specifierPattern);
      if (!specifierMatch) {
        DEBUG.log("No specifier match", { importStatement, specifierPattern });
        throw new Error(`Could not identify specifier in import statement: ${importStatement}`);
      }

      const specifier = specifierMatch[0];

      /**,
       * If this is a non-relative specifier, or it has a file extension, do
       * try to resolve it.
       */
      if (!specifier.startsWith(".") || pathPosix.extname(specifier)) {
        continue;
      }

      const resolvedSpecifier = typescriptResolve(specifier, modulePath);
      if (!resolvedSpecifier) {
        throw new Error(`Could not resolve specifier "${specifier}" from "${modulePath}"`);
      }

      const specifierReplacement = getEsmRelativeSpecifier(
        modulePath,
        resolvedSpecifier
      );

      rewrittenSpecifiers.push({
        specifierToReplace: specifier,
        specifierReplacement
      });
    }
  }

  return rewrittenSpecifiers;
};