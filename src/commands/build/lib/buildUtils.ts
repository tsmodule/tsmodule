/* eslint-disable no-console */
import { BuildOptions, Format, Loader } from "esbuild";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { createShell } from "universal-shell";

import { getDistFile } from "../../../utils/dirs";
import { DEVELOPMENT_MODE } from "../../../utils/resolve";
import chalk from "chalk";
import { getPackageJson } from "../../../utils/packageJson";

export const forceModuleTypeInDist = async (mode: Format = "esm") => {
  let distPkgJson;

  if (!existsSync("dist")) {
    await mkdir("dist");
  }

  if (existsSync("dist/package.json")) {
    distPkgJson = JSON.parse(await readFile("dist/package.json", "utf-8"));
  } else {
    distPkgJson = {};
  }

  switch (mode) {
    case "esm":
      distPkgJson.type = "module";
      break;

    case "cjs":
      distPkgJson.type = "commonjs";
      break;

    default:
      return false;
  }

  await writeFile(
    "dist/package.json",
    JSON.stringify(distPkgJson, null, 2)
  );

  return true;
};

export const overwriteEntryPoint = (
  source: string,
  file: string,
  loader?: Loader
) => {
  file = resolve(file);
  const emittedFile = getDistFile(file);

  const config: BuildOptions = {
    stdin: {
      contents: source,
      sourcefile: file,
      resolveDir: dirname(file),
      loader,
    },

    outdir: undefined,
    outfile: emittedFile,
    splitting: false,
  };

  return config;
};

/**
 * Generate a Tailwind command that will build the given input stylesheet.
 * Add an import for standard styles.
 */
export const buildCssEntryPoint = async (
  inputFile: string,
  outputFile: string,
  minify: boolean,
  // noStandardStyles: boolean,
) => {
  const pkgJson = await getPackageJson();
  const { dependencies = {}, devDependencies } = pkgJson;

  /**
   * Build project styles.
   */
  const tailwindcss =
    dependencies?.tailwindcss ?? devDependencies?.tailwindcss;

  if (!tailwindcss) {
    return;
  }

  inputFile = resolve(inputFile);
  outputFile = resolve(outputFile);

  const cmd = [
    "yarn tailwindcss",
    "--postcss postcss.config.cjs",
    `-i ${inputFile}`,
    `-o ${outputFile}`
  ];

  if (!minify) {
    cmd.push("--minify");
  }

  if (existsSync(resolve("tailwind.config.cjs"))) {
    cmd.push("--config tailwind.config.cjs");
  }

  const shell = createShell({
    log: DEVELOPMENT_MODE,
    stdio: DEVELOPMENT_MODE ? "inherit" : "ignore",
  });

  const cmdString = cmd.join(" ");
  const { code, stdout, stderr } = await shell.run(cmdString);
  if (code !== 0) {
    console.error(chalk.red(chalk.bold(cmdString)));
    console.log(stdout);
    console.error(chalk.red(stderr));
    throw new Error("Failed to build Tailwind styles");
  }
};