import { createShell } from "universal-shell";
import { pathToFileURL } from "url";
import { resolve } from "path";

import { INSTALL_ROOT } from "../../constants";

export const execute = async () => {
  /**
   * This will refer to the built loader regardless of whether it is running
   * from inside `dist/` or `src/`.
   */
  const loaderPath = resolve(
    INSTALL_ROOT,
    "dist/loader/index.js"
  );

  const nodeArgs = [
    "--no-warnings",
    "--loader",
    pathToFileURL(loaderPath).href,
    ...process.argv.slice(2)
  ];

  const shell = createShell({
    stdio: "inherit"
  });

  const { code } = await shell.run(`node ${nodeArgs.join(" ")}`);
  process.exit(code ?? 0);
};