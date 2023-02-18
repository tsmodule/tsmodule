import { createDebugLogger } from "debug-logging";
import { createShell } from "universal-shell";

export const D_TS_CONFIG = {
  moduleResolution: "Node",
  module: "ESNext",
  target: "ESNext",
  esModuleInterop: true,
  incremental: false,
  rootDir: "src",
  outDir: "dist",
  declaration: true,
  noEmit: false,
  emitDeclarationOnly: true,
};

export const emitTsDeclarations = async () => {
  const DEBUG = createDebugLogger(emitTsDeclarations);
  const shell = createShell({
    log: false,
    silent: true,
  });

  const argString =
    Object
      .entries(D_TS_CONFIG)
      .map(([key, value]) => `--${key} ${value}`)
      .join(" ");

  const cmd = `yarn tsc -p tsconfig.json ${argString}`;
  DEBUG.log(`Calling: ${cmd}`);
  await shell.run(cmd);
};