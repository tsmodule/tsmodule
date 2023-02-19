import { createShell } from "universal-shell";

export const buildBinaries = async () => {
  const shell = createShell({
    log: false,
    silent: true,
  });

  await shell.run("yarn tsmodule build --standalone -f cjs src/bin.ts");
  await shell.run("yarn pkg dist/bin.js");
};