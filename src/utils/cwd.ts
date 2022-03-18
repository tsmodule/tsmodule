import { isTs, isTsxOrJsx } from "./resolve";
import { resolve } from "path";

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