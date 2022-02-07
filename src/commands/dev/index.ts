import { relative, resolve } from "path";
import { build } from "../build";
import chalk from "chalk";
import { createShell } from "await-shell";
import { log } from "create-debug-logger";
import { existsSync, lstatSync } from "fs";
import ora from "ora";
import watch from "node-watch";

const clear = () => {
  // eslint-disable-next-line no-console
  console.clear();
};

const timestamp = (files: string) => {
  log(
    "\n",
    chalk.gray(`Built ${chalk.bold(files)}.`),
    "\n",
    chalk.blue(new Date().toLocaleString())
  );
};

export const dev = async () => {
  const cwd = process.cwd();
  const shell = createShell();

  if (process.platform !== "win32") {
    await shell.run("clear");
  }

  clear();

  await build({ dev: true });
  timestamp("src/**/*");

  watch(
    resolve(cwd, "src"),
    {
      recursive: true,
      persistent: true
    }
  ).on(
    "change",
    async (_: string, filePath: string) => {
      /**
       * Windows-specific stuff.
       */
      {
        const stillExists = existsSync(filePath);
        if (!stillExists) return;

        const isDir = !lstatSync(filePath).isFile();
        if (isDir) return;
      }

      clear();

      const preTime = Date.now();
      await build({ dev: true, files: filePath });
      const time = Date.now() - preTime;

      ora(
        chalk.blueBright(
          `Dev refresh finished in ${chalk.bold(`${time}ms`)}.`
        )
      ).succeed();

      timestamp(relative(cwd, filePath));
    }
  );
};