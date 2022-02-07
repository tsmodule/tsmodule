import { URL, fileURLToPath } from "url";
import { copyFileSync, existsSync, mkdirSync, rmdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

/**
 * Sleep for a given number of ms (default 250ms).
 */
export const sleep = async (ms = 1000) => {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
};

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const createTestAssets = async (testName: string) => {
  const testDir = getTestDir(testName);
  const subdir = resolve(testDir, "src/path/to/assets");

  if (!existsSync(subdir)) {
    mkdirSync(subdir, { recursive: true });
  }

  writeFileSync(
    resolve(testDir, "src/index.css"),
    "body { color: red; }"
  );

  copyFileSync(
    fileURLToPath(new URL("../../assets/tsmodule.png", import.meta.url)),
    resolve(testDir, "src/path/to/assets/tsmodule.png")
  );
};

export const cleanTestDir = async (testName: string) => {
  await sleep();
  const testDir = getTestDir(testName);

  if (existsSync(testDir)) {
    rmdirSync(testDir, { recursive: true });
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