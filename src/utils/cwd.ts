import { extname, resolve } from "path";
import { isTs, isTsxOrJsx } from "./resolve.js";
import {  existsSync } from "fs";
import chalk from "chalk";

const renameExtension = (path: string, ext: string) => {
  const currentExt = extname(path);

  if (currentExt === ext) {
    return path;
  }

  const substr = path.substring(0, -currentExt.length || path.length);
  return substr;
};

export const getWorkingDirs = () => {
  const cwd = process.cwd();
  const srcDir = resolve(cwd, "src");
  const outDir = resolve(cwd, "dist");

  return {
    cwd,
    srcDir,
    outDir,
  };
};

export const getEmittedFile = (file: string) => {
  file = resolve(file);
  const { srcDir, outDir } = getWorkingDirs();

  return file
    .replace(srcDir, outDir)
    .replace(isTs, ".js")
    .replace(isTsxOrJsx, ".js");
};

const tsExtensions = [".mts", ".ts", ".tsx"];

export const getSourceFile = (file: string) => {
  file = resolve(file);
  const { srcDir, outDir } = getWorkingDirs();

  const reducedPath = renameExtension(file, "");
  const sourcePath = reducedPath.replace(outDir, srcDir);

  let resolvedSourceFile;

  for (const ext of tsExtensions) {
    const fileDotTs = `${sourcePath}${ext}`;
    if (existsSync(fileDotTs)) {
      resolvedSourceFile = fileDotTs;
    }

    const indexDotTs = resolve(sourcePath, `index${ext}`);
    if (existsSync(indexDotTs)) {
      resolvedSourceFile = indexDotTs;
    }
  }

  if (!resolvedSourceFile) {
    throw new Error(`Could not find source file for: ${chalk.bold(file)}`);
  }

  return resolvedSourceFile;
};