import { URL, fileURLToPath } from "url";
import fs from "graceful-fs";
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

  if (!fs.existsSync(subdir)) {
    fs.mkdirSync(subdir, { recursive: true });
  }

  fs.writeFileSync(
    resolve(testDir, "src/index.css"),
    "body { color: red; }"
  );

  fs.copyFileSync(
    fileURLToPath(new URL("../../assets/tsmodule.png", import.meta.url)),
    resolve(testDir, "src/path/to/assets/tsmodule.png")
  );
};

export const cleanTestDir = async (testName: string) => {
  await sleep();
  const testDir = getTestDir(testName);

  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  return {
    testName,
    testDir,
  };
};

export const createTestDir = async (testName: string) => {
  const { testDir } = await cleanTestDir(testName);
  fs.mkdirSync(testDir, { recursive: true });

  return {
    testName,
    testDir,
  };
};