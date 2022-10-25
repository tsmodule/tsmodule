import { dirname, normalize, posix as pathPosix, resolve } from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";

import { init, parse } from "es-module-lexer";
import { createDebugLogger } from "debug-logging";
import { cwd } from "process";

/**
 * Await es-module-lexer's WASM initialization.
 */
await init;

const fileExtensions = [".js", ".mjs", ".jsx", ".json", ".ts", ".mts", ".tsx"];

const typescriptResolve = async (specifier: string, entryPoint: string) => {
  const DEBUG = createDebugLogger(typescriptResolve);
  const resolvedDirectory = dirname(normalize(entryPoint));
  const resolvedPath = forcePosixPath(resolvedDirectory);
  const reducedPath = resolvedPath.replace(pathPosix.extname(resolvedPath), "");

  const nodeModulesPath = forcePosixPath(resolve(cwd(), "node_modules"));
  const nodeModulesPathExists = existsSync(nodeModulesPath);

  DEBUG.log({ specifier, entryPoint, nodeModulesPath });

  for (const fileExtension of fileExtensions) {
    /**
     * .../{name}.{ts,js,...}
     */
    const dotTsFile = `${specifier}${fileExtension}`;
    /**
      * .../{name}index.{ts,js,...}
      */
    const indexDotTsFile = `${specifier}/index${fileExtension}`;

    DEBUG.log("Looking for", { dotTsFile, indexDotTsFile });

    if (!isNamedSpecifier(specifier)) {
      if (existsSync(resolve(reducedPath, dotTsFile))) {
        return dotTsFile;
      }

      if (existsSync(resolve(reducedPath, indexDotTsFile))) {
        return indexDotTsFile;
      }
    }

    if (nodeModulesPathExists) {
      /**
       * If this named specifier in Node modules has conditional exports set in
       * its package.json, do not touch it.
       */
      const packageName = specifier.split("/")[0];
      const packageJsonPath = resolve(nodeModulesPath, packageName, "package.json");
      const packageJsonExists = existsSync(packageJsonPath);
      if (packageJsonExists) {
        const packageJson = await readFile(packageJsonPath, "utf-8");
        const packageJsonParsed = JSON.parse(packageJson);
        if (packageJsonParsed.exports) {
          DEBUG.log("Skipping named specifier with conditional exports", { specifier });
          return specifier;
        }
      }

      /**
       * This is a named specifier with a / in it, e.g. "next/head".
       */
      DEBUG.log("In", { nodeModulesPath  });

      const nodeModulesFile = resolve(nodeModulesPath, dotTsFile);
      const nodeModulesIndexFile = resolve(nodeModulesPath, indexDotTsFile);

      if (existsSync(nodeModulesFile)) {
        DEBUG.log("Found", { nodeModulesFile });
        return dotTsFile;
      }

      if (existsSync(nodeModulesIndexFile)) {
        DEBUG.log("Found", { nodeModulesIndexFile });
        return indexDotTsFile;
      }
    }
  }
};

const forcePosixPath = (path: string) => path.replace(/\\/g, "/");

/**
 * Returns whether or not the given specifier is named, i.e. `next/head` or
 * `react`, as opposed to `./{name}`, `../{name}`, or `/{name}`.
 */
const isNamedSpecifier = (specifier: string) => {
  return !(
    specifier.startsWith("./") ||
    specifier.startsWith("..") ||
    specifier.startsWith("/")
  );
};

/**
 * Get a POSIX-like ESM relative path from one file to another.
 */
const getEsmRelativeSpecifier = (from: string, to: string) => {
  from = forcePosixPath(from);
  to = forcePosixPath(to);

  /**
   * If not absolute POSIX path, do not resolve.
   */
  if (!to.startsWith("/")) {
    return to;
  }

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