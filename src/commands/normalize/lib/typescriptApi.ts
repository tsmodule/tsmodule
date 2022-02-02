import { dirname, extname, relative } from "path/posix";
import { createDebugLogger } from "create-debug-logger";
import ts from "typescript";

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

const typescriptResolve = (specifier: string, entryPoint = process.cwd()) => {
  const { resolvedModule } = ts.resolveModuleName(
    specifier,
    entryPoint,
    TS_CONFIG,
    compilerHost
  );

  if (!resolvedModule) {
    const errorData = JSON.stringify({ specifier, entryPoint }, null, 2);
    throw new Error(`Could not resolve module: ${errorData}`);
  }

  return resolvedModule;
};

const getEsmRelativeSpecifier = (from: string, to: string) => {
  const relativePath = relative(dirname(from), to);
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

  const { resolvedFileName } = typescriptResolve(modulePath);
  const sourceFile = compilerHost.getSourceFile(
    resolvedFileName,
    ts.ScriptTarget.ESNext
  );

  if (!sourceFile) {
    throw new Error(`Could not read source file: ${resolvedFileName}`);
  }

  const { statements, fileName: entryPoint } = sourceFile;
  const rewrittenSpecifiers: SpecifierReplacement[]  = [];

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
        if (!specifier.startsWith(".") || extname(specifier)) {
          return;
        }

        DEBUG.log("Using TypeScript API to resolve specifier", { specifier });
        const { resolvedModule } = ts.resolveModuleName(
          specifier,
          entryPoint,
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
          entryPoint,
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