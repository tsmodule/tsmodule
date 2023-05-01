/* eslint-disable no-console */
import { relative, resolve } from "path";
import { existsSync } from "fs";
import { lstat } from "fs/promises";

import chalk from "chalk";
import { createShell } from "universal-shell";
import { log } from "debug-logging";
import ora from "ora";
import watch from "node-watch";

import { build } from "../build";
import { Format } from "esbuild";

const clearTerminal = () => {
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.clear();
  }
};

const showTimestamp = (files: string) => {
  console.log();
  console.group();
  console.log(chalk.blue(`Built ${chalk.bold(files)}.`));
  console.log(chalk.blue(new Date().toLocaleString()));
  console.groupEnd();
};

export type DevArgs = {
  format?: Format;
};

export const dev = async ({
  format = "esm",
}: DevArgs) => {
  const cwd = process.cwd();
  const shell = createShell();

  if (process.platform !== "win32" && process.env.NODE_ENV !== "test") {
    await shell.run("clear");
  }

  clearTerminal();

  await build({
    format,
    dev: true
  });

  showTimestamp("src/**/*");

  watch(
    resolve(cwd, "src"),
    {
      recursive: true,
    }
  ).on(
    "change",
    async (_: string, filePath: string) => {
      /**
       * Windows-specific stuff.
       */
      const stillExists = existsSync(filePath);
      if (!stillExists) return;

      const stat = await lstat(filePath);
      const isDir = stat.isDirectory();
      if (isDir) return;

      clearTerminal();

      const preTime = Date.now();
      try {
        const isCss = filePath.endsWith(".css");
        if (isCss) {

        }

        await build({
          dev: true,
          runtimeOnly: true,
          input: filePath,
          clear: false,
          /**
           * After the initial dev build, styles will only be bundled if a
           * single CSS file changes.
           */
          styles: null,
        });
      } catch (e) {
        log("ERROR:", e);
      }
      const time = Date.now() - preTime;

      console.log();
      ora(
        {
          text: chalk.blueBright(
            `Dev refresh finished in ${chalk.bold(`${time}ms`)}.`
          ),
          indent: 2,
        }
      ).succeed();

      showTimestamp(relative(cwd, filePath));
    }
  );
};