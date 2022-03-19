import { TS_CONFIG } from "../../normalize/lib/typescriptApi";

import chalk from "chalk";
import { createDebugLogger } from "create-debug-logger";
import ts from "typescript";
import { createShell } from "await-shell";

export const TSC_OPTIONS = {
  moduleResolution: "node",
  module: "esnext",
  target: "esnext",
  esModuleInterop: true,
  incremental: false,
  noEmit: true,
  rootDir: "src",
  outDir: "dist",
};

const D_TS_CONFIG = {
  ...TSC_OPTIONS,
  declaration: true,
  noEmit: false,
  emitDeclarationOnly: true,
};

export const emitTsDeclarations = async (files: string[]) => {
  const DEBUG = createDebugLogger(emitTsDeclarations);
  const shell = createShell();

  const argString =
    Object
      .entries(D_TS_CONFIG)
      .map(([key, value]) => `--${key} ${JSON.stringify(value)}`)
      .join(" ");

  await shell.run(`tsc ${argString} ${files.join(" ")}`);

  return;
  const program = ts.createProgram(
    files,
    {
      ...TS_CONFIG,
      declaration: true,
      noEmit: false,
      emitDeclarationOnly: true,
    },
  );

  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start ?? 0
      );
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      DEBUG.log(chalk.red(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`));
    } else {
      DEBUG.log(chalk.red(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")));
    }
  });
};