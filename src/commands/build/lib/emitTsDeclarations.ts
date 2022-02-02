import { TS_CONFIG } from "../../normalize/lib/typescriptApi";

import chalk from "chalk";
import { createDebugLogger } from "create-debug-logger";
import ts from "typescript";

export const emitTsDeclarations = (files: string[]) => {
  const DEBUG = createDebugLogger(emitTsDeclarations);
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