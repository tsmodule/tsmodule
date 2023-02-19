import { log } from "@tsmodule/log";
import chalk from "chalk";

export const bannerLog = (msg: string) => {
  const logMsg = `  ${msg}  `;
  log(
    chalk.bgBlue(
      chalk.bold(chalk.white(logMsg)),
    ),
    [],
    {
      preLines: 1,
      postLines: 1,
    }
  );
};

export const bannerError = (msg: string) => {
  const logMsg = `  ${msg}  `;
  log(
    chalk.bgRed(
      chalk.bold(chalk.white(logMsg)),
    )
  );
};