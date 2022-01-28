import { dirname, extname, relative } from "path/posix";
import ts from "typescript";

const compilerHost = ts.createCompilerHost({
  module: ts.ModuleKind.ESNext,
  rootDir: "src",
  outDir: "dist",
});

// console.log(
//   ts.resolveModuleName(
//     "./test",
//     "/home/christian/PersonalProjects/tsm/src/index.ts",
//     {
//       moduleResolution: ts.ModuleResolutionKind.NodeNext,
//     },
//     compilerHost
//   )
// );

// const parsedCommandLine = ts.parseJsonConfigFileContent(
//   JSON.parse(readFileSync("/home/christian/PersonalProjects/tsm/test/integration/resolve/tsconfig.json", "utf-8")),
//   ts.sys,
//   "/home/christian/PersonalProjects/tsm/test/integration/resolve",
// );

// console.log(compilerHost);

// const testCommandLine =
// compilerHost.getParsedCommandLine("/home/christian/PersonalProjects/tsm/test/integration/resolve");
// const config = ts.readJsonConfigFile("/home/christian/PersonalProjects/tsm/test/integration/resolve/tsconfig.json", ts.sys.readFile);
// const testCommandLine = ts.parseJsonSourceFileConfigFileContent(
//   ts.readJsonConfigFile("/home/christian/PersonalProjects/tsm/test/integration/resolve/tsconfig.json", ts.sys.readFile),
//   ts.sys,
//   "./"
// );

// console.log(
//   ts.getOutputFileNames(
//     testCommandLine,
//     "/home/christian/PersonalProjects/tsm/test/integration/resolve/src/a/index.ts",
//     false
//   )
// );

const typescriptResolve = (specifier: string, entryPoint = ".") => {
  const { resolvedModule } = ts.resolveModuleName(
    specifier,
    entryPoint,
    {
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    },
    compilerHost
  );

  if (!resolvedModule) {
    throw new Error(`Could not resolve module: ${
      JSON.stringify({ specifier, entryPoint }, null, 2)
    }`);
  }

  return resolvedModule;
};

const getEsmRelativeSpecifier = (from: string, to: string) => {
  const relativePath = relative(dirname(from), to);
  return !relativePath.startsWith(".") ? `./${relativePath}` : relativePath;
};

export const getRewrittenSpecifiers = (modulePath: string) => {
  const { resolvedFileName } = typescriptResolve(modulePath);
  const sourceFile = compilerHost.getSourceFile(
    resolvedFileName,
    ts.ScriptTarget.ESNext
  );

  if (!sourceFile) return;
  const { statements, fileName: entryPoint } = sourceFile;

  const rewrittenSpecifiers = [];

  for (const statement of statements) {
    const isEsmExport = ts.isExportDeclaration(statement);
    const isEsmImport =
        ts.isImportDeclaration(statement) &&
        !statement?.importClause?.isTypeOnly;

    if (isEsmImport || isEsmExport) {
      const { moduleSpecifier } = statement;
      if (!moduleSpecifier) return;

      if (ts.isStringLiteral(moduleSpecifier)) {
        const { text: specifier } = moduleSpecifier;
        /**
         * Only resolve non-external specifiers without file extensions.
         */
        if (specifier.startsWith(".") && !extname(specifier)) {
          const { resolvedModule } = ts.resolveModuleName(
            moduleSpecifier.text,
            entryPoint,
            {
              moduleResolution: ts.ModuleResolutionKind.NodeNext,
              allowJs: true,
              checkJs: true,
            },
            compilerHost
          );

          if (!resolvedModule) return;
          const { resolvedFileName } = resolvedModule;

          /**
           * Convert the resolved module filepath to a relative specifier
           * (relative to the entry-point).
           *
           * This is an ESM specifier, so force POSIX path separators.
           */
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

    return rewrittenSpecifiers;
  }
};

// const rewrittenSpecifiers = getRewrittenSpecifiers("/home/christian/PersonalProjects/tsm/dist/commands/test");

// console.log({ rewrittenSpecifiers });
// console.log(
//   ts.resolveModuleName(
//     "/home/christian/PersonalProjects/tsm/dist/loader/types",
//     ".",
//     {
//       moduleResolution: ts.ModuleResolutionKind.NodeNext,
//     },
//     compilerHost
//   )
// );