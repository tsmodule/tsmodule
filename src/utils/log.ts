import chalk from "chalk";

export const errorLog = (message: string, exit = false) => {
  // eslint-disable-next-line no-console
  console.error(chalk.bold(chalk.red(message)));

  if (exit) {
    process.exit(1);
  }
};