/* eslint-disable no-console */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { URL } from "url";
import { resolve } from "path";
import { tmpdir } from "os";

/**
 * Sleep for a given number of ms (default 250ms).
 */
export const sleep = async (ms = 1000) => {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
};

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const createTestAssets = (testName: string) => {
  console.log("Creating test assets for", { testName });

  const testDir = getTestDir(testName);
  const subdir = resolve(testDir, "src/path/to/assets");

  if (!existsSync(subdir)) {
    console.log("Creating subdir", { subdir });
    mkdirSync(subdir, { recursive: true });
    console.log("Subdir created.");
  }

  writeFileSync(
    resolve(testDir, "src/index.css"),
    "body { color: red; }"
  );
  console.log("Wrote file", { file: resolve(testDir, "src/index.css") });

  console.log("Copying file");
  const file = readFileSync(new URL("../../tsmodule.png", import.meta.url));
  writeFileSync(
    resolve(testDir, "src/path/to/assets/tsmodule.png"),
    file,
    { encoding: "binary", flag: "w" }
  );
  console.log("Copied image");

  // await sleep(2500);
  console.log("Created test assets.");
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