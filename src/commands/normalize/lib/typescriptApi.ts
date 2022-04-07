import { dirname, normalize, posix as pathPosix, resolve } from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";

import { init, parse } from "es-module-lexer";
import { createDebugLogger } from "create-debug-logger";

/**
 * Await es-module-lexer's WASM initialization.
 */
await init;

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
 * Resolve only non-relative named specifiers. Also resolve conditional exports
 * (contains "/").
 */
const shouldResolveSpecifier = (specifier?: string) => {
  if (!specifier) return false;
  return (
    specifier.startsWith(".") ||
    specifier.includes("/") ||
    pathPosix.extname(specifier)
  );
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

  const originalCode = await readFile(modulePath, "utf8");
  const [importExportSpecifiers] = await parse(originalCode);
  const namedImportExportSpecifiers = importExportSpecifiers.filter(
    (specifier) => typeof specifier.n !== "undefined"
  );

  DEBUG.log("Found import statements:", { namedImportExportSpecifiers });

  let code = originalCode.slice(0);
  for (const importExportSpecifier of namedImportExportSpecifiers) {
    const specifier = importExportSpecifier.n;
    DEBUG.log("Found specifier:", { specifier });

    const importStatement = originalCode.substring(
      importExportSpecifier.ss,
      importExportSpecifier.se
    );

    if (!specifier) {
      DEBUG.log(`Could not find specifier in import statement: "${importStatement}"`);
      continue;
    }

    /**,
     * If this is a non-relative specifier, or it has a file extension, do
     * try to resolve it.
     */
    if (!shouldResolveSpecifier(specifier)) {
      DEBUG.log("Not resolving relative or non-named specifier:", { specifier });
      continue;
    }

    const resolvedSpecifier = await typescriptResolve(specifier, modulePath);
    if (!resolvedSpecifier) {
      DEBUG.log(`Could not resolve specifier "${specifier}" from "${modulePath}". Assuming external.`);
      continue;
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

    DEBUG.log("Replacing import statement:", {
      specifier,
      importStatement,
      importStatementReplacement
    });

    code = code.replace(importStatement, importStatementReplacement);
  }

  return code;
};