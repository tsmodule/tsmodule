import { dirname, extname, relative } from "path/posix";
import { createDebugLogger } from "./index.js";
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

  statements.forEach(
    (statement) => {
      const isEsmExport = ts.isExportDeclaration(statement);
      const isEsmImport =
        ts.isImportDeclaration(statement) &&
        !statement?.importClause?.isTypeOnly;

      if (!isEsmImport && !isEsmExport) {
        return;
      }

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
         * Only resolve non-external specifiers without file extensions.
         */
        if (specifier.startsWith(".") && !extname(specifier)) {
          DEBUG.log("Using TypeScript API to resolve", { specifier });
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
    }
  );

  return rewrittenSpecifiers;
};