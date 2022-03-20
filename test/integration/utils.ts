/* eslint-disable no-console */
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { fileURLToPath, URL } from "url";
import { dirname, resolve } from "path";
import { tmpdir } from "os";

export const readTextFile = (file: string) => {
  return readFileSync(file, "utf-8");
};

export const mkdirp = (dir: string) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

/**
 * Sleep for a given number of ms (default 250ms).
 */
export const sleep = async (ms = 1000) => {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
};

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const writeTestFile = async (testName: string, path: string, content: string) => {
  const testDir = getTestDir(testName);
  const testFile = resolve(testDir, path);

  await sleep(1000);
  mkdirSync(dirname(testFile), { recursive: true });
  writeFileSync(testFile, content, { encoding: "utf-8" });
  await sleep(1000);
};

export const createTestAssets = async (testName: string) => {
  console.log("Creating test assets for", { testName });

  const testDir = getTestDir(testName);
  const subdir = resolve(testDir, "src/path/to/assets");

  if (!existsSync(subdir)) {
    console.log("Creating subdir", { subdir });
    mkdirSync(subdir, { recursive: true });
    console.log("Subdir created.");
  }

  const cssFile = resolve(testDir, "src/index.css");
  writeFileSync(cssFile,"body { color: red; }", "utf-8");
  
  console.log("Wrote file", { cssFile });
  await sleep(1000);

  const pngSource = resolve(fileURLToPath(import.meta.url), "../../../tsmodule.png");
  const pngFile = resolve(testDir, "src/path/to/assets/tsmodule.png");
  copyFileSync(
    pngSource,
    pngFile,
    constants.COPYFILE_FICLONE
  );

  console.log("Copied image", { pngFile });
  console.log("Created test assets.");
  await sleep(1000);
};

export const cleanTestDir = async (testName: string) => {
  await sleep();
  const testDir = getTestDir(testName);

  if (existsSync(testDir)) {
    if (!process.env.SKIP_TEST_SETUP) {
      rmSync(testDir, { recursive: true, force: true });
    }
  }

  return {
    testName,
    testDir,
  };
};

export const createTestDir = async (testName: string) => {
  const { testDir } = await cleanTestDir(testName);
  mkdirSync(testDir, { recursive: true });

  return {
    testName,
    testDir,
  };
};