import { relative, resolve } from "path";
import { build } from "../build";
import chalk from "chalk";
import { log } from "create-debug-logger";
import ora from "ora";
import { watch } from "chokidar";

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

  clear();
  await build({ dev: true });
  timestamp("src/**/*");

  watch(
    resolve(cwd, "src"),
    { persistent: true }
  ).on(
    "change",
    async (filePath: string) => {
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