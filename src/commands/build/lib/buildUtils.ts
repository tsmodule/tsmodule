import { BuildOptions, Format, Loader } from "esbuild";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { createShell } from "universal-shell";

import { getEmittedFile } from "../../../utils/cwd";
import { DEVELOPMENT_MODE } from "../../../utils/resolve";

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
  const emittedFile = getEmittedFile(file);

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
  inputStyles: string,
  outputStyles: string,
  dev: boolean,
  // noStandardStyles: boolean,
) => {

  inputStyles = resolve(inputStyles);
  outputStyles = resolve(outputStyles);

  const twCmd = "yarn tailwindcss";
  const minify = dev ? "" : "--minify";
  const postcss = "--postcss postcss.config.cjs";

  const cmd = [twCmd, minify, postcss, `-i ${inputStyles}`, `-o ${outputStyles}`];

  if (existsSync(resolve(process.cwd(), "tailwind.config.cjs"))) {
    cmd.push("--config tailwind.config.cjs");
  }

  const shell = createShell({
    log: DEVELOPMENT_MODE,
    stdio: "ignore",
  });

  const cmdString = cmd.join(" ");
  const { code, stdout, stderr } = await shell.run(cmdString);
  if (code !== 0) {
    throw new Error(`Building CSS bundle exited with code ${code} for ${inputStyles}.\n\rTried running: ${cmdString}.\n\rError: ${stdout + stderr}`);
  }
};