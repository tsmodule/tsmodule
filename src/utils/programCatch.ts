/* eslint-disable @typescript-eslint/no-explicit-any */

import chalk from "chalk";
import { SpawnResult } from "universal-shell";
import { bannerError } from "./logs";

const isShellExit = (error: unknown): error is SpawnResult => {
  const anyError = error as any;
  if (
    anyError.code === undefined ||
    anyError.stdout == undefined ||
    anyError.stderr == undefined
  ) {
    return false;
  }

  return true;
};

/* eslint-disable no-console */
export const programCatch = (
  fn:  (...args: any[]) => any | Promise<any>
) => {
  const wrapped = async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      bannerError("Error");

      if (isShellExit(error)) {
        if (error.stdout) {
          console.log(chalk.red(error.stdout));
        }

        if (error.stderr) {
          console.log(chalk.redBright(error.stderr));
        }
      } else {
        console.log(chalk.redBright(JSON.stringify(error, null, 2)));
      }

      console.log();
    }
  };

  return wrapped;
};