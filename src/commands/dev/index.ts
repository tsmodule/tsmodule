import { relative, resolve } from "path";
import { build } from "../build";
import chalk from "chalk";
import { log } from "create-debug-logger";
import ora from "ora";
import { watch } from "chokidar";

export const dev = async () => {
  const cwd = process.cwd();
  await build({ dev: true });

  watch(
    resolve(cwd, "src")
  ).on(
    "change",
    async (filePath: string) => {
      // eslint-disable-next-line no-console
      console.clear();

      const preTime = Date.now();
      await build({ dev: true, files: filePath });
      const time = Date.now() - preTime;

      ora(
        chalk.blueBright(
          `Dev refresh finished in ${chalk.bold(`${time}ms`)}.`
        )
      ).succeed();

      log(
        "\n",
        chalk.gray(`Built ${relative(cwd, filePath)}`),
        "\n",
        chalk.blue(new Date().toLocaleString())
      );
    }
  );
};