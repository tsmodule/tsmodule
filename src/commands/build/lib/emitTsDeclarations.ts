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

export const emitTsDeclarations = async () => {
  const DEBUG = createDebugLogger(emitTsDeclarations);
  const shell = createShell({
    log: true,
  });

  const argString =
    Object
      .entries(D_TS_CONFIG)
      .map(([key, value]) => `--${key} ${value}`)
      .join(" ");

  await shell.run(`tsc -p tsconfig.json ${argString}`);
};