/* eslint-disable no-console */
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";

export const readTextFile = (file: string) => {
  return readFileSync(file, "utf-8");
};

/**
 * Sleep for a given number of ms.
 */
export const sleep = async (ms = process.env.CI ? 3000 : 1000) => {
  console.log(`Sleeping for ${ms}ms.`);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
};

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const writeTestFile = (
  testName: string,
  path: string,
  content: string
) => {
  const testDir = getTestDir(testName);
  const testFile = resolve(testDir, path);

  mkdirSync(dirname(testFile), { recursive: true });
  writeFileSync(testFile, content, { encoding: "utf-8" });
};

export const createTestAssets = (testName: string) => {
  console.log("Creating test assets for", { testName });

  const testDir = getTestDir(testName);
  const subdir = resolve(testDir, "src/path/to/assets");

  if (!existsSync(subdir)) {
    console.log("Creating subdir", { subdir });
    mkdirSync(subdir, { recursive: true });
    console.log("Subdir created.");
  }

  const binaryFile = resolve(testDir, "src/bin.ts");
  writeFileSync(binaryFile, "console.log('Hello world!');", "utf-8");

  const textFile = resolve(testDir, "src/test.txt");
  writeFileSync(textFile, "Hello world!", "utf-8");

  console.log("Wrote file", { textFile });

  const cssFile = resolve(testDir, "src/index.css");
  writeFileSync(cssFile,"body { color: red; }", "utf-8");

  console.log("Wrote file", { cssFile });

  const pngSource = resolve(fileURLToPath(import.meta.url), "../../../tsmodule.png");
  const pngFile = resolve(testDir, "src/path/to/assets/tsmodule.png");
  copyFileSync(
    pngSource,
    pngFile,
    constants.COPYFILE_FICLONE
  );

  console.log("Copied image", { pngFile });
  console.log("Created test assets.");
};

export const cleanTestDir = (testName: string) => {
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

export const createTestDir = (testName: string) => {
  const { testDir } = cleanTestDir(testName);
  mkdirSync(testDir, { recursive: true });

  return {
    testName,
    testDir,
  };
};
