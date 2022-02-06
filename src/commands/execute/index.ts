import { URL } from "url";
import { createShell } from "await-shell";

export const execute = async () => {
  /**
   * This will refer to the built loader regardless of whether it is running
   * from inside `dist/` or `src/`.
   */
  const __filename = import.meta.url;
  const loaderUrl = new URL("../../../dist/loader/index.js", __filename);

  const nodeArgs = [
    "--no-warnings",
    "--loader",
    loaderUrl.href,
    ...process.argv.slice(2)
  ];

  const shell = createShell();
  await shell.run(`node ${nodeArgs.join(" ")}`);
};