import { createShell } from "universal-shell";
import { build } from "..";

export const buildBinaries = async () => {
  const shell = createShell({
    log: true,
  });

  await build({
    standalone: true,
    format: "cjs",
    input: "src/bin.ts",
  });

  await shell.run("yarn pkg --out-path dist dist/bin.js");
};