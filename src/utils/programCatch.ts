/* eslint-disable @typescript-eslint/no-explicit-any */

import chalk from "chalk";
import { SpawnResult } from "universal-shell";
import { bannerError } from "./logs";
import { log } from "debug-logging";

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
      console.log();

      if (isShellExit(error)) {
        bannerError("Error");

        console.group();
        if (error.stdout) {
          console.error(chalk.red(error.stdout));
        }

        if (error.stderr) {
          console.error(chalk.redBright(error.stderr));
        }
        console.groupEnd();
      } else {
        if (error instanceof Error) {
          const { name, message } = error;
          bannerError(name);
          console.group();
          console.error(chalk.redBright(message));
          console.groupEnd();
        } else {
          bannerError("Error");
          console.group();
          console.error(chalk.redBright(error));
          console.groupEnd();
        }
      }

      console.log();

      /**
       * Propagate the error.
       */
      throw error;
    }
  };

  return wrapped;
};