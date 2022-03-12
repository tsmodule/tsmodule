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