import { createDebugLogger } from "debug-logging";
import { createShell } from "universal-shell";

export const EMIT_DTS_OVERRIDES = {
  moduleResolution: "Node",
  incremental: false,
  declaration: true,
  emitDeclarationOnly: true,
  noEmit: false,
};

export const emitTsDeclarations = async () => {
  const DEBUG = createDebugLogger(emitTsDeclarations);
  const shell = createShell({
    log: false,
    silent: true,
  });

  const argString =
    Object
      .entries(EMIT_DTS_OVERRIDES)
      .map(([key, value]) => `--${key} ${value}`)
      .join(" ");

  const cmd = `pnpm tsc -p tsconfig.json ${argString}`;
  DEBUG.log(`Calling: ${cmd}`);
  await shell.run(cmd);
};