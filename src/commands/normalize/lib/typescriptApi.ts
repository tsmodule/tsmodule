import { posix as pathPosix } from "path";
import { createDebugLogger } from "create-debug-logger";
import ts from "typescript";
// import { getSourceFile } from "../../../utils/cwd.js";
import { EXPORT_CLAUSE, IMPORT_CLAUSE, IMPORT_OR_EXPORT_STATEMENT, IMPORT_STATEMENT } from "../index.js";
import { readFileSync } from "fs";

export const TS_CONFIG: ts.CompilerOptions = {
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
  esModuleInterop: true,
  incremental: false,
  noEmit: true,
  rootDir: "src",
  outDir: "dist",
};

export const compilerHost = ts.createCompilerHost(TS_CONFIG);

const fileExtensions = [".mts", ".ts", ".tsx", ".mjs", ".js", ".jsx", ".json"];

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

  const sourceFile = compilerHost.getSourceFile(
    modulePath,
    ts.ScriptTarget.ESNext
  );

  if (!sourceFile) {
    throw new Error(`Could not read source file: ${modulePath}`);
  }

  const { statements } = sourceFile;
  const rewrittenSpecifiers: SpecifierReplacement[]  = [];

  const importOrExportStatement = `(${IMPORT_CLAUSE}|${EXPORT_CLAUSE})`;
  const importExportRegex = new RegExp(IMPORT_OR_EXPORT_STATEMENT, "g");

  const code = readFileSync(modulePath, "utf8");
  console.log(code.match(importExportRegex));

  /**
   * Traverse the statements in this sourcefile.
   */
  statements.forEach(
    (statement) => {
      /**
       * Whether this is an export statement.
       */
      const isEsmExport = ts.isExportDeclaration(statement);

      /**
       * Whether this is a non-type-only import statement.
       */
      const isEsmImport =
        ts.isImportDeclaration(statement) &&
        !statement?.importClause?.isTypeOnly;

      /**
       * Skip non-import/export statements completely.
       */
      if (!isEsmImport && !isEsmExport) {
        return;
      }

      /**
       * Skip export statements without a module specifier, throw if we somehow
       * encounter an import statement without a module specifier (would be a
       * SyntaxError).
       */
      const { moduleSpecifier } = statement;
      if (!moduleSpecifier) {
        if (isEsmExport) {
          return;
        } else {
          throw new Error(`Could not find module specifier in: ${JSON.stringify(statement)}`);
        }
      }

      if (ts.isStringLiteral(moduleSpecifier)) {
        const { text: specifier } = moduleSpecifier;
        /**
         * If this is a non-relative specifier, or it has a file extension, do
         * try to resolve it.
         */
        if (!specifier.startsWith(".") || pathPosix.extname(specifier)) {
          return;
        }

        DEBUG.log("Using TypeScript API to resolve specifier", { specifier });
        const { resolvedModule } = ts.resolveModuleName(
          specifier,
          modulePath,
          {
            ...TS_CONFIG,
            allowJs: true,
            checkJs: true,
          },
          compilerHost
        );

        if (!resolvedModule) {
          throw new Error(`Could not resolve module: ${specifier}`);
        }

        /**
         * Convert the resolved module filepath to a relative specifier
         * (relative to the entry-point).
         *
         * This is an ESM specifier, so force POSIX path separators.
         */
        const { resolvedFileName } = resolvedModule;
        const relativeSpecifier = getEsmRelativeSpecifier(
          modulePath,
          resolvedFileName
        );

        rewrittenSpecifiers.push({
          specifierToReplace: specifier,
          specifierReplacement: relativeSpecifier,
        });
      }
    }
  );

  return rewrittenSpecifiers;
};