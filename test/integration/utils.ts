/* eslint-disable no-console */
import { constants, existsSync } from "fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";

export const readTextFile = async (file: string) => {
  return await readFile(file, "utf-8");
};

export const mkdirp = async (dir: string) => {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
};

/**
 * Sleep for a given number of ms.
 */
export const sleep = async (ms = process.env.CI ? 2500 : 1000) => {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
};

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const writeTestFile = async (
  testName: string,
  path: string,
  content: string
) => {
  const testDir = getTestDir(testName);
  const testFile = resolve(testDir, path);

  await sleep();
  await mkdir(dirname(testFile), { recursive: true });
  await writeFile(testFile, content, { encoding: "utf-8" });
  await sleep();
};

export const createTestAssets = async (testName: string) => {
  console.log("Creating test assets for", { testName });

  const testDir = getTestDir(testName);
  const subdir = resolve(testDir, "src/path/to/assets");

  if (!existsSync(subdir)) {
    console.log("Creating subdir", { subdir });
    await mkdir(subdir, { recursive: true });
    console.log("Subdir created.");
  }

  const cssFile = resolve(testDir, "src/index.css");
  await writeFile(cssFile,"body { color: red; }", "utf-8");

  console.log("Wrote file", { cssFile });
  await sleep();

  const pngSource = resolve(fileURLToPath(import.meta.url), "../../../tsmodule.png");
  const pngFile = resolve(testDir, "src/path/to/assets/tsmodule.png");
  await copyFile(
    pngSource,
    pngFile,
    constants.COPYFILE_FICLONE
  );

  console.log("Copied image", { pngFile });
  console.log("Created test assets.");
  await sleep();
};

export const cleanTestDir = async (testName: string) => {
  await sleep();
  const testDir = getTestDir(testName);

  if (existsSync(testDir)) {
    if (!process.env.SKIP_TEST_SETUP) {
      await rm(testDir, { recursive: true, force: true });
    }
  }

  return {
    testName,
    testDir,
  };
};

export const createTestDir = async (testName: string) => {
  const { testDir } = await cleanTestDir(testName);
  await mkdir(testDir, { recursive: true });

  return {
    testName,
    testDir,
  };
};
